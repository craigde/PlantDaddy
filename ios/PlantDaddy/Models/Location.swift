//
//  Location.swift
//  PlantDaddy
//
//  Location model matching backend schema
//

import Foundation

struct Location: Codable, Identifiable {
    let id: Int
    let name: String
    let isDefault: Bool?
    let userId: Int
}

struct CreateLocationRequest: Codable {
    let name: String
    let isDefault: Bool?
}

struct UpdateLocationRequest: Codable {
    let name: String
}
