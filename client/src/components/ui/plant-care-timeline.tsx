import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useCareActivities } from "@/hooks/use-care-activities";
import { useHealthRecords } from "@/hooks/use-health-records";
import { formatDate, formatTime, formatDistanceToNow } from "@/lib/date-utils";
import { CareActivity, PlantHealthRecord } from "@shared/schema";
import { 
  Droplets, 
  Scissors, 
  Leaf, 
  RotateCcw, 
  Sprout, 
  Sparkles,
  Heart,
  AlertTriangle,
  X
} from "lucide-react";

interface TimelineEvent {
  id: string;
  type: 'care' | 'health';
  timestamp: Date;
  title: string;
  description?: string;
  status?: string;
  imageUrl?: string;
  data: CareActivity | PlantHealthRecord;
}

interface PlantCareTimelineProps {
  plantId: number;
  plantName: string;
}

const getActivityIcon = (activityType: string) => {
  switch (activityType) {
    case 'watering':
      return <Droplets className="h-4 w-4 text-blue-500" />;
    case 'fertilizing':
      return <Sprout className="h-4 w-4 text-green-500" />;
    case 'repotting':
      return <RotateCcw className="h-4 w-4 text-orange-500" />;
    case 'pruning':
      return <Scissors className="h-4 w-4 text-red-500" />;
    case 'misting':
      return <Sparkles className="h-4 w-4 text-cyan-500" />;
    case 'rotating':
      return <RotateCcw className="h-4 w-4 text-purple-500" />;
    default:
      return <Leaf className="h-4 w-4 text-gray-500" />;
  }
};

const getHealthIcon = (status: string) => {
  switch (status) {
    case 'thriving':
      return <Heart className="h-4 w-4 text-green-500" />;
    case 'struggling':
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    case 'sick':
      return <X className="h-4 w-4 text-red-500" />;
    default:
      return <Leaf className="h-4 w-4 text-gray-500" />;
  }
};

const getHealthBadgeColor = (status: string) => {
  switch (status) {
    case 'thriving':
      return 'bg-green-100 text-green-800 border-green-200';
    case 'struggling':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'sick':
      return 'bg-red-100 text-red-800 border-red-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export function PlantCareTimeline({ plantId, plantName }: PlantCareTimelineProps) {
  const { useGetPlantCareActivities } = useCareActivities();
  const { useGetPlantHealthRecords } = useHealthRecords();
  
  const { data: careActivities = [], isLoading: isLoadingCare } = useGetPlantCareActivities(plantId);
  const { data: healthRecords = [], isLoading: isLoadingHealth } = useGetPlantHealthRecords(plantId);
  
  // Type assertions for API responses
  const typedCareActivities = careActivities as CareActivity[];
  const typedHealthRecords = healthRecords as PlantHealthRecord[];
  
  const isLoading = isLoadingCare || isLoadingHealth;

  // Combine and sort timeline events
  const timelineEvents: TimelineEvent[] = React.useMemo(() => {
    const events: TimelineEvent[] = [];
    
    // Add care activities
    typedCareActivities.forEach((activity: CareActivity) => {
      const timestamp = new Date(activity.performedAt);
      if (!isNaN(timestamp.getTime())) {
        events.push({
          id: `care-${activity.id}`,
          type: 'care',
          timestamp,
          title: activity.activityType.charAt(0).toUpperCase() + activity.activityType.slice(1),
          description: activity.notes || undefined,
          data: activity,
        });
      }
    });
    
    // Add health records
    typedHealthRecords.forEach((record: PlantHealthRecord) => {
      const timestamp = new Date(record.recordedAt);
      if (!isNaN(timestamp.getTime())) {
        events.push({
          id: `health-${record.id}`,
          type: 'health',
          timestamp,
          title: 'Health Check',
          description: record.notes || undefined,
          status: record.status,
          imageUrl: record.imageUrl || undefined,
          data: record,
        });
      }
    });
    
    // Sort by timestamp (most recent first)
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [typedCareActivities, typedHealthRecords]);

  if (isLoading) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <h2 className="text-lg font-semibold mb-3 font-heading">Care Timeline</h2>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg font-semibold font-heading">Care Timeline</h2>
          <span className="text-sm text-gray-500">
            {timelineEvents.length} {timelineEvents.length === 1 ? 'entry' : 'entries'}
          </span>
        </div>

        <div className="space-y-4">
          {timelineEvents.length > 0 ? (
            timelineEvents.map((event, index) => (
              <div key={event.id} className="flex gap-3" data-testid={`timeline-event-${event.id}`}>
                {/* Timeline connector */}
                <div className="flex flex-col items-center">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white border-2 border-gray-200">
                    {event.type === 'care' 
                      ? getActivityIcon((event.data as CareActivity).activityType)
                      : getHealthIcon(event.status || 'unknown')
                    }
                  </div>
                  {index < timelineEvents.length - 1 && (
                    <div className="w-px h-6 bg-gray-200 mt-2" />
                  )}
                </div>

                {/* Event content */}
                <div className="flex-1 pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-medium text-sm" data-testid={`event-title-${event.id}`}>
                          {event.title}
                        </h3>
                        {event.status && (
                          <Badge 
                            variant="outline" 
                            className={`text-xs ${getHealthBadgeColor(event.status)}`}
                            data-testid={`event-status-${event.id}`}
                          >
                            {event.status}
                          </Badge>
                        )}
                      </div>
                      
                      {event.description && (
                        <p className="text-sm text-gray-600 mb-2" data-testid={`event-description-${event.id}`}>
                          {event.description}
                        </p>
                      )}
                      
                      {event.imageUrl && (
                        <div className="mb-2">
                          <img 
                            src={event.imageUrl} 
                            alt="Health record photo"
                            className="w-16 h-16 object-cover rounded-md border"
                            data-testid={`event-image-${event.id}`}
                          />
                        </div>
                      )}
                    </div>
                    
                    <div className="text-right ml-4">
                      <p className="text-sm font-medium text-gray-900" data-testid={`event-date-${event.id}`}>
                        {formatDate(event.timestamp)}
                      </p>
                      <p className="text-xs text-gray-500" data-testid={`event-time-${event.id}`}>
                        {formatTime(event.timestamp)}
                      </p>
                      <p className="text-xs text-gray-400 mt-1" data-testid={`event-relative-time-${event.id}`}>
                        {formatDistanceToNow(event.timestamp)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Leaf className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-sm font-medium text-gray-900 mb-1">No care history yet</h3>
              <p className="text-sm text-gray-500">
                Start by watering {plantName} or logging a health check to see the timeline.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}