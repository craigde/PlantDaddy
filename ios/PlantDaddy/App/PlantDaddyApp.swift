//
//  PlantDaddyApp.swift
//  PlantDaddy
//
//  Main app entry point
//

import SwiftUI

@main
struct PlantDaddyApp: App {
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
