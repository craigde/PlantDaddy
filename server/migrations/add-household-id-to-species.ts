import { pool } from "../db";

/**
 * Migration: Add householdId column to plant_species table
 * This scopes custom species to households instead of individual users
 */
export async function addHouseholdIdToSpecies() {
  const client = await pool.connect();

  try {
    console.log("🔄 Running migration: Add householdId to plant_species...");

    // Check if column already exists
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'plant_species'
      AND column_name = 'household_id'
    `);

    if (columnCheck.rows.length > 0) {
      console.log("✅ Column household_id already exists in plant_species table");
      return { success: true, message: "Column already exists" };
    }

    // Add the householdId column (nullable, references households table)
    await client.query(`
      ALTER TABLE plant_species
      ADD COLUMN household_id INTEGER REFERENCES households(id)
    `);

    // Migrate existing user-specific species to their user's household
    await client.query(`
      UPDATE plant_species ps
      SET household_id = hm.household_id
      FROM household_members hm
      WHERE ps.user_id = hm.user_id
      AND ps.user_id IS NOT NULL
      AND ps.household_id IS NULL
    `);

    console.log("✅ Successfully added household_id column to plant_species table");
    console.log("   - Global species will have household_id = NULL");
    console.log("   - Existing user species migrated to their household");

    return { success: true, message: "Migration completed successfully" };

  } catch (error) {
    console.error("❌ Error running migration:", error);
    throw error;
  } finally {
    client.release();
  }
}
