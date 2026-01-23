# PlantDaddy iOS - Setup Guide

Complete guide for setting up the PlantDaddy iOS app from scratch.

## Prerequisites

### Required
- **Mac computer** running macOS Ventura (13.0) or later
- **Xcode 15.0+** (free from Mac App Store)
- **Apple ID** (free, for running on simulator)

### Optional
- **Apple Developer Account** ($99/year) - required for:
  - Running on physical iPhone/iPad
  - App Store distribution
  - TestFlight beta testing

## Step 1: Install Xcode

1. Open **Mac App Store**
2. Search for "Xcode"
3. Click **Install** (it's ~15GB, will take a while)
4. Wait for installation to complete
5. Open Xcode and agree to license agreement

## Step 2: Create New Xcode Project

1. **Launch Xcode**

2. **Create New Project:**
   - Click "Create a new Xcode project"
   - Or: `File → New → Project` (Cmd + Shift + N)

3. **Choose Template:**
   - Select **iOS** tab
   - Select **App** template
   - Click **Next**

4. **Configure Project:**
   ```
   Product Name: PlantDaddy
   Team: (Select your Apple ID or "None")
   Organization Identifier: com.yourname (e.g., com.john)
   Bundle Identifier: (Auto-generated: com.yourname.PlantDaddy)
   Interface: SwiftUI
   Language: Swift
   Storage: None
   Include Tests: ✓ (optional)
   ```
   - Click **Next**

5. **Choose Location:**
   - Navigate to your PlantDaddy repository
   - Create a folder named `PlantDaddy-iOS`
   - Click **Create**

## Step 3: Copy Swift Files to Xcode Project

Now you'll add all the Swift files from this repository to your Xcode project.

### Method 1: Drag and Drop (Recommended)

1. **In Finder:**
   - Navigate to `PlantDaddy/ios/PlantDaddy/`

2. **In Xcode:**
   - In Project Navigator (left sidebar), right-click on `PlantDaddy` folder
   - Select "New Group" and name it "Models"
   - Repeat for: "Networking", "Services", "Views", "Config"

3. **Drag Files:**
   - Drag each `.swift` file from Finder to the corresponding group in Xcode
   - When prompted, ensure:
     - ✅ "Copy items if needed"
     - ✅ "Create groups"
     - ✅ Target: PlantDaddy is checked
   - Click **Finish**

### Method 2: Add Files Manually

1. **Right-click** on `PlantDaddy` folder in Xcode
2. Select **"Add Files to PlantDaddy..."**
3. Navigate to each folder and select files
4. Ensure "Copy items if needed" is checked
5. Click **Add**

### File Structure in Xcode

After adding files, your Xcode project should look like:

```
PlantDaddy/
├── App/
│   └── PlantDaddyApp.swift
├── Models/
│   ├── User.swift
│   ├── Plant.swift
│   ├── Location.swift
│   ├── HealthRecord.swift
│   └── CareActivity.swift
├── Networking/
│   ├── APIClient.swift
│   ├── APIEndpoint.swift
│   └── NetworkError.swift
├── Services/
│   ├── AuthService.swift
│   ├── PlantService.swift
│   └── KeychainService.swift
├── Views/
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
├── Config/
│   └── APIConfig.swift
└── Assets.xcassets
```

## Step 4: Remove Default ContentView

Xcode creates a default `ContentView.swift`. Since we have our own, delete it:

1. In Project Navigator, find `ContentView.swift`
2. Right-click → **Delete**
3. Select **"Move to Trash"**

## Step 5: Configure API URL

**IMPORTANT:** Update the API endpoint to point to your Railway backend.

1. Open `Config/APIConfig.swift`
2. Find the `production` case in `baseURL`
3. Replace with your Railway URL:

```swift
case .production:
    return "https://your-plantdaddy-app.up.railway.app/api"
```

To find your Railway URL:
- Go to Railway dashboard
- Click on your PlantDaddy deployment
- Copy the URL from "Domains" section

### For Local Testing

If testing with local backend:

```swift
case .development:
    // Replace with your computer's IP address
    return "http://192.168.1.100:5000/api"
```

Find your IP:
```bash
# On Mac terminal:
ipconfig getifaddr en0  # WiFi
# Or
ipconfig getifaddr en1  # Ethernet
```

**⚠️ Important:** Use your computer's IP, NOT `localhost` when testing on a device!

## Step 6: Configure App Info

### App Icon (Optional)

1. Create app icon (1024x1024 PNG)
2. Drag to `Assets.xcassets/AppIcon`

### App Name

To change the display name:
1. Select project in Navigator
2. Go to **General** tab
3. Change **Display Name** to "PlantDaddy"

### Minimum iOS Version

Ensure iOS deployment target is set:
1. Select project → **General** tab
2. **Minimum Deployments** → iOS: **16.0**

## Step 7: Configure Permissions

Add network permissions to `Info.plist`:

1. In Project Navigator, find `Info.plist`
2. Right-click → **Open As** → **Source Code**
3. Add before the closing `</dict>`:

```xml
<key>NSAppTransportSecurity</key>
<dict>
    <key>NSAllowsArbitraryLoads</key>
    <false/>
    <key>NSExceptionDomains</key>
    <dict>
        <key>up.railway.app</key>
        <dict>
            <key>NSIncludesSubdomains</key>
            <true/>
            <key>NSExceptionAllowsInsecureHTTPLoads</key>
            <false/>
        </dict>
    </dict>
</dict>
```

For local development, also add:

```xml
<key>localhost</key>
<dict>
    <key>NSExceptionAllowsInsecureHTTPLoads</key>
    <true/>
</dict>
```

## Step 8: Build and Run

### On Simulator

1. **Select Simulator:**
   - Click device selector (top toolbar)
   - Choose: **iPhone 15** (or any recent iPhone)

2. **Build and Run:**
   - Click ▶️ button (or press `Cmd + R`)
   - Wait for build to complete
   - App should launch in simulator

### On Physical Device

**Requires Apple Developer Account ($99/year)**

1. **Connect iPhone/iPad via USB**

2. **Trust Computer:**
   - On device: `Settings → General → Device Management`
   - Trust your computer

3. **Select Device:**
   - In Xcode, device selector → Your iPhone name

4. **Sign the App:**
   - Select project → **Signing & Capabilities** tab
   - Check "Automatically manage signing"
   - Select your Team (Apple ID)

5. **Build and Run:**
   - Click ▶️ button (or press `Cmd + R`)
   - First time: On device, go to `Settings → General → VPN & Device Management`
   - Tap your developer account → **Trust**
   - Relaunch app

## Step 9: Test the App

1. **Create Account:**
   - Click "Sign Up"
   - Enter username and password
   - Tap "Sign Up"

2. **Add Plant:**
   - Tap "+" button
   - Fill in plant details
   - Tap "Save"

3. **Water Plant:**
   - Tap on a plant card
   - Tap "Water Plant" button

4. **Check Sync:**
   - Open web app (if running)
   - Verify plant appears in web interface

## Troubleshooting

### Build Errors

**"Cannot find 'PlantDaddyApp' in scope"**
- Solution: Make sure `PlantDaddyApp.swift` is added to the target
- Right-click file → **Target Membership** → Check PlantDaddy

**"No such module 'SwiftUI'"**
- Solution: Clean build folder: `Product → Clean Build Folder`
- Restart Xcode

**Multiple files for PlantDaddyApp**
- Solution: Delete the default `ContentView.swift` Xcode created

### Runtime Errors

**"Cannot connect to server"**
- Check API URL in `APIConfig.swift`
- Verify Railway backend is running
- Check your computer's firewall (for local testing)

**"Unauthorized" error**
- Check backend has `JWT_SECRET` environment variable
- Try logging out and back in

**App crashes on launch**
- Check Console in Xcode for error messages
- Verify all files are properly added to target

### Simulator Issues

**Simulator won't launch**
- Quit and restart Simulator
- `Xcode → Preferences → Locations` - verify Command Line Tools is selected

**Slow simulator**
- Use iPhone SE (3rd gen) for faster performance
- Close other apps
- Restart your Mac

## Next Steps

### Add Camera Support

To add plant photo functionality:

1. **Update Info.plist:**
```xml
<key>NSCameraUsageDescription</key>
<string>Take photos of your plants</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>Choose photos of your plants</string>
```

2. **Add PhotosPicker** (iOS 16+):
```swift
import PhotosUI
// Implement photo picker in AddPlantView
```

### Add Push Notifications

1. **Enable capability:**
   - Project → **Signing & Capabilities**
   - Click **+** → **Push Notifications**

2. **Request permission:**
```swift
import UserNotifications
UNUserNotificationCenter.current().requestAuthorization(...)
```

3. **Implement APNs** on backend

### Submit to TestFlight

1. **Archive:**
   - `Product → Archive`

2. **Upload:**
   - Window → Organizer
   - Select archive → **Distribute App**
   - Follow wizard

3. **Add Testers:**
   - App Store Connect → TestFlight
   - Add internal/external testers

## Resources

- [Apple SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [Xcode User Guide](https://developer.apple.com/documentation/xcode)
- [App Distribution Guide](https://developer.apple.com/distribute/)
- [Backend JWT Documentation](../JWT_IMPLEMENTATION.md)

## Getting Help

- **Xcode crashes:** Clean build folder, restart Xcode
- **API issues:** Check Railway logs
- **Authentication problems:** Verify JWT_SECRET is set
- **General questions:** Open an issue on GitHub

---

**You're all set!** 🎉

The iOS app should now be running and connected to your PlantDaddy backend.
