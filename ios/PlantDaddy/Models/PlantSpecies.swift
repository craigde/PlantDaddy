//
//  PlantSpecies.swift
//  PlantDaddy
//
//  Plant species model matching backend schema
//

import Foundation

struct PlantSpecies: Codable, Identifiable, Hashable {
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

    // Full URL for the image (handles relative URLs from backend)
    var fullImageUrl: String? {
        guard let imageUrl = imageUrl else { return nil }

        // If it's already a full URL (starts with http), return as-is
        if imageUrl.hasPrefix("http") {
            print("🖼️ Full URL already: \(imageUrl)")
            return imageUrl
        }

        // If it's a relative URL (starts with /), prepend the base domain
        if imageUrl.hasPrefix("/") {
            // Remove /api from the base URL since uploads are served from root
            let baseURL = APIConfig.baseURL.replacingOccurrences(of: "/api", with: "")
            let fullURL = baseURL + imageUrl
            print("🖼️ Converted relative URL: \(imageUrl) -> \(fullURL)")
            return fullURL
        }

        print("🖼️ Returning imageUrl as-is: \(imageUrl)")
        return imageUrl
    }
}

enum CareLevel: String, Codable, CaseIterable, Hashable {
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
