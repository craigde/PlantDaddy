//
//  HouseholdService.swift
//  PlantDaddy
//
//  Service for managing households and household switching
//

import Foundation
import Combine

@MainActor
class HouseholdService: ObservableObject {
    static let shared = HouseholdService()

    @Published var households: [Household] = []
    @Published var activeHousehold: Household?
    @Published var householdDetail: HouseholdDetail?
    @Published var hasLoaded: Bool = false // true once we've fetched/set households at least once

    private let apiClient = APIClient.shared
    private let householdIdKey = "activeHouseholdId"

    var activeHouseholdId: Int? {
        activeHousehold?.id ?? UserDefaults.standard.object(forKey: householdIdKey) as? Int
    }

    private init() {}

    // MARK: - Initialization

    /// Set households from login/register response
    func setHouseholds(_ households: [Household]) {
        self.households = households
        self.hasLoaded = true

        // Restore last active household or default to first
        let savedId = UserDefaults.standard.object(forKey: householdIdKey) as? Int
        if let savedId, let saved = households.first(where: { $0.id == savedId }) {
            activeHousehold = saved
        } else if let first = households.first {
            switchHousehold(to: first)
        }
    }

    /// Clear on logout
    func clear() {
        households = []
        activeHousehold = nil
        householdDetail = nil
        hasLoaded = false
        UserDefaults.standard.removeObject(forKey: householdIdKey)
    }

    // MARK: - Switching

    func switchHousehold(to household: Household) {
        activeHousehold = household
        UserDefaults.standard.set(household.id, forKey: householdIdKey)
        householdDetail = nil
    }

    // MARK: - API

    func fetchHouseholds() async {
        do {
            let fetched: [Household] = try await apiClient.request(
                endpoint: .households,
                method: .get
            )
            households = fetched
            hasLoaded = true

            // Update active household if it still exists
            if let activeId = activeHouseholdId {
                if let updated = fetched.first(where: { $0.id == activeId }) {
                    activeHousehold = updated
                } else if let first = fetched.first {
                    switchHousehold(to: first)
                }
            } else if let first = fetched.first {
                switchHousehold(to: first)
            }
        } catch {
            print("Failed to fetch households: \(error)")
            hasLoaded = true
        }
    }

    func fetchHouseholdDetail() async {
        guard let householdId = activeHouseholdId else { return }
        do {
            let detail: HouseholdDetail = try await apiClient.request(
                endpoint: .household(id: householdId),
                method: .get
            )
            householdDetail = detail
        } catch {
            print("Failed to fetch household detail: \(error)")
        }
    }

    func createHousehold(name: String) async throws -> Household {
        let request = CreateHouseholdRequest(name: name)
        let household: Household = try await apiClient.request(
            endpoint: .households,
            method: .post,
            body: request
        )
        await fetchHouseholds()
        return household
    }

    func joinHousehold(inviteCode: String) async throws -> Household {
        let request = JoinHouseholdRequest(inviteCode: inviteCode)
        let response: JoinHouseholdResponse = try await apiClient.request(
            endpoint: .householdJoin,
            method: .post,
            body: request
        )
        households = response.households
        return response.household
    }

    func regenerateInviteCode() async throws -> Household {
        guard let householdId = activeHouseholdId else {
            throw NSError(domain: "HouseholdService", code: 0, userInfo: [NSLocalizedDescriptionKey: "No active household"])
        }
        let updated: Household = try await apiClient.request(
            endpoint: .householdInvite(id: householdId),
            method: .post
        )
        await fetchHouseholds()
        return updated
    }

    func updateMemberRole(userId: Int, role: String) async throws {
        guard let householdId = activeHouseholdId else { return }
        let request = UpdateMemberRoleRequest(role: role)
        let _: HouseholdMember = try await apiClient.request(
            endpoint: .householdMember(householdId: householdId, userId: userId),
            method: .patch,
            body: request
        )
        await fetchHouseholdDetail()
    }

    func removeMember(userId: Int) async throws {
        guard let householdId = activeHouseholdId else { return }
        try await apiClient.requestWithoutResponse(
            endpoint: .householdMember(householdId: householdId, userId: userId),
            method: .delete
        )
        await fetchHouseholdDetail()
    }
}
