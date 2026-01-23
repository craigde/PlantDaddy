# iOS Permissions Guide

This guide explains how to configure permissions for camera, photo library, and notifications in your PlantDaddy iOS app.

## Required Permissions

### 1. Camera Access

**Why:** Allow users to take photos of their plants

**Add to Info.plist:**
```xml
<key>NSCameraUsageDescription</key>
<string>PlantDaddy needs camera access to take photos of your plants</string>
```

### 2. Photo Library Access

**Why:** Allow users to choose existing photos from their library

**Add to Info.plist:**
```xml
<key>NSPhotoLibraryUsageDescription</key>
<string>PlantDaddy needs photo library access to choose photos of your plants</string>
```

## How to Add Permissions in Xcode

### Method 1: Using Property List Editor

1. **Open Info.plist**
   - In Project Navigator, find `Info.plist`
   - Click to open

2. **Add Camera Permission**
   - Click the **+** button next to "Information Property List"
   - Select **"Privacy - Camera Usage Description"** from dropdown
   - Set value to: `PlantDaddy needs camera access to take photos of your plants`

3. **Add Photo Library Permission**
   - Click the **+** button again
   - Select **"Privacy - Photo Library Usage Description"**
   - Set value to: `PlantDaddy needs photo library access to choose photos of your plants`

### Method 2: Using Source Code Editor

1. **Open as Source Code**
   - Right-click `Info.plist`
   - Select **"Open As" → "Source Code"**

2. **Add Permission Keys**
   - Find the `<dict>` tag near the top
   - Add the following before the closing `</dict>`:

```xml
<key>NSCameraUsageDescription</key>
<string>PlantDaddy needs camera access to take photos of your plants</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>PlantDaddy needs photo library access to choose photos of your plants</string>
```

3. **Save File**
   - Press `Cmd + S` to save

## Permission Request Flow

### How It Works

1. **First Time:**
   - User taps "Add Photo" or camera button
   - iOS shows permission dialog
   - User grants or denies permission

2. **Permission Granted:**
   - Camera/library opens immediately
   - User can take or select photos

3. **Permission Denied:**
   - Alert shown to user
   - User directed to Settings to enable

### Testing Permissions

1. **Reset Permissions** (Simulator):
   ```
   Settings → General → Transfer or Reset → Reset → Reset Location & Privacy
   ```

2. **Reset Permissions** (Device):
   ```
   Settings → General → Reset → Reset Location & Privacy
   ```

3. **Check Permission Status:**
   - Go to: `Settings → PlantDaddy`
   - Toggle permissions on/off for testing

## Permission Descriptions

### Writing Good Descriptions

**❌ Bad:**
```xml
<string>This app needs camera</string>
```

**✅ Good:**
```xml
<string>PlantDaddy needs camera access to take photos of your plants</string>
```

**Why:**
- Explains **what** the permission is for
- Explains **why** it's needed
- Uses app name for clarity
- More likely to be granted by users

### App Review Requirements

Apple requires:
- ✅ Clear, specific reason for permission
- ✅ Description in user-facing language
- ✅ Accurate reflection of actual usage
- ❌ Generic descriptions will be rejected

## Complete Info.plist Example

Here's a complete `Info.plist` with all PlantDaddy permissions:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleDevelopmentRegion</key>
    <string>$(DEVELOPMENT_LANGUAGE)</string>
    <key>CFBundleDisplayName</key>
    <string>PlantDaddy</string>
    <key>CFBundleExecutable</key>
    <string>$(EXECUTABLE_NAME)</string>
    <key>CFBundleIdentifier</key>
    <string>$(PRODUCT_BUNDLE_IDENTIFIER)</string>
    <key>CFBundleName</key>
    <string>$(PRODUCT_NAME)</string>
    <key>CFBundlePackageType</key>
    <string>$(PRODUCT_BUNDLE_PACKAGE_TYPE)</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>

    <!-- Camera Permission -->
    <key>NSCameraUsageDescription</key>
    <string>PlantDaddy needs camera access to take photos of your plants</string>

    <!-- Photo Library Permission -->
    <key>NSPhotoLibraryUsageDescription</key>
    <string>PlantDaddy needs photo library access to choose photos of your plants</string>

    <!-- Network Security -->
    <key>NSAppTransportSecurity</key>
    <dict>
        <key>NSAllowsArbitraryLoads</key>
        <false/>
        <key>NSExceptionDomains</key>
        <dict>
            <!-- Railway Production -->
            <key>up.railway.app</key>
            <dict>
                <key>NSIncludesSubdomains</key>
                <true/>
                <key>NSExceptionAllowsInsecureHTTPLoads</key>
                <false/>
            </dict>
            <!-- Local Development (remove for production) -->
            <key>localhost</key>
            <dict>
                <key>NSExceptionAllowsInsecureHTTPLoads</key>
                <true/>
            </dict>
        </dict>
    </dict>
</dict>
</plist>
```

## Troubleshooting

### "This app has crashed because it attempted to access privacy-sensitive data..."

**Problem:** Missing permission key in Info.plist

**Solution:**
1. Check crash log for permission type
2. Add appropriate key to Info.plist
3. Rebuild app

### Permission dialog doesn't appear

**Problem:** Permission was previously denied

**Solution:**
1. Delete app from device/simulator
2. Clean build folder: `Product → Clean Build Folder`
3. Rebuild and reinstall app
4. Permission dialog will appear again

### "Camera not available"

**Problem:** Testing on simulator (doesn't have real camera)

**Solution:**
- Test camera features on physical device
- Use photo library picker (works in simulator)

## Optional Permissions (For Future Features)

### Push Notifications

```xml
<key>NSUserNotificationUsageDescription</key>
<string>PlantDaddy sends reminders when your plants need watering</string>
```

### Location (For Plant Location Features)

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>PlantDaddy uses your location to track where your plants are located</string>
```

### Contacts (For Sharing Plants)

```xml
<key>NSContactsUsageDescription</key>
<string>PlantDaddy needs access to contacts to share plants with friends</string>
```

## Privacy Best Practices

1. **Request Only What You Need**
   - Don't ask for permissions you don't use
   - Apple may reject apps with unused permissions

2. **Request at Appropriate Time**
   - Ask when user takes action requiring permission
   - Don't ask for all permissions at app launch

3. **Handle Denial Gracefully**
   - Provide alternative if permission denied
   - Show helpful message explaining how to enable

4. **Be Transparent**
   - Explain why you need permission
   - Update descriptions if usage changes

## Testing Checklist

- [ ] Camera permission dialog appears when taking photo
- [ ] Photo library permission dialog appears when choosing photo
- [ ] Permission descriptions are clear and accurate
- [ ] App handles denied permissions gracefully
- [ ] App works correctly after granting permissions
- [ ] Info.plist includes all required keys
- [ ] Descriptions match actual app usage

## App Store Submission

Before submitting to App Store:

1. **Remove localhost exception** from Info.plist
2. **Test all permission flows** on physical device
3. **Screenshot permission dialogs** for review notes
4. **Verify descriptions** match App Store description
5. **Test denial scenarios** - app shouldn't crash

## Resources

- [Apple Privacy Documentation](https://developer.apple.com/documentation/bundleresources/information_property_list/protected_resources)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/#privacy)
- [PhotosUI Framework](https://developer.apple.com/documentation/photokit)
- [UIImagePickerController](https://developer.apple.com/documentation/uikit/uiimagepickercontroller)

---

**Ready to go!** Add these permissions to your Info.plist and your camera features will work perfectly.
