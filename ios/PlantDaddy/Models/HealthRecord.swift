//
//  HealthRecord.swift
//  PlantDaddy
//
//  Plant health record model
//

import Foundation

enum HealthStatus: String, Codable, CaseIterable {
    case thriving = "thriving"
    case struggling = "struggling"
    case sick = "sick"

    var emoji: String {
        switch self {
        case .thriving: return "🌱"
        case .struggling: return "😐"
        case .sick: return "🤒"
        }
    }

    var displayName: String {
        rawValue.capitalized
    }
}

struct HealthRecord: Codable, Identifiable {
    let id: Int
    let plantId: Int
    let status: HealthStatus
    let notes: String?
    let imageUrl: String?
    let recordedAt: Date
    let userId: Int
}

struct CreateHealthRecordRequest: Codable {
    let status: HealthStatus
    let notes: String?
    let imageUrl: String?
}
