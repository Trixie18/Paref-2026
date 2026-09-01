export interface Profile {
  user_id: string;
  name: string;
  email: string;
  phone: string;
  created_at: string;
  active: boolean;
}

export interface RegisterRequest {
  name: string;
  phone: string;
}

export interface ProfileUpdateRequest {
  name?: string;
  phone?: string;
}

export interface AdminProfile {
  admin_id: string;
  name: string;
  email: string;
  role: "ADMIN" | "STAFF";
}
