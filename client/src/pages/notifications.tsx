import React from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { usePlants } from "@/hooks/use-plants";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNow, getDueText, daysUntilWatering } from "@/lib/date-utils";
import { getPlantStatus } from "@/lib/plant-utils";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";

type NotificationLogEntry = {
  id: number;
  plantId: number | null;
  plantName: string | null;
  title: string;
  message: string;
  channel: string;
  success: boolean;
  sentAt: string;
};

export default function Notifications() {
  const [_, navigate] = useLocation();
  const { plants, isLoading, waterPlant } = usePlants();
  const { data: notificationLog, isLoading: logLoading } = useQuery<NotificationLogEntry[]>({
    queryKey: ['/api/notification-log'],
  });

  const handleViewPlant = (id: number) => {
    navigate(`/plants/${id}`);
  };

  const plantsNeedingAttention = plants
    .filter((plant) => {
      const status = getPlantStatus(plant);
      return status === "overdue" || status === "soon";
    })
    .sort((a, b) => {
      const statusA = getPlantStatus(a);
      const statusB = getPlantStatus(b);
      if (statusA === "overdue" && statusB !== "overdue") return -1;
      if (statusA !== "overdue" && statusB === "overdue") return 1;
      return new Date(a.lastWatered).getTime() - new Date(b.lastWatered).getTime();
    });

  // Upcoming waterings (due in next 3 days, not yet overdue or due today)
  const upcomingWaterings = plants
    .map((plant) => ({
      plant,
      daysUntil: daysUntilWatering(new Date(plant.lastWatered), plant.wateringFrequency, plant.snoozedUntil),
    }))
    .filter(({ daysUntil }) => daysUntil > 0 && daysUntil <= 3)
    .sort((a, b) => a.daysUntil - b.daysUntil);

  if (isLoading) {
    return (
      <div className="px-4 py-6">
        <div className="mb-6">
          <Skeleton className="h-8 w-1/2 mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </div>
        <Skeleton className="h-32 w-full rounded-lg mb-4" />
        <Skeleton className="h-32 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold font-heading">Notifications</h1>
        <p className="text-muted-foreground">Plants that need your attention</p>
      </header>

      {/* Plants needing attention now */}
      {plantsNeedingAttention.length === 0 && upcomingWaterings.length === 0 ? (
        <div className="text-center py-10">
          <p className="text-muted-foreground mb-2">No plants need attention right now</p>
          <p className="text-sm text-muted-foreground/70">Everything is watered and happy!</p>
        </div>
      ) : (
        <>
          {plantsNeedingAttention.length > 0 && (
            <Card className="p-4 mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Needs Attention
              </h2>
              {plantsNeedingAttention.map((plant) => {
                const status = getPlantStatus(plant);
                const statusText = getDueText(new Date(plant.lastWatered), plant.wateringFrequency, plant.snoozedUntil);
                const lastWateredText = formatDistanceToNow(new Date(plant.lastWatered));

                return (
                  <div
                    key={plant.id}
                    className="mb-4 pb-3 border-b border-border last:border-b-0 last:mb-0 last:pb-0"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center space-x-2">
                        <span className={`material-icons ${
                          status === "overdue" ? "text-status-overdue" : "text-status-soon"
                        }`}>
                          notifications
                        </span>
                        <h3 className="font-semibold">{plant.name} needs water{status === "soon" ? " soon" : ""}</h3>
                      </div>
                      <span className="text-xs text-muted-foreground">{statusText}</span>
                    </div>

                    <p className="text-muted-foreground text-sm mt-1">
                      Last watered {lastWateredText}
                    </p>

                    <div className="flex space-x-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewPlant(plant.id)}
                        className="text-primary border-primary"
                      >
                        View Details
                      </Button>

                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => waterPlant.mutate(plant.id)}
                        className="bg-primary text-white"
                      >
                        <span className="material-icons text-sm mr-1">opacity</span>
                        Water Now
                      </Button>
                    </div>
                  </div>
                );
              })}
            </Card>
          )}

          {/* Upcoming waterings */}
          {upcomingWaterings.length > 0 && (
            <Card className="p-4 mb-4">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                Coming Up
              </h2>
              {upcomingWaterings.map(({ plant, daysUntil }) => (
                <div
                  key={plant.id}
                  className="flex items-center justify-between py-2 border-b border-border last:border-b-0"
                >
                  <div
                    className="flex items-center space-x-2 cursor-pointer"
                    onClick={() => handleViewPlant(plant.id)}
                  >
                    <span className="material-icons text-blue-400 text-sm">schedule</span>
                    <span className="font-medium text-sm">{plant.name}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {daysUntil === 1 ? "tomorrow" : `in ${daysUntil} days`}
                  </span>
                </div>
              ))}
            </Card>
          )}
        </>
      )}

      {/* Notification History */}
      <div className="mt-6">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
          Notification History
        </h2>
        {logLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
        ) : !notificationLog || notificationLog.length === 0 ? (
          <Card className="p-4">
            <p className="text-sm text-muted-foreground text-center">
              No notifications sent yet. Reminders will appear here once the scheduler runs.
            </p>
          </Card>
        ) : (
          <Card className="p-4">
            {notificationLog.map((entry, i) => {
              const sentDate = new Date(entry.sentAt);
              const timeAgo = formatDistanceToNow(sentDate);

              return (
                <div
                  key={entry.id}
                  className={`py-2.5 ${i < notificationLog.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{entry.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{entry.message}</p>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                      <span className="text-xs text-muted-foreground">{timeAgo}</span>
                      {!entry.success && (
                        <span className="text-xs text-red-500">Failed</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </Card>
        )}
      </div>
    </div>
  );
}
