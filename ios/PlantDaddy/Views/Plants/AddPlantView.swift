//
//  AddPlantView.swift
//  PlantDaddy
//
//  View for adding a new plant
//

import SwiftUI

struct AddPlantView: View {
    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var plantService = PlantService.shared

    @State private var name: String = ""
    @State private var selectedSpecies: PlantSpecies?
    @State private var customSpeciesName: String = ""
    @State private var selectedLocation: String = ""
    @State private var wateringFrequency: Int = 7
    @State private var lastWatered: Date = Date()
    @State private var notes: String = ""
    @State private var selectedImage: UIImage?
    @State private var uploadedImageUrl: String?
    @State private var isLoading: Bool = false
    @State private var isUploadingImage: Bool = false
    @State private var errorMessage: String?
    @State private var useCustomSpecies: Bool = false

    private let wateringFrequencies = [1, 2, 3, 5, 7, 10, 14, 21, 30]
    private let imageUploadService = ImageUploadService.shared

    var body: some View {
        NavigationStack {
            Form {
                Section("Photo") {
                    ImagePicker(selectedImage: $selectedImage) { image in
                        selectedImage = image
                    }
                    .listRowInsets(EdgeInsets())
                    .listRowBackground(Color.clear)

                    if isUploadingImage {
                        HStack {
                            ProgressView()
                            Text("Uploading...")
                                .foregroundColor(.secondary)
                        }
                    }
                }

                Section("Plant Information") {
                    TextField("Plant Name", text: $name)

                    // Species Selection
                    if !useCustomSpecies && !plantService.plantSpecies.isEmpty {
                        Picker("Species", selection: $selectedSpecies) {
                            Text("Select species...").tag(nil as PlantSpecies?)
                            ForEach(plantService.plantSpecies) { species in
                                HStack {
                                    Text(species.name)
                                    Text(species.careLevel.emoji)
                                }
                                .tag(species as PlantSpecies?)
                            }
                        }
                        .onChange(of: selectedSpecies) { _, newSpecies in
                            if let species = newSpecies {
                                wateringFrequency = species.wateringFrequency
                            }
                        }

                        Button(action: {
                            useCustomSpecies = true
                            selectedSpecies = nil
                        }) {
                            Text("Or enter custom species")
                                .font(.caption)
                                .foregroundColor(.blue)
                        }
                    } else {
                        HStack {
                            TextField("Custom Species", text: $customSpeciesName)
                            if !plantService.plantSpecies.isEmpty {
                                Button("Browse") {
                                    useCustomSpecies = false
                                }
                                .font(.caption)
                            }
                        }
                    }

                    // Show species info if selected
                    if let species = selectedSpecies {
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                AsyncImage(url: URL(string: species.imageUrl ?? "")) { image in
                                    image
                                        .resizable()
                                        .aspectRatio(contentMode: .fill)
                                } placeholder: {
                                    Rectangle()
                                        .fill(Color.gray.opacity(0.2))
                                }
                                .frame(width: 60, height: 60)
                                .clipShape(RoundedRectangle(cornerRadius: 8))

                                VStack(alignment: .leading, spacing: 4) {
                                    Text(species.name)
                                        .font(.headline)
                                    Text(species.scientificName)
                                        .font(.caption)
                                        .italic()
                                        .foregroundColor(.secondary)
                                    HStack {
                                        Text(species.careLevel.displayName)
                                            .font(.caption)
                                            .padding(.horizontal, 8)
                                            .padding(.vertical, 2)
                                            .background(species.careLevel == .easy ? Color.green.opacity(0.2) : species.careLevel == .moderate ? Color.orange.opacity(0.2) : Color.red.opacity(0.2))
                                            .cornerRadius(4)
                                    }
                                }
                            }

                            Text(species.description)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 4)
                    }
                }

                Section("Location") {
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

                Section("Watering Schedule") {
                    DatePicker(
                        "Last Watered",
                        selection: $lastWatered,
                        displayedComponents: .date
                    )

                    Picker("Watering Frequency", selection: $wateringFrequency) {
                        ForEach(wateringFrequencies, id: \.self) { days in
                            Text("\(days) day\(days == 1 ? "" : "s")").tag(days)
                        }
                    }

                    if let species = selectedSpecies {
                        Text("Recommended: Every \(species.wateringFrequency) days")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }

                    if wateringFrequency > 0 {
                        HStack {
                            Text("Next watering")
                                .foregroundColor(.secondary)
                            Spacer()
                            Text(nextWateringDate, style: .date)
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
            .navigationTitle("Add Plant")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        addPlant()
                    }
                    .disabled(isLoading || !isFormValid)
                }
            }
            .task {
                // Load species and locations
                await plantService.fetchPlantSpecies()
                if let firstLocation = plantService.locations.first {
                    selectedLocation = firstLocation.name
                }
            }
        }
    }

    private var nextWateringDate: Date {
        Calendar.current.date(byAdding: .day, value: wateringFrequency, to: lastWatered) ?? Date()
    }

    private var isFormValid: Bool {
        !name.trimmingCharacters(in: .whitespaces).isEmpty &&
        !selectedLocation.trimmingCharacters(in: .whitespaces).isEmpty &&
        wateringFrequency > 0
    }

    private func addPlant() {
        errorMessage = nil
        isLoading = true

        Task {
            do {
                // Determine species name
                let speciesName: String?
                if let selected = selectedSpecies {
                    speciesName = selected.name
                } else if !customSpeciesName.isEmpty {
                    speciesName = customSpeciesName.trimmingCharacters(in: .whitespaces)
                } else {
                    speciesName = nil
                }

                // Create plant first
                let plant = try await plantService.createPlant(
                    name: name.trimmingCharacters(in: .whitespaces),
                    species: speciesName,
                    location: selectedLocation,
                    wateringFrequency: wateringFrequency,
                    lastWatered: lastWatered,
                    notes: notes.isEmpty ? nil : notes.trimmingCharacters(in: .whitespaces),
                    imageUrl: nil
                )

                // Upload image if one was selected
                if let image = selectedImage {
                    isUploadingImage = true
                    do {
                        _ = try await imageUploadService.uploadPlantImage(image, for: plant.id)
                    } catch {
                        // Image upload failed, but plant was created
                        print("Failed to upload image: \(error)")
                        // Don't show error to user, plant is still created
                    }
                    isUploadingImage = false
                }

                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }

            isLoading = false
        }
    }
}

#Preview {
    AddPlantView()
}
