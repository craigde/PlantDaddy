import { eq, isNotNull, and, count, sql } from "drizzle-orm";
import { db } from "./db";
import { wateringHistory, careActivities, type InsertCareActivity } from "@shared/schema";
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
   * Migrate existing watering history to care activities for the current user
   * Uses ON CONFLICT DO NOTHING for idempotency and handles FK violations gracefully
   */
  async migrateWateringHistoryToCareActivities(userId?: number): Promise<MigrationResults> {
    const targetUserId = userId || requireAuth();
    
    const results: MigrationResults = {
      migrated: 0,
      skipped: 0,
      errors: []
    };
    
    try {
      console.log(`Starting migration of watering history for user ${targetUserId}...`);
      
      // Get watering history records that have valid plant references
      // Pre-filter to avoid FK violations from orphaned plant_id values
      const userWateringHistory = await db
        .select({
          id: wateringHistory.id,
          plantId: wateringHistory.plantId,
          userId: wateringHistory.userId,
          wateredAt: wateringHistory.wateredAt
        })
        .from(wateringHistory)
        .innerJoin(
          sql`(SELECT id FROM plants WHERE user_id = ${targetUserId}) valid_plants`,
          sql`valid_plants.id = ${wateringHistory.plantId}`
        )
        .where(eq(wateringHistory.userId, targetUserId))
        .orderBy(wateringHistory.wateredAt);
      
      console.log(`Found ${userWateringHistory.length} valid watering history records for user ${targetUserId}`);
      
      // Process each record individually - no transaction wrapper needed
      // ON CONFLICT ensures idempotency, and individual failures won't affect others
      for (const watering of userWateringHistory) {
        try {
          const careActivity: InsertCareActivity = {
            plantId: watering.plantId,
            userId: watering.userId,
            activityType: 'watering',
            performedAt: watering.wateredAt,
            notes: null,
            originalWateringId: watering.id
          };
          
          const insertResult = await db
            .insert(careActivities)
            .values(careActivity)
            .onConflictDoNothing({ target: careActivities.originalWateringId })
            .returning({ id: careActivities.id });
          
          if (insertResult.length > 0) {
            results.migrated++;
          } else {
            results.skipped++;
          }
          
        } catch (error) {
          const errorMsg = `Failed to migrate watering record ${watering.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          results.errors.push(errorMsg);
          console.error(errorMsg);
        }
      }
      
      console.log(`Migration complete for user ${targetUserId}: ${results.migrated} migrated, ${results.skipped} skipped, ${results.errors.length} errors`);
      
    } catch (error) {
      const errorMsg = `Migration failed for user ${targetUserId}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      results.errors.push(errorMsg);
      console.error(errorMsg);
    }
    
    return results;
  }
  
  /**
   * Check migration status for the current user
   * Returns accurate counts using database aggregates
   */
  async checkMigrationStatus(userId?: number): Promise<MigrationStatus> {
    const targetUserId = userId || getCurrentUserId();
    
    if (targetUserId === null) {
      return {
        needsMigration: false,
        wateringCount: 0,
        migratedCount: 0,
        unmigrated: 0
      };
    }
    
    try {
      // Get watering history count for user
      const [wateringCountResult] = await db
        .select({ count: count() })
        .from(wateringHistory)
        .where(eq(wateringHistory.userId, targetUserId));
      
      // Get migrated care activities count for user (those with originalWateringId)
      const [migratedCountResult] = await db
        .select({ count: count() })
        .from(careActivities)
        .where(
          and(
            eq(careActivities.userId, targetUserId),
            isNotNull(careActivities.originalWateringId)
          )
        );
      
      const wateringCount = wateringCountResult.count;
      const migratedCount = migratedCountResult.count;
      const unmigrated = wateringCount - migratedCount;
      
      return {
        needsMigration: unmigrated > 0,
        wateringCount,
        migratedCount,
        unmigrated
      };
      
    } catch (error) {
      console.error(`Failed to check migration status for user ${targetUserId}:`, error);
      return {
        needsMigration: false,
        wateringCount: 0,
        migratedCount: 0,
        unmigrated: 0
      };
    }
  }
  
  /**
   * Migrate all users (admin operation)
   * Only use for bulk migration during system upgrade
   */
  async migrateAllUsers(): Promise<{ userResults: Record<number, MigrationResults>; totalMigrated: number }> {
    const userResults: Record<number, MigrationResults> = {};
    let totalMigrated = 0;
    
    try {
      // Get all unique user IDs from watering history
      const uniqueUsers = await db
        .selectDistinct({ userId: wateringHistory.userId })
        .from(wateringHistory);
      
      console.log(`Starting migration for ${uniqueUsers.length} users...`);
      
      for (const user of uniqueUsers) {
        const results = await this.migrateWateringHistoryToCareActivities(user.userId);
        userResults[user.userId] = results;
        totalMigrated += results.migrated;
      }
      
      console.log(`Bulk migration complete: ${totalMigrated} total records migrated across ${uniqueUsers.length} users`);
      
    } catch (error) {
      console.error('Bulk migration failed:', error);
    }
    
    return { userResults, totalMigrated };
  }
  
  /**
   * Rollback migration for the current user
   * Only removes migrated care activities (those with originalWateringId)
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
   * Get migration summary for all users (admin operation)
   */
  async getMigrationSummary(): Promise<Array<{ userId: number; status: MigrationStatus }>> {
    try {
      const uniqueUsers = await db
        .selectDistinct({ userId: wateringHistory.userId })
        .from(wateringHistory);
      
      const summary = [];
      for (const user of uniqueUsers) {
        const status = await this.checkMigrationStatus(user.userId);
        summary.push({ userId: user.userId, status });
      }
      
      return summary;
      
    } catch (error) {
      console.error('Failed to get migration summary:', error);
      return [];
    }
  }
}

export const migrationService = new MigrationService();