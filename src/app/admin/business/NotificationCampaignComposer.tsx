"use client";

import { useEffect, useMemo, useState } from "react";

type BusinessRecord = {
  id: string;
  slug: string;
  name: string;
  status: string;
};

type NotificationChannel = "email" | "sms" | "push";
type NotificationStatus = "queued" | "processing" | "retrying" | "sent" | "failed";
type SendMode = "send_now" | "scheduled";
type AudienceMode = "all" | "segment" | "direct";

type NotificationJobRecord = {
  id: string;
  businessId: string;
  channel: NotificationChannel;
  audience: string;
  subject: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
  status: NotificationStatus;
  provider: string | null;
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: string;
  lastAttemptAt: string | null;
  sentAt: string | null;
  failedAt: string | null;
  lastError: string | null;
  createdAt: string;
  updatedAt: string;
};

type NotificationAuditLogRecord = {
  id: string;
  jobId: string;
  event: string;
  channel: NotificationChannel;
  provider: string | null;
  attempt: number | null;
  message: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

type ProcessQueueResult = {
  processed: number;
  sent: number;
  retried: number;
  failed: number;
  jobIds: string[];
};

type HistoryFilterState = {
  status: "" | NotificationStatus;
  channel: "" | NotificationChannel;
};

type CampaignFormState = {
  businessId: string;
  campaignName: string;
  channel: NotificationChannel;
  audienceMode: AudienceMode;
  audienceValue: string;
  subject: string;
  message: string;
  sendMode: SendMode;
  scheduledFor: string;
  maxAttempts: string;
};

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      Accept: "application/json",
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers ?? {}),
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message =
      (payload && typeof payload.message === "string" && payload.message) ||
      (payload && typeof payload?.error?.message === "string" && payload.error.message) ||
      `Request failed (${response.status})`;
    throw new Error(message);
  }

  return payload as T;
}

function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
    date.getDate(),
  )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toIsoDate(localValue: string): string | null {
  const trimmed = localValue.trim();
  if (!trimmed) return null;
  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) return null;
  return parsed.toISOString();
}

function statusBadgeClasses(status: NotificationStatus): string {
  if (status === "sent") {
    return "border border-emerald-500/40 bg-emerald-500/10 text-emerald-200";
  }
  if (status === "failed") {
    return "border border-red-500/50 bg-red-500/10 text-red-200";
  }
  if (status === "processing") {
    return "border border-blue-400/40 bg-blue-500/10 text-blue-100";
  }
  if (status === "retrying") {
    return "border border-amber-500/40 bg-amber-500/10 text-amber-200";
  }
  return "border border-white/20 bg-white/5 text-white/80";
}

function formatStatus(status: NotificationStatus): string {
  if (status === "processing") return "PROCESSING";
  if (status === "retrying") return "RETRYING";
  if (status === "sent") return "SENT";
  if (status === "failed") return "FAILED";
  return "QUEUED";
}

function stringifyDetail(detail: Record<string, unknown> | null): string {
  if (!detail) return "";

  const entries = Object.entries(detail)
    .filter(([, value]) => value !== null && value !== undefined)
    .slice(0, 4)
    .map(([key, value]) => `${key}=${String(value)}`);

  return entries.join(" · ");
}

function createCampaignForm(businessId: string): CampaignFormState {
  return {
    businessId,
    campaignName: "",
    channel: "email",
    audienceMode: "all",
    audienceValue: "",
    subject: "",
    message: "",
    sendMode: "send_now",
    scheduledFor: "",
    maxAttempts: "3",
  };
}

function resolveAudience(mode: AudienceMode, rawValue: string): string {
  const value = rawValue.trim();
  if (mode === "all") {
    return "all";
  }
  if (!value) {
    return "";
  }
  if (mode === "segment") {
    return `segment:${value}`;
  }
  return value;
}

export default function NotificationCampaignComposer() {
  const [businesses, setBusinesses] = useState<BusinessRecord[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [jobs, setJobs] = useState<NotificationJobRecord[]>([]);
  const [jobAudit, setJobAudit] = useState<NotificationAuditLogRecord[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [historyFilter, setHistoryFilter] = useState<HistoryFilterState>({
    status: "",
    channel: "",
  });
  const [form, setForm] = useState<CampaignFormState>(createCampaignForm(""));
  const [loadingBusinesses, setLoadingBusinesses] = useState(true);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const businessById = useMemo(
    () => new Map(businesses.map((business) => [business.id, business])),
    [businesses],
  );

  const jobStats = useMemo(() => {
    let queued = 0;
    let processing = 0;
    let retrying = 0;
    let sent = 0;
    let failed = 0;

    for (const job of jobs) {
      if (job.status === "queued") queued += 1;
      if (job.status === "processing") processing += 1;
      if (job.status === "retrying") retrying += 1;
      if (job.status === "sent") sent += 1;
      if (job.status === "failed") failed += 1;
    }

    return { queued, processing, retrying, sent, failed };
  }, [jobs]);

  async function loadBusinesses() {
    setLoadingBusinesses(true);
    setError(null);

    try {
      const businessData = await requestJson<BusinessRecord[]>("/api/ops/businesses");
      setBusinesses(businessData);

      const nextBusinessId =
        selectedBusinessId && businessData.some((item) => item.id === selectedBusinessId)
          ? selectedBusinessId
          : businessData[0]?.id ?? "";

      setSelectedBusinessId(nextBusinessId);
      setForm((prev) => {
        if (prev.businessId && prev.businessId === nextBusinessId) {
          return prev;
        }
        return createCampaignForm(nextBusinessId);
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoadingBusinesses(false);
    }
  }

  async function loadHistory() {
    setLoadingHistory(true);
    setError(null);

    try {
      const query = new URLSearchParams();
      if (selectedBusinessId) {
        query.set("businessId", selectedBusinessId);
      }
      if (historyFilter.status) {
        query.set("status", historyFilter.status);
      }
      if (historyFilter.channel) {
        query.set("channel", historyFilter.channel);
      }

      const suffix = query.toString();
      const jobsData = await requestJson<NotificationJobRecord[]>(
        `/api/notifications/jobs${suffix ? `?${suffix}` : ""}`,
      );
      setJobs(jobsData);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoadingHistory(false);
    }
  }

  async function loadJobAudit(jobId: string) {
    setLoadingAudit(true);
    setError(null);

    try {
      const timeline = await requestJson<NotificationAuditLogRecord[]>(
        `/api/notifications/jobs/${encodeURIComponent(jobId)}/audit`,
      );
      setJobAudit(timeline);
      setSelectedJobId(jobId);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoadingAudit(false);
    }
  }

  useEffect(() => {
    void loadBusinesses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loadingBusinesses) return;
    void loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadingBusinesses, selectedBusinessId, historyFilter.status, historyFilter.channel]);

  async function submitCampaign(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    setNotice(null);

    try {
      if (!form.businessId) {
        throw new Error("Select a business first");
      }

      const campaignName = form.campaignName.trim();
      if (!campaignName) {
        throw new Error("Campaign name is required");
      }

      const message = form.message.trim();
      if (!message) {
        throw new Error("Notification message is required");
      }

      const audience = resolveAudience(form.audienceMode, form.audienceValue);
      if (!audience) {
        throw new Error("Audience target is required for this mode");
      }

      const maxAttempts = Number.parseInt(form.maxAttempts.trim(), 10);
      if (!Number.isFinite(maxAttempts) || maxAttempts < 1 || maxAttempts > 10) {
        throw new Error("Max attempts must be an integer between 1 and 10");
      }

      const scheduledForIso = form.sendMode === "scheduled" ? toIsoDate(form.scheduledFor) : null;
      if (form.sendMode === "scheduled" && !scheduledForIso) {
        throw new Error("Scheduled campaigns require a valid date and time");
      }

      const subject =
        form.channel === "email"
          ? form.subject.trim() || campaignName
          : undefined;

      const metadata: Record<string, unknown> = {
        campaignName,
        sendMode: form.sendMode,
        audienceMode: form.audienceMode,
        source: "ws-app-admin-business",
      };
      if (scheduledForIso) {
        metadata.scheduledFor = scheduledForIso;
      }

      setBusyAction("campaign-submit");

      const createdJob = await requestJson<NotificationJobRecord>("/api/notifications/jobs", {
        method: "POST",
        body: JSON.stringify({
          businessId: form.businessId,
          channel: form.channel,
          audience,
          message,
          ...(subject ? { subject } : {}),
          maxAttempts,
          metadata,
        }),
      });

      if (form.sendMode === "send_now") {
        const processResult = await requestJson<ProcessQueueResult>(
          "/api/notifications/jobs/process",
          {
            method: "POST",
            body: JSON.stringify({ limit: 25 }),
          },
        );

        setNotice(
          `Campaign queued. Queue run processed ${processResult.processed} jobs: ${processResult.sent} sent, ${processResult.retried} retried, ${processResult.failed} failed.`,
        );
      } else {
        setNotice(
          `Scheduled campaign queued for ${new Date(scheduledForIso ?? "").toLocaleString()}. It will send when queue processing runs at or after that time.`,
        );
      }

      setForm(createCampaignForm(form.businessId));
      await loadHistory();
      await loadJobAudit(createdJob.id);
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : String(submitError));
    } finally {
      setBusyAction(null);
    }
  }

  async function processQueueNow() {
    setError(null);
    setNotice(null);
    setBusyAction("process-queue");

    try {
      const result = await requestJson<ProcessQueueResult>("/api/notifications/jobs/process", {
        method: "POST",
        body: JSON.stringify({ limit: 50 }),
      });
      setNotice(
        `Queue processed ${result.processed} jobs: ${result.sent} sent, ${result.retried} retried, ${result.failed} failed.`,
      );
      await loadHistory();
      if (selectedJobId) {
        await loadJobAudit(selectedJobId);
      }
    } catch (processError) {
      setError(processError instanceof Error ? processError.message : String(processError));
    } finally {
      setBusyAction(null);
    }
  }

  async function retryJob(jobId: string) {
    setError(null);
    setNotice(null);
    setBusyAction(`retry-${jobId}`);

    try {
      await requestJson<NotificationJobRecord>(
        `/api/notifications/jobs/${encodeURIComponent(jobId)}/retry`,
        {
          method: "POST",
        },
      );
      setNotice("Retry requested.");
      await loadHistory();
      await loadJobAudit(jobId);
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : String(retryError));
    } finally {
      setBusyAction(null);
    }
  }

  return (
    <section className="space-y-4">
      <div className="admin-card p-4 md:p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold md:text-2xl">
              Campaign Composer and Delivery History
            </h2>
            <p className="mt-1 text-sm opacity-75">
              Build send-now or scheduled notifications with channel targeting and full delivery trace.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <select
              value={selectedBusinessId}
              onChange={(event) => {
                const nextBusinessId = event.target.value;
                setSelectedBusinessId(nextBusinessId);
                setForm((prev) => ({ ...prev, businessId: nextBusinessId }));
                setSelectedJobId(null);
                setJobAudit([]);
              }}
              className="admin-surface rounded-xl px-3 py-2 text-sm"
              disabled={loadingBusinesses || businesses.length === 0}
            >
              {businesses.length === 0 ? (
                <option value="">No businesses found</option>
              ) : null}
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name} ({business.status})
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => {
                void loadBusinesses();
                void loadHistory();
              }}
              className="rounded-xl border px-3 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
              disabled={busyAction !== null || loadingBusinesses || loadingHistory}
            >
              {(loadingBusinesses || loadingHistory) ? "Loading..." : "Reload"}
            </button>
          </div>
        </div>

        {error ? (
          <p className="mt-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-300">
            {error}
          </p>
        ) : null}
        {notice ? (
          <p className="mt-3 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-200">
            {notice}
          </p>
        ) : null}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Queued</p>
          <p className="mt-1 text-2xl font-semibold">{jobStats.queued}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">In Flight</p>
          <p className="mt-1 text-2xl font-semibold">{jobStats.processing + jobStats.retrying}</p>
        </div>
        <div className="admin-card rounded-xl p-4">
          <p className="text-xs uppercase tracking-wide opacity-70">Delivered / Failed</p>
          <p className="mt-1 text-2xl font-semibold">{jobStats.sent} / {jobStats.failed}</p>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <form onSubmit={submitCampaign} className="admin-card space-y-4 p-4 md:p-5">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Compose Campaign</h3>
            <button
              type="button"
              onClick={() => setForm(createCampaignForm(selectedBusinessId))}
              className="rounded-xl border px-3 py-1.5 text-xs transition hover:bg-white/5"
            >
              Reset
            </button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Campaign name</span>
              <input
                value={form.campaignName}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, campaignName: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="Avalon Friday Flash"
                required
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Channel</span>
              <select
                value={form.channel}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    channel: event.target.value as NotificationChannel,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
              >
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Audience mode</span>
              <select
                value={form.audienceMode}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    audienceMode: event.target.value as AudienceMode,
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
              >
                <option value="all">All recipients</option>
                <option value="segment">Segment tag</option>
                <option value="direct">Direct target</option>
              </select>
            </label>

            {form.audienceMode === "all" ? (
              <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs opacity-80 sm:col-span-2">
                Audience resolves to all recipients for this business.
              </p>
            ) : (
              <label className="space-y-1 text-sm sm:col-span-2">
                <span>{form.audienceMode === "segment" ? "Segment" : "Direct target"}</span>
                <input
                  value={form.audienceValue}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, audienceValue: event.target.value }))
                  }
                  className="admin-surface w-full rounded-xl px-3 py-2"
                  placeholder={form.audienceMode === "segment" ? "vip-east" : "email, phone, or push token"}
                  required
                />
              </label>
            )}

            {form.channel === "email" ? (
              <label className="space-y-1 text-sm sm:col-span-2">
                <span>Email subject</span>
                <input
                  value={form.subject}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, subject: event.target.value }))
                  }
                  className="admin-surface w-full rounded-xl px-3 py-2"
                  placeholder="Optional, falls back to campaign name"
                />
              </label>
            ) : null}

            <label className="space-y-1 text-sm sm:col-span-2">
              <span>Message</span>
              <textarea
                value={form.message}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, message: event.target.value }))
                }
                className="admin-surface min-h-[100px] w-full rounded-xl px-3 py-2"
                placeholder="Fresh markdown-style or plain text message"
                required
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Send mode</span>
              <select
                value={form.sendMode}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, sendMode: event.target.value as SendMode }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
              >
                <option value="send_now">Send now</option>
                <option value="scheduled">Scheduled</option>
              </select>
            </label>

            <label className="space-y-1 text-sm">
              <span>Max attempts</span>
              <input
                inputMode="numeric"
                value={form.maxAttempts}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, maxAttempts: event.target.value }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
                placeholder="3"
              />
            </label>

            {form.sendMode === "scheduled" ? (
              <label className="space-y-1 text-sm sm:col-span-2">
                <span>Scheduled for</span>
                <input
                  type="datetime-local"
                  value={form.scheduledFor}
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, scheduledFor: event.target.value }))
                  }
                  className="admin-surface w-full rounded-xl px-3 py-2"
                  required
                />
              </label>
            ) : null}
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="submit"
              disabled={busyAction !== null || loadingBusinesses || loadingHistory}
              className="rounded-xl border border-amber-300/40 bg-amber-200/20 px-4 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
            >
              {busyAction === "campaign-submit" ? "Saving..." : "Queue Campaign"}
            </button>
            <button
              type="button"
              onClick={() => void processQueueNow()}
              disabled={busyAction !== null || loadingHistory}
              className="rounded-xl border px-4 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
            >
              {busyAction === "process-queue" ? "Processing..." : "Process Queue Now"}
            </button>
          </div>

          {form.sendMode === "scheduled" ? (
            <p className="text-xs opacity-65">
              Scheduled timestamp is recorded in campaign metadata; queue processing should run at/after that time.
            </p>
          ) : null}
        </form>

        <div className="admin-card space-y-4 p-4 md:p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-base font-semibold">Delivery History</h3>
            <button
              type="button"
              onClick={() => void loadHistory()}
              disabled={loadingHistory || busyAction !== null}
              className="rounded-xl border px-3 py-1.5 text-xs transition hover:bg-white/5 disabled:opacity-60"
            >
              {loadingHistory ? "Loading..." : "Refresh"}
            </button>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <label className="space-y-1 text-sm">
              <span>Status filter</span>
              <select
                value={historyFilter.status}
                onChange={(event) =>
                  setHistoryFilter((prev) => ({
                    ...prev,
                    status: event.target.value as HistoryFilterState["status"],
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
              >
                <option value="">All statuses</option>
                <option value="queued">Queued</option>
                <option value="processing">Processing</option>
                <option value="retrying">Retrying</option>
                <option value="sent">Sent</option>
                <option value="failed">Failed</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>Channel filter</span>
              <select
                value={historyFilter.channel}
                onChange={(event) =>
                  setHistoryFilter((prev) => ({
                    ...prev,
                    channel: event.target.value as HistoryFilterState["channel"],
                  }))
                }
                className="admin-surface w-full rounded-xl px-3 py-2"
              >
                <option value="">All channels</option>
                <option value="email">Email</option>
                <option value="sms">SMS</option>
                <option value="push">Push</option>
              </select>
            </label>
          </div>

          {jobs.length === 0 ? (
            <p className="text-sm opacity-70">No delivery jobs found for this filter.</p>
          ) : (
            <ul className="space-y-3 max-h-[420px] overflow-auto pr-1">
              {jobs.map((job) => {
                const businessName = businessById.get(job.businessId)?.name ?? job.businessId;
                const campaignName =
                  typeof job.metadata?.campaignName === "string"
                    ? job.metadata.campaignName
                    : job.subject || "Untitled campaign";

                return (
                  <li
                    key={job.id}
                    className={`admin-surface rounded-xl p-3 ${
                      selectedJobId === job.id ? "ring-1 ring-amber-300/60" : ""
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="font-medium">{campaignName}</p>
                      <span className={`rounded-full px-2 py-0.5 text-xs ${statusBadgeClasses(job.status)}`}>
                        {formatStatus(job.status)}
                      </span>
                    </div>

                    <p className="mt-1 text-xs opacity-75">
                      {businessName} · {job.channel.toUpperCase()} · audience {job.audience}
                    </p>
                    <p className="mt-1 text-xs opacity-70">
                      Attempts {job.attempts}/{job.maxAttempts} · Created {new Date(job.createdAt).toLocaleString()}
                    </p>

                    {job.lastError ? (
                      <p className="mt-1 text-xs text-red-300/90">Last error: {job.lastError}</p>
                    ) : null}

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => void loadJobAudit(job.id)}
                        className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5"
                      >
                        {loadingAudit && selectedJobId === job.id ? "Loading..." : "View Audit"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void retryJob(job.id)}
                        disabled={busyAction === `retry-${job.id}` || job.status === "sent"}
                        className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5 disabled:opacity-60"
                      >
                        {busyAction === `retry-${job.id}` ? "Retrying..." : "Retry"}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="admin-card space-y-3 p-4 md:p-5">
        <h3 className="text-base font-semibold">Selected Delivery Timeline</h3>

        {!selectedJobId ? (
          <p className="text-sm opacity-70">Pick a delivery from history to inspect provider attempts and retries.</p>
        ) : jobAudit.length === 0 ? (
          <p className="text-sm opacity-70">No audit entries for this delivery yet.</p>
        ) : (
          <ul className="space-y-2">
            {jobAudit.map((entry) => (
              <li key={entry.id} className="admin-surface rounded-xl p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{entry.event.replace(/_/g, " ").toUpperCase()}</p>
                  <span className="text-xs opacity-70">{new Date(entry.createdAt).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-xs opacity-80">
                  {entry.channel.toUpperCase()} · provider {entry.provider ?? "-"}
                  {entry.attempt !== null ? ` · attempt ${entry.attempt}` : ""}
                </p>
                <p className="mt-1 text-xs opacity-85">{entry.message}</p>
                {entry.detail ? (
                  <p className="mt-1 text-xs opacity-70">{stringifyDetail(entry.detail)}</p>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
