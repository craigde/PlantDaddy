//
//  CareStats.swift
//  PlantDaddy
//
//  Care statistics model
//

import Foundation

struct CareStats: Codable {
    let streak: Int
    let monthlyTotal: Int
    let monthlyByMember: [MemberStats]
    let monthlyByType: [TypeStats]
    let totalPlants: Int
    let plantsNeedingWater: Int
}

struct MemberStats: Codable, Identifiable {
    let userId: Int
    let username: String
    let count: Int

    var id: Int { userId }
}

struct TypeStats: Codable, Identifiable {
    let type: String
    let count: Int

    var id: String { type }
}
