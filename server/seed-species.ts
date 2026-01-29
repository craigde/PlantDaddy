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
    imageUrl: "/uploads/snake-plant.png"
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
    imageUrl: "/uploads/jade-plant.png"
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
    imageUrl: "/uploads/pothos.png"
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
    imageUrl: "/uploads/peace-lily.png"
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
    imageUrl: "/uploads/zz-plant.png"
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
    imageUrl: "/uploads/spider-plant.png"
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
    imageUrl: "/uploads/fiddle-leaf-fig.png"
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
    imageUrl: "/uploads/monstera.png"
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
    imageUrl: "/uploads/rubber-plant.png"
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
    imageUrl: "/uploads/aloe-vera.png"
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
    imageUrl: "/uploads/boston-fern.png"
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
    imageUrl: "/uploads/chinese-money-plant.png"
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
    imageUrl: "/uploads/calathea.png"
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

export async function seedPlantSpecies() {
  try {
    console.log("🌱 Starting plant species seeding...");

    // Check if species already exist
    const existingSpecies = await db.select().from(plantSpecies).limit(1);

    if (existingSpecies.length > 0) {
      console.log("✅ Plant species already exist. Updating and adding missing species...");

      let updatedCount = 0;
      let insertedCount = 0;

      for (const species of defaultSpecies) {
        // Check if this species already exists
        const existing = await db.select().from(plantSpecies)
          .where(and(eq(plantSpecies.name, species.name), isNull(plantSpecies.userId)))
          .limit(1);

        if (existing.length > 0) {
          // Update existing species image URL
          await db.update(plantSpecies)
            .set({ imageUrl: species.imageUrl })
            .where(and(eq(plantSpecies.name, species.name), isNull(plantSpecies.userId)));
          updatedCount++;
        } else {
          // Insert new species
          await db.insert(plantSpecies).values(species);
          insertedCount++;
        }
      }

      console.log(`✅ Updated ${updatedCount} species, added ${insertedCount} new species!`);
      return { success: true, message: "Species synced", count: defaultSpecies.length };
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
