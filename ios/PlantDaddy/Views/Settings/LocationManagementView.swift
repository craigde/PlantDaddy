//
//  LocationManagementView.swift
//  PlantDaddy
//
//  Manage locations where plants are kept
//

import SwiftUI

struct LocationManagementView: View {
    @ObservedObject private var plantService = PlantService.shared
    @State private var newLocationName = ""
    @State private var editingLocation: Location? = nil
    @State private var editText = ""
    @State private var locationToDelete: Location? = nil
    @State private var showDeleteAlert = false
    @State private var alertTitle = ""
    @State private var alertMessage = ""
    @State private var showAlert = false
    @State private var isAdding = false

    var body: some View {
        List {
            Section {
                HStack {
                    TextField("New location name", text: $newLocationName)
                        .autocorrectionDisabled()
                    Button {
                        Task { await addLocation() }
                    } label: {
                        if isAdding {
                            ProgressView()
                                .frame(width: 20, height: 20)
                        } else {
                            Image(systemName: "plus.circle.fill")
                                .foregroundColor(.green)
                        }
                    }
                    .disabled(newLocationName.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty || isAdding)
                }
            } header: {
                Text("Add Location")
            }

            Section {
                if plantService.locations.isEmpty {
                    Text("No locations yet. Add one above.")
                        .foregroundColor(.secondary)
                } else {
                    ForEach(plantService.locations) { location in
                        if editingLocation?.id == location.id {
                            // Editing row
                            HStack {
                                TextField("Location name", text: $editText)
                                    .autocorrectionDisabled()
                                Button {
                                    Task { await saveEdit() }
                                } label: {
                                    Image(systemName: "checkmark.circle.fill")
                                        .foregroundColor(.green)
                                }
                                .disabled(editText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty)
                                Button {
                                    editingLocation = nil
                                } label: {
                                    Image(systemName: "xmark.circle.fill")
                                        .foregroundColor(.secondary)
                                }
                            }
                        } else {
                            // Display row
                            HStack {
                                Text(location.name)
                                if location.isDefault == true {
                                    Text("Default")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.secondary.opacity(0.15))
                                        .cornerRadius(4)
                                }
                            }
                            .swipeActions(edge: .trailing, allowsFullSwipe: false) {
                                Button(role: .destructive) {
                                    locationToDelete = location
                                    showDeleteAlert = true
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }

                                Button {
                                    editingLocation = location
                                    editText = location.name
                                } label: {
                                    Label("Edit", systemImage: "pencil")
                                }
                                .tint(.blue)
                            }
                        }
                    }
                }
            } header: {
                Text("Locations (\(plantService.locations.count))")
            } footer: {
                Text("Swipe left on a location to edit or delete it. Locations used by plants cannot be deleted.")
            }
        }
        .navigationTitle("Locations")
        .navigationBarTitleDisplayMode(.inline)
        .task {
            await plantService.fetchLocations()
        }
        .alert("Delete Location", isPresented: $showDeleteAlert) {
            Button("Cancel", role: .cancel) {
                locationToDelete = nil
            }
            Button("Delete", role: .destructive) {
                if let location = locationToDelete {
                    Task { await deleteLocation(location) }
                }
            }
        } message: {
            if let location = locationToDelete {
                Text("Are you sure you want to delete \"\(location.name)\"? Locations used by plants cannot be deleted.")
            }
        }
        .alert(alertTitle, isPresented: $showAlert) {
            Button("OK", role: .cancel) { }
        } message: {
            Text(alertMessage)
        }
    }

    // MARK: - Actions

    private func addLocation() async {
        let name = newLocationName.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }
        isAdding = true
        do {
            _ = try await plantService.createLocation(name: name)
            newLocationName = ""
        } catch {
            alertTitle = "Error"
            alertMessage = error.localizedDescription
            showAlert = true
        }
        isAdding = false
    }

    private func saveEdit() async {
        guard let location = editingLocation else { return }
        let name = editText.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !name.isEmpty else { return }

        do {
            _ = try await plantService.updateLocation(id: location.id, name: name)
            editingLocation = nil
        } catch {
            alertTitle = "Error"
            alertMessage = error.localizedDescription
            showAlert = true
        }
    }

    private func deleteLocation(_ location: Location) async {
        do {
            try await plantService.deleteLocation(id: location.id)
        } catch {
            alertTitle = "Cannot Delete"
            alertMessage = error.localizedDescription
            showAlert = true
        }
        locationToDelete = nil
    }
}
