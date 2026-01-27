import { db } from "./db";
import { plantSpecies } from "../shared/schema";
import { eq, isNull, and } from "drizzle-orm";

// Default plant species to seed the database
const defaultSpecies = [
  {
    name: "Snake Plant",
    scientificName: "Sansevieria trifasciata",
    family: "Asparagaceae",
    origin: "West Africa",
    description: "Also known as Mother-in-Law's Tongue, this hardy plant is perfect for beginners. It can survive weeks without water and tolerates low light conditions.",
    careLevel: "easy",
    lightRequirements: "Low to bright indirect light",
    wateringFrequency: 14,
    humidity: "low",
    soilType: "Well-draining cactus or succulent mix",
    propagation: "Leaf cuttings or division",
    toxicity: "toxic to pets",
    commonIssues: "Root rot from overwatering, brown tips from fluoride in water",
    imageUrl: "/uploads/snake-plant.svg"
  },
  {
    name: "Jade Plant",
    scientificName: "Crassula ovata",
    family: "Crassulaceae",
    origin: "South Africa",
    description: "A popular succulent with thick, oval-shaped leaves. Known for bringing good luck and prosperity in some cultures.",
    careLevel: "easy",
    lightRequirements: "Bright indirect to direct light",
    wateringFrequency: 10,
    humidity: "low",
    soilType: "Cactus or succulent potting mix",
    propagation: "Stem or leaf cuttings",
    toxicity: "toxic to pets",
    commonIssues: "Overwatering leading to root rot, leaf drop from sudden temperature changes",
    imageUrl: "/uploads/jade-plant.svg"
  },
  {
    name: "Pothos",
    scientificName: "Epipremnum aureum",
    family: "Araceae",
    origin: "Southeast Asia",
    description: "A trailing vine with heart-shaped leaves, often variegated. One of the most popular and easy-to-grow houseplants.",
    careLevel: "easy",
    lightRequirements: "Low to bright indirect light",
    wateringFrequency: 7,
    humidity: "medium",
    soilType: "Well-draining potting soil",
    propagation: "Stem cuttings in water or soil",
    toxicity: "toxic to pets",
    commonIssues: "Yellow leaves from overwatering, brown edges from underwatering",
    imageUrl: "/uploads/pothos.svg"
  },
  {
    name: "Peace Lily",
    scientificName: "Spathiphyllum",
    family: "Araceae",
    origin: "Tropical Americas and Southeast Asia",
    description: "Known for its elegant white flowers and air-purifying qualities. Will droop dramatically when thirsty.",
    careLevel: "easy",
    lightRequirements: "Low to medium indirect light",
    wateringFrequency: 7,
    humidity: "medium",
    soilType: "Well-draining potting soil rich in organic matter",
    propagation: "Division",
    toxicity: "toxic to pets",
    commonIssues: "Brown leaf tips from tap water or low humidity, yellowing from overwatering",
    imageUrl: "/uploads/peace-lily.svg"
  },
  {
    name: "ZZ Plant",
    scientificName: "Zamioculcas zamiifolia",
    family: "Araceae",
    origin: "East Africa",
    description: "Extremely hardy with glossy, dark green leaves. Can tolerate neglect and low light, making it perfect for offices.",
    careLevel: "easy",
    lightRequirements: "Low to bright indirect light",
    wateringFrequency: 14,
    humidity: "low",
    soilType: "Well-draining potting mix",
    propagation: "Division or leaf cuttings",
    toxicity: "toxic to pets",
    commonIssues: "Yellow leaves from overwatering, slow growth is normal",
    imageUrl: "/uploads/zz-plant.svg"
  },
  {
    name: "Spider Plant",
    scientificName: "Chlorophytum comosum",
    family: "Asparagaceae",
    origin: "South Africa",
    description: "Features long, arching leaves with white stripes. Produces baby plantlets that hang from the mother plant.",
    careLevel: "easy",
    lightRequirements: "Bright indirect light",
    wateringFrequency: 5,
    humidity: "medium",
    soilType: "Well-draining potting soil",
    propagation: "Plantlets or division",
    toxicity: "non-toxic",
    commonIssues: "Brown tips from fluoride in water, pale leaves from too much light",
    imageUrl: "/uploads/spider-plant.svg"
  },
  {
    name: "Fiddle Leaf Fig",
    scientificName: "Ficus lyrata",
    family: "Moraceae",
    origin: "West Africa",
    description: "A statement plant with large, violin-shaped leaves. Popular in interior design but requires consistent care.",
    careLevel: "difficult",
    lightRequirements: "Bright indirect light",
    wateringFrequency: 7,
    humidity: "medium",
    soilType: "Well-draining potting mix",
    propagation: "Air layering or stem cuttings",
    toxicity: "toxic to pets",
    commonIssues: "Brown spots from inconsistent watering, leaf drop from drafts or moving",
    imageUrl: "/uploads/fiddle-leaf-fig.svg"
  },
  {
    name: "Monstera Deliciosa",
    scientificName: "Monstera deliciosa",
    family: "Araceae",
    origin: "Central America",
    description: "Famous for its split, fenestrated leaves. A tropical climbing plant that can grow quite large indoors.",
    careLevel: "moderate",
    lightRequirements: "Bright indirect light",
    wateringFrequency: 7,
    humidity: "high",
    soilType: "Rich, well-draining potting soil",
    propagation: "Stem cuttings with aerial roots",
    toxicity: "toxic to pets",
    commonIssues: "Yellow leaves from overwatering, lack of splits from insufficient light",
    imageUrl: "/uploads/monstera.svg"
  },
  {
    name: "Rubber Plant",
    scientificName: "Ficus elastica",
    family: "Moraceae",
    origin: "Southeast Asia",
    description: "Features large, glossy leaves that come in various colors. A fast-growing plant that can become a tree.",
    careLevel: "moderate",
    lightRequirements: "Bright indirect light",
    wateringFrequency: 7,
    humidity: "medium",
    soilType: "Well-draining potting mix",
    propagation: "Air layering or stem cuttings",
    toxicity: "toxic to pets",
    commonIssues: "Leaf drop from overwatering or cold drafts, leggy growth from low light",
    imageUrl: "/uploads/rubber-plant.svg"
  },
  {
    name: "Aloe Vera",
    scientificName: "Aloe barbadensis miller",
    family: "Asphodelaceae",
    origin: "Arabian Peninsula",
    description: "A succulent known for its medicinal gel. Low maintenance and drought-tolerant.",
    careLevel: "easy",
    lightRequirements: "Bright indirect to direct light",
    wateringFrequency: 14,
    humidity: "low",
    soilType: "Cactus or succulent mix",
    propagation: "Offsets (pups)",
    toxicity: "toxic to pets",
    commonIssues: "Brown or mushy leaves from overwatering, pale leaves from too much sun",
    imageUrl: "/uploads/aloe-vera.svg"
  },
  {
    name: "Boston Fern",
    scientificName: "Nephrolepis exaltata",
    family: "Nephrolepidaceae",
    origin: "Tropical regions worldwide",
    description: "A classic fern with arching fronds. Loves humidity and makes a beautiful hanging plant.",
    careLevel: "moderate",
    lightRequirements: "Bright indirect light",
    wateringFrequency: 3,
    humidity: "high",
    soilType: "Rich, well-draining potting soil",
    propagation: "Division or runners",
    toxicity: "non-toxic",
    commonIssues: "Brown, crispy fronds from low humidity or underwatering",
    imageUrl: "/uploads/boston-fern.svg"
  },
  {
    name: "Chinese Money Plant",
    scientificName: "Pilea peperomioides",
    family: "Urticaceae",
    origin: "Southern China",
    description: "Features unique, round, coin-like leaves on long stems. Very easy to propagate and share.",
    careLevel: "easy",
    lightRequirements: "Bright indirect light",
    wateringFrequency: 7,
    humidity: "medium",
    soilType: "Well-draining potting soil",
    propagation: "Offsets or stem cuttings",
    toxicity: "non-toxic",
    commonIssues: "Curling leaves from underwatering, yellow leaves from overwatering",
    imageUrl: "/uploads/chinese-money-plant.svg"
  },
  {
    name: "Calathea",
    scientificName: "Calathea spp.",
    family: "Marantaceae",
    origin: "Tropical Americas",
    description: "Known for striking leaf patterns and prayer plant behavior (leaves fold up at night). Requires consistent care.",
    careLevel: "difficult",
    lightRequirements: "Medium indirect light",
    wateringFrequency: 5,
    humidity: "high",
    soilType: "Well-draining, peat-based potting mix",
    propagation: "Division",
    toxicity: "non-toxic",
    commonIssues: "Brown, crispy edges from low humidity or tap water, curling leaves from underwatering",
    imageUrl: "/uploads/calathea.svg"
  },
  {
    name: "String of Pearls",
    scientificName: "Senecio rowleyanus",
    family: "Asteraceae",
    origin: "Southwest Africa",
    description: "A unique trailing succulent with bead-like leaves. Perfect for hanging baskets.",
    careLevel: "moderate",
    lightRequirements: "Bright indirect light",
    wateringFrequency: 10,
    humidity: "low",
    soilType: "Cactus or succulent mix",
    propagation: "Stem cuttings",
    toxicity: "toxic to pets",
    commonIssues: "Shriveled beads from underwatering, mushy beads from overwatering",
    imageUrl: "/uploads/string-of-pearls.svg"
  }
];

export async function seedPlantSpecies() {
  try {
    console.log("🌱 Starting plant species seeding...");

    // Check if species already exist
    const existingSpecies = await db.select().from(plantSpecies).limit(1);

    if (existingSpecies.length > 0) {
      console.log("✅ Plant species already exist. Updating image URLs...");

      // Update imageUrl for each existing species to use local SVGs
      for (const species of defaultSpecies) {
        await db.update(plantSpecies)
          .set({ imageUrl: species.imageUrl })
          .where(and(eq(plantSpecies.name, species.name), isNull(plantSpecies.userId)));
      }

      console.log(`✅ Updated image URLs for ${defaultSpecies.length} species!`);
      return { success: true, message: "Species updated", count: defaultSpecies.length };
    }

    // Insert all default species
    const inserted = await db.insert(plantSpecies).values(defaultSpecies).returning();

    console.log(`✅ Successfully seeded ${inserted.length} plant species!`);
    return { success: true, message: "Species seeded successfully", count: inserted.length };

  } catch (error) {
    console.error("❌ Error seeding plant species:", error);
    throw error;
  }
}
