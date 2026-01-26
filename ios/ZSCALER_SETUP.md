# Installing Zscaler Certificate in iOS Simulator

The TLS error occurs because iOS Simulator doesn't trust Zscaler's certificate. Here's how to fix it:

## Step 1: Export Zscaler Certificate from macOS

1. **Open Keychain Access** (Cmd + Space, type "Keychain Access")

2. **Select "System" keychain** in the left sidebar

3. **Search for "Zscaler"** in the search box

4. **Find the root certificate** - Look for:
   - "Zscaler Root CA"
   - Or any certificate with "Zscaler" in the name that shows as a root CA

5. **Right-click the certificate** → **Export "Zscaler Root CA..."**

6. **Save it** as `zscaler-root.cer` to your **Desktop**
   - File Format: Certificate (.cer)

## Step 2: Install Certificate in iOS Simulator

### Method A: Drag and Drop (Easiest)

1. **Launch iOS Simulator** (run your app or open manually)

2. **Drag the `zscaler-root.cer` file** from Desktop onto the Simulator window

3. **Safari will open** showing the certificate profile

4. Click **"Allow"** when prompted

5. **Close Safari**

### Method B: Using Safari (Alternative)

1. **Upload certificate to a web server** or email it to yourself

2. **Open Safari in Simulator**

3. **Navigate to the certificate** or open the email

4. **Tap to download** the certificate

## Step 3: Install the Profile

1. **Open Settings** app in iOS Simulator

2. **Go to General** → Scroll down to **"VPN & Device Management"**
   - (Or "Profiles" on older iOS versions)

3. **Tap the Zscaler profile**

4. **Tap "Install"** in the top right

5. **Tap "Install" again** (you'll see it 2-3 times)

6. **Tap "Done"**

## Step 4: Trust the Certificate (CRITICAL)

1. Still in **Settings** app

2. **Go to General** → **About** → **Certificate Trust Settings**
   - Scroll all the way down to find this

3. **Find "Zscaler Root CA"**

4. **Toggle it ON** (enable full trust)

5. **Tap "Continue"** when warned

## Step 5: Verify and Test

1. **Close your PlantDaddy app** completely (swipe up in app switcher)

2. **Rebuild and run** from Xcode (Cmd + R)

3. **Try logging in** - TLS error should be gone!

## Troubleshooting

### Certificate not appearing in Settings
- Make sure you tapped "Allow" when Safari opened
- Try dragging the certificate file again
- Restart the Simulator

### "Certificate Trust Settings" not showing
- You need to install a profile first (Step 3)
- Only appears if you have installed at least one certificate

### Still getting TLS errors after installation
- Make sure you enabled trust in Step 4 (most common mistake)
- Restart the simulator: Device → Restart
- Clean build in Xcode: Cmd + Shift + K, then Cmd + R

### Can't find Zscaler certificate in Keychain
- Look in **System Roots** keychain
- Search for "zscaler" (lowercase)
- It might be named differently, look for anything with "Zscaler" or your company name

## Alternative: Test on Physical Device

If you can't get the certificate working in Simulator:
1. Install Xcode on your iOS device via TestFlight or direct install
2. Physical devices connected to the same network won't have Zscaler
3. Or use your phone's hotspot to bypass Zscaler

## Quick Check - Is Zscaler Installed?

Run this in macOS Terminal to see if Zscaler is intercepting:
```bash
security find-certificate -a -c Zscaler | grep "labl"
```

If you see output, Zscaler is installed.

---

**Once the certificate is trusted in the simulator, you won't need to do this again** unless you reset the simulator or create a new one.
