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
            // For local testing - change to your computer's IP if testing on device
            // Example: "http://192.168.1.100:5000/api"
            return "http://localhost:5000/api"
        case .production:
            // Your Railway deployment URL
            // TODO: Replace with your actual Railway URL
            return "https://your-app.up.railway.app/api"
        }
    }

    /// Timeout interval for requests
    static let timeoutInterval: TimeInterval = 30

    /// Maximum image upload size (5MB)
    static let maxImageSize: Int = 5 * 1024 * 1024
}
