//
//  LoginView.swift
//  PlantDaddy
//
//  Login screen
//

import SwiftUI

struct LoginView: View {
    @ObservedObject private var authService = AuthService.shared
    @State private var username: String = ""
    @State private var password: String = ""
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?
    @State private var showingRegister: Bool = false

    var body: some View {
        VStack(spacing: 24) {
            // Logo/Header
            VStack(spacing: 8) {
                Image(systemName: "leaf.fill")
                    .font(.system(size: 60))
                    .foregroundColor(.green)

                Text("PlantDaddy")
                    .font(.largeTitle)
                    .fontWeight(.bold)

                Text("Keep your plants happy")
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            .padding(.top, 60)
            .padding(.bottom, 40)

            // Login Form
            VStack(spacing: 16) {
                TextField("Username", text: $username)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                    .autocorrectionDisabled()

                SecureField("Password", text: $password)
                    .textFieldStyle(.roundedBorder)

                if let errorMessage = errorMessage {
                    Text(errorMessage)
                        .font(.caption)
                        .foregroundColor(.red)
                        .multilineTextAlignment(.center)
                }

                Button(action: login) {
                    if isLoading {
                        ProgressView()
                            .progressViewStyle(CircularProgressViewStyle(tint: .white))
                    } else {
                        Text("Log In")
                            .fontWeight(.semibold)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(Color.green)
                .foregroundColor(.white)
                .cornerRadius(10)
                .disabled(isLoading || username.isEmpty || password.isEmpty)

                // Register Link
                HStack {
                    Text("Don't have an account?")
                        .foregroundColor(.secondary)

                    Button("Sign Up") {
                        showingRegister = true
                    }
                    .fontWeight(.semibold)
                }
                .padding(.top, 8)
            }
            .padding(.horizontal, 32)

            Spacer()
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color(UIColor.systemBackground))
        .sheet(isPresented: $showingRegister) {
            RegisterView()
        }
    }

    private func login() {
        errorMessage = nil
        isLoading = true

        Task {
            do {
                try await authService.login(username: username, password: password)
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

#Preview {
    LoginView()
}
