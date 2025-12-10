import { 
  type Plant, 
  type Location, 
  type WateringHistory, 
  type NotificationSettings,
  type User,
  type PlantHealthRecord,
  type CareActivity
} from "@shared/schema";
import { type IStorage } from "./storage";
import { getCurrentUserId } from "./user-context";
import archiver from "archiver";
import { ObjectStorageService } from "./objectStorage";
import { Readable } from "stream";

export interface UserBackupData {
  exportInfo: {
    exportDate: string;
    username: string;
    version: string;
  };
  plants: Plant[];
  locations: Location[];
  wateringHistory: WateringHistory[];
  plantHealthRecords: PlantHealthRecord[];
  careActivities: CareActivity[];
  notificationSettings?: Omit<NotificationSettings, 'pushoverAppToken' | 'pushoverUserKey' | 'sendgridApiKey'>;
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
    const [plants, locations, wateringHistory, plantHealthRecords, careActivities, notificationSettings] = await Promise.all([
      this.storage.getAllPlants(),
      this.storage.getAllLocations(),
      this.storage.getAllWateringHistoryForUser(),
      this.storage.getAllHealthRecordsForUser(),
      this.storage.getAllCareActivitiesForUser(),
      this.storage.getNotificationSettings()
    ]);

    // Sanitize notification settings to remove sensitive tokens
    const sanitizedNotificationSettings = notificationSettings ? {
      id: notificationSettings.id,
      userId: notificationSettings.userId,
      enabled: notificationSettings.enabled,
      pushoverEnabled: notificationSettings.pushoverEnabled,
      emailEnabled: notificationSettings.emailEnabled,
      emailAddress: notificationSettings.emailAddress,
      lastUpdated: notificationSettings.lastUpdated
      // Excluded: pushoverAppToken, pushoverUserKey, sendgridApiKey for security
    } : undefined;

    const backupData: UserBackupData = {
      exportInfo: {
        exportDate: new Date().toISOString(),
        username: user.username,
        version: "1.0.0"
      },
      plants,
      locations,
      wateringHistory,
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
    const objectStorageService = new ObjectStorageService();
    
    for (const plant of backupData.plants) {
      if (plant.imageUrl) {
        try {
          // Get image file from Object Storage
          const imageFile = await objectStorageService.getObjectEntityFile(plant.imageUrl);
          const imageStream = imageFile.createReadStream();
          
          // Generate safe filename for the image
          const imageExtension = plant.imageUrl.split('.').pop() || 'jpg';
          const safeImageName = `images/plant-${plant.id}-${plant.name.replace(/[^a-zA-Z0-9]/g, '_')}.${imageExtension}`;
          
          archive.append(imageStream, { name: safeImageName });
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
    const { plants, locations, wateringHistory, plantHealthRecords, careActivities } = backupData;
    return `Backup includes:\n- ${plants.length} plants\n- ${locations.length} locations\n- ${wateringHistory.length} watering records\n- ${plantHealthRecords.length} health records\n- ${careActivities.length} care activities\n- Notification settings`;
  }
}