//
//  PlantDaddyApp.swift
//  PlantDaddy
//
//  Main app entry point
//

import SwiftUI
import UIKit

// AppDelegate to handle remote notification registration callbacks
class AppDelegate: NSObject, UIApplicationDelegate {
    func application(_ application: UIApplication, didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data) {
        Task { @MainActor in
            NotificationService.shared.registerDeviceToken(deviceToken)
        }
    }

    func application(_ application: UIApplication, didFailToRegisterForRemoteNotificationsWithError error: Error) {
        print("Failed to register for remote notifications: \(error)")
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

    var body: some View {
        ZStack {
            if authService.isAuthenticated {
                MainTabView()
                    .task {
                        // Request notification permission when user is authenticated
                        _ = await NotificationService.shared.requestAuthorization()
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
