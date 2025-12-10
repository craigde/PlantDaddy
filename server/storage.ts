import { 
  plants, 
  wateringHistory, 
  locations,
  plantSpecies,
  notificationSettings,
  plantHealthRecords,
  careActivities,
  type Plant, 
  type InsertPlant, 
  type WateringHistory, 
  type InsertWateringHistory,
  type Location,
  type InsertLocation,
  users, 
  type User, 
  type InsertUser,
  type PlantSpecies,
  type InsertPlantSpecies,
  type NotificationSettings,
  type InsertNotificationSettings,
  type PlantHealthRecord,
  type InsertPlantHealthRecord,
  type CareActivity,
  type InsertCareActivity
} from "@shared/schema";

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
  
  // Watering methods
  waterPlant(plantId: number): Promise<WateringHistory>;
  getWateringHistory(plantId: number): Promise<WateringHistory[]>;
  getAllWateringHistoryForUser(): Promise<WateringHistory[]>;

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
  
  // Plant Health Records methods
  getPlantHealthRecords(plantId: number): Promise<PlantHealthRecord[]>;
  getHealthRecord(id: number): Promise<PlantHealthRecord | undefined>;
  getAllHealthRecordsForUser(): Promise<PlantHealthRecord[]>;
  createHealthRecord(record: InsertPlantHealthRecord): Promise<PlantHealthRecord>;
  updateHealthRecord(id: number, record: Partial<InsertPlantHealthRecord>): Promise<PlantHealthRecord | undefined>;
  deleteHealthRecord(id: number): Promise<boolean>;
  
  // Care Activities methods  
  getPlantCareActivities(plantId: number): Promise<CareActivity[]>;
  getAllCareActivitiesForUser(): Promise<CareActivity[]>;
  createCareActivity(activity: InsertCareActivity): Promise<CareActivity>;
  updateCareActivity(id: number, activity: Partial<InsertCareActivity>): Promise<CareActivity | undefined>;
  deleteCareActivity(id: number): Promise<boolean>;

  // Import/restore methods
  deleteAllUserData(): Promise<void>;
  createWateringHistory(entry: InsertWateringHistory): Promise<WateringHistory>;
  upsertLocationByName(name: string, isDefault?: boolean): Promise<Location>;
  findPlantByDetails(name: string, species: string | null, location: string): Promise<Plant | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private plants: Map<number, Plant>;
  private wateringHistory: Map<number, WateringHistory>;
  private locations: Map<number, Location>;
  private plantSpeciesCatalog: Map<number, PlantSpecies>;
  private notificationSettingsData: NotificationSettings | undefined;
  
  private userIdCounter: number;
  private plantIdCounter: number;
  private wateringHistoryIdCounter: number;
  private locationIdCounter: number;
  private plantSpeciesIdCounter: number;

  constructor() {
    this.users = new Map();
    this.plants = new Map();
    this.wateringHistory = new Map();
    this.locations = new Map();
    this.plantSpeciesCatalog = new Map();
    
    this.userIdCounter = 1;
    this.plantIdCounter = 1;
    this.wateringHistoryIdCounter = 1;
    this.locationIdCounter = 1;
    this.plantSpeciesIdCounter = 1;
    
    // Set up default locations
    this.initDefaultLocations();
    
    // Initialize common plant species catalog
    this.initPlantSpeciesCatalog();
  }
  
  private initDefaultLocations() {
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
    
    // Add locations directly to the map
    for (const loc of defaultLocations) {
      const id = this.locationIdCounter++;
      this.locations.set(id, { 
        id, 
        name: loc.name,
        isDefault: loc.isDefault || false
      });
    }
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  // Plant methods
  async getAllPlants(): Promise<Plant[]> {
    return Array.from(this.plants.values());
  }

  async getPlant(id: number): Promise<Plant | undefined> {
    return this.plants.get(id);
  }

  async createPlant(insertPlant: InsertPlant): Promise<Plant> {
    const id = this.plantIdCounter++;
    // Ensure species, notes, and imageUrl are null if not provided
    const plant: Plant = { 
      ...insertPlant, 
      id,
      species: insertPlant.species || null,
      notes: insertPlant.notes || null,
      imageUrl: insertPlant.imageUrl || null
    };
    this.plants.set(id, plant);
    return plant;
  }

  async updatePlant(id: number, plantUpdate: Partial<InsertPlant>): Promise<Plant | undefined> {
    const existingPlant = this.plants.get(id);
    if (!existingPlant) {
      return undefined;
    }

    const updatedPlant: Plant = { ...existingPlant, ...plantUpdate };
    this.plants.set(id, updatedPlant);
    return updatedPlant;
  }

  async deletePlant(id: number): Promise<boolean> {
    return this.plants.delete(id);
  }

  // Watering methods
  async waterPlant(plantId: number): Promise<WateringHistory> {
    const plant = this.plants.get(plantId);
    if (!plant) {
      throw new Error(`Plant with ID ${plantId} not found`);
    }

    // Update plant's last watered date
    const now = new Date();
    this.plants.set(plantId, { ...plant, lastWatered: now });

    // Add watering entry to history
    const id = this.wateringHistoryIdCounter++;
    const wateringEntry: WateringHistory = {
      id,
      plantId,
      wateredAt: now
    };
    
    this.wateringHistory.set(id, wateringEntry);
    return wateringEntry;
  }

  async getWateringHistory(plantId: number): Promise<WateringHistory[]> {
    return Array.from(this.wateringHistory.values())
      .filter((entry) => entry.plantId === plantId)
      .sort((a, b) => b.wateredAt.getTime() - a.wateredAt.getTime()); // Most recent first
  }

  async getAllWateringHistoryForUser(): Promise<WateringHistory[]> {
    // For MemStorage, we don't have user filtering, so return all watering history
    return Array.from(this.wateringHistory.values())
      .sort((a, b) => b.wateredAt.getTime() - a.wateredAt.getTime()); // Most recent first
  }
  
  // Location methods
  async getAllLocations(): Promise<Location[]> {
    return Array.from(this.locations.values());
  }

  async getLocation(id: number): Promise<Location | undefined> {
    return this.locations.get(id);
  }

  async createLocation(insertLocation: InsertLocation): Promise<Location> {
    // Check if a location with the same name already exists
    const existingLocation = Array.from(this.locations.values()).find(
      (loc) => loc.name.toLowerCase() === insertLocation.name.toLowerCase()
    );
    
    if (existingLocation) {
      throw new Error(`Location with name '${insertLocation.name}' already exists`);
    }
    
    const id = this.locationIdCounter++;
    const location: Location = { 
      id, 
      name: insertLocation.name,
      isDefault: insertLocation.isDefault || false
    };
    this.locations.set(id, location);
    return location;
  }

  async updateLocation(id: number, locationUpdate: Partial<InsertLocation>): Promise<Location | undefined> {
    const existingLocation = this.locations.get(id);
    if (!existingLocation) {
      return undefined;
    }
    
    // If name is being updated, check that it doesn't conflict with existing names
    if (locationUpdate.name && locationUpdate.name !== existingLocation.name) {
      const nameExists = Array.from(this.locations.values()).some(
        (loc) => loc.id !== id && loc.name.toLowerCase() === locationUpdate.name!.toLowerCase()
      );
      
      if (nameExists) {
        throw new Error(`Location with name '${locationUpdate.name}' already exists`);
      }
    }
    
    const updatedLocation: Location = { ...existingLocation, ...locationUpdate };
    this.locations.set(id, updatedLocation);
    return updatedLocation;
  }

  async deleteLocation(id: number): Promise<boolean> {
    const location = this.locations.get(id);
    if (!location) {
      return false;
    }
    
    // Check if any plants are using this location
    const locationName = location.name;
    const plantsUsingLocation = Array.from(this.plants.values()).some(
      (plant) => plant.location === locationName
    );
    
    if (plantsUsingLocation) {
      throw new Error(`Cannot delete location '${locationName}' as it is being used by one or more plants`);
    }
    
    return this.locations.delete(id);
  }
  
  // Plant species catalog methods
  private initPlantSpeciesCatalog() {
    // Common houseplants with care information
    const commonPlants: InsertPlantSpecies[] = [
      {
        name: "Snake Plant",
        scientificName: "Sansevieria trifasciata",
        family: "Asparagaceae",
        origin: "West Africa",
        description: "A hardy plant with stiff, upright leaves that range from 6 inches to 8 feet tall. Snake plants are excellent air purifiers and can survive in very low light conditions.",
        careLevel: "easy",
        lightRequirements: "low to bright indirect",
        wateringFrequency: 14, // Every two weeks
        humidity: "low",
        soilType: "Well-draining, sandy soil",
        propagation: "Division or leaf cuttings",
        toxicity: "toxic to pets",
        commonIssues: "Overwatering leading to root rot. Brown spots may indicate too much direct sunlight.",
        imageUrl: "/uploads/snake-plant.svg"
      },
      {
        name: "Jade Plant",
        scientificName: "Crassula ovata",
        family: "Crassulaceae",
        origin: "South Africa",
        description: "A succulent with thick, woody stems and oval-shaped, fleshy leaves. Often called 'money plant' or 'lucky plant' and used in feng shui practices.",
        careLevel: "easy",
        lightRequirements: "bright indirect to direct",
        wateringFrequency: 14, // Every two weeks
        humidity: "low",
        soilType: "Cactus mix or well-draining soil",
        propagation: "Leaf or stem cuttings",
        toxicity: "toxic to pets",
        commonIssues: "Shriveled leaves from underwatering; root rot from overwatering; dropping leaves from cold.",
        imageUrl: "/uploads/jade-plant.svg"
      },
      {
        name: "Pothos",
        scientificName: "Epipremnum aureum",
        family: "Araceae",
        origin: "Southeast Asia",
        description: "A popular trailing vine with heart-shaped leaves that can be solid green, marbled with yellow or white, or speckled with gold. Extremely adaptable and easy to grow.",
        careLevel: "easy",
        lightRequirements: "low to bright indirect",
        wateringFrequency: 7, // Weekly
        humidity: "low to medium",
        soilType: "Standard potting mix",
        propagation: "Stem cuttings in water or soil",
        toxicity: "toxic to pets",
        commonIssues: "Yellowing leaves from overwatering; brown leaf tips from low humidity or fluoride in water.",
        imageUrl: "/uploads/pothos.svg"
      },
      {
        name: "Peace Lily",
        scientificName: "Spathiphyllum",
        family: "Araceae",
        origin: "Tropical Americas",
        description: "An elegant plant with glossy green leaves and white spathes (flowers). Known for its air-purifying qualities and ability to thrive in low light.",
        careLevel: "easy",
        lightRequirements: "low to medium indirect",
        wateringFrequency: 7, // Weekly
        humidity: "medium to high",
        soilType: "Rich, well-draining potting mix",
        propagation: "Division during repotting",
        toxicity: "toxic to pets and humans",
        commonIssues: "Drooping indicates need for water; brown leaf tips from dry air or chemicals in water.",
        imageUrl: "/uploads/peace-lily.svg"
      },
      {
        name: "ZZ Plant",
        scientificName: "Zamioculcas zamiifolia",
        family: "Araceae",
        origin: "Eastern Africa",
        description: "A striking plant with glossy, dark green leaves arranged on stems in a herringbone pattern. Extremely drought-tolerant and can handle low light conditions.",
        careLevel: "easy",
        lightRequirements: "low to bright indirect",
        wateringFrequency: 21, // Every three weeks
        humidity: "low",
        soilType: "Well-draining potting mix",
        propagation: "Leaf cuttings or division",
        toxicity: "toxic to pets and humans",
        commonIssues: "Yellowing leaves from overwatering; can go months without water.",
        imageUrl: "/uploads/zz-plant.svg"
      },
      {
        name: "Spider Plant",
        scientificName: "Chlorophytum comosum",
        family: "Asparagaceae",
        origin: "South Africa",
        description: "A classic houseplant with arching green and white striped leaves. Produces baby plantlets that hang from long stems, resembling spiders.",
        careLevel: "easy",
        lightRequirements: "medium to bright indirect",
        wateringFrequency: 7, // Weekly
        humidity: "medium",
        soilType: "Well-draining potting mix",
        propagation: "Plantlets/offsets",
        toxicity: "non-toxic",
        commonIssues: "Brown leaf tips from fluoride in water; avoid overwatering.",
        imageUrl: "/uploads/spider-plant.svg"
      },
      {
        name: "Fiddle Leaf Fig",
        scientificName: "Ficus lyrata",
        family: "Moraceae",
        origin: "Western Africa",
        description: "A popular indoor tree with large, violin-shaped leaves. Can grow up to 10 feet tall indoors and makes a striking statement piece.",
        careLevel: "moderate",
        lightRequirements: "bright indirect",
        wateringFrequency: 10, // Every 10 days
        humidity: "medium to high",
        soilType: "Well-draining potting mix rich in organic matter",
        propagation: "Stem cuttings or air layering",
        toxicity: "toxic to pets",
        commonIssues: "Brown spots from overwatering; leaf drop from inconsistent care or drafts.",
        imageUrl: "/uploads/fiddle-leaf-fig.svg"
      },
      {
        name: "Monstera Deliciosa",
        scientificName: "Monstera deliciosa",
        family: "Araceae",
        origin: "Central America",
        description: "Known for its large, glossy, perforated leaves, this tropical plant has become an icon of interior design. The holes in the leaves are called fenestrations.",
        careLevel: "moderate",
        lightRequirements: "medium to bright indirect",
        wateringFrequency: 7, // Weekly
        humidity: "medium to high",
        soilType: "Rich, well-draining potting mix",
        propagation: "Stem cuttings with nodes",
        toxicity: "toxic to pets",
        commonIssues: "Yellowing leaves from overwatering; lack of fenestrations from insufficient light.",
        imageUrl: "/uploads/monstera.svg"
      },
      {
        name: "Rubber Plant",
        scientificName: "Ficus elastica",
        family: "Moraceae",
        origin: "Southeast Asia",
        description: "A popular houseplant with thick, glossy leaves that range from dark green to burgundy. Can grow into a tall indoor tree with proper care.",
        careLevel: "easy",
        lightRequirements: "medium to bright indirect",
        wateringFrequency: 7, // Weekly
        humidity: "medium",
        soilType: "Well-draining potting mix",
        propagation: "Stem cuttings or air layering",
        toxicity: "toxic to pets",
        commonIssues: "Leaf drop from overwatering or cold drafts; dusty leaves reduce growth.",
        imageUrl: "/uploads/rubber-plant-new.svg"
      },
      {
        name: "Aloe Vera",
        scientificName: "Aloe barbadensis miller",
        family: "Asphodelaceae",
        origin: "Arabian Peninsula",
        description: "A succulent plant species with thick, fleshy leaves containing a gel known for its medicinal properties, particularly for treating burns and skin conditions.",
        careLevel: "easy",
        lightRequirements: "bright direct to indirect",
        wateringFrequency: 21, // Every three weeks
        humidity: "low",
        soilType: "Cactus or succulent mix",
        propagation: "Offsets/pups",
        toxicity: "toxic to pets",
        commonIssues: "Thin, curling leaves indicate underwatering; soft, mushy leaves indicate overwatering.",
        imageUrl: "/uploads/aloe-vera.svg"
      },
      {
        name: "Boston Fern",
        scientificName: "Nephrolepis exaltata",
        family: "Nephrolepidaceae",
        origin: "Tropical regions worldwide",
        description: "A classic fern with feathery, arching fronds that can grow up to 3 feet long. Adds a touch of woodland charm to any indoor space.",
        careLevel: "moderate",
        lightRequirements: "medium to bright indirect",
        wateringFrequency: 5, // Every 5 days
        humidity: "high",
        soilType: "Rich, well-draining potting mix",
        propagation: "Division or spores",
        toxicity: "non-toxic",
        commonIssues: "Brown fronds from low humidity; yellowing from overwatering.",
        imageUrl: "/uploads/boston-fern.svg"
      },
      {
        name: "Chinese Money Plant",
        scientificName: "Pilea peperomioides",
        family: "Urticaceae",
        origin: "Southern China",
        description: "A charming plant with round, coin-shaped leaves on long stems. Also known as UFO plant or pancake plant due to its distinctive leaf shape.",
        careLevel: "easy",
        lightRequirements: "medium indirect",
        wateringFrequency: 7, // Weekly
        humidity: "low to medium",
        soilType: "Well-draining potting mix",
        propagation: "Offsets/pups",
        toxicity: "non-toxic",
        commonIssues: "Curling leaves from too much light; leggy growth from insufficient light.",
        imageUrl: "/uploads/chinese-money-plant-new.svg"
      },
      {
        name: "Calathea",
        scientificName: "Calathea spp.",
        family: "Marantaceae",
        origin: "Tropical Americas",
        description: "Known for their dramatic foliage with intricate patterns and purple undersides. These prayer plants move their leaves up at night and down during the day.",
        careLevel: "difficult",
        lightRequirements: "medium indirect",
        wateringFrequency: 7, // Weekly
        humidity: "high",
        soilType: "Rich, well-draining potting mix",
        propagation: "Division during repotting",
        toxicity: "non-toxic",
        commonIssues: "Crispy edges from low humidity; brown spots from tap water minerals; curling from underwatering.",
        imageUrl: "/uploads/calathea-new.svg"
      },
      {
        name: "String of Pearls",
        scientificName: "Senecio rowleyanus",
        family: "Asteraceae",
        origin: "Southwest Africa",
        description: "A striking succulent with cascading stems covered in small, spherical leaves that resemble pearls or beads. Perfect for hanging baskets or shelf displays.",
        careLevel: "moderate",
        lightRequirements: "bright indirect",
        wateringFrequency: 14, // Every two weeks
        humidity: "low",
        soilType: "Cactus or succulent mix",
        propagation: "Stem cuttings",
        toxicity: "toxic to pets and humans",
        commonIssues: "Shriveled pearls indicate underwatering; mushy stems indicate overwatering; stretching indicates insufficient light.",
        imageUrl: "/uploads/string-of-pearls.svg"
      }
    ];
    
    // Add plant species to the catalog
    for (const species of commonPlants) {
      const id = this.plantSpeciesIdCounter++;
      this.plantSpeciesCatalog.set(id, { 
        ...species, 
        id,
        family: species.family || null,
        origin: species.origin || null,
        humidity: species.humidity || null,
        soilType: species.soilType || null,
        propagation: species.propagation || null,
        toxicity: species.toxicity || null,
        commonIssues: species.commonIssues || null,
        imageUrl: species.imageUrl || null
      });
    }
  }
  
  async getAllPlantSpecies(): Promise<PlantSpecies[]> {
    return Array.from(this.plantSpeciesCatalog.values());
  }

  async getPlantSpecies(id: number): Promise<PlantSpecies | undefined> {
    return this.plantSpeciesCatalog.get(id);
  }

  async getPlantSpeciesByName(name: string): Promise<PlantSpecies | undefined> {
    return Array.from(this.plantSpeciesCatalog.values()).find(
      (species) => species.name.toLowerCase() === name.toLowerCase()
    );
  }

  async createPlantSpecies(insertSpecies: InsertPlantSpecies): Promise<PlantSpecies> {
    // Check if a species with the same name already exists
    const existingSpecies = await this.getPlantSpeciesByName(insertSpecies.name);
    if (existingSpecies) {
      throw new Error(`Plant species '${insertSpecies.name}' already exists`);
    }
    
    const id = this.plantSpeciesIdCounter++;
    const species: PlantSpecies = { 
      ...insertSpecies, 
      id,
      family: insertSpecies.family || null,
      origin: insertSpecies.origin || null,
      humidity: insertSpecies.humidity || null,
      soilType: insertSpecies.soilType || null,
      propagation: insertSpecies.propagation || null,
      toxicity: insertSpecies.toxicity || null,
      commonIssues: insertSpecies.commonIssues || null,
      imageUrl: insertSpecies.imageUrl || null
    };
    this.plantSpeciesCatalog.set(id, species);
    return species;
  }

  async updatePlantSpecies(id: number, speciesUpdate: Partial<InsertPlantSpecies>): Promise<PlantSpecies | undefined> {
    const existingSpecies = this.plantSpeciesCatalog.get(id);
    if (!existingSpecies) {
      return undefined;
    }
    
    // If name is being updated, check for duplicates
    if (speciesUpdate.name && speciesUpdate.name !== existingSpecies.name) {
      const nameExists = Array.from(this.plantSpeciesCatalog.values()).some(
        (species) => species.id !== id && species.name.toLowerCase() === speciesUpdate.name!.toLowerCase()
      );
      
      if (nameExists) {
        throw new Error(`Plant species with name '${speciesUpdate.name}' already exists`);
      }
    }
    
    const updatedSpecies: PlantSpecies = { ...existingSpecies, ...speciesUpdate };
    this.plantSpeciesCatalog.set(id, updatedSpecies);
    return updatedSpecies;
  }

  async deletePlantSpecies(id: number): Promise<boolean> {
    return this.plantSpeciesCatalog.delete(id);
  }

  async searchPlantSpecies(query: string): Promise<PlantSpecies[]> {
    if (!query || query.trim() === '') {
      return this.getAllPlantSpecies();
    }
    
    const lowerQuery = query.toLowerCase();
    return Array.from(this.plantSpeciesCatalog.values()).filter((species) => {
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
    return this.notificationSettingsData;
  }

  async updateNotificationSettings(settings: Partial<InsertNotificationSettings>): Promise<NotificationSettings> {
    // Initialize default settings if they don't exist
    if (!this.notificationSettingsData) {
      this.notificationSettingsData = {
        id: 1,
        enabled: true,
        pushoverAppToken: process.env.PUSHOVER_APP_TOKEN || null,
        pushoverUserKey: process.env.PUSHOVER_USER_KEY || null,
        lastUpdated: new Date()
      };
    }

    // Update settings
    this.notificationSettingsData = {
      ...this.notificationSettingsData,
      ...settings,
      lastUpdated: new Date()
    };

    return this.notificationSettingsData;
  }

  // Import/restore methods
  async deleteAllUserData(): Promise<void> {
    // For MemStorage, clear all user data but keep default locations and plant species
    this.plants.clear();
    this.wateringHistory.clear();
    
    // Keep default locations but remove user-created ones
    const defaultLocations = Array.from(this.locations.values()).filter(loc => loc.isDefault);
    this.locations.clear();
    for (const loc of defaultLocations) {
      this.locations.set(loc.id, loc);
    }
    
    // Reset notification settings
    this.notificationSettingsData = undefined;
  }

  async createWateringHistory(entry: InsertWateringHistory): Promise<WateringHistory> {
    const id = this.wateringHistoryIdCounter++;
    const wateringEntry: WateringHistory = {
      id,
      plantId: entry.plantId,
      wateredAt: entry.wateredAt
    };
    
    this.wateringHistory.set(id, wateringEntry);
    return wateringEntry;
  }

  async upsertLocationByName(name: string, isDefault: boolean = false): Promise<Location> {
    // Check if location already exists
    const existingLocation = Array.from(this.locations.values()).find(
      (loc) => loc.name.toLowerCase() === name.toLowerCase()
    );
    
    if (existingLocation) {
      return existingLocation;
    }
    
    // Create new location
    const id = this.locationIdCounter++;
    const location: Location = { 
      id, 
      name,
      isDefault
    };
    this.locations.set(id, location);
    return location;
  }

  async findPlantByDetails(name: string, species: string | null, location: string): Promise<Plant | undefined> {
    return Array.from(this.plants.values()).find(
      (plant) => plant.name.toLowerCase() === name.toLowerCase() &&
                 plant.species === species &&
                 plant.location === location
    );
  }
}

// Create database tables and migrate data
import { MultiUserStorage } from "./multi-user-storage";

// We're using multi-user database storage for data persistence
export const storage = new MultiUserStorage();
