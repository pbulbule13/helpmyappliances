import { DEV_MODE, devGetEmail, devToken } from "@/lib/dev-auth";
import type {
  UserResponse,
  HouseholdResponse,
  HouseholdListResponse,
  DeviceResponse,
  DeviceListResponse,
  DeviceCreate,
  ScanResponse,
  SessionResponse,
  SessionListResponse,
  ChatHistoryResponse,
  DeviceDocumentListResponse,
} from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

async function getToken(): Promise<string> {
  if (DEV_MODE) {
    const email = devGetEmail();
    if (!email) throw new Error("Not authenticated");
    return devToken(email);
  }
  // Firebase mode — lazy import so firebase SDK isn't loaded in dev mode
  const { getFirebaseAuth } = await import("@/lib/firebase");
  const user = getFirebaseAuth().currentUser;
  if (!user) throw new Error("Not authenticated");
  return user.getIdToken();
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = await getToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

// ─── Auth ────────────────────────────────────────────────────────────────────

export const apiVerifyToken = (): Promise<UserResponse> =>
  request("/api/v1/auth/verify", { method: "POST" });

export const apiGetMe = (): Promise<UserResponse> =>
  request("/api/v1/auth/me");

// ─── Households ──────────────────────────────────────────────────────────────

export const apiListHouseholds = (): Promise<HouseholdListResponse> =>
  request("/api/v1/households/");

export const apiCreateHousehold = (name: string): Promise<HouseholdResponse> =>
  request("/api/v1/households/", {
    method: "POST",
    body: JSON.stringify({ name }),
  });

// ─── Devices ─────────────────────────────────────────────────────────────────

export const apiListDevices = (householdId?: string): Promise<DeviceListResponse> => {
  const params = householdId ? `?household_id=${householdId}` : "";
  return request(`/api/v1/devices/${params}`);
};

export const apiGetDevice = (id: string): Promise<DeviceResponse> =>
  request(`/api/v1/devices/${id}`);

export const apiCreateDevice = (data: DeviceCreate): Promise<DeviceResponse> =>
  request("/api/v1/devices/", { method: "POST", body: JSON.stringify(data) });

export const apiDeleteDevice = (id: string): Promise<void> =>
  request(`/api/v1/devices/${id}`, { method: "DELETE" });

// ─── Scan ─────────────────────────────────────────────────────────────────────

export async function apiScanPhoto(file: File): Promise<ScanResponse> {
  const token = await getToken();
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${API_URL}/api/v1/scan/photo`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: form,
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error?.message || `HTTP ${res.status}`);
  }
  return res.json();
}

// ─── Troubleshoot ─────────────────────────────────────────────────────────────

export const apiCreateSession = (deviceId: string, problemSummary: string): Promise<SessionResponse> =>
  request("/api/v1/troubleshoot/sessions", {
    method: "POST",
    body: JSON.stringify({ device_id: deviceId, problem_summary: problemSummary }),
  });

export const apiListSessions = (deviceId: string): Promise<SessionListResponse> =>
  request(`/api/v1/troubleshoot/sessions?device_id=${deviceId}`);

export const apiGetSession = (sessionId: string): Promise<ChatHistoryResponse> =>
  request(`/api/v1/troubleshoot/sessions/${sessionId}`);

export const apiResolveSession = (sessionId: string): Promise<SessionResponse> =>
  request(`/api/v1/troubleshoot/sessions/${sessionId}/resolve`, { method: "POST" });

export async function apiSendMessage(
  sessionId: string,
  content: string,
  onChunk: (text: string) => void,
  onDone: () => void
): Promise<void> {
  const token = await getToken();
  const res = await fetch(
    `${API_URL}/api/v1/troubleshoot/sessions/${sessionId}/message`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        Accept: "text/event-stream",
      },
      body: JSON.stringify({ content }),
    }
  );
  if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") { onDone(); return; }
      onChunk(payload);
    }
  }
  onDone();
}

// ─── Documents ───────────────────────────────────────────────────────────────

export const apiListDocuments = (deviceId: string): Promise<DeviceDocumentListResponse> =>
  request(`/api/v1/documents/device/${deviceId}`);
