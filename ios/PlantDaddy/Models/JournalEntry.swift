//
//  JournalEntry.swift
//  PlantDaddy
//
//  Plant journal entry model for Plant Story
//

import Foundation

struct JournalEntry: Codable, Identifiable {
    let id: Int
    let plantId: Int
    let imageUrl: String
    let caption: String?
    let createdAt: Date
    let userId: Int
    let username: String?

    var fullImageUrl: String? {
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

struct CreateJournalEntryRequest: Codable {
    let imageUrl: String
    let caption: String?
}
