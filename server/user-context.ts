import { AsyncLocalStorage } from 'async_hooks';

interface UserContext {
  userId: number | null;
}

// Create AsyncLocalStorage instance to store the current user's context
export const userContextStorage = new AsyncLocalStorage<UserContext>();

// Middleware to set user context from the session
export function setUserContext(req: any, res: any, next: any) {
  try {
    // Default to null for unauthenticated users
    const userId = req.isAuthenticated() ? req.user?.id || null : null;
    
    // Store user context
    userContextStorage.run({ userId }, () => {
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