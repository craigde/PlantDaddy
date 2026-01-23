# Xcode Setup for Modern Projects (No Info.plist)

If you don't see `Info.plist` in your Xcode project, don't worry! Modern Xcode projects (Xcode 13+) handle Info.plist differently.

## Where is Info.plist?

In modern Xcode projects, especially SwiftUI apps, the Info.plist settings are managed in two ways:

1. **Build Settings** - Most settings
2. **Auto-generated Info.plist** - Hidden from project navigator

## How to Add Permissions (Modern Xcode)

### Option 1: Using Target Settings (EASIEST)

1. **Select Your Project**
   - Click on the project name at the very top of the Project Navigator (blue icon)

2. **Select Your Target**
   - Under "TARGETS", click on "PlantDaddy"

3. **Go to Info Tab**
   - Click the "Info" tab at the top

4. **Add Custom iOS Target Properties**
   - Look for "Custom iOS Target Properties" section
   - Click the **+** button

5. **Add Camera Permission**
   - Start typing "Privacy - Camera"
   - Select **"Privacy - Camera Usage Description"**
   - In the "Value" column, enter:
     ```
     PlantDaddy needs camera access to take photos of your plants
     ```

6. **Add Photo Library Permission**
   - Click **+** again
   - Start typing "Privacy - Photo"
   - Select **"Privacy - Photo Library Usage Description"**
   - In the "Value" column, enter:
     ```
     PlantDaddy needs photo library access to choose photos of your plants
     ```

7. **Add Network Security (Optional for Production)**
   - This is harder to add via UI, use Option 2 below for network settings

### Option 2: Create Info.plist File (If Needed)

If you need more control (for network settings), create the file manually:

1. **Create Info.plist**
   - Right-click on PlantDaddy folder in Project Navigator
   - Select **"New File..."**
   - Choose **"Property List"**
   - Name it **"Info.plist"**
   - Click **"Create"**

2. **Configure Project to Use It**
   - Select project → Target → Build Settings
   - Search for "Info.plist"
   - Under "Packaging", set "Info.plist File" to: `PlantDaddy/Info.plist`

3. **Add Permissions**
   - Right-click Info.plist → **"Open As" → "Source Code"**
   - Replace contents with:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <!-- Camera Permission -->
    <key>NSCameraUsageDescription</key>
    <string>PlantDaddy needs camera access to take photos of your plants</string>

    <!-- Photo Library Permission -->
    <key>NSPhotoLibraryUsageDescription</key>
    <string>PlantDaddy needs photo library access to choose photos of your plants</string>

    <!-- Network Security for Railway -->
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
</dict>
</plist>
```

## Quick Start: Minimum Required Permissions

**To get started and build the app, you ONLY need these two:**

1. **Privacy - Camera Usage Description**
   ```
   PlantDaddy needs camera access to take photos of your plants
   ```

2. **Privacy - Photo Library Usage Description**
   ```
   PlantDaddy needs photo library access to choose photos of your plants
   ```

**Network settings are optional if:**
- You're only testing on simulator with localhost
- Your Railway backend already uses HTTPS (which it does!)

## Step-by-Step: First Time Setup

### 1. Open Your Xcode Project

```bash
# Navigate to your repo
cd ~/PlantDaddy

# You'll need to create the Xcode project first
# See below for creating from scratch
```

### 2. Create New Xcode Project

Since you don't have an existing project, let's create one:

1. **Open Xcode**
2. **File → New → Project**
3. **Choose Template:**
   - iOS → App → Next
4. **Configure:**
   ```
   Product Name: PlantDaddy
   Team: (Your Apple ID)
   Organization Identifier: com.yourname
   Interface: SwiftUI
   Language: Swift
   ```
5. **Save Location:**
   - Navigate to your PlantDaddy repo
   - Create a folder: `PlantDaddy-iOS`
   - Save there

### 3. Copy Swift Files

1. **In Xcode Project Navigator:**
   - Right-click on "PlantDaddy" folder
   - **New Group** → Name it "Models"
   - Repeat for: "Services", "Views", "Networking", "Config", "App"

2. **In Finder:**
   - Navigate to `PlantDaddy/ios/PlantDaddy/`
   - Drag each folder's contents to the matching group in Xcode
   - ✅ Check "Copy items if needed"
   - ✅ Check "PlantDaddy" target

### 4. Delete Default Files

Xcode creates some default files you don't need:

- Delete `ContentView.swift` (we have our own)
- Keep `Assets.xcassets`
- Keep `Preview Content`

### 5. Add Permissions (Use Option 1 Above)

Go to Target → Info → Custom iOS Target Properties

Add:
- Privacy - Camera Usage Description
- Privacy - Photo Library Usage Description

### 6. Update API URL

Open `Config/APIConfig.swift` and update:

```swift
case .production:
    return "https://your-actual-railway-url.up.railway.app/api"
```

### 7. Build and Run!

1. **Select Simulator:**
   - iPhone 15 (or any recent iPhone)

2. **Press ▶️ or Cmd + R**

3. **Wait for build...**

4. **App should launch!**

## Common Issues

### "Info.plist not found"
- Use Option 1 (Target Settings) - it's built-in!
- No need to create the file unless you need advanced settings

### "Missing required modules"
- Make sure all .swift files are added to the target
- Right-click file → Target Membership → Check "PlantDaddy"

### "Cannot find 'PlantDaddyApp' in scope"
- Delete the default ContentView.swift Xcode created
- Make sure PlantDaddyApp.swift is added to target

### Build fails with "duplicate symbols"
- You might have both ContentView.swift files
- Delete the default one Xcode created

## Testing Without Device

**Simulator Limitations:**
- ✅ Photo Library works (can add test images)
- ❌ Camera doesn't work (simulator has no camera)
- ✅ API calls work fine
- ✅ All UI works perfectly

**To Test Camera:**
- Need a physical iPhone/iPad
- Or just test photo library picker for now

## What You Can Test Now

Even without camera on simulator:

1. **Login/Register** - Create account
2. **Add Plants** - Use photo library picker
3. **View Plants** - See plant list
4. **Water Plants** - One-tap watering
5. **Plant Details** - View all info

## Next Steps

1. ✅ Create Xcode project
2. ✅ Copy Swift files
3. ✅ Add permissions
4. ✅ Update API URL
5. ✅ Build and run
6. 🎉 Test the app!

Need help with any of these steps? Let me know where you're stuck!
