// R2 Storage service for PlantDaddy - handles secure file uploads to Cloudflare R2
// R2 is S3-compatible, so we use the AWS SDK
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { randomUUID } from "crypto";

// R2 configuration from environment variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "plantdaddy";

// Check if R2 is configured
export function isR2Configured(): boolean {
  return !!(R2_ACCOUNT_ID && R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
}

// Create S3 client configured for R2
function getR2Client(): S3Client {
  if (!isR2Configured()) {
    throw new Error(
      "R2 storage is not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables."
    );
  }

  return new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    forcePathStyle: true, // Required for R2 presigned URLs
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID!,
      secretAccessKey: R2_SECRET_ACCESS_KEY!,
    },
  });
}

export class R2StorageService {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.client = getR2Client();
    this.bucket = R2_BUCKET_NAME;
  }

  /**
   * Generate a presigned URL for uploading a file directly to R2
   * @param userId - The user's ID for path scoping
   * @param plantId - Optional plant ID for organizing uploads
   * @param contentType - The content type of the file being uploaded
   * @returns Object containing the presigned URL and the object key
   */
  async getUploadUrl(
    userId: number,
    plantId?: number,
    contentType: string = "image/jpeg"
  ): Promise<{ url: string; key: string }> {
    const objectId = randomUUID();

    // User-scoped path to organize uploads and prevent collisions
    const key = plantId
      ? `users/${userId}/plants/${plantId}/${objectId}`
      : `users/${userId}/uploads/${objectId}`;

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    // Generate presigned URL valid for 15 minutes
    const url = await getSignedUrl(this.client, command, { expiresIn: 900 });

    return { url, key };
  }

  /**
   * Generate a presigned URL for downloading/viewing a file from R2
   * @param key - The object key in R2
   * @returns Presigned URL for downloading the file
   */
  async getDownloadUrl(key: string): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    // Generate presigned URL valid for 1 hour
    return getSignedUrl(this.client, command, { expiresIn: 3600 });
  }

  /**
   * Check if an object exists in R2
   * @param key - The object key to check
   * @returns True if the object exists
   */
  async objectExists(key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
      return true;
    } catch (error: any) {
      if (error.name === "NotFound" || error.$metadata?.httpStatusCode === 404) {
        return false;
      }
      throw error;
    }
  }

  /**
   * Upload a file directly to R2 from the server
   * @param userId - The user's ID for path scoping
   * @param plantId - Optional plant ID for organizing uploads
   * @param data - The file data as a Buffer
   * @param contentType - The content type of the file
   * @returns The object key
   */
  async uploadFile(
    userId: number,
    data: Buffer,
    contentType: string = "image/jpeg",
    plantId?: number
  ): Promise<string> {
    const objectId = randomUUID();

    // User-scoped path to organize uploads and prevent collisions
    const key = plantId
      ? `users/${userId}/plants/${plantId}/${objectId}`
      : `users/${userId}/uploads/${objectId}`;

    console.log("[R2StorageService] uploadFile called:", {
      userId,
      plantId,
      contentType,
      dataSize: data?.length,
      bucket: this.bucket,
      key
    });

    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: data,
      ContentType: contentType,
    });

    try {
      const result = await this.client.send(command);
      console.log("[R2StorageService] Upload successful:", {
        key,
        httpStatusCode: result.$metadata?.httpStatusCode,
        requestId: result.$metadata?.requestId
      });
      return key;
    } catch (error: any) {
      console.error("[R2StorageService] Upload failed:", {
        key,
        errorName: error?.name,
        errorMessage: error?.message,
        httpStatusCode: error?.$metadata?.httpStatusCode,
        requestId: error?.$metadata?.requestId
      });
      throw error;
    }
  }

  /**
   * Delete an object from R2
   * @param key - The object key to delete
   */
  async deleteObject(key: string): Promise<void> {
    const command = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(command);
  }

  /**
   * Extract the R2 key from an image URL
   * Handles both /r2/ prefixed URLs and direct keys
   * @param imageUrl - The image URL stored in the database
   * @returns The R2 object key, or null if not an R2 URL
   */
  extractKeyFromUrl(imageUrl: string): string | null {
    if (!imageUrl) return null;

    // Handle /r2/ prefixed URLs (our internal format)
    if (imageUrl.startsWith("/r2/")) {
      return imageUrl.slice(4); // Remove "/r2/" prefix
    }

    // Handle direct R2 URLs (presigned URLs contain the key in the path)
    if (imageUrl.includes(".r2.cloudflarestorage.com")) {
      try {
        const url = new URL(imageUrl);
        // Key is the pathname without leading slash and bucket name
        const pathParts = url.pathname.split("/").filter(Boolean);
        // First part is bucket name, rest is the key
        if (pathParts.length > 1) {
          return pathParts.slice(1).join("/");
        }
      } catch {
        return null;
      }
    }

    return null;
  }

  /**
   * Convert an R2 key to our internal URL format
   * @param key - The R2 object key
   * @returns Internal URL format for storing in database
   */
  keyToInternalUrl(key: string): string {
    return `/r2/${key}`;
  }

  /**
   * Verify that an R2 key belongs to a specific user
   * @param key - The R2 object key
   * @param userId - The user ID to verify
   * @returns True if the key belongs to the user
   */
  verifyUserOwnership(key: string, userId: number): boolean {
    // Expected format: users/{userId}/...
    const expectedPrefix = `users/${userId}/`;
    return key.startsWith(expectedPrefix);
  }
}
