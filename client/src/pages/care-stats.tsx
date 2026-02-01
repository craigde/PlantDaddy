import React from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useCareStats } from "@/hooks/use-care-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Flame, Droplets, Leaf, AlertTriangle } from "lucide-react";

const ACTIVITY_LABELS: Record<string, string> = {
  watering: "Watering",
  fertilizing: "Fertilizing",
  repotting: "Repotting",
  pruning: "Pruning",
  misting: "Misting",
  rotating: "Rotating",
};

const ACTIVITY_COLORS: Record<string, string> = {
  watering: "bg-blue-500",
  fertilizing: "bg-green-500",
  repotting: "bg-amber-600",
  pruning: "bg-purple-500",
  misting: "bg-cyan-400",
  rotating: "bg-pink-400",
};

export default function CareStatsPage() {
  const [_, navigate] = useLocation();
  const { data: stats, isLoading } = useCareStats();

  const monthName = new Date().toLocaleString("default", { month: "long", year: "numeric" });

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <Skeleton className="h-8 w-48 mb-6" />
        <Skeleton className="h-32 w-full mb-4 rounded-lg" />
        <Skeleton className="h-48 w-full mb-4 rounded-lg" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="px-4 py-6 text-center">
        <p className="text-muted-foreground">Failed to load care stats.</p>
      </div>
    );
  }

  const maxMemberCount = Math.max(...stats.monthlyByMember.map((m) => m.count), 1);
  const sortedMembers = [...stats.monthlyByMember].sort((a, b) => b.count - a.count);
  const sortedTypes = [...stats.monthlyByType].sort((a, b) => b.count - a.count);

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-2xl font-bold font-heading">Care Stats</h1>
      </div>

      {/* Streak Card */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <div className="flex items-center gap-3 mb-1">
            <Flame className={`h-7 w-7 ${stats.streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
            <div>
              <p className="text-3xl font-bold">{stats.streak}</p>
              <p className="text-sm text-muted-foreground">day care streak</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {stats.streak > 0
              ? "Consecutive days with at least one care activity. Keep it going!"
              : "Care for a plant today to start your streak!"}
          </p>
        </CardContent>
      </Card>

      {/* Overview */}
      <Card className="mb-4">
        <CardContent className="p-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Overview
          </h2>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="flex justify-center mb-1">
                <Leaf className="h-5 w-5 text-green-500" />
              </div>
              <p className="text-2xl font-bold">{stats.totalPlants}</p>
              <p className="text-xs text-muted-foreground">Plants</p>
            </div>
            <div>
              <div className="flex justify-center mb-1">
                <Droplets className="h-5 w-5 text-blue-500" />
              </div>
              <p className="text-2xl font-bold">{stats.monthlyTotal}</p>
              <p className="text-xs text-muted-foreground">{monthName}</p>
            </div>
            <div>
              <div className="flex justify-center mb-1">
                <AlertTriangle className={`h-5 w-5 ${stats.plantsNeedingWater > 0 ? "text-orange-500" : "text-green-500"}`} />
              </div>
              <p className="text-2xl font-bold">{stats.plantsNeedingWater}</p>
              <p className="text-xs text-muted-foreground">Overdue</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity breakdown by type */}
      {sortedTypes.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Activity Breakdown
            </h2>
            <div className="space-y-3">
              {sortedTypes.map((item) => (
                <div key={item.type}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{ACTIVITY_LABELS[item.type] || item.type}</span>
                    <span className="font-medium">{item.count}</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${ACTIVITY_COLORS[item.type] || "bg-gray-400"}`}
                      style={{ width: `${(item.count / stats.monthlyTotal) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Household leaderboard */}
      {sortedMembers.length > 0 && (
        <Card className="mb-4">
          <CardContent className="p-5">
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              {sortedMembers.length > 1 ? "Household Leaderboard" : "Your Activity"}
            </h2>
            <div className="space-y-3">
              {sortedMembers.map((member, i) => (
                <div key={member.userId} className="flex items-center gap-3">
                  <span className="text-lg font-bold text-muted-foreground w-6 text-center">
                    {sortedMembers.length > 1 ? `${i + 1}` : ""}
                  </span>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium">{member.username}</span>
                      <span>{member.count} activities</span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${(member.count / maxMemberCount) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
