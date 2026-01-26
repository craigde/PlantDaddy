//
//  PlantDetailView.swift
//  PlantDaddy
//
//  Detailed view of a single plant
//

import SwiftUI

struct PlantDetailView: View {
    let plantId: Int

    @StateObject private var plantService = PlantService.shared
    @State private var plant: Plant?
    @State private var wateringHistory: [WateringEntry] = []
    @State private var isLoading = false
    @State private var showingDeleteAlert = false
    @State private var showingWaterConfirmation = false
    @State private var showingImagePicker = false
    @State private var selectedImage: UIImage?
    @State private var isUploadingImage = false
    @Environment(\.dismiss) private var dismiss

    private let imageUploadService = ImageUploadService.shared

    var body: some View {
        ScrollView {
            if let plant = plant {
                VStack(alignment: .leading, spacing: 24) {
                    // Plant Image
                    plantImageSection(plant)

                    // Main Info
                    plantInfoSection(plant)

                    // Quick Actions
                    quickActionsSection(plant)

                    // Watering Schedule
                    wateringScheduleSection(plant)

                    // Watering History
                    wateringHistorySection
                }
                .padding()
            } else if isLoading {
                ProgressView("Loading plant...")
                    .padding()
            } else {
                Text("Plant not found")
                    .foregroundColor(.secondary)
                    .padding()
            }
        }
        .navigationTitle(plant?.name ?? "Plant")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .navigationBarTrailing) {
                Menu {
                    Button(role: .destructive, action: { showingDeleteAlert = true }) {
                        Label("Delete Plant", systemImage: "trash")
                    }
                } label: {
                    Image(systemName: "ellipsis.circle")
                }
            }
        }
        .alert("Delete Plant", isPresented: $showingDeleteAlert) {
            Button("Cancel", role: .cancel) {}
            Button("Delete", role: .destructive, action: deletePlant)
        } message: {
            Text("Are you sure you want to delete \(plant?.name ?? "this plant")? This action cannot be undone.")
        }
        .alert("Plant Watered! 💧", isPresented: $showingWaterConfirmation) {
            Button("OK", role: .cancel) {}
        } message: {
            Text("\(plant?.name ?? "Plant") has been watered successfully.")
        }
        .task {
            await loadPlant()
        }
    }

    // MARK: - View Components

    private func plantImageSection(_ plant: Plant) -> some View {
        ZStack(alignment: .bottomTrailing) {
            if let imageUrl = plant.imageUrl {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))
                        .overlay(
                            ProgressView()
                        )
                }
                .frame(height: 300)
                .clipShape(RoundedRectangle(cornerRadius: 16))
            } else {
                Rectangle()
                    .fill(LinearGradient(
                        colors: [.green.opacity(0.3), .green.opacity(0.1)],
                        startPoint: .topLeading,
                        endPoint: .bottomTrailing
                    ))
                    .frame(height: 300)
                    .overlay(
                        VStack {
                            Image(systemName: "leaf.fill")
                                .font(.system(size: 80))
                                .foregroundColor(.green.opacity(0.4))
                            Text("No Photo")
                                .foregroundColor(.secondary)
                        }
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 16))
            }

            // Add/Change Photo Button
            Button(action: { showingImagePicker = true }) {
                HStack {
                    Image(systemName: plant.imageUrl == nil ? "camera.fill" : "pencil.circle.fill")
                    Text(plant.imageUrl == nil ? "Add Photo" : "Change")
                }
                .font(.headline)
                .foregroundColor(.white)
                .padding(.horizontal, 16)
                .padding(.vertical, 8)
                .background(Color.green)
                .cornerRadius(20)
            }
            .padding(12)
            .disabled(isUploadingImage)

            if isUploadingImage {
                ProgressView()
                    .padding()
                    .background(Color.black.opacity(0.5))
                    .cornerRadius(8)
            }
        }
        .sheet(isPresented: $showingImagePicker) {
            ImagePickerSheet(selectedImage: $selectedImage) { image in
                uploadImage(image, for: plant.id)
            }
        }
    }

    private func plantInfoSection(_ plant: Plant) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            if let species = plant.species {
                HStack {
                    Image(systemName: "leaf")
                    Text(species)
                        .font(.title3)
                        .foregroundColor(.secondary)
                }
            }

            HStack {
                Image(systemName: "location.fill")
                Text(plant.location)
            }
            .foregroundColor(.secondary)

            if let notes = plant.notes, !notes.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Notes")
                        .font(.headline)
                    Text(notes)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 8)
            }
        }
    }

    private func quickActionsSection(_ plant: Plant) -> some View {
        VStack(spacing: 12) {
            Button(action: waterPlant) {
                HStack {
                    Image(systemName: "drop.fill")
                    Text("Water Plant")
                        .fontWeight(.semibold)
                }
                .frame(maxWidth: .infinity)
                .padding()
                .background(plant.needsWatering ? Color.blue : Color.green)
                .foregroundColor(.white)
                .cornerRadius(12)
            }
            .disabled(isLoading)
        }
    }

    private func wateringScheduleSection(_ plant: Plant) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Watering Schedule")
                .font(.headline)

            VStack(spacing: 8) {
                HStack {
                    Text("Last watered")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(plant.lastWatered, style: .date)
                }

                HStack {
                    Text("Next watering")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text(plant.nextWateringDate, style: .date)
                        .foregroundColor(plant.needsWatering ? .red : .primary)
                }

                HStack {
                    Text("Frequency")
                        .foregroundColor(.secondary)
                    Spacer()
                    Text("Every \(plant.wateringFrequency) days")
                }
            }
            .padding()
            .background(Color(.secondarySystemBackground))
            .cornerRadius(12)
        }
    }

    private var wateringHistorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Watering History")
                .font(.headline)

            if wateringHistory.isEmpty {
                Text("No watering history yet")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            } else {
                ForEach(wateringHistory.prefix(10)) { entry in
                    HStack {
                        Image(systemName: "drop.fill")
                            .foregroundColor(.blue)
                        Text(entry.wateredAt, style: .date)
                        Text(entry.wateredAt, style: .time)
                            .foregroundColor(.secondary)
                        Spacer()
                    }
                    .padding(.vertical, 4)
                }
            }
        }
    }

    // MARK: - Actions

    private func loadPlant() async {
        isLoading = true
        do {
            plant = try await plantService.fetchPlant(id: plantId)
            wateringHistory = try await plantService.fetchWateringHistory(plantId: plantId)
        } catch {
            print("Error loading plant: \(error)")
        }
        isLoading = false
    }

    private func waterPlant() {
        isLoading = true
        Task {
            do {
                plant = try await plantService.waterPlant(id: plantId)
                wateringHistory = try await plantService.fetchWateringHistory(plantId: plantId)
                showingWaterConfirmation = true
            } catch {
                print("Error watering plant: \(error)")
            }
            isLoading = false
        }
    }

    private func deletePlant() {
        Task {
            do {
                try await plantService.deletePlant(id: plantId)
                dismiss()
            } catch {
                print("Error deleting plant: \(error)")
            }
        }
    }

    private func uploadImage(_ image: UIImage, for plantId: Int) {
        isUploadingImage = true
        Task {
            do {
                _ = try await imageUploadService.uploadPlantImage(image, for: plantId)
                // Reload plant to get updated image URL
                plant = try await plantService.fetchPlant(id: plantId)
            } catch {
                print("Error uploading image: \(error)")
                // Show error to user
            }
            isUploadingImage = false
        }
    }
}

#Preview {
    NavigationStack {
        PlantDetailView(plantId: 1)
    }
}
