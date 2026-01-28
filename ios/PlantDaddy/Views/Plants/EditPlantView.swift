//
//  EditPlantView.swift
//  PlantDaddy
//
//  View for editing an existing plant's details
//

import SwiftUI

struct EditPlantView: View {
    let plant: Plant
    let onSave: (Plant) -> Void

    @Environment(\.dismiss) private var dismiss
    @ObservedObject private var plantService = PlantService.shared

    @State private var name: String = ""
    @State private var selectedSpecies: PlantSpecies?
    @State private var customSpeciesName: String = ""
    @State private var selectedLocation: String = ""
    @State private var wateringFrequency: Int = 7
    @State private var lastWatered: Date = Date()
    @State private var notes: String = ""
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?
    @State private var useCustomSpecies: Bool = false

    private let wateringFrequencies = [1, 2, 3, 5, 7, 10, 14, 21, 30]

    var body: some View {
        NavigationStack {
            Form {
                Section("Plant Information") {
                    TextField("Plant Name", text: $name)

                    // Species Selection
                    if !useCustomSpecies && !plantService.plantSpecies.isEmpty {
                        Picker("Species", selection: $selectedSpecies) {
                            Text("No species").tag(nil as PlantSpecies?)
                            ForEach(plantService.plantSpecies) { species in
                                HStack {
                                    Text(species.name)
                                    Text(species.careLevel.emoji)
                                }
                                .tag(species as PlantSpecies?)
                            }
                        }
                        .onChange(of: selectedSpecies) { newSpecies in
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
            .navigationTitle("Edit Plant")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    Button("Cancel") {
                        dismiss()
                    }
                }

                ToolbarItem(placement: .navigationBarTrailing) {
                    Button("Save") {
                        savePlant()
                    }
                    .disabled(isLoading || !isFormValid)
                }
            }
            .onAppear {
                populateFields()
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

    private func populateFields() {
        name = plant.name
        selectedLocation = plant.location
        wateringFrequency = plant.wateringFrequency
        lastWatered = plant.lastWatered
        notes = plant.notes ?? ""

        // Match species
        if let speciesName = plant.species {
            if let match = plantService.plantSpecies.first(where: { $0.name == speciesName }) {
                selectedSpecies = match
                useCustomSpecies = false
            } else {
                customSpeciesName = speciesName
                useCustomSpecies = true
            }
        }
    }

    private func savePlant() {
        errorMessage = nil
        isLoading = true

        Task {
            do {
                let speciesName: String?
                if let selected = selectedSpecies {
                    speciesName = selected.name
                } else if !customSpeciesName.isEmpty {
                    speciesName = customSpeciesName.trimmingCharacters(in: .whitespaces)
                } else {
                    speciesName = nil
                }

                let updates = UpdatePlantRequest(
                    name: name.trimmingCharacters(in: .whitespaces),
                    species: speciesName,
                    location: selectedLocation,
                    wateringFrequency: wateringFrequency,
                    lastWatered: lastWatered,
                    notes: notes.isEmpty ? nil : notes.trimmingCharacters(in: .whitespaces),
                    imageUrl: nil  // Don't change image through edit form
                )

                let updatedPlant = try await plantService.updatePlant(id: plant.id, updates: updates)
                onSave(updatedPlant)
                dismiss()
            } catch {
                errorMessage = error.localizedDescription
            }

            isLoading = false
        }
    }
}

#Preview {
    EditPlantView(
        plant: Plant(
            id: 1,
            name: "Monstera",
            species: "Monstera Deliciosa",
            location: "Living Room",
            wateringFrequency: 7,
            lastWatered: Date(),
            notes: "Loves humidity",
            imageUrl: nil,
            userId: 1
        )
    ) { _ in }
}
