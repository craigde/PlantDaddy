import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as DBUser } from "@shared/schema";
import connectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { verifyToken, extractTokenFromHeader } from "./jwt";

declare global {
  namespace Express {
    interface User extends DBUser {}
  }
}

const scryptAsync = promisify(scrypt);

export async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

export async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  // Initialize session store with PostgreSQL
  const PostgresStore = connectPgSimple(session);
  
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "PlantDaddySecret", // Should use a real secret in production
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: process.env.NODE_ENV === "production" // Use secure cookies in production
    },
    store: new PostgresStore({
      pool,
      tableName: "session",
      createTableIfMissing: true
    })
  };
  
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1); // Trust first proxy
  }
  
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        const isValidPassword = await comparePasswords(password, user.password);
        if (!isValidPassword) {
          return done(null, false, { message: "Invalid username or password" });
        }
        
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }),
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });
}

/**
 * JWT Authentication Middleware
 * Checks for JWT token in Authorization header and sets req.user if valid
 * Works alongside session authentication - if session auth succeeds, JWT is skipped
 */
export async function jwtAuthMiddleware(req: Request, res: Response, next: NextFunction) {
  // Skip if already authenticated via session
  if (req.isAuthenticated && req.isAuthenticated()) {
    return next();
  }

  // Extract token from Authorization header
  const token = extractTokenFromHeader(req.headers.authorization);
  if (!token) {
    return next();
  }

  // Verify token
  const payload = verifyToken(token);
  if (!payload) {
    return next();
  }

  // Load user from database
  try {
    const user = await storage.getUser(payload.userId);
    if (user) {
      // Set req.user like passport does
      req.user = user;
    }
  } catch (err) {
    // User not found or database error - continue without authentication
  }

  next();
}