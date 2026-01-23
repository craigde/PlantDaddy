//
//  ImageUploadService.swift
//  PlantDaddy
//
//  Service for handling image uploads to backend
//

import Foundation
import UIKit

struct UploadURLResponse: Codable {
    let uploadURL: String
}

struct ImageUploadCompleteRequest: Codable {
    let imageURL: String
}

struct ImageUploadCompleteResponse: Codable {
    let success: Bool
    let imageUrl: String
    let plant: Plant?
}

class ImageUploadService {
    static let shared = ImageUploadService()

    private let apiClient = APIClient.shared

    private init() {}

    // MARK: - Image Upload

    /// Upload an image for a plant
    /// - Parameters:
    ///   - image: UIImage to upload
    ///   - plantId: ID of the plant
    /// - Returns: URL of the uploaded image
    func uploadPlantImage(_ image: UIImage, for plantId: Int) async throws -> String {
        // Step 1: Compress image
        guard let imageData = compressImage(image) else {
            throw NetworkError.unknown
        }

        // Step 2: Get upload URL from backend
        let uploadURLResponse: UploadURLResponse = try await apiClient.request(
            endpoint: .plantUploadURL(id: plantId),
            method: .post
        )

        // Step 3: Upload image to storage
        try await uploadImageData(imageData, to: uploadURLResponse.uploadURL)

        // Step 4: Complete the upload on backend
        let completeRequest = ImageUploadCompleteRequest(imageURL: uploadURLResponse.uploadURL)
        let completeResponse: ImageUploadCompleteResponse = try await apiClient.request(
            endpoint: .plantCompleteImageUpload(id: plantId),
            method: .put,
            body: completeRequest
        )

        return completeResponse.imageUrl
    }

    // MARK: - Image Processing

    /// Compress image to reduce file size
    private func compressImage(_ image: UIImage) -> Data? {
        // Resize if too large
        let maxSize: CGFloat = 1024
        let resizedImage = resizeImage(image, maxSize: maxSize)

        // Compress to JPEG with quality 0.7
        return resizedImage.jpegData(compressionQuality: 0.7)
    }

    /// Resize image maintaining aspect ratio
    private func resizeImage(_ image: UIImage, maxSize: CGFloat) -> UIImage {
        let size = image.size
        let ratio = min(maxSize / size.width, maxSize / size.height)

        // Already smaller than max size
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

    /// Upload image data to storage URL
    private func uploadImageData(_ data: Data, to urlString: String) async throws {
        guard let url = URL(string: urlString) else {
            throw NetworkError.invalidURL
        }

        var request = URLRequest(url: url)
        request.httpMethod = "PUT"
        request.setValue("image/jpeg", forHTTPHeaderField: "Content-Type")
        request.httpBody = data

        let (_, response) = try await URLSession.shared.data(for: request)

        guard let httpResponse = response as? HTTPURLResponse,
              (200...299).contains(httpResponse.statusCode) else {
            throw NetworkError.httpError(500, "Failed to upload image")
        }
    }

    // MARK: - Helper Methods

    /// Get image from URL (for displaying uploaded images)
    func loadImage(from urlString: String) async throws -> UIImage {
        guard let url = URL(string: urlString) else {
            throw NetworkError.invalidURL
        }

        let (data, _) = try await URLSession.shared.data(from: url)

        guard let image = UIImage(data: data) else {
            throw NetworkError.decodingError(NSError(domain: "Invalid image data", code: -1))
        }

        return image
    }
}
