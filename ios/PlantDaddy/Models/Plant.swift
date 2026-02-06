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
    let snoozedUntil: Date?

    // Computed property for next watering date (respects snooze)
    var nextWateringDate: Date {
        let scheduledDate = Calendar.current.date(byAdding: .day, value: wateringFrequency, to: lastWatered) ?? Date()
        // If snoozed past the scheduled date, push next watering to the snooze end
        if let snoozedUntil = snoozedUntil, snoozedUntil > scheduledDate {
            return snoozedUntil
        }
        return scheduledDate
    }

    // Check if reminder is currently snoozed
    var isSnoozed: Bool {
        guard let snoozedUntil = snoozedUntil else { return false }
        return snoozedUntil > Date()
    }

    // Check if plant needs watering (respects snooze)
    var needsWatering: Bool {
        if isSnoozed { return false }
        return Date() >= nextWateringDate
    }

    // Days until next watering (can be negative if overdue)
    // Uses calendar day comparison (start-of-day) rather than 24-hour periods
    // so that "tomorrow" always shows as 1 day away regardless of time of day
    var daysUntilWatering: Int {
        let startOfToday = Calendar.current.startOfDay(for: Date())
        let startOfWateringDay = Calendar.current.startOfDay(for: nextWateringDate)
        return Calendar.current.dateComponents([.day], from: startOfToday, to: startOfWateringDay).day ?? 0
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

struct SnoozePlantRequest: Codable {
    let snoozedUntil: Date
    let notes: String?
}

struct SnoozePlantResponse: Codable {
    let success: Bool
    let plant: Plant
    let message: String
}
