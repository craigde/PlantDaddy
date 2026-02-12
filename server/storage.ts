import {
  plants,
  locations,
  plantSpecies,
  notificationSettings,
  plantHealthRecords,
  careActivities,
  type Plant,
  type InsertPlant,
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
  type InsertCareActivity,
  type DeviceToken,
  type PlantJournalEntry,
  type InsertPlantJournalEntry
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
  getPlantHealthRecords(plantId: number): Promise<(PlantHealthRecord & { username: string })[]>;
  getHealthRecord(id: number): Promise<PlantHealthRecord | undefined>;
  getAllHealthRecordsForUser(): Promise<PlantHealthRecord[]>;
  createHealthRecord(record: InsertPlantHealthRecord): Promise<PlantHealthRecord>;
  updateHealthRecord(id: number, record: Partial<InsertPlantHealthRecord>): Promise<PlantHealthRecord | undefined>;
  deleteHealthRecord(id: number): Promise<boolean>;

  // Care Activities methods
  getPlantCareActivities(plantId: number): Promise<(CareActivity & { username: string })[]>;
  getAllCareActivitiesForUser(): Promise<CareActivity[]>;
  createCareActivity(activity: InsertCareActivity): Promise<CareActivity>;
  updateCareActivity(id: number, activity: Partial<InsertCareActivity>): Promise<CareActivity | undefined>;
  deleteCareActivity(id: number): Promise<boolean>;

  // Plant Journal Entries methods
  getPlantJournalEntries(plantId: number): Promise<(PlantJournalEntry & { username: string })[]>;
  createJournalEntry(entry: InsertPlantJournalEntry): Promise<PlantJournalEntry>;
  deleteJournalEntry(id: number): Promise<boolean>;

  // Import/restore methods
  deleteAllUserData(): Promise<void>;
  upsertLocationByName(name: string, isDefault?: boolean): Promise<Location>;
  findPlantByDetails(name: string, species: string | null, location: string): Promise<Plant | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private plants: Map<number, Plant>;
  private locations: Map<number, Location>;
  private plantSpeciesCatalog: Map<number, PlantSpecies>;
  private notificationSettingsData: NotificationSettings | undefined;

  private userIdCounter: number;
  private plantIdCounter: number;
  private locationIdCounter: number;
  private plantSpeciesIdCounter: number;

  constructor() {
    this.users = new Map();
    this.plants = new Map();
    this.locations = new Map();
    this.plantSpeciesCatalog = new Map();

    this.userIdCounter = 1;
    this.plantIdCounter = 1;
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
        imageUrl: "/uploads/snake-plant.png"
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
        imageUrl: "/uploads/jade-plant.png"
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
        imageUrl: "/uploads/pothos.png"
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
        imageUrl: "/uploads/peace-lily.png"
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
        imageUrl: "/uploads/zz-plant.png"
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
        imageUrl: "/uploads/spider-plant.png"
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
        imageUrl: "/uploads/fiddle-leaf-fig.png"
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
        imageUrl: "/uploads/monstera.png"
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
        imageUrl: "/uploads/rubber-plant-new.png"
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
        imageUrl: "/uploads/aloe-vera.png"
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
        imageUrl: "/uploads/boston-fern.png"
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
        imageUrl: "/uploads/chinese-money-plant-new.png"
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
        imageUrl: "/uploads/calathea-new.png"
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
        imageUrl: "/uploads/string-of-pearls.png"
      },
      {
        name: "Philodendron",
        scientificName: "Philodendron hederaceum",
        family: "Araceae",
        origin: "Central and South America",
        description: "The heartleaf philodendron is a classic trailing houseplant with glossy, heart-shaped leaves. Extremely adaptable and one of the easiest plants to grow indoors.",
        careLevel: "easy",
        lightRequirements: "Low to bright indirect light",
        wateringFrequency: 7,
        humidity: "medium",
        soilType: "Well-draining potting soil",
        propagation: "Stem cuttings in water or soil",
        toxicity: "toxic to pets",
        commonIssues: "Yellow leaves from overwatering, leggy growth from low light",
        imageUrl: "/uploads/philodendron.png"
      },
      {
        name: "Dracaena",
        scientificName: "Dracaena marginata",
        family: "Asparagaceae",
        origin: "Madagascar",
        description: "A striking tree-like plant with thin, arching leaves edged in red or pink. Slow-growing and excellent for adding height to a room.",
        careLevel: "easy",
        lightRequirements: "Low to bright indirect light",
        wateringFrequency: 10,
        humidity: "low",
        soilType: "Well-draining potting mix",
        propagation: "Stem cuttings or air layering",
        toxicity: "toxic to pets",
        commonIssues: "Brown leaf tips from fluoride in water or low humidity, leaf drop from cold drafts",
        imageUrl: "/uploads/dracaena.png"
      },
      {
        name: "Cast Iron Plant",
        scientificName: "Aspidistra elatior",
        family: "Asparagaceae",
        origin: "Japan and Taiwan",
        description: "True to its name, this plant is nearly indestructible. It tolerates low light, irregular watering, and temperature fluctuations better than almost any houseplant.",
        careLevel: "easy",
        lightRequirements: "Low to medium indirect light",
        wateringFrequency: 10,
        humidity: "low",
        soilType: "Standard potting soil",
        propagation: "Division",
        toxicity: "non-toxic",
        commonIssues: "Brown spots from direct sunlight, slow growth is normal",
        imageUrl: "/uploads/cast-iron-plant.png"
      },
      {
        name: "Parlor Palm",
        scientificName: "Chamaedorea elegans",
        family: "Arecaceae",
        origin: "Southern Mexico and Guatemala",
        description: "A compact, elegant palm that thrives indoors. One of the most popular indoor palms due to its tolerance of lower light and humidity levels.",
        careLevel: "easy",
        lightRequirements: "Low to bright indirect light",
        wateringFrequency: 7,
        humidity: "medium",
        soilType: "Peat-based potting mix",
        propagation: "Seeds (cannot be divided)",
        toxicity: "non-toxic",
        commonIssues: "Brown leaf tips from dry air, spider mites in low humidity",
        imageUrl: "/uploads/parlor-palm.png"
      },
      {
        name: "Haworthia",
        scientificName: "Haworthia fasciata",
        family: "Asphodelaceae",
        origin: "South Africa",
        description: "A small, slow-growing succulent with distinctive white stripes on thick, pointed leaves arranged in a rosette. Perfect for windowsills and desks.",
        careLevel: "easy",
        lightRequirements: "Bright indirect light",
        wateringFrequency: 14,
        humidity: "low",
        soilType: "Cactus or succulent mix",
        propagation: "Offsets or leaf cuttings",
        toxicity: "non-toxic",
        commonIssues: "Mushy leaves from overwatering, stretching from insufficient light",
        imageUrl: "/uploads/haworthia.png"
      },
      {
        name: "Christmas Cactus",
        scientificName: "Schlumbergera bridgesii",
        family: "Cactaceae",
        origin: "Brazil",
        description: "A tropical cactus with flat, segmented stems that blooms stunning flowers in winter. Unlike desert cacti, it prefers humidity and indirect light.",
        careLevel: "moderate",
        lightRequirements: "Bright indirect light",
        wateringFrequency: 7,
        humidity: "medium",
        soilType: "Well-draining potting mix with perlite",
        propagation: "Stem cuttings (2-3 segments)",
        toxicity: "non-toxic",
        commonIssues: "Bud drop from temperature changes or moving, limp stems from overwatering",
        imageUrl: "/uploads/christmas-cactus.png"
      },
      {
        name: "Air Plant",
        scientificName: "Tillandsia ionantha",
        family: "Bromeliaceae",
        origin: "Central and South America",
        description: "A unique epiphyte that absorbs water and nutrients through its leaves rather than roots. Needs no soil and can be displayed creatively on driftwood, wire, or glass.",
        careLevel: "easy",
        lightRequirements: "Bright indirect light",
        wateringFrequency: 5,
        humidity: "medium",
        soilType: "No soil needed (epiphyte)",
        propagation: "Offsets (pups) after flowering",
        toxicity: "non-toxic",
        commonIssues: "Drying out from insufficient misting, rot from sitting in water",
        imageUrl: "/uploads/air-plant.png"
      },
      {
        name: "Monstera Adansonii",
        scientificName: "Monstera adansonii",
        family: "Araceae",
        origin: "Central and South America",
        description: "Known as the Swiss Cheese Vine for its perforated leaves. A fast-growing trailing or climbing plant that's more compact than its cousin, Monstera deliciosa.",
        careLevel: "moderate",
        lightRequirements: "Bright indirect light",
        wateringFrequency: 7,
        humidity: "high",
        soilType: "Rich, well-draining potting soil with perlite",
        propagation: "Stem cuttings with node in water or soil",
        toxicity: "toxic to pets",
        commonIssues: "Yellow leaves from overwatering, lack of fenestrations from low light",
        imageUrl: "/uploads/monstera-adansonii.png"
      },
      {
        name: "Hoya",
        scientificName: "Hoya carnosa",
        family: "Apocynaceae",
        origin: "Eastern Asia and Australia",
        description: "The wax plant features thick, waxy leaves and produces clusters of fragrant, star-shaped flowers. A rewarding long-lived trailing plant.",
        careLevel: "moderate",
        lightRequirements: "Bright indirect light",
        wateringFrequency: 10,
        humidity: "medium",
        soilType: "Well-draining orchid or succulent mix",
        propagation: "Stem cuttings",
        toxicity: "non-toxic",
        commonIssues: "No flowers from insufficient light, yellow leaves from overwatering",
        imageUrl: "/uploads/hoya.png"
      },
      {
        name: "Peperomia",
        scientificName: "Peperomia obtusifolia",
        family: "Piperaceae",
        origin: "Central and South America",
        description: "A compact, low-growing plant with thick, rounded leaves. Comes in many varieties with different leaf shapes and patterns. Great for small spaces.",
        careLevel: "easy",
        lightRequirements: "Medium to bright indirect light",
        wateringFrequency: 10,
        humidity: "medium",
        soilType: "Well-draining potting mix with perlite",
        propagation: "Leaf or stem cuttings",
        toxicity: "non-toxic",
        commonIssues: "Mushy stems from overwatering, dropping leaves from cold drafts",
        imageUrl: "/uploads/peperomia.png"
      },
      {
        name: "Alocasia",
        scientificName: "Alocasia amazonica",
        family: "Araceae",
        origin: "Southeast Asia",
        description: "Known as the Elephant Ear plant for its large, dramatic arrow-shaped leaves with prominent veining. A stunning statement plant that demands attention.",
        careLevel: "difficult",
        lightRequirements: "Bright indirect light",
        wateringFrequency: 5,
        humidity: "high",
        soilType: "Well-draining, airy potting mix",
        propagation: "Division of rhizomes or offsets",
        toxicity: "toxic to pets",
        commonIssues: "Drooping leaves from underwatering, spider mites in dry conditions, dormancy in winter",
        imageUrl: "/uploads/alocasia.png"
      },
      {
        name: "Croton",
        scientificName: "Codiaeum variegatum",
        family: "Euphorbiaceae",
        origin: "Southeast Asia and Pacific Islands",
        description: "One of the most colorful houseplants with leaves in shades of green, yellow, orange, and red. Thrives in bright light which intensifies its colors.",
        careLevel: "moderate",
        lightRequirements: "Bright indirect to direct light",
        wateringFrequency: 5,
        humidity: "high",
        soilType: "Rich, well-draining potting soil",
        propagation: "Stem cuttings",
        toxicity: "toxic to pets",
        commonIssues: "Leaf drop from sudden changes in environment, fading colors from low light",
        imageUrl: "/uploads/croton.png"
      },
      {
        name: "Bird of Paradise",
        scientificName: "Strelitzia reginae",
        family: "Strelitziaceae",
        origin: "South Africa",
        description: "A dramatic tropical plant with large, banana-like leaves and exotic bird-shaped flowers. Grows tall and makes a bold architectural statement indoors.",
        careLevel: "moderate",
        lightRequirements: "Bright indirect to direct light",
        wateringFrequency: 7,
        humidity: "medium",
        soilType: "Rich, well-draining potting soil",
        propagation: "Division or seeds",
        toxicity: "toxic to pets",
        commonIssues: "Curling leaves from underwatering, leaf splitting is natural, rarely flowers indoors",
        imageUrl: "/uploads/bird-of-paradise.png"
      },
      {
        name: "Dieffenbachia",
        scientificName: "Dieffenbachia seguine",
        family: "Araceae",
        origin: "Tropical Americas",
        description: "Also called Dumb Cane for its toxic sap that causes temporary speechlessness. Features large, oval leaves with attractive cream and green variegation.",
        careLevel: "easy",
        lightRequirements: "Medium to bright indirect light",
        wateringFrequency: 7,
        humidity: "medium",
        soilType: "Well-draining potting soil",
        propagation: "Stem cuttings or air layering",
        toxicity: "toxic to pets",
        commonIssues: "Yellow lower leaves from overwatering, brown edges from dry air",
        imageUrl: "/uploads/dieffenbachia.png"
      },
      {
        name: "English Ivy",
        scientificName: "Hedera helix",
        family: "Araliaceae",
        origin: "Europe and Western Asia",
        description: "A vigorous trailing vine with classic lobed leaves. Excellent for hanging baskets, trailing from shelves, or trained on a trellis. Great air purifier.",
        careLevel: "moderate",
        lightRequirements: "Bright indirect light",
        wateringFrequency: 5,
        humidity: "high",
        soilType: "Rich, well-draining potting soil",
        propagation: "Stem cuttings in water or soil",
        toxicity: "toxic to pets",
        commonIssues: "Spider mites in dry conditions, leaf drop from overwatering, leggy growth in low light",
        imageUrl: "/uploads/english-ivy.png"
      },
      {
        name: "Anthurium",
        scientificName: "Anthurium andraeanum",
        family: "Araceae",
        origin: "Colombia and Ecuador",
        description: "Known for its glossy, heart-shaped red spathes and yellow spadix. One of the longest-blooming houseplants, adding a tropical flair to any room.",
        careLevel: "moderate",
        lightRequirements: "Bright indirect light",
        wateringFrequency: 7,
        humidity: "high",
        soilType: "Well-draining orchid or peat mix",
        propagation: "Division or stem cuttings",
        toxicity: "toxic to pets",
        commonIssues: "Brown leaf tips from low humidity, green flowers from insufficient light",
        imageUrl: "/uploads/anthurium.png"
      },
      {
        name: "Maidenhair Fern",
        scientificName: "Adiantum raddianum",
        family: "Pteridaceae",
        origin: "Tropical Americas",
        description: "One of the most delicate and beautiful ferns with fan-shaped leaflets on thin, dark stems. Demands consistent moisture and humidity.",
        careLevel: "difficult",
        lightRequirements: "Medium indirect light",
        wateringFrequency: 3,
        humidity: "high",
        soilType: "Rich, peat-based potting mix",
        propagation: "Division",
        toxicity: "non-toxic",
        commonIssues: "Crispy fronds from low humidity or underwatering, complete dieback from drying out",
        imageUrl: "/uploads/maidenhair-fern.png"
      },
      {
        name: "Orchid",
        scientificName: "Phalaenopsis spp.",
        family: "Orchidaceae",
        origin: "Southeast Asia",
        description: "The moth orchid is the most popular orchid for home growing. Produces elegant, long-lasting flower sprays in a wide range of colors.",
        careLevel: "moderate",
        lightRequirements: "Bright indirect light",
        wateringFrequency: 7,
        humidity: "medium",
        soilType: "Orchid bark or sphagnum moss",
        propagation: "Keikis (baby plants on flower spikes)",
        toxicity: "non-toxic",
        commonIssues: "Root rot from overwatering, no reblooming without temperature drop, wrinkled leaves from dehydration",
        imageUrl: "/uploads/orchid.png"
      },
      {
        name: "Venus Flytrap",
        scientificName: "Dionaea muscipula",
        family: "Droseraceae",
        origin: "Coastal Carolinas, USA",
        description: "A carnivorous plant with jaw-like traps that snap shut on insects. Fascinating to watch and surprisingly specific in its care needs.",
        careLevel: "difficult",
        lightRequirements: "Bright direct light",
        wateringFrequency: 3,
        humidity: "high",
        soilType: "Sphagnum peat moss with perlite (no fertilizer)",
        propagation: "Division or leaf cuttings",
        toxicity: "non-toxic",
        commonIssues: "Blackening traps from triggering without food, death from tap water (use distilled only)",
        imageUrl: "/uploads/venus-flytrap.png"
      },
      {
        name: "Staghorn Fern",
        scientificName: "Platycerium bifurcatum",
        family: "Polypodiaceae",
        origin: "Australia and Southeast Asia",
        description: "An epiphytic fern with dramatic antler-shaped fronds. Typically mounted on boards or grown in hanging baskets rather than pots.",
        careLevel: "moderate",
        lightRequirements: "Bright indirect light",
        wateringFrequency: 7,
        humidity: "medium",
        soilType: "Mounted on board with sphagnum moss",
        propagation: "Division of pups or spores",
        toxicity: "non-toxic",
        commonIssues: "Brown shield fronds are normal (don't remove them), black spots from overwatering",
        imageUrl: "/uploads/staghorn-fern.png"
      },
      {
        name: "Echeveria",
        scientificName: "Echeveria elegans",
        family: "Crassulaceae",
        origin: "Mexico",
        description: "A beautiful rosette-forming succulent with plump, pale green leaves often tipped with pink. Produces tall flower stalks with bell-shaped blooms.",
        careLevel: "easy",
        lightRequirements: "Bright indirect to direct light",
        wateringFrequency: 14,
        humidity: "low",
        soilType: "Cactus or succulent mix",
        propagation: "Leaf cuttings or offsets",
        toxicity: "non-toxic",
        commonIssues: "Etiolation (stretching) from insufficient light, root rot from overwatering",
        imageUrl: "/uploads/echeveria.png"
      },
      {
        name: "Burro's Tail",
        scientificName: "Sedum morganianum",
        family: "Crassulaceae",
        origin: "Southern Mexico",
        description: "A trailing succulent with plump, bead-like blue-green leaves densely packed along hanging stems. Beautiful in hanging baskets but fragile to touch.",
        careLevel: "easy",
        lightRequirements: "Bright indirect light",
        wateringFrequency: 14,
        humidity: "low",
        soilType: "Cactus or succulent mix",
        propagation: "Stem or leaf cuttings",
        toxicity: "non-toxic",
        commonIssues: "Leaves fall off easily when touched, wrinkled leaves from underwatering",
        imageUrl: "/uploads/burros-tail.png"
      },
      {
        name: "Prickly Pear Cactus",
        scientificName: "Opuntia ficus-indica",
        family: "Cactaceae",
        origin: "Americas",
        description: "A classic cactus with flat, paddle-shaped segments covered in spines. Extremely drought-tolerant and can produce edible fruits and flowers.",
        careLevel: "easy",
        lightRequirements: "Bright direct light",
        wateringFrequency: 21,
        humidity: "low",
        soilType: "Sandy cactus mix",
        propagation: "Pad cuttings (let callous before planting)",
        toxicity: "non-toxic (but spines are hazardous)",
        commonIssues: "Etiolation from low light, soft spots from overwatering, glochid spines are irritating",
        imageUrl: "/uploads/prickly-pear-cactus.png"
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
    return Array.from(this.plantSpeciesCatalog.values()).sort((a, b) => a.name.localeCompare(b.name));
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
    }).sort((a, b) => a.name.localeCompare(b.name));
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
        lastUpdated: new Date()
      } as NotificationSettings;
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

    // Keep default locations but remove user-created ones
    const defaultLocations = Array.from(this.locations.values()).filter(loc => loc.isDefault);
    this.locations.clear();
    for (const loc of defaultLocations) {
      this.locations.set(loc.id, loc);
    }
    
    // Reset notification settings
    this.notificationSettingsData = undefined;
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

  async getPlantJournalEntries(plantId: number): Promise<(PlantJournalEntry & { username: string })[]> {
    return [];
  }

  async createJournalEntry(entry: InsertPlantJournalEntry): Promise<PlantJournalEntry> {
    throw new Error("Not implemented in MemStorage");
  }

  async deleteJournalEntry(id: number): Promise<boolean> {
    return false;
  }
}

// Create database tables and migrate data
import { MultiUserStorage } from "./multi-user-storage";

// We're using multi-user database storage for data persistence
export const storage = new MultiUserStorage();
