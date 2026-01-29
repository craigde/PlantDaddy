import http2 from "http2";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { deviceTokens } from "@shared/schema";
import { eq } from "drizzle-orm";

// APNs configuration from environment variables
const APNS_KEY_ID = process.env.APNS_KEY_ID;
const APNS_TEAM_ID = process.env.APNS_TEAM_ID;
const APNS_KEY = process.env.APNS_KEY; // .p8 key content
const BUNDLE_ID = "com.craigde.PlantDaddy";

const APNS_HOST_PRODUCTION = "api.push.apple.com";
const APNS_HOST_SANDBOX = "api.sandbox.push.apple.com";

// Cache the JWT token (valid for up to 1 hour per Apple docs)
let cachedToken: string | null = null;
let cachedTokenTimestamp = 0;
const TOKEN_TTL = 50 * 60 * 1000; // Refresh every 50 minutes

function getApnsKey(): string | null {
  if (!APNS_KEY) return null;
  // Handle key stored as single-line with escaped newlines
  return APNS_KEY.replace(/\\n/g, "\n");
}

function generateJwt(): string | null {
  const key = getApnsKey();
  if (!key || !APNS_KEY_ID || !APNS_TEAM_ID) {
    return null;
  }

  const now = Date.now();
  if (cachedToken && now - cachedTokenTimestamp < TOKEN_TTL) {
    return cachedToken;
  }

  const token = jwt.sign({}, key, {
    algorithm: "ES256",
    issuer: APNS_TEAM_ID,
    header: {
      alg: "ES256",
      kid: APNS_KEY_ID,
    },
  });

  cachedToken = token;
  cachedTokenTimestamp = now;
  return token;
}

export function isApnsConfigured(): boolean {
  return !!(APNS_KEY_ID && APNS_TEAM_ID && getApnsKey());
}

interface ApnsPayload {
  aps: {
    alert: {
      title: string;
      body: string;
    };
    sound?: string;
    badge?: number;
    "thread-id"?: string;
  };
  plantId?: number;
}

/**
 * Send a push notification to a single device token via APNs HTTP/2
 */
function sendToDevice(
  deviceToken: string,
  payload: ApnsPayload,
  environment: string
): Promise<{ success: boolean; status?: number; reason?: string }> {
  return new Promise((resolve) => {
    const token = generateJwt();
    if (!token) {
      resolve({ success: false, reason: "APNs credentials not configured" });
      return;
    }

    const host =
      environment === "sandbox" ? APNS_HOST_SANDBOX : APNS_HOST_PRODUCTION;

    const client = http2.connect(`https://${host}`);

    client.on("error", (err) => {
      console.error(`[apns] Connection error to ${host}:`, err.message);
      resolve({ success: false, reason: err.message });
    });

    const headers = {
      ":method": "POST",
      ":path": `/3/device/${deviceToken}`,
      authorization: `bearer ${token}`,
      "apns-topic": BUNDLE_ID,
      "apns-push-type": "alert",
      "apns-priority": "10",
    };

    const req = client.request(headers);

    let responseData = "";
    let statusCode = 0;

    req.on("response", (headers) => {
      statusCode = headers[":status"] as number;
    });

    req.on("data", (chunk: Buffer) => {
      responseData += chunk.toString();
    });

    req.on("end", () => {
      client.close();

      if (statusCode === 200) {
        resolve({ success: true, status: 200 });
      } else {
        let reason = "unknown";
        try {
          const parsed = JSON.parse(responseData);
          reason = parsed.reason || reason;
        } catch {}
        console.error(
          `[apns] Push failed: status=${statusCode} reason=${reason} token=${deviceToken.substring(0, 8)}...`
        );
        resolve({ success: false, status: statusCode, reason });
      }
    });

    req.on("error", (err) => {
      client.close();
      resolve({ success: false, reason: err.message });
    });

    req.write(JSON.stringify(payload));
    req.end();
  });
}

/**
 * Send a push notification to all devices registered for a user
 */
export async function sendApnsNotification(
  userId: number,
  title: string,
  body: string,
  options?: { badge?: number; plantId?: number; threadId?: string }
): Promise<number> {
  if (!isApnsConfigured()) {
    return 0;
  }

  // Get all device tokens for this user
  const tokens = await db
    .select()
    .from(deviceTokens)
    .where(eq(deviceTokens.userId, userId));

  if (tokens.length === 0) {
    return 0;
  }

  const payload: ApnsPayload = {
    aps: {
      alert: { title, body },
      sound: "default",
      ...(options?.badge !== undefined && { badge: options.badge }),
      ...(options?.threadId && { "thread-id": options.threadId }),
    },
    ...(options?.plantId && { plantId: options.plantId }),
  };

  let sent = 0;
  const invalidTokenIds: number[] = [];

  for (const deviceToken of tokens) {
    const result = await sendToDevice(
      deviceToken.token,
      payload,
      deviceToken.environment
    );

    if (result.success) {
      sent++;
      // Update last_used timestamp
      await db
        .update(deviceTokens)
        .set({ lastUsed: new Date() })
        .where(eq(deviceTokens.id, deviceToken.id));
    } else if (
      result.reason === "BadDeviceToken" ||
      result.reason === "Unregistered"
    ) {
      // Token is invalid or unregistered — mark for cleanup
      invalidTokenIds.push(deviceToken.id);
    }
  }

  // Clean up invalid tokens
  for (const id of invalidTokenIds) {
    await db.delete(deviceTokens).where(eq(deviceTokens.id, id));
    console.log(`[apns] Removed invalid device token id=${id}`);
  }

  return sent;
}
