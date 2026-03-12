"use client";

import { useEffect, useState } from "react";
import { AccessAuthSupportPanels } from "./AccessAuthSupportPanels";
import { AccessAutoHealPanel } from "./AccessAutoHealPanel";
import { AccessIdentityGovernancePanels } from "./AccessIdentityGovernancePanels";
import { AccessRecoveryPanels } from "./AccessRecoveryPanels";
import {
  requestJson,
  syncRoleDraftByEmail,
  type AccountRescueActionPayload,
  type AccountRescueHistoryPayload,
  type AuthSupportPayload,
  type AutoHealHistoryPayload,
  type AutoHealRunPayload,
  type IdentityResponse,
  type IdentityStatus,
  type ManualResetResponse,
  type RoleValue,
} from "./accessControlSupport";

export default function AccessControlClient() {
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | IdentityStatus>("ALL");
  const [page, setPage] = useState(1);
  const [payload, setPayload] = useState<IdentityResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [busyEmail, setBusyEmail] = useState<string | null>(null);
  const [roleDraftByEmail, setRoleDraftByEmail] = useState<Record<string, RoleValue>>({});
  const [resetEmail, setResetEmail] = useState("");
  const [resetBusy, setResetBusy] = useState(false);
  const [manualReset, setManualReset] = useState<ManualResetResponse | null>(null);
  const [authSupportQueryInput, setAuthSupportQueryInput] = useState("");
  const [authSupportQuery, setAuthSupportQuery] = useState("");
  const [authSupportPage, setAuthSupportPage] = useState(1);
  const [authSupportData, setAuthSupportData] = useState<AuthSupportPayload | null>(null);
  const [authSupportLoading, setAuthSupportLoading] = useState(false);
  const [authSupportError, setAuthSupportError] = useState<string | null>(null);
  const [authActionBusyKey, setAuthActionBusyKey] = useState<string | null>(null);
  const [autoHealHistory, setAutoHealHistory] = useState<AutoHealHistoryPayload | null>(null);
  const [autoHealLoading, setAutoHealLoading] = useState(false);
  const [autoHealError, setAutoHealError] = useState<string | null>(null);
  const [autoHealBusy, setAutoHealBusy] = useState<"dry_run" | "apply" | null>(null);
  const [autoHealLastRun, setAutoHealLastRun] = useState<AutoHealRunPayload | null>(null);
  const [rescueEmail, setRescueEmail] = useState("");
  const [rescueBusy, setRescueBusy] = useState(false);
  const [rescueError, setRescueError] = useState<string | null>(null);
  const [rescueData, setRescueData] = useState<AccountRescueActionPayload | null>(null);
  const [rescueHistory, setRescueHistory] = useState<AccountRescueHistoryPayload | null>(null);
  const [rescueHistoryLoading, setRescueHistoryLoading] = useState(false);
  const [rescueHistoryError, setRescueHistoryError] = useState<string | null>(null);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setAuthSupportQuery(authSupportQueryInput.trim());
      setAuthSupportPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [authSupportQueryInput]);

  async function loadData(nextPage = page) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "20",
      });
      if (query) {
        params.set("query", query);
      }
      if (statusFilter !== "ALL") {
        params.set("status", statusFilter);
      }

      const data = await requestJson<IdentityResponse>(
        `/api/admin/access/identity?${params.toString()}`,
      );
      setPayload(data);
      setRoleDraftByEmail((prev) => syncRoleDraftByEmail(prev, data.rows));
    } catch (loadError) {
      setPayload(null);
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadAuthSupport(nextPage = authSupportPage) {
    setAuthSupportLoading(true);
    setAuthSupportError(null);
    try {
      const params = new URLSearchParams({
        page: String(nextPage),
        pageSize: "12",
      });
      if (authSupportQuery) {
        params.set("query", authSupportQuery);
      }

      const data = await requestJson<AuthSupportPayload>(
        `/api/admin/auth/support?${params.toString()}`,
      );
      setAuthSupportData(data);
    } catch (loadError) {
      setAuthSupportData(null);
      setAuthSupportError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setAuthSupportLoading(false);
    }
  }

  async function loadAutoHealHistory() {
    setAutoHealLoading(true);
    setAutoHealError(null);
    try {
      const data = await requestJson<AutoHealHistoryPayload>(
        "/api/admin/access/auto-heal?page=1&pageSize=10",
      );
      setAutoHealHistory(data);
    } catch (loadError) {
      setAutoHealHistory(null);
      setAutoHealError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setAutoHealLoading(false);
    }
  }

  async function loadRescueHistory() {
    setRescueHistoryLoading(true);
    setRescueHistoryError(null);
    try {
      const data = await requestJson<AccountRescueHistoryPayload>(
        "/api/admin/access/account-rescue?page=1&pageSize=10",
      );
      setRescueHistory(data);
    } catch (loadError) {
      setRescueHistory(null);
      setRescueHistoryError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setRescueHistoryLoading(false);
    }
  }

  useEffect(() => {
    void loadData(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, statusFilter]);

  useEffect(() => {
    void loadData(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  useEffect(() => {
    void loadAuthSupport(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSupportQuery]);

  useEffect(() => {
    void loadAuthSupport(authSupportPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authSupportPage]);

  useEffect(() => {
    void loadAutoHealHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadRescueHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function applyRole(email: string) {
    const role = roleDraftByEmail[email] ?? "USER";
    setBusyEmail(email);
    setError(null);
    setNotice(null);
    try {
      const result = await requestJson<{
        ok: boolean;
        email: string;
        role: string;
        localUpdated: boolean;
        wsApiUpdated: boolean;
        warning?: string | null;
      }>("/api/admin/access/identity", {
        method: "PATCH",
        body: JSON.stringify({ email, role }),
      });
      const detail = result.warning ? ` (${result.warning})` : "";
      setNotice(
        `Role set to ${result.role} for ${result.email}. local=${result.localUpdated ? "yes" : "no"}, ws-api=${result.wsApiUpdated ? "yes" : "no"}${detail}`,
      );
      await loadData(payload?.page ?? 1);
    } catch (applyError) {
      setError(applyError instanceof Error ? applyError.message : String(applyError));
    } finally {
      setBusyEmail(null);
    }
  }

  async function generateManualResetLink() {
    if (!resetEmail.trim()) {
      setError("Enter an email first.");
      return;
    }

    setResetBusy(true);
    setError(null);
    setNotice(null);
    setManualReset(null);
    try {
      const result = await requestJson<ManualResetResponse>("/api/admin/auth/support", {
        method: "POST",
        body: JSON.stringify({ email: resetEmail.trim(), action: "manual_link" }),
      });
      setManualReset(result);
      setNotice(`Manual reset link generated for ${result.email}.`);
      await loadAuthSupport(authSupportData?.page ?? 1);
    } catch (resetError) {
      setError(resetError instanceof Error ? resetError.message : String(resetError));
    } finally {
      setResetBusy(false);
    }
  }

  async function executeAuthSupportAction(
    action: "manual_link" | "resend",
    email: string,
  ) {
    const key = `${action}:${email}`;
    setAuthActionBusyKey(key);
    setError(null);
    setNotice(null);
    try {
      const result = await requestJson<ManualResetResponse>("/api/admin/auth/support", {
        method: "POST",
        body: JSON.stringify({ email, action }),
      });

      if (action === "manual_link") {
        setManualReset(result);
        setNotice(`Manual reset link generated for ${result.email}.`);
      } else {
        setNotice(
          `Resend submitted for ${result.email}. Delivered: ${
            result.delivered ? "yes" : "no"
          } (${result.provider || "unknown provider"})`,
        );
      }
      await loadAuthSupport(authSupportData?.page ?? 1);
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : String(actionError));
    } finally {
      setAuthActionBusyKey(null);
    }
  }

  async function runIdentityAutoHeal(mode: "dry_run" | "apply") {
    setAutoHealBusy(mode);
    setAutoHealError(null);
    setNotice(null);
    try {
      const result = await requestJson<AutoHealRunPayload>("/api/admin/access/auto-heal", {
        method: "POST",
        body: JSON.stringify({
          mode,
          alignWsApiRoles: true,
          createLocalForWsApiOnly: true,
        }),
      });
      setAutoHealLastRun(result);
      setNotice(
        mode === "apply"
          ? `Auto-heal applied. Role mismatches ${result.summary.before.roleMismatchCount} -> ${result.summary.after.roleMismatchCount}.`
          : `Dry run complete. Role mismatches ${result.summary.before.roleMismatchCount} -> ${result.summary.after.roleMismatchCount} (projected).`,
      );
      await Promise.all([loadAutoHealHistory(), loadData(payload?.page ?? 1)]);
    } catch (runError) {
      setAutoHealError(runError instanceof Error ? runError.message : String(runError));
    } finally {
      setAutoHealBusy(null);
    }
  }

  async function runAccountRescue() {
    if (!rescueEmail.trim()) {
      setRescueError("Enter an email first.");
      return;
    }
    setRescueBusy(true);
    setRescueError(null);
    setRescueData(null);
    setNotice(null);
    try {
      const result = await requestJson<AccountRescueActionPayload>(
        "/api/admin/access/account-rescue",
        {
          method: "POST",
          body: JSON.stringify({ email: rescueEmail.trim() }),
        },
      );
      setRescueData(result);
      setNotice(
        `Account rescue complete for ${result.email}. Delivered: ${
          result.delivered ? "yes" : "no"
        }`,
      );
      await Promise.all([loadRescueHistory(), loadAuthSupport(authSupportData?.page ?? 1)]);
    } catch (loadError) {
      setRescueError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setRescueBusy(false);
    }
  }

  function updateRoleDraft(email: string, role: RoleValue) {
    setRoleDraftByEmail((prev) => ({
      ...prev,
      [email]: role,
    }));
  }

  function handleStatusFilterChange(next: "ALL" | IdentityStatus) {
    setStatusFilter(next);
    setPage(1);
  }

  return (
    <section className="space-y-4">
      <AccessIdentityGovernancePanels
        queryInput={queryInput}
        setQueryInput={setQueryInput}
        statusFilter={statusFilter}
        onStatusFilterChange={handleStatusFilterChange}
        payload={payload}
        loading={loading}
        error={error}
        notice={notice}
        busyEmail={busyEmail}
        roleDraftByEmail={roleDraftByEmail}
        onRoleDraftChange={updateRoleDraft}
        onReload={() => void loadData(payload?.page ?? 1)}
        onApplyRole={(email) => void applyRole(email)}
        onPreviousPage={() => setPage((prev) => Math.max(1, prev - 1))}
        onNextPage={() =>
          setPage((prev) => {
            if (!payload) return prev;
            return Math.min(payload.totalPages, prev + 1);
          })
        }
      />

      <AccessRecoveryPanels
        rescueEmail={rescueEmail}
        setRescueEmail={setRescueEmail}
        rescueBusy={rescueBusy}
        rescueError={rescueError}
        rescueData={rescueData}
        rescueHistory={rescueHistory}
        rescueHistoryLoading={rescueHistoryLoading}
        rescueHistoryError={rescueHistoryError}
        onRunRescue={() => void runAccountRescue()}
        resetEmail={resetEmail}
        setResetEmail={setResetEmail}
        resetBusy={resetBusy}
        manualReset={manualReset}
        onGenerateManualResetLink={() => void generateManualResetLink()}
      />

      <AccessAutoHealPanel
        autoHealBusy={autoHealBusy}
        autoHealError={autoHealError}
        autoHealLastRun={autoHealLastRun}
        autoHealHistory={autoHealHistory}
        autoHealLoading={autoHealLoading}
        onRunAutoHeal={(mode) => void runIdentityAutoHeal(mode)}
      />

      <AccessAuthSupportPanels
        authSupportQueryInput={authSupportQueryInput}
        setAuthSupportQueryInput={setAuthSupportQueryInput}
        authSupportLoading={authSupportLoading}
        authSupportError={authSupportError}
        authSupportData={authSupportData}
        authSupportPage={authSupportPage}
        authActionBusyKey={authActionBusyKey}
        onPreviousPage={() => setAuthSupportPage((prev) => Math.max(1, prev - 1))}
        onNextPage={() =>
          setAuthSupportPage((prev) =>
            authSupportData ? Math.min(authSupportData.totalPages, prev + 1) : prev,
          )
        }
        onExecuteAuthSupportAction={(action, email) =>
          void executeAuthSupportAction(action, email)
        }
      />
    </section>
  );
}
