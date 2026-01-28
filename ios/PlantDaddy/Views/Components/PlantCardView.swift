//
//  PlantCardView.swift
//  PlantDaddy
//
//  Reusable plant card component
//

import SwiftUI

struct PlantCardView: View {
    let plant: Plant
    var speciesImageUrl: String? = nil

    private var wateringStatus: (color: Color, text: String, icon: String) {
        let days = plant.daysUntilWatering

        if days < 0 {
            return (.red, "Overdue by \(abs(days))d", "exclamationmark.triangle.fill")
        } else if days == 0 {
            return (.orange, "Water today", "drop.fill")
        } else if days == 1 {
            return (.yellow, "Water tomorrow", "drop.fill")
        } else {
            return (.green, "Water in \(days)d", "checkmark.circle.fill")
        }
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            // Plant Image (with species image fallback)
            let displayImageUrl = plant.fullImageUrl ?? speciesImageUrl

            if let imageUrl = displayImageUrl {
                let _ = print("🖼️ PlantCardView loading image: \(imageUrl)")
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))
                        .overlay(
                            Image(systemName: "leaf.fill")
                                .font(.largeTitle)
                                .foregroundColor(.green.opacity(0.3))
                        )
                }
                .frame(height: 200)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
                    .frame(height: 200)
                    .overlay(
                        Image(systemName: "leaf.fill")
                            .font(.largeTitle)
                            .foregroundColor(.green.opacity(0.3))
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }

            // Plant Info
            VStack(alignment: .leading, spacing: 4) {
                Text(plant.name)
                    .font(.headline)
                    .fontWeight(.bold)

                if let species = plant.species {
                    Text(species)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }

                HStack {
                    Image(systemName: "location.fill")
                        .font(.caption)
                    Text(plant.location)
                        .font(.caption)
                }
                .foregroundColor(.secondary)

                // Watering Status
                HStack {
                    Image(systemName: wateringStatus.icon)
                        .font(.caption)
                    Text(wateringStatus.text)
                        .font(.caption)
                        .fontWeight(.medium)
                }
                .foregroundColor(wateringStatus.color)
                .padding(.vertical, 4)
            }
        }
        .padding()
        .background(Color(.systemBackground))
        .cornerRadius(16)
        .shadow(color: Color.black.opacity(0.1), radius: 8, x: 0, y: 2)
    }
}

// Preview
#Preview {
    PlantCardView(plant: Plant(
        id: 1,
        name: "Monstera Deliciosa",
        species: "Monstera",
        location: "Living Room",
        wateringFrequency: 7,
        lastWatered: Date().addingTimeInterval(-6 * 24 * 60 * 60),
        notes: "Loves indirect sunlight",
        imageUrl: nil,
        userId: 1
    ))
    .padding()
}
