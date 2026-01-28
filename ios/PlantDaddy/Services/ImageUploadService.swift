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

class ImageUploadService {
    static let shared = ImageUploadService()

    private init() {}

    // MARK: - Image Upload

    /// Upload an image for a plant via multipart form data
    /// - Parameters:
    ///   - image: UIImage to upload
    ///   - plantId: ID of the plant
    /// - Returns: URL of the uploaded image
    func uploadPlantImage(_ image: UIImage, for plantId: Int) async throws -> String {
        guard let imageData = compressImage(image) else {
            throw NetworkError.unknown
        }

        let endpoint = APIEndpoint.plantImageUpload(id: plantId)
        guard let url = endpoint.url else {
            throw NetworkError.invalidURL
        }

        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        // Add auth token
        if let token = KeychainService.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else {
            throw NetworkError.unauthorized
        }

        // Build multipart body
        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"plant.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        let session: URLSession
        #if DEBUG
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = APIConfig.timeoutInterval
        session = URLSession(configuration: config, delegate: APIClient.shared, delegateQueue: nil)
        #else
        session = URLSession.shared
        #endif

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.unknown
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                KeychainService.shared.deleteToken()
                throw NetworkError.unauthorized
            }
            let errorMsg = try? JSONDecoder().decode(ServerErrorResponse.self, from: data)
            throw NetworkError.httpError(httpResponse.statusCode, errorMsg?.message)
        }

        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let uploadResponse = try decoder.decode(ImageUploadResponse.self, from: data)
        return uploadResponse.imageUrl
    }

    /// Upload an image via the general upload endpoint (for health records, etc.)
    /// - Returns: The server path of the uploaded image (e.g. "/uploads/...")
    func uploadGenericImage(_ image: UIImage) async throws -> String {
        guard let imageData = compressImage(image) else {
            throw NetworkError.unknown
        }

        let endpoint = APIEndpoint.uploadImage
        guard let url = endpoint.url else {
            throw NetworkError.invalidURL
        }

        let boundary = UUID().uuidString
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        if let token = KeychainService.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        } else {
            throw NetworkError.unauthorized
        }

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"image\"; filename=\"health.jpg\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
        body.append(imageData)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        request.httpBody = body

        let session: URLSession
        #if DEBUG
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = APIConfig.timeoutInterval
        session = URLSession(configuration: config, delegate: APIClient.shared, delegateQueue: nil)
        #else
        session = URLSession.shared
        #endif

        let (data, response) = try await session.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse else {
            throw NetworkError.unknown
        }

        guard (200...299).contains(httpResponse.statusCode) else {
            if httpResponse.statusCode == 401 {
                KeychainService.shared.deleteToken()
                throw NetworkError.unauthorized
            }
            let errorMsg = try? JSONDecoder().decode(ServerErrorResponse.self, from: data)
            throw NetworkError.httpError(httpResponse.statusCode, errorMsg?.message)
        }

        let uploadResponse = try JSONDecoder().decode(ImageUploadResponse.self, from: data)
        return uploadResponse.imageUrl
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
