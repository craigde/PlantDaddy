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

            IdentifyPlantView()
                .tabItem {
                    Label("Identify", systemImage: "camera.viewfinder")
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
    let emailEnabled: Bool?
    let emailAddress: String?
    let sendgridApiKey: Bool?
    let reminderTime: String?
    let reminderDaysBefore: Int?
    let lastUpdated: String?
}

struct NotificationSettingsUpdate: Codable {
    var enabled: Bool?
    var reminderTime: String?
    var reminderDaysBefore: Int?
}

struct TestNotificationResponse: Codable {
    let success: Bool
    let message: String
    let results: TestNotificationResults?
}

struct TestNotificationResults: Codable {
    let email: Bool?
    let apns: Bool?
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
                    NavigationLink {
                        LocationManagementView()
                    } label: {
                        HStack {
                            Image(systemName: "mappin.and.ellipse")
                                .foregroundColor(.blue)
                            Text("Manage Locations")
                            Spacer()
                            Text("\(PlantService.shared.locations.count)")
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Text("Locations")
                } footer: {
                    Text("Locations are the rooms or areas where you keep your plants.")
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
                            Image(systemName: "bell.badge")
                            Text("Notification Settings")
                        }
                    }
                } header: {
                    Text("Notifications")
                } footer: {
                    Text("Configure when and how you receive watering reminders.")
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
    @State private var reminderTime = "08:00"
    @State private var reminderDaysBefore = 0

    @State private var alertTitle = ""
    @State private var alertMessage = ""
    @State private var showAlert = false

    private let apiClient = APIClient.shared

    private let timeOptions: [(label: String, value: String)] = {
        (6...22).map { hour in
            let timeStr = String(format: "%02d:00", hour)
            let label: String
            if hour < 12 {
                label = "\(hour):00 AM"
            } else if hour == 12 {
                label = "12:00 PM"
            } else {
                label = "\(hour - 12):00 PM"
            }
            return (label: label, value: timeStr)
        }
    }()

    private let advanceOptions: [(label: String, value: Int)] = [
        ("On the day they're due (+ overdue)", 0),
        ("1 day before", 1),
        ("2 days before", 2),
        ("3 days before", 3)
    ]

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
                Picker("Daily Reminder Time", selection: $reminderTime) {
                    ForEach(timeOptions, id: \.value) { option in
                        Text(option.label).tag(option.value)
                    }
                }

                Picker("Advance Reminder", selection: $reminderDaysBefore) {
                    ForEach(advanceOptions, id: \.value) { option in
                        Text(option.label).tag(option.value)
                    }
                }
            } header: {
                Text("Reminder Preferences")
            } footer: {
                Text("Choose when to receive your daily watering reminder and how far in advance.")
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
        .navigationTitle("Notifications")
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
            reminderTime = settings.reminderTime ?? "08:00"
            reminderDaysBefore = settings.reminderDaysBefore ?? 0
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
            update.reminderTime = reminderTime
            update.reminderDaysBefore = reminderDaysBefore

            let _: NotificationSettingsResponse = try await apiClient.request(
                endpoint: .notificationSettings,
                method: .post,
                body: update
            )

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
