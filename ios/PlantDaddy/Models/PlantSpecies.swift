//
//  PlantSpecies.swift
//  PlantDaddy
//
//  Plant species model matching backend schema
//

import Foundation

struct PlantSpecies: Codable, Identifiable {
    let id: Int
    let name: String
    let scientificName: String
    let family: String?
    let origin: String?
    let description: String
    let careLevel: CareLevel
    let lightRequirements: String
    let wateringFrequency: Int // recommended watering in days
    let humidity: String?
    let soilType: String?
    let propagation: String?
    let toxicity: String?
    let commonIssues: String?
    let imageUrl: String?
    let userId: Int? // null = global species, set = user custom species

    var isGlobal: Bool {
        userId == nil
    }
}

enum CareLevel: String, Codable, CaseIterable {
    case easy = "easy"
    case moderate = "moderate"
    case difficult = "difficult"

    var displayName: String {
        rawValue.capitalized
    }

    var emoji: String {
        switch self {
        case .easy: return "🌱"
        case .moderate: return "🪴"
        case .difficult: return "🌳"
        }
    }
}
