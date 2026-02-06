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
        if plant.isSnoozed {
            return (.purple, "Snoozed", "bell.slash.fill")
        }

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
            let primaryUrl = plant.fullImageUrl
            let hasAnyImageUrl = primaryUrl != nil || speciesImageUrl != nil
            // Create a stable ID that changes when the image URL changes
            let imageId = primaryUrl ?? speciesImageUrl ?? "no-image-\(plant.id)"

            if hasAnyImageUrl {
                AuthenticatedImage(
                    url: primaryUrl ?? speciesImageUrl,
                    fallbackUrl: primaryUrl != nil ? speciesImageUrl : nil,
                    loadingPlaceholder: {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                            .overlay(ProgressView())
                    },
                    failurePlaceholder: {
                        Rectangle()
                            .fill(Color.gray.opacity(0.2))
                            .overlay(
                                Image(systemName: "leaf.fill")
                                    .font(.largeTitle)
                                    .foregroundColor(.green.opacity(0.3))
                            )
                    }
                )
                .id(imageId)  // Force view recreation when URL changes
                .aspectRatio(contentMode: .fill)
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
        userId: 1,
        snoozedUntil: nil
    ))
    .padding()
}
