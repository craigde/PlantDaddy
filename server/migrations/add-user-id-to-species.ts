import { pool } from "../db";

/**
 * Migration: Add userId column to plant_species table
 * This allows for user-specific custom species in addition to global species
 */
export async function addUserIdToSpecies() {
  const client = await pool.connect();

  try {
    console.log("🔄 Running migration: Add userId to plant_species...");

    // Check if column already exists
    const columnCheck = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'plant_species'
      AND column_name = 'user_id'
    `);

    if (columnCheck.rows.length > 0) {
      console.log("✅ Column user_id already exists in plant_species table");
      return { success: true, message: "Column already exists" };
    }

    // Add the userId column (nullable, references users table)
    await client.query(`
      ALTER TABLE plant_species
      ADD COLUMN user_id INTEGER REFERENCES users(id)
    `);

    console.log("✅ Successfully added user_id column to plant_species table");
    console.log("   - Global species will have user_id = NULL");
    console.log("   - User custom species will have user_id = <user_id>");

    return { success: true, message: "Migration completed successfully" };

  } catch (error) {
    console.error("❌ Error running migration:", error);
    throw error;
  } finally {
    client.release();
  }
}
