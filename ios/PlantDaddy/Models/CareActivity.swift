//
//  CareActivity.swift
//  PlantDaddy
//
//  Care activity model
//

import Foundation

enum ActivityType: String, Codable, CaseIterable {
    case watering = "watering"
    case fertilizing = "fertilizing"
    case repotting = "repotting"
    case pruning = "pruning"
    case misting = "misting"
    case rotating = "rotating"
    case checked = "checked"

    var emoji: String {
        switch self {
        case .watering: return "💧"
        case .fertilizing: return "🌿"
        case .repotting: return "🪴"
        case .pruning: return "✂️"
        case .misting: return "💨"
        case .rotating: return "🔄"
        case .checked: return "👀"
        }
    }

    var displayName: String {
        switch self {
        case .checked: return "Checked"
        default: return rawValue.capitalized
        }
    }
}

struct CareActivity: Codable, Identifiable {
    let id: Int
    let plantId: Int
    let activityType: ActivityType
    let notes: String?
    let performedAt: Date
    let userId: Int
    let username: String?
}

struct CreateCareActivityRequest: Codable {
    let activityType: ActivityType
    let notes: String?
}
