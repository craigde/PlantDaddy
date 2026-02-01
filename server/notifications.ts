import fetch from 'node-fetch';
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

// Pushover API endpoint
const PUSHOVER_API_URL = 'https://api.pushover.net/1/messages.json';

// Load environment variables as fallbacks
const ENV_PUSHOVER_APP_TOKEN = process.env.PUSHOVER_APP_TOKEN;
const ENV_PUSHOVER_USER_KEY = process.env.PUSHOVER_USER_KEY;

export async function sendPushoverNotification(
  title: string,
  message: string,
  priority: number = 0,
  url?: string,
  urlTitle?: string
): Promise<boolean> {
  // Get notification settings from storage
  const settings = await storage.getNotificationSettings();
  
  // Use settings if available, otherwise fallback to environment variables
  const pushoverEnabled = settings?.enabled !== false; // Default to true if not set
  const pushoverAppToken = settings?.pushoverAppToken || ENV_PUSHOVER_APP_TOKEN;
  const pushoverUserKey = settings?.pushoverUserKey || ENV_PUSHOVER_USER_KEY;
  
  // If notifications are disabled or credentials are missing, don't send notification
  if (!pushoverEnabled) {
    console.log('Notifications are disabled in settings. Skipping notification.');
    return false;
  }
  
  if (!pushoverAppToken || !pushoverUserKey) {
    return false;
  }

  try {
    const payload = {
      token: pushoverAppToken,
      user: pushoverUserKey,
      title,
      message,
      priority,
      ...(url && { url }),
      ...(urlTitle && { url_title: urlTitle })
    };

    // Debug the request we're about to make (without showing full token/key)
    console.log(`Sending notification to Pushover: "${title}"`);
    
    const response = await fetch(PUSHOVER_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json() as any;
    
    if (response.ok && data.status === 1) {
      console.log(`Notification sent successfully: ${title}`);
      return true;
    } else {
      console.error('Failed to send notification:', data);
      return false;
    }
  } catch (error) {
    console.error('Error sending Pushover notification:', error);
    return false;
  }
}

export async function sendPlantWateringNotification(plant: Plant): Promise<boolean> {
  const daysOverdue = -daysUntilWatering(plant.lastWatered, plant.wateringFrequency);
  const isUrgent = daysOverdue > 2;
  
  const title = `🪴 PlantDaddy: ${plant.name} needs water!`;
  const message = isUrgent 
    ? `Your ${plant.name} in ${plant.location} is ${daysOverdue} days overdue for watering!` 
    : `Time to water your ${plant.name} in ${plant.location}`;
  
  // Use higher priority (1) for urgent notifications
  const priority = isUrgent ? 1 : 0;
  
  // Get notification settings to determine if email should be sent
  const settings = await storage.getNotificationSettings();
  let success = false;
  
  // Send Pushover notification if enabled
  if (settings?.pushoverEnabled !== false) {
    const pushoverSent = await sendPushoverNotification(title, message, priority);
    if (pushoverSent) success = true;
  }
  
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

  // Send Pushover notification if enabled
  if (settings?.pushoverEnabled !== false) {
    const pushoverSent = await sendPushoverNotification(title, message, priority);
    if (pushoverSent) success = true;
  }

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
  
  // Get notification settings
  const settings = await storage.getNotificationSettings();
  let success = false;
  
  // Send Pushover notification if enabled
  if (settings?.pushoverEnabled !== false) {
    const pushoverSent = await sendPushoverNotification(title, message, 0);
    if (pushoverSent) success = true;
  }
  
  // Send email welcome notification if enabled
  if (settings?.emailEnabled && settings?.emailAddress && settings?.sendgridApiKey) {
    // Configure email service with API key
    configureEmailService(settings.sendgridApiKey);
    
    // Send welcome email (using username if available, otherwise "Plant Enthusiast")
    const user = await storage.getUser(settings.userId);
    const username = user?.username || "Plant Enthusiast";
    const emailSent = await sendWelcomeEmail(username, settings.emailAddress);
    if (emailSent) success = true;
  }
  
  return success;
}

export async function sendTestNotification(): Promise<{pushover: boolean, email: boolean, apns: boolean}> {
  const settings = await storage.getNotificationSettings();
  const result = { pushover: false, email: false, apns: false };

  // Send test Pushover notification if enabled
  if (settings?.pushoverEnabled && settings?.pushoverAppToken && settings?.pushoverUserKey) {
    const title = '🪴 PlantDaddy: Test Notification';
    const message = 'This is a test notification from PlantDaddy. If you received this, your Pushover notifications are configured correctly!';
    result.pushover = await sendPushoverNotification(title, message, 0);
  }

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