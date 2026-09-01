import { apiFetch } from "./http";
import { Profile, ProfileUpdateRequest, RegisterRequest } from "@/types";

export function registerProfile(req: RegisterRequest): Promise<Profile> {
  return apiFetch<Profile>("/api/auth/register", { method: "POST", body: req });
}

export function getProfile(): Promise<Profile> {
  return apiFetch<Profile>("/api/auth/profile");
}

export function updateProfile(req: ProfileUpdateRequest): Promise<Profile> {
  return apiFetch<Profile>("/api/auth/profile", { method: "PUT", body: req });
}
