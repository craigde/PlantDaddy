# PlantDaddy

A plant care tracking application for iOS and web. Track watering schedules, organize plants by location, share households with family members, and receive push notifications when plants need attention.

## Features

- **Plant Management** -- Track plants with custom watering schedules, photos, health records, and care activity logs
- **Species Catalog** -- Browse 37 built-in plant species with care guides, or add custom species
- **Household Sharing** -- Invite family members or housesitters to view and water your plants. Support for multiple households (e.g., home + vacation house) with role-based access (owner, member, caretaker)
- **Location Management** -- Organize plants by room or area, with full CRUD from both iOS and web
- **Push Notifications** -- Automated daily watering reminders via APNs (iOS), Pushover, or email. Includes actionable "Water Now" and "Water All" buttons on iOS
- **Data Backup** -- Export and import plant data as ZIP files, with merge or replace restore modes
- **Dark Mode** -- Full light/dark theme support on web

## Tech Stack

### Web App
- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend:** Express.js, TypeScript, Passport.js (session auth) + JWT (mobile auth)
- **Database:** PostgreSQL with Drizzle ORM
- **Routing:** Wouter

### iOS App
- **Language:** Swift, SwiftUI
- **Networking:** URLSession with async/await
- **Auth:** JWT token-based authentication
- **Notifications:** UNUserNotificationCenter with actionable notification categories

### Infrastructure
- **Hosting:** Railway
- **Image Storage:** Cloudflare R2 (S3-compatible)
- **Push Notifications:** APNs (iOS native), Pushover, SendGrid (email)

## Project Structure

```
PlantDaddy/
├── client/                    # React web app
│   └── src/
│       ├── components/        # UI components (50+ shadcn/ui)
│       ├── hooks/             # React hooks (auth, plants, locations, households, etc.)
│       ├── pages/             # Page components (dashboard, settings, plant details, etc.)
│       └── lib/               # API client, utilities, routing
├── server/                    # Express backend
│   ├── index.ts               # Server entry point, migrations
│   ├── routes.ts              # All API routes
│   ├── multi-user-storage.ts  # Household-scoped data access layer
│   ├── user-context.ts        # Per-request user/household context (AsyncLocalStorage)
│   ├── auth.ts                # Passport.js session auth
│   ├── jwt.ts                 # JWT token management for mobile
│   ├── apns-service.ts        # Apple Push Notification Service
│   ├── notifications.ts       # Notification dispatch (Pushover, Email, APNs)
│   ├── scheduler.ts           # Hourly watering check, daily 8 AM reminders
│   ├── email-service.ts       # SendGrid email integration
│   ├── r2Storage.ts           # Cloudflare R2 image storage
│   ├── export-service.ts      # ZIP backup export
│   ├── import-service.ts      # ZIP backup import
│   ├── seed-species.ts        # Plant species catalog seeder
│   └── migrations/            # Data migrations
├── shared/                    # Shared types and schema
│   └── schema.ts              # Drizzle ORM schema (all tables)
├── ios/                       # Native iOS app
│   └── PlantDaddy/
│       ├── App/               # App entry point, AppDelegate
│       ├── Models/            # Swift data models
│       ├── Networking/        # API client, endpoint definitions
│       ├── Services/          # Auth, plant, household, notification services
│       └── Views/             # SwiftUI views
│           ├── Plants/        # Plant list, detail, add/edit
│           ├── Settings/      # Household, location, notification settings
│           ├── Explorer/      # Plant species browser
│           ├── Authentication/# Login/register
│           └── Components/    # Reusable UI components
└── uploads/                   # Local image storage (dev)
```

## Database Schema

| Table | Description |
|-------|-------------|
| `users` | User accounts (username, hashed password) |
| `households` | Named households with unique invite codes |
| `household_members` | User-household membership with roles (owner/member/caretaker) |
| `plants` | Plants scoped to households (name, species, location, watering frequency, last watered, photo) |
| `locations` | Rooms/areas scoped to households |
| `plant_species` | Species catalog (37 built-in + user-created) |
| `plant_health_records` | Health tracking over time (status, notes, photos) |
| `care_activities` | Activity log (watering, fertilizing, repotting, pruning, misting, rotating) |
| `notification_settings` | Per-user notification preferences (Pushover, email, APNs) |
| `device_tokens` | iOS APNs device tokens (sandbox/production) |
| `session` | Express session storage |

## Local Development

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your DATABASE_URL and SESSION_SECRET

# Push database schema
npm run db:push

# Start development server (serves both API and web app)
npm run dev
```

The app will be available at `http://localhost:5000`.

### iOS Development

Open `ios/PlantDaddy.xcodeproj` in Xcode. Update `APIConfig.swift` to point to your local server. Build and run on a simulator or device.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `SESSION_SECRET` | Yes | Session encryption key (`openssl rand -base64 32`) |
| `JWT_SECRET` | No | JWT signing key for mobile auth (defaults to SESSION_SECRET) |
| `PORT` | No | Server port (default: 5000, auto-set by Railway) |
| `NODE_ENV` | No | `development` or `production` |
| `APNS_KEY_ID` | No | Apple Push Notification key ID |
| `APNS_TEAM_ID` | No | Apple Developer Team ID |
| `APNS_KEY` | No | APNs .p8 private key contents |
| `PUSHOVER_APP_TOKEN` | No | Pushover app token |
| `PUSHOVER_USER_KEY` | No | Pushover user key |
| `R2_ACCOUNT_ID` | No | Cloudflare R2 account ID |
| `R2_ACCESS_KEY_ID` | No | R2 access key |
| `R2_SECRET_ACCESS_KEY` | No | R2 secret key |
| `R2_BUCKET_NAME` | No | R2 bucket name (default: `plantdaddy`) |

## Deploy to Railway

1. Push code to GitHub
2. Create a new project at [railway.app](https://railway.app)
3. Deploy from your GitHub repo
4. Add a PostgreSQL database from the Railway dashboard
5. Set `SESSION_SECRET` in environment variables
6. Railway auto-detects Node.js and runs `npm install && npm run build && npm start`
7. Push the database schema:

```bash
npm install -g @railway/cli
railway login
railway link
railway run npm run db:push
```

## API Overview

All endpoints are prefixed with `/api`. Web app uses session cookies; iOS uses JWT Bearer tokens. Both send `X-Household-Id` header to scope data to the active household.

**Auth:** `POST /login`, `POST /register`, `POST /logout`, `GET /user`, `POST /token-login`, `POST /token-register`

**Plants:** `GET /plants`, `POST /plants`, `GET /plants/:id`, `PATCH /plants/:id`, `DELETE /plants/:id`, `POST /plants/:id/water`, `POST /plants/water-overdue`

**Locations:** `GET /locations`, `POST /locations`, `PATCH /locations/:id`, `DELETE /locations/:id`

**Households:** `GET /households`, `POST /households`, `PATCH /households/:id`, `GET /households/:id`, `POST /households/join`, `POST /households/:id/invite`, `PATCH /households/:id/members/:userId`, `DELETE /households/:id/members/:userId`

**Species:** `GET /plant-species`, `POST /plant-species`, `PATCH /plant-species/:id`, `DELETE /plant-species/:id`

**Health & Care:** `GET /plants/:id/health-records`, `POST /plants/:id/health-records`, `GET /plants/:id/care-activities`, `POST /plants/:id/care-activities`

**Notifications:** `GET /notification-settings`, `POST /notification-settings`, `POST /notification-settings/test`, `POST /device-tokens`

**Data:** `GET /export`, `POST /import`

## License

MIT
