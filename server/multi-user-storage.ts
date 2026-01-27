import { and, eq, sql, or, isNull } from "drizzle-orm";
import {
  users, type User, type InsertUser,
  plants, type Plant, type InsertPlant,
  locations, type Location, type InsertLocation,
  plantSpecies, type PlantSpecies, type InsertPlantSpecies,
  notificationSettings, type NotificationSettings, type InsertNotificationSettings,
  plantHealthRecords, type PlantHealthRecord, type InsertPlantHealthRecord,
  careActivities, type CareActivity, type InsertCareActivity
} from "@shared/schema";
import { db } from "./db";
import { getCurrentUserId, requireAuth } from "./user-context";
import { IStorage } from "./dbStorage";

export class MultiUserStorage implements IStorage {
  // User methods
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    
    // Create default locations for the new user
    await this.createDefaultLocationsForUser(user.id);
    
    // Create default notification settings for the new user
    await this.createDefaultNotificationSettingsForUser(user.id);
    
    return user;
  }
  
  // Helper method to create default locations for a new user
  private async createDefaultLocationsForUser(userId: number): Promise<void> {
    // First check if the user already has locations (to avoid duplicate creation)
    const existingLocations = await db
      .select()
      .from(locations)
      .where(eq(locations.userId, userId));
    
    if (existingLocations.length > 0) {
      console.log(`User ${userId} already has ${existingLocations.length} locations, skipping default location creation`);
      return;
    }
    
    const defaultLocations = [
      { name: "Living Room", isDefault: true },
      { name: "Bedroom", isDefault: true },
      { name: "Kitchen", isDefault: true },
      { name: "Bathroom", isDefault: true },
      { name: "Office", isDefault: true },
      { name: "Balcony", isDefault: true },
      { name: "Dining Room", isDefault: true },
      { name: "Hallway", isDefault: true },
      { name: "Porch", isDefault: true },
      { name: "Patio", isDefault: true }
    ];
    
    // Use bulk insert for better performance and atomicity
    try {
      const valuesToInsert = defaultLocations.map(loc => ({
        name: loc.name,
        userId: userId,
        isDefault: true
      }));
      
      // Bulk insert all locations at once
      await db.insert(locations).values(valuesToInsert);
      console.log(`Successfully created ${defaultLocations.length} default locations for user ${userId}`);
    } catch (error) {
      console.error(`Failed to create default locations for user ${userId}:`, error);
    }
  }
  
  // Helper method to create default notification settings for a new user
  private async createDefaultNotificationSettingsForUser(userId: number): Promise<void> {
    // Check if settings already exist
    const [existingSettings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));
    
    if (existingSettings) {
      console.log(`User ${userId} already has notification settings, skipping default creation`);
      return;
    }
    
    try {
      await db.insert(notificationSettings).values({
        enabled: true,
        pushoverAppToken: process.env.PUSHOVER_APP_TOKEN || null,
        pushoverUserKey: process.env.PUSHOVER_USER_KEY || null,
        userId: userId,
        lastUpdated: new Date()
      });
      console.log(`Created default notification settings for user ${userId}`);
    } catch (error) {
      console.error(`Failed to create default notification settings for user ${userId}:`, error);
    }
  }

  // Plant methods
  async getAllPlants(): Promise<Plant[]> {
    const userId = getCurrentUserId();
    
    if (userId === null) {
      return []; // No plants for unauthenticated users
    }
    
    return await db
      .select()
      .from(plants)
      .where(eq(plants.userId, userId));
  }

  async getPlant(id: number): Promise<Plant | undefined> {
    const userId = getCurrentUserId();
    
    if (userId === null) {
      return undefined;
    }
    
    const [plant] = await db
      .select()
      .from(plants)
      .where(and(eq(plants.id, id), eq(plants.userId, userId)));
    
    return plant || undefined;
  }

  async createPlant(insertPlant: InsertPlant): Promise<Plant> {
    const userId = requireAuth();
    
    const [plant] = await db
      .insert(plants)
      .values({
        ...insertPlant,
        userId
      })
      .returning();
    
    return plant;
  }

  async updatePlant(id: number, plantUpdate: Partial<InsertPlant>): Promise<Plant | undefined> {
    const userId = requireAuth();
    
    const [updatedPlant] = await db
      .update(plants)
      .set(plantUpdate)
      .where(and(eq(plants.id, id), eq(plants.userId, userId)))
      .returning();
    
    return updatedPlant || undefined;
  }

  async deletePlant(id: number): Promise<boolean> {
    const userId = requireAuth();
    
    const result = await db
      .delete(plants)
      .where(and(eq(plants.id, id), eq(plants.userId, userId)))
      .returning();
    
    return result.length > 0;
  }

  // Location methods
  async getAllLocations(): Promise<Location[]> {
    const userId = getCurrentUserId();
    
    // If not logged in, return empty array
    if (userId === null) {
      console.log("No user ID found, returning empty locations array");
      return [];
    }
    
    // Get all locations for the current user
    console.log(`Getting locations for user ID: ${userId}`);
    const userLocations = await db
      .select()
      .from(locations)
      .where(eq(locations.userId, userId));
    
    console.log(`Found ${userLocations.length} locations for user ${userId}`);
    return userLocations;
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const userId = getCurrentUserId();
    
    if (userId === null) {
      return undefined;
    }
    
    const [location] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.userId, userId)));
    
    return location || undefined;
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const userId = requireAuth();
    
    // Check if a location with the same name already exists for this user
    const [existingLocation] = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.name, insertLocation.name),
          eq(locations.userId, userId)
        )
      );
    
    if (existingLocation) {
      throw new Error(`Location with name '${insertLocation.name}' already exists`);
    }
    
    const [location] = await db
      .insert(locations)
      .values({
        ...insertLocation,
        userId
      })
      .returning();
    
    return location;
  }

  async updateLocation(id: number, locationUpdate: Partial<InsertLocation>): Promise<Location | undefined> {
    const userId = requireAuth();
    
    // If name is being updated, check if it already exists for this user
    if (locationUpdate.name) {
      const [nameExists] = await db
        .select()
        .from(locations)
        .where(
          and(
            eq(locations.name, locationUpdate.name),
            eq(locations.userId, userId)
          )
        );
      
      if (nameExists && nameExists.id !== id) {
        throw new Error(`Location with name '${locationUpdate.name}' already exists`);
      }
    }
    
    const [updatedLocation] = await db
      .update(locations)
      .set(locationUpdate)
      .where(and(eq(locations.id, id), eq(locations.userId, userId)))
      .returning();
    
    return updatedLocation || undefined;
  }

  async deleteLocation(id: number): Promise<boolean> {
    const userId = requireAuth();
    
    // Get the location to check its name
    const location = await this.getLocation(id);
    if (!location) {
      return false;
    }
    
    // Check if this location is used by any plants owned by this user
    const plantsWithLocation = await db
      .select()
      .from(plants)
      .where(
        and(
          eq(plants.location, location.name),
          eq(plants.userId, userId)
        )
      );
    
    if (plantsWithLocation.length > 0) {
      throw new Error('Cannot delete location that is being used by plants');
    }
    
    const result = await db
      .delete(locations)
      .where(and(eq(locations.id, id), eq(locations.userId, userId)))
      .returning();
    
    return result.length > 0;
  }

  // Plant species catalog methods
  // Returns global species (userId = null) + current user's custom species
  async getAllPlantSpecies(): Promise<PlantSpecies[]> {
    const userId = getCurrentUserId();

    // If no user is logged in, return only global species
    if (!userId) {
      return await db.select().from(plantSpecies).where(isNull(plantSpecies.userId));
    }

    // Return global species + user's custom species
    return await db.select().from(plantSpecies).where(
      or(
        isNull(plantSpecies.userId), // Global species
        eq(plantSpecies.userId, userId) // User's custom species
      )
    );
  }

  async getPlantSpecies(id: number): Promise<PlantSpecies | undefined> {
    const [species] = await db.select().from(plantSpecies).where(eq(plantSpecies.id, id));
    return species || undefined;
  }

  async getPlantSpeciesByName(name: string): Promise<PlantSpecies | undefined> {
    const [species] = await db
      .select()
      .from(plantSpecies)
      .where(eq(plantSpecies.name, name));
    
    return species || undefined;
  }

  async createPlantSpecies(insertSpecies: InsertPlantSpecies): Promise<PlantSpecies> {
    const userId = requireAuth(); // User must be logged in to create species

    // Check if species with this name already exists (global or user's own)
    const existingSpecies = await this.getPlantSpeciesByName(insertSpecies.name);

    if (existingSpecies) {
      throw new Error(`Plant species with name '${insertSpecies.name}' already exists`);
    }

    // Create species with userId (makes it user-specific, not global)
    const [species] = await db.insert(plantSpecies).values({
      ...insertSpecies,
      userId // Set to current user's ID
    }).returning();

    return species;
  }

  async updatePlantSpecies(id: number, speciesUpdate: Partial<InsertPlantSpecies>): Promise<PlantSpecies | undefined> {
    const userId = requireAuth(); // User must be logged in

    // Get the species to check ownership
    const species = await this.getPlantSpecies(id);
    if (!species) {
      throw new Error('Species not found');
    }

    // Cannot update global species (userId = null)
    if (species.userId === null) {
      throw new Error('Cannot update global plant species. Only custom species can be edited.');
    }

    // Cannot update species that belongs to another user
    if (species.userId !== userId) {
      throw new Error('You can only update your own custom species');
    }

    // If name is being updated, check if it already exists
    if (speciesUpdate.name) {
      const [nameExists] = await db
        .select()
        .from(plantSpecies)
        .where(eq(plantSpecies.name, speciesUpdate.name));

      if (nameExists && nameExists.id !== id) {
        throw new Error(`Plant species with name '${speciesUpdate.name}' already exists`);
      }
    }

    // Update the user's custom species
    const [updatedSpecies] = await db
      .update(plantSpecies)
      .set(speciesUpdate)
      .where(eq(plantSpecies.id, id))
      .returning();

    return updatedSpecies || undefined;
  }

  async deletePlantSpecies(id: number): Promise<boolean> {
    const userId = requireAuth(); // User must be logged in

    // Get the species to check ownership
    const species = await this.getPlantSpecies(id);
    if (!species) {
      return false;
    }

    // Cannot delete global species (userId = null)
    if (species.userId === null) {
      throw new Error('Cannot delete global plant species. Only custom species can be deleted.');
    }

    // Cannot delete species that belongs to another user
    if (species.userId !== userId) {
      throw new Error('You can only delete your own custom species');
    }

    // Check if this species is used by any of the user's plants
    const plantsWithSpecies = await db
      .select()
      .from(plants)
      .where(
        and(
          eq(plants.species, species.name),
          eq(plants.userId, userId)
        )
      );

    if (plantsWithSpecies.length > 0) {
      throw new Error(`Cannot delete species '${species.name}' because it is being used by ${plantsWithSpecies.length} plant(s)`);
    }

    // Delete the user's custom species
    const result = await db.delete(plantSpecies).where(eq(plantSpecies.id, id)).returning();
    return result.length > 0;
  }

  async searchPlantSpecies(query: string): Promise<PlantSpecies[]> {
    if (!query || query.trim() === '') {
      return this.getAllPlantSpecies();
    }
    
    const lowerQuery = query.toLowerCase();
    const allSpecies = await this.getAllPlantSpecies();
    
    return allSpecies.filter((species) => {
      return (
        species.name.toLowerCase().includes(lowerQuery) ||
        species.scientificName.toLowerCase().includes(lowerQuery) ||
        (species.description && species.description.toLowerCase().includes(lowerQuery)) ||
        (species.careLevel && species.careLevel.toLowerCase().includes(lowerQuery)) ||
        (species.family && species.family.toLowerCase().includes(lowerQuery))
      );
    });
  }

  // Notification settings methods
  async getNotificationSettings(): Promise<NotificationSettings | undefined> {
    const userId = getCurrentUserId();
    
    if (userId === null) {
      return undefined;
    }
    
    const [settings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));
    
    return settings || undefined;
  }

  async updateNotificationSettings(settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings> {
    const userId = requireAuth();
    
    // Check if settings exist for this user
    const [existingSettings] = await db
      .select()
      .from(notificationSettings)
      .where(eq(notificationSettings.userId, userId));
    
    if (existingSettings) {
      // Update existing settings
      const [updatedSettings] = await db
        .update(notificationSettings)
        .set({
          ...settings,
          lastUpdated: new Date()
        })
        .where(eq(notificationSettings.userId, userId))
        .returning();
      
      return updatedSettings;
    } else {
      // Create new settings
      const [newSettings] = await db
        .insert(notificationSettings)
        .values({
          enabled: settings.enabled ?? true,
          pushoverAppToken: settings.pushoverAppToken ?? process.env.PUSHOVER_APP_TOKEN ?? null,
          pushoverUserKey: settings.pushoverUserKey ?? process.env.PUSHOVER_USER_KEY ?? null,
          userId,
          lastUpdated: new Date()
        })
        .returning();
      
      return newSettings;
    }
  }

  // Import/restore methods
  async deleteAllUserData(): Promise<void> {
    const userId = requireAuth();
    
    // Delete all user data in proper order to respect foreign key constraints
    // 1. Delete watering history first
    await db.delete(wateringHistory).where(
      eq(wateringHistory.plantId, sql`(SELECT id FROM plants WHERE user_id = ${userId})`)
    );
    
    // 2. Delete plants
    await db.delete(plants).where(eq(plants.userId, userId));
    
    // 3. Delete non-default locations
    await db.delete(locations).where(
      and(eq(locations.userId, userId), eq(locations.isDefault, false))
    );
    
    // 4. Reset notification settings to defaults
    await db.delete(notificationSettings).where(eq(notificationSettings.userId, userId));
    
    // Recreate default notification settings
    await this.createDefaultNotificationSettingsForUser(userId);
  }

  async createWateringHistory(entry: InsertWateringHistory): Promise<WateringHistory> {
    const [wateringEntry] = await db
      .insert(wateringHistory)
      .values(entry)
      .returning();
    
    return wateringEntry;
  }

  async upsertLocationByName(name: string, isDefault: boolean = false): Promise<Location> {
    const userId = requireAuth();
    
    // Check if location already exists for this user
    const [existingLocation] = await db
      .select()
      .from(locations)
      .where(
        and(
          eq(locations.userId, userId),
          sql`LOWER(${locations.name}) = LOWER(${name})`
        )
      );
    
    if (existingLocation) {
      return existingLocation;
    }
    
    // Create new location
    const [newLocation] = await db
      .insert(locations)
      .values({
        name,
        userId,
        isDefault
      })
      .returning();
    
    return newLocation;
  }

  async findPlantByDetails(name: string, species: string | null, location: string): Promise<Plant | undefined> {
    const userId = requireAuth();
    
    const [plant] = await db
      .select()
      .from(plants)
      .where(
        and(
          eq(plants.userId, userId),
          sql`LOWER(${plants.name}) = LOWER(${name})`,
          species ? eq(plants.species, species) : sql`${plants.species} IS NULL`,
          eq(plants.location, location)
        )
      );
    
    return plant || undefined;
  }

  // Plant Health Records methods
  async getPlantHealthRecords(plantId: number): Promise<PlantHealthRecord[]> {
    const userId = getCurrentUserId();
    
    if (userId === null) {
      return [];
    }
    
    return await db
      .select()
      .from(plantHealthRecords)
      .where(
        and(
          eq(plantHealthRecords.plantId, plantId),
          eq(plantHealthRecords.userId, userId)
        )
      )
      .orderBy(plantHealthRecords.recordedAt);
  }

  async getHealthRecord(id: number): Promise<PlantHealthRecord | undefined> {
    const userId = getCurrentUserId();
    
    if (userId === null) {
      return undefined;
    }
    
    const [record] = await db
      .select()
      .from(plantHealthRecords)
      .where(
        and(
          eq(plantHealthRecords.id, id),
          eq(plantHealthRecords.userId, userId)
        )
      );
    
    return record || undefined;
  }

  async getAllHealthRecordsForUser(): Promise<PlantHealthRecord[]> {
    const userId = getCurrentUserId();
    
    if (userId === null) {
      return [];
    }
    
    return await db
      .select()
      .from(plantHealthRecords)
      .where(eq(plantHealthRecords.userId, userId))
      .orderBy(plantHealthRecords.recordedAt);
  }

  async createHealthRecord(record: InsertPlantHealthRecord): Promise<PlantHealthRecord> {
    const userId = requireAuth();
    
    // First check if the plant belongs to the user
    const plant = await this.getPlant(record.plantId);
    if (!plant) {
      throw new Error(`Plant with ID ${record.plantId} not found or does not belong to the current user`);
    }
    
    const healthRecord: InsertPlantHealthRecord = {
      ...record,
      userId,
      recordedAt: record.recordedAt || new Date(),
    };
    
    const [entry] = await db.insert(plantHealthRecords).values(healthRecord).returning();
    return entry;
  }

  async updateHealthRecord(id: number, record: Partial<InsertPlantHealthRecord>): Promise<PlantHealthRecord | undefined> {
    const userId = requireAuth();
    
    const [updated] = await db
      .update(plantHealthRecords)
      .set({
        ...record,
        recordedAt: record.recordedAt || new Date(),
      })
      .where(
        and(
          eq(plantHealthRecords.id, id),
          eq(plantHealthRecords.userId, userId)
        )
      )
      .returning();
    
    return updated || undefined;
  }

  async deleteHealthRecord(id: number): Promise<boolean> {
    const userId = requireAuth();
    
    const result = await db
      .delete(plantHealthRecords)
      .where(
        and(
          eq(plantHealthRecords.id, id),
          eq(plantHealthRecords.userId, userId)
        )
      );
    
    return result.rowCount > 0;
  }

  // Care Activities methods
  async getPlantCareActivities(plantId: number): Promise<CareActivity[]> {
    const userId = getCurrentUserId();
    
    if (userId === null) {
      return [];
    }
    
    return await db
      .select()
      .from(careActivities)
      .where(
        and(
          eq(careActivities.plantId, plantId),
          eq(careActivities.userId, userId)
        )
      )
      .orderBy(careActivities.performedAt);
  }

  async getAllCareActivitiesForUser(): Promise<CareActivity[]> {
    const userId = getCurrentUserId();
    
    if (userId === null) {
      return [];
    }
    
    return await db
      .select()
      .from(careActivities)
      .where(eq(careActivities.userId, userId))
      .orderBy(careActivities.performedAt);
  }

  async createCareActivity(activity: InsertCareActivity): Promise<CareActivity> {
    const userId = requireAuth();
    
    // First check if the plant belongs to the user
    const plant = await this.getPlant(activity.plantId);
    if (!plant) {
      throw new Error(`Plant with ID ${activity.plantId} not found or does not belong to the current user`);
    }
    
    const careActivity: InsertCareActivity = {
      ...activity,
      userId,
      performedAt: activity.performedAt || new Date(),
    };
    
    const [entry] = await db.insert(careActivities).values(careActivity).returning();
    return entry;
  }

  async updateCareActivity(id: number, activity: Partial<InsertCareActivity>): Promise<CareActivity | undefined> {
    const userId = requireAuth();
    
    const [updated] = await db
      .update(careActivities)
      .set({
        ...activity,
        performedAt: activity.performedAt || new Date(),
      })
      .where(
        and(
          eq(careActivities.id, id),
          eq(careActivities.userId, userId)
        )
      )
      .returning();
    
    return updated || undefined;
  }

  async deleteCareActivity(id: number): Promise<boolean> {
    const userId = requireAuth();
    
    const result = await db
      .delete(careActivities)
      .where(
        and(
          eq(careActivities.id, id),
          eq(careActivities.userId, userId)
        )
      );
    
    return result.rowCount > 0;
  }
}

export const storage = new MultiUserStorage();