//
//  PlantListView.swift
//  PlantDaddy
//
//  Main plants list view
//

import SwiftUI

struct PlantListView: View {
    @ObservedObject private var plantService = PlantService.shared
    @ObservedObject private var authService = AuthService.shared
    @State private var showingAddPlant = false
    @State private var searchText = ""
    @State private var careStats: CareStats?

    private var filteredPlants: [Plant] {
        if searchText.isEmpty {
            return plantService.plants
        } else {
            return plantService.plants.filter { plant in
                plant.name.localizedCaseInsensitiveContains(searchText) ||
                plant.species?.localizedCaseInsensitiveContains(searchText) == true ||
                plant.location.localizedCaseInsensitiveContains(searchText)
            }
        }
    }

    private var plantsNeedingWater: [Plant] {
        filteredPlants.filter { $0.needsWatering }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                if plantService.isLoading && plantService.plants.isEmpty {
                    ProgressView("Loading plants...")
                } else if plantService.plants.isEmpty {
                    emptyStateView
                } else {
                    plantsList
                }
            }
            .navigationTitle("My Plants")
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $searchText, prompt: "Search plants")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button(action: { showingAddPlant = true }) {
                        Image(systemName: "plus")
                    }
                }

                ToolbarItem(placement: .navigationBarLeading) {
                    Menu {
                        Button(action: logout) {
                            Label("Logout", systemImage: "rectangle.portrait.and.arrow.right")
                        }

                        Button(action: refreshPlants) {
                            Label("Refresh", systemImage: "arrow.clockwise")
                        }
                    } label: {
                        Image(systemName: "ellipsis.circle")
                    }
                }
            }
            .sheet(isPresented: $showingAddPlant) {
                AddPlantView()
            }
            .task {
                await plantService.fetchPlants()
                await plantService.fetchLocations()
                await plantService.fetchPlantSpecies()
                await loadCareStats()
            }
            .refreshable {
                await plantService.fetchPlants()
                await loadCareStats()
            }
        }
    }

    private var plantsList: some View {
        ScrollView {
            LazyVStack(spacing: 16) {
                // Care stats card
                if let stats = careStats, stats.totalPlants > 0 {
                    NavigationLink(destination: CareStatsDetailView()) {
                        CareStatsCardView(stats: stats)
                            .padding(.horizontal)
                    }
                    .buttonStyle(PlainButtonStyle())
                }

                // Alert banner for plants needing water
                if !plantsNeedingWater.isEmpty {
                    HStack {
                        Image(systemName: "exclamationmark.triangle.fill")
                        Text("\(plantsNeedingWater.count) plant\(plantsNeedingWater.count == 1 ? " needs" : "s need") watering")
                        Spacer()
                    }
                    .padding()
                    .background(Color.orange.opacity(0.2))
                    .cornerRadius(12)
                    .padding(.horizontal)
                }

                // Plants grid
                ForEach(filteredPlants) { plant in
                    NavigationLink(destination: PlantDetailView(plantId: plant.id)) {
                        PlantCardView(
                            plant: plant,
                            speciesImageUrl: speciesImageUrl(for: plant)
                        )
                        .padding(.horizontal)
                    }
                    .buttonStyle(PlainButtonStyle())
                }
            }
            .padding(.vertical)
        }
    }

    private var emptyStateView: some View {
        VStack(spacing: 16) {
            Image(systemName: "leaf.fill")
                .font(.system(size: 60))
                .foregroundColor(.green.opacity(0.5))

            Text("No Plants Yet")
                .font(.title2)
                .fontWeight(.bold)

            Text("Add your first plant to get started!")
                .foregroundColor(.secondary)

            Button(action: { showingAddPlant = true }) {
                Label("Add Plant", systemImage: "plus")
                    .fontWeight(.semibold)
            }
            .buttonStyle(.borderedProminent)
            .tint(.green)
            .padding(.top)
        }
    }

    private func logout() {
        authService.logout()
    }

    private func refreshPlants() {
        Task {
            await plantService.fetchPlants()
        }
    }

    private func speciesImageUrl(for plant: Plant) -> String? {
        guard let speciesName = plant.species else { return nil }
        return plantService.plantSpecies.first { $0.name == speciesName }?.fullImageUrl
    }

    private func loadCareStats() async {
        do {
            careStats = try await plantService.fetchCareStats()
        } catch {
            print("Failed to load care stats: \(error)")
        }
    }
}

#Preview {
    PlantListView()
}
