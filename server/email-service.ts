import { MailService } from '@sendgrid/mail';
import { Plant } from '@shared/schema';
import { daysUntilWatering } from '../client/src/lib/date-utils';

// Initialize SendGrid mail service
const mailService = new MailService();

/**
 * Configure the SendGrid email service with an API key
 * @param apiKey SendGrid API key
 */
export function configureEmailService(apiKey: string): void {
  try {
    mailService.setApiKey(apiKey);
    console.log('SendGrid email service configured successfully');
  } catch (error) {
    console.error('Failed to configure SendGrid email service:', error);
    throw new Error('Failed to configure email service');
  }
}

/**
 * Send a plant watering notification via email
 * @param plant The plant that needs watering
 * @param recipientEmail Email address to send the notification to
 * @returns Promise resolving to true if email was sent, false otherwise
 */
export async function sendPlantWateringEmail(
  plant: Plant,
  recipientEmail: string
): Promise<boolean> {
  try {
    // Calculate days overdue for watering
    const daysOverdue = -daysUntilWatering(plant.lastWatered, plant.wateringFrequency);
    const isUrgent = daysOverdue > 2;
    
    // Create a subject line based on urgency
    const subject = isUrgent 
      ? `🚨 PlantDaddy: ${plant.name} urgently needs water (${daysOverdue} days overdue)!` 
      : `🪴 PlantDaddy: Time to water your ${plant.name}`;
    
    // Create an HTML message with styling
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2c974b; margin-top: 0;">Plant Watering Reminder</h2>
        ${isUrgent 
          ? `<p style="font-size: 16px; color: #d73a49; font-weight: bold;">Your ${plant.name} is ${daysOverdue} days overdue for watering!</p>` 
          : `<p style="font-size: 16px;">It's time to water your ${plant.name}.</p>`
        }
        <div style="background-color: #f6f8fa; border-radius: 6px; padding: 15px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #24292e;">Plant Details</h3>
          <ul style="padding-left: 20px; color: #24292e;">
            <li><strong>Name:</strong> ${plant.name}</li>
            <li><strong>Species:</strong> ${plant.species}</li>
            <li><strong>Location:</strong> ${plant.location}</li>
            <li><strong>Last Watered:</strong> ${new Date(plant.lastWatered).toLocaleDateString()}</li>
            <li><strong>Watering Frequency:</strong> Every ${plant.wateringFrequency} days</li>
          </ul>
        </div>
        <p style="margin-bottom: 30px;">Log in to <a href="https://plantdaddy.replit.app" style="color: #0366d6; text-decoration: none;">PlantDaddy</a> to mark this plant as watered.</p>
        <div style="font-size: 12px; color: #586069; border-top: 1px solid #e1e4e8; padding-top: 15px;">
          <p>This is an automated message from PlantDaddy, your plant care companion.</p>
        </div>
      </div>
    `;
    
    // Create a plain text version for email clients that don't support HTML
    const text = `
      PLANT WATERING REMINDER
      
      ${isUrgent ? `Your ${plant.name} is ${daysOverdue} days overdue for watering!` : `It's time to water your ${plant.name}.`}
      
      Plant Details:
      - Name: ${plant.name}
      - Species: ${plant.species}
      - Location: ${plant.location}
      - Last Watered: ${new Date(plant.lastWatered).toLocaleDateString()}
      - Watering Frequency: Every ${plant.wateringFrequency} days
      
      Log in to PlantDaddy to mark this plant as watered: https://plantdaddy.replit.app
      
      This is an automated message from PlantDaddy, your plant care companion.
    `;
    
    // Debug log
    console.log(`Sending watering email to ${recipientEmail} for plant: ${plant.name}`);
    
    // Send the email
    await mailService.send({
      to: recipientEmail,
      from: 'notifications@plantdaddy.replit.app',  // Must be a verified sender in your SendGrid account
      subject,
      text,
      html
    });
    
    console.log(`Successfully sent watering email to ${recipientEmail} for plant: ${plant.name}`);
    return true;
  } catch (error) {
    console.error('Error sending watering email:', error);
    return false;
  }
}

/**
 * Send a welcome email to a new user
 * @param username The user's username
 * @param recipientEmail Email address to send the welcome message to
 * @returns Promise resolving to true if email was sent, false otherwise
 */
export async function sendWelcomeEmail(
  username: string,
  recipientEmail: string
): Promise<boolean> {
  try {
    const subject = '🪴 Welcome to PlantDaddy!';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2c974b; margin-top: 0;">Welcome to PlantDaddy!</h2>
        <p style="font-size: 16px;">Hello ${username},</p>
        <p>Thank you for setting up email notifications in PlantDaddy. You'll now receive timely alerts when your plants need watering.</p>
        <p>Here's how it works:</p>
        <ul style="padding-left: 20px; color: #24292e;">
          <li>Daily plant checks to ensure nothing gets missed</li>
          <li>Notifications sent only when plants need watering</li>
          <li>Detailed information about each plant's needs</li>
        </ul>
        <p style="margin: 25px 0;">
          <a href="https://plantdaddy.replit.app" style="background-color: #2c974b; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">Visit PlantDaddy</a>
        </p>
        <div style="font-size: 12px; color: #586069; border-top: 1px solid #e1e4e8; padding-top: 15px;">
          <p>This is an automated message from PlantDaddy, your plant care companion.</p>
        </div>
      </div>
    `;
    
    const text = `
      WELCOME TO PLANTDADDY!
      
      Hello ${username},
      
      Thank you for setting up email notifications in PlantDaddy. You'll now receive timely alerts when your plants need watering.
      
      Here's how it works:
      - Daily plant checks to ensure nothing gets missed
      - Notifications sent only when plants need watering
      - Detailed information about each plant's needs
      
      Visit PlantDaddy: https://plantdaddy.replit.app
      
      This is an automated message from PlantDaddy, your plant care companion.
    `;
    
    console.log(`Sending welcome email to ${recipientEmail}`);
    
    await mailService.send({
      to: recipientEmail,
      from: 'notifications@plantdaddy.replit.app',  // Must be a verified sender in your SendGrid account
      subject,
      text,
      html
    });
    
    console.log(`Successfully sent welcome email to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending welcome email:', error);
    return false;
  }
}

/**
 * Send a test email to verify the configuration is working
 * @param recipientEmail Email address to send the test message to
 * @returns Promise resolving to true if email was sent, false otherwise
 */
export async function sendTestEmail(recipientEmail: string): Promise<boolean> {
  try {
    const subject = '🪴 PlantDaddy: Test Notification';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 8px;">
        <h2 style="color: #2c974b; margin-top: 0;">PlantDaddy Email Test</h2>
        <p style="font-size: 16px;">This is a test email from PlantDaddy.</p>
        <p>If you're receiving this message, your email notification settings are configured correctly! 🎉</p>
        <div style="background-color: #f6f8fa; border-radius: 6px; padding: 15px; margin: 15px 0;">
          <h3 style="margin-top: 0; color: #24292e;">What to expect</h3>
          <p>You'll receive emails like this when:</p>
          <ul style="padding-left: 20px; color: #24292e;">
            <li>Your plants need watering</li>
            <li>Important plant care reminders</li>
            <li>System notifications about your account</li>
          </ul>
        </div>
        <p style="margin-bottom: 30px;">No further action is required. Your plants will thank you!</p>
        <div style="font-size: 12px; color: #586069; border-top: 1px solid #e1e4e8; padding-top: 15px;">
          <p>This is an automated test message from PlantDaddy, your plant care companion.</p>
        </div>
      </div>
    `;
    
    const text = `
      PLANTDADDY EMAIL TEST
      
      This is a test email from PlantDaddy.
      
      If you're receiving this message, your email notification settings are configured correctly!
      
      What to expect:
      You'll receive emails like this when:
      - Your plants need watering
      - Important plant care reminders
      - System notifications about your account
      
      No further action is required. Your plants will thank you!
      
      This is an automated test message from PlantDaddy, your plant care companion.
    `;
    
    console.log(`Sending test email to ${recipientEmail}`);
    
    await mailService.send({
      to: recipientEmail,
      from: 'notifications@plantdaddy.replit.app',  // Must be a verified sender in your SendGrid account
      subject,
      text,
      html
    });
    
    console.log(`Successfully sent test email to ${recipientEmail}`);
    return true;
  } catch (error) {
    console.error('Error sending test email:', error);
    return false;
  }
}