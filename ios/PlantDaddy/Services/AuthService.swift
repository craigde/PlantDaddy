//
//  AuthService.swift
//  PlantDaddy
//
//  Authentication service for login, registration, and logout
//

import Foundation
import Combine

@MainActor
class AuthService: ObservableObject {
    static let shared = AuthService()

    @Published var currentUser: User?
    @Published var isAuthenticated: Bool = false

    private let apiClient = APIClient.shared
    private let keychainService = KeychainService.shared

    private init() {
        // Check if user has a saved token on init
        if keychainService.hasToken {
            Task {
                await loadCurrentUser()
            }
        }
    }

    // MARK: - Authentication Methods

    func login(username: String, password: String) async throws {
        let request = LoginRequest(username: username, password: password)

        let response: AuthResponse = try await apiClient.request(
            endpoint: .login,
            method: .post,
            body: request,
            requiresAuth: false
        )

        // Save token to keychain
        _ = keychainService.saveToken(response.token)

        // Update current user
        currentUser = response.user
        isAuthenticated = true
    }

    func register(username: String, password: String) async throws {
        let request = RegisterRequest(username: username, password: password)

        let response: AuthResponse = try await apiClient.request(
            endpoint: .register,
            method: .post,
            body: request,
            requiresAuth: false
        )

        // Save token to keychain
        _ = keychainService.saveToken(response.token)

        // Update current user
        currentUser = response.user
        isAuthenticated = true
    }

    func logout() {
        // Clear token from keychain
        keychainService.deleteToken()

        // Clear current user
        currentUser = nil
        isAuthenticated = false
    }

    func loadCurrentUser() async {
        do {
            let user: User = try await apiClient.request(
                endpoint: .user,
                method: .get
            )

            currentUser = user
            isAuthenticated = true
        } catch {
            // Token might be expired or invalid
            logout()
        }
    }
}
