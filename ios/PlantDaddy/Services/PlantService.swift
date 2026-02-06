//
//  PlantService.swift
//  PlantDaddy
//
//  Service for plant-related operations
//

import Foundation
import Combine

@MainActor
class PlantService: ObservableObject {
    static let shared = PlantService()

    @Published var plants: [Plant] = []
    @Published var locations: [Location] = []
    @Published var plantSpecies: [PlantSpecies] = []
    @Published var isLoading: Bool = false
    @Published var error: String?

    private let apiClient = APIClient.shared
    private let notificationService = NotificationService.shared

    private init() {}

    // MARK: - Plant Operations

    func fetchPlants() async {
        isLoading = true
        error = nil

        do {
            plants = try await apiClient.request(
                endpoint: .plants,
                method: .get
            )

            // Update badge count based on overdue plants
            if notificationService.isAuthorized {
                notificationService.updateBadgeCount(plants.filter { $0.needsWatering }.count)
            }
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func fetchPlant(id: Int) async throws -> Plant {
        try await apiClient.request(
            endpoint: .plant(id: id),
            method: .get
        )
    }

    func createPlant(
        name: String,
        species: String?,
        location: String,
        wateringFrequency: Int,
        lastWatered: Date,
        notes: String?,
        imageUrl: String?
    ) async throws -> Plant {
        let request = CreatePlantRequest(
            name: name,
            species: species,
            location: location,
            wateringFrequency: wateringFrequency,
            lastWatered: lastWatered,
            notes: notes,
            imageUrl: imageUrl
        )

        let plant: Plant = try await apiClient.request(
            endpoint: .plants,
            method: .post,
            body: request
        )

        // Refresh plants list
        await fetchPlants()

        return plant
    }

    func updatePlant(id: Int, updates: UpdatePlantRequest) async throws -> Plant {
        let plant: Plant = try await apiClient.request(
            endpoint: .plant(id: id),
            method: .patch,
            body: updates
        )

        // Refresh plants list
        await fetchPlants()

        return plant
    }

    func deletePlant(id: Int) async throws {
        try await apiClient.requestWithoutResponse(
            endpoint: .plant(id: id),
            method: .delete
        )

        // Remove from local array
        plants.removeAll { $0.id == id }

        notificationService.updateBadgeCount(plants.filter { $0.needsWatering }.count)
    }

    func waterPlant(id: Int) async throws -> Plant {
        let response: WaterPlantResponse = try await apiClient.request(
            endpoint: .waterPlant(id: id),
            method: .post
        )

        // Immediate local update so PlantListView updates right away
        if let index = plants.firstIndex(where: { $0.id == id }) {
            plants[index] = response.plant
        }

        // Full refresh for consistency
        await fetchPlants()

        return response.plant
    }

    func snoozePlant(id: Int, until: Date, notes: String? = nil) async throws -> Plant {
        let request = SnoozePlantRequest(snoozedUntil: until, notes: notes)

        let response: SnoozePlantResponse = try await apiClient.request(
            endpoint: .snoozePlant(id: id),
            method: .post,
            body: request
        )

        // Immediate local update so PlantListView updates right away
        if let index = plants.firstIndex(where: { $0.id == id }) {
            plants[index] = response.plant
        }

        // Full refresh for consistency
        await fetchPlants()

        return response.plant
    }

    func clearSnooze(id: Int) async throws -> Plant {
        let response: SnoozePlantResponse = try await apiClient.request(
            endpoint: .snoozePlant(id: id),
            method: .delete
        )

        // Immediate local update so PlantListView updates right away
        if let index = plants.firstIndex(where: { $0.id == id }) {
            plants[index] = response.plant
        }

        // Full refresh for consistency
        await fetchPlants()

        return response.plant
    }

    // MARK: - Plant Species Operations

    func fetchPlantSpecies() async {
        isLoading = true
        error = nil

        do {
            plantSpecies = try await apiClient.request(
                endpoint: .plantSpecies,
                method: .get
            )
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func generateSpeciesDetails(scientificName: String, commonName: String, family: String) async throws -> GeneratedSpeciesDetails {
        struct Request: Encodable {
            let scientificName: String
            let commonName: String
            let family: String
        }
        return try await apiClient.request(
            endpoint: .generateSpeciesDetails,
            method: .post,
            body: Request(scientificName: scientificName, commonName: commonName, family: family)
        )
    }

    func generateSpeciesImage(name: String, scientificName: String) async throws -> GeneratedImageResponse {
        struct Request: Encodable {
            let name: String
            let scientificName: String
        }
        return try await apiClient.request(
            endpoint: .generateSpeciesImage,
            method: .post,
            body: Request(name: name, scientificName: scientificName)
        )
    }

    func createPlantSpecies(_ species: CreatePlantSpeciesRequest) async throws -> PlantSpecies {
        let created: PlantSpecies = try await apiClient.request(
            endpoint: .plantSpecies,
            method: .post,
            body: species
        )
        await fetchPlantSpecies()
        return created
    }

    // MARK: - Location Operations

    func fetchLocations() async {
        isLoading = true
        error = nil

        do {
            locations = try await apiClient.request(
                endpoint: .locations,
                method: .get
            )
        } catch {
            self.error = error.localizedDescription
        }

        isLoading = false
    }

    func createLocation(name: String, isDefault: Bool = false) async throws -> Location {
        let request = CreateLocationRequest(name: name, isDefault: isDefault)

        let location: Location = try await apiClient.request(
            endpoint: .locations,
            method: .post,
            body: request
        )

        // Refresh locations list
        await fetchLocations()

        return location
    }

    func updateLocation(id: Int, name: String) async throws -> Location {
        let request = UpdateLocationRequest(name: name)

        let location: Location = try await apiClient.request(
            endpoint: .location(id: id),
            method: .patch,
            body: request
        )

        // Refresh locations list
        await fetchLocations()

        return location
    }

    func deleteLocation(id: Int) async throws {
        try await apiClient.requestWithoutResponse(
            endpoint: .location(id: id),
            method: .delete
        )

        // Remove from local array
        locations.removeAll { $0.id == id }
    }

    // MARK: - Health Records

    func fetchHealthRecords(plantId: Int) async throws -> [HealthRecord] {
        try await apiClient.request(
            endpoint: .healthRecords(plantId: plantId),
            method: .get
        )
    }

    func createHealthRecord(
        plantId: Int,
        status: HealthStatus,
        notes: String?,
        imageUrl: String?
    ) async throws -> HealthRecord {
        let request = CreateHealthRecordRequest(
            status: status,
            notes: notes,
            imageUrl: imageUrl
        )

        return try await apiClient.request(
            endpoint: .healthRecords(plantId: plantId),
            method: .post,
            body: request
        )
    }

    // MARK: - Journal Entries (Plant Story)

    func fetchJournalEntries(plantId: Int) async throws -> [JournalEntry] {
        try await apiClient.request(
            endpoint: .plantJournal(plantId: plantId),
            method: .get
        )
    }

    func createJournalEntry(
        plantId: Int,
        imageUrl: String,
        caption: String?
    ) async throws -> JournalEntry {
        let request = CreateJournalEntryRequest(
            imageUrl: imageUrl,
            caption: caption
        )

        return try await apiClient.request(
            endpoint: .plantJournal(plantId: plantId),
            method: .post,
            body: request
        )
    }

    func deleteJournalEntry(id: Int) async throws {
        try await apiClient.requestWithoutResponse(
            endpoint: .journalEntry(id: id),
            method: .delete
        )
    }

    // MARK: - Care Stats

    func fetchCareStats() async throws -> CareStats {
        try await apiClient.request(
            endpoint: .careStats,
            method: .get
        )
    }

    // MARK: - Care Activities

    func fetchCareActivities(plantId: Int) async throws -> [CareActivity] {
        try await apiClient.request(
            endpoint: .careActivities(plantId: plantId),
            method: .get
        )
    }

    func createCareActivity(
        plantId: Int,
        activityType: ActivityType,
        notes: String?
    ) async throws -> CareActivity {
        let request = CreateCareActivityRequest(
            activityType: activityType,
            notes: notes
        )

        return try await apiClient.request(
            endpoint: .careActivities(plantId: plantId),
            method: .post,
            body: request
        )
    }
}
