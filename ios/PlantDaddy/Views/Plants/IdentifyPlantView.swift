//
//  IdentifyPlantView.swift
//  PlantDaddy
//
//  AI plant identification using PlantNet API
//

import SwiftUI
import PhotosUI

// MARK: - Response Models

struct IdentifyResult: Codable, Identifiable {
    let score: Double
    let scientificName: String
    let commonNames: [String]
    let family: String
    let genus: String

    var id: String { scientificName }

    var displayName: String {
        commonNames.first ?? scientificName
    }

    var confidencePercent: Int {
        Int(score * 100)
    }
}

struct IdentifyResponse: Codable {
    let bestMatch: String?
    let results: [IdentifyResult]
    let remainingRequests: Int?
}

// MARK: - Identify Plant View

struct IdentifyPlantView: View {
    @ObservedObject private var plantService = PlantService.shared
    @State private var selectedImage: UIImage?
    @State private var selectedItem: PhotosPickerItem?
    @State private var isIdentifying = false
    @State private var results: IdentifyResponse?
    @State private var errorMessage: String?
    @State private var selectedOrgan = "auto"
    @State private var showingCamera = false
    @State private var selectedResult: IdentifyResult?
    @State private var addingToExplorer: String? = nil
    @State private var explorerStatusMessage: String? = nil

    private let organOptions = [
        ("auto", "Auto-detect"),
        ("leaf", "Leaf"),
        ("flower", "Flower"),
        ("fruit", "Fruit"),
        ("bark", "Bark"),
    ]

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    // Photo selection area
                    photoSection

                    if selectedImage != nil {
                        // Organ selector
                        organSelector

                        // Identify button
                        identifyButton
                    }

                    // Error message
                    if let errorMessage = errorMessage {
                        Text(errorMessage)
                            .foregroundColor(.red)
                            .font(.caption)
                            .padding(.horizontal)
                    }

                    // Results
                    if let results = results, !results.results.isEmpty {
                        resultsSection(results: results.results)
                    }
                }
                .padding()
            }
            .navigationTitle("Identify Plant")
            .navigationBarTitleDisplayMode(.large)
            .sheet(isPresented: $showingCamera) {
                CameraPicker(
                    image: $selectedImage,
                    sourceType: .camera,
                    onImagePicked: { image in
                        selectedImage = image
                        results = nil
                        errorMessage = nil
                    }
                )
            }
            .sheet(item: $selectedResult) { result in
                AddPlantView(
                    prefillName: result.displayName,
                    prefillSpecies: result.scientificName,
                    prefillImage: selectedImage
                )
            }
        }
    }

    // MARK: - Photo Section

    private var photoSection: some View {
        Group {
            if let image = selectedImage {
                ZStack(alignment: .topTrailing) {
                    Image(uiImage: image)
                        .resizable()
                        .scaledToFill()
                        .frame(height: 220)
                        .clipShape(RoundedRectangle(cornerRadius: 12))

                    Button {
                        selectedImage = nil
                        results = nil
                        errorMessage = nil
                        selectedItem = nil
                    } label: {
                        Image(systemName: "xmark.circle.fill")
                            .font(.title2)
                            .foregroundStyle(.white)
                            .background(Circle().fill(.black.opacity(0.5)))
                    }
                    .padding(8)
                }
            } else {
                VStack(spacing: 16) {
                    Image(systemName: "camera.viewfinder")
                        .font(.system(size: 48))
                        .foregroundColor(.green)

                    Text("Take or select a photo of a plant")
                        .font(.headline)

                    Text("Best results with clear photos of leaves or flowers")
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .multilineTextAlignment(.center)

                    HStack(spacing: 12) {
                        Button {
                            showingCamera = true
                        } label: {
                            Label("Camera", systemImage: "camera.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.green)

                        PhotosPicker(
                            selection: $selectedItem,
                            matching: .images,
                            photoLibrary: .shared()
                        ) {
                            Label("Library", systemImage: "photo.fill")
                                .frame(maxWidth: .infinity)
                        }
                        .buttonStyle(.borderedProminent)
                        .tint(.blue)
                    }
                }
                .frame(maxWidth: .infinity)
                .padding(24)
                .background(Color(.systemGray6))
                .clipShape(RoundedRectangle(cornerRadius: 12))
                .overlay(
                    RoundedRectangle(cornerRadius: 12)
                        .stroke(Color.green, style: StrokeStyle(lineWidth: 2, dash: [10]))
                )
            }
        }
        .onChange(of: selectedItem) { newItem in
            Task {
                if let newItem = newItem,
                   let data = try? await newItem.loadTransferable(type: Data.self),
                   let uiImage = UIImage(data: data) {
                    selectedImage = uiImage
                    results = nil
                    errorMessage = nil
                }
            }
        }
    }

    // MARK: - Organ Selector

    private var organSelector: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("What part of the plant is shown?")
                .font(.subheadline)
                .foregroundColor(.secondary)

            ScrollView(.horizontal, showsIndicators: false) {
                HStack(spacing: 8) {
                    ForEach(organOptions, id: \.0) { value, label in
                        Button {
                            selectedOrgan = value
                        } label: {
                            Text(label)
                                .font(.subheadline)
                                .padding(.horizontal, 14)
                                .padding(.vertical, 8)
                                .background(
                                    selectedOrgan == value
                                        ? Color.green
                                        : Color(.systemGray5)
                                )
                                .foregroundColor(
                                    selectedOrgan == value ? .white : .primary
                                )
                                .clipShape(Capsule())
                        }
                    }
                }
            }
        }
    }

    // MARK: - Identify Button

    private var identifyButton: some View {
        Button {
            Task { await identifyPlant() }
        } label: {
            HStack {
                if isIdentifying {
                    ProgressView()
                        .tint(.white)
                } else {
                    Image(systemName: "magnifyingglass")
                }
                Text(isIdentifying ? "Identifying..." : "Identify Plant")
            }
            .frame(maxWidth: .infinity)
            .padding(.vertical, 4)
        }
        .buttonStyle(.borderedProminent)
        .tint(.green)
        .disabled(isIdentifying || selectedImage == nil)
    }

    // MARK: - Results Section

    private func isSpeciesInCatalog(_ scientificName: String) -> Bool {
        plantService.plantSpecies.contains { $0.scientificName.lowercased() == scientificName.lowercased() }
    }

    private func resultsSection(results: [IdentifyResult]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Species Matches")
                .font(.headline)

            ForEach(results) { result in
                VStack(spacing: 0) {
                    // Main result button - tap to add as plant
                    Button {
                        selectedResult = result
                    } label: {
                        HStack {
                            VStack(alignment: .leading, spacing: 4) {
                                Text(result.displayName)
                                    .font(.body)
                                    .fontWeight(.medium)
                                    .foregroundColor(.primary)

                                Text(result.scientificName)
                                    .font(.caption)
                                    .italic()
                                    .foregroundColor(.secondary)

                                if !result.family.isEmpty {
                                    Text("Family: \(result.family)")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                            }

                            Spacer()

                            Text("\(result.confidencePercent)%")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .padding(.horizontal, 10)
                                .padding(.vertical, 4)
                                .background(confidenceColor(result.confidencePercent).opacity(0.15))
                                .foregroundColor(confidenceColor(result.confidencePercent))
                                .clipShape(Capsule())

                            Image(systemName: "chevron.right")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(12)
                    }

                    // Add to Explorer section
                    Divider()
                        .padding(.horizontal, 12)

                    if isSpeciesInCatalog(result.scientificName) {
                        HStack(spacing: 4) {
                            Image(systemName: "checkmark.circle.fill")
                                .font(.caption)
                                .foregroundColor(.green)
                            Text("Already in Plant Explorer")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        .padding(.vertical, 8)
                        .padding(.horizontal, 12)
                    } else {
                        Button {
                            Task { await addToExplorer(result) }
                        } label: {
                            HStack(spacing: 6) {
                                if addingToExplorer == result.scientificName {
                                    ProgressView()
                                        .controlSize(.small)
                                } else {
                                    Image(systemName: "sparkles")
                                        .font(.caption)
                                }
                                Text(addingToExplorer == result.scientificName
                                     ? (explorerStatusMessage ?? "Adding...")
                                     : "Add to Explorer with AI")
                                    .font(.caption)
                            }
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 8)
                        }
                        .disabled(addingToExplorer != nil)
                        .padding(.horizontal, 12)
                    }
                }
                .background(Color(.systemBackground))
                .clipShape(RoundedRectangle(cornerRadius: 10))
                .overlay(
                    RoundedRectangle(cornerRadius: 10)
                        .stroke(Color(.systemGray4), lineWidth: 1)
                )
            }

            Text("Tap a result to add as a plant, or add to Explorer catalog")
                .font(.caption)
                .foregroundColor(.secondary)
                .frame(maxWidth: .infinity)
        }
    }

    // MARK: - Helpers

    private func confidenceColor(_ percent: Int) -> Color {
        if percent >= 70 { return .green }
        if percent >= 40 { return .orange }
        return .gray
    }

    // MARK: - API Call

    private func identifyPlant() async {
        guard let image = selectedImage else { return }

        isIdentifying = true
        errorMessage = nil
        results = nil

        do {
            // Resize if too large
            let maxSize: CGFloat = 1024
            let resizedImage: UIImage
            if max(image.size.width, image.size.height) > maxSize {
                let ratio = min(maxSize / image.size.width, maxSize / image.size.height)
                let newSize = CGSize(width: image.size.width * ratio, height: image.size.height * ratio)
                let renderer = UIGraphicsImageRenderer(size: newSize)
                resizedImage = renderer.image { _ in image.draw(in: CGRect(origin: .zero, size: newSize)) }
            } else {
                resizedImage = image
            }

            guard let compressedData = resizedImage.jpegData(compressionQuality: 0.7) else {
                errorMessage = "Failed to process image"
                isIdentifying = false
                return
            }

            let endpoint = APIEndpoint.identifyPlant
            guard let url = endpoint.url else {
                errorMessage = "Invalid API URL"
                isIdentifying = false
                return
            }

            let boundary = UUID().uuidString
            var request = URLRequest(url: url)
            request.httpMethod = "POST"
            request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

            if let token = KeychainService.shared.getToken() {
                request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
            }

            if let householdId = HouseholdService.shared.activeHousehold?.id {
                request.setValue(String(householdId), forHTTPHeaderField: "X-Household-Id")
            }

            // Build multipart body
            var body = Data()

            // Add image
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"image\"; filename=\"plant.jpg\"\r\n".data(using: .utf8)!)
            body.append("Content-Type: image/jpeg\r\n\r\n".data(using: .utf8)!)
            body.append(compressedData)
            body.append("\r\n".data(using: .utf8)!)

            // Add organ
            body.append("--\(boundary)\r\n".data(using: .utf8)!)
            body.append("Content-Disposition: form-data; name=\"organ\"\r\n\r\n".data(using: .utf8)!)
            body.append("\(selectedOrgan)\r\n".data(using: .utf8)!)

            body.append("--\(boundary)--\r\n".data(using: .utf8)!)
            request.httpBody = body

            let config = URLSessionConfiguration.default
            config.timeoutIntervalForRequest = 30
            #if DEBUG
            let session = URLSession(configuration: config, delegate: APIClient.shared, delegateQueue: nil)
            #else
            let session = URLSession(configuration: config)
            #endif

            let (data, response) = try await session.data(for: request)

            guard let httpResponse = response as? HTTPURLResponse else {
                throw NetworkError.unknown
            }

            guard (200...299).contains(httpResponse.statusCode) else {
                if let errorResponse = try? JSONDecoder().decode(ServerError.self, from: data) {
                    errorMessage = errorResponse.message
                } else {
                    errorMessage = "Identification failed (HTTP \(httpResponse.statusCode))"
                }
                isIdentifying = false
                return
            }

            let identifyResponse = try JSONDecoder().decode(IdentifyResponse.self, from: data)
            results = identifyResponse

            if identifyResponse.results.isEmpty {
                errorMessage = "No matches found. Try a clearer photo of leaves or flowers."
            }
        } catch {
            errorMessage = "Identification failed: \(error.localizedDescription)"
        }

        isIdentifying = false
    }

    // MARK: - Add to Explorer

    private func addToExplorer(_ result: IdentifyResult) async {
        let displayName = result.displayName
        addingToExplorer = result.scientificName
        explorerStatusMessage = "Generating care details..."

        do {
            // Step 1: Generate care details via Claude API
            let details = try await plantService.generateSpeciesDetails(
                scientificName: result.scientificName,
                commonName: displayName,
                family: result.family
            )

            // Step 2: Generate illustration via DALL-E
            explorerStatusMessage = "Generating illustration..."
            var imageUrl: String? = nil
            do {
                let imageResponse = try await plantService.generateSpeciesImage(
                    name: details.name ?? displayName,
                    scientificName: result.scientificName
                )
                imageUrl = imageResponse.imageUrl
            } catch {
                print("Image generation failed, proceeding without illustration: \(error)")
            }

            // Step 3: Create species in catalog
            explorerStatusMessage = "Saving to catalog..."
            let request = CreatePlantSpeciesRequest(
                name: details.name ?? displayName,
                scientificName: details.scientificName ?? result.scientificName,
                family: details.family ?? result.family,
                origin: details.origin,
                description: details.description ?? "\(displayName) is a plant species in the \(result.family) family.",
                careLevel: details.careLevel ?? "moderate",
                lightRequirements: details.lightRequirements ?? "Bright indirect light",
                wateringFrequency: details.wateringFrequency ?? 7,
                humidity: details.humidity,
                soilType: details.soilType,
                propagation: details.propagation,
                toxicity: details.toxicity,
                commonIssues: details.commonIssues,
                imageUrl: imageUrl
            )

            _ = try await plantService.createPlantSpecies(request)
            explorerStatusMessage = nil
        } catch {
            print("Error adding to explorer: \(error)")
            explorerStatusMessage = nil
        }

        addingToExplorer = nil
    }
}

private struct ServerError: Codable {
    let message: String
}

#Preview {
    IdentifyPlantView()
}
