//
//  PlantDetailView.swift
//  PlantDaddy
//
//  Detailed view of a single plant
//

import SwiftUI

// MARK: - Disease Detection Models

struct DiseaseResult: Codable {
    let label: String
    let name: String
    let score: Double?
    let categories: [String]
}

struct DiseaseDetectResponse: Codable {
    let results: [DiseaseResult]
    let message: String?
}

struct DetectDiseaseRequest: Codable {
    let imageUrl: String
}

struct PlantDetailView: View {
    let plantId: Int

    @StateObject private var plantService = PlantService.shared
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
    @State private var showingEditSheet = false
    @State private var expandedTimelineItemId: String?
    @State private var diseaseResults: [String: DiseaseDetectResponse] = [:]
    @State private var detectingDiseaseItemId: String?
    @State private var journalEntries: [JournalEntry] = []
    @State private var showingStoryPhotoPicker = false
    @State private var storyImage: UIImage?
    @State private var storyCaption: String = ""
    @State private var isUploadingStoryPhoto = false
    @State private var selectedStoryPhoto: StoryPhoto?
    @State private var showingSnoozeSheet = false
    @State private var showingSnoozeConfirmation = false
    @State private var snoozeConfirmationMessage = ""
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

                    // Plant Story - Photo Journal
                    plantStorySection

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
                    Button(action: { showingEditSheet = true }) {
                        Label("Edit Plant", systemImage: "pencil")
                    }
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
        .sheet(isPresented: $showingEditSheet) {
            if let plant = plant {
                EditPlantView(plant: plant) { updatedPlant in
                    self.plant = updatedPlant
                }
            }
        }
        .sheet(isPresented: $showingSnoozeSheet) {
            if let plant = plant {
                SnoozeSheet(plantId: plant.id, plantName: plant.name) { updatedPlant, message in
                    self.plant = updatedPlant
                    snoozeConfirmationMessage = message
                    showingSnoozeConfirmation = true
                    Task { await loadCareData() }
                }
            }
        }
        .alert("Reminder Snoozed", isPresented: $showingSnoozeConfirmation) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(snoozeConfirmationMessage)
        }
        .task {
            await loadPlant()
        }
    }

    // MARK: - View Components

    private func plantImageSection(_ plant: Plant) -> some View {
        // Use plant's custom photo as primary, species image as fallback
        let primaryUrl = plant.fullImageUrl
        let fallbackUrl = speciesImageUrl(for: plant)
        let hasAnyImageUrl = primaryUrl != nil || fallbackUrl != nil

        // Create a stable ID that changes when the image URL changes
        let imageId = primaryUrl ?? fallbackUrl ?? "no-image"

        return ZStack(alignment: .bottomTrailing) {
            if hasAnyImageUrl {
                AuthenticatedImage(
                    url: primaryUrl ?? fallbackUrl,
                    fallbackUrl: primaryUrl != nil ? fallbackUrl : nil,
                    loadingPlaceholder: {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                            .overlay(ProgressView())
                    },
                    failurePlaceholder: {
                        // Show nice fallback on failure (both plant photo and species failed)
                        Rectangle()
                            .fill(LinearGradient(
                                colors: [.green.opacity(0.3), .green.opacity(0.1)],
                                startPoint: .topLeading,
                                endPoint: .bottomTrailing
                            ))
                            .overlay(
                                VStack {
                                    Image(systemName: "leaf.fill")
                                        .font(.system(size: 80))
                                        .foregroundColor(.green.opacity(0.4))
                                    Text("No Photo")
                                        .foregroundColor(.secondary)
                                }
                            )
                    }
                )
                .id(imageId)  // Force view recreation when URL changes
                .aspectRatio(contentMode: .fill)
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

            // Snooze button - show when plant is due or overdue
            if plant.daysUntilWatering <= 0 || plant.isSnoozed {
                Button(action: {
                    if plant.isSnoozed {
                        clearSnooze()
                    } else {
                        showingSnoozeSheet = true
                    }
                }) {
                    HStack {
                        Image(systemName: plant.isSnoozed ? "bell.fill" : "bell.slash.fill")
                        if plant.isSnoozed, let snoozedUntil = plant.snoozedUntil {
                            Text("Snoozed until \(snoozedUntil, format: .dateTime.month(.abbreviated).day())")
                                .fontWeight(.semibold)
                        } else {
                            Text("Snooze")
                                .fontWeight(.semibold)
                        }
                    }
                    .frame(maxWidth: .infinity)
                    .padding()
                    .background(plant.isSnoozed ? Color.gray : Color.purple.opacity(0.8))
                    .foregroundColor(.white)
                    .cornerRadius(12)
                }
                .disabled(isLoading)
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
                    let isExpanded = expandedTimelineItemId == item.id

                    VStack(spacing: 0) {
                        HStack(alignment: .center, spacing: 12) {
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
                                if let username = item.username {
                                    Text("by \(username)")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                Text(item.date, style: .date)
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }

                            Spacer()

                            if item.hasDetails {
                                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                                    .font(.caption)
                                    .foregroundColor(.secondary)
                            }
                        }
                        .contentShape(Rectangle())
                        .onTapGesture {
                            guard item.hasDetails else { return }
                            withAnimation(.easeInOut(duration: 0.2)) {
                                expandedTimelineItemId = isExpanded ? nil : item.id
                            }
                        }

                        if isExpanded {
                            VStack(alignment: .leading, spacing: 8) {
                                if let imageUrl = item.imageUrl {
                                    AuthenticatedImage(
                                        url: imageUrl,
                                        loadingPlaceholder: {
                                            Rectangle()
                                                .fill(Color.gray.opacity(0.2))
                                                .overlay(ProgressView())
                                        },
                                        failurePlaceholder: {
                                            Rectangle()
                                                .fill(Color.gray.opacity(0.1))
                                                .overlay(
                                                    Image(systemName: "photo")
                                                        .foregroundColor(.secondary)
                                                )
                                        }
                                    )
                                    .aspectRatio(contentMode: .fit)
                                    .frame(maxHeight: 200)
                                    .clipShape(RoundedRectangle(cornerRadius: 8))
                                }

                                if let notes = item.notes {
                                    Text(notes)
                                        .font(.subheadline)
                                        .foregroundColor(.secondary)
                                }

                                // Disease detection for health events with photos
                                if item.isHealthRecord, let rawUrl = item.rawImageUrl {
                                    if let results = diseaseResults[item.id] {
                                        // Show results
                                        VStack(alignment: .leading, spacing: 6) {
                                            Text("Disease Analysis")
                                                .font(.caption)
                                                .fontWeight(.medium)
                                                .foregroundColor(.secondary)
                                                .textCase(.uppercase)

                                            if results.results.isEmpty {
                                                Text("No diseases detected")
                                                    .font(.subheadline)
                                                    .foregroundColor(.green)
                                            } else {
                                                ForEach(Array(results.results.enumerated()), id: \.offset) { _, disease in
                                                    HStack {
                                                        Text(disease.label)
                                                            .font(.subheadline)
                                                        Spacer()
                                                        if let score = disease.score {
                                                            Text("\(Int(score * 100))%")
                                                                .font(.caption)
                                                                .fontWeight(.semibold)
                                                                .padding(.horizontal, 8)
                                                                .padding(.vertical, 2)
                                                                .background(
                                                                    score >= 0.5 ? Color.red.opacity(0.15) :
                                                                    score >= 0.2 ? Color.orange.opacity(0.15) :
                                                                    Color.gray.opacity(0.15)
                                                                )
                                                                .foregroundColor(
                                                                    score >= 0.5 ? .red :
                                                                    score >= 0.2 ? .orange :
                                                                    .gray
                                                                )
                                                                .clipShape(Capsule())
                                                        }
                                                    }
                                                }
                                            }

                                            Text("Results are informational, not a professional diagnosis.")
                                                .font(.caption2)
                                                .italic()
                                                .foregroundColor(.secondary)
                                        }
                                        .padding(10)
                                        .background(Color(.systemGray6))
                                        .clipShape(RoundedRectangle(cornerRadius: 8))
                                    } else {
                                        // Show detect button
                                        Button {
                                            Task { await detectDisease(itemId: item.id, imageUrl: rawUrl) }
                                        } label: {
                                            HStack(spacing: 6) {
                                                if detectingDiseaseItemId == item.id {
                                                    ProgressView()
                                                        .controlSize(.small)
                                                        .tint(.orange)
                                                } else {
                                                    Image(systemName: "magnifyingglass")
                                                        .font(.caption)
                                                }
                                                Text(detectingDiseaseItemId == item.id ? "Analyzing..." : "Detect Disease")
                                                    .font(.subheadline)
                                            }
                                            .padding(.horizontal, 12)
                                            .padding(.vertical, 6)
                                        }
                                        .buttonStyle(.bordered)
                                        .tint(.orange)
                                        .disabled(detectingDiseaseItemId == item.id)
                                    }
                                }
                            }
                            .padding(.leading, 52)
                            .padding(.top, 8)
                            .transition(.opacity.combined(with: .move(edge: .top)))
                        }
                    }
                    .padding(.vertical, 8)
                }
            }
        }
    }

    // MARK: - Plant Story

    struct StoryPhoto: Identifiable {
        let id: String
        let imageUrl: String?
        let caption: String?
        let date: Date
        let source: String // "journal" or "health"
        let username: String?
        let journalEntryId: Int?
    }

    private var storyPhotos: [StoryPhoto] {
        var photos: [StoryPhoto] = []

        for entry in journalEntries {
            photos.append(StoryPhoto(
                id: "journal-\(entry.id)",
                imageUrl: entry.fullImageUrl,
                caption: entry.caption,
                date: entry.createdAt,
                source: "journal",
                username: entry.username,
                journalEntryId: entry.id
            ))
        }

        for record in healthRecords where record.imageUrl != nil {
            photos.append(StoryPhoto(
                id: "health-\(record.id)",
                imageUrl: record.fullImageUrl,
                caption: "Health: \(record.status.displayName)\(record.notes.map { " - \($0)" } ?? "")",
                date: record.recordedAt,
                source: "health",
                username: record.username,
                journalEntryId: nil
            ))
        }

        return photos.sorted { $0.date > $1.date }
    }

    private var plantStorySection: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Plant Story")
                    .font(.headline)
                Spacer()
                Button(action: { showingStoryPhotoPicker = true }) {
                    Image(systemName: "plus.circle.fill")
                        .font(.title3)
                        .foregroundColor(.green)
                }
            }

            let photos = storyPhotos

            if photos.isEmpty {
                Text("No photos yet. Add your first photo to start the story.")
                    .foregroundColor(.secondary)
                    .font(.subheadline)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            } else {
                let columns = [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())]

                LazyVGrid(columns: columns, spacing: 8) {
                    ForEach(photos) { photo in
                        Button {
                            selectedStoryPhoto = photo
                        } label: {
                            ZStack(alignment: .bottomLeading) {
                                if let url = photo.imageUrl {
                                    AuthenticatedImage(
                                        url: url,
                                        loadingPlaceholder: {
                                            Rectangle()
                                                .fill(Color.gray.opacity(0.2))
                                                .overlay(ProgressView())
                                        },
                                        failurePlaceholder: {
                                            Rectangle()
                                                .fill(Color.gray.opacity(0.1))
                                                .overlay(
                                                    Image(systemName: "photo")
                                                        .foregroundColor(.secondary)
                                                )
                                        }
                                    )
                                    .aspectRatio(contentMode: .fill)
                                    .frame(minWidth: 0, maxWidth: .infinity)
                                    .frame(height: 100)
                                    .clipped()
                                }

                                // Date overlay
                                Text(photo.date, format: .dateTime.month(.abbreviated).day())
                                    .font(.system(size: 9, weight: .semibold))
                                    .foregroundColor(.white)
                                    .padding(.horizontal, 4)
                                    .padding(.vertical, 2)
                                    .background(Color.black.opacity(0.5))
                                    .clipShape(RoundedRectangle(cornerRadius: 3))
                                    .padding(4)
                            }
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }
                        .buttonStyle(.plain)
                    }
                }
            }
        }
        .sheet(isPresented: $showingStoryPhotoPicker) {
            StoryPhotoPickerSheet(
                storyImage: $storyImage,
                onImageSelected: { image in
                    uploadStoryPhoto(image)
                }
            )
        }
        .sheet(item: $selectedStoryPhoto) { photo in
            StoryPhotoDetailSheet(
                photo: photo,
                onDelete: photo.source == "journal" && photo.journalEntryId != nil ? {
                    deleteStoryPhoto(id: photo.journalEntryId!)
                } : nil
            )
        }
    }

    private func uploadStoryPhoto(_ image: UIImage) {
        isUploadingStoryPhoto = true
        Task {
            do {
                let imageUrl = try await imageUploadService.uploadGenericImage(image)
                _ = try await plantService.createJournalEntry(
                    plantId: plantId,
                    imageUrl: imageUrl,
                    caption: nil
                )
                await loadCareData()
            } catch {
                print("Error uploading story photo: \(error)")
            }
            isUploadingStoryPhoto = false
        }
    }

    private func deleteStoryPhoto(id: Int) {
        Task {
            do {
                try await plantService.deleteJournalEntry(id: id)
                await loadCareData()
            } catch {
                print("Error deleting story photo: \(error)")
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
        let imageUrl: String?
        let rawImageUrl: String?
        let username: String?
        let isHealthRecord: Bool

        var hasDetails: Bool {
            notes != nil || imageUrl != nil || isHealthRecord
        }
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
                notes: activity.notes,
                imageUrl: nil,
                rawImageUrl: nil,
                username: activity.username,
                isHealthRecord: false
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
                notes: record.notes,
                imageUrl: record.fullImageUrl,
                rawImageUrl: record.imageUrl,
                username: record.username,
                isHealthRecord: true
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
            journalEntries = try await plantService.fetchJournalEntries(plantId: plantId)
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

    private func clearSnooze() {
        isLoading = true
        Task {
            do {
                plant = try await plantService.clearSnooze(id: plantId)
                await loadCareData()
            } catch {
                print("Error clearing snooze: \(error)")
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
                // Also refresh the shared plants array so PlantListView updates
                await plantService.fetchPlants()
            } catch {
                print("Error uploading image: \(error)")
            }
            isUploadingImage = false
        }
    }

    private func detectDisease(itemId: String, imageUrl: String) async {
        detectingDiseaseItemId = itemId

        do {
            let response: DiseaseDetectResponse = try await APIClient.shared.request(
                endpoint: .detectDisease,
                method: .post,
                body: DetectDiseaseRequest(imageUrl: imageUrl)
            )
            diseaseResults[itemId] = response
        } catch {
            print("Error detecting disease: \(error)")
            // Show empty results with error message on failure
            diseaseResults[itemId] = DiseaseDetectResponse(
                results: [],
                message: "Detection failed: \(error.localizedDescription)"
            )
        }

        detectingDiseaseItemId = nil
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
                // Also refresh the shared plants array so PlantListView updates
                await plantService.fetchPlants()
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
    @StateObject private var plantService = PlantService.shared

    @State private var selectedStatus: HealthStatus = .thriving
    @State private var notes: String = ""
    @State private var selectedImage: UIImage?
    @State private var showingImagePicker = false
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?

    private let imageUploadService = ImageUploadService.shared

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

                Section("Photo (optional)") {
                    if let image = selectedImage {
                        Image(uiImage: image)
                            .resizable()
                            .aspectRatio(contentMode: .fill)
                            .frame(height: 150)
                            .frame(maxWidth: .infinity)
                            .clipped()
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                            .onTapGesture { showingImagePicker = true }

                        Button(role: .destructive) {
                            selectedImage = nil
                        } label: {
                            Label("Remove Photo", systemImage: "trash")
                        }
                    } else {
                        Button {
                            showingImagePicker = true
                        } label: {
                            Label("Add Photo", systemImage: "camera.fill")
                        }
                    }
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
            .sheet(isPresented: $showingImagePicker) {
                ImagePickerSheet(
                    selectedImage: $selectedImage,
                    hasExistingImage: false,
                    onImageSelected: { image in
                        selectedImage = image
                    }
                )
            }
        }
    }

    private func saveHealthRecord() {
        errorMessage = nil
        isLoading = true

        Task {
            do {
                // Upload image first if one was selected
                var imageUrl: String? = nil
                if let image = selectedImage {
                    imageUrl = try await imageUploadService.uploadGenericImage(image)
                }

                _ = try await plantService.createHealthRecord(
                    plantId: plantId,
                    status: selectedStatus,
                    notes: notes.isEmpty ? nil : notes.trimmingCharacters(in: .whitespaces),
                    imageUrl: imageUrl
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

// MARK: - Story Photo Picker Sheet

struct StoryPhotoPickerSheet: View {
    @Environment(\.dismiss) private var dismiss
    @Binding var storyImage: UIImage?
    @State private var showingCamera = false
    @State private var showingLibrary = false

    let onImageSelected: (UIImage) -> Void

    var body: some View {
        NavigationStack {
            List {
                Button(action: { showingCamera = true }) {
                    Label("Take Photo", systemImage: "camera.fill")
                }

                Button(action: { showingLibrary = true }) {
                    Label("Choose from Library", systemImage: "photo.fill")
                }
            }
            .navigationTitle("Add to Story")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
            .sheet(isPresented: $showingCamera) {
                CameraPicker(
                    image: $storyImage,
                    sourceType: .camera,
                    onImagePicked: { image in
                        storyImage = image
                        onImageSelected(image)
                        dismiss()
                    }
                )
            }
            .sheet(isPresented: $showingLibrary) {
                CameraPicker(
                    image: $storyImage,
                    sourceType: .photoLibrary,
                    onImagePicked: { image in
                        storyImage = image
                        onImageSelected(image)
                        dismiss()
                    }
                )
            }
        }
    }
}

// MARK: - Story Photo Detail Sheet

struct StoryPhotoDetailSheet: View {
    let photo: PlantDetailView.StoryPhoto
    let onDelete: (() -> Void)?

    @Environment(\.dismiss) private var dismiss
    @State private var showingDeleteConfirm = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 16) {
                    if let url = photo.imageUrl {
                        AuthenticatedImage(
                            url: url,
                            loadingPlaceholder: {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.2))
                                    .overlay(ProgressView())
                            },
                            failurePlaceholder: {
                                Rectangle()
                                    .fill(Color.gray.opacity(0.1))
                                    .overlay(
                                        Image(systemName: "photo")
                                            .foregroundColor(.secondary)
                                    )
                            }
                        )
                        .aspectRatio(contentMode: .fit)
                        .frame(maxWidth: .infinity)
                        .clipShape(RoundedRectangle(cornerRadius: 12))
                    }

                    HStack {
                        Text(photo.date, style: .date)
                            .font(.subheadline)
                            .foregroundColor(.secondary)

                        Spacer()

                        if photo.source == "health" {
                            Text("Health Check")
                                .font(.caption)
                                .fontWeight(.medium)
                                .padding(.horizontal, 8)
                                .padding(.vertical, 4)
                                .background(Color.orange.opacity(0.15))
                                .foregroundColor(.orange)
                                .clipShape(Capsule())
                        }

                        if let username = photo.username {
                            Text("by \(username)")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }

                    if let caption = photo.caption, !caption.isEmpty {
                        Text(caption)
                            .font(.body)
                            .foregroundColor(.secondary)
                    }

                    if let onDelete = onDelete {
                        Button(role: .destructive, action: { showingDeleteConfirm = true }) {
                            Label("Delete Photo", systemImage: "trash")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.bordered)
                        .padding(.top, 8)
                        .alert("Delete Photo?", isPresented: $showingDeleteConfirm) {
                            Button("Cancel", role: .cancel) {}
                            Button("Delete", role: .destructive) {
                                onDelete()
                                dismiss()
                            }
                        } message: {
                            Text("This photo will be removed from the story.")
                        }
                    }
                }
                .padding()
            }
            .navigationTitle("Photo")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
        }
    }
}

// MARK: - Snooze Sheet

struct SnoozeSheet: View {
    let plantId: Int
    let plantName: String
    let onSnooze: (Plant, String) -> Void

    @Environment(\.dismiss) private var dismiss
    @StateObject private var plantService = PlantService.shared
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let snoozeOptions: [(label: String, days: Int)] = [
        ("Tomorrow", 1),
        ("2 Days", 2),
        ("3 Days", 3),
        ("1 Week", 7)
    ]

    var body: some View {
        NavigationStack {
            List {
                Section {
                    ForEach(snoozeOptions, id: \.days) { option in
                        Button {
                            snooze(days: option.days)
                        } label: {
                            HStack {
                                Text(option.label)
                                    .foregroundColor(.primary)
                                Spacer()
                                Text(snoozeDate(days: option.days), format: .dateTime.weekday(.abbreviated).month(.abbreviated).day())
                                    .foregroundColor(.secondary)
                            }
                        }
                        .disabled(isLoading)
                    }
                } header: {
                    Text("Snooze \(plantName)")
                } footer: {
                    Text("The plant will be marked as checked, and you won't receive reminders until the selected date.")
                }

                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Snooze Reminder")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Cancel") { dismiss() }
                }
            }
            .overlay {
                if isLoading {
                    ProgressView()
                        .scaleEffect(1.5)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                        .background(Color.black.opacity(0.1))
                }
            }
        }
    }

    private func snoozeDate(days: Int) -> Date {
        Calendar.current.date(byAdding: .day, value: days, to: Date()) ?? Date()
    }

    private func snooze(days: Int) {
        isLoading = true
        errorMessage = nil

        Task {
            do {
                let until = snoozeDate(days: days)
                let updatedPlant = try await plantService.snoozePlant(id: plantId, until: until)

                let formatter = DateFormatter()
                formatter.dateStyle = .medium

                let message = "\(plantName) reminder snoozed until \(formatter.string(from: until))."
                onSnooze(updatedPlant, message)
                dismiss()
            } catch {
                errorMessage = "Failed to snooze: \(error.localizedDescription)"
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
