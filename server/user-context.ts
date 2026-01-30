import { AsyncLocalStorage } from 'async_hooks';
import { db } from './db';
import { householdMembers } from '@shared/schema';
import { eq, and } from 'drizzle-orm';

interface UserContext {
  userId: number | null;
  householdId: number | null;
  householdResolved: boolean;
  requestedHouseholdId: number | null; // from X-Household-Id header
}

// Create AsyncLocalStorage instance to store the current user's context
export const userContextStorage = new AsyncLocalStorage<UserContext>();

// Middleware to set user context from the session or JWT
export function setUserContext(req: any, res: any, next: any) {
  try {
    // Support both session-based auth (req.isAuthenticated()) and JWT auth (req.user set by JWT middleware)
    const userId = req.isAuthenticated?.()
      ? req.user?.id || null
      : req.user?.id || null;

    // Read optional household header
    const headerVal = req.headers['x-household-id'];
    const parsed = headerVal ? parseInt(headerVal as string, 10) : null;
    const requestedHouseholdId = (parsed !== null && !isNaN(parsed)) ? parsed : null;

    // Store user context with lazy household resolution
    userContextStorage.run({
      userId,
      householdId: null,
      householdResolved: false,
      requestedHouseholdId,
    }, () => {
      next();
    });
  } catch (error) {
    console.error("Error in user context middleware:", error);
    next();
  }
}

// Helper to get the current user's ID
export function getCurrentUserId(): number | null {
  const context = userContextStorage.getStore();
  return context?.userId || null;
}

// Throw an error if no user is authenticated
export function requireAuth(): number {
  const userId = getCurrentUserId();
  if (userId === null) {
    throw new Error('Authentication required');
  }
  return userId;
}

/**
 * Get the active household ID for the current request.
 * Lazy-resolves from X-Household-Id header or defaults to user's first household.
 * Validates that the user is a member of the household.
 */
export async function getHouseholdId(): Promise<number | null> {
  const context = userContextStorage.getStore();
  if (!context || !context.userId) return null;

  // Return cached result if already resolved
  if (context.householdResolved) {
    return context.householdId;
  }

  let householdId: number | null = null;

  if (context.requestedHouseholdId) {
    // Validate user is a member of the requested household
    const [membership] = await db
      .select()
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, context.requestedHouseholdId),
          eq(householdMembers.userId, context.userId)
        )
      );

    if (membership) {
      householdId = context.requestedHouseholdId;
    }
  }

  if (!householdId) {
    // Default: use user's first household (the one created on registration)
    const [firstMembership] = await db
      .select()
      .from(householdMembers)
      .where(eq(householdMembers.userId, context.userId));

    if (firstMembership) {
      householdId = firstMembership.householdId;
    }
  }

  // Cache the result for this request
  context.householdId = householdId;
  context.householdResolved = true;

  return householdId;
}

/**
 * Get the current user's role in the active household.
 * Returns null if not in a household.
 */
export async function getHouseholdRole(): Promise<string | null> {
  const context = userContextStorage.getStore();
  if (!context || !context.userId) return null;

  const householdId = await getHouseholdId();
  if (!householdId) return null;

  const [membership] = await db
    .select()
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.userId, context.userId)
      )
    );

  return membership?.role || null;
}
