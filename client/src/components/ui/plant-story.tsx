import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useJournalEntries } from "@/hooks/use-journal-entries";
import { useHealthRecords } from "@/hooks/use-health-records";
import { useToast } from "@/hooks/use-toast";
import { R2ImageUploader } from "@/components/R2ImageUploader";
import { Camera, Plus, Trash2, X, Loader2 } from "lucide-react";

interface PlantStoryProps {
  plantId: number;
  plantName: string;
}

interface StoryPhoto {
  id: string;
  imageUrl: string;
  caption?: string;
  date: Date;
  source: "journal" | "health";
  username?: string;
  journalEntryId?: number;
}

export function PlantStory({ plantId, plantName }: PlantStoryProps) {
  const { toast } = useToast();
  const { useGetPlantJournal, createJournalEntry, deleteJournalEntry } = useJournalEntries();
  const { useGetPlantHealthRecords } = useHealthRecords();

  const { data: journalData, isLoading: journalLoading } = useGetPlantJournal(plantId);
  const { data: healthData, isLoading: healthLoading } = useGetPlantHealthRecords(plantId);

  const [showAddForm, setShowAddForm] = useState(false);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [caption, setCaption] = useState("");
  const [selectedPhoto, setSelectedPhoto] = useState<StoryPhoto | null>(null);

  const isLoading = journalLoading || healthLoading;

  // Merge journal entries and health record photos into a unified timeline
  const photos: StoryPhoto[] = [];

  if (journalData && Array.isArray(journalData)) {
    for (const entry of journalData) {
      photos.push({
        id: `journal-${entry.id}`,
        imageUrl: entry.imageUrl,
        caption: entry.caption || undefined,
        date: new Date(entry.createdAt),
        source: "journal",
        username: entry.username,
        journalEntryId: entry.id,
      });
    }
  }

  if (healthData && Array.isArray(healthData)) {
    for (const record of healthData) {
      if (record.imageUrl) {
        photos.push({
          id: `health-${record.id}`,
          imageUrl: record.imageUrl,
          caption: `Health: ${record.status}${record.notes ? ` - ${record.notes}` : ""}`,
          date: new Date(record.recordedAt),
          source: "health",
          username: record.username,
        });
      }
    }
  }

  // Sort newest first
  photos.sort((a, b) => b.date.getTime() - a.date.getTime());

  const handleAddPhoto = () => {
    if (!uploadedUrl) return;

    createJournalEntry.mutate(
      { plantId, data: { imageUrl: uploadedUrl, caption: caption.trim() || undefined } },
      {
        onSuccess: () => {
          toast({ title: "Photo added to story" });
          setUploadedUrl(null);
          setCaption("");
          setShowAddForm(false);
        },
        onError: () => {
          toast({ title: "Failed to add photo", variant: "destructive" });
        },
      }
    );
  };

  const handleDeleteEntry = (entryId: number) => {
    deleteJournalEntry.mutate(
      { id: entryId, plantId },
      {
        onSuccess: () => {
          toast({ title: "Photo removed" });
          setSelectedPhoto(null);
        },
        onError: () => {
          toast({ title: "Failed to delete", variant: "destructive" });
        },
      }
    );
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold font-heading">Plant Story</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>

        {/* Add photo form */}
        {showAddForm && (
          <div className="mb-4 p-3 bg-muted/50 rounded-lg space-y-3">
            {uploadedUrl ? (
              <div className="relative">
                <img
                  src={uploadedUrl}
                  alt="Preview"
                  className="w-full max-h-48 object-contain rounded-lg"
                />
                <Button
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={() => setUploadedUrl(null)}
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <R2ImageUploader
                onUpload={(url: string) => setUploadedUrl(url)}
                className="w-full"
              >
                <div className="text-center py-6 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors">
                  <Camera className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Click to upload a photo</p>
                </div>
              </R2ImageUploader>
            )}

            <Input
              placeholder="Add a caption (optional)"
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
            />

            <Button
              onClick={handleAddPhoto}
              disabled={!uploadedUrl || createJournalEntry.isPending}
              className="w-full"
              size="sm"
            >
              {createJournalEntry.isPending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Add to Story
            </Button>
          </div>
        )}

        {/* Photo grid */}
        {isLoading ? (
          <div className="grid grid-cols-3 gap-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="aspect-square bg-muted animate-pulse rounded-lg" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            No photos yet. Add your first photo to start {plantName}'s story.
          </p>
        ) : (
          <div className="grid grid-cols-3 gap-2">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square cursor-pointer group overflow-hidden rounded-lg"
                onClick={() => setSelectedPhoto(photo)}
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.caption || "Plant photo"}
                  className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-1.5">
                  <p className="text-[10px] text-white font-medium">{formatDate(photo.date)}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Expanded photo view */}
        {selectedPhoto && (
          <div
            className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedPhoto(null)}
          >
            <div
              className="bg-card rounded-xl max-w-lg w-full max-h-[90vh] overflow-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhoto.imageUrl}
                alt={selectedPhoto.caption || "Plant photo"}
                className="w-full max-h-[60vh] object-contain rounded-t-xl bg-black"
              />
              <div className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{formatDate(selectedPhoto.date)}</p>
                  <div className="flex items-center gap-2">
                    {selectedPhoto.source === "health" && (
                      <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full">
                        Health Check
                      </span>
                    )}
                    {selectedPhoto.username && (
                      <span className="text-xs text-muted-foreground">by {selectedPhoto.username}</span>
                    )}
                  </div>
                </div>
                {selectedPhoto.caption && (
                  <p className="text-sm text-muted-foreground">{selectedPhoto.caption}</p>
                )}
                <div className="flex justify-between pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedPhoto(null)}
                  >
                    Close
                  </Button>
                  {selectedPhoto.source === "journal" && selectedPhoto.journalEntryId && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleDeleteEntry(selectedPhoto.journalEntryId!)}
                      disabled={deleteJournalEntry.isPending}
                    >
                      {deleteJournalEntry.isPending ? (
                        <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="h-3 w-3 mr-1" />
                      )}
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
