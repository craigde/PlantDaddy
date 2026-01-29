import express, { type Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage as dbStorage } from "./multi-user-storage";
import { z } from "zod";
import { insertPlantSchema, insertLocationSchema, insertPlantSpeciesSchema, insertNotificationSettingsSchema, insertUserSchema, insertPlantHealthRecordSchema, insertCareActivitySchema } from "@shared/schema";
import multer from "multer";
import path from "path";
import fs from "fs";
import { sendPlantWateringNotification, sendWelcomeNotification, checkPlantsAndSendNotifications, sendPushoverNotification, sendTestNotification } from "./notifications";
import { setupAuth, hashPassword, jwtAuthMiddleware, comparePasswords } from "./auth";
import passport from "passport";
import { setUserContext, getCurrentUserId, userContextStorage } from "./user-context";
import { generateToken } from "./jwt";
// R2 Storage integration for secure, persistent plant image uploads
import { R2StorageService, isR2Configured } from "./r2Storage";
import { ExportService } from "./export-service";
import { ImportService } from "./import-service";

// Middleware to check if user is authenticated (via session or JWT)
function isAuthenticated(req: Request, res: Response, next: NextFunction) {
  // Check session auth (passport) or JWT auth (req.user set by jwtAuthMiddleware)
  if (req.isAuthenticated?.() || req.user) {
    return next();
  }
  res.status(401).json({ error: "You must be logged in to access this resource" });
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication
  setupAuth(app);

  // Add JWT authentication middleware (runs after session auth)
  app.use(jwtAuthMiddleware);

  // Configure multer for file uploads
  const fileStorage = multer.diskStorage({
    destination: function (req, file, cb) {
      // Ensure uploads directory exists
      const uploadDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      // Create unique filename with timestamp and original extension
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, 'plant-' + uniqueSuffix + ext);
    }
  });
  
  const upload = multer({ 
    storage: fileStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
    fileFilter: function(req, file, cb) {
      // Accept only image files
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'));
      }
      cb(null, true);
    }
  });

  // Configure multer for ZIP file imports (in-memory storage)
  const importUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit for backup ZIPs (security hardened)
    fileFilter: function(req, file, cb) {
      // Accept ZIP files for backups
      if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
        cb(null, true);
      } else {
        cb(new Error('Only ZIP files are allowed for imports'), false);
      }
    }
  });

  // Configure multer for R2 uploads (in-memory storage required for buffer access)
  const r2Upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB file size limit
    fileFilter: function(req, file, cb) {
      // Accept only image files
      if (!file.mimetype.startsWith('image/')) {
        return cb(new Error('Only image files are allowed'));
      }
      cb(null, true);
    }
  });

  // Serve uploaded files statically
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));
  
  const apiRouter = express.Router();

  // Authentication routes
  apiRouter.post("/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await dbStorage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      // Hash password
      const hashedPassword = await hashPassword(userData.password);
      
      // Create new user
      const user = await dbStorage.createUser({
        ...userData,
        password: hashedPassword
      });
      
      // Log the user in
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Post-registration login error:", loginErr);
          return res.status(500).json({ 
            error: "Failed to log in after registration",
            details: loginErr.message
          });
        }
        
        // Return consistent user data format
        return res.status(201).json({
          id: user.id,
          username: user.username,
          // Add any other non-sensitive user data here
        });
      });
    } catch (error) {
      console.error("Registration error:", error);
      
      // Check for specific error types and provide more helpful messages
      const errorMessage = error instanceof Error ? error.message : "Invalid registration data";
      
      if (errorMessage.includes("already exists")) {
        return res.status(409).json({ error: "Username already exists" });
      }
      
      // Generic error case
      res.status(400).json({ 
        error: "Registration failed",
        details: errorMessage
      });
    }
  });
  
  apiRouter.post("/login", (req: Request, res: Response, next: NextFunction) => {
    passport.authenticate("local", (err, user, info) => {
      if (err) {
        console.error("Login error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      
      if (!user) {
        return res.status(401).json({ 
          error: info?.message || "Invalid username or password" 
        });
      }
      
      req.login(user, (loginErr) => {
        if (loginErr) {
          console.error("Login session error:", loginErr);
          return res.status(500).json({ error: "Failed to create session" });
        }
        
        // Return consistent user data format
        return res.status(200).json({
          id: user.id,
          username: user.username,
          // Add any other non-sensitive user data here
        });
      });
    })(req, res, next);
  });
  
  apiRouter.post("/logout", (req: Request, res: Response) => {
    // First check if user is logged in
    if (!req.isAuthenticated()) {
      // Still return a success response, just with a different message
      return res.status(200).json({ 
        success: true,
        message: "Already logged out" 
      });
    }
    
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ 
          error: "Failed to log out",
          details: err.message
        });
      }
      
      // Return consistent response format
      res.status(200).json({
        success: true,
        message: "Logged out successfully"
      });
    });
  });
  
  apiRouter.get("/user", (req: Request, res: Response) => {
    // Support both session and JWT auth
    if (!req.isAuthenticated?.() && !req.user) {
      return res.status(401).json({ error: "Not authenticated" });
    }
    const user = req.user as Express.User;
    return res.json({
      id: user.id,
      username: user.username
    });
  });

  // JWT Authentication endpoints for mobile apps

  // JWT Login - Returns a token instead of creating a session
  apiRouter.post("/token-login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Verify user credentials
      const user = await dbStorage.getUserByUsername(username);
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      const isValidPassword = await comparePasswords(password, user.password);
      if (!isValidPassword) {
        return res.status(401).json({ error: "Invalid username or password" });
      }

      // Generate JWT token
      const token = generateToken(user);

      // Return token and user info
      return res.status(200).json({
        token,
        user: {
          id: user.id,
          username: user.username,
        }
      });
    } catch (error) {
      console.error("JWT login error:", error);
      return res.status(500).json({ error: "Internal server error" });
    }
  });

  // JWT Register - Creates user and returns a token
  apiRouter.post("/token-register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await dbStorage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(userData.password);

      // Create new user
      const user = await dbStorage.createUser({
        ...userData,
        password: hashedPassword
      });

      // Generate JWT token
      const token = generateToken(user);

      // Return token and user info
      return res.status(201).json({
        token,
        user: {
          id: user.id,
          username: user.username,
        }
      });
    } catch (error) {
      console.error("JWT registration error:", error);

      const errorMessage = error instanceof Error ? error.message : "Invalid registration data";

      if (errorMessage.includes("already exists")) {
        return res.status(409).json({ error: "Username already exists" });
      }

      return res.status(400).json({
        error: "Registration failed",
        details: errorMessage
      });
    }
  });

  // Get all plants
  apiRouter.get("/plants", async (req: Request, res: Response) => {
    try {
      const plants = await dbStorage.getAllPlants();
      res.json(plants);
    } catch (error) {
      res.status(500).json({ success: false, message: "Failed to fetch plants" });
    }
  });

  // Get a specific plant
  apiRouter.get("/plants/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      const plant = await dbStorage.getPlant(id);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      res.json(plant);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plant details" });
    }
  });

  // Create a new plant
  apiRouter.post("/plants", async (req: Request, res: Response) => {
    try {
      console.log("Received plant creation request with data:", req.body);
      
      // Convert lastWatered string to Date if needed
      let data = {...req.body};
      
      // Add userId from authenticated user session
      if (req.isAuthenticated() && req.user) {
        data.userId = req.user.id;
        console.log("Adding authenticated userId to plant data:", req.user.id);
      } else {
        console.error("User not authenticated for plant creation");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Handle date conversion issue for lastWatered
      if (data.lastWatered) {
        try {
          // Handle different date formats safely
          if (typeof data.lastWatered === 'string') {
            data.lastWatered = new Date(data.lastWatered);
          } else if (data.lastWatered instanceof Date) {
            // Already a Date object, ensure it's valid
            if (isNaN(data.lastWatered.getTime())) {
              throw new Error('Invalid date object');
            }
          } else if (data.lastWatered && typeof data.lastWatered === 'object') {
            // Handle potential serialized date objects
            data.lastWatered = new Date(data.lastWatered);
          }
          
          console.log("Converted lastWatered to:", data.lastWatered);
        } catch (e) {
          console.error("Date conversion error:", e, data.lastWatered);
          return res.status(400).json({ 
            message: "Invalid date format for lastWatered", 
          });
        }
      } else {
        // Default to current date if missing
        data.lastWatered = new Date();
        console.log("Using default lastWatered:", data.lastWatered);
      }
      
      // Ensure we have an imageUrl if specified
      if (data.imageUrl) {
        console.log("Using image URL:", data.imageUrl);
      }
      
      const parsedData = insertPlantSchema.safeParse(data);
      
      if (!parsedData.success) {
        console.error("Validation errors:", parsedData.error.format());
        return res.status(400).json({ 
          message: "Invalid plant data", 
          errors: parsedData.error.format()
        });
      }

      const newPlant = await dbStorage.createPlant(parsedData.data);
      console.log("Plant created successfully:", newPlant);
      res.status(201).json(newPlant);
    } catch (error) {
      console.error("Server error creating plant:", error);
      res.status(500).json({ message: "Failed to create plant" });
    }
  });

  // Update a plant
  apiRouter.patch("/plants/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      console.log("Received plant update request for ID:", id, "with data:", req.body);
      
      // Convert lastWatered string to Date if needed
      let data = {...req.body};
      
      // Add userId from authenticated user session if needed for validation
      if (req.isAuthenticated() && req.user && !data.userId) {
        data.userId = req.user.id;
        console.log("Adding authenticated userId to plant update data:", req.user.id);
      } else if (!req.isAuthenticated()) {
        console.error("User not authenticated for plant update");
        return res.status(401).json({ message: "Not authenticated" });
      }
      
      // Handle date conversion issue for lastWatered
      if (data.lastWatered) {
        try {
          // Handle different date formats safely
          if (typeof data.lastWatered === 'string') {
            data.lastWatered = new Date(data.lastWatered);
          } else if (data.lastWatered instanceof Date) {
            // Already a Date object, ensure it's valid
            if (isNaN(data.lastWatered.getTime())) {
              throw new Error('Invalid date object');
            }
          } else if (data.lastWatered && typeof data.lastWatered === 'object') {
            // Handle potential serialized date objects
            data.lastWatered = new Date(data.lastWatered);
          }
          
          console.log("Converted lastWatered to:", data.lastWatered);
        } catch (e) {
          console.error("Date conversion error:", e, data.lastWatered);
          return res.status(400).json({ 
            message: "Invalid date format for lastWatered", 
          });
        }
      }

      // Validate the update data
      const updateSchema = insertPlantSchema.partial();
      const parsedData = updateSchema.safeParse(data);
      
      if (!parsedData.success) {
        console.error("Validation errors:", parsedData.error.format());
        return res.status(400).json({ 
          message: "Invalid plant data", 
          errors: parsedData.error.format()
        });
      }

      const updatedPlant = await dbStorage.updatePlant(id, parsedData.data);
      if (!updatedPlant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      console.log("Plant updated successfully:", updatedPlant);
      res.json(updatedPlant);
    } catch (error) {
      console.error("Server error updating plant:", error);
      res.status(500).json({ message: "Failed to update plant" });
    }
  });

  // Delete a plant
  apiRouter.delete("/plants/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      // Collect image URLs to clean up before deleting DB records
      const plant = await dbStorage.getPlant(id);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      const localImagesToDelete: string[] = [];
      const r2KeysToDelete: string[] = [];

      // Categorize plant image
      if (plant.imageUrl) {
        if (plant.imageUrl.startsWith('/r2/')) {
          r2KeysToDelete.push(plant.imageUrl.slice(4));
        } else if (plant.imageUrl.startsWith('/uploads/plant-')) {
          localImagesToDelete.push(plant.imageUrl);
        }
      }

      // Collect health record images
      const healthRecords = await dbStorage.getPlantHealthRecords(id);
      for (const record of healthRecords) {
        if (record.imageUrl) {
          if (record.imageUrl.startsWith('/r2/')) {
            r2KeysToDelete.push(record.imageUrl.slice(4));
          } else if (record.imageUrl.startsWith('/uploads/plant-')) {
            localImagesToDelete.push(record.imageUrl);
          }
        }
      }

      const deleted = await dbStorage.deletePlant(id);
      if (!deleted) {
        return res.status(404).json({ message: "Plant not found" });
      }

      // Clean up local image files (fire-and-forget)
      for (const imageUrl of localImagesToDelete) {
        fs.unlink(path.join(process.cwd(), imageUrl), () => {});
      }

      // Clean up R2 images (fire-and-forget)
      if (r2KeysToDelete.length > 0 && isR2Configured()) {
        const r2Service = new R2StorageService();
        for (const key of r2KeysToDelete) {
          r2Service.deleteObject(key).catch(err =>
            console.error("Failed to delete R2 object:", key, err)
          );
        }
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete plant" });
    }
  });

  // Water a plant
  apiRouter.post("/plants/:id/water", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      // Create care activity for watering
      const careActivity = await dbStorage.createCareActivity({
        plantId: id,
        activityType: 'watering',
        notes: req.body.notes || null,
        performedAt: new Date(),
      });

      // Also update the plant's lastWatered field
      await dbStorage.updatePlant(id, {
        lastWatered: new Date(),
      });

      const updatedPlant = await dbStorage.getPlant(id);

      // Send a confirmation notification via Pushover
      const notificationTitle = "🪴 PlantDaddy: Plant Watered";
      const notificationMessage = `${updatedPlant?.name} has been watered successfully.`;

      // We don't need to await this, it can happen in the background
      sendPushoverNotification(notificationTitle, notificationMessage, 0)
        .catch((err: Error) => console.error("Failed to send watering confirmation notification:", err));

      res.json({
        success: true,
        careActivity: careActivity,
        plant: updatedPlant
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to water plant" });
    }
  });

  // Get all locations
  apiRouter.get("/locations", async (req: Request, res: Response) => {
    try {
      const locations = await dbStorage.getAllLocations();
      res.json(locations);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch locations" });
    }
  });

  // Create a new location
  apiRouter.post("/locations", async (req: Request, res: Response) => {
    try {
      // Get the current user ID from the session
      const userId = getCurrentUserId();
      if (!userId) {
        return res.status(401).json({ error: "You must be logged in to create a location" });
      }
      
      // Add the userId to the request body
      const locationData = {
        ...req.body,
        userId
      };
      
      const parsedData = insertLocationSchema.safeParse(locationData);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid location data", 
          errors: parsedData.error.format()
        });
      }

      const newLocation = await dbStorage.createLocation(parsedData.data);
      res.status(201).json(newLocation);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create location";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Update a location
  apiRouter.patch("/locations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      // Validate the update data
      const updateSchema = insertLocationSchema.partial();
      const parsedData = updateSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid location data", 
          errors: parsedData.error.format()
        });
      }

      const updatedLocation = await dbStorage.updateLocation(id, parsedData.data);
      if (!updatedLocation) {
        return res.status(404).json({ message: "Location not found" });
      }

      res.json(updatedLocation);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update location";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Delete a location
  apiRouter.delete("/locations/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid location ID" });
      }

      const deleted = await dbStorage.deleteLocation(id);
      res.json({ success: true });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete location";
      res.status(400).json({ message: errorMessage });
    }
  });

  // General image upload (for health records, etc.)
  // Returns the uploaded file URL without attaching it to any entity.
  apiRouter.post("/upload-image", isAuthenticated, upload.single('image'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image file provided" });
      }
      const imageUrl = `/uploads/${req.file.filename}`;
      res.json({ success: true, imageUrl });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to upload image";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Direct image upload for plant photos
  // Note: multer's async multipart parsing can break AsyncLocalStorage context,
  // so we re-establish it from req.user before calling storage methods.
  apiRouter.post("/plants/:id/image", isAuthenticated, upload.single('image'), async (req: Request, res: Response) => {
    const userId = (req.user as any)?.id ?? null;
    await userContextStorage.run({ userId }, async () => {
      try {
        const id = parseInt(req.params.id);
        if (isNaN(id)) {
          return res.status(400).json({ message: "Invalid plant ID" });
        }

        const plant = await dbStorage.getPlant(id);
        if (!plant) {
          return res.status(404).json({ message: "Plant not found" });
        }

        if (!req.file) {
          return res.status(400).json({ message: "No image file provided" });
        }

        // Delete the old image file if it exists and is a user upload (not a species image)
        if (plant.imageUrl && plant.imageUrl.startsWith('/uploads/plant-')) {
          const oldPath = path.join(process.cwd(), plant.imageUrl);
          fs.unlink(oldPath, () => {}); // fire-and-forget, ignore errors
        }

        const imageUrl = `/uploads/${req.file.filename}`;
        const updatedPlant = await dbStorage.updatePlant(id, { imageUrl });

        res.json({
          success: true,
          imageUrl,
          plant: updatedPlant
        });
      } catch (error: any) {
        const errorMessage = error?.message || "Failed to upload image";
        res.status(400).json({ message: errorMessage });
      }
    });
  });

  // Delete plant image (revert to species default)
  apiRouter.delete("/plants/:id/image", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      const plant = await dbStorage.getPlant(id);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      // Delete the image file if it exists
      if (plant.imageUrl) {
        // Handle R2 images
        if (plant.imageUrl.startsWith('/r2/') && isR2Configured()) {
          try {
            const r2Service = new R2StorageService();
            const key = r2Service.extractKeyFromUrl(plant.imageUrl);
            if (key) {
              await r2Service.deleteObject(key);
            }
          } catch (err) {
            console.error("Failed to delete R2 image:", err);
          }
        }
        // Handle local uploads
        else if (plant.imageUrl.startsWith('/uploads/plant-')) {
          const filePath = path.join(process.cwd(), plant.imageUrl);
          fs.unlink(filePath, () => {});
        }
      }

      // Clear the imageUrl on the plant
      const updatedPlant = await dbStorage.updatePlant(id, { imageUrl: null });
      res.json({ success: true, plant: updatedPlant });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete image";
      res.status(500).json({ message: errorMessage });
    }
  });

  // R2 Storage endpoints

  // Upload image to R2 via server (avoids CORS issues with presigned URLs)
  // Note: multer's async multipart parsing can break AsyncLocalStorage context,
  // so we get userId directly from req.user instead of getCurrentUserId()
  apiRouter.post("/r2/upload", isAuthenticated, r2Upload.single('image'), async (req: Request, res: Response) => {
    console.log("[R2 Upload] Request received");

    try {
      // Check R2 configuration
      if (!isR2Configured()) {
        console.log("[R2 Upload] R2 not configured");
        return res.status(503).json({ message: "R2 storage is not configured" });
      }
      console.log("[R2 Upload] R2 is configured");

      // Get user ID directly from req.user (multer breaks AsyncLocalStorage context)
      const userId = (req.user as any)?.id ?? null;
      if (!userId) {
        console.log("[R2 Upload] User not authenticated, req.user:", req.user);
        return res.status(401).json({ message: "User not authenticated" });
      }
      console.log("[R2 Upload] User authenticated:", userId);

      // Check file was uploaded
      if (!req.file) {
        console.log("[R2 Upload] No file in request");
        return res.status(400).json({ message: "No image file provided" });
      }
      console.log("[R2 Upload] File received:", {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer,
        bufferLength: req.file.buffer?.length
      });

      const plantId = req.body.plantId ? parseInt(req.body.plantId) : undefined;
      console.log("[R2 Upload] PlantId:", plantId);

      const r2Service = new R2StorageService();

      // Upload file to R2
      console.log("[R2 Upload] Uploading to R2...");
      const key = await r2Service.uploadFile(
        userId,
        req.file.buffer,
        req.file.mimetype,
        plantId
      );
      console.log("[R2 Upload] Upload successful, key:", key);

      const imageUrl = r2Service.keyToInternalUrl(key);
      console.log("[R2 Upload] Image URL:", imageUrl);

      // If plantId was provided, update the plant's imageUrl in the database
      let updatedPlant = null;
      if (plantId) {
        console.log("[R2 Upload] Updating plant", plantId, "with imageUrl");
        // Use userContextStorage to ensure proper user context for the update
        updatedPlant = await userContextStorage.run({ userId }, async () => {
          return await dbStorage.updatePlant(plantId, { imageUrl });
        });
        console.log("[R2 Upload] Plant updated successfully");
      }

      res.json({
        success: true,
        imageUrl,
        key,
        plant: updatedPlant
      });
    } catch (error: any) {
      console.error("[R2 Upload] Failed:", error);
      console.error("[R2 Upload] Error name:", error?.name);
      console.error("[R2 Upload] Error message:", error?.message);
      console.error("[R2 Upload] Error stack:", error?.stack);
      res.status(500).json({ message: "Failed to upload image", error: error?.message });
    }
  });

  // Get a presigned upload URL for R2 (kept for backwards compatibility)
  apiRouter.post("/r2/upload-url", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!isR2Configured()) {
        return res.status(503).json({ message: "R2 storage is not configured" });
      }

      const userId = getCurrentUserId();
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { plantId, contentType } = req.body;
      const r2Service = new R2StorageService();

      const { url, key } = await r2Service.getUploadUrl(
        userId,
        plantId ? parseInt(plantId) : undefined,
        contentType || "image/jpeg"
      );

      res.json({
        method: "PUT",
        url,
        key,
        // Return the internal URL format for storing in database after upload
        imageUrl: r2Service.keyToInternalUrl(key)
      });
    } catch (error: any) {
      console.error("Failed to get R2 upload URL:", error);
      res.status(500).json({ message: "Failed to generate upload URL" });
    }
  });

  // Get a presigned download URL for an R2 image
  apiRouter.get("/r2/download-url", isAuthenticated, async (req: Request, res: Response) => {
    try {
      if (!isR2Configured()) {
        return res.status(503).json({ message: "R2 storage is not configured" });
      }

      const userId = getCurrentUserId();
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      const { key } = req.query;
      if (!key || typeof key !== "string") {
        return res.status(400).json({ message: "Missing or invalid key parameter" });
      }

      const r2Service = new R2StorageService();

      // Verify the user owns this image
      if (!r2Service.verifyUserOwnership(key, userId)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const url = await r2Service.getDownloadUrl(key);
      res.json({ url });
    } catch (error: any) {
      console.error("Failed to get R2 download URL:", error);
      res.status(500).json({ message: "Failed to generate download URL" });
    }
  });

  // Notification endpoints
  apiRouter.post("/notifications/test", async (req: Request, res: Response) => {
    try {
      const sent = await sendWelcomeNotification();
      
      if (sent) {
        res.json({ success: true, message: "Test notification sent successfully" });
      } else {
        res.status(500).json({ success: false, message: "Failed to send test notification" });
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to send test notification";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  apiRouter.post("/notifications/check-plants", async (req: Request, res: Response) => {
    try {
      const plants = await dbStorage.getAllPlants();
      const notificationCount = await checkPlantsAndSendNotifications(plants);
      
      res.json({ 
        success: true, 
        notificationCount,
        message: `Sent notifications for ${notificationCount} plants that need watering`
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to check plants and send notifications";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  // Send notification for a specific plant
  apiRouter.post("/plants/:id/notify", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      const plant = await dbStorage.getPlant(id);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      const sent = await sendPlantWateringNotification(plant);
      
      if (sent) {
        res.json({ success: true, message: `Sent watering notification for ${plant.name}` });
      } else {
        res.status(500).json({ success: false, message: "Failed to send notification" });
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to send plant notification";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });

  // Plant Species Catalog routes
  
  // Get all plant species
  apiRouter.get("/plant-species", async (req: Request, res: Response) => {
    try {
      const query = req.query.q as string;
      let species;
      
      if (query) {
        species = await dbStorage.searchPlantSpecies(query);
      } else {
        species = await dbStorage.getAllPlantSpecies();
      }
      
      res.json(species);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plant species" });
    }
  });
  
  // Get a specific plant species
  apiRouter.get("/plant-species/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant species ID" });
      }
      
      const species = await dbStorage.getPlantSpecies(id);
      if (!species) {
        return res.status(404).json({ message: "Plant species not found" });
      }
      
      res.json(species);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch plant species details" });
    }
  });
  
  // Create a new plant species
  apiRouter.post("/plant-species", async (req: Request, res: Response) => {
    try {
      const parsedData = insertPlantSpeciesSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid plant species data", 
          errors: parsedData.error.format() 
        });
      }
      
      const newSpecies = await dbStorage.createPlantSpecies(parsedData.data);
      res.status(201).json(newSpecies);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to create plant species";
      res.status(400).json({ message: errorMessage });
    }
  });
  
  // Update a plant species
  apiRouter.patch("/plant-species/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant species ID" });
      }
      
      const updateSchema = insertPlantSpeciesSchema.partial();
      const parsedData = updateSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid plant species data", 
          errors: parsedData.error.format() 
        });
      }
      
      const updatedSpecies = await dbStorage.updatePlantSpecies(id, parsedData.data);
      if (!updatedSpecies) {
        return res.status(404).json({ message: "Plant species not found" });
      }
      
      res.json(updatedSpecies);
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update plant species";
      res.status(400).json({ message: errorMessage });
    }
  });
  
  // Delete a plant species
  apiRouter.delete("/plant-species/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid plant species ID" });
      }
      
      const deleted = await dbStorage.deletePlantSpecies(id);
      if (!deleted) {
        return res.status(404).json({ message: "Plant species not found" });
      }
      
      res.json({ success: true });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to delete plant species";
      res.status(400).json({ message: errorMessage });
    }
  });

  // Plant Health Records endpoints
  
  // Get health records for a specific plant
  apiRouter.get("/plants/:id/health-records", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const plantId = parseInt(req.params.id);
      if (isNaN(plantId)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      // Get authenticated user ID
      const userId = getCurrentUserId();
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Verify plant ownership first
      const plant = await dbStorage.getPlant(plantId);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      if (plant.userId !== userId) {
        return res.status(403).json({ message: "Access denied: Plant does not belong to you" });
      }

      const healthRecords = await dbStorage.getPlantHealthRecords(plantId);
      res.json(healthRecords);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch health records" });
    }
  });

  // Create a new health record
  apiRouter.post("/plants/:id/health-records", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const plantId = parseInt(req.params.id);
      if (isNaN(plantId)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      // Get authenticated user ID from session
      const userId = getCurrentUserId();
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // Verify plant ownership first
      const plant = await dbStorage.getPlant(plantId);
      if (!plant) {
        return res.status(404).json({ message: "Plant not found" });
      }

      if (plant.userId !== userId) {
        return res.status(403).json({ message: "Access denied: Plant does not belong to you" });
      }

      // Validate the request data
      const parsedData = insertPlantHealthRecordSchema.safeParse({
        ...req.body,
        plantId,
        userId
      });

      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid health record data", 
          errors: parsedData.error.format()
        });
      }

      const healthRecord = await dbStorage.createHealthRecord(parsedData.data);
      res.status(201).json(healthRecord);
    } catch (error) {
      res.status(500).json({ message: "Failed to create health record" });
    }
  });

  // Update a health record
  apiRouter.patch("/health-records/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid health record ID" });
      }

      // Get authenticated user ID
      const userId = getCurrentUserId();
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // First, load the health record to verify ownership
      const existingRecord = await dbStorage.getHealthRecord(id);
      if (!existingRecord) {
        return res.status(404).json({ message: "Health record not found" });
      }

      // Verify ownership - return 403 if record belongs to different user
      if (existingRecord.userId !== userId) {
        return res.status(403).json({ message: "Access denied: Health record does not belong to you" });
      }

      // Create safe update schema that excludes plantId and userId to prevent privilege escalation
      const safeUpdateSchema = insertPlantHealthRecordSchema.omit({ plantId: true, userId: true }).partial();
      const parsedData = safeUpdateSchema.safeParse(req.body);

      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid health record data", 
          errors: parsedData.error.format()
        });
      }

      // Now update the record (ownership already verified)
      const updatedHealthRecord = await dbStorage.updateHealthRecord(id, parsedData.data);
      if (!updatedHealthRecord) {
        return res.status(500).json({ message: "Failed to update health record" });
      }

      res.json(updatedHealthRecord);
    } catch (error) {
      res.status(500).json({ message: "Failed to update health record" });
    }
  });

  // Delete a health record
  apiRouter.delete("/health-records/:id", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid health record ID" });
      }

      // Get authenticated user ID
      const userId = getCurrentUserId();
      if (!userId) {
        return res.status(401).json({ message: "User not authenticated" });
      }

      // First, load the health record to verify ownership
      const existingRecord = await dbStorage.getHealthRecord(id);
      if (!existingRecord) {
        return res.status(404).json({ message: "Health record not found" });
      }

      // Verify ownership - return 403 if record belongs to different user
      if (existingRecord.userId !== userId) {
        return res.status(403).json({ message: "Access denied: Health record does not belong to you" });
      }

      // Now delete the record (ownership already verified)
      const deleted = await dbStorage.deleteHealthRecord(id);
      if (!deleted) {
        return res.status(500).json({ message: "Failed to delete health record" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete health record" });
    }
  });

  // Care Activities endpoints
  
  // Get care activities for a specific plant
  apiRouter.get("/plants/:id/care-activities", async (req: Request, res: Response) => {
    try {
      const plantId = parseInt(req.params.id);
      if (isNaN(plantId)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      const careActivities = await dbStorage.getPlantCareActivities(plantId);
      res.json(careActivities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch care activities" });
    }
  });

  // Create a new care activity
  apiRouter.post("/plants/:id/care-activities", async (req: Request, res: Response) => {
    try {
      const plantId = parseInt(req.params.id);
      if (isNaN(plantId)) {
        return res.status(400).json({ message: "Invalid plant ID" });
      }

      // Validate the request data
      const parsedData = insertCareActivitySchema.safeParse({
        ...req.body,
        plantId,
        userId: 0 // Will be set by storage layer
      });

      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid care activity data", 
          errors: parsedData.error.format()
        });
      }

      const careActivity = await dbStorage.createCareActivity(parsedData.data);
      res.status(201).json(careActivity);
    } catch (error) {
      res.status(500).json({ message: "Failed to create care activity" });
    }
  });

  // Update a care activity
  apiRouter.patch("/care-activities/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid care activity ID" });
      }

      const updateSchema = insertCareActivitySchema.partial();
      const parsedData = updateSchema.safeParse(req.body);

      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid care activity data", 
          errors: parsedData.error.format()
        });
      }

      const updatedActivity = await dbStorage.updateCareActivity(id, parsedData.data);
      if (!updatedActivity) {
        return res.status(404).json({ message: "Care activity not found" });
      }

      res.json(updatedActivity);
    } catch (error) {
      res.status(500).json({ message: "Failed to update care activity" });
    }
  });

  // Delete a care activity
  apiRouter.delete("/care-activities/:id", async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid care activity ID" });
      }

      const deleted = await dbStorage.deleteCareActivity(id);
      if (!deleted) {
        return res.status(404).json({ message: "Care activity not found" });
      }

      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to delete care activity" });
    }
  });

  // Notification Settings endpoints
  
  // Get notification settings
  apiRouter.get("/notification-settings", async (req: Request, res: Response) => {
    try {
      const settings = await dbStorage.getNotificationSettings();
      // If no settings exist yet, return default values
      if (!settings) {
        return res.json({
          id: null,
          enabled: true,
          pushoverEnabled: true,
          pushoverAppToken: process.env.PUSHOVER_APP_TOKEN ? true : false, // Just return boolean indicating if token exists
          pushoverUserKey: process.env.PUSHOVER_USER_KEY ? true : false, // Just return boolean indicating if key exists
          emailEnabled: false,
          emailAddress: null,
          sendgridApiKey: false, // Just indicate token doesn't exist
          lastUpdated: null
        });
      }
      
      // Don't expose actual tokens in the response for security reasons
      // Just indicate whether they exist or not
      res.json({
        id: settings.id,
        enabled: settings.enabled,
        pushoverEnabled: settings.pushoverEnabled,
        pushoverAppToken: !!settings.pushoverAppToken,
        pushoverUserKey: !!settings.pushoverUserKey,
        emailEnabled: settings.emailEnabled,
        emailAddress: settings.emailAddress,
        sendgridApiKey: !!settings.sendgridApiKey,
        lastUpdated: settings.lastUpdated
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to fetch notification settings";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Export user data backup as ZIP with images
  apiRouter.get("/export", isAuthenticated, async (req: Request, res: Response) => {
    try {
      const exportService = new ExportService(dbStorage);
      const { stream, filename } = await exportService.exportUserBackupArchive();
      
      // Set headers for ZIP file download
      res.set({
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Access-Control-Expose-Headers': 'Content-Disposition'
      });
      
      // Pipe the ZIP stream to the response
      stream.pipe(res);
      
      // Handle stream errors
      stream.on('error', (error) => {
        console.error('Export stream error:', error);
        if (!res.headersSent) {
          res.status(500).json({ message: "Failed to export user data" });
        }
      });
      
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to export user data";
      console.error('Export error:', error);
      res.status(500).json({ message: errorMessage });
    }
  });

  // Custom middleware to handle multer errors consistently
  function handleImportUpload(req: Request, res: Response, next: NextFunction) {
    importUpload.single('backup')(req, res, (err: any) => {
      if (err) {
        console.error('Import upload error:', err);
        
        // Handle multer errors consistently with JSON responses
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
              success: false,
              message: "File too large. Maximum file size is 50MB.",
              details: err.message
            });
          } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({
              success: false,
              message: "Unexpected file field. Please use 'backup' as the file field name.",
              details: err.message
            });
          } else {
            return res.status(400).json({
              success: false,
              message: "File upload error. Please check your file and try again.",
              details: err.message
            });
          }
        } else if (err.message === 'Only ZIP files are allowed for imports') {
          return res.status(400).json({
            success: false,
            message: "Invalid file type. Please upload a ZIP file containing your backup data.",
            details: err.message
          });
        } else {
          return res.status(500).json({
            success: false,
            message: "Upload failed. Please try again or contact support if the problem persists.",
            details: err.message
          });
        }
      }
      next();
    });
  }

  // Import user data backup from ZIP file
  // Note: multer's async multipart parsing can break AsyncLocalStorage context,
  // so we get userId directly from req.user instead of getCurrentUserId()
  apiRouter.post("/import", isAuthenticated, handleImportUpload, async (req: Request, res: Response) => {
    // Get user ID directly from req.user (multer breaks AsyncLocalStorage context)
    const currentUserId = (req.user as any)?.id ?? null;
    if (!currentUserId) {
      return res.status(401).json({
        success: false,
        message: "User authentication required for import operations."
      });
    }
    
    try {      
      if (!req.file) {
        return res.status(400).json({ 
          success: false,
          message: "No backup file provided. Please upload a ZIP file containing your backup data." 
        });
      }

      if (!req.file.buffer) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid file upload. Please try again with a valid ZIP file." 
        });
      }

      // Validate import mode parameter
      const mode = req.body.mode || 'merge';
      if (mode !== 'merge' && mode !== 'replace') {
        return res.status(400).json({ 
          success: false,
          message: "Invalid import mode. Must be 'merge' or 'replace'." 
        });
      }

      // Security: Require explicit confirmation for replace mode (destructive operation)
      if (mode === 'replace') {
        const confirmation = req.body.confirmation;
        if (confirmation !== 'REPLACE') {
          return res.status(400).json({ 
            success: false,
            message: "Replace mode requires explicit confirmation. You must confirm by typing 'REPLACE' to proceed with this destructive operation.",
            confirmationRequired: true
          });
        }
        
        // Log audit event for destructive operation
        console.log(`AUDIT: User ${currentUserId} confirmed REPLACE mode import operation at ${new Date().toISOString()}`);
      }

      // Wrap the import operation to preserve user context throughout async operations
      const summary = await new Promise((resolve, reject) => {
        userContextStorage.run({ userId: currentUserId }, async () => {
          try {
            const importService = new ImportService(dbStorage);
            const result = await importService.importFromZipBuffer(req.file!.buffer, mode);
            resolve(result);
          } catch (error) {
            reject(error);
          }
        });
      });
      
      res.json({
        success: true,
        message: `Import completed successfully in ${mode} mode`,
        summary
      });

    } catch (error: any) {
      const errorMessage = error?.message || "Failed to import backup data";
      console.error('Import error:', error);
      
      // Provide user-friendly error messages with consistent format
      if (errorMessage.includes('backup.json not found')) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid backup file. The ZIP file must contain a backup.json file.",
          details: errorMessage
        });
      }
      
      if (errorMessage.includes('validation')) {
        return res.status(400).json({ 
          success: false,
          message: "Invalid backup data format. Please ensure you're uploading a valid PlantDaddy backup file.",
          details: errorMessage
        });
      }
      
      if (errorMessage.includes('ZIP bomb') || errorMessage.includes('too large') || errorMessage.includes('too many entries')) {
        return res.status(400).json({ 
          success: false,
          message: "ZIP file is too large or contains too many files. Please upload a smaller backup file.",
          details: errorMessage
        });
      }
      
      if (errorMessage.includes('Authentication required')) {
        return res.status(401).json({ 
          success: false,
          message: "User authentication lost during import. Please log in again and try again.",
          details: errorMessage
        });
      }
      
      res.status(500).json({ 
        success: false,
        message: "Import failed. Please try again or contact support if the problem persists.",
        details: errorMessage 
      });
    }
  });

  // Update notification settings
  apiRouter.post("/notification-settings", async (req: Request, res: Response) => {
    try {
      // Use partial schema to validate the update data
      const updateSchema = insertNotificationSettingsSchema.partial();
      const parsedData = updateSchema.safeParse(req.body);
      
      if (!parsedData.success) {
        return res.status(400).json({ 
          message: "Invalid notification settings data", 
          errors: parsedData.error.format()
        });
      }

      const updatedSettings = await dbStorage.updateNotificationSettings(parsedData.data);
      
      // Don't expose actual tokens in the response for security reasons
      res.json({
        id: updatedSettings.id,
        enabled: updatedSettings.enabled,
        pushoverEnabled: updatedSettings.pushoverEnabled,
        pushoverAppToken: !!updatedSettings.pushoverAppToken,
        pushoverUserKey: !!updatedSettings.pushoverUserKey,
        emailEnabled: updatedSettings.emailEnabled,
        emailAddress: updatedSettings.emailAddress,
        sendgridApiKey: !!updatedSettings.sendgridApiKey,
        lastUpdated: updatedSettings.lastUpdated
      });
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to update notification settings";
      res.status(500).json({ message: errorMessage });
    }
  });

  // Test notification settings
  apiRouter.post("/notification-settings/test", async (req: Request, res: Response) => {
    try {
      const results = await sendTestNotification();
      
      if (results.pushover || results.email) {
        // Construct detailed message about which notifications were sent
        let message = "Test notification ";
        const successTypes = [];
        if (results.pushover) successTypes.push("Pushover");
        if (results.email) successTypes.push("Email");
        
        message += `sent successfully via ${successTypes.join(" and ")}.`;
        
        res.json({ 
          success: true, 
          message,
          results
        });
      } else {
        res.status(500).json({ 
          success: false, 
          message: "Failed to send test notifications. Ensure notification settings are properly configured.",
          results
        });
      }
    } catch (error: any) {
      const errorMessage = error?.message || "Failed to send test notification";
      res.status(500).json({ success: false, message: errorMessage });
    }
  });
  
  // R2 image serving endpoint - redirects to presigned URLs
  // Note: Get userId from req.user directly since AsyncLocalStorage context may not be set
  app.get("/r2/*", isAuthenticated, async (req, res) => {
    if (!isR2Configured()) {
      return res.status(503).json({ error: "R2 storage is not configured" });
    }

    const userId = (req.user as any)?.id ?? null;
    if (!userId) {
      return res.sendStatus(401);
    }

    // Extract the key from the path (remove /r2/ prefix)
    const key = req.path.slice(4);
    if (!key) {
      return res.status(400).json({ error: "Missing object key" });
    }

    const r2Service = new R2StorageService();

    // Verify the user owns this image
    if (!r2Service.verifyUserOwnership(key, userId)) {
      return res.sendStatus(403);
    }

    try {
      // Check if object exists
      const exists = await r2Service.objectExists(key);
      if (!exists) {
        return res.sendStatus(404);
      }

      // Generate presigned download URL and redirect
      const url = await r2Service.getDownloadUrl(key);
      res.redirect(url);
    } catch (error) {
      console.error("Error serving R2 object:", error);
      return res.sendStatus(500);
    }
  });

  // Add API router to app
  // Apply user context middleware before API routes to make user data available
  app.use(setUserContext);
  
  // Health check endpoint for Railway/deployment monitoring
  app.get("/api/health", (req: Request, res: Response) => {
    res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
  });
  
  // Mount API routes
  app.use("/api", apiRouter);

  const httpServer = createServer(app);
  
  // Send welcome notification on startup (only if credentials are configured)
  sendWelcomeNotification().then(sent => {
    if (sent) {
      console.log("PlantDaddy welcome notification sent successfully");
    }
  });
  
  return httpServer;
}
