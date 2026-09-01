"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { listUsers } from "@/services/api/admin";
import { getErrorMessage } from "@/services/api/http";
import { AdminUserListItem } from "@/types";
import { PageHeader } from "@/components/ui/Card";
import { PageSpinner } from "@/components/ui/Spinner";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Badge } from "@/components/ui/Badge";
import { ChevronRightIcon } from "@/components/icons";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Parents" />
      <ErrorBanner message={error} />

      {loading ? (
        <PageSpinner />
      ) : (
        <div className="overflow-x-auto rounded-lg border border-border bg-surface">
          <table className="w-full min-w-[680px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Players</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users.map((user) => (
                <tr key={user.user_id} className="hover:bg-background">
                  <td className="px-4 py-3 font-medium text-foreground">{user.name}</td>
                  <td className="px-4 py-3 text-muted">{user.email}</td>
                  <td className="px-4 py-3 text-muted">{user.phone}</td>
                  <td className="px-4 py-3">{user.player_count}</td>
                  <td className="px-4 py-3">{user.order_count}</td>
                  <td className="px-4 py-3">
                    <Badge tone={user.active ? "success" : "neutral"}>{user.active ? "Active" : "Inactive"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/users/${user.user_id}`} className="inline-flex text-navy hover:underline">
                      <ChevronRightIcon className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
