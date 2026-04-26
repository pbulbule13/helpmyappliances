export interface UserResponse {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string;
  avatar_url: string;
  subscription_tier: "free" | "premium";
  created_at: string;
  updated_at: string;
}

export interface HouseholdResponse {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface HouseholdListResponse {
  households: HouseholdResponse[];
  total: number;
}

export interface DeviceResponse {
  id: string;
  household_id: string;
  brand: string;
  model_number: string;
  serial_number: string | null;
  category: string;
  nickname: string;
  room: string;
  purchase_date: string | null;
  photo_url: string | null;
  specifications: Record<string, unknown> | null;
  documentation_urls: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface DeviceListResponse {
  devices: DeviceResponse[];
  total: number;
}

export interface DeviceCreate {
  household_id: string;
  brand?: string;
  model_number: string;
  serial_number?: string;
  category?: string;
  nickname?: string;
  room?: string;
}

export interface ScanResult {
  model_number: string;
  brand: string;
  confidence: number;
  raw_text: string;
  suggested_category: string;
}

export interface ScanResponse {
  success: boolean;
  result: ScanResult | null;
  error: string | null;
  candidates: ScanResult[];
}

export interface SessionResponse {
  id: string;
  device_id: string;
  user_id: string;
  problem_summary: string;
  status: "active" | "resolved" | "escalated";
  created_at: string;
  updated_at: string;
}

export interface SessionListResponse {
  sessions: SessionResponse[];
  total: number;
}

export interface ChatMessageResponse {
  id: string;
  session_id: string;
  role: "user" | "assistant" | "system";
  content: string;
  created_at: string;
}

export interface ChatHistoryResponse {
  session: SessionResponse;
  messages: ChatMessageResponse[];
}

export interface DeviceDocumentResponse {
  id: string;
  device_id: string;
  doc_type: "manual" | "parts_diagram" | "spec_sheet" | "recall_notice" | "video" | "guide";
  title: string;
  source_url: string;
  cached_file_url: string | null;
  created_at: string;
}

export interface DeviceDocumentListResponse {
  documents: DeviceDocumentResponse[];
  total: number;
}

export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}
