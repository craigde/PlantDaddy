//
//  Household.swift
//  PlantDaddy
//
//  Household model for shared plant management
//

import Foundation

struct Household: Codable, Identifiable {
    let id: Int
    let name: String
    let inviteCode: String
    let createdBy: Int
    let createdAt: String
    let role: String // "owner", "member", "caretaker"
}

struct HouseholdDetail: Codable, Identifiable {
    let id: Int
    let name: String
    let inviteCode: String
    let createdBy: Int
    let createdAt: String
    let members: [HouseholdMember]
}

struct HouseholdMember: Codable, Identifiable {
    let id: Int
    let householdId: Int
    let userId: Int
    let role: String
    let joinedAt: String
    let username: String
}

struct JoinHouseholdRequest: Codable {
    let inviteCode: String
}

struct JoinHouseholdResponse: Codable {
    let household: Household
    let households: [Household]
}

struct CreateHouseholdRequest: Codable {
    let name: String
}

struct UpdateMemberRoleRequest: Codable {
    let role: String
}
