import { apiFetch } from "./http";
import { Bundle } from "@/types";

export function listBundles(): Promise<Bundle[]> {
  return apiFetch<Bundle[]>("/api/bundles");
}

export function getBundle(bundleId: string): Promise<Bundle> {
  return apiFetch<Bundle>(`/api/bundles/${encodeURIComponent(bundleId)}`);
}
