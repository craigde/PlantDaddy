//
//  PlantDaddyApp.swift
//  PlantDaddy
//
//  Main app entry point
//

import SwiftUI
import UIKit
import UserNotifications

// AppDelegate to handle remote notification registration, foreground display, and actions
class AppDelegate: NSObject, UIApplicationDelegate, UNUserNotificationCenterDelegate {
    func application(_ application: UIApplication, didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil) -> Bool {
        // Set ourselves as the notification center delegate so we can display
        // push notifications even when the app is in the foreground
        UNUserNotificationCenter.current().delegate = self

        // Register actionable notification categories
        registerNotificationCategories()

        return true
    }

    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task { @MainActor in
            NotificationService.shared.registerDeviceToken(deviceToken)
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register for remote notifications: \(error)")
    }

    // Show push notifications even when the app is in the foreground
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                willPresent notification: UNNotification,
                                withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        completionHandler([.banner, .sound, .badge])
    }

    // Handle notification action buttons
    func userNotificationCenter(_ center: UNUserNotificationCenter,
                                didReceive response: UNNotificationResponse,
                                withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        let actionIdentifier = response.actionIdentifier

        switch actionIdentifier {
        case "WATER_NOW_ACTION":
            // Water a single plant
            if let plantId = userInfo["plantId"] as? Int {
                Task {
                    await waterPlantFromNotification(plantId: plantId)
                }
            }
        case "WATER_ALL_ACTION":
            // Water all overdue plants
            if let plantIds = userInfo["plantIds"] as? [Int] {
                Task {
                    await waterAllFromNotification(plantIds: plantIds)
                }
            } else {
                // No specific IDs — water all overdue
                Task {
                    await waterAllFromNotification(plantIds: nil)
                }
            }
        default:
            break
        }

        completionHandler()
    }

    // MARK: - Notification Categories

    private func registerNotificationCategories() {
        let waterNowAction = UNNotificationAction(
            identifier: "WATER_NOW_ACTION",
            title: "Water Now",
            options: []
        )

        let waterAllAction = UNNotificationAction(
            identifier: "WATER_ALL_ACTION",
            title: "Water All",
            options: []
        )

        let plantWateringCategory = UNNotificationCategory(
            identifier: "PLANT_WATERING",
            actions: [waterNowAction],
            intentIdentifiers: [],
            options: []
        )

        let wateringSummaryCategory = UNNotificationCategory(
            identifier: "WATERING_SUMMARY",
            actions: [waterAllAction],
            intentIdentifiers: [],
            options: []
        )

        UNUserNotificationCenter.current().setNotificationCategories([
            plantWateringCategory,
            wateringSummaryCategory
        ])
    }

    // MARK: - Notification Action Handlers

    private func waterPlantFromNotification(plantId: Int) async {
        do {
            struct WaterResponse: Decodable {
                let plant: Plant
            }
            let _: WaterResponse = try await APIClient.shared.request(
                endpoint: .waterPlant(id: plantId),
                method: .post
            )
            print("Watered plant \(plantId) from notification")
        } catch {
            print("Failed to water plant \(plantId) from notification: \(error)")
        }
    }

    private func waterAllFromNotification(plantIds: [Int]?) async {
        do {
            struct WaterOverdueRequest: Encodable {
                let plantIds: [Int]?
            }
            struct WaterOverdueResponse: Decodable {
                let message: String
                let wateredCount: Int
            }
            let response: WaterOverdueResponse = try await APIClient.shared.request(
                endpoint: .waterOverdue,
                method: .post,
                body: WaterOverdueRequest(plantIds: plantIds)
            )
            print("Watered \(response.wateredCount) plants from notification")
        } catch {
            print("Failed to water all plants from notification: \(error)")
        }
    }
}

@main
struct PlantDaddyApp: App {
    @UIApplicationDelegateAdaptor(AppDelegate.self) var appDelegate
    @StateObject private var authService = AuthService.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(authService)
        }
    }
}

struct ContentView: View {
    @EnvironmentObject var authService: AuthService
    @ObservedObject private var householdService = HouseholdService.shared

    var body: some View {
        ZStack {
            if authService.isAuthenticated {
                if !householdService.hasLoaded {
                    // Still loading households — show a brief loading state
                    ProgressView()
                } else if householdService.households.isEmpty {
                    HouseholdOnboardingView()
                } else {
                    MainTabView()
                        .task {
                            // Request notification permission when user is authenticated
                            _ = await NotificationService.shared.requestAuthorization()
                        }
                }
            } else {
                LoginView()
            }
        }
        .ignoresSafeArea()
        .animation(.easeInOut, value: authService.isAuthenticated)
    }
}

#Preview {
    ContentView()
        .environmentObject(AuthService.shared)
}
