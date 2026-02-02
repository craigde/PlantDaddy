import { and, eq, sql, or, isNull, asc, inArray, gte } from "drizzle-orm";
import {
  users, type User, type InsertUser,
  plants, type Plant, type InsertPlant,
  locations, type Location, type InsertLocation,
  plantSpecies, type PlantSpecies, type InsertPlantSpecies,
  notificationSettings, type NotificationSettings, type InsertNotificationSettings,
  deviceTokens, type DeviceToken,
  households, type Household,
  householdMembers, type HouseholdMember,
  plantHealthRecords, type PlantHealthRecord, type InsertPlantHealthRecord,
  careActivities, type CareActivity, type InsertCareActivity,
  plantJournalEntries, type PlantJournalEntry, type InsertPlantJournalEntry
} from "@shared/schema";
import { db } from "./db";
import { getCurrentUserId, requireAuth, getHouseholdId } from "./user-context";
import { IStorage } from "./dbStorage";
import crypto from "crypto";

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

    // Create default notification settings for the new user
    await this.createDefaultNotificationSettingsForUser(user.id);

    // No household is created here — the user chooses to create or join one
    // after registration via the onboarding flow.

    return user;
  }
  
  // Helper method to create default locations for a new user
  private async createDefaultLocationsForUser(userId: number, householdId?: number): Promise<void> {
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

    try {
      const valuesToInsert = defaultLocations.map(loc => ({
        name: loc.name,
        userId: userId,
        householdId: householdId ?? null,
        isDefault: true
      }));

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

  // Plant methods — scoped by household
  async getAllPlants(): Promise<Plant[]> {
    const householdId = await getHouseholdId();

    if (householdId === null) {
      // Fallback: use userId for backward compat (no household yet)
      const userId = getCurrentUserId();
      if (userId === null) return [];
      return await db.select().from(plants).where(eq(plants.userId, userId));
    }

    return await db
      .select()
      .from(plants)
      .where(eq(plants.householdId, householdId));
  }

  async getPlant(id: number): Promise<Plant | undefined> {
    const householdId = await getHouseholdId();

    if (householdId === null) {
      const userId = getCurrentUserId();
      if (userId === null) return undefined;
      const [plant] = await db.select().from(plants)
        .where(and(eq(plants.id, id), eq(plants.userId, userId)));
      return plant || undefined;
    }

    const [plant] = await db
      .select()
      .from(plants)
      .where(and(eq(plants.id, id), eq(plants.householdId, householdId)));

    return plant || undefined;
  }

  async createPlant(insertPlant: InsertPlant): Promise<Plant> {
    const userId = requireAuth();
    const householdId = await getHouseholdId();

    const [plant] = await db
      .insert(plants)
      .values({
        ...insertPlant,
        userId,
        householdId,
      })
      .returning();

    return plant;
  }

  async updatePlant(id: number, plantUpdate: Partial<InsertPlant>): Promise<Plant | undefined> {
    requireAuth();

    // Verify access via getPlant (household-scoped)
    const existing = await this.getPlant(id);
    if (!existing) return undefined;

    const [updatedPlant] = await db
      .update(plants)
      .set(plantUpdate)
      .where(eq(plants.id, id))
      .returning();

    return updatedPlant || undefined;
  }

  async deletePlant(id: number): Promise<boolean> {
    requireAuth();

    // Verify access via getPlant (household-scoped)
    const existing = await this.getPlant(id);
    if (!existing) return false;

    // Delete child records first to avoid foreign key constraint violations
    await db.delete(plantHealthRecords).where(eq(plantHealthRecords.plantId, id));
    await db.delete(careActivities).where(eq(careActivities.plantId, id));
    // Handle legacy watering_history table if it still exists
    await db.execute(sql`DELETE FROM watering_history WHERE plant_id = ${id}`).catch(() => {});

    const result = await db
      .delete(plants)
      .where(eq(plants.id, id))
      .returning();

    return result.length > 0;
  }

  // Location methods — scoped by household
  async getAllLocations(): Promise<Location[]> {
    const householdId = await getHouseholdId();

    if (householdId === null) {
      const userId = getCurrentUserId();
      if (userId === null) return [];
      return await db.select().from(locations).where(eq(locations.userId, userId));
    }

    return await db
      .select()
      .from(locations)
      .where(eq(locations.householdId, householdId));
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const householdId = await getHouseholdId();

    if (householdId === null) {
      const userId = getCurrentUserId();
      if (userId === null) return undefined;
      const [location] = await db.select().from(locations)
        .where(and(eq(locations.id, id), eq(locations.userId, userId)));
      return location || undefined;
    }

    const [location] = await db
      .select()
      .from(locations)
      .where(and(eq(locations.id, id), eq(locations.householdId, householdId)));

    return location || undefined;
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    const userId = requireAuth();
    const householdId = await getHouseholdId();

    // Check if a location with the same name already exists in the household
    const allLocations = await this.getAllLocations();
    const existing = allLocations.find(l => l.name === insertLocation.name);
    if (existing) {
      throw new Error(`Location with name '${insertLocation.name}' already exists`);
    }

    const [location] = await db
      .insert(locations)
      .values({
        ...insertLocation,
        userId,
        householdId,
      })
      .returning();

    return location;
  }

  async updateLocation(id: number, locationUpdate: Partial<InsertLocation>): Promise<Location | undefined> {
    requireAuth();

    const existing = await this.getLocation(id);
    if (!existing) return undefined;

    // If name is being updated, check for duplicates in household
    if (locationUpdate.name) {
      const allLocations = await this.getAllLocations();
      const nameConflict = allLocations.find(l => l.name === locationUpdate.name && l.id !== id);
      if (nameConflict) {
        throw new Error(`Location with name '${locationUpdate.name}' already exists`);
      }
    }

    const [updatedLocation] = await db
      .update(locations)
      .set(locationUpdate)
      .where(eq(locations.id, id))
      .returning();

    return updatedLocation || undefined;
  }

  async deleteLocation(id: number): Promise<boolean> {
    requireAuth();

    const location = await this.getLocation(id);
    if (!location) return false;

    // Check if this location is used by any plants in the household
    const allPlants = await this.getAllPlants();
    const plantsWithLocation = allPlants.filter(p => p.location === location.name);

    if (plantsWithLocation.length > 0) {
      throw new Error('Cannot delete location that is being used by plants');
    }

    const result = await db
      .delete(locations)
      .where(eq(locations.id, id))
      .returning();

    return result.length > 0;
  }

  // Plant species catalog methods
  // Returns global species (householdId = null) + current household's custom species
  async getAllPlantSpecies(): Promise<PlantSpecies[]> {
    const householdId = await getHouseholdId();

    if (householdId === null) {
      // Fallback: no household, return only global species
      return await db.select().from(plantSpecies).where(isNull(plantSpecies.householdId)).orderBy(asc(plantSpecies.name));
    }

    // Return global species + household's custom species
    return await db.select().from(plantSpecies).where(
      or(
        isNull(plantSpecies.householdId), // Global species
        eq(plantSpecies.householdId, householdId) // Household's custom species
      )
    ).orderBy(asc(plantSpecies.name));
  }

  async getPlantSpecies(id: number): Promise<PlantSpecies | undefined> {
    const [species] = await db.select().from(plantSpecies).where(eq(plantSpecies.id, id));
    return species || undefined;
  }

  async getPlantSpeciesByName(name: string): Promise<PlantSpecies | undefined> {
    const householdId = await getHouseholdId();

    if (householdId === null) {
      // Only check global species
      const [species] = await db
        .select()
        .from(plantSpecies)
        .where(and(eq(plantSpecies.name, name), isNull(plantSpecies.householdId)));
      return species || undefined;
    }

    // Check global + household species
    const [species] = await db
      .select()
      .from(plantSpecies)
      .where(
        and(
          eq(plantSpecies.name, name),
          or(
            isNull(plantSpecies.householdId),
            eq(plantSpecies.householdId, householdId)
          )
        )
      );
    return species || undefined;
  }

  async createPlantSpecies(insertSpecies: InsertPlantSpecies): Promise<PlantSpecies> {
    const userId = requireAuth(); // User must be logged in to create species
    const householdId = await getHouseholdId();

    // Check if species with this name already exists (global or household's own)
    const existingSpecies = await this.getPlantSpeciesByName(insertSpecies.name);

    if (existingSpecies) {
      throw new Error(`Plant species with name '${insertSpecies.name}' already exists`);
    }

    // Create species scoped to the household (or user-only if no household)
    const [species] = await db.insert(plantSpecies).values({
      ...insertSpecies,
      userId, // Track who created it
      householdId, // Scope to the household
    }).returning();

    return species;
  }

  async updatePlantSpecies(id: number, speciesUpdate: Partial<InsertPlantSpecies>): Promise<PlantSpecies | undefined> {
    requireAuth(); // User must be logged in
    const householdId = await getHouseholdId();

    // Get the species to check ownership
    const species = await this.getPlantSpecies(id);
    if (!species) {
      throw new Error('Species not found');
    }

    // Cannot update global species (householdId = null)
    if (species.householdId === null) {
      throw new Error('Cannot update global plant species. Only custom species can be edited.');
    }

    // Cannot update species from another household
    if (species.householdId !== householdId) {
      throw new Error('You can only update species in your household');
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

    // Update the household's custom species
    const [updatedSpecies] = await db
      .update(plantSpecies)
      .set(speciesUpdate)
      .where(eq(plantSpecies.id, id))
      .returning();

    return updatedSpecies || undefined;
  }

  async deletePlantSpecies(id: number): Promise<boolean> {
    requireAuth(); // User must be logged in
    const householdId = await getHouseholdId();

    // Get the species to check ownership
    const species = await this.getPlantSpecies(id);
    if (!species) {
      return false;
    }

    // Cannot delete global species (householdId = null)
    if (species.householdId === null) {
      throw new Error('Cannot delete global plant species. Only custom species can be deleted.');
    }

    // Cannot delete species from another household
    if (species.householdId !== householdId) {
      throw new Error('You can only delete species in your household');
    }

    // Check if this species is used by any plants in the household
    const plantsWithSpecies = await db
      .select()
      .from(plants)
      .where(
        and(
          eq(plants.species, species.name),
          householdId ? eq(plants.householdId, householdId) : isNull(plants.householdId)
        )
      );

    if (plantsWithSpecies.length > 0) {
      throw new Error(`Cannot delete species '${species.name}' because it is being used by ${plantsWithSpecies.length} plant(s)`);
    }

    // Delete the household's custom species
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

  // Device token methods
  async registerDeviceToken(userId: number, token: string, environment: string): Promise<DeviceToken> {
    // Upsert: update userId/environment if token already exists, otherwise insert
    const [existing] = await db.select().from(deviceTokens).where(eq(deviceTokens.token, token));

    if (existing) {
      const [updated] = await db
        .update(deviceTokens)
        .set({ userId, environment, lastUsed: new Date() })
        .where(eq(deviceTokens.token, token))
        .returning();
      return updated;
    }

    const [created] = await db
      .insert(deviceTokens)
      .values({ userId, token, environment })
      .returning();
    return created;
  }

  async removeDeviceToken(token: string): Promise<boolean> {
    const result = await db.delete(deviceTokens).where(eq(deviceTokens.token, token)).returning();
    return result.length > 0;
  }

  async getDeviceTokensForUser(userId: number): Promise<DeviceToken[]> {
    return await db.select().from(deviceTokens).where(eq(deviceTokens.userId, userId));
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
    const householdId = await getHouseholdId();

    // Check if location already exists in the household
    const allLocations = await this.getAllLocations();
    const existingLocation = allLocations.find(l => l.name.toLowerCase() === name.toLowerCase());

    if (existingLocation) {
      return existingLocation;
    }

    // Create new location
    const [newLocation] = await db
      .insert(locations)
      .values({
        name,
        userId,
        householdId,
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

  // Plant Health Records methods — returns all records for the plant (household-wide)
  async getPlantHealthRecords(plantId: number): Promise<(PlantHealthRecord & { username: string })[]> {
    const userId = getCurrentUserId();

    if (userId === null) {
      return [];
    }

    return await db
      .select({
        id: plantHealthRecords.id,
        plantId: plantHealthRecords.plantId,
        status: plantHealthRecords.status,
        notes: plantHealthRecords.notes,
        imageUrl: plantHealthRecords.imageUrl,
        recordedAt: plantHealthRecords.recordedAt,
        userId: plantHealthRecords.userId,
        username: users.username,
      })
      .from(plantHealthRecords)
      .innerJoin(users, eq(plantHealthRecords.userId, users.id))
      .where(eq(plantHealthRecords.plantId, plantId))
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

  // Care Activities methods — returns all activities for the plant (household-wide)
  async getPlantCareActivities(plantId: number): Promise<(CareActivity & { username: string })[]> {
    const userId = getCurrentUserId();

    if (userId === null) {
      return [];
    }

    return await db
      .select({
        id: careActivities.id,
        plantId: careActivities.plantId,
        activityType: careActivities.activityType,
        notes: careActivities.notes,
        performedAt: careActivities.performedAt,
        userId: careActivities.userId,
        username: users.username,
      })
      .from(careActivities)
      .innerJoin(users, eq(careActivities.userId, users.id))
      .where(eq(careActivities.plantId, plantId))
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

  // Household methods

  private generateInviteCode(): string {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let code = "";
    const bytes = crypto.randomBytes(8);
    for (let i = 0; i < 8; i++) {
      code += chars[bytes[i] % chars.length];
    }
    return code;
  }

  async createHousehold(name: string, userId: number): Promise<Household> {
    // Generate unique invite code
    let inviteCode: string;
    let attempts = 0;
    while (true) {
      inviteCode = this.generateInviteCode();
      const [existing] = await db.select().from(households)
        .where(eq(households.inviteCode, inviteCode));
      if (!existing) break;
      attempts++;
      if (attempts > 10) throw new Error("Failed to generate unique invite code");
    }

    const [household] = await db.insert(households).values({
      name,
      inviteCode,
      createdBy: userId,
    }).returning();

    // Add creator as owner
    await db.insert(householdMembers).values({
      householdId: household.id,
      userId,
      role: "owner",
    });

    // Create default locations for the new household
    await this.createDefaultLocationsForUser(userId, household.id);

    return household;
  }

  async updateHousehold(id: number, name: string): Promise<Household | undefined> {
    const [updated] = await db.update(households)
      .set({ name })
      .where(eq(households.id, id))
      .returning();
    return updated || undefined;
  }

  async getHousehold(id: number): Promise<Household | undefined> {
    const [household] = await db.select().from(households).where(eq(households.id, id));
    return household || undefined;
  }

  async getHouseholdByInviteCode(code: string): Promise<Household | undefined> {
    const [household] = await db.select().from(households)
      .where(eq(households.inviteCode, code.toUpperCase()));
    return household || undefined;
  }

  async getUserHouseholds(userId: number): Promise<(Household & { role: string })[]> {
    const memberships = await db.select().from(householdMembers)
      .where(eq(householdMembers.userId, userId));

    const result: (Household & { role: string })[] = [];
    for (const m of memberships) {
      const household = await this.getHousehold(m.householdId);
      if (household) {
        result.push({ ...household, role: m.role });
      }
    }
    return result;
  }

  async getHouseholdMembers(householdId: number): Promise<(HouseholdMember & { username: string })[]> {
    const members = await db.select().from(householdMembers)
      .where(eq(householdMembers.householdId, householdId));

    const result: (HouseholdMember & { username: string })[] = [];
    for (const m of members) {
      const user = await this.getUser(m.userId);
      if (user) {
        result.push({ ...m, username: user.username });
      }
    }
    return result;
  }

  async addHouseholdMember(householdId: number, userId: number, role: string): Promise<HouseholdMember> {
    const [member] = await db.insert(householdMembers).values({
      householdId,
      userId,
      role,
    }).returning();
    return member;
  }

  async updateHouseholdMemberRole(householdId: number, userId: number, role: string): Promise<HouseholdMember | undefined> {
    const [updated] = await db.update(householdMembers)
      .set({ role })
      .where(and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, userId)
      ))
      .returning();
    return updated || undefined;
  }

  async removeHouseholdMember(householdId: number, userId: number): Promise<boolean> {
    const result = await db.delete(householdMembers)
      .where(and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, userId)
      ))
      .returning();
    return result.length > 0;
  }

  // Admin methods

  async getAllUsersAdmin(): Promise<{ id: number; username: string; isAdmin: boolean | null }[]> {
    return await db.select({
      id: users.id,
      username: users.username,
      isAdmin: users.isAdmin,
    }).from(users).orderBy(asc(users.id));
  }

  async getUserStatsAdmin(userId: number): Promise<{
    plantCount: number;
    householdCount: number;
    locationCount: number;
  }> {
    const [plantResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(plants).where(eq(plants.userId, userId));
    const [householdResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(householdMembers).where(eq(householdMembers.userId, userId));
    const [locationResult] = await db.select({ count: sql<number>`count(*)::int` })
      .from(locations).where(eq(locations.userId, userId));
    return {
      plantCount: plantResult?.count ?? 0,
      householdCount: householdResult?.count ?? 0,
      locationCount: locationResult?.count ?? 0,
    };
  }

  async deleteUserCompletely(userId: number): Promise<void> {
    // Delete all user data in proper order to respect foreign key constraints

    // 1. Care activities (references plants and users)
    await db.delete(careActivities).where(eq(careActivities.userId, userId));

    // 2. Plant health records (references plants and users)
    await db.delete(plantHealthRecords).where(eq(plantHealthRecords.userId, userId));

    // 3. Delete watering history if table exists (legacy table)
    try {
      await db.execute(sql`DELETE FROM watering_history WHERE user_id = ${userId}`);
    } catch {
      // Table may not exist
    }

    // 4. Plants (references users and households)
    await db.delete(plants).where(eq(plants.userId, userId));

    // 5. Locations (references users and households)
    await db.delete(locations).where(eq(locations.userId, userId));

    // 6. Device tokens
    await db.delete(deviceTokens).where(eq(deviceTokens.userId, userId));

    // 7. Notification settings
    await db.delete(notificationSettings).where(eq(notificationSettings.userId, userId));

    // 8. User-created plant species
    await db.delete(plantSpecies).where(eq(plantSpecies.userId, userId));

    // 9. Household memberships — remove user from all households
    const membershipsBefore = await db.select().from(householdMembers)
      .where(eq(householdMembers.userId, userId));
    await db.delete(householdMembers).where(eq(householdMembers.userId, userId));

    // 10. Delete orphaned households (no remaining members)
    for (const m of membershipsBefore) {
      const remaining = await db.select({ count: sql<number>`count(*)::int` })
        .from(householdMembers)
        .where(eq(householdMembers.householdId, m.householdId));
      if ((remaining[0]?.count ?? 0) === 0) {
        // Clean up any data that might reference this household
        await db.delete(plants).where(eq(plants.householdId, m.householdId));
        await db.delete(locations).where(eq(locations.householdId, m.householdId));
        await db.delete(households).where(eq(households.id, m.householdId));
      }
    }

    // 11. Delete sessions for this user
    try {
      await db.execute(sql`DELETE FROM session WHERE sess::jsonb -> 'passport' ->> 'user' = ${String(userId)}`);
    } catch {
      // Session table format may differ
    }

    // 12. Delete the user record
    await db.delete(users).where(eq(users.id, userId));
  }

  async regenerateInviteCode(householdId: number): Promise<Household> {
    let inviteCode: string;
    let attempts = 0;
    while (true) {
      inviteCode = this.generateInviteCode();
      const [existing] = await db.select().from(households)
        .where(eq(households.inviteCode, inviteCode));
      if (!existing) break;
      attempts++;
      if (attempts > 10) throw new Error("Failed to generate unique invite code");
    }

    const [updated] = await db.update(households)
      .set({ inviteCode })
      .where(eq(households.id, householdId))
      .returning();

    return updated;
  }

  // Plant Journal Entries
  async getPlantJournalEntries(plantId: number): Promise<(PlantJournalEntry & { username: string })[]> {
    const userId = getCurrentUserId();
    if (userId === null) return [];

    return await db
      .select({
        id: plantJournalEntries.id,
        plantId: plantJournalEntries.plantId,
        imageUrl: plantJournalEntries.imageUrl,
        caption: plantJournalEntries.caption,
        createdAt: plantJournalEntries.createdAt,
        userId: plantJournalEntries.userId,
        username: users.username,
      })
      .from(plantJournalEntries)
      .innerJoin(users, eq(plantJournalEntries.userId, users.id))
      .where(eq(plantJournalEntries.plantId, plantId))
      .orderBy(plantJournalEntries.createdAt);
  }

  async createJournalEntry(entry: InsertPlantJournalEntry): Promise<PlantJournalEntry> {
    const userId = requireAuth();

    const plant = await this.getPlant(entry.plantId);
    if (!plant) {
      throw new Error(`Plant with ID ${entry.plantId} not found or does not belong to the current user`);
    }

    const [created] = await db
      .insert(plantJournalEntries)
      .values({ ...entry, userId })
      .returning();
    return created;
  }

  async deleteJournalEntry(id: number): Promise<boolean> {
    const userId = requireAuth();

    const [entry] = await db
      .select()
      .from(plantJournalEntries)
      .where(eq(plantJournalEntries.id, id));

    if (!entry || entry.userId !== userId) return false;

    await db.delete(plantJournalEntries).where(eq(plantJournalEntries.id, id));
    return true;
  }

  // Care Stats - aggregate statistics for the household
  async getCareStats(): Promise<{
    streak: number;
    monthlyTotal: number;
    monthlyByMember: { userId: number; username: string; count: number }[];
    monthlyByType: { type: string; count: number }[];
    totalPlants: number;
    plantsNeedingWater: number;
  }> {
    const allPlants = await this.getAllPlants();
    const plantIds = allPlants.map(p => p.id);

    const emptyResult = {
      streak: 0,
      monthlyTotal: 0,
      monthlyByMember: [] as { userId: number; username: string; count: number }[],
      monthlyByType: [] as { type: string; count: number }[],
      totalPlants: allPlants.length,
      plantsNeedingWater: 0,
    };

    if (plantIds.length === 0) {
      return emptyResult;
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Monthly totals by member
    const monthlyByMember = await db
      .select({
        userId: careActivities.userId,
        username: users.username,
        count: sql<number>`count(*)::int`,
      })
      .from(careActivities)
      .innerJoin(users, eq(careActivities.userId, users.id))
      .where(
        and(
          inArray(careActivities.plantId, plantIds),
          gte(careActivities.performedAt, startOfMonth)
        )
      )
      .groupBy(careActivities.userId, users.username);

    // Monthly totals by type
    const monthlyByType = await db
      .select({
        type: careActivities.activityType,
        count: sql<number>`count(*)::int`,
      })
      .from(careActivities)
      .where(
        and(
          inArray(careActivities.plantId, plantIds),
          gte(careActivities.performedAt, startOfMonth)
        )
      )
      .groupBy(careActivities.activityType);

    const monthlyTotal = monthlyByMember.reduce((sum, m) => sum + m.count, 0);

    // Overdue count
    const plantsNeedingWater = allPlants.filter(p => {
      const nextWatering = new Date(p.lastWatered);
      nextWatering.setDate(nextWatering.getDate() + p.wateringFrequency);
      return nextWatering < now;
    }).length;

    // Streak: consecutive days with at least one care activity
    const yearAgo = new Date(now);
    yearAgo.setDate(yearAgo.getDate() - 365);

    const activityDates = await db
      .select({
        dateStr: sql<string>`(${careActivities.performedAt})::date::text`,
      })
      .from(careActivities)
      .where(
        and(
          inArray(careActivities.plantId, plantIds),
          gte(careActivities.performedAt, yearAgo)
        )
      )
      .groupBy(sql`(${careActivities.performedAt})::date`)
      .orderBy(sql`(${careActivities.performedAt})::date DESC`);

    const dateSet = new Set(activityDates.map(d => d.dateStr));

    const fmtDate = (d: Date): string => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    };

    let streak = 0;
    const checkDate = new Date(now);
    checkDate.setHours(0, 0, 0, 0);

    // If today has no activity yet, start counting from yesterday
    if (!dateSet.has(fmtDate(checkDate))) {
      checkDate.setDate(checkDate.getDate() - 1);
    }

    while (dateSet.has(fmtDate(checkDate))) {
      streak++;
      checkDate.setDate(checkDate.getDate() - 1);
    }

    return {
      streak,
      monthlyTotal,
      monthlyByMember,
      monthlyByType,
      totalPlants: allPlants.length,
      plantsNeedingWater,
    };
  }
}

export const storage = new MultiUserStorage();