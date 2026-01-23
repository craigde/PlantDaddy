//
//  NotificationService.swift
//  PlantDaddy
//
//  Service for managing local and remote notifications
//

import Foundation
import UserNotifications
import Combine

@MainActor
class NotificationService: ObservableObject {
    static let shared = NotificationService()

    @Published var isAuthorized: Bool = false
    @Published var deviceToken: String?

    private let notificationCenter = UNUserNotificationCenter.current()

    private init() {
        Task {
            await checkAuthorizationStatus()
        }
    }

    // MARK: - Authorization

    /// Request notification permission from user
    func requestAuthorization() async throws -> Bool {
        let options: UNAuthorizationOptions = [.alert, .badge, .sound]

        let granted = try await notificationCenter.requestAuthorization(options: options)
        isAuthorized = granted

        if granted {
            await registerForRemoteNotifications()
        }

        return granted
    }

    /// Check current authorization status
    func checkAuthorizationStatus() async {
        let settings = await notificationCenter.notificationSettings()
        isAuthorized = settings.authorizationStatus == .authorized
    }

    /// Register for remote (push) notifications
    private func registerForRemoteNotifications() async {
        await MainActor.run {
            #if !targetEnvironment(simulator)
            UIApplication.shared.registerForRemoteNotifications()
            #endif
        }
    }

    // MARK: - Device Token

    /// Handle device token registration (called from AppDelegate)
    func didRegisterForRemoteNotifications(deviceToken: Data) {
        let tokenParts = deviceToken.map { data in String(format: "%02.2hhx", data) }
        let token = tokenParts.joined()
        self.deviceToken = token

        // TODO: Send token to backend
        Task {
            await sendDeviceTokenToBackend(token)
        }
    }

    /// Send device token to backend for APNs
    private func sendDeviceTokenToBackend(_ token: String) async {
        // TODO: Implement backend endpoint for registering device token
        print("Device token: \(token)")
        // This would be something like:
        // try await APIClient.shared.request(
        //     endpoint: .registerDeviceToken,
        //     method: .post,
        //     body: ["token": token, "platform": "ios"]
        // )
    }

    // MARK: - Local Notifications

    /// Schedule a local notification for plant watering
    func scheduleWateringReminder(for plant: Plant) async throws {
        // Remove any existing notifications for this plant
        await removeWateringReminder(for: plant.id)

        // Calculate notification date (day before watering is due)
        let notificationDate = Calendar.current.date(
            byAdding: .day,
            value: -1,
            to: plant.nextWateringDate
        ) ?? plant.nextWateringDate

        // Create notification content
        let content = UNMutableNotificationContent()
        content.title = "🪴 Water \(plant.name)"
        content.body = "\(plant.name) needs watering tomorrow"
        content.sound = .default
        content.badge = 1
        content.userInfo = ["plantId": plant.id]

        // Create trigger
        let triggerDate = Calendar.current.dateComponents(
            [.year, .month, .day, .hour, .minute],
            from: notificationDate
        )
        let trigger = UNCalendarNotificationTrigger(dateMatching: triggerDate, repeats: false)

        // Create request
        let request = UNNotificationRequest(
            identifier: "plant-\(plant.id)",
            content: content,
            trigger: trigger
        )

        try await notificationCenter.add(request)
    }

    /// Schedule notifications for all plants
    func scheduleAllPlantReminders(plants: [Plant]) async {
        for plant in plants where plant.needsWatering {
            try? await scheduleWateringReminder(for: plant)
        }
    }

    /// Remove watering reminder for a specific plant
    func removeWateringReminder(for plantId: Int) async {
        notificationCenter.removePendingNotificationRequests(
            withIdentifiers: ["plant-\(plantId)"]
        )
    }

    /// Remove all pending notifications
    func removeAllNotifications() {
        notificationCenter.removeAllPendingNotificationRequests()
    }

    /// Get all pending notifications
    func getPendingNotifications() async -> [UNNotificationRequest] {
        await notificationCenter.pendingNotificationRequests()
    }

    // MARK: - Badge Management

    /// Update app badge count
    func updateBadgeCount(_ count: Int) {
        #if !targetEnvironment(simulator)
        Task { @MainActor in
            UIApplication.shared.applicationIconBadgeNumber = count
        }
        #endif
    }

    /// Clear app badge
    func clearBadge() {
        updateBadgeCount(0)
    }

    // MARK: - Testing

    /// Send a test notification immediately
    func sendTestNotification() async throws {
        let content = UNMutableNotificationContent()
        content.title = "🪴 PlantDaddy"
        content.body = "Notifications are working!"
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: trigger
        )

        try await notificationCenter.add(request)
    }
}

// MARK: - Notification Settings Helper

extension UNAuthorizationStatus {
    var description: String {
        switch self {
        case .notDetermined:
            return "Not Determined"
        case .denied:
            return "Denied"
        case .authorized:
            return "Authorized"
        case .provisional:
            return "Provisional"
        case .ephemeral:
            return "Ephemeral"
        @unknown default:
            return "Unknown"
        }
    }
}
