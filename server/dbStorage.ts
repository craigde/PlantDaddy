import { eq } from "drizzle-orm";
import {
  users, type User, type InsertUser,
  plants, type Plant, type InsertPlant,
  locations, type Location, type InsertLocation,
  plantSpecies, type PlantSpecies, type InsertPlantSpecies,
  notificationSettings, type NotificationSettings, type InsertNotificationSettings,
  deviceTokens, type DeviceToken,
  households, type Household,
  householdMembers, type HouseholdMember,
  plantHealthRecords,
  careActivities,
  plantJournalEntries, type PlantJournalEntry, type InsertPlantJournalEntry
} from "@shared/schema";
import { db } from "./db";

export interface IStorage {
  // User methods
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Plant methods
  getAllPlants(): Promise<Plant[]>;
  getPlant(id: number): Promise<Plant | undefined>;
  createPlant(plant: InsertPlant): Promise<Plant>;
  updatePlant(id: number, plant: Partial<InsertPlant>): Promise<Plant | undefined>;
  deletePlant(id: number): Promise<boolean>;

  // Location methods
  getAllLocations(): Promise<Location[]>;
  getLocation(id: number): Promise<Location | undefined>;
  createLocation(location: InsertLocation): Promise<Location>;
  updateLocation(id: number, location: Partial<InsertLocation>): Promise<Location | undefined>;
  deleteLocation(id: number): Promise<boolean>;

  // Plant species catalog methods
  getAllPlantSpecies(): Promise<PlantSpecies[]>;
  getPlantSpecies(id: number): Promise<PlantSpecies | undefined>;
  getPlantSpeciesByName(name: string): Promise<PlantSpecies | undefined>;
  createPlantSpecies(species: InsertPlantSpecies): Promise<PlantSpecies>;
  updatePlantSpecies(id: number, species: Partial<InsertPlantSpecies>): Promise<PlantSpecies | undefined>;
  deletePlantSpecies(id: number): Promise<boolean>;
  searchPlantSpecies(query: string): Promise<PlantSpecies[]>;

  // Notification settings methods
  getNotificationSettings(): Promise<NotificationSettings | undefined>;
  updateNotificationSettings(settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings>;

  // Device token methods
  registerDeviceToken(userId: number, token: string, environment: string): Promise<DeviceToken>;
  removeDeviceToken(token: string): Promise<boolean>;
  getDeviceTokensForUser(userId: number): Promise<DeviceToken[]>;

  // Household methods
  createHousehold(name: string, userId: number): Promise<Household>;
  updateHousehold(id: number, name: string): Promise<Household | undefined>;
  getHousehold(id: number): Promise<Household | undefined>;
  getHouseholdByInviteCode(code: string): Promise<Household | undefined>;
  getUserHouseholds(userId: number): Promise<(Household & { role: string })[]>;
  getHouseholdMembers(householdId: number): Promise<(HouseholdMember & { username: string })[]>;
  addHouseholdMember(householdId: number, userId: number, role: string): Promise<HouseholdMember>;
  updateHouseholdMemberRole(householdId: number, userId: number, role: string): Promise<HouseholdMember | undefined>;
  removeHouseholdMember(householdId: number, userId: number): Promise<boolean>;
  regenerateInviteCode(householdId: number): Promise<Household>;

  // Journal methods
  getPlantJournalEntries(plantId: number): Promise<PlantJournalEntry[]>;
  createJournalEntry(entry: InsertPlantJournalEntry): Promise<PlantJournalEntry>;
  deleteJournalEntry(id: number): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
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
    return user;
  }

  // Plant methods
  async getAllPlants(): Promise<Plant[]> {
    return await db.select().from(plants);
  }

  async getPlant(id: number): Promise<Plant | undefined> {
    const [plant] = await db.select().from(plants).where(eq(plants.id, id));
    return plant || undefined;
  }

  async createPlant(insertPlant: InsertPlant): Promise<Plant> {
    const [plant] = await db.insert(plants).values(insertPlant).returning();
    return plant;
  }

  async updatePlant(id: number, plantUpdate: Partial<InsertPlant>): Promise<Plant | undefined> {
    const [updatedPlant] = await db
      .update(plants)
      .set(plantUpdate)
      .where(eq(plants.id, id))
      .returning();
    return updatedPlant || undefined;
  }

  async deletePlant(id: number): Promise<boolean> {
    // Delete child records first to avoid foreign key constraint violations
    await db.delete(plantJournalEntries).where(eq(plantJournalEntries.plantId, id));
    await db.delete(plantHealthRecords).where(eq(plantHealthRecords.plantId, id));
    await db.delete(careActivities).where(eq(careActivities.plantId, id));
    const result = await db.delete(plants).where(eq(plants.id, id)).returning();
    return result.length > 0;
  }

  // Location methods
  async getAllLocations(): Promise<Location[]> {
    return await db.select().from(locations);
  }

  async getLocation(id: number): Promise<Location | undefined> {
    const [location] = await db.select().from(locations).where(eq(locations.id, id));
    return location || undefined;
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    // Check if a location with the same name already exists
    const [existingLocation] = await db
      .select()
      .from(locations)
      .where(eq(locations.name, insertLocation.name));
    
    if (existingLocation) {
      throw new Error(`Location with name '${insertLocation.name}' already exists`);
    }
    
    const [location] = await db.insert(locations).values(insertLocation).returning();
    return location;
  }

  async updateLocation(id: number, locationUpdate: Partial<InsertLocation>): Promise<Location | undefined> {
    // If name is being updated, check if it already exists
    if (locationUpdate.name) {
      const [nameExists] = await db
        .select()
        .from(locations)
        .where(eq(locations.name, locationUpdate.name));
      
      if (nameExists && nameExists.id !== id) {
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
    // Check if this location is used by any plants
    const plantsWithLocation = await db
      .select()
      .from(plants)
      .where(eq(plants.location, (await this.getLocation(id))?.name || ''));
    
    if (plantsWithLocation.length > 0) {
      throw new Error('Cannot delete location that is being used by plants');
    }
    
    const result = await db.delete(locations).where(eq(locations.id, id)).returning();
    return result.length > 0;
  }

  // Plant species catalog methods
  async getAllPlantSpecies(): Promise<PlantSpecies[]> {
    return await db.select().from(plantSpecies);
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
    // Check if species with this name already exists
    const existingSpecies = await this.getPlantSpeciesByName(insertSpecies.name);
    
    if (existingSpecies) {
      throw new Error(`Plant species with name '${insertSpecies.name}' already exists`);
    }
    
    const [species] = await db.insert(plantSpecies).values(insertSpecies).returning();
    return species;
  }

  async updatePlantSpecies(id: number, speciesUpdate: Partial<InsertPlantSpecies>): Promise<PlantSpecies | undefined> {
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
    
    const [updatedSpecies] = await db
      .update(plantSpecies)
      .set(speciesUpdate)
      .where(eq(plantSpecies.id, id))
      .returning();
    
    return updatedSpecies || undefined;
  }

  async deletePlantSpecies(id: number): Promise<boolean> {
    // Check if this species is used by any plants
    const plantsWithSpecies = await db
      .select()
      .from(plants)
      .where(eq(plants.species, (await this.getPlantSpecies(id))?.name || ''));
    
    if (plantsWithSpecies.length > 0) {
      throw new Error('Cannot delete species that is being used by plants');
    }
    
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
    const [settings] = await db.select().from(notificationSettings);
    return settings || undefined;
  }

  // Journal methods
  async getPlantJournalEntries(plantId: number): Promise<PlantJournalEntry[]> {
    return await db.select().from(plantJournalEntries).where(eq(plantJournalEntries.plantId, plantId));
  }

  async createJournalEntry(entry: InsertPlantJournalEntry): Promise<PlantJournalEntry> {
    const [journalEntry] = await db.insert(plantJournalEntries).values(entry).returning();
    return journalEntry;
  }

  async deleteJournalEntry(id: number): Promise<boolean> {
    const result = await db.delete(plantJournalEntries).where(eq(plantJournalEntries.id, id)).returning();
    return result.length > 0;
  }

  async updateNotificationSettings(settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings> {
    // Check if settings exist
    const existingSettings = await this.getNotificationSettings();
    
    if (existingSettings) {
      // Update existing settings
      const [updatedSettings] = await db
        .update(notificationSettings)
        .set({
          ...settings,
          lastUpdated: new Date()
        })
        .where(eq(notificationSettings.id, existingSettings.id))
        .returning();
      
      return updatedSettings;
    } else {
      // Create new settings
      const [newSettings] = await db
        .insert(notificationSettings)
        .values({
          enabled: settings.enabled ?? true,
          lastUpdated: new Date()
        })
        .returning();
      
      return newSettings;
    }
  }
}
