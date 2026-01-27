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
      password TEXT NOT NULL
    );

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
})();
