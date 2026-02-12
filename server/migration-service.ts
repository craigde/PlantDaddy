import { eq, isNotNull, and, count, sql } from "drizzle-orm";
import { db } from "./db";
import { careActivities, type InsertCareActivity } from "@shared/schema";
import { getCurrentUserId, requireAuth } from "./user-context";

export interface MigrationResults {
  migrated: number;
  skipped: number;
  errors: string[];
}

export interface MigrationStatus {
  needsMigration: boolean;
  wateringCount: number;
  migratedCount: number;
  unmigrated: number;
}

export class MigrationService {

  /**
   * Migrate existing watering history to care activities for the current user.
   * The watering_history table has been dropped, so this is a no-op now.
   */
  async migrateWateringHistoryToCareActivities(userId?: number): Promise<MigrationResults> {
    return { migrated: 0, skipped: 0, errors: [] };
  }

  /**
   * Check migration status for the current user.
   * The watering_history table has been dropped, so migration is complete.
   */
  async checkMigrationStatus(userId?: number): Promise<MigrationStatus> {
    return {
      needsMigration: false,
      wateringCount: 0,
      migratedCount: 0,
      unmigrated: 0
    };
  }

  /**
   * Migrate all users (admin operation).
   * The watering_history table has been dropped, so this is a no-op now.
   */
  async migrateAllUsers(): Promise<{ userResults: Record<number, MigrationResults>; totalMigrated: number }> {
    return { userResults: {}, totalMigrated: 0 };
  }

  /**
   * Rollback migration for the current user.
   * Only removes migrated care activities (those with originalWateringId).
   */
  async rollbackMigration(userId?: number): Promise<{ removed: number }> {
    const targetUserId = userId || requireAuth();

    try {
      const result = await db
        .delete(careActivities)
        .where(
          and(
            eq(careActivities.userId, targetUserId),
            isNotNull(careActivities.originalWateringId)
          )
        );

      const removed = result.rowCount || 0;
      console.log(`Rollback complete for user ${targetUserId}: ${removed} care activities removed`);

      return { removed };

    } catch (error) {
      console.error(`Rollback failed for user ${targetUserId}:`, error);
      return { removed: 0 };
    }
  }

  /**
   * Get migration summary for all users.
   * The watering_history table has been dropped, so returns empty.
   */
  async getMigrationSummary(): Promise<Array<{ userId: number; status: MigrationStatus }>> {
    return [];
  }
}

export const migrationService = new MigrationService();
