import { Plant } from '@shared/schema';
import { daysUntilWatering, isOverdue } from '../client/src/lib/date-utils';
import { storage } from './storage';
import {
  configureEmailService,
  sendPlantWateringEmail,
  sendWelcomeEmail,
  sendTestEmail
} from './email-service';
import { sendApnsNotification, isApnsConfigured } from './apns-service';

export async function sendPlantWateringNotification(plant: Plant): Promise<boolean> {
  const daysOverdue = -daysUntilWatering(plant.lastWatered, plant.wateringFrequency);
  const isUrgent = daysOverdue > 2;

  const title = `🪴 PlantDaddy: ${plant.name} needs water!`;
  const message = isUrgent
    ? `Your ${plant.name} in ${plant.location} is ${daysOverdue} days overdue for watering!`
    : `Time to water your ${plant.name} in ${plant.location}`;

  const settings = await storage.getNotificationSettings();
  let success = false;

  // Send email notification if enabled
  if (settings?.emailEnabled && settings?.emailAddress && settings?.sendgridApiKey) {
    configureEmailService(settings.sendgridApiKey);
    const emailSent = await sendPlantWateringEmail(plant, settings.emailAddress);
    if (emailSent) success = true;
  }

  // Send APNs push notification
  if (isApnsConfigured() && plant.userId) {
    const apnsSent = await sendApnsNotification(
      plant.userId,
      title,
      message,
      { plantId: plant.id, threadId: "watering", category: "PLANT_WATERING" }
    );
    if (apnsSent > 0) success = true;
  }

  return success;
}

/**
 * Send a plant notification with custom title/message/priority.
 * Used by the scheduler for urgency-aware messaging.
 */
export async function sendPlantNotification(
  userId: number,
  plant: Plant,
  title: string,
  message: string,
  priority: number = 0
): Promise<boolean> {
  const settings = await storage.getNotificationSettings();
  let success = false;

  // Send email notification if enabled
  if (settings?.emailEnabled && settings?.emailAddress && settings?.sendgridApiKey) {
    configureEmailService(settings.sendgridApiKey);
    const emailSent = await sendPlantWateringEmail(plant, settings.emailAddress);
    if (emailSent) success = true;
  }

  // Send APNs push notification
  if (isApnsConfigured()) {
    const apnsSent = await sendApnsNotification(
      userId,
      title,
      message,
      { plantId: plant.id, threadId: "watering", category: "PLANT_WATERING" }
    );
    if (apnsSent > 0) success = true;
  }

  return success;
}

export async function sendWelcomeNotification(): Promise<boolean> {
  const title = '🪴 Welcome to PlantDaddy!';
  const message = 'Your plant watering notifications are now set up. You\'ll receive alerts when your plants need water.';

  const settings = await storage.getNotificationSettings();
  let success = false;

  // Send email welcome notification if enabled
  if (settings?.emailEnabled && settings?.emailAddress && settings?.sendgridApiKey) {
    configureEmailService(settings.sendgridApiKey);
    const user = await storage.getUser(settings.userId);
    const username = user?.username || "Plant Enthusiast";
    const emailSent = await sendWelcomeEmail(username, settings.emailAddress);
    if (emailSent) success = true;
  }

  return success;
}

export async function sendTestNotification(): Promise<{email: boolean, apns: boolean}> {
  const settings = await storage.getNotificationSettings();
  const result = { email: false, apns: false };

  // Send test email notification if enabled
  if (settings?.emailEnabled && settings?.emailAddress && settings?.sendgridApiKey) {
    configureEmailService(settings.sendgridApiKey);
    result.email = await sendTestEmail(settings.emailAddress);
  }

  // Send test APNs push notification
  if (isApnsConfigured() && settings?.userId) {
    const sent = await sendApnsNotification(
      settings.userId,
      '🪴 PlantDaddy: Test Notification',
      'Push notifications are working! You\'ll receive alerts when your plants need water.'
    );
    result.apns = sent > 0;
  }

  return result;
}

export async function checkPlantsAndSendNotifications(plants: Plant[]): Promise<number> {
  let notificationsSent = 0;

  for (const plant of plants) {
    if (isOverdue(plant.lastWatered, plant.wateringFrequency)) {
      const sent = await sendPlantWateringNotification(plant);
      if (sent) notificationsSent++;
    }
  }

  return notificationsSent;
}
