//
//  SpeciesDetailView.swift
//  PlantDaddy
//
//  Detailed view of a plant species with care info and add-to-collection
//

import SwiftUI

struct SpeciesDetailView: View {
    let species: PlantSpecies

    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var plantService = PlantService.shared
    @State private var selectedTab = 0
    @State private var showingAddPlant = false
    @State private var addSuccess = false

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 20) {
                    // Header image
                    speciesImage

                    // Name and badges
                    VStack(alignment: .leading, spacing: 8) {
                        Text(species.name)
                            .font(.title)
                            .fontWeight(.bold)

                        Text(species.scientificName)
                            .font(.title3)
                            .italic()
                            .foregroundColor(.secondary)

                        if let family = species.family {
                            Text("Family: \(family)")
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }

                        HStack(spacing: 8) {
                            Badge(
                                text: "\(species.careLevel.emoji) \(species.careLevel.displayName)",
                                color: careLevelColor
                            )
                            if let toxicity = species.toxicity {
                                Badge(
                                    text: toxicity == "non-toxic" ? "Pet Safe" : toxicity.capitalized,
                                    color: toxicity == "non-toxic" ? .green : .red
                                )
                            }
                        }
                    }
                    .padding(.horizontal)

                    // Care summary grid
                    careSummaryGrid
                        .padding(.horizontal)

                    // Tabbed content
                    Picker("Info", selection: $selectedTab) {
                        Text("Overview").tag(0)
                        Text("Care").tag(1)
                        Text("Issues").tag(2)
                    }
                    .pickerStyle(.segmented)
                    .padding(.horizontal)

                    // Tab content
                    Group {
                        switch selectedTab {
                        case 0: overviewTab
                        case 1: careTab
                        case 2: issuesTab
                        default: EmptyView()
                        }
                    }
                    .padding(.horizontal)

                    // Add to collection button
                    Button(action: { showingAddPlant = true }) {
                        HStack {
                            Image(systemName: "plus.circle.fill")
                            Text("Add to My Plants")
                        }
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding()
                        .background(Color.green)
                        .foregroundColor(.white)
                        .cornerRadius(12)
                    }
                    .padding(.horizontal)
                    .padding(.bottom)
                }
            }
            .navigationTitle(species.name)
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Done") { dismiss() }
                }
            }
            .sheet(isPresented: $showingAddPlant) {
                AddPlantFromSpeciesView(species: species) {
                    addSuccess = true
                    showingAddPlant = false
                }
            }
            .alert("Plant Added!", isPresented: $addSuccess) {
                Button("OK") { dismiss() }
            } message: {
                Text("\(species.name) has been added to your collection.")
            }
        }
    }

    // MARK: - Components

    private var speciesImage: some View {
        Group {
            if let imageUrl = species.fullImageUrl {
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
                                Image(systemName: "leaf.fill")
                                    .font(.system(size: 60))
                                    .foregroundColor(.green.opacity(0.3))
                            )
                    }
                )
                .aspectRatio(contentMode: .fit)
                .frame(maxWidth: .infinity)
                .frame(maxHeight: 250)
                .background(Color(.secondarySystemBackground))
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.1))
                    .frame(height: 200)
                    .overlay(
                        Image(systemName: "leaf.fill")
                            .font(.system(size: 60))
                            .foregroundColor(.green.opacity(0.3))
                    )
            }
        }
    }

    private var careSummaryGrid: some View {
        LazyVGrid(columns: [
            GridItem(.flexible()),
            GridItem(.flexible()),
            GridItem(.flexible())
        ], spacing: 12) {
            CareStat(icon: "drop.fill", label: "Water", value: "Every \(species.wateringFrequency)d")
            CareStat(icon: "sun.max.fill", label: "Light", value: shortLight)
            CareStat(icon: "humidity.fill", label: "Humidity", value: species.humidity?.capitalized ?? "—")
        }
    }

    private var shortLight: String {
        let light = species.lightRequirements.lowercased()
        if light.contains("bright indirect") { return "Bright Indirect" }
        if light.contains("low") { return "Low" }
        if light.contains("bright") { return "Bright" }
        if light.contains("medium") { return "Medium" }
        return String(species.lightRequirements.prefix(20))
    }

    private var overviewTab: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(species.description)
                .font(.body)

            if let origin = species.origin {
                InfoRow(label: "Origin", value: origin)
            }

            if let soil = species.soilType {
                InfoRow(label: "Soil", value: soil)
            }

            if let propagation = species.propagation, !propagation.isEmpty {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Propagation")
                        .font(.headline)
                    Text(propagation)
                        .font(.body)
                        .foregroundColor(.secondary)
                }
                .padding(.top, 4)
            }
        }
    }

    private var careTab: some View {
        VStack(alignment: .leading, spacing: 16) {
            CareInfoRow(icon: "drop.fill", title: "Watering", detail: "Every \(species.wateringFrequency) days", color: .blue)
            CareInfoRow(icon: "sun.max.fill", title: "Light", detail: species.lightRequirements, color: .yellow)
            CareInfoRow(icon: "humidity.fill", title: "Humidity", detail: species.humidity?.capitalized ?? "Not specified", color: .cyan)

            if let soil = species.soilType {
                CareInfoRow(icon: "leaf.fill", title: "Soil", detail: soil, color: .brown)
            }
        }
    }

    private var issuesTab: some View {
        VStack(alignment: .leading, spacing: 12) {
            if let issues = species.commonIssues, !issues.isEmpty {
                Text(issues)
                    .font(.body)
            } else {
                Text("No common issues documented.")
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding()
            }
        }
    }

    private var careLevelColor: Color {
        switch species.careLevel {
        case .easy: return .green
        case .moderate: return .orange
        case .difficult: return .red
        }
    }
}

// MARK: - Supporting Views

private struct Badge: View {
    let text: String
    let color: Color

    var body: some View {
        Text(text)
            .font(.caption)
            .fontWeight(.medium)
            .padding(.horizontal, 10)
            .padding(.vertical, 4)
            .background(color.opacity(0.15))
            .foregroundColor(color)
            .cornerRadius(8)
    }
}

private struct CareStat: View {
    let icon: String
    let label: String
    let value: String

    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(.green)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
            Text(value)
                .font(.caption)
                .fontWeight(.medium)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 10)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(10)
    }
}

private struct InfoRow: View {
    let label: String
    let value: String

    var body: some View {
        HStack(alignment: .top) {
            Text(label)
                .font(.subheadline)
                .foregroundColor(.secondary)
                .frame(width: 80, alignment: .leading)
            Text(value)
                .font(.subheadline)
        }
    }
}

private struct CareInfoRow: View {
    let icon: String
    let title: String
    let detail: String
    let color: Color

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Image(systemName: icon)
                .font(.title3)
                .foregroundColor(color)
                .frame(width: 30)

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.headline)
                Text(detail)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
        }
        .padding()
        .frame(maxWidth: .infinity, alignment: .leading)
        .background(Color(.secondarySystemBackground))
        .cornerRadius(10)
    }
}

// MARK: - Add Plant from Species

struct AddPlantFromSpeciesView: View {
    let species: PlantSpecies
    let onAdded: () -> Void

    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var plantService = PlantService.shared

    @State private var name: String = ""
    @State private var selectedLocation: String = ""
    @State private var wateringFrequency: Int = 7
    @State private var lastWatered: Date = Date()
    @State private var notes: String = ""
    @State private var isLoading = false
    @State private var errorMessage: String?

    private let wateringFrequencies = [1, 2, 3, 5, 7, 10, 14, 21, 30]

    var body: some View {
        NavigationStack {
            Form {
                Section {
                    HStack(spacing: 12) {
                        if let imageUrl = species.fullImageUrl {
                            AuthenticatedImage(
                                url: imageUrl,
                                loadingPlaceholder: {
                                    Rectangle().fill(Color.gray.opacity(0.2))
                                },
                                failurePlaceholder: {
                                    Rectangle().fill(Color.gray.opacity(0.2))
                                }
                            )
                            .aspectRatio(contentMode: .fill)
                            .frame(width: 50, height: 50)
                            .clipShape(RoundedRectangle(cornerRadius: 8))
                        }

                        VStack(alignment: .leading) {
                            Text(species.name)
                                .font(.headline)
                            Text(species.scientificName)
                                .font(.caption)
                                .italic()
                                .foregroundColor(.secondary)
                        }
                    }
                } header: {
                    Text("Species")
                }

                Section("Plant Details") {
                    TextField("Plant Name", text: $name)

                    if plantService.locations.isEmpty {
                        TextField("Location", text: $selectedLocation)
                    } else {
                        Picker("Location", selection: $selectedLocation) {
                            ForEach(plantService.locations) { location in
                                Text(location.name).tag(location.name)
                            }
                        }
                    }
                }

                Section("Watering") {
                    DatePicker("Last Watered", selection: $lastWatered, displayedComponents: .date)

                    Picker("Frequency", selection: $wateringFrequency) {
                        ForEach(wateringFrequencies, id: \.self) { days in
                            Text("\(days) day\(days == 1 ? "" : "s")").tag(days)
                        }
                    }

                    Text("Recommended: Every \(species.wateringFrequency) days")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }

                Section("Notes (optional)") {
                    TextEditor(text: $notes)
                        .frame(height: 80)
                }

                if let errorMessage = errorMessage {
                    Section {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                    }
                }
            }
            .navigationTitle("Add \(species.name)")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") { dismiss() }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Add") { addPlant() }
                        .disabled(isLoading || !isFormValid)
                }
            }
            .onAppear {
                name = species.name
                wateringFrequency = species.wateringFrequency
                if let firstLocation = plantService.locations.first {
                    selectedLocation = firstLocation.name
                }
            }
        }
    }

    private var isFormValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty &&
        !selectedLocation.trimmingCharacters(in: .whitespaces).isEmpty
    }

    private func addPlant() {
        errorMessage = nil
        isLoading = true

        Task {
            do {
                _ = try await plantService.createPlant(
                    name: name.trimmingCharacters(in: .whitespaces),
                    species: species.name,
                    location: selectedLocation,
                    wateringFrequency: wateringFrequency,
                    lastWatered: lastWatered,
                    notes: notes.isEmpty ? nil : notes.trimmingCharacters(in: .whitespaces),
                    imageUrl: nil
                )
                onAdded()
            } catch {
                errorMessage = error.localizedDescription
            }
            isLoading = false
        }
    }
}

#Preview {
    SpeciesDetailView(species: PlantSpecies(
        id: 1,
        name: "Snake Plant",
        scientificName: "Sansevieria trifasciata",
        family: "Asparagaceae",
        origin: "West Africa",
        description: "Hardy, low-maintenance plant that purifies air.",
        careLevel: .easy,
        lightRequirements: "Low to bright indirect light",
        wateringFrequency: 14,
        humidity: "low",
        soilType: "Well-draining",
        propagation: "Leaf cuttings or division",
        toxicity: "toxic to pets",
        commonIssues: "Root rot from overwatering",
        imageUrl: nil,
        userId: nil
    ))
}
