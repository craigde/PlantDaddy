//
//  RegisterView.swift
//  PlantDaddy
//
//  Registration screen
//

import SwiftUI

struct RegisterView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var authService = AuthService.shared

    @State private var username: String = ""
    @State private var password: String = ""
    @State private var confirmPassword: String = ""
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                // Header
                VStack(spacing: 8) {
                    Image(systemName: "person.crop.circle.badge.plus")
                        .font(.system(size: 60))
                        .foregroundColor(.green)

                    Text("Create Account")
                        .font(.largeTitle)
                        .fontWeight(.bold)

                    Text("Join PlantDaddy today")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 40)
                .padding(.bottom, 40)

                // Registration Form
                VStack(spacing: 16) {
                    VStack(alignment: .leading, spacing: 4) {
                        TextField("Username", text: $username)
                            .textFieldStyle(.roundedBorder)
                            .textInputAutocapitalization(.never)
                            .autocorrectionDisabled()
                        if !username.isEmpty && username.count < 3 {
                            Text("Username must be at least 3 characters")
                                .font(.caption2)
                                .foregroundColor(.orange)
                        }
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        SecureField("Password", text: $password)
                            .textFieldStyle(.roundedBorder)
                        if !password.isEmpty && password.count < 6 {
                            Text("Password must be at least 6 characters")
                                .font(.caption2)
                                .foregroundColor(.orange)
                        }
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        SecureField("Confirm Password", text: $confirmPassword)
                            .textFieldStyle(.roundedBorder)
                        if !confirmPassword.isEmpty && password != confirmPassword {
                            Text("Passwords do not match")
                                .font(.caption2)
                                .foregroundColor(.orange)
                        }
                    }

                    if let errorMessage = errorMessage {
                        Text(errorMessage)
                            .font(.caption)
                            .foregroundColor(.red)
                            .multilineTextAlignment(.center)
                    }

                    Button(action: register) {
                        if isLoading {
                            ProgressView()
                                .progressViewStyle(CircularProgressViewStyle(tint: .white))
                        } else {
                            Text("Sign Up")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(isFormValid ? Color.green : Color.green.opacity(0.4))
                    .foregroundColor(.white)
                    .cornerRadius(10)
                    .disabled(isLoading || !isFormValid)
                }
                .padding(.horizontal, 32)

                Spacer()
            }
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }
            }
        }
    }

    private var isFormValid: Bool {
        username.count >= 3 &&
        password.count >= 6 &&
        password == confirmPassword
    }

    private func register() {
        guard password == confirmPassword else {
            errorMessage = "Passwords do not match"
            return
        }

        guard password.count >= 6 else {
            errorMessage = "Password must be at least 6 characters"
            return
        }

        errorMessage = nil
        isLoading = true

        Task {
            do {
                try await authService.register(username: username, password: password)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

#Preview {
    RegisterView()
}
