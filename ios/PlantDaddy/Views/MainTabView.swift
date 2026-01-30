//
//  MainTabView.swift
//  PlantDaddy
//
//  Main tab navigation view
//

import SwiftUI
import UserNotifications

struct MainTabView: View {
    @ObservedObject private var authService = AuthService.shared

    var body: some View {
        TabView {
            PlantListView()
                .tabItem {
                    Label("Plants", systemImage: "leaf.fill")
                }

            PlantExplorerView()
                .tabItem {
                    Label("Explore", systemImage: "magnifyingglass")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
    }
}

// MARK: - Notification Settings API Models

struct NotificationSettingsResponse: Codable {
    let id: Int?
    let enabled: Bool
    let pushoverEnabled: Bool
    let pushoverAppToken: Bool  // Server returns boolean indicating if token exists
    let pushoverUserKey: Bool
    let emailEnabled: Bool
    let emailAddress: String?
    let sendgridApiKey: Bool
    let lastUpdated: String?
}

struct NotificationSettingsUpdate: Codable {
    var enabled: Bool?
    var pushoverEnabled: Bool?
    var pushoverAppToken: String?
    var pushoverUserKey: String?
    var emailEnabled: Bool?
    var emailAddress: String?
    var sendgridApiKey: String?
}

struct TestNotificationResponse: Codable {
    let success: Bool
    let message: String
    let results: TestNotificationResults?
}

struct TestNotificationResults: Codable {
    let pushover: Bool?
    let email: Bool?
}

// MARK: - Settings View

struct SettingsView: View {
    @ObservedObject private var authService = AuthService.shared
    @ObservedObject private var notificationService = NotificationService.shared
    @ObservedObject private var householdService = HouseholdService.shared

    var body: some View {
        NavigationStack {
            List {
                Section("Account") {
                    if let user = authService.currentUser {
                        HStack {
                            Text("Username")
                            Spacer()
                            Text(user.username)
                                .foregroundColor(.secondary)
                        }
                    }

                    Button("Logout") {
                        authService.logout()
                    }
                    .foregroundColor(.red)
                }

                Section {
                    if let household = householdService.activeHousehold {
                        NavigationLink {
                            HouseholdDetailView()
                        } label: {
                            HStack {
                                Image(systemName: "house.fill")
                                    .foregroundColor(.green)
                                VStack(alignment: .leading) {
                                    Text(household.name)
                                    Text(household.role.capitalized)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                            }
                        }
                    }

                    if householdService.households.count > 1 {
                        NavigationLink {
                            HouseholdSwitcherView()
                        } label: {
                            HStack {
                                Image(systemName: "arrow.left.arrow.right")
                                Text("Switch Household")
                            }
                        }
                    }

                    NavigationLink {
                        JoinHouseholdView()
                    } label: {
                        HStack {
                            Image(systemName: "plus.circle")
                            Text("Add Household")
                        }
                    }
                } header: {
                    Text("Household")
                } footer: {
                    Text("Create additional households for different locations (e.g., vacation home) or join one with an invite code.")
                }

                Section {
                    HStack {
                        Image(systemName: notificationService.isAuthorized ? "bell.badge.fill" : "bell.slash.fill")
                            .foregroundColor(notificationService.isAuthorized ? .green : .secondary)
                        Text("Device Notifications")
                        Spacer()
                        Text(notificationService.isAuthorized ? "Enabled" : "Disabled")
                            .foregroundColor(.secondary)
                    }

                    if !notificationService.isAuthorized {
                        Button("Enable in Settings") {
                            if let url = URL(string: UIApplication.openSettingsURLString) {
                                UIApplication.shared.open(url)
                            }
                        }
                    }

                    NavigationLink {
                        ServerNotificationSettingsView()
                    } label: {
                        HStack {
                            Image(systemName: "server.rack")
                            Text("Server Notifications")
                        }
                    }
                } header: {
                    Text("Notifications")
                } footer: {
                    Text("Device notifications alert you locally. Server notifications send via Pushover or email even when the app is closed.")
                }

                Section("About") {
                    HStack {
                        Text("Version")
                        Spacer()
                        Text("1.0.0")
                            .foregroundColor(.secondary)
                    }
                }
            }
            .navigationTitle("Settings")
            .navigationBarTitleDisplayMode(.large)
        }
    }
}

// MARK: - Server Notification Settings View

struct ServerNotificationSettingsView: View {
    @State private var isLoading = true
    @State private var isSaving = false
    @State private var isTesting = false

    @State private var enabled = true
    @State private var pushoverEnabled = true
    @State private var pushoverAppToken = ""
    @State private var pushoverUserKey = ""
    @State private var hasPushoverAppToken = false
    @State private var hasPushoverUserKey = false

    @State private var emailEnabled = false
    @State private var emailAddress = ""
    @State private var sendgridApiKey = ""
    @State private var hasSendgridApiKey = false

    @State private var alertTitle = ""
    @State private var alertMessage = ""
    @State private var showAlert = false

    private let apiClient = APIClient.shared

    var body: some View {
        Form {
            Section {
                Toggle("Notifications Enabled", isOn: $enabled)
            } header: {
                Text("General")
            } footer: {
                Text("Enable or disable all server-side notifications.")
            }

            Section {
                Toggle("Pushover Enabled", isOn: $pushoverEnabled)

                VStack(alignment: .leading, spacing: 4) {
                    Text("App Token")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    SecureField(hasPushoverAppToken ? "••••••• (configured)" : "Enter Pushover app token", text: $pushoverAppToken)
                        .textContentType(.none)
                        .autocorrectionDisabled()
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("User Key")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    SecureField(hasPushoverUserKey ? "••••••• (configured)" : "Enter Pushover user key", text: $pushoverUserKey)
                        .textContentType(.none)
                        .autocorrectionDisabled()
                }
            } header: {
                Text("Pushover")
            } footer: {
                Text("Get a Pushover account at pushover.net. Leave fields empty to keep existing values.")
            }

            Section {
                Toggle("Email Enabled", isOn: $emailEnabled)

                VStack(alignment: .leading, spacing: 4) {
                    Text("Email Address")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    TextField("you@example.com", text: $emailAddress)
                        .textContentType(.emailAddress)
                        .keyboardType(.emailAddress)
                        .autocapitalization(.none)
                        .autocorrectionDisabled()
                }

                VStack(alignment: .leading, spacing: 4) {
                    Text("SendGrid API Key")
                        .font(.caption)
                        .foregroundColor(.secondary)
                    SecureField(hasSendgridApiKey ? "••••••• (configured)" : "Enter SendGrid API key", text: $sendgridApiKey)
                        .textContentType(.none)
                        .autocorrectionDisabled()
                }
            } header: {
                Text("Email")
            } footer: {
                Text("Requires a SendGrid account for email delivery.")
            }

            Section {
                Button {
                    Task { await saveSettings() }
                } label: {
                    HStack {
                        Spacer()
                        if isSaving {
                            ProgressView()
                        } else {
                            Text("Save Settings")
                        }
                        Spacer()
                    }
                }
                .disabled(isSaving)

                Button {
                    Task { await testNotifications() }
                } label: {
                    HStack {
                        Spacer()
                        if isTesting {
                            ProgressView()
                        } else {
                            Text("Send Test Notification")
                        }
                        Spacer()
                    }
                }
                .disabled(isTesting)
            }
        }
        .navigationTitle("Server Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .overlay {
            if isLoading {
                ProgressView("Loading settings...")
            }
        }
        .task {
            await loadSettings()
        }
        .alert(alertTitle, isPresented: $showAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(alertMessage)
        }
    }

    // MARK: - API Calls

    private func loadSettings() async {
        isLoading = true
        do {
            let settings: NotificationSettingsResponse = try await apiClient.request(
                endpoint: .notificationSettings,
                method: .get
            )
            enabled = settings.enabled
            pushoverEnabled = settings.pushoverEnabled
            hasPushoverAppToken = settings.pushoverAppToken
            hasPushoverUserKey = settings.pushoverUserKey
            emailEnabled = settings.emailEnabled
            emailAddress = settings.emailAddress ?? ""
            hasSendgridApiKey = settings.sendgridApiKey
        } catch {
            alertTitle = "Error"
            alertMessage = "Failed to load notification settings: \(error.localizedDescription)"
            showAlert = true
        }
        isLoading = false
    }

    private func saveSettings() async {
        isSaving = true
        do {
            var update = NotificationSettingsUpdate()
            update.enabled = enabled
            update.pushoverEnabled = pushoverEnabled
            update.emailEnabled = emailEnabled

            // Only send tokens if user entered new values
            if !pushoverAppToken.isEmpty {
                update.pushoverAppToken = pushoverAppToken
            }
            if !pushoverUserKey.isEmpty {
                update.pushoverUserKey = pushoverUserKey
            }
            if !emailAddress.isEmpty {
                update.emailAddress = emailAddress
            }
            if !sendgridApiKey.isEmpty {
                update.sendgridApiKey = sendgridApiKey
            }

            let _: NotificationSettingsResponse = try await apiClient.request(
                endpoint: .notificationSettings,
                method: .post,
                body: update
            )

            // Clear entered secrets after save
            pushoverAppToken = ""
            pushoverUserKey = ""
            sendgridApiKey = ""

            // Reload to refresh the "configured" indicators
            await loadSettings()

            alertTitle = "Saved"
            alertMessage = "Notification settings updated successfully."
            showAlert = true
        } catch {
            alertTitle = "Error"
            alertMessage = "Failed to save settings: \(error.localizedDescription)"
            showAlert = true
        }
        isSaving = false
    }

    private func testNotifications() async {
        isTesting = true
        do {
            let response: TestNotificationResponse = try await apiClient.request(
                endpoint: .testNotification,
                method: .post
            )

            alertTitle = response.success ? "Success" : "Failed"
            alertMessage = response.message
            showAlert = true
        } catch {
            alertTitle = "Error"
            alertMessage = "Failed to send test notification: \(error.localizedDescription)"
            showAlert = true
        }
        isTesting = false
    }
}

#Preview {
    MainTabView()
}
