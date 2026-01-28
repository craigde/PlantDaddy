//
//  PlantDetailView.swift
//  PlantDaddy
//
//  Detailed view of a single plant
//

import SwiftUI

struct PlantDetailView: View {
    let plantId: Int

    @ObservedObject private var plantService = PlantService.shared
    @State private var plant: Plant?
    @State private var careActivities: [CareActivity] = []
    @State private var healthRecords: [HealthRecord] = []
    @State private var isLoading = false
    @State private var showingDeleteAlert = false
    @State private var showingWaterConfirmation = false
    @State private var showingHealthSheet = false
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

                    // Care Timeline (combines care activities and health records)
                    careTimelineSection
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
        .sheet(isPresented: $showingHealthSheet) {
            if let plant = plant {
                LogHealthView(plantId: plant.id) {
                    Task {
                        await loadCareData()
                    }
                }
            }
        }
        .task {
            await loadPlant()
        }
    }

    // MARK: - View Components

    private func plantImageSection(_ plant: Plant) -> some View {
        let displayImageUrl = plant.fullImageUrl ?? speciesImageUrl(for: plant)

        return ZStack(alignment: .bottomTrailing) {
            if let imageUrl = displayImageUrl {
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
                .frame(maxWidth: .infinity, maxHeight: 300)
                .clipped()
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
            ImagePickerSheet(
                selectedImage: $selectedImage,
                hasExistingImage: plant.imageUrl != nil,
                onImageSelected: { image in
                    uploadImage(image, for: plant.id)
                },
                onImageRemoved: {
                    removePhoto(for: plant.id)
                }
            )
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
            HStack(spacing: 12) {
                Button(action: waterPlant) {
                    HStack {
                        Image(systemName: "drop.fill")
                        Text("Water")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(plant.needsWatering ? Color.blue : Color.green)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(isLoading)

                Button(action: { showingHealthSheet = true }) {
                    HStack {
                        Image(systemName: "heart.text.square.fill")
                        Text("Health")
                            .fontWeight(.semibold)
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(Color.orange)
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
            }
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

    private var careTimelineSection: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Care Timeline")
                .font(.headline)

            if careActivities.isEmpty && healthRecords.isEmpty {
                Text("No care history yet")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            } else {
                // Combine and sort activities
                let timeline = buildTimeline()

                ForEach(timeline.prefix(15), id: \.id) { item in
                    HStack(alignment: .top, spacing: 12) {
                        // Icon based on type
                        ZStack {
                            Circle()
                                .fill(item.color.opacity(0.2))
                                .frame(width: 40, height: 40)
                            Text(item.emoji)
                                .font(.title3)
                        }

                        VStack(alignment: .leading, spacing: 4) {
                            Text(item.title)
                                .font(.headline)
                            Text(item.date, style: .date)
                                .font(.caption)
                                .foregroundColor(.secondary)
                            if let notes = item.notes {
                                Text(notes)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }

                        Spacer()
                    }
                    .padding(.vertical, 8)
                }
            }
        }
    }

    // MARK: - Timeline Data

    struct TimelineItem {
        let id: String
        let title: String
        let emoji: String
        let color: Color
        let date: Date
        let notes: String?
    }

    private func buildTimeline() -> [TimelineItem] {
        var items: [TimelineItem] = []

        // Add care activities
        for activity in careActivities {
            items.append(TimelineItem(
                id: "activity-\(activity.id)",
                title: activity.activityType.displayName,
                emoji: activity.activityType.emoji,
                color: .blue,
                date: activity.performedAt,
                notes: activity.notes
            ))
        }

        // Add health records
        for record in healthRecords {
            items.append(TimelineItem(
                id: "health-\(record.id)",
                title: "Health: \(record.status.displayName)",
                emoji: record.status.emoji,
                color: record.status == .thriving ? .green : record.status == .struggling ? .orange : .red,
                date: record.recordedAt,
                notes: record.notes
            ))
        }

        // Sort by date descending
        return items.sorted { $0.date > $1.date }
    }

    // MARK: - Actions

    private func loadPlant() async {
        isLoading = true
        do {
            plant = try await plantService.fetchPlant(id: plantId)
            await plantService.fetchPlantSpecies()
            await loadCareData()
        } catch {
            print("Error loading plant: \(error)")
        }
        isLoading = false
    }

    private func speciesImageUrl(for plant: Plant) -> String? {
        guard let speciesName = plant.species else { return nil }
        return plantService.plantSpecies.first { $0.name == speciesName }?.fullImageUrl
    }

    private func loadCareData() async {
        do {
            careActivities = try await plantService.fetchCareActivities(plantId: plantId)
            healthRecords = try await plantService.fetchHealthRecords(plantId: plantId)
        } catch {
            print("Error loading care data: \(error)")
        }
    }

    private func waterPlant() {
        isLoading = true
        Task {
            do {
                // Water the plant (creates a care activity on backend)
                plant = try await plantService.waterPlant(id: plantId)
                // Reload care activities to show the new watering
                await loadCareData()
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
            }
            isUploadingImage = false
        }
    }

    private func removePhoto(for plantId: Int) {
        isUploadingImage = true
        Task {
            do {
                try await APIClient.shared.requestWithoutResponse(
                    endpoint: .plantImageUpload(id: plantId),
                    method: .delete
                )
                // Reload plant — imageUrl will be null, so species default shows
                plant = try await plantService.fetchPlant(id: plantId)
            } catch {
                print("Error removing photo: \(error)")
            }
            isUploadingImage = false
        }
    }
}

// MARK: - Log Health View

struct LogHealthView: View {
    let plantId: Int
    let onSave: () -> Void

    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var plantService = PlantService.shared

    @State private var selectedStatus: HealthStatus = .thriving
    @State private var notes: String = ""
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?

    var body: some View {
        NavigationStack {
            Form {
                Section("Health Status") {
                    Picker("Status", selection: $selectedStatus) {
                        ForEach(HealthStatus.allCases, id: \.self) { status in
                            Text(status.emoji)
                                .tag(status)
                        }
                    }
                    .pickerStyle(.segmented)

                    // Show full status name below picker
                    HStack {
                        Spacer()
                        Text(selectedStatus.displayName)
                            .font(.headline)
                            .foregroundColor(selectedStatus == .thriving ? .green : selectedStatus == .struggling ? .orange : .red)
                        Spacer()
                    }
                    .listRowBackground(Color.clear)
                }

                Section("Notes (optional)") {
                    TextEditor(text: $notes)
                        .frame(height: 100)
                }

                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Log Health")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        saveHealthRecord()
                    }
                    .disabled(isLoading)
                }
            }
        }
    }

    private func saveHealthRecord() {
        errorMessage = nil
        isLoading = true

        Task {
            do {
                _ = try await plantService.createHealthRecord(
                    plantId: plantId,
                    status: selectedStatus,
                    notes: notes.isEmpty ? nil : notes.trimmingCharacters(in: .whitespaces),
                    imageUrl: nil
                )
                onSave()
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }

            isLoading = false
        }
    }
}

#Preview {
    NavigationStack {
        PlantDetailView(plantId: 1)
    }
}
