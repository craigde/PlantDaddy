import { pool } from "../db";
import crypto from "crypto";

/**
 * Generate a random 8-character invite code using unambiguous characters
 */
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // No 0/O, 1/I/L
  let code = "";
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

/**
 * Migration: Create households for existing users and assign their plants/locations
 *
 * For each user who has plants but no household:
 * 1. Create a household named "{username}'s Home"
 * 2. Make the user the owner
 * 3. Set householdId on their plants and locations
 */
export async function migrateHouseholds() {
  const client = await pool.connect();

  try {
    console.log("Running migration: Assign households to existing users...");

    // Check if any households exist already (migration already ran)
    const householdCheck = await client.query("SELECT COUNT(*) FROM households");
    const existingCount = parseInt(householdCheck.rows[0].count);

    // Find users who have plants but no household membership
    const usersWithoutHousehold = await client.query(`
      SELECT DISTINCT u.id, u.username
      FROM users u
      LEFT JOIN household_members hm ON hm.user_id = u.id
      WHERE hm.id IS NULL
    `);

    if (usersWithoutHousehold.rows.length === 0) {
      if (existingCount > 0) {
        console.log("All users already have households");
      } else {
        console.log("No users found to migrate (new install)");
      }
      return;
    }

    console.log(`Creating households for ${usersWithoutHousehold.rows.length} user(s)...`);

    for (const user of usersWithoutHousehold.rows) {
      // Generate a unique invite code
      let inviteCode: string;
      let attempts = 0;
      while (true) {
        inviteCode = generateInviteCode();
        const existing = await client.query(
          "SELECT id FROM households WHERE invite_code = $1",
          [inviteCode]
        );
        if (existing.rows.length === 0) break;
        attempts++;
        if (attempts > 10) throw new Error("Failed to generate unique invite code");
      }

      // Create household
      const householdResult = await client.query(
        `INSERT INTO households (name, invite_code, created_by)
         VALUES ($1, $2, $3) RETURNING id`,
        [`${user.username}'s Home`, inviteCode, user.id]
      );
      const householdId = householdResult.rows[0].id;

      // Add user as owner
      await client.query(
        `INSERT INTO household_members (household_id, user_id, role)
         VALUES ($1, $2, 'owner')`,
        [householdId, user.id]
      );

      // Update their plants
      await client.query(
        "UPDATE plants SET household_id = $1 WHERE user_id = $2 AND household_id IS NULL",
        [householdId, user.id]
      );

      // Update their locations
      await client.query(
        "UPDATE locations SET household_id = $1 WHERE user_id = $2 AND household_id IS NULL",
        [householdId, user.id]
      );

      console.log(`  Created household "${user.username}'s Home" for user ${user.username}`);
    }

    console.log("Household migration complete");
  } catch (error) {
    console.error("Error running household migration:", error);
    throw error;
  } finally {
    client.release();
  }
}
