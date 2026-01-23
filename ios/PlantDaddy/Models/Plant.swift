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
    let watering: WateringEntry
    let plant: Plant
}

struct WateringEntry: Codable, Identifiable {
    let id: Int
    let plantId: Int
    let wateredAt: Date
    let userId: Int
}
