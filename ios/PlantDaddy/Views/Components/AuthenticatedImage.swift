//
//  AuthenticatedImage.swift
//  PlantDaddy
//
//  Custom image view that handles authenticated R2 image loading
//

import SwiftUI

/// A view that loads images with authentication support for R2 storage
/// R2 images require JWT auth and redirect to presigned URLs
struct AuthenticatedImage<Placeholder: View>: View {
    let url: String?
    let placeholder: () -> Placeholder

    @State private var loadedImage: UIImage?
    @State private var isLoading = false
    @State private var loadFailed = false

    init(url: String?, @ViewBuilder placeholder: @escaping () -> Placeholder) {
        self.url = url
        self.placeholder = placeholder
    }

    var body: some View {
        Group {
            if let image = loadedImage {
                Image(uiImage: image)
                    .resizable()
            } else {
                placeholder()
            }
        }
        .onAppear {
            loadImageIfNeeded()
        }
        .onChange(of: url) { newUrl in
            // Reset and reload when URL changes
            loadedImage = nil
            loadFailed = false
            loadImageIfNeeded()
        }
    }

    private func loadImageIfNeeded() {
        guard !isLoading, loadedImage == nil, !loadFailed else { return }
        guard let urlString = url, !urlString.isEmpty else {
            print("🖼️ [AuthenticatedImage] No URL provided")
            return
        }

        print("🖼️ [AuthenticatedImage] Loading URL: \(urlString)")

        // Check if this is an R2 URL that needs authentication
        if urlString.contains("/r2/") {
            print("🖼️ [AuthenticatedImage] Detected R2 URL, using authenticated loading")
            loadAuthenticatedImage(urlString)
        } else if let imageUrl = URL(string: urlString) {
            print("🖼️ [AuthenticatedImage] Regular URL, loading directly")
            loadRegularImage(imageUrl)
        } else {
            print("🖼️ [AuthenticatedImage] Invalid URL: \(urlString)")
        }
    }

    private func loadAuthenticatedImage(_ urlString: String) {
        isLoading = true

        // Construct full URL if needed
        let fullUrlString: String
        if urlString.hasPrefix("http") {
            fullUrlString = urlString
        } else {
            let baseURL = APIConfig.baseURL.replacingOccurrences(of: "/api", with: "")
            fullUrlString = baseURL + urlString
        }

        print("🖼️ [AuthenticatedImage] Full URL: \(fullUrlString)")

        guard let url = URL(string: fullUrlString) else {
            print("🖼️ [AuthenticatedImage] Failed to create URL from: \(fullUrlString)")
            isLoading = false
            loadFailed = true
            return
        }

        var request = URLRequest(url: url)
        request.httpMethod = "GET"

        // Add JWT auth header
        if let token = KeychainService.shared.getToken() {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            print("🖼️ [AuthenticatedImage] Added auth token")
        } else {
            print("🖼️ [AuthenticatedImage] WARNING: No auth token available!")
        }

        // Create session that follows redirects
        let session = createURLSession()

        Task {
            do {
                let (data, response) = try await session.data(for: request)

                if let httpResponse = response as? HTTPURLResponse {
                    print("🖼️ [AuthenticatedImage] Response status: \(httpResponse.statusCode)")
                    print("🖼️ [AuthenticatedImage] Response URL: \(httpResponse.url?.absoluteString ?? "nil")")
                    print("🖼️ [AuthenticatedImage] Data size: \(data.count) bytes")

                    if (200...299).contains(httpResponse.statusCode),
                       let image = UIImage(data: data) {
                        print("🖼️ [AuthenticatedImage] Successfully loaded image!")
                        await MainActor.run {
                            self.loadedImage = image
                            self.isLoading = false
                        }
                    } else {
                        print("🖼️ [AuthenticatedImage] Failed to create UIImage from data")
                        if let responseText = String(data: data.prefix(500), encoding: .utf8) {
                            print("🖼️ [AuthenticatedImage] Response body: \(responseText)")
                        }
                        await MainActor.run {
                            self.loadFailed = true
                            self.isLoading = false
                        }
                    }
                } else {
                    print("🖼️ [AuthenticatedImage] Not an HTTP response")
                    await MainActor.run {
                        self.loadFailed = true
                        self.isLoading = false
                    }
                }
            } catch {
                print("🖼️ [AuthenticatedImage] Error: \(error)")
                await MainActor.run {
                    self.loadFailed = true
                    self.isLoading = false
                }
            }
        }
    }

    private func loadRegularImage(_ url: URL) {
        isLoading = true

        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)
                if let image = UIImage(data: data) {
                    await MainActor.run {
                        self.loadedImage = image
                        self.isLoading = false
                    }
                } else {
                    await MainActor.run {
                        self.loadFailed = true
                        self.isLoading = false
                    }
                }
            } catch {
                print("Failed to load image: \(error)")
                await MainActor.run {
                    self.loadFailed = true
                    self.isLoading = false
                }
            }
        }
    }

    private func createURLSession() -> URLSession {
        #if DEBUG
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = APIConfig.timeoutInterval
        return URLSession(configuration: config, delegate: APIClient.shared, delegateQueue: nil)
        #else
        return URLSession.shared
        #endif
    }
}

// Convenience initializer with default placeholder
extension AuthenticatedImage where Placeholder == AnyView {
    init(url: String?) {
        self.init(url: url) {
            AnyView(
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
                    .overlay(
                        Image(systemName: "leaf.fill")
                            .font(.largeTitle)
                            .foregroundColor(.green.opacity(0.3))
                    )
            )
        }
    }
}
