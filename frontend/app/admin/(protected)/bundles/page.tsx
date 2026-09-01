"use client";

import { useEffect, useState } from "react";
import { listAdminBundles, updateBundle } from "@/services/api/admin";
import { getErrorMessage } from "@/services/api/http";
import { Bundle } from "@/types";
import { PageHeader } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { BundleFormModal } from "@/components/admin/BundleFormModal";
import { PlusIcon } from "@/components/icons";

export default function AdminBundlesPage() {
  const [bundles, setBundles] = useState<Bundle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Bundle | null>(null);
  const [creating, setCreating] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  // Resets loading/error before a real fetch — also used as a manual
  // retry, so it can't be replaced by a lazy initial value.
  function load() {
    setLoading(true);
    listAdminBundles()
      .then(setBundles)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(load, []);

  function replaceBundle(updated: Bundle) {
    setBundles((prev) => {
      const exists = prev.some((b) => b.bundle_id === updated.bundle_id);
      return exists ? prev.map((b) => (b.bundle_id === updated.bundle_id ? updated : b)) : [...prev, updated];
    });
  }

  async function toggleActive(bundle: Bundle) {
    setBusyId(bundle.bundle_id);
    setError(null);
    try {
      const updated = await updateBundle(bundle.bundle_id, { active: !bundle.active });
      replaceBundle(updated);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader
        title="Bundles"
        action={
          <Button size="sm" onClick={() => setCreating(true)}>
            <PlusIcon className="h-4 w-4" /> New Bundle
          </Button>
        }
      />

      <ErrorBanner message={error} />

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {bundles.map((bundle) => (
            <div key={bundle.bundle_id} className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-foreground">{bundle.name}</h3>
                  <p className="text-xs text-muted">{bundle.bundle_id}</p>
                </div>
                <Badge tone={bundle.active ? "success" : "neutral"}>{bundle.active ? "Active" : "Inactive"}</Badge>
              </div>
              <p className="text-sm text-muted">{bundle.description}</p>
              <ul className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-muted">
                {bundle.items.map((item) => (
                  <li key={item.product_id}>
                    {item.quantity}&times; {item.product_name}
                  </li>
                ))}
              </ul>
              <div className="flex items-center justify-between pt-1">
                <span className="font-semibold text-navy">₱{bundle.price.toFixed(2)}</span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => setEditing(bundle)}>
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={bundle.active ? "danger" : "secondary"}
                    disabled={busyId === bundle.bundle_id}
                    onClick={() => toggleActive(bundle)}
                  >
                    {bundle.active ? "Deactivate" : "Reactivate"}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {(creating || editing) && (
        <BundleFormModal
          bundle={editing}
          onClose={() => {
            setCreating(false);
            setEditing(null);
          }}
          onSaved={(bundle) => {
            replaceBundle(bundle);
            setCreating(false);
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}
