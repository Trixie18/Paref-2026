"use client";

import { useEffect, useState } from "react";
import { getAuditLog } from "@/services/api/admin";
import { getErrorMessage } from "@/services/api/http";
import { AuditLogEntry } from "@/types";
import { PageHeader } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";

export default function AdminAuditLogPage() {
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAuditLog()
      .then(setEntries)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Audit Log" />
      <ErrorBanner message={error} />

      {loading ? (
        <PageSpinner />
      ) : entries.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No audit entries yet.</p>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Admin</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Entity</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {entries.map((entry) => (
                <tr key={entry.log_id}>
                  <td className="whitespace-nowrap px-4 py-3 text-muted">
                    {new Date(entry.timestamp).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-foreground">{entry.admin_name}</td>
                  <td className="px-4 py-3 font-medium text-foreground">{entry.action}</td>
                  <td className="px-4 py-3 text-muted">
                    {entry.entity_type} {entry.entity_id}
                  </td>
                  <td className="px-4 py-3 text-muted">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
