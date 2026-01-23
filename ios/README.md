# PlantDaddy iOS App

Native iOS app for PlantDaddy plant management system.

## Features

✅ **Complete Plant Management**
- View all your plants in a beautiful grid layout
- Add new plants with custom watering schedules
- Water plants with one tap
- Track watering history
- View plant details and status

✅ **Smart Watering Reminders**
- Visual indicators for plants that need watering
- Days until next watering countdown
- Overdue plant notifications

✅ **User Authentication**
- Secure JWT token-based authentication
- Token stored in iOS Keychain
- Automatic login persistence

✅ **Location Management**
- Organize plants by room/location
- Create custom locations
- Quick filtering by location

✅ **Health & Care Tracking** (Ready to implement)
- Plant health records
- Care activity logging
- History tracking

## Tech Stack

- **SwiftUI** - Modern, declarative UI framework
- **Swift 5.9+** - Latest Swift features
- **URLSession** - Native networking
- **Keychain** - Secure credential storage
- **iOS 16+** - Modern iOS features

## Project Structure

```
ios/PlantDaddy/
├── Models/              # Data models matching backend API
│   ├── User.swift
│   ├── Plant.swift
│   ├── Location.swift
│   ├── HealthRecord.swift
│   └── CareActivity.swift
├── Networking/          # API client and networking layer
│   ├── APIClient.swift
│   ├── APIEndpoint.swift
│   └── NetworkError.swift
├── Services/            # Business logic layer
│   ├── AuthService.swift
│   ├── PlantService.swift
│   └── KeychainService.swift
├── Views/               # SwiftUI views
│   ├── Authentication/
│   │   ├── LoginView.swift
│   │   └── RegisterView.swift
│   ├── Plants/
│   │   ├── PlantListView.swift
│   │   ├── PlantDetailView.swift
│   │   └── AddPlantView.swift
│   ├── Components/
│   │   └── PlantCardView.swift
│   └── MainTabView.swift
├── Config/              # Configuration
│   └── APIConfig.swift
└── App/                 # App entry point
    └── PlantDaddyApp.swift
```

## Setup Instructions

See [SETUP.md](./SETUP.md) for detailed setup instructions.

### Quick Start

1. **Install Xcode** (from Mac App Store)
2. **Create new Xcode project**
3. **Copy all Swift files** from this directory to your project
4. **Update API URL** in `Config/APIConfig.swift`
5. **Build and run**

## API Integration

This iOS app connects to the PlantDaddy backend API via JWT authentication.

### Configuration

Update the Railway URL in `Config/APIConfig.swift`:

```swift
case .production:
    return "https://your-app.up.railway.app/api"
```

### Authentication Flow

1. User logs in or registers
2. App receives JWT token from `/token-login` or `/token-register`
3. Token stored securely in iOS Keychain
4. Token sent in `Authorization: Bearer <token>` header for all requests
5. Automatic logout on 401 (unauthorized) responses

## Features Implemented

### ✅ Core Features
- [x] User authentication (login/register)
- [x] Secure token storage
- [x] Plant list view with search
- [x] Plant detail view
- [x] Add new plants
- [x] Water plants
- [x] Watering history
- [x] Location management
- [x] Delete plants

### 🚧 Ready to Implement
- [ ] Edit plant details
- [ ] Health record tracking
- [ ] Care activity logging
- [ ] Camera integration for plant photos
- [ ] Push notifications (APNs)
- [ ] Offline mode with local caching
- [ ] Dark mode support

## Screenshots

*(Add screenshots here after building the app)*

## Requirements

- **Xcode 15.0+**
- **iOS 16.0+**
- **Swift 5.9+**
- **macOS Ventura or later**

## Development

### Building for Simulator

1. Open project in Xcode
2. Select iOS Simulator
3. Press `Cmd + R` to build and run

### Building for Device

1. Connect iPhone/iPad via USB
2. Select your device in Xcode
3. Sign the app with your Apple Developer account
4. Press `Cmd + R` to build and run

### Testing with Local Backend

If running backend locally:

```swift
// In APIConfig.swift (development mode)
return "http://YOUR_COMPUTER_IP:5000/api"  // Not localhost!
```

Find your computer's IP:
```bash
ifconfig | grep "inet " | grep -v 127.0.0.1
```

## Deployment

### TestFlight

1. Archive app in Xcode: `Product → Archive`
2. Upload to App Store Connect
3. Add testers in TestFlight
4. Distribute builds

### App Store

1. Complete app metadata in App Store Connect
2. Upload screenshots
3. Submit for review
4. Wait for approval (usually 1-3 days)

## API Endpoints Used

- `POST /api/token-login` - Login
- `POST /api/token-register` - Register
- `GET /api/user` - Get current user
- `GET /api/plants` - Get all plants
- `GET /api/plants/:id` - Get plant details
- `POST /api/plants` - Create plant
- `PATCH /api/plants/:id` - Update plant
- `DELETE /api/plants/:id` - Delete plant
- `POST /api/plants/:id/water` - Water plant
- `GET /api/plants/:id/watering-history` - Get watering history
- `GET /api/locations` - Get locations
- `POST /api/locations` - Create location

## Troubleshooting

### "Cannot connect to server"
- Check API URL in `APIConfig.swift`
- Ensure backend is running
- Check network connectivity
- For device testing, use computer's IP not `localhost`

### "Unauthorized" errors
- Token might be expired (30 days)
- Log out and log back in
- Check backend JWT_SECRET is set

### Build errors
- Clean build folder: `Product → Clean Build Folder`
- Delete Derived Data
- Restart Xcode

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

Same as main PlantDaddy project

## Support

For issues or questions:
- Check the main README in parent directory
- Review JWT_IMPLEMENTATION.md for backend setup
- Open an issue on GitHub
