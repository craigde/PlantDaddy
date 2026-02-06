import { db } from '../db';
import { sql } from 'drizzle-orm';

/**
 * Migration: Add snoozed_until column to plants table
 * Allows users to snooze watering reminders until a specific date
 */
export async function addSnoozedUntilToPlants() {
  try {
    console.log("🔄 Running migration: Add snoozed_until to plants...");

    // Check if column exists
    const result = await db.execute(sql`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'plants' AND column_name = 'snoozed_until'
    `);

    if (result.rows.length === 0) {
      await db.execute(sql`
        ALTER TABLE plants ADD COLUMN snoozed_until TIMESTAMP
      `);
      console.log("✅ Added snoozed_until column to plants");
    } else {
      console.log("✅ snoozed_until column already exists in plants");
    }
  } catch (error) {
    console.error("❌ Migration failed (add-snoozed-until-to-plants):", error);
    throw error;
  }
}
