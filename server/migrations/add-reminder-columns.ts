import { pool } from "../db";

/**
 * Migration: Add reminder columns to notification_settings table
 * Adds reminder_time, reminder_days_before, and last_notified_date
 */
export async function addReminderColumnsToNotificationSettings() {
  const client = await pool.connect();

  try {
    console.log("🔄 Running migration: Add reminder columns to notification_settings...");

    const columns = [
      { name: "reminder_time", sql: "TEXT DEFAULT '08:00'" },
      { name: "reminder_days_before", sql: "INTEGER DEFAULT 0" },
      { name: "last_notified_date", sql: "TEXT" },
    ];

    let addedCount = 0;

    for (const col of columns) {
      const check = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'notification_settings'
        AND column_name = '${col.name}'
      `);

      if (check.rows.length === 0) {
        await client.query(`
          ALTER TABLE notification_settings
          ADD COLUMN ${col.name} ${col.sql}
        `);
        addedCount++;
        console.log(`  ✅ Added column ${col.name}`);
      }
    }

    if (addedCount === 0) {
      console.log("✅ All reminder columns already exist in notification_settings");
    } else {
      console.log(`✅ Added ${addedCount} column(s) to notification_settings`);
    }

    return { success: true, message: "Migration completed" };

  } catch (error) {
    console.error("❌ Error running migration:", error);
    throw error;
  } finally {
    client.release();
  }
}
