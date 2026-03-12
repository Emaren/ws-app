export type NotificationJobStatus = "queued" | "processing" | "retrying" | "sent" | "failed";
export type NotificationChannel = "email" | "sms" | "push";
export type NotificationAuditEvent =
  | "queued"
  | "attempt_started"
  | "attempt_succeeded"
  | "attempt_failed"
  | "retry_scheduled"
  | "failed_final"
  | "retry_requested"
  | "fallback_queued";

export type NotificationJobInput = {
  id: string;
  businessId: string;
  channel: NotificationChannel;
  audience: string;
  subject: string | null;
  message: string;
  metadata: Record<string, unknown> | null;
  status: NotificationJobStatus;
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

export type NotificationAuditLogInput = {
  id: string;
  jobId: string;
  event: NotificationAuditEvent;
  channel: NotificationChannel;
  provider: string | null;
  attempt: number | null;
  message: string;
  detail: Record<string, unknown> | null;
  createdAt: string;
};

function parseTimestamp(value: string | null | undefined): number | null {
  if (!value) {
    return null;
  }
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : null;
}

function campaignNameForJob(job: NotificationJobInput): string {
  const metadata =
    job.metadata && !Array.isArray(job.metadata) ? job.metadata : null;
  const metadataCampaignName = metadata?.campaignName;
  if (typeof metadataCampaignName === "string" && metadataCampaignName.trim()) {
    return metadataCampaignName.trim();
  }

  if (job.subject?.trim()) {
    return job.subject.trim();
  }

  const message = job.message.trim();
  if (message.length <= 72) {
    return message || "Untitled notification";
  }

  return `${message.slice(0, 69)}...`;
}

function scheduledForFromMetadata(metadata: Record<string, unknown> | null): string | null {
  const candidate = metadata?.scheduledFor;
  if (typeof candidate !== "string" || !candidate.trim()) {
    return null;
  }

  const normalized = candidate.trim();
  return Number.isFinite(Date.parse(normalized)) ? normalized : null;
}

export function buildNotificationCommandCenterSnapshot(input: {
  generatedAt: string;
  accessTokenPresent: boolean;
  jobs: NotificationJobInput[];
  auditLogs: NotificationAuditLogInput[];
  businessNameById?: Record<string, string>;
  error: string | null;
}) {
  const now = Date.now();
  const businessNameById = input.businessNameById ?? {};

  const jobs = input.jobs.slice().sort((left, right) => {
    return (parseTimestamp(right.createdAt) ?? 0) - (parseTimestamp(left.createdAt) ?? 0);
  });

  const summary = {
    totalJobs: jobs.length,
    queued: jobs.filter((job) => job.status === "queued").length,
    processing: jobs.filter((job) => job.status === "processing").length,
    retrying: jobs.filter((job) => job.status === "retrying").length,
    sent: jobs.filter((job) => job.status === "sent").length,
    failed: jobs.filter((job) => job.status === "failed").length,
    overdue: jobs.filter((job) => {
      if (job.status !== "queued" && job.status !== "retrying") {
        return false;
      }
      const nextAttemptAt = parseTimestamp(job.nextAttemptAt);
      return nextAttemptAt !== null && nextAttemptAt <= now;
    }).length,
    scheduledAhead: jobs.filter((job) => {
      if (job.status !== "queued" && job.status !== "retrying") {
        return false;
      }
      const nextAttemptAt = parseTimestamp(job.nextAttemptAt);
      return nextAttemptAt !== null && nextAttemptAt > now;
    }).length,
    emailJobs: jobs.filter((job) => job.channel === "email").length,
    smsJobs: jobs.filter((job) => job.channel === "sms").length,
    pushJobs: jobs.filter((job) => job.channel === "push").length,
    distinctBusinesses: new Set(jobs.map((job) => job.businessId)).size,
    distinctCampaigns: new Set(jobs.map((job) => campaignNameForJob(job))).size,
    fallbackQueued: input.auditLogs.filter((entry) => entry.event === "fallback_queued").length,
  };

  const providers = [...new Set(jobs.map((job) => job.provider).filter((value): value is string => Boolean(value)))];

  const recentJobs = jobs.slice(0, 8).map((job) => ({
    id: job.id,
    businessId: job.businessId,
    businessName: businessNameById[job.businessId] ?? null,
    campaignName: campaignNameForJob(job),
    channel: job.channel,
    status: job.status,
    provider: job.provider,
    audience: job.audience,
    attempts: job.attempts,
    maxAttempts: job.maxAttempts,
    createdAt: job.createdAt,
    nextAttemptAt: job.nextAttemptAt,
    scheduledFor: scheduledForFromMetadata(job.metadata),
    lastError: job.lastError,
  }));

  const recentFailures = jobs
    .filter((job) => job.status === "failed" || job.lastError)
    .slice(0, 6)
    .map((job) => ({
      id: job.id,
      businessId: job.businessId,
      businessName: businessNameById[job.businessId] ?? null,
      campaignName: campaignNameForJob(job),
      channel: job.channel,
      status: job.status,
      provider: job.provider,
      attempts: job.attempts,
      maxAttempts: job.maxAttempts,
      lastError: job.lastError,
      failedAt: job.failedAt,
      updatedAt: job.updatedAt,
    }));

  const recentAudit = input.auditLogs
    .slice()
    .sort((left, right) => {
      return (parseTimestamp(right.createdAt) ?? 0) - (parseTimestamp(left.createdAt) ?? 0);
    })
    .slice(0, 8)
    .map((entry) => ({
      id: entry.id,
      jobId: entry.jobId,
      event: entry.event,
      channel: entry.channel,
      provider: entry.provider,
      attempt: entry.attempt,
      message: entry.message,
      detail: entry.detail,
      createdAt: entry.createdAt,
    }));

  return {
    generatedAt: input.generatedAt,
    available: !input.error,
    accessTokenPresent: input.accessTokenPresent,
    error: input.error,
    summary,
    providers,
    recentJobs,
    recentFailures,
    recentAudit,
  };
}
