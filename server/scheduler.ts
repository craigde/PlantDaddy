import { db } from './db';
import { plants, notificationSettings, notificationLog, householdMembers } from '@shared/schema';
import { eq, inArray } from 'drizzle-orm';
import { daysUntilWatering } from '../client/src/lib/date-utils';
import { sendPlantNotification } from './notifications';
import { sendApnsNotification, isApnsConfigured } from './apns-service';
import { userContextStorage } from './user-context';

// Time in milliseconds
const ONE_HOUR = 60 * 60 * 1000;

// Format date as YYYY-MM-DD
function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

let schedulerInterval: NodeJS.Timeout | null = null;

// Main scheduler task: runs hourly, checks per-user reminder times
async function checkPlantsTask() {
  const now = new Date();
  const today = todayString();
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();

  try {
    // Get all users who have notifications enabled
    const enabledSettings = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.enabled, true));

    if (enabledSettings.length === 0) {
      return;
    }

    let totalNotifications = 0;

    for (const settings of enabledSettings) {
      const userId = settings.userId;

      // Skip if already notified today
      if (settings.lastNotifiedDate === today) {
        continue;
      }

      // Check if it's time for this user's reminder
      const reminderTime = settings.reminderTime || '08:00';
      const [reminderHour, reminderMinute] = reminderTime.split(':').map(Number);

      if (currentHour < reminderHour || (currentHour === reminderHour && currentMinute < (reminderMinute || 0))) {
        continue; // Not yet time for this user
      }

      console.log(`[scheduler] Checking plants for user ${userId} (reminder time: ${reminderTime})...`);

      // Run in user context so storage methods scope correctly
      await userContextStorage.run({ userId, householdId: null, householdResolved: false, requestedHouseholdId: null }, async () => {
        try {
          // Get household plants (not just user's own)
          const userHouseholds = await db
            .select()
            .from(householdMembers)
            .where(eq(householdMembers.userId, userId));

          let allPlantsList: typeof plants.$inferSelect[] = [];

          if (userHouseholds.length > 0) {
            const householdIds = userHouseholds.map(h => h.householdId);
            allPlantsList = await db
              .select()
              .from(plants)
              .where(inArray(plants.householdId, householdIds));
          } else {
            allPlantsList = await db
              .select()
              .from(plants)
              .where(eq(plants.userId, userId));
          }

          if (allPlantsList.length === 0) {
            await db.update(notificationSettings)
              .set({ lastNotifiedDate: today })
              .where(eq(notificationSettings.userId, userId));
            return;
          }

          const threshold = settings.reminderDaysBefore ?? 0;
          const plantsNeedingAttention: { plant: typeof plants.$inferSelect; daysUntil: number }[] = [];

          for (const plant of allPlantsList) {
            const daysUntil = daysUntilWatering(plant.lastWatered, plant.wateringFrequency);
            if (daysUntil <= threshold) {
              plantsNeedingAttention.push({ plant, daysUntil });
            }
          }

          if (plantsNeedingAttention.length === 0) {
            await db.update(notificationSettings)
              .set({ lastNotifiedDate: today })
              .where(eq(notificationSettings.userId, userId));
            return;
          }

          // Sort: most overdue first
          plantsNeedingAttention.sort((a, b) => a.daysUntil - b.daysUntil);

          console.log(`[scheduler] User ${userId}: ${plantsNeedingAttention.length} plant(s) need attention`);

          // Send individual notifications for each plant
          for (const { plant, daysUntil } of plantsNeedingAttention) {
            const { title, message, priority } = buildNotificationMessage(plant, daysUntil);
            const sent = await sendPlantNotification(userId, plant, title, message, priority);
            if (sent) totalNotifications++;

            // Log the notification
            await db.insert(notificationLog).values({
              userId,
              plantId: plant.id,
              title,
              message,
              channel: 'all',
              success: sent,
            });
          }

          // Send summary if multiple plants need attention
          if (plantsNeedingAttention.length > 1) {
            const overdue = plantsNeedingAttention.filter(p => p.daysUntil < 0).length;
            const dueToday = plantsNeedingAttention.filter(p => p.daysUntil === 0).length;
            const dueSoon = plantsNeedingAttention.filter(p => p.daysUntil > 0).length;

            const parts: string[] = [];
            if (overdue > 0) parts.push(`${overdue} overdue`);
            if (dueToday > 0) parts.push(`${dueToday} due today`);
            if (dueSoon > 0) parts.push(`${dueSoon} due soon`);

            const summaryTitle = '🪴 PlantDaddy Daily Summary';
            const summaryBody = `${plantsNeedingAttention.length} plants need attention: ${parts.join(', ')}.`;

            if (isApnsConfigured()) {
              const plantIds = plantsNeedingAttention.map(p => p.plant.id);
              await sendApnsNotification(userId, summaryTitle, summaryBody, {
                threadId: 'watering',
                category: 'WATERING_SUMMARY',
                plantIds,
              });
            }

            await db.insert(notificationLog).values({
              userId,
              title: summaryTitle,
              message: summaryBody,
              channel: 'summary',
              success: true,
            });
          }

          // Mark user as notified today
          await db.update(notificationSettings)
            .set({ lastNotifiedDate: today })
            .where(eq(notificationSettings.userId, userId));

        } catch (err) {
          console.error(`[scheduler] Error checking plants for user ${userId}:`, err);
        }
      });
    }

    if (totalNotifications > 0) {
      console.log(`[scheduler] Daily check complete. Sent ${totalNotifications} notification(s).`);
    }
  } catch (error) {
    console.error('[scheduler] Error in plant check task:', error);
  }
}

function buildNotificationMessage(
  plant: typeof plants.$inferSelect,
  daysUntil: number
): { title: string; message: string; priority: number } {
  if (daysUntil < -2) {
    return {
      title: `🚨 ${plant.name} is ${-daysUntil} days overdue!`,
      message: `Your ${plant.name} in ${plant.location} urgently needs watering — ${-daysUntil} days past due.`,
      priority: 1,
    };
  } else if (daysUntil < 0) {
    return {
      title: `🪴 ${plant.name} needs water!`,
      message: `Your ${plant.name} in ${plant.location} is ${-daysUntil} day${-daysUntil > 1 ? 's' : ''} overdue for watering.`,
      priority: 0,
    };
  } else if (daysUntil === 0) {
    return {
      title: `💧 ${plant.name} — water today`,
      message: `${plant.name} in ${plant.location} is due for watering today.`,
      priority: 0,
    };
  } else {
    return {
      title: `📅 ${plant.name} — water in ${daysUntil} day${daysUntil > 1 ? 's' : ''}`,
      message: `Heads up: ${plant.name} in ${plant.location} will need watering ${daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`}.`,
      priority: -1,
    };
  }
}

// Start the scheduler - checks every hour
export function startScheduler() {
  console.log('[scheduler] Starting PlantDaddy notification scheduler...');
  console.log('[scheduler] Checking plants hourly against per-user reminder times.');

  // Run once on startup
  checkPlantsTask();

  // Check every hour
  if (!schedulerInterval) {
    schedulerInterval = setInterval(checkPlantsTask, ONE_HOUR);
  }
}

// Stop the scheduler
export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('[scheduler] Notification scheduler stopped.');
  }
}
