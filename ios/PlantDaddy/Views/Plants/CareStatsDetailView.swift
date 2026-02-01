//
//  CareStatsDetailView.swift
//  PlantDaddy
//
//  Full care stats detail view
//

import SwiftUI

struct CareStatsDetailView: View {
    @ObservedObject private var plantService = PlantService.shared
    @State private var stats: CareStats?
    @State private var isLoading = true
    @State private var error: String?

    private var monthName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: Date())
    }

    private let activityLabels: [String: String] = [
        "watering": "Watering",
        "fertilizing": "Fertilizing",
        "repotting": "Repotting",
        "pruning": "Pruning",
        "misting": "Misting",
        "rotating": "Rotating",
    ]

    private let activityColors: [String: Color] = [
        "watering": .blue,
        "fertilizing": .green,
        "repotting": .brown,
        "pruning": .purple,
        "misting": .cyan,
        "rotating": .pink,
    ]

    var body: some View {
        ScrollView {
            if isLoading {
                ProgressView("Loading stats...")
                    .padding(.top, 40)
            } else if let error = error {
                Text(error)
                    .foregroundColor(.secondary)
                    .padding()
            } else if let stats = stats {
                VStack(spacing: 16) {
                    streakCard(stats)
                    overviewCard(stats)
                    if !stats.monthlyByType.isEmpty {
                        activityBreakdownCard(stats)
                    }
                    if !stats.monthlyByMember.isEmpty {
                        leaderboardCard(stats)
                    }
                }
                .padding()
            }
        }
        .navigationTitle("Care Stats")
        .navigationBarTitleDisplayMode(.large)
        .task {
            await loadStats()
        }
        .refreshable {
            await loadStats()
        }
    }

    // MARK: - Cards

    private func streakCard(_ stats: CareStats) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack(spacing: 10) {
                Image(systemName: "flame.fill")
                    .font(.title)
                    .foregroundColor(stats.streak > 0 ? .orange : .secondary)
                VStack(alignment: .leading) {
                    Text("\(stats.streak)")
                        .font(.largeTitle)
                        .fontWeight(.bold)
                    Text("day care streak")
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
            }
            Text(stats.streak > 0
                ? "Consecutive days with at least one care activity. Keep it going!"
                : "Care for a plant today to start your streak!")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    private func overviewCard(_ stats: CareStats) -> some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("Overview")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)
                .textCase(.uppercase)

            HStack(spacing: 0) {
                overviewItem(
                    icon: "leaf.fill",
                    color: .green,
                    value: "\(stats.totalPlants)",
                    label: "Plants"
                )
                Spacer()
                overviewItem(
                    icon: "drop.fill",
                    color: .blue,
                    value: "\(stats.monthlyTotal)",
                    label: monthName
                )
                Spacer()
                overviewItem(
                    icon: "exclamationmark.triangle.fill",
                    color: stats.plantsNeedingWater > 0 ? .orange : .green,
                    value: "\(stats.plantsNeedingWater)",
                    label: "Overdue"
                )
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    private func overviewItem(icon: String, color: Color, value: String, label: String) -> some View {
        VStack(spacing: 4) {
            Image(systemName: icon)
                .foregroundColor(color)
            Text(value)
                .font(.title2)
                .fontWeight(.bold)
            Text(label)
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .frame(maxWidth: .infinity)
    }

    private func activityBreakdownCard(_ stats: CareStats) -> some View {
        let sorted = stats.monthlyByType.sorted { $0.count > $1.count }
        let maxCount = sorted.first?.count ?? 1

        return VStack(alignment: .leading, spacing: 10) {
            Text("Activity Breakdown")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)
                .textCase(.uppercase)

            ForEach(sorted) { item in
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(activityLabels[item.type] ?? item.type.capitalized)
                            .font(.subheadline)
                        Spacer()
                        Text("\(item.count)")
                            .font(.subheadline)
                            .fontWeight(.medium)
                    }
                    GeometryReader { geo in
                        RoundedRectangle(cornerRadius: 3)
                            .fill(activityColors[item.type] ?? .gray)
                            .frame(width: geo.size.width * CGFloat(item.count) / CGFloat(maxCount))
                    }
                    .frame(height: 6)
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    private func leaderboardCard(_ stats: CareStats) -> some View {
        let sorted = stats.monthlyByMember.sorted { $0.count > $1.count }
        let maxCount = sorted.first?.count ?? 1

        return VStack(alignment: .leading, spacing: 10) {
            Text(sorted.count > 1 ? "Household Leaderboard" : "Your Activity")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundColor(.secondary)
                .textCase(.uppercase)

            ForEach(Array(sorted.enumerated()), id: \.element.userId) { index, member in
                HStack(spacing: 12) {
                    if sorted.count > 1 {
                        Text("\(index + 1)")
                            .font(.headline)
                            .foregroundColor(.secondary)
                            .frame(width: 24)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        HStack {
                            Text(member.username)
                                .font(.subheadline)
                                .fontWeight(.medium)
                            Spacer()
                            Text("\(member.count) activities")
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                        GeometryReader { geo in
                            RoundedRectangle(cornerRadius: 3)
                                .fill(Color.accentColor)
                                .frame(width: geo.size.width * CGFloat(member.count) / CGFloat(maxCount))
                        }
                        .frame(height: 6)
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }

    // MARK: - Data

    private func loadStats() async {
        isLoading = true
        error = nil
        do {
            stats = try await plantService.fetchCareStats()
        } catch {
            self.error = "Failed to load care stats"
        }
        isLoading = false
    }
}
