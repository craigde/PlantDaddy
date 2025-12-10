# GreenTracker 🌱

A plant care tracking application to help you keep your plants healthy and thriving.

## Features

- 🌿 Track multiple plants with watering schedules
- 📊 Health tracking with photo documentation
- 📍 Organize plants by location
- 🔔 Notification reminders (Pushover integration)
- 📱 Responsive design for mobile and desktop
- 👥 Multi-user support with authentication

## Tech Stack

- **Frontend**: React, Vite, Tailwind CSS, shadcn/ui
- **Backend**: Express.js, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **Auth**: Passport.js with session-based authentication

---

## 🚀 Deploy to Railway (Free Tier)

### Step 1: Prepare Your Repository

1. Push this code to a GitHub repository
2. Make sure `.env` files are NOT committed (they're in `.gitignore`)

### Step 2: Create Railway Project

1. Go to [railway.app](https://railway.app) and sign up/login
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Authorize Railway and select your repository

### Step 3: Add PostgreSQL Database

1. In your Railway project, click **"+ New"**
2. Select **"Database" → "PostgreSQL"**
3. Railway will automatically set `DATABASE_URL` for your app

### Step 4: Configure Environment Variables

In your Railway service settings, add these variables:

| Variable | Required | Description |
|----------|----------|-------------|
| `SESSION_SECRET` | ✅ Yes | Random string for session encryption. Generate with: `openssl rand -base64 32` |
| `PUSHOVER_APP_TOKEN` | ❌ No | For push notifications |
| `PUSHOVER_USER_KEY` | ❌ No | For push notifications |

### Step 5: Deploy

Railway will automatically:
- Detect Node.js
- Run `npm install`
- Run `npm run build`
- Run `npm run start`

### Step 6: Initialize Database

After first deploy, you need to push the database schema:

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login to Railway
railway login

# Link to your project
railway link

# Push database schema
railway run npm run db:push
```

### Step 7: Access Your App

Railway will provide a URL like `https://your-app.up.railway.app`

---

## 🔧 Alternative: Deploy to Render

### Step 1: Create Web Service

1. Go to [render.com](https://render.com) and sign up
2. Click **"New +" → "Web Service"**
3. Connect your GitHub repo

### Step 2: Configure Service

- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm run start`
- **Environment**: `Node`

### Step 3: Add PostgreSQL

1. Click **"New +" → "PostgreSQL"**
2. Copy the **Internal Database URL**
3. Add as `DATABASE_URL` in your web service environment variables

### Step 4: Add Environment Variables

Same as Railway - add `SESSION_SECRET` and optionally notification keys.

---

## 🛠 Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Push database schema
npm run db:push

# Start development server
npm run dev
```

The app will be available at `http://localhost:5000`

---

## 📁 Project Structure

```
├── client/              # React frontend
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── hooks/       # Custom React hooks
│   │   ├── pages/       # Page components
│   │   └── lib/         # Utilities
├── server/              # Express backend
│   ├── routes.ts        # API routes
│   ├── storage.ts       # Data access layer
│   ├── auth.ts          # Authentication
│   └── db.ts            # Database connection
├── shared/              # Shared types/schemas
│   └── schema.ts        # Drizzle schema
└── uploads/             # Static plant images
```

---

## 🔐 Environment Variables Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `DATABASE_URL` | Yes | - | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | `PlantDaddySecret` | Session encryption key |
| `PORT` | No | `5000` | Server port (set by Railway/Render) |
| `NODE_ENV` | No | `development` | Environment mode |
| `PUSHOVER_APP_TOKEN` | No | - | Pushover notification token |
| `PUSHOVER_USER_KEY` | No | - | Pushover user key |

---

## 📝 Notes

- **File uploads**: Currently stored locally in `uploads/`. For production, consider using cloud storage (S3, Cloudinary, etc.)
- **Sessions**: Stored in PostgreSQL, so they persist across deploys
- **Free tier limits**: Railway gives $5/month credit; Render free tier spins down after inactivity

---

## License

MIT
