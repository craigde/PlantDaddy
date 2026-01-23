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
    case plantUploadURL(id: Int)
    case plantCompleteImageUpload(id: Int)

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
        case .plantUploadURL(let id):
            return "/plants/\(id)/upload-url"
        case .plantCompleteImageUpload(let id):
            return "/plants/\(id)/image"
        }
    }

    var url: URL? {
        URL(string: APIConfig.baseURL + path)
    }
}
