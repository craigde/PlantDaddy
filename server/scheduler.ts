import { db } from './db';
import { plants, notificationSettings, users } from '@shared/schema';
import { eq, and } from 'drizzle-orm';
import { isOverdue } from '../client/src/lib/date-utils';
import { sendPlantWateringNotification, sendPushoverNotification } from './notifications';
import { sendApnsNotification, isApnsConfigured } from './apns-service';
import { userContextStorage } from './user-context';

// Time in milliseconds
const ONE_MINUTE = 60 * 1000;
const ONE_HOUR = 60 * ONE_MINUTE;

// Default check time - 8:00 AM local server time
const DEFAULT_CHECK_HOUR = 8;

let lastCheckDate: string | null = null;
let schedulerInterval: NodeJS.Timeout | null = null;

// Format date as YYYY-MM-DD for daily dedup
function todayString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// Main scheduler task: runs periodically, sends once per day at check hour
async function checkPlantsTask() {
  const today = todayString();

  // Already checked today — skip
  if (lastCheckDate === today) {
    return;
  }

  // Only run at or after the check hour
  const now = new Date();
  if (now.getHours() < DEFAULT_CHECK_HOUR) {
    return;
  }

  console.log(`[scheduler] Running daily plant check for ${today}...`);
  lastCheckDate = today;

  try {
    // Get all users who have notifications enabled
    const enabledSettings = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.enabled, true));

    if (enabledSettings.length === 0) {
      console.log('[scheduler] No users with notifications enabled. Done.');
      return;
    }

    let totalNotifications = 0;

    for (const settings of enabledSettings) {
      const userId = settings.userId;

      // Run in user context so storage methods scope correctly
      await userContextStorage.run({ userId }, async () => {
        try {
          // Get this user's plants
          const userPlants = await db
            .select()
            .from(plants)
            .where(eq(plants.userId, userId));

          const overduePlants = userPlants.filter(p =>
            isOverdue(p.lastWatered, p.wateringFrequency)
          );

          if (overduePlants.length === 0) {
            return;
          }

          console.log(`[scheduler] User ${userId}: ${overduePlants.length} overdue plant(s)`);

          // Send individual notifications for each overdue plant
          for (const plant of overduePlants) {
            const sent = await sendPlantWateringNotification(plant);
            if (sent) totalNotifications++;
          }

          // Send summary if multiple plants need attention
          if (overduePlants.length > 1) {
            const summaryTitle = '🪴 PlantDaddy Daily Summary';
            const summaryBody = `You have ${overduePlants.length} plants that need watering today.`;
            await sendPushoverNotification(summaryTitle, summaryBody, 0);

            if (isApnsConfigured()) {
              const overdueIds = overduePlants.map(p => p.id);
              await sendApnsNotification(userId, summaryTitle, summaryBody, {
                threadId: "watering",
                category: "WATERING_SUMMARY",
                plantIds: overdueIds,
              });
            }
          }
        } catch (err) {
          console.error(`[scheduler] Error checking plants for user ${userId}:`, err);
        }
      });
    }

    console.log(`[scheduler] Daily check complete. Sent ${totalNotifications} notification(s).`);
  } catch (error) {
    console.error('[scheduler] Error in plant check task:', error);
  }
}

// Start the scheduler - checks every hour
export function startScheduler() {
  console.log('[scheduler] Starting PlantDaddy notification scheduler...');
  console.log(`[scheduler] Will check plants daily at ${DEFAULT_CHECK_HOUR}:00.`);

  // Run once on startup (will only send if it's past check hour and hasn't run today)
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
