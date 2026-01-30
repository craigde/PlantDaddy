//
//  HouseholdViews.swift
//  PlantDaddy
//
//  Views for managing households, members, and switching
//

import SwiftUI

// MARK: - Household Detail View

struct HouseholdDetailView: View {
    @ObservedObject private var householdService = HouseholdService.shared
    @State private var showShareSheet = false
    @State private var showRegenerateAlert = false
    @State private var alertMessage = ""
    @State private var showAlert = false

    var isOwner: Bool {
        householdService.activeHousehold?.role == "owner"
    }

    var body: some View {
        List {
            if let household = householdService.activeHousehold {
                Section("Household") {
                    HStack {
                        Text("Name")
                        Spacer()
                        Text(household.name)
                            .foregroundColor(.secondary)
                    }
                    HStack {
                        Text("Your Role")
                        Spacer()
                        Text(household.role.capitalized)
                            .foregroundColor(.secondary)
                    }
                }

                if isOwner {
                    Section {
                        HStack {
                            Text("Invite Code")
                            Spacer()
                            Text(household.inviteCode)
                                .font(.system(.body, design: .monospaced))
                                .foregroundColor(.green)
                        }

                        Button {
                            UIPasteboard.general.string = household.inviteCode
                            alertMessage = "Invite code copied to clipboard"
                            showAlert = true
                        } label: {
                            HStack {
                                Image(systemName: "doc.on.doc")
                                Text("Copy Invite Code")
                            }
                        }

                        Button {
                            showShareSheet = true
                        } label: {
                            HStack {
                                Image(systemName: "square.and.arrow.up")
                                Text("Share Invite Code")
                            }
                        }

                        Button {
                            showRegenerateAlert = true
                        } label: {
                            HStack {
                                Image(systemName: "arrow.clockwise")
                                Text("Regenerate Code")
                            }
                        }
                    } header: {
                        Text("Invite Members")
                    } footer: {
                        Text("Share this code with family members or housesitters. They can enter it under 'Join a Household' in their Settings.")
                    }
                }

                Section("Members") {
                    if let detail = householdService.householdDetail {
                        ForEach(detail.members) { member in
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(member.username)
                                        .fontWeight(member.role == "owner" ? .semibold : .regular)
                                    Text(member.role.capitalized)
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                Spacer()
                                if member.role == "owner" {
                                    Image(systemName: "crown.fill")
                                        .foregroundColor(.orange)
                                        .font(.caption)
                                }
                            }
                            .swipeActions(edge: .trailing) {
                                if isOwner && member.role != "owner" {
                                    Button(role: .destructive) {
                                        Task {
                                            try? await householdService.removeMember(userId: member.userId)
                                        }
                                    } label: {
                                        Label("Remove", systemImage: "person.fill.xmark")
                                    }

                                    Button {
                                        Task {
                                            let newRole = member.role == "member" ? "caretaker" : "member"
                                            try? await householdService.updateMemberRole(userId: member.userId, role: newRole)
                                        }
                                    } label: {
                                        Label(
                                            member.role == "member" ? "Make Caretaker" : "Make Member",
                                            systemImage: "person.fill.checkmark"
                                        )
                                    }
                                    .tint(.blue)
                                }
                            }
                        }
                    } else {
                        ProgressView()
                    }
                }
            }
        }
        .navigationTitle("Household")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await householdService.fetchHouseholdDetail()
        }
        .sheet(isPresented: $showShareSheet) {
            if let code = householdService.activeHousehold?.inviteCode {
                ShareSheet(items: ["Join my PlantDaddy household! Use invite code: \(code)"])
            }
        }
        .alert("Regenerate Invite Code?", isPresented: $showRegenerateAlert) {
            Button("Cancel", role: .cancel) { }
            Button("Regenerate") {
                Task {
                    do {
                        _ = try await householdService.regenerateInviteCode()
                        alertMessage = "Invite code regenerated"
                        showAlert = true
                    } catch {
                        alertMessage = "Failed to regenerate code"
                        showAlert = true
                    }
                }
            }
        } message: {
            Text("The current invite code will stop working. Anyone who already joined will not be affected.")
        }
        .alert(alertMessage, isPresented: $showAlert) {
            Button("OK", role: .cancel) { }
        }
    }
}

// MARK: - Household Switcher

struct HouseholdSwitcherView: View {
    @ObservedObject private var householdService = HouseholdService.shared
    @ObservedObject private var plantService = PlantService.shared
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        List {
            ForEach(householdService.households) { household in
                Button {
                    householdService.switchHousehold(to: household)
                    // Refresh plants for new household
                    Task {
                        await plantService.fetchPlants()
                        await plantService.fetchLocations()
                    }
                    dismiss()
                } label: {
                    HStack {
                        VStack(alignment: .leading) {
                            Text(household.name)
                                .foregroundColor(.primary)
                            Text(household.role.capitalized)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        Spacer()
                        if household.id == householdService.activeHouseholdId {
                            Image(systemName: "checkmark.circle.fill")
                                .foregroundColor(.green)
                        }
                    }
                }
            }
        }
        .navigationTitle("Switch Household")
        .navigationBarTitleDisplayMode(.inline)
    }
}

// MARK: - Join Household View

struct JoinHouseholdView: View {
    @ObservedObject private var householdService = HouseholdService.shared
    @ObservedObject private var plantService = PlantService.shared
    @State private var inviteCode = ""
    @State private var isJoining = false
    @State private var alertTitle = ""
    @State private var alertMessage = ""
    @State private var showAlert = false
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        Form {
            Section {
                TextField("Enter invite code", text: $inviteCode)
                    .textInputAutocapitalization(.characters)
                    .autocorrectionDisabled()
                    .font(.system(.body, design: .monospaced))
            } header: {
                Text("Invite Code")
            } footer: {
                Text("Ask the household owner for their invite code. You can find yours in your household settings.")
            }

            Section {
                Button {
                    Task { await joinHousehold() }
                } label: {
                    HStack {
                        Spacer()
                        if isJoining {
                            ProgressView()
                        } else {
                            Text("Join Household")
                        }
                        Spacer()
                    }
                }
                .disabled(inviteCode.isEmpty || isJoining)
            }

            Section {
                Button {
                    Task { await createNewHousehold() }
                } label: {
                    HStack {
                        Image(systemName: "plus.circle")
                        Text("Create New Household")
                    }
                }
            } header: {
                Text("Or")
            } footer: {
                Text("Create a new household if you want to manage a separate set of plants (e.g., a vacation home).")
            }
        }
        .navigationTitle("Join Household")
        .navigationBarTitleDisplayMode(.inline)
        .alert(alertTitle, isPresented: $showAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(alertMessage)
        }
    }

    private func joinHousehold() async {
        isJoining = true
        do {
            let household = try await householdService.joinHousehold(inviteCode: inviteCode)
            householdService.switchHousehold(to: household)
            await plantService.fetchPlants()
            await plantService.fetchLocations()
            alertTitle = "Joined!"
            alertMessage = "You are now a member of \(household.name)"
            showAlert = true
            inviteCode = ""
        } catch {
            alertTitle = "Error"
            alertMessage = error.localizedDescription
            showAlert = true
        }
        isJoining = false
    }

    private func createNewHousehold() async {
        do {
            let household = try await householdService.createHousehold(name: "\(AuthService.shared.currentUser?.username ?? "My")'s Home")
            householdService.switchHousehold(to: household)
            await plantService.fetchPlants()
            await plantService.fetchLocations()
            alertTitle = "Created!"
            alertMessage = "New household '\(household.name)' created"
            showAlert = true
        } catch {
            alertTitle = "Error"
            alertMessage = error.localizedDescription
            showAlert = true
        }
    }
}

// MARK: - Share Sheet

struct ShareSheet: UIViewControllerRepresentable {
    let items: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: items, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}
