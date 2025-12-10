import { IStorage } from "./storage";
import { ObjectStorageService } from "./objectStorage";
import JSZip from "jszip";
import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { 
  type Plant, 
  type InsertPlant,
  type Location,
  type WateringHistory,
  type InsertWateringHistory,
  type NotificationSettings,
  type InsertNotificationSettings,
  type PlantHealthRecord,
  type InsertPlantHealthRecord,
  type CareActivity,
  type InsertCareActivity
} from "@shared/schema";

// Validation schemas for import data
const BackupPlantSchema = z.object({
  id: z.number(),
  name: z.string(),
  species: z.string().nullable(),
  location: z.string(),
  wateringFrequency: z.number(),
  lastWatered: z.string().nullable().transform(val => val ? new Date(val) : undefined),
  notes: z.string().nullable(),
  imageUrl: z.string().nullable(),
  userId: z.number()
});

const BackupLocationSchema = z.object({
  id: z.number(),
  name: z.string(),
  isDefault: z.boolean(),
  userId: z.number()
});

const BackupWateringHistorySchema = z.object({
  id: z.number(),
  plantId: z.number(),
  wateredAt: z.string().transform(val => new Date(val))
});

const BackupPlantHealthRecordSchema = z.object({
  id: z.number(),
  plantId: z.number(),
  status: z.enum(['thriving', 'struggling', 'sick']),
  notes: z.string().nullable(),
  imageUrl: z.string().nullable(),
  recordedAt: z.string().transform(val => new Date(val)),
  userId: z.number()
});

const BackupCareActivitySchema = z.object({
  id: z.number(),
  plantId: z.number(),
  activityType: z.enum(['watering', 'fertilizing', 'repotting', 'pruning', 'misting', 'rotating']),
  notes: z.string().nullable(),
  performedAt: z.string().transform(val => new Date(val)),
  userId: z.number(),
  originalWateringId: z.number().nullable()
});

const BackupNotificationSettingsSchema = z.object({
  enabled: z.boolean(),
  pushoverEnabled: z.boolean().optional(),
  emailEnabled: z.boolean().optional(),
  emailAddress: z.string().nullable().optional(),
  lastUpdated: z.string().transform(val => new Date(val))
});

const BackupExportInfoSchema = z.object({
  version: z.string(),
  exportDate: z.string().transform(val => new Date(val)), // Changed to match export
  username: z.string()
});

const BackupDataSchema = z.object({
  exportInfo: BackupExportInfoSchema,
  plants: z.array(BackupPlantSchema),
  locations: z.array(BackupLocationSchema),
  wateringHistory: z.array(BackupWateringHistorySchema),
  plantHealthRecords: z.array(BackupPlantHealthRecordSchema).optional().default([]), // Optional for backward compatibility
  careActivities: z.array(BackupCareActivitySchema).optional().default([]), // Optional for backward compatibility
  notificationSettings: BackupNotificationSettingsSchema.optional()
});

export type BackupData = z.infer<typeof BackupDataSchema>;
export type ImportMode = "merge" | "replace";

export interface ImportSummary {
  mode: ImportMode;
  plantsImported: number;
  locationsImported: number;
  wateringHistoryImported: number;
  healthRecordsImported: number;
  careActivitiesImported: number;
  imagesImported: number;
  notificationSettingsUpdated: boolean;
  warnings: string[];
}

export class ImportService {
  private objectStorageService: ObjectStorageService;
  
  constructor(private storage: IStorage) {
    this.objectStorageService = new ObjectStorageService();
  }

  async importFromZipBuffer(
    zipBuffer: Buffer, 
    mode: ImportMode = "merge"
  ): Promise<ImportSummary> {
    // Extract and validate backup data
    const { backupData, imageFiles } = await this.extractZipContents(zipBuffer);
    
    // Validate backup data
    const validatedData = BackupDataSchema.parse(backupData);
    
    // Initialize summary
    const summary: ImportSummary = {
      mode,
      plantsImported: 0,
      locationsImported: 0,
      wateringHistoryImported: 0,
      healthRecordsImported: 0,
      careActivitiesImported: 0,
      imagesImported: 0,
      notificationSettingsUpdated: false,
      warnings: []
    };
    
    // Create ID mapping for plants
    const plantIdMapping = new Map<number, number>();
    
    try {
      // Delete all user data if in replace mode - do this inside try block to prevent data loss
      if (mode === "replace") {
        await this.storage.deleteAllUserData();
      }
      // 1. Restore locations first
      const locationMapping = await this.restoreLocations(validatedData.locations, summary);
      
      // 2. Restore plants with image handling
      await this.restorePlants(
        validatedData.plants, 
        imageFiles, 
        mode, 
        plantIdMapping, 
        summary
      );
      
      // 3. Restore watering history with ID remapping
      await this.restoreWateringHistory(
        validatedData.wateringHistory, 
        plantIdMapping, 
        summary
      );
      
      // 4. Restore health records with ID remapping
      await this.restoreHealthRecords(
        validatedData.plantHealthRecords, 
        plantIdMapping, 
        summary
      );
      
      // 5. Restore care activities with ID remapping
      await this.restoreCareActivities(
        validatedData.careActivities, 
        plantIdMapping, 
        summary
      );
      
      // 6. Restore notification settings (safely)
      if (validatedData.notificationSettings) {
        await this.restoreNotificationSettings(validatedData.notificationSettings, summary);
      }
      
    } catch (error) {
      summary.warnings.push(`Import failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
    
    return summary;
  }
  
  private async extractZipContents(zipBuffer: Buffer): Promise<{
    backupData: any;
    imageFiles: Map<string, Buffer>;
  }> {
    const zip = new JSZip();
    
    // Security: Safer limits for production
    const MAX_UNCOMPRESSED_SIZE = 10 * 1024 * 1024; // 10MB max uncompressed (reduced)
    const MAX_FILE_COUNT = 100; // Maximum number of files (reduced)
    const MAX_INDIVIDUAL_FILE_SIZE = 5 * 1024 * 1024; // 5MB per file (reduced)
    const MAX_BACKUP_JSON_SIZE = 1024 * 1024; // 1MB for backup.json

    let contents: JSZip;
    try {
      contents = await zip.loadAsync(zipBuffer);
    } catch (error) {
      throw new Error(`Invalid or corrupted ZIP file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    const imageFiles = new Map<string, Buffer>();
    let backupData: any = null;
    let totalExtractedSize = 0;
    let fileCount = 0;

    // Helper function to validate filename safety (prevent path traversal)
    const isValidFilename = (filename: string): boolean => {
      // Prevent path traversal attacks
      if (filename.includes('..') || filename.includes('\\') || filename.startsWith('/')) {
        return false;
      }
      
      // Allow only safe characters (alphanumeric, dots, hyphens, underscores, forward slashes for paths)
      const safeFilenameRegex = /^[a-zA-Z0-9._/-]+$/;
      return safeFilenameRegex.test(filename) && filename.length > 0 && filename.length <= 255;
    };

    // Helper function to safely extract with streaming and size limits
    const safeExtractFile = async (file: JSZip.JSZipObject, maxSize: number): Promise<Buffer> => {
      const chunks: Buffer[] = [];
      let currentSize = 0;

      return new Promise((resolve, reject) => {
        const stream = file.nodeStream();
        
        // Timeout protection (30 seconds max per file)
        const timeoutId = setTimeout(() => {
          stream.destroy();
          reject(new Error('File extraction timeout - potential ZIP bomb'));
        }, 30000);

        stream.on('data', (chunk: Buffer) => {
          currentSize += chunk.length;
          totalExtractedSize += chunk.length;

          // Check individual file size during extraction (reliable protection)
          if (currentSize > maxSize) {
            clearTimeout(timeoutId);
            stream.destroy();
            reject(new Error(`File exceeds size limit during extraction: ${Math.round(currentSize / 1024)}KB > ${Math.round(maxSize / 1024)}KB`));
            return;
          }

          // Check total extracted size during extraction (reliable protection)
          if (totalExtractedSize > MAX_UNCOMPRESSED_SIZE) {
            clearTimeout(timeoutId);
            stream.destroy();
            reject(new Error(`Total extracted size exceeds limit: ${Math.round(totalExtractedSize / 1024 / 1024)}MB > ${Math.round(MAX_UNCOMPRESSED_SIZE / 1024 / 1024)}MB`));
            return;
          }

          chunks.push(chunk);
        });

        stream.on('end', () => {
          clearTimeout(timeoutId);
          resolve(Buffer.concat(chunks));
        });

        stream.on('error', (error) => {
          clearTimeout(timeoutId);
          reject(new Error(`Failed to extract file: ${error.message}`));
        });
      });
    };

    // First pass: validate structure and count files
    for (const filename in contents.files) {
      const file = contents.files[filename];
      if (!file.dir) {
        fileCount++;

        // Check file count limit
        if (fileCount > MAX_FILE_COUNT) {
          throw new Error(`ZIP bomb protection: too many files (${fileCount} > ${MAX_FILE_COUNT})`);
        }

        // Validate filename safety
        if (!isValidFilename(filename)) {
          throw new Error(`Security: invalid or unsafe filename detected: ${filename}`);
        }
      }
    }

    // Extract backup.json first with strict size limit
    const backupFile = contents.file("backup.json");
    if (!backupFile) {
      throw new Error("Required backup.json file not found in ZIP");
    }

    try {
      const backupBuffer = await safeExtractFile(backupFile, MAX_BACKUP_JSON_SIZE);
      const backupText = backupBuffer.toString('utf8');
      backupData = JSON.parse(backupText);
    } catch (error) {
      throw new Error(`Failed to extract or parse backup.json: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }

    // Extract image files with safety checks
    const imageFolder = contents.folder("images");
    if (imageFolder) {
      for (const filename in imageFolder.files) {
        const file = imageFolder.files[filename];
        if (!file.dir && filename.startsWith("images/")) {
          const imageName = filename.replace("images/", "");

          // Validate filename safety
          if (!isValidFilename(filename) || !isValidFilename(imageName)) {
            console.warn(`Skipping unsafe filename: ${filename}`);
            continue;
          }

          // Validate file extension
          const validImageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'];
          const hasValidExtension = validImageExtensions.some(ext => 
            imageName.toLowerCase().endsWith(ext)
          );

          if (!hasValidExtension) {
            console.warn(`Skipping file with invalid image extension: ${imageName}`);
            continue;
          }

          try {
            const imageBuffer = await safeExtractFile(file, MAX_INDIVIDUAL_FILE_SIZE);

            // Validate that we actually got image data
            if (imageBuffer.length === 0) {
              console.warn(`Skipping empty image file: ${imageName}`);
              continue;
            }

            imageFiles.set(imageName, imageBuffer);
          } catch (error) {
            console.warn(`Failed to extract image file ${imageName}:`, error instanceof Error ? error.message : 'Unknown error');
            // Continue processing other files instead of failing the entire import
          }
        }
      }
    }

    console.log(`ZIP extraction completed safely: ${fileCount} files, ${Math.round(totalExtractedSize / 1024)}KB total`);
    return { backupData, imageFiles };
  }
  
  private async restoreLocations(
    locations: Array<z.infer<typeof BackupLocationSchema>>,
    summary: ImportSummary
  ): Promise<Map<string, string>> {
    const locationMapping = new Map<string, string>();
    
    for (const loc of locations) {
      if (!loc.isDefault) { // Only restore user-created locations
        try {
          // Check if location already exists before upserting
          const existingLocations = await this.storage.getAllLocations();
          const locationExists = existingLocations.some(
            existing => existing.name.toLowerCase() === loc.name.toLowerCase() && !existing.isDefault
          );
          
          const restoredLocation = await this.storage.upsertLocationByName(loc.name, false);
          locationMapping.set(loc.name, restoredLocation.name);
          
          // Only increment counter if location was actually created (not already existed)
          if (!locationExists) {
            summary.locationsImported++;
          }
        } catch (error) {
          summary.warnings.push(`Failed to restore location '${loc.name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
    }
    
    return locationMapping;
  }
  
  private async restorePlants(
    plants: Array<z.infer<typeof BackupPlantSchema>>,
    imageFiles: Map<string, Buffer>,
    mode: ImportMode,
    plantIdMapping: Map<number, number>,
    summary: ImportSummary
  ): Promise<void> {
    for (const plant of plants) {
      try {
        // Check for existing plant in merge mode
        if (mode === "merge") {
          const existingPlant = await this.storage.findPlantByDetails(
            plant.name, 
            plant.species, 
            plant.location
          );
          
          if (existingPlant) {
            // Update existing plant
            const updateData: Partial<InsertPlant> = {
              wateringFrequency: plant.wateringFrequency,
              notes: plant.notes
            };
            
            // Only update lastWatered if it was provided in the backup
            if (plant.lastWatered) {
              updateData.lastWatered = plant.lastWatered;
            }
            
            const updatedPlant = await this.storage.updatePlant(existingPlant.id, updateData);
            
            if (updatedPlant) {
              plantIdMapping.set(plant.id, updatedPlant.id);
              summary.plantsImported++;
            }
            continue;
          }
        }
        
        // Create new plant
        const plantData: InsertPlant = {
          name: plant.name,
          species: plant.species,
          location: plant.location,
          wateringFrequency: plant.wateringFrequency,
          lastWatered: plant.lastWatered || new Date(),
          notes: plant.notes,
          imageUrl: null, // Will be set after image upload
          userId: 0 // Will be set by storage layer based on current user context
        };
        
        const newPlant = await this.storage.createPlant(plantData);
        plantIdMapping.set(plant.id, newPlant.id);
        
        // Handle image restoration
        if (plant.imageUrl && imageFiles.size > 0) {
          const imageRestored = await this.restorePlantImage(
            plant.id, 
            newPlant.id, 
            imageFiles
          );
          
          if (imageRestored) {
            summary.imagesImported++;
          }
        }
        
        summary.plantsImported++;
        
      } catch (error) {
        summary.warnings.push(`Failed to restore plant '${plant.name}': ${error instanceof Error ? error.message : 'Unknown error'}`);
        // Note: Failed plants are not counted in plantsImported
      }
    }
  }
  
  private async restorePlantImage(
    oldPlantId: number,
    newPlantId: number,
    imageFiles: Map<string, Buffer>
  ): Promise<boolean> {
    try {
      // Look for image file with pattern: plant-{oldId}-*.ext
      const imagePattern = `plant-${oldPlantId}-`;
      let matchedImageName: string | null = null;
      let imageBuffer: Buffer | null = null;
      
      for (const filename of Array.from(imageFiles.keys())) {
        if (filename.startsWith(imagePattern)) {
          matchedImageName = filename;
          imageBuffer = imageFiles.get(filename) || null;
          break;
        }
      }
      
      if (!matchedImageName || !imageBuffer) {
        return false;
      }
      
      // Extract file extension
      const extension = matchedImageName.split('.').pop() || 'jpg';
      
      // TODO: Implement direct image upload to Object Storage
      // For now, skip image uploads during import
      // const imageKey = `${newPlantId}.${extension}`;
      // const imageUrl = await this.objectStorageService.uploadPlantImage(imageKey, imageBuffer);
      // await this.storage.updatePlant(newPlantId, { imageUrl });
      
      // Return false since upload is not implemented - prevents incorrect counter increment
      return false;
    } catch (error) {
      console.error(`Failed to restore image for plant ${newPlantId}:`, error);
      return false;
    }
  }
  
  private async restoreWateringHistory(
    wateringHistory: Array<z.infer<typeof BackupWateringHistorySchema>>,
    plantIdMapping: Map<number, number>,
    summary: ImportSummary
  ): Promise<void> {
    for (const entry of wateringHistory) {
      try {
        const newPlantId = plantIdMapping.get(entry.plantId);
        if (!newPlantId) {
          summary.warnings.push(`Skipping watering history entry: plant ID ${entry.plantId} not found`);
          continue;
        }
        
        const wateringData: InsertWateringHistory = {
          plantId: newPlantId,
          wateredAt: entry.wateredAt,
          userId: 0 // Will be set by storage layer based on current user context
        };
        
        await this.storage.createWateringHistory(wateringData);
        summary.wateringHistoryImported++;
        
      } catch (error) {
        summary.warnings.push(`Failed to restore watering history entry: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
  
  private async restoreNotificationSettings(
    settings: z.infer<typeof BackupNotificationSettingsSchema>,
    summary: ImportSummary
  ): Promise<void> {
    try {
      // Only restore safe notification settings (no tokens)
      const safeSettings: Partial<InsertNotificationSettings> = {
        enabled: settings.enabled,
        pushoverEnabled: settings.pushoverEnabled || false,
        emailEnabled: settings.emailEnabled || false,
        emailAddress: settings.emailAddress
        // Never restore: pushoverAppToken, pushoverUserKey, sendgridApiKey
      };
      
      await this.storage.updateNotificationSettings(safeSettings);
      summary.notificationSettingsUpdated = true;
    } catch (error) {
      summary.warnings.push(`Failed to restore notification settings: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private async restoreHealthRecords(
    healthRecords: Array<z.infer<typeof BackupPlantHealthRecordSchema>>,
    plantIdMapping: Map<number, number>,
    summary: ImportSummary
  ): Promise<void> {
    for (const record of healthRecords) {
      try {
        const newPlantId = plantIdMapping.get(record.plantId);
        if (!newPlantId) {
          summary.warnings.push(`Skipping health record: plant ID ${record.plantId} not found`);
          continue;
        }
        
        const healthData: InsertPlantHealthRecord = {
          plantId: newPlantId,
          status: record.status,
          notes: record.notes,
          imageUrl: null, // Set to null to avoid broken references - health record images aren't bundled in export
          recordedAt: record.recordedAt,
          userId: 0 // Will be set by storage layer based on current user context
        };
        
        await this.storage.createHealthRecord(healthData);
        summary.healthRecordsImported++;
        
      } catch (error) {
        summary.warnings.push(`Failed to restore health record: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }

  private async restoreCareActivities(
    careActivities: Array<z.infer<typeof BackupCareActivitySchema>>,
    plantIdMapping: Map<number, number>,
    summary: ImportSummary
  ): Promise<void> {
    for (const activity of careActivities) {
      try {
        const newPlantId = plantIdMapping.get(activity.plantId);
        if (!newPlantId) {
          summary.warnings.push(`Skipping care activity: plant ID ${activity.plantId} not found`);
          continue;
        }
        
        const careData: InsertCareActivity = {
          plantId: newPlantId,
          activityType: activity.activityType,
          notes: activity.notes,
          performedAt: activity.performedAt,
          userId: 0, // Will be set by storage layer based on current user context
          originalWateringId: activity.originalWateringId // Preserve migration link if exists
        };
        
        await this.storage.createCareActivity(careData);
        summary.careActivitiesImported++;
        
      } catch (error) {
        summary.warnings.push(`Failed to restore care activity: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  }
}