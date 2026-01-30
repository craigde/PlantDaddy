//
//  NotificationService.swift
//  PlantDaddy
//
//  Service for managing remote notifications and badge count
//

import Foundation
import UIKit
import UserNotifications
import Combine

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

    /// Request notification permission and register for remote notifications
    func requestAuthorization() async -> Bool {
        do {
            let options: UNAuthorizationOptions = [.alert, .badge, .sound]
            let granted = try await notificationCenter.requestAuthorization(options: options)
            isAuthorized = granted

            if granted {
                // Register for remote (APNs) push notifications
                UIApplication.shared.registerForRemoteNotifications()
            }

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

    // MARK: - Remote Notification Token

    /// Send device token to server for APNs push notifications
    func registerDeviceToken(_ deviceToken: Data) {
        let token = deviceToken.map { String(format: "%02x", $0) }.joined()
        print("APNs device token: \(token)")

        #if DEBUG
        let environment = "sandbox"
        #else
        let environment = "production"
        #endif

        Task {
            do {
                struct TokenRequest: Encodable {
                    let token: String
                    let environment: String
                }

                struct TokenResponse: Decodable {
                    let success: Bool
                }

                let _: TokenResponse = try await APIClient.shared.request(
                    endpoint: .deviceTokens,
                    method: .post,
                    body: TokenRequest(token: token, environment: environment)
                )
                print("Device token registered with server")
            } catch {
                print("Failed to register device token: \(error)")
            }
        }
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

}
