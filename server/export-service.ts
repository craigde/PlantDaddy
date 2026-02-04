import {
  type Plant,
  type Location,
  type NotificationSettings,
  type User,
  type PlantHealthRecord,
  type CareActivity
} from "@shared/schema";
import { type IStorage } from "./storage";
import { getCurrentUserId } from "./user-context";
import archiver from "archiver";
import { R2StorageService, isR2Configured } from "./r2Storage";
import { Readable } from "stream";
import * as fs from "fs";
import * as path from "path";

export interface UserBackupData {
  exportInfo: {
    exportDate: string;
    username: string;
    version: string;
  };
  plants: Plant[];
  locations: Location[];
  plantHealthRecords: PlantHealthRecord[];
  careActivities: CareActivity[];
  notificationSettings?: Omit<NotificationSettings, 'sendgridApiKey'>;
}

export interface ExportResult {
  stream: Readable;
  filename: string;
}

export class ExportService {
  constructor(private storage: IStorage) {}

  // Export user data as JSON with sanitized sensitive information
  async exportUserData(): Promise<UserBackupData> {
    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error("User not authenticated - cannot export data");
    }

    // Get user info for the export metadata
    const user = await this.storage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Gather all user data
    const [plants, locations, plantHealthRecords, careActivities, notificationSettings] = await Promise.all([
      this.storage.getAllPlants(),
      this.storage.getAllLocations(),
      this.storage.getAllHealthRecordsForUser(),
      this.storage.getAllCareActivitiesForUser(),
      this.storage.getNotificationSettings()
    ]);

    // Sanitize notification settings to remove sensitive tokens
    const sanitizedNotificationSettings = notificationSettings ? {
      id: notificationSettings.id,
      userId: notificationSettings.userId,
      enabled: notificationSettings.enabled,
      emailEnabled: notificationSettings.emailEnabled,
      emailAddress: notificationSettings.emailAddress,
      reminderTime: notificationSettings.reminderTime,
      reminderDaysBefore: notificationSettings.reminderDaysBefore,
      lastNotifiedDate: notificationSettings.lastNotifiedDate,
      lastUpdated: notificationSettings.lastUpdated
      // Excluded: sendgridApiKey for security
    } : undefined;

    const backupData: UserBackupData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        username: user.username,
        version: "1.0.0"
      },
      plants,
      locations,
      plantHealthRecords,
      careActivities,
      notificationSettings: sanitizedNotificationSettings
    };

    return backupData;
  }

  // Export complete backup as ZIP file with images
  async exportUserBackupArchive(): Promise<ExportResult> {
    const userId = getCurrentUserId();
    if (!userId) {
      throw new Error("User not authenticated - cannot export data");
    }

    const user = await this.storage.getUser(userId);
    if (!user) {
      throw new Error("User not found");
    }

    // Get backup data
    const backupData = await this.exportUserData();
    
    // Create ZIP archive
    const archive = archiver('zip', {
      zlib: { level: 9 } // Compression level
    });

    // Add backup JSON to archive
    archive.append(this.formatBackupData(backupData), { name: 'backup.json' });

    // Add plant images to archive
    for (const plant of backupData.plants) {
      if (plant.imageUrl) {
        try {
          // Handle local uploads (stored in /uploads/)
          if (plant.imageUrl.startsWith('/uploads/')) {
            const localPath = path.join(process.cwd(), plant.imageUrl);
            if (fs.existsSync(localPath)) {
              const imageStream = fs.createReadStream(localPath);
              const imageExtension = plant.imageUrl.split('.').pop() || 'jpg';
              const safeImageName = `images/plant-${plant.id}-${plant.name.replace(/[^a-zA-Z0-9]/g, '_')}.${imageExtension}`;
              archive.append(imageStream, { name: safeImageName });
            }
          }
          // R2 images would need to be downloaded first - skip for now as it's complex
          // Health record images in R2 format (/r2/...) are not included in exports
          // This is acceptable as the backup.json still contains the image URL references
        } catch (error) {
          console.warn(`Failed to include image for plant ${plant.id}: ${error}`);
          // Continue with other images even if one fails
        }
      }
    }

    // Finalize archive
    archive.finalize();

    const filename = this.generateBackupFileName(user.username);
    
    return {
      stream: archive,
      filename
    };
  }

  // Create a filename for the backup ZIP
  generateBackupFileName(username: string): string {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    return `plantdaddy-backup-${username}-${timestamp}.zip`;
  }

  // Convert backup data to JSON string with pretty formatting
  formatBackupData(backupData: UserBackupData): string {
    return JSON.stringify(backupData, null, 2);
  }

  // Get backup summary for display to user
  getBackupSummary(backupData: UserBackupData): string {
    const { plants, locations, plantHealthRecords, careActivities } = backupData;
    return `Backup includes:\n- ${plants.length} plants\n- ${locations.length} locations\n- ${plantHealthRecords.length} health records\n- ${careActivities.length} care activities\n- Notification settings`;
  }
}