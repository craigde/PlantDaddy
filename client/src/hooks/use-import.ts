import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

export type ImportMode = 'merge' | 'replace';

interface ImportSummary {
  plantsImported: number;
  locationsImported: number;
  wateringHistoryImported: number;
  imagesImported: number;
  mode: ImportMode;
  notificationSettingsUpdated: boolean;
  warnings: string[];
}

interface ImportResponse {
  success: boolean;
  message: string;
  summary: ImportSummary;
}

export function useImport() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const importMutation = useMutation({
    mutationFn: async ({ file, mode, confirmation }: { file: File; mode: ImportMode; confirmation?: string }): Promise<ImportResponse> => {
      const formData = new FormData();
      formData.append('backup', file);
      formData.append('mode', mode);
      
      // Add confirmation for replace mode
      if (mode === 'replace' && confirmation) {
        formData.append('confirmation', confirmation);
      }

      const response = await fetch("/api/import", {
        method: "POST",
        credentials: "include",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: "Import failed" }));
        throw new Error(errorData.message || "Failed to import backup data");
      }

      const result = await response.json();
      return result;
    },
    onSuccess: (data: ImportResponse) => {
      const { summary } = data;
      
      // Invalidate all relevant queries to refresh the UI
      queryClient.invalidateQueries({ queryKey: ['/api/plants'] });
      queryClient.invalidateQueries({ queryKey: ['/api/locations'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notification-settings'] });

      // Show success message with details
      let description = `Successfully imported ${summary.plantsImported} plants, ${summary.locationsImported} locations, and ${summary.wateringHistoryImported} watering records`;
      
      if (summary.imagesImported > 0) {
        description += `, and ${summary.imagesImported} images`;
      }
      
      if (summary.notificationSettingsUpdated) {
        description += '. Notification settings updated';
      }

      toast({
        title: "Import successful",
        description,
      });

      // Show warnings if any
      if (summary.warnings && summary.warnings.length > 0) {
        setTimeout(() => {
          toast({
            title: "Import warnings",
            description: `${summary.warnings.length} warning(s): ${summary.warnings.slice(0, 2).join(', ')}${summary.warnings.length > 2 ? '...' : ''}`,
            variant: "default",
          });
        }, 1000);
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Import failed",
        description: error.message || "Failed to import your backup data",
        variant: "destructive",
      });
    },
  });

  return {
    importData: importMutation.mutate,
    isImporting: importMutation.isPending,
    error: importMutation.error,
    reset: importMutation.reset,
  };
}