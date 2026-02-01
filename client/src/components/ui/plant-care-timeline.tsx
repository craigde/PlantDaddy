import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useCareActivities } from "@/hooks/use-care-activities";
import { useHealthRecords } from "@/hooks/use-health-records";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatTime, formatDistanceToNow } from "@/lib/date-utils";
import { CareActivity, PlantHealthRecord } from "@shared/schema";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { R2ImageUploader } from "@/components/R2ImageUploader";
import {
  Droplets,
  Scissors,
  Leaf,
  RotateCcw,
  Sprout,
  Sparkles,
  Heart,
  AlertTriangle,
  X,
  Plus,
  Loader2,
  Camera,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";

interface DiseaseResult {
  label: string;
  name: string;
  score: number | null;
  categories: string[];
}

interface DiseaseResponse {
  results: DiseaseResult[];
  message?: string;
}

interface TimelineEvent {
  id: string;
  type: 'care' | 'health';
  timestamp: Date;
  title: string;
  description?: string;
  status?: string;
  imageUrl?: string;
  username?: string;
  data: CareActivity | PlantHealthRecord;
}

interface PlantCareTimelineProps {
  plantId: number;
  plantName: string;
}

const healthRecordSchema = z.object({
  status: z.enum(["thriving", "struggling", "sick"]),
  notes: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
});

type HealthRecordForm = z.infer<typeof healthRecordSchema>;

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

const getStatusText = (status: string) => {
  switch (status) {
    case "thriving":
      return "Thriving";
    case "struggling":
      return "Struggling";
    case "sick":
      return "Sick";
    default:
      return "Unknown";
  }
};

export function PlantCareTimeline({ plantId, plantName }: PlantCareTimelineProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [diseaseResults, setDiseaseResults] = useState<Record<string, DiseaseResponse>>({});
  const [detectingDiseaseId, setDetectingDiseaseId] = useState<string | null>(null);

  const { toast } = useToast();
  const { useGetPlantCareActivities } = useCareActivities();
  const { useGetPlantHealthRecords, createHealthRecord, deleteHealthRecord } = useHealthRecords();

  const { data: careActivities = [], isLoading: isLoadingCare } = useGetPlantCareActivities(plantId);
  const { data: healthRecords = [], isLoading: isLoadingHealth } = useGetPlantHealthRecords(plantId);

  // Type assertions for API responses
  const typedCareActivities = careActivities as CareActivity[];
  const typedHealthRecords = healthRecords as PlantHealthRecord[];

  const isLoading = isLoadingCare || isLoadingHealth;

  const form = useForm<HealthRecordForm>({
    resolver: zodResolver(healthRecordSchema),
    defaultValues: {
      status: "thriving",
      notes: "",
      imageUrl: null,
    },
  });

  // Combine and sort timeline events
  const timelineEvents: TimelineEvent[] = React.useMemo(() => {
    const events: TimelineEvent[] = [];

    // Add care activities
    typedCareActivities.forEach((activity: any) => {
      const timestamp = new Date(activity.performedAt);
      if (!isNaN(timestamp.getTime())) {
        events.push({
          id: `care-${activity.id}`,
          type: 'care',
          timestamp,
          title: activity.activityType.charAt(0).toUpperCase() + activity.activityType.slice(1),
          description: activity.notes || undefined,
          username: activity.username || undefined,
          data: activity,
        });
      }
    });

    // Add health records
    typedHealthRecords.forEach((record: any) => {
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
          username: record.username || undefined,
          data: record,
        });
      }
    });

    // Sort by timestamp (most recent first)
    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }, [typedCareActivities, typedHealthRecords]);

  const onSubmit = async (data: HealthRecordForm) => {
    try {
      await createHealthRecord.mutateAsync({
        plantId,
        data: {
          ...data,
          imageUrl: uploadedImageUrl,
        },
      });

      toast({
        title: "Health record logged!",
        description: `${plantName}'s health has been recorded as ${getStatusText(data.status)}.`,
      });

      form.reset();
      setUploadedImageUrl(null);
      setIsDialogOpen(false);
    } catch (error) {
      toast({
        title: "Failed to log health record",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteRecord = async (recordId: number) => {
    try {
      await deleteHealthRecord.mutateAsync({ id: recordId, plantId });
      toast({
        title: "Health record deleted",
        description: "The health record has been removed.",
      });
    } catch (error) {
      toast({
        title: "Failed to delete record",
        description: "Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleDetectDisease = async (eventId: string, imageUrl: string) => {
    setDetectingDiseaseId(eventId);
    try {
      const res = await fetch("/api/detect-disease", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ imageUrl }),
      });

      if (!res.ok) {
        const error = await res.json().catch(() => ({ message: "Detection failed" }));
        throw new Error(error.message || "Detection failed");
      }

      const data: DiseaseResponse = await res.json();
      setDiseaseResults((prev) => ({ ...prev, [eventId]: data }));

      if (data.results.length === 0) {
        toast({
          title: "No diseases detected",
          description: data.message || "The photo appears healthy or could not be analyzed.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Disease detection failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    } finally {
      setDetectingDiseaseId(null);
    }
  };

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
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">
              {timelineEvents.length} {timelineEvents.length === 1 ? 'entry' : 'entries'}
            </span>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" data-testid="button-log-health">
                  <Plus className="h-4 w-4 mr-2" />
                  Log Health
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle data-testid="dialog-title">Log Health Status</DialogTitle>
                  <DialogDescription>
                    Record the current health status of {plantName} with optional notes and photos.
                  </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Health Status</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-health-status">
                                <SelectValue placeholder="Select health status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="thriving" data-testid="option-thriving">
                                <div className="flex items-center space-x-2">
                                  <Heart className="h-4 w-4 text-green-600" />
                                  <span>Thriving</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="struggling" data-testid="option-struggling">
                                <div className="flex items-center space-x-2">
                                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                                  <span>Struggling</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="sick" data-testid="option-sick">
                                <div className="flex items-center space-x-2">
                                  <AlertTriangle className="h-4 w-4 text-red-600" />
                                  <span>Sick</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="notes"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Notes (Optional)</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Describe what you observed about your plant's health..."
                              className="resize-none"
                              {...field}
                              data-testid="input-health-notes"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="space-y-2">
                      <FormLabel>Photo (Optional)</FormLabel>
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                        {uploadedImageUrl ? (
                          <div className="relative">
                            <img
                              src={uploadedImageUrl}
                              alt="Health record"
                              className="w-full h-32 object-cover rounded"
                              data-testid="img-uploaded-health"
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-2"
                              onClick={() => setUploadedImageUrl(null)}
                              data-testid="button-remove-image"
                            >
                              Remove Image
                            </Button>
                          </div>
                        ) : (
                          <R2ImageUploader
                            onUpload={(imageUrl: string) => setUploadedImageUrl(imageUrl)}
                            className="w-full"
                          >
                            <div className="text-center py-4">
                              <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                              <p className="text-sm text-gray-600">Click to upload health photo</p>
                            </div>
                          </R2ImageUploader>
                        )}
                      </div>
                    </div>

                    <DialogFooter>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsDialogOpen(false)}
                        data-testid="button-cancel"
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        disabled={createHealthRecord.isPending}
                        data-testid="button-save-health"
                      >
                        {createHealthRecord.isPending ? (
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        ) : null}
                        Save Record
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="space-y-0">
          {timelineEvents.length > 0 ? (
            timelineEvents.map((event, index) => {
              const hasDetails = event.description || event.imageUrl;
              const isExpanded = expandedEventId === event.id;

              return (
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
                      <div className="w-px flex-1 bg-gray-200 mt-2 min-h-[16px]" />
                    )}
                  </div>

                  {/* Event content */}
                  <div className="flex-1 pb-4">
                    <div
                      className={`flex items-start justify-between ${hasDetails ? "cursor-pointer" : ""}`}
                      onClick={() => hasDetails && setExpandedEventId(isExpanded ? null : event.id)}
                    >
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
                        {event.username && (
                          <p className="text-xs text-gray-500" data-testid={`event-user-${event.id}`}>
                            by {event.username}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-1 ml-4 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-sm font-medium text-gray-900" data-testid={`event-date-${event.id}`}>
                            {formatDate(event.timestamp)}
                          </p>
                          <p className="text-xs text-gray-500" data-testid={`event-time-${event.id}`}>
                            {formatTime(event.timestamp)}
                          </p>
                          <p className="text-xs text-gray-400" data-testid={`event-relative-time-${event.id}`}>
                            {formatDistanceToNow(event.timestamp)}
                          </p>
                        </div>
                        {event.type === 'health' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteRecord((event.data as PlantHealthRecord).id);
                            }}
                            disabled={deleteHealthRecord.isPending}
                            className="text-gray-400 hover:text-red-500 ml-1"
                            data-testid={`button-delete-${event.id}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        )}
                        {hasDetails && (
                          isExpanded
                            ? <ChevronUp className="h-4 w-4 text-gray-400" />
                            : <ChevronDown className="h-4 w-4 text-gray-400" />
                        )}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-2 space-y-2" data-testid={`event-details-${event.id}`}>
                        {event.imageUrl && (
                          <img
                            src={event.imageUrl}
                            alt="Health record photo"
                            className="w-full max-h-64 object-contain rounded border"
                            data-testid={`event-image-${event.id}`}
                          />
                        )}
                        {event.description && (
                          <p className="text-sm text-gray-600" data-testid={`event-description-${event.id}`}>
                            {event.description}
                          </p>
                        )}
                        {/* Disease detection for health events with photos */}
                        {event.type === 'health' && event.imageUrl && (
                          <div className="pt-1">
                            {!diseaseResults[event.id] ? (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDetectDisease(event.id, event.imageUrl!);
                                }}
                                disabled={detectingDiseaseId === event.id}
                              >
                                {detectingDiseaseId === event.id ? (
                                  <>
                                    <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                                    Analyzing...
                                  </>
                                ) : (
                                  <>
                                    <Search className="h-3 w-3 mr-2" />
                                    Detect Disease
                                  </>
                                )}
                              </Button>
                            ) : (
                              <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                  Disease Analysis
                                </p>
                                {diseaseResults[event.id].results.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {diseaseResults[event.id].results.map((d, i) => (
                                      <div key={i} className="flex items-center justify-between text-sm">
                                        <span>{d.label}</span>
                                        {d.score != null && (
                                          <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                            d.score >= 0.5
                                              ? "bg-red-100 text-red-800"
                                              : d.score >= 0.2
                                              ? "bg-yellow-100 text-yellow-800"
                                              : "bg-gray-100 text-gray-600"
                                          }`}>
                                            {Math.round(d.score * 100)}%
                                          </span>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-sm text-green-700">No diseases detected</p>
                                )}
                                <p className="text-xs text-muted-foreground italic">
                                  Results are informational, not a professional diagnosis.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })
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
