//
//  CareStatsCardView.swift
//  PlantDaddy
//
//  Compact care stats card for the plants list
//

import SwiftUI

struct CareStatsCardView: View {
    let stats: CareStats

    private var monthName: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM"
        return formatter.string(from: Date())
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                Text("Care Stats")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundColor(.secondary)
                    .textCase(.uppercase)

                Spacer()

                Image(systemName: "chevron.right")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }

            HStack(spacing: 24) {
                // Streak
                HStack(spacing: 6) {
                    Image(systemName: "flame.fill")
                        .foregroundColor(stats.streak > 0 ? .orange : .secondary)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("\(stats.streak)")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("day streak")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                // Monthly total
                HStack(spacing: 6) {
                    Image(systemName: "drop.fill")
                        .foregroundColor(.blue)
                    VStack(alignment: .leading, spacing: 1) {
                        Text("\(stats.monthlyTotal)")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text(monthName)
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                }

                Spacer()

                // Member breakdown (if multiple)
                if stats.monthlyByMember.count > 1 {
                    VStack(alignment: .trailing, spacing: 2) {
                        ForEach(stats.monthlyByMember.sorted(by: { $0.count > $1.count }).prefix(3)) { member in
                            Text("\(member.username): \(member.count)")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                        }
                    }
                }
            }
        }
        .padding()
        .background(Color(.secondarySystemGroupedBackground))
        .cornerRadius(12)
    }
}
