//
//  NotificationService.swift
//  PlantDaddy
//
//  Service for managing local and remote notifications
//

import Foundation
import UserNotifications

@MainActor
class NotificationService: ObservableObject {
    static let shared = NotificationService()

    @Published var isAuthorized: Bool = false

    private let notificationCenter = UNUserNotificationCenter.current()

    private init() {
        Task {
            await checkAuthorizationStatus()
        }
    }

    // MARK: - Authorization

    /// Request notification permission from user
    func requestAuthorization() async -> Bool {
        do {
            let options: UNAuthorizationOptions = [.alert, .badge, .sound]
            let granted = try await notificationCenter.requestAuthorization(options: options)
            isAuthorized = granted
            return granted
        } catch {
            print("Notification authorization error: \(error)")
            return false
        }
    }

    /// Check current authorization status
    func checkAuthorizationStatus() async {
        let settings = await notificationCenter.notificationSettings()
        isAuthorized = settings.authorizationStatus == .authorized
    }

    // MARK: - Local Notifications

    /// Schedule watering reminders for all plants.
    /// Schedules a notification at 8 AM on the day each plant needs watering.
    /// Skips plants more than 30 days out to stay under the 64 notification limit.
    func scheduleAllPlantReminders(_ plants: [Plant]) async {
        // Clear existing plant reminders first
        let pending = await notificationCenter.pendingNotificationRequests()
        let plantIds = pending
            .filter { $0.identifier.hasPrefix("plant-") }
            .map { $0.identifier }
        notificationCenter.removePendingNotificationRequests(withIdentifiers: plantIds)

        for plant in plants {
            await scheduleWateringReminder(for: plant)
        }
    }

    /// Schedule a notification for a single plant.
    /// - Already overdue: fires in 5 seconds
    /// - Due today or within 30 days: fires at 8 AM on the due date
    /// - More than 30 days out: skipped (will be scheduled on next app open)
    func scheduleWateringReminder(for plant: Plant) async {
        let content = UNMutableNotificationContent()
        content.title = "Time to water \(plant.name)"
        content.sound = .default
        content.userInfo = ["plantId": plant.id]

        let dueDate = plant.nextWateringDate
        let now = Date()

        // Skip plants more than 30 days out
        let daysUntil = Calendar.current.dateComponents([.day], from: now, to: dueDate).day ?? 0
        if daysUntil > 30 {
            return
        }

        let trigger: UNNotificationTrigger

        if dueDate <= now {
            // Already overdue — notify soon
            let daysOverdue = Calendar.current.dateComponents([.day], from: dueDate, to: now).day ?? 0
            content.body = "\(plant.name) in \(plant.location) is \(max(daysOverdue, 1)) day\(daysOverdue == 1 ? "" : "s") overdue for watering"
            content.interruptionLevel = .timeSensitive
            trigger = UNTimeIntervalNotificationTrigger(timeInterval: 5, repeats: false)
        } else {
            // Upcoming — schedule for 8 AM on the due date
            if daysUntil <= 1 {
                content.body = "\(plant.name) in \(plant.location) needs watering today"
            } else {
                content.body = "\(plant.name) in \(plant.location) needs watering"
            }
            var dateComponents = Calendar.current.dateComponents([.year, .month, .day], from: dueDate)
            dateComponents.hour = 8
            dateComponents.minute = 0
            trigger = UNCalendarNotificationTrigger(dateMatching: dateComponents, repeats: false)
        }

        let request = UNNotificationRequest(
            identifier: "plant-\(plant.id)",
            content: content,
            trigger: trigger
        )

        do {
            try await notificationCenter.add(request)
        } catch {
            print("Failed to schedule notification for \(plant.name): \(error)")
        }
    }

    /// Remove watering reminder for a specific plant
    func removeWateringReminder(for plantId: Int) {
        notificationCenter.removePendingNotificationRequests(
            withIdentifiers: ["plant-\(plantId)"]
        )
    }

    /// Remove all pending notifications
    func removeAllNotifications() {
        notificationCenter.removeAllPendingNotificationRequests()
    }

    // MARK: - Badge Management

    /// Update app badge count with number of overdue plants
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
    func sendTestNotification() async {
        let content = UNMutableNotificationContent()
        content.title = "PlantDaddy"
        content.body = "Notifications are working!"
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(timeInterval: 1, repeats: false)
        let request = UNNotificationRequest(
            identifier: UUID().uuidString,
            content: content,
            trigger: trigger
        )

        try? await notificationCenter.add(request)
    }
}
