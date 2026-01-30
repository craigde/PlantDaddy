//
//  APIEndpoint.swift
//  PlantDaddy
//
//  API endpoint definitions
//

import Foundation

enum HTTPMethod: String {
    case get = "GET"
    case post = "POST"
    case patch = "PATCH"
    case delete = "DELETE"
    case put = "PUT"
}

enum APIEndpoint {
    // Authentication
    case login
    case register
    case user

    // Plants
    case plants
    case plant(id: Int)
    case waterPlant(id: Int)
    case wateringHistory(plantId: Int)

    // Plant Species
    case plantSpecies
    case plantSpeciesDetail(id: Int)

    // Locations
    case locations
    case location(id: Int)

    // Health Records
    case healthRecords(plantId: Int)
    case healthRecord(id: Int)

    // Care Activities
    case careActivities(plantId: Int)
    case careActivity(id: Int)

    // Image Upload
    case plantImageUpload(id: Int)
    case uploadImage
    case r2UploadUrl
    case r2Upload

    // Notification Settings
    case notificationSettings
    case testNotification

    // Device Tokens (APNs)
    case deviceTokens

    // Batch watering
    case waterOverdue

    var path: String {
        switch self {
        case .login:
            return "/token-login"
        case .register:
            return "/token-register"
        case .user:
            return "/user"
        case .plants:
            return "/plants"
        case .plant(let id):
            return "/plants/\(id)"
        case .waterPlant(let id):
            return "/plants/\(id)/water"
        case .wateringHistory(let plantId):
            return "/plants/\(plantId)/watering-history"
        case .plantSpecies:
            return "/plant-species"
        case .plantSpeciesDetail(let id):
            return "/plant-species/\(id)"
        case .locations:
            return "/locations"
        case .location(let id):
            return "/locations/\(id)"
        case .healthRecords(let plantId):
            return "/plants/\(plantId)/health-records"
        case .healthRecord(let id):
            return "/health-records/\(id)"
        case .careActivities(let plantId):
            return "/plants/\(plantId)/care-activities"
        case .careActivity(let id):
            return "/care-activities/\(id)"
        case .plantImageUpload(let id):
            return "/plants/\(id)/image"
        case .uploadImage:
            return "/upload-image"
        case .r2UploadUrl:
            return "/r2/upload-url"
        case .r2Upload:
            return "/r2/upload"
        case .notificationSettings:
            return "/notification-settings"
        case .testNotification:
            return "/notification-settings/test"
        case .deviceTokens:
            return "/device-tokens"
        case .waterOverdue:
            return "/plants/water-overdue"
        }
    }

    var url: URL? {
        URL(string: APIConfig.baseURL + path)
    }
}
