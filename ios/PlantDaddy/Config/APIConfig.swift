//
//  APIConfig.swift
//  PlantDaddy
//
//  API configuration for different environments
//

import Foundation

enum AppEnvironment {
    case development
    case production

    static var current: AppEnvironment {
        #if DEBUG
        return .development
        #else
        return .production
        #endif
    }
}

struct APIConfig {
    /// Base URL for the API
    static var baseURL: String {
        switch AppEnvironment.current {
        case .development:
            // Railway production URL (for testing during development)
            return "https://plantdaddy-production.up.railway.app/api"
        case .production:
            // Railway production URL
            return "https://plantdaddy-production.up.railway.app/api"
        }
    }

    /// Timeout interval for requests
    static let timeoutInterval: TimeInterval = 30

    /// Maximum image upload size (5MB)
    static let maxImageSize: Int = 5 * 1024 * 1024
}
