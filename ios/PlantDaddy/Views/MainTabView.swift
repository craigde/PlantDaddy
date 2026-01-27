//
//  MainTabView.swift
//  PlantDaddy
//
//  Main tab navigation view
//

import SwiftUI

struct MainTabView: View {
    @ObservedObject private var authService = AuthService.shared

    var body: some View {
        TabView {
            PlantListView()
                .tabItem {
                    Label("Plants", systemImage: "leaf.fill")
                }

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
        }
    }
}

// Settings View (basic for now)
struct SettingsView: View {
    @ObservedObject private var authService = AuthService.shared

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

#Preview {
    MainTabView()
}
