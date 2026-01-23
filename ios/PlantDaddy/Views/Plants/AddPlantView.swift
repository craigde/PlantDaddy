//
//  AddPlantView.swift
//  PlantDaddy
//
//  View for adding a new plant
//

import SwiftUI

struct AddPlantView: View {
    @Environment(\.dismiss) private var dismiss
    @StateObject private var plantService = PlantService.shared

    @State private var name: String = ""
    @State private var species: String = ""
    @State private var selectedLocation: String = ""
    @State private var wateringFrequency: Int = 7
    @State private var lastWatered: Date = Date()
    @State private var notes: String = ""
    @State private var isLoading: Bool = false
    @State private var errorMessage: String?

    private let wateringFrequencies = [1, 2, 3, 5, 7, 10, 14, 21, 30]

    var body: some View {
        NavigationView {
            Form {
                Section("Plant Information") {
                    TextField("Plant Name", text: $name)

                    TextField("Species (optional)", text: $species)
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
                // Set default location if available
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
                _ = try await plantService.createPlant(
                    name: name.trimmingCharacters(in: .whitespaces),
                    species: species.isEmpty ? nil : species.trimmingCharacters(in: .whitespaces),
                    location: selectedLocation,
                    wateringFrequency: wateringFrequency,
                    lastWatered: lastWatered,
                    notes: notes.isEmpty ? nil : notes.trimmingCharacters(in: .whitespaces),
                    imageUrl: nil
                )

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
