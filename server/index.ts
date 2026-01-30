// PlantDaddy Server - Railway Deployment
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { startScheduler } from "./scheduler";
import { setUserContext } from "./user-context";
import { pool } from "./db";
import { seedPlantSpecies } from "./seed-species";
import { addUserIdToSpecies } from "./migrations/add-user-id-to-species";
import { dropWateringHistory } from "./migrations/drop-watering-history";
import { migrateHouseholds } from "./migrations/add-households";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// Serve static files from uploads directory
app.use("/uploads", express.static("uploads"));

// Auto-create database tables on startup
async function initializeDatabase() {
  log("Checking database tables...");
  
  const createTablesSQL = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      is_admin BOOLEAN DEFAULT false
    );
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false;

    CREATE TABLE IF NOT EXISTS session (
      sid VARCHAR NOT NULL PRIMARY KEY,
      sess JSON NOT NULL,
      expire TIMESTAMP(6) NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_session_expire ON session(expire);

    CREATE TABLE IF NOT EXISTS locations (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      is_default BOOLEAN DEFAULT false,
      user_id INTEGER NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS plants (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      species TEXT,
      location TEXT NOT NULL,
      watering_frequency INTEGER NOT NULL,
      last_watered TIMESTAMP NOT NULL,
      notes TEXT,
      image_url TEXT,
      user_id INTEGER NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS plant_species (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      scientific_name TEXT NOT NULL,
      family TEXT,
      origin TEXT,
      description TEXT NOT NULL,
      care_level TEXT NOT NULL,
      light_requirements TEXT NOT NULL,
      watering_frequency INTEGER NOT NULL,
      humidity TEXT,
      soil_type TEXT,
      propagation TEXT,
      toxicity TEXT,
      common_issues TEXT,
      image_url TEXT
    );

    CREATE TABLE IF NOT EXISTS notification_settings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL UNIQUE REFERENCES users(id),
      enabled BOOLEAN NOT NULL DEFAULT true,
      pushover_app_token TEXT,
      pushover_user_key TEXT,
      pushover_enabled BOOLEAN NOT NULL DEFAULT true,
      email_enabled BOOLEAN NOT NULL DEFAULT false,
      email_address TEXT,
      sendgrid_api_key TEXT,
      last_updated TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS households (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL,
      invite_code TEXT NOT NULL UNIQUE,
      created_by INTEGER NOT NULL REFERENCES users(id),
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS household_members (
      id SERIAL PRIMARY KEY,
      household_id INTEGER NOT NULL REFERENCES households(id),
      user_id INTEGER NOT NULL REFERENCES users(id),
      role TEXT NOT NULL DEFAULT 'member',
      joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
      UNIQUE(household_id, user_id)
    );

    ALTER TABLE plants ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);
    ALTER TABLE locations ADD COLUMN IF NOT EXISTS household_id INTEGER REFERENCES households(id);

    CREATE TABLE IF NOT EXISTS device_tokens (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id),
      token TEXT NOT NULL UNIQUE,
      environment TEXT NOT NULL DEFAULT 'production',
      created_at TIMESTAMP NOT NULL DEFAULT NOW(),
      last_used TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS plant_health_records (
      id SERIAL PRIMARY KEY,
      plant_id INTEGER NOT NULL REFERENCES plants(id),
      status TEXT NOT NULL,
      notes TEXT,
      image_url TEXT,
      recorded_at TIMESTAMP NOT NULL DEFAULT NOW(),
      user_id INTEGER NOT NULL REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS care_activities (
      id SERIAL PRIMARY KEY,
      plant_id INTEGER NOT NULL REFERENCES plants(id),
      activity_type TEXT NOT NULL,
      notes TEXT,
      performed_at TIMESTAMP NOT NULL DEFAULT NOW(),
      user_id INTEGER NOT NULL REFERENCES users(id)
    );
  `;

  try {
    await pool.query(createTablesSQL);
    log("Database tables ready!");
  } catch (error) {
    log(`Database initialization error: ${error}`);
    throw error;
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Initialize database tables before starting
  await initializeDatabase();

  // Run migrations
  await addUserIdToSpecies();
  await dropWateringHistory();
  await migrateHouseholds();

  // Ensure admin user is set
  try {
    const result = await pool.query(
      `UPDATE users SET is_admin = true WHERE username = 'craigde' AND (is_admin IS NULL OR is_admin = false) RETURNING username`
    );
    if (result.rowCount && result.rowCount > 0) {
      log("Admin privileges granted to craigde");
    }
  } catch (error) {
    log(`Admin setup note: ${error}`);
  }

  // Seed default plant species (global, userId = null)
  await seedPlantSpecies();

  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Use PORT from environment (Railway sets this) or default to 5000
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);

    // Start plant notification scheduler
    startScheduler();
  });

  // Graceful shutdown on SIGTERM (Railway sends this during redeploys)
  process.on("SIGTERM", () => {
    log("SIGTERM received, shutting down gracefully...");
    server.close(() => {
      pool.end().then(() => process.exit(0));
    });
  });
})();
