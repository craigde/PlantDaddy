//
//  AuthenticatedImage.swift
//  PlantDaddy
//
//  Custom image view that handles authenticated R2 image loading
//

import SwiftUI

/// A view that loads images with authentication support for R2 storage
/// R2 images require JWT auth and redirect to presigned URLs
struct AuthenticatedImage<LoadingPlaceholder: View, FailurePlaceholder: View>: View {
    let url: String?
    let fallbackUrl: String?
    let loadingPlaceholder: () -> LoadingPlaceholder
    let failurePlaceholder: () -> FailurePlaceholder

    @State private var loadedImage: UIImage?
    @State private var isLoading = false
    @State private var loadFailed = false
    @State private var triedFallback = false
    @State private var currentLoadId: UUID = UUID()

    init(
        url: String?,
        fallbackUrl: String? = nil,
        @ViewBuilder loadingPlaceholder: @escaping () -> LoadingPlaceholder,
        @ViewBuilder failurePlaceholder: @escaping () -> FailurePlaceholder
    ) {
        self.url = url
        self.fallbackUrl = fallbackUrl
        self.loadingPlaceholder = loadingPlaceholder
        self.failurePlaceholder = failurePlaceholder
    }

    var body: some View {
        Group {
            if let image = loadedImage {
                Image(uiImage: image)
                    .resizable()
            } else if loadFailed {
                failurePlaceholder()
            } else {
                loadingPlaceholder()
            }
        }
        .onAppear {
            loadImageIfNeeded()
        }
        .onChange(of: url) { newUrl in
            // Reset and reload when URL changes
            // Generate new load ID to invalidate any in-flight loads
            currentLoadId = UUID()
            loadedImage = nil
            isLoading = false
            loadFailed = false
            triedFallback = false
            loadImageIfNeeded()
        }
    }

    private func loadImageIfNeeded() {
        guard !isLoading, loadedImage == nil, !loadFailed else { return }
        guard let urlString = url, !urlString.isEmpty else {
            print("🖼️ [AuthenticatedImage] No URL provided")
            // No primary URL - try fallback immediately if available
            tryFallbackOrFail()
            return
        }

        print("🖼️ [AuthenticatedImage] Loading URL: \(urlString)")
        loadUrl(urlString)
    }

    private func loadUrl(_ urlString: String) {
        // Check if this is an R2 URL that needs authentication
        if urlString.contains("/r2/") {
            print("🖼️ [AuthenticatedImage] Detected R2 URL, using authenticated loading")
            loadAuthenticatedImage(urlString)
        } else if let imageUrl = URL(string: urlString) {
            print("🖼️ [AuthenticatedImage] Regular URL, loading directly")
            loadRegularImage(imageUrl)
        } else {
            print("🖼️ [AuthenticatedImage] Invalid URL: \(urlString)")
            tryFallbackOrFail()
        }
    }

    private func tryFallbackOrFail() {
        // If we haven't tried the fallback yet and one exists, try it
        if !triedFallback, let fallback = fallbackUrl, !fallback.isEmpty {
            print("🖼️ [AuthenticatedImage] Primary failed, trying fallback URL: \(fallback)")
            triedFallback = true
            loadUrl(fallback)
        } else {
            // No fallback or fallback already tried - mark as failed
            loadFailed = true
            isLoading = false
        }
    }

    private func loadAuthenticatedImage(_ urlString: String) {
        isLoading = true
        let loadId = currentLoadId  // Capture current load ID

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
            tryFallbackOrFail()
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

                // Check if this load is still current before updating state
                guard loadId == currentLoadId else {
                    print("🖼️ [AuthenticatedImage] Load cancelled (stale loadId)")
                    return
                }

                if let httpResponse = response as? HTTPURLResponse {
                    print("🖼️ [AuthenticatedImage] Response status: \(httpResponse.statusCode)")
                    print("🖼️ [AuthenticatedImage] Response URL: \(httpResponse.url?.absoluteString ?? "nil")")
                    print("🖼️ [AuthenticatedImage] Data size: \(data.count) bytes")

                    if (200...299).contains(httpResponse.statusCode),
                       let image = UIImage(data: data) {
                        print("🖼️ [AuthenticatedImage] Successfully loaded image!")
                        await MainActor.run {
                            guard loadId == self.currentLoadId else { return }
                            self.loadedImage = image
                            self.isLoading = false
                        }
                    } else {
                        print("🖼️ [AuthenticatedImage] Failed to create UIImage from data")
                        if let responseText = String(data: data.prefix(500), encoding: .utf8) {
                            print("🖼️ [AuthenticatedImage] Response body: \(responseText)")
                        }
                        await MainActor.run {
                            guard loadId == self.currentLoadId else { return }
                            self.isLoading = false
                            self.tryFallbackOrFail()
                        }
                    }
                } else {
                    print("🖼️ [AuthenticatedImage] Not an HTTP response")
                    await MainActor.run {
                        guard loadId == self.currentLoadId else { return }
                        self.isLoading = false
                        self.tryFallbackOrFail()
                    }
                }
            } catch {
                print("🖼️ [AuthenticatedImage] Error: \(error)")
                await MainActor.run {
                    guard loadId == self.currentLoadId else { return }
                    self.isLoading = false
                    self.tryFallbackOrFail()
                }
            }
        }
    }

    private func loadRegularImage(_ url: URL) {
        isLoading = true
        let loadId = currentLoadId  // Capture current load ID

        Task {
            do {
                let (data, _) = try await URLSession.shared.data(from: url)

                // Check if this load is still current before updating state
                guard loadId == currentLoadId else {
                    print("🖼️ [AuthenticatedImage] Load cancelled (stale loadId)")
                    return
                }

                if let image = UIImage(data: data) {
                    await MainActor.run {
                        guard loadId == self.currentLoadId else { return }
                        self.loadedImage = image
                        self.isLoading = false
                    }
                } else {
                    await MainActor.run {
                        guard loadId == self.currentLoadId else { return }
                        self.isLoading = false
                        self.tryFallbackOrFail()
                    }
                }
            } catch {
                print("Failed to load image: \(error)")
                await MainActor.run {
                    guard loadId == self.currentLoadId else { return }
                    self.isLoading = false
                    self.tryFallbackOrFail()
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

// Convenience initializer with same placeholder for both states (backward compatibility)
extension AuthenticatedImage where LoadingPlaceholder == FailurePlaceholder {
    init(url: String?, fallbackUrl: String? = nil, @ViewBuilder placeholder: @escaping () -> LoadingPlaceholder) {
        self.init(url: url, fallbackUrl: fallbackUrl, loadingPlaceholder: placeholder, failurePlaceholder: placeholder)
    }
}

// Convenience initializer with default placeholders
extension AuthenticatedImage where LoadingPlaceholder == AnyView, FailurePlaceholder == AnyView {
    init(url: String?, fallbackUrl: String? = nil) {
        self.init(
            url: url,
            fallbackUrl: fallbackUrl,
            loadingPlaceholder: {
                AnyView(
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))
                        .overlay(ProgressView())
                )
            },
            failurePlaceholder: {
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
        )
    }
}
