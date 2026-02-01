import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useCareStats } from "@/hooks/use-care-stats";
import { Skeleton } from "@/components/ui/skeleton";
import { useLocation } from "wouter";
import { Flame, Droplets, ChevronRight, Users } from "lucide-react";

export function CareStatsCard() {
  const [_, navigate] = useLocation();
  const { data: stats, isLoading } = useCareStats();

  if (isLoading) {
    return (
      <Card className="mb-4 cursor-pointer">
        <CardContent className="p-4">
          <Skeleton className="h-5 w-32 mb-3" />
          <div className="flex gap-6">
            <Skeleton className="h-10 w-20" />
            <Skeleton className="h-10 w-24" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!stats || stats.totalPlants === 0) {
    return null;
  }

  const monthName = new Date().toLocaleString("default", { month: "long" });

  return (
    <Card
      className="mb-4 cursor-pointer hover:bg-accent/50 transition-colors"
      onClick={() => navigate("/care-stats")}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Care Stats
          </h2>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </div>

        <div className="flex items-center gap-6">
          {/* Streak */}
          <div className="flex items-center gap-2">
            <Flame className={`h-5 w-5 ${stats.streak > 0 ? "text-orange-500" : "text-muted-foreground"}`} />
            <div>
              <p className="text-xl font-bold leading-none">{stats.streak}</p>
              <p className="text-xs text-muted-foreground">day streak</p>
            </div>
          </div>

          {/* Monthly total */}
          <div className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-blue-500" />
            <div>
              <p className="text-xl font-bold leading-none">{stats.monthlyTotal}</p>
              <p className="text-xs text-muted-foreground">{monthName}</p>
            </div>
          </div>

          {/* Member breakdown (only show if multiple members) */}
          {stats.monthlyByMember.length > 1 && (
            <div className="flex items-center gap-2 ml-auto">
              <Users className="h-4 w-4 text-muted-foreground" />
              <p className="text-xs text-muted-foreground">
                {stats.monthlyByMember
                  .sort((a, b) => b.count - a.count)
                  .map((m) => `${m.username}: ${m.count}`)
                  .join(" · ")}
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
