import { pgTable, text, serial, integer, boolean, timestamp, unique, primaryKey } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isAdmin: boolean("is_admin").default(false),
});

// Households - groups of users sharing plants
export const households = pgTable("households", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  inviteCode: text("invite_code").notNull().unique(),
  createdBy: integer("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const householdMembers = pgTable("household_members", {
  id: serial("id").primaryKey(),
  householdId: integer("household_id").references(() => households.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  role: text("role").notNull().default("member"), // "owner", "member", "caretaker"
  joinedAt: timestamp("joined_at").notNull().defaultNow(),
}, (table) => ({
  uniqueMember: unique("household_member_unique").on(table.householdId, table.userId),
}));

export type Household = typeof households.$inferSelect;
export type InsertHousehold = typeof households.$inferInsert;
export type HouseholdMember = typeof householdMembers.$inferSelect;
export type InsertHouseholdMember = typeof householdMembers.$inferInsert;

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Locations table
export const locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  isDefault: boolean("is_default").default(false),
  userId: integer("user_id").references(() => users.id).notNull(),
  householdId: integer("household_id").references(() => households.id),
}, (table) => {
  return {
    // Ensure location names are unique per user (but can be repeated across different users)
    locationUserName: unique("location_user_name_idx").on(table.name, table.userId),
  };
});

export const locationSchema = createInsertSchema(locations);
export const insertLocationSchema = locationSchema.omit({ id: true });

export type Location = typeof locations.$inferSelect;
export type InsertLocation = z.infer<typeof insertLocationSchema>;

// Plants table
export const plants = pgTable("plants", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  species: text("species"),
  location: text("location").notNull(),
  wateringFrequency: integer("watering_frequency").notNull(), // in days
  lastWatered: timestamp("last_watered").notNull(),
  notes: text("notes"),
  imageUrl: text("image_url"),
  userId: integer("user_id").references(() => users.id).notNull(),
  householdId: integer("household_id").references(() => households.id),
});

// Create base schema
export const plantSchema = createInsertSchema(plants);
// Add custom validation for lastWatered to better handle different date formats
export const insertPlantSchema = plantSchema
  .omit({ id: true })
  .extend({
    lastWatered: z.date().or(z.string().transform((val) => new Date(val))),
  });

export type Plant = typeof plants.$inferSelect;
export type InsertPlant = z.infer<typeof insertPlantSchema>;

// Plant species catalog
export const plantSpecies = pgTable("plant_species", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  scientificName: text("scientific_name").notNull(),
  family: text("family"),
  origin: text("origin"),
  description: text("description").notNull(),
  careLevel: text("care_level").notNull(), // "easy", "moderate", "difficult"
  lightRequirements: text("light_requirements").notNull(),
  wateringFrequency: integer("watering_frequency").notNull(), // recommended watering in days
  humidity: text("humidity"), // "low", "medium", "high"
  soilType: text("soil_type"),
  propagation: text("propagation"),
  toxicity: text("toxicity"), // "non-toxic", "toxic to pets", "toxic to humans"
  commonIssues: text("common_issues"),
  imageUrl: text("image_url"),
  userId: integer("user_id").references(() => users.id), // null = global species, set = user custom species
});

export const plantSpeciesSchema = createInsertSchema(plantSpecies);
export const insertPlantSpeciesSchema = plantSpeciesSchema.omit({ id: true, userId: true }); // userId is set automatically by the server

export type PlantSpecies = typeof plantSpecies.$inferSelect;
export type InsertPlantSpecies = z.infer<typeof insertPlantSpeciesSchema>;

// Notification settings
export const notificationSettings = pgTable("notification_settings", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull().unique(), // Each user has one settings record
  enabled: boolean("enabled").notNull().default(true),
  // Pushover settings
  pushoverAppToken: text("pushover_app_token"),
  pushoverUserKey: text("pushover_user_key"),
  pushoverEnabled: boolean("pushover_enabled").notNull().default(true),
  // Email settings
  emailEnabled: boolean("email_enabled").notNull().default(false),
  emailAddress: text("email_address"),
  sendgridApiKey: text("sendgrid_api_key"),
  lastUpdated: timestamp("last_updated").defaultNow(),
});

export const notificationSettingsSchema = createInsertSchema(notificationSettings);
export const insertNotificationSettingsSchema = notificationSettingsSchema.omit({ id: true });

export type NotificationSettings = typeof notificationSettings.$inferSelect;
export type InsertNotificationSettings = z.infer<typeof insertNotificationSettingsSchema>;

// Device tokens for APNs push notifications
export const deviceTokens = pgTable("device_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  token: text("token").notNull().unique(),
  environment: text("environment").notNull().default("production"), // "sandbox" or "production"
  createdAt: timestamp("created_at").notNull().defaultNow(),
  lastUsed: timestamp("last_used").defaultNow(),
});

export const deviceTokenSchema = createInsertSchema(deviceTokens);
export const insertDeviceTokenSchema = deviceTokenSchema.omit({ id: true, createdAt: true, lastUsed: true });

export type DeviceToken = typeof deviceTokens.$inferSelect;
export type InsertDeviceToken = z.infer<typeof insertDeviceTokenSchema>;

// Plant Health Records - Track health status over time with photos
export const plantHealthRecords = pgTable("plant_health_records", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plants.id).notNull(),
  status: text("status").notNull(), // "thriving", "struggling", "sick"
  notes: text("notes"),
  imageUrl: text("image_url"), // health comparison photos
  recordedAt: timestamp("recorded_at").notNull().defaultNow(),
  userId: integer("user_id").references(() => users.id).notNull(),
});

export const plantHealthRecordSchema = createInsertSchema(plantHealthRecords);
export const insertPlantHealthRecordSchema = plantHealthRecordSchema
  .omit({ id: true, recordedAt: true })
  .extend({
    status: z.enum(["thriving", "struggling", "sick"]),
  });

export type PlantHealthRecord = typeof plantHealthRecords.$inferSelect;
export type InsertPlantHealthRecord = z.infer<typeof insertPlantHealthRecordSchema>;

// Care Activities - Enhanced tracking of all plant care activities
export const careActivities = pgTable("care_activities", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plants.id).notNull(),
  activityType: text("activity_type").notNull(), // "watering", "fertilizing", "repotting", "pruning", "misting", "rotating"
  notes: text("notes"),
  performedAt: timestamp("performed_at").notNull().defaultNow(),
  userId: integer("user_id").references(() => users.id).notNull(),
});

export const careActivitySchema = createInsertSchema(careActivities);
export const insertCareActivitySchema = careActivitySchema
  .omit({ id: true })
  .extend({
    performedAt: z.date().or(z.string().transform((val) => new Date(val))),
    activityType: z.enum(["watering", "fertilizing", "repotting", "pruning", "misting", "rotating"]),
  });

export type CareActivity = typeof careActivities.$inferSelect;
export type InsertCareActivity = z.infer<typeof insertCareActivitySchema>;

// Plant Journal Entries - Photo journal / "Plant Story" for tracking plant life over time
export const plantJournalEntries = pgTable("plant_journal_entries", {
  id: serial("id").primaryKey(),
  plantId: integer("plant_id").references(() => plants.id).notNull(),
  imageUrl: text("image_url").notNull(),
  caption: text("caption"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  userId: integer("user_id").references(() => users.id).notNull(),
});

export const plantJournalEntrySchema = createInsertSchema(plantJournalEntries);
export const insertPlantJournalEntrySchema = plantJournalEntrySchema
  .omit({ id: true, createdAt: true });

export type PlantJournalEntry = typeof plantJournalEntries.$inferSelect;
export type InsertPlantJournalEntry = z.infer<typeof insertPlantJournalEntrySchema>;
