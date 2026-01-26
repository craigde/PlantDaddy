//
//  APIClient.swift
//  PlantDaddy
//
//  Main API client for network requests
//

import Foundation

class APIClient: NSObject {
    static let shared = APIClient()

    private lazy var session: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = APIConfig.timeoutInterval

        // In DEBUG mode, use custom delegate to bypass certificate validation (for Zscaler)
        // In RELEASE mode, use default certificate validation
        #if DEBUG
        print("⚠️ DEBUG MODE: Certificate validation disabled for development (Zscaler compatibility)")
        return URLSession(configuration: config, delegate: self, delegateQueue: nil)
        #else
        return URLSession(configuration: config)
        #endif
    }()

    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    private override init() {
        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .iso8601

        self.encoder = JSONEncoder()
        self.encoder.dateEncodingStrategy = .iso8601

        super.init()
    }

    // MARK: - Generic Request Methods

    func request<T: Decodable>(
        endpoint: APIEndpoint,
        method: HTTPMethod = .get,
        body: Encodable? = nil,
        requiresAuth: Bool = true
    ) async throws -> T {
        guard let url = endpoint.url else {
            throw NetworkError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = method.rawValue
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        // Add JWT token if authentication is required
        if requiresAuth {
            if let token = KeychainService.shared.getToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            } else {
                throw NetworkError.unauthorized
            }
        }

        // Encode request body if present
        if let body = body {
            request.httpBody = try encoder.encode(body)
        }

        do {
            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw NetworkError.unknown
            }

            // Handle different HTTP status codes
            switch httpResponse.statusCode {
            case 200...299:
                // Success - decode and return
                do {
                    return try decoder.decode(T.self, from: data)
                } catch {
                    throw NetworkError.decodingError(error)
                }
            case 401:
                // Unauthorized - clear token and throw
                KeychainService.shared.deleteToken()
                throw NetworkError.unauthorized
            case 400...499:
                // Client error - try to decode error message
                if let errorResponse = try? decoder.decode(ErrorResponse.self, from: data) {
                    throw NetworkError.httpError(httpResponse.statusCode, errorResponse.error)
                }
                throw NetworkError.httpError(httpResponse.statusCode, nil)
            case 500...599:
                // Server error
                throw NetworkError.httpError(httpResponse.statusCode, "Server error")
            default:
                throw NetworkError.httpError(httpResponse.statusCode, nil)
            }
        } catch let error as NetworkError {
            throw error
        } catch {
            throw NetworkError.networkError(error)
        }
    }

    // Request without response body (for DELETE operations)
    func requestWithoutResponse(
        endpoint: APIEndpoint,
        method: HTTPMethod,
        body: Encodable? = nil,
        requiresAuth: Bool = true
    ) async throws {
        struct EmptyResponse: Codable {}

        let _: EmptyResponse? = try? await request(
            endpoint: endpoint,
            method: method,
            body: body,
            requiresAuth: requiresAuth
        )
    }
}

// MARK: - URLSessionDelegate for Certificate Handling

#if DEBUG
extension APIClient: URLSessionDelegate {
    func urlSession(
        _ session: URLSession,
        didReceive challenge: URLAuthenticationChallenge,
        completionHandler: @escaping (URLSession.AuthChallengeDisposition, URLCredential?) -> Void
    ) {
        // In DEBUG mode, accept all certificates (for Zscaler corporate proxy)
        // WARNING: This should NEVER be enabled in production!
        guard challenge.protectionSpace.authenticationMethod == NSURLAuthenticationMethodServerTrust,
              let serverTrust = challenge.protectionSpace.serverTrust else {
            completionHandler(.performDefaultHandling, nil)
            return
        }

        // Force the trust evaluation to succeed
        var error: CFError?
        let result = SecTrustEvaluateWithError(serverTrust, &error)

        if !result {
            print("⚠️ Certificate validation failed (expected with Zscaler): \(error?.localizedDescription ?? "unknown error")")
            print("⚠️ Forcing trust acceptance for development")
        }

        // Accept the credential regardless of validation result
        let credential = URLCredential(trust: serverTrust)
        completionHandler(.useCredential, credential)
    }
}
#endif

// MARK: - Convenience Extensions for Date Formatting

extension DateFormatter {
    static let iso8601Full: DateFormatter = {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ"
        formatter.calendar = Calendar(identifier: .iso8601)
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        return formatter
    }()
}
