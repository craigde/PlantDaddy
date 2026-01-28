// R2 Image uploader component for PlantDaddy
// Handles direct uploads to Cloudflare R2 storage
import React, { useState, useRef } from "react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface R2ImageUploaderProps {
  plantId?: number;
  onUpload: (imageUrl: string) => void;
  onError?: (error: Error) => void;
  className?: string;
  children: ReactNode;
}

/**
 * A simple image upload component that uploads to R2 storage via server.
 *
 * Flow:
 * 1. User clicks the button/children area
 * 2. File picker opens
 * 3. After selection, uploads to server which proxies to R2
 * 4. Calls onUpload with the image URL for storing in database
 */
export function R2ImageUploader({
  plantId,
  onUpload,
  onError,
  className,
  children,
}: R2ImageUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      onError?.(new Error("Please select an image file"));
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      onError?.(new Error("Image must be less than 10MB"));
      return;
    }

    setIsUploading(true);

    try {
      // Upload to server which proxies to R2
      const formData = new FormData();
      formData.append('image', file);
      if (plantId) {
        formData.append('plantId', plantId.toString());
      }

      const response = await fetch('/api/r2/upload', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Upload failed' }));
        throw new Error(error.message || 'Upload failed');
      }

      const result = await response.json();
      onUpload(result.imageUrl);
    } catch (error) {
      console.error("Upload error:", error);
      onError?.(error instanceof Error ? error : new Error("Upload failed"));
    } finally {
      setIsUploading(false);
      // Reset input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  return (
    <div className={className}>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
        data-testid="input-file-upload"
      />
      <div onClick={handleClick} className="cursor-pointer">
        {isUploading ? (
          <div className="flex items-center justify-center p-4">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Uploading...</span>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}
