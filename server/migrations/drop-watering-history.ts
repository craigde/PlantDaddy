import { pool } from "../db";

/**
 * Migration: Drop watering_history table
 * We've consolidated to care_activities system, so watering_history is no longer needed
 */
export async function dropWateringHistory() {
  const client = await pool.connect();

  try {
    console.log("🔄 Running migration: Drop watering_history table...");

    // Check if table exists
    const tableCheck = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      AND table_name = 'watering_history'
    `);

    if (tableCheck.rows.length === 0) {
      console.log("✅ Table watering_history does not exist. Skipping...");
      return { success: true, message: "Table does not exist" };
    }

    // Drop the table
    await client.query(`
      DROP TABLE IF EXISTS watering_history CASCADE
    `);

    console.log("✅ Successfully dropped watering_history table");
    console.log("   - All watering data is now tracked in care_activities table");

    return { success: true, message: "Migration completed successfully" };

  } catch (error) {
    console.error("❌ Error running migration:", error);
    throw error;
  } finally {
    client.release();
  }
}

// Allow running this migration directly
if (require.main === module) {
  dropWateringHistory()
    .then((result) => {
      console.log("Migration complete:", result);
      process.exit(0);
    })
    .catch((error) => {
      console.error("Migration failed:", error);
      process.exit(1);
    });
}
