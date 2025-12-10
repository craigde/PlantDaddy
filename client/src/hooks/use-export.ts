import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface ExportResponse {
  blob: Blob;
  filename: string;
}

export function useExport() {
  const { toast } = useToast();

  const exportMutation = useMutation({
    mutationFn: async (): Promise<ExportResponse> => {
      const response = await fetch("/api/export", {
        method: "GET",
        credentials: "include",
        headers: {
          "Accept": "application/zip",
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to export data");
      }

      // Get the filename from the Content-Disposition header
      const contentDisposition = response.headers.get("Content-Disposition");
      let filename = "plantdaddy-backup.json";
      
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1];
        }
      }

      const blob = await response.blob();
      return { blob, filename };
    },
    onSuccess: ({ blob, filename }) => {
      // Create download link and trigger download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast({
        title: "Export successful",
        description: `Your plant data has been exported as ${filename}`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Export failed",
        description: error.message || "Failed to export your plant data",
        variant: "destructive",
      });
    },
  });

  return {
    exportData: exportMutation.mutate,
    isExporting: exportMutation.isPending,
    error: exportMutation.error,
  };
}