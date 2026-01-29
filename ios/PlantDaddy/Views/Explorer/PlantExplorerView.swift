//
//  PlantExplorerView.swift
//  PlantDaddy
//
//  Browse and search the plant species catalog
//

import SwiftUI

struct PlantExplorerView: View {
    @ObservedObject private var plantService = PlantService.shared
    @State private var searchText = ""
    @State private var selectedCareLevel: CareLevel?
    @State private var selectedSpecies: PlantSpecies?

    private var filteredSpecies: [PlantSpecies] {
        var result = plantService.plantSpecies

        if !searchText.isEmpty {
            result = result.filter { species in
                species.name.localizedCaseInsensitiveContains(searchText) ||
                species.scientificName.localizedCaseInsensitiveContains(searchText) ||
                species.description.localizedCaseInsensitiveContains(searchText)
            }
        }

        if let level = selectedCareLevel {
            result = result.filter { $0.careLevel == level }
        }

        return result.sorted { $0.name < $1.name }
    }

    var body: some View {
        NavigationStack {
            ZStack {
                if plantService.plantSpecies.isEmpty && plantService.isLoading {
                    ProgressView("Loading species...")
                } else if plantService.plantSpecies.isEmpty {
                    emptyState
                } else {
                    speciesList
                }
            }
            .navigationTitle("Plant Explorer")
            .navigationBarTitleDisplayMode(.large)
            .searchable(text: $searchText, prompt: "Search species")
            .task {
                if plantService.plantSpecies.isEmpty {
                    await plantService.fetchPlantSpecies()
                }
            }
            .sheet(item: $selectedSpecies) { species in
                SpeciesDetailView(species: species)
            }
        }
    }

    private var speciesList: some View {
        ScrollView {
            VStack(spacing: 16) {
                // Care level filter
                careLevelFilter

                // Results count
                Text("\(filteredSpecies.count) species")
                    .font(.caption)
                    .foregroundColor(.secondary)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(.horizontal)

                // Species grid
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: 12),
                    GridItem(.flexible(), spacing: 12)
                ], spacing: 12) {
                    ForEach(filteredSpecies) { species in
                        SpeciesCardView(species: species)
                            .onTapGesture {
                                selectedSpecies = species
                            }
                    }
                }
                .padding(.horizontal)
            }
            .padding(.vertical)
        }
    }

    private var careLevelFilter: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack(spacing: 8) {
                FilterChip(
                    label: "All",
                    isSelected: selectedCareLevel == nil
                ) {
                    selectedCareLevel = nil
                }

                ForEach(CareLevel.allCases, id: \.self) { level in
                    FilterChip(
                        label: "\(level.emoji) \(level.displayName)",
                        isSelected: selectedCareLevel == level
                    ) {
                        selectedCareLevel = level
                    }
                }
            }
            .padding(.horizontal)
        }
    }

    private var emptyState: some View {
        VStack(spacing: 16) {
            Image(systemName: "magnifyingglass")
                .font(.system(size: 60))
                .foregroundColor(.green.opacity(0.5))
            Text("No Species Found")
                .font(.title2)
                .fontWeight(.bold)
            Text("The plant catalog is empty.")
                .foregroundColor(.secondary)
        }
    }
}

// MARK: - Filter Chip

private struct FilterChip: View {
    let label: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Text(label)
                .font(.subheadline)
                .fontWeight(isSelected ? .semibold : .regular)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(isSelected ? Color.green : Color(.secondarySystemBackground))
                .foregroundColor(isSelected ? .white : .primary)
                .cornerRadius(20)
        }
    }
}

// MARK: - Species Card

struct SpeciesCardView: View {
    let species: PlantSpecies

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Species image
            if let imageUrl = species.fullImageUrl {
                AsyncImage(url: URL(string: imageUrl)) { image in
                    image
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                } placeholder: {
                    Rectangle()
                        .fill(Color.gray.opacity(0.2))
                        .overlay(
                            Image(systemName: "leaf.fill")
                                .foregroundColor(.green.opacity(0.3))
                        )
                }
                .frame(height: 120)
                .frame(maxWidth: .infinity)
                .clipped()
                .clipShape(RoundedRectangle(cornerRadius: 10))
            } else {
                Rectangle()
                    .fill(Color.gray.opacity(0.2))
                    .frame(height: 120)
                    .overlay(
                        Image(systemName: "leaf.fill")
                            .font(.title)
                            .foregroundColor(.green.opacity(0.3))
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 10))
            }

            // Info
            Text(species.name)
                .font(.subheadline)
                .fontWeight(.semibold)
                .lineLimit(1)

            Text(species.scientificName)
                .font(.caption2)
                .foregroundColor(.secondary)
                .italic()
                .lineLimit(1)

            // Care level badge
            Text("\(species.careLevel.emoji) \(species.careLevel.displayName)")
                .font(.caption2)
                .padding(.horizontal, 6)
                .padding(.vertical, 2)
                .background(careLevelColor.opacity(0.15))
                .foregroundColor(careLevelColor)
                .cornerRadius(4)
        }
        .padding(10)
        .background(Color(.systemBackground))
        .cornerRadius(12)
        .shadow(color: Color.black.opacity(0.08), radius: 4, x: 0, y: 2)
    }

    private var careLevelColor: Color {
        switch species.careLevel {
        case .easy: return .green
        case .moderate: return .orange
        case .difficult: return .red
        }
    }
}

#Preview {
    PlantExplorerView()
}
