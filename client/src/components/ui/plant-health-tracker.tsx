import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useHealthRecords } from "@/hooks/use-health-records";
import { useToast } from "@/hooks/use-toast";
import { formatDate, formatDistanceToNow } from "@/lib/date-utils";
import { Loader2, Plus, Activity, Heart, AlertTriangle, Camera, Trash2 } from "lucide-react";
import type { PlantHealthRecord } from "@shared/schema";
import { ObjectUploader } from "@/components/ObjectUploader";

const healthRecordSchema = z.object({
  status: z.enum(["thriving", "struggling", "sick"]),
  notes: z.string().optional(),
  imageUrl: z.string().nullable().optional(),
});

type HealthRecordForm = z.infer<typeof healthRecordSchema>;

interface PlantHealthTrackerProps {
  plantId: number;
  plantName: string;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "thriving":
      return <Heart className="h-4 w-4 text-green-600" data-testid="icon-thriving" />;
    case "struggling":
      return <AlertTriangle className="h-4 w-4 text-yellow-600" data-testid="icon-struggling" />;
    case "sick":
      return <AlertTriangle className="h-4 w-4 text-red-600" data-testid="icon-sick" />;
    default:
      return <Activity className="h-4 w-4 text-gray-600" data-testid="icon-default" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "thriving":
      return "bg-green-100 text-green-800 border-green-300";
    case "struggling":
      return "bg-yellow-100 text-yellow-800 border-yellow-300";
    case "sick":
      return "bg-red-100 text-red-800 border-red-300";
    default:
      return "bg-gray-100 text-gray-800 border-gray-300";
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

export function PlantHealthTracker({ plantId, plantName }: PlantHealthTrackerProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  
  const { toast } = useToast();
  const { useGetPlantHealthRecords, createHealthRecord, deleteHealthRecord } = useHealthRecords();
  
  const { data: healthRecords = [], isLoading } = useGetPlantHealthRecords(plantId);

  const form = useForm<HealthRecordForm>({
    resolver: zodResolver(healthRecordSchema),
    defaultValues: {
      status: "thriving",
      notes: "",
      imageUrl: null,
    },
  });

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

      // Reset form and close dialog
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

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImageUrl(imageUrl);
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-center space-x-2">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm text-gray-500">Loading health records...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold font-heading" data-testid="title-health-tracker">
            Plant Health Tracker
          </CardTitle>
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
                        <ObjectUploader
                          onUpload={handleImageUpload}
                          className="w-full"
                          variant="health-record"
                        >
                          <div className="text-center py-4">
                            <Camera className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                            <p className="text-sm text-gray-600">Click to upload health photo</p>
                          </div>
                        </ObjectUploader>
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
      </CardHeader>
      
      <CardContent className="p-4 pt-0">
        {healthRecords.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <Activity className="h-8 w-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm" data-testid="text-no-records">No health records yet</p>
            <p className="text-xs">Start tracking your plant's health to spot patterns over time</p>
          </div>
        ) : (
          <div className="space-y-3" data-testid="list-health-records">
            {healthRecords.map((record: PlantHealthRecord) => (
              <div
                key={record.id}
                className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg"
                data-testid={`record-${record.id}`}
              >
                <div className="flex-shrink-0 mt-1">
                  {getStatusIcon(record.status)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <Badge
                      variant="outline"
                      className={getStatusColor(record.status)}
                      data-testid={`badge-${record.status}`}
                    >
                      {getStatusText(record.status)}
                    </Badge>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500" data-testid={`date-${record.id}`}>
                        {formatDistanceToNow(new Date(record.recordedAt))}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteRecord(record.id)}
                        disabled={deleteHealthRecord.isPending}
                        className="text-gray-400 hover:text-red-500"
                        data-testid={`button-delete-${record.id}`}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  
                  {record.notes && (
                    <p className="text-sm text-gray-700 mb-2" data-testid={`notes-${record.id}`}>
                      {record.notes}
                    </p>
                  )}
                  
                  {record.imageUrl && (
                    <div className="mt-2">
                      <img
                        src={record.imageUrl}
                        alt="Health record"
                        className="w-20 h-20 object-cover rounded border"
                        data-testid={`img-record-${record.id}`}
                      />
                    </div>
                  )}
                  
                  <p className="text-xs text-gray-500 mt-1" data-testid={`timestamp-${record.id}`}>
                    {formatDate(new Date(record.recordedAt))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}