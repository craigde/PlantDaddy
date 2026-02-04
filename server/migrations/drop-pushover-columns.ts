import { pool } from "../db";

/**
 * Migration: Drop Pushover columns from notification_settings table
 * Pushover has been replaced by native APNs push notifications
 */
export async function dropPushoverColumns() {
  const client = await pool.connect();

  try {
    console.log("🔄 Running migration: Drop Pushover columns from notification_settings...");

    const columns = ["pushover_app_token", "pushover_user_key", "pushover_enabled"];
    let droppedCount = 0;

    for (const col of columns) {
      const check = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'notification_settings'
        AND column_name = '${col}'
      `);

      if (check.rows.length > 0) {
        await client.query(`
          ALTER TABLE notification_settings
          DROP COLUMN ${col}
        `);
        droppedCount++;
        console.log(`  ✅ Dropped column ${col}`);
      }
    }

    if (droppedCount === 0) {
      console.log("✅ Pushover columns already removed from notification_settings");
    } else {
      console.log(`✅ Dropped ${droppedCount} Pushover column(s) from notification_settings`);
    }

    return { success: true, message: "Migration completed" };

  } catch (error) {
    console.error("❌ Error running migration:", error);
    throw error;
  } finally {
    client.release();
  }
}
