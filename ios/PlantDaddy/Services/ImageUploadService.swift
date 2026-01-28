//
//  ImageUploadService.swift
//  PlantDaddy
//
//  Service for handling image uploads to backend
//

import Foundation
import UIKit

struct ImageUploadResponse: Codable {
    let success: Bool
    let imageUrl: String
    let plant: Plant?
}

/// Response from /api/r2/upload-url endpoint
struct R2UploadUrlResponse: Codable {
    let method: String
    let url: String
    let key: String
    let imageUrl: String
}

class ImageUploadService {
    static let shared = ImageUploadService()

    private init() {}

    // MARK: - R2 Upload URL

    /// Get a presigned URL for uploading directly to R2
    /// - Parameter plantId: Optional plant ID for organizing uploads
    /// - Returns: R2UploadUrlResponse containing the presigned URL and final image URL
    private func getR2UploadUrl(plantId: Int? = nil, contentType: String = "image/jpeg") async throws -> R2UploadUrlResponse {
        let endpoint = APIEndpoint.r2UploadUrl
        guard let url = endpoint.url else {
            throw NetworkError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")

        if let token = KeychainService.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else {
            throw NetworkError.unauthorized
        }

        // Build JSON body
        var bodyDict: [String: Any] = ["contentType": contentType]
        if let plantId = plantId {
            bodyDict["plantId"] = plantId
        }
        request.httpBody = try JSONSerialization.data(withJSONObject: bodyDict)

        let session = createURLSession()
        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.unknown
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                KeychainService.shared.deleteToken()
                throw NetworkError.unauthorized
            }
            if httpResponse.statusCode == 503 {
                // R2 not configured - fall back to local upload
                throw NetworkError.httpError(503, "R2 storage not configured")
            }
            let errorMsg = try? JSONDecoder().decode(ServerErrorResponse.self, from: data)
            throw NetworkError.httpError(httpResponse.statusCode, errorMsg?.message)
        }

        return try JSONDecoder().decode(R2UploadUrlResponse.self, from: data)
    }

    /// Upload image data directly to R2 using a presigned URL
    private func uploadToR2(presignedUrl: String, imageData: Data, contentType: String = "image/jpeg") async throws {
        guard let url = URL(string: presignedUrl) else {
            throw NetworkError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue(contentType, forHTTPHeaderField: "Content-Type")
        request.httpBody = imageData

        // Use a basic session for R2 upload (no auth needed, presigned URL handles it)
        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.unknown
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(httpResponse.statusCode, "Failed to upload to R2")
        }
    }

    /// Create a URL session with appropriate configuration
    private func createURLSession() -> URLSession {
        #if DEBUG
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = APIConfig.timeoutInterval
        return URLSession(configuration: config, delegate: APIClient.shared, delegateQueue: nil)
        #else
        return URLSession.shared
        #endif
    }

    // MARK: - Image Upload

    /// Upload an image for a plant to R2 storage
    /// - Parameters:
    ///   - image: UIImage to upload
    ///   - plantId: ID of the plant
    /// - Returns: URL of the uploaded image (e.g. "/r2/users/1/plants/2/uuid")
    func uploadPlantImage(_ image: UIImage, for plantId: Int) async throws -> String {
        guard let imageData = compressImage(image) else {
            throw NetworkError.unknown
        }

        // Get presigned URL from backend
        let uploadUrlResponse = try await getR2UploadUrl(plantId: plantId, contentType: "image/jpeg")

        // Upload directly to R2
        try await uploadToR2(presignedUrl: uploadUrlResponse.url, imageData: imageData)

        // Return the internal URL for storing in database
        return uploadUrlResponse.imageUrl
    }

    /// Upload an image via R2 (for health records, etc.)
    /// - Returns: The server path of the uploaded image (e.g. "/r2/users/1/uploads/uuid")
    func uploadGenericImage(_ image: UIImage, plantId: Int? = nil) async throws -> String {
        guard let imageData = compressImage(image) else {
            throw NetworkError.unknown
        }

        // Get presigned URL from backend
        let uploadUrlResponse = try await getR2UploadUrl(plantId: plantId, contentType: "image/jpeg")

        // Upload directly to R2
        try await uploadToR2(presignedUrl: uploadUrlResponse.url, imageData: imageData)

        // Return the internal URL for storing in database
        return uploadUrlResponse.imageUrl
    }

    // MARK: - Image Processing

    /// Compress image to reduce file size
    private func compressImage(_ image: UIImage) -> Data? {
        let maxSize: CGFloat = 1024
        let resizedImage = resizeImage(image, maxSize: maxSize)
        return resizedImage.jpegData(compressionQuality: 0.7)
    }

    /// Resize image maintaining aspect ratio
    private func resizeImage(_ image: UIImage, maxSize: CGFloat) -> UIImage {
        let size = image.size
        let ratio = min(maxSize / size.width, maxSize / size.height)

        if ratio >= 1 {
            return image
        }

        let newSize = CGSize(
            width: size.width * ratio,
            height: size.height * ratio
        )

        let renderer = UIGraphicsImageRenderer(size: newSize)
        return renderer.image { _ in
            image.draw(in: CGRect(origin: .zero, size: newSize))
        }
    }
}

/// Matches the server's error response format: { message: "..." }
private struct ServerErrorResponse: Codable {
    let message: String
}
