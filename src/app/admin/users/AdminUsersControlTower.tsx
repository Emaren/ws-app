"use client";

import { useDeferredValue, useEffect, useState } from "react";
import { AdminUsersActivityPanels } from "./AdminUsersActivityPanels";
import { AdminUsersOverviewPanels, AdminUsersRosterPanel } from "./AdminUsersOverviewPanels";
import { AdminUsersSelectedProfilePanels } from "./AdminUsersSelectedProfilePanels";
import {
  matchesUsersAtlasQuery,
  requestJson,
  type AdminUserRecord,
  type AdminUsersPayload,
} from "./adminUsersControlTowerSupport";

export default function AdminUsersControlTower() {
  const [payload, setPayload] = useState<AdminUsersPayload | null>(null);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const deferredQuery = useDeferredValue(query);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await requestJson<AdminUsersPayload>("/api/admin/users/intelligence");
        if (!active) {
          return;
        }
        setPayload(data);
        setSelectedUserId((current) => current ?? data.users[0]?.id ?? null);
      } catch (loadError) {
        if (!active) {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : String(loadError));
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    void load();

    return () => {
      active = false;
    };
  }, []);

  const filteredUsers =
    payload?.users.filter((user) => matchesUsersAtlasQuery(user, deferredQuery)) ?? [];

  const selectedUser: AdminUserRecord | null =
    filteredUsers.find((user) => user.id === selectedUserId) ?? filteredUsers[0] ?? null;

  useEffect(() => {
    if (!selectedUser && filteredUsers.length > 0) {
      setSelectedUserId(filteredUsers[0].id);
    }
  }, [filteredUsers, selectedUser]);

  return (
    <div className="space-y-4">
      <AdminUsersOverviewPanels
        payload={payload}
        loading={loading}
        error={error}
        query={query}
        onQueryChange={setQuery}
      />

      <section className="grid gap-4 xl:grid-cols-[340px_minmax(0,1fr)]">
        <AdminUsersRosterPanel
          loading={loading}
          filteredUsers={filteredUsers}
          selectedUser={selectedUser}
          onSelectUser={setSelectedUserId}
        />
        <div className="min-w-0 space-y-4">
          <AdminUsersSelectedProfilePanels
            selectedUser={selectedUser}
            trackedTokens={payload?.preferenceCatalog.trackedTokens ?? []}
          />
        </div>
      </section>

      <AdminUsersActivityPanels payload={payload} />
    </div>
  );
}
