//
//  Plant.swift
//  PlantDaddy
//
//  Plant model matching backend schema
//

import Foundation

struct Plant: Codable, Identifiable {
    let id: Int
    let name: String
    let species: String?
    let location: String
    let wateringFrequency: Int // in days
    let lastWatered: Date
    let notes: String?
    let imageUrl: String?
    let userId: Int

    // Computed property for next watering date
    var nextWateringDate: Date {
        Calendar.current.date(byAdding: .day, value: wateringFrequency, to: lastWatered) ?? Date()
    }

    // Check if plant needs watering
    var needsWatering: Bool {
        Date() >= nextWateringDate
    }

    // Days until next watering (can be negative if overdue)
    var daysUntilWatering: Int {
        Calendar.current.dateComponents([.day], from: Date(), to: nextWateringDate).day ?? 0
    }

    // Full URL for the image (handles relative URLs from backend)
    var fullImageUrl: String? {
        guard let imageUrl = imageUrl else { return nil }

        if imageUrl.hasPrefix("http") {
            return imageUrl
        }

        if imageUrl.hasPrefix("/") {
            let baseURL = APIConfig.baseURL.replacingOccurrences(of: "/api", with: "")
            return baseURL + imageUrl
        }

        return imageUrl
    }
}

struct CreatePlantRequest: Codable {
    let name: String
    let species: String?
    let location: String
    let wateringFrequency: Int
    let lastWatered: Date
    let notes: String?
    let imageUrl: String?
}

struct UpdatePlantRequest: Codable {
    let name: String?
    let species: String?
    let location: String?
    let wateringFrequency: Int?
    let lastWatered: Date?
    let notes: String?
    let imageUrl: String?
}

struct WaterPlantResponse: Codable {
    let success: Bool
    let careActivity: CareActivity
    let plant: Plant
}
