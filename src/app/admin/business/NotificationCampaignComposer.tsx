"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { NotificationCampaignComposePanel } from "./NotificationCampaignComposePanel";
import { NotificationCampaignHistoryPanels } from "./NotificationCampaignHistoryPanels";
import { NotificationCampaignOverviewPanels } from "./NotificationCampaignOverviewPanels";
import {
  browserPushSupported,
  buildNotificationJobStats,
  createCampaignForm,
  encodeWebPushAudience,
  requestJson,
  resolveAudience,
  toIsoDate,
  urlBase64ToArrayBuffer,
  type BusinessRecord,
  type CampaignFormState,
  type HistoryFilterState,
  type NotificationAuditLogRecord,
  type NotificationJobRecord,
  type ProcessQueueResult,
  type PushPermissionState,
} from "./notificationCampaignSupport";

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
  const [pushBusy, setPushBusy] = useState(false);
  const [pushPermission, setPushPermission] =
    useState<PushPermissionState>("unsupported");
  const [pushAudienceToken, setPushAudienceToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const jobStats = useMemo(() => buildNotificationJobStats(jobs), [jobs]);

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

  useEffect(() => {
    if (!browserPushSupported()) {
      setPushPermission("unsupported");
      return;
    }

    setPushPermission(Notification.permission);

    let cancelled = false;
    const loadSubscription = async () => {
      try {
        const registration =
          (await navigator.serviceWorker.getRegistration()) ??
          (await navigator.serviceWorker.register("/sw.js"));
        const subscription = await registration.pushManager.getSubscription();
        const audienceToken = encodeWebPushAudience(subscription?.toJSON() ?? null);

        if (cancelled || !audienceToken) return;
        setPushAudienceToken(audienceToken);
      } catch {
        // no-op: subscription capture is optional
      }
    };

    void loadSubscription();

    return () => {
      cancelled = true;
    };
  }, []);

  async function subscribeBrowserForPush() {
    setError(null);
    setNotice(null);

    if (!browserPushSupported()) {
      setPushPermission("unsupported");
      setError("This browser does not support web push.");
      return;
    }

    const vapidPublicKey = process.env.NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY?.trim() ?? "";
    if (!vapidPublicKey) {
      setError("NEXT_PUBLIC_WEB_PUSH_PUBLIC_KEY is not configured for web push.");
      return;
    }

    if (Notification.permission === "denied") {
      setPushPermission("denied");
      setError("Browser notifications are blocked. Enable notifications in site settings.");
      return;
    }

    try {
      setPushBusy(true);
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      setPushPermission(permission);
      if (permission !== "granted") {
        throw new Error("Notification permission was not granted.");
      }

      const registration =
        (await navigator.serviceWorker.getRegistration()) ??
        (await navigator.serviceWorker.register("/sw.js"));

      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToArrayBuffer(vapidPublicKey),
        });
      }

      const encodedAudience = encodeWebPushAudience(subscription.toJSON());
      if (!encodedAudience) {
        throw new Error("Browser returned an invalid push subscription.");
      }

      setPushAudienceToken(encodedAudience);
      setForm((prev) => ({
        ...prev,
        channel: "push",
        audienceMode: "direct",
        audienceValue: encodedAudience,
      }));
      setNotice("Browser push subscription captured and direct audience prefilled.");
    } catch (subscribeError) {
      setError(
        subscribeError instanceof Error ? subscribeError.message : String(subscribeError),
      );
    } finally {
      setPushBusy(false);
    }
  }

  async function unsubscribeBrowserPush() {
    setError(null);
    setNotice(null);

    if (!browserPushSupported()) {
      setPushPermission("unsupported");
      return;
    }

    try {
      setPushBusy(true);
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
      }

      setPushAudienceToken("");
      setForm((prev) => {
        if (prev.audienceValue !== pushAudienceToken) {
          return prev;
        }
        return {
          ...prev,
          audienceValue: "",
        };
      });
      setNotice("Browser push subscription removed.");
    } catch (unsubscribeError) {
      setError(
        unsubscribeError instanceof Error ? unsubscribeError.message : String(unsubscribeError),
      );
    } finally {
      setPushBusy(false);
    }
  }

  async function submitCampaign(event: FormEvent<HTMLFormElement>) {
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
      if (
        form.channel === "push" &&
        form.audienceMode === "direct" &&
        !audience.startsWith("webpush:") &&
        !audience.startsWith("{")
      ) {
        throw new Error(
          'Push direct target must be a browser subscription token. Use "Use this browser subscription".',
        );
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
        form.channel === "email" ? form.subject.trim() || campaignName : undefined;

      const metadata: Record<string, unknown> = {
        campaignName,
        sendMode: form.sendMode,
        audienceMode: form.audienceMode,
        source: "ws-app-admin-business",
      };
      if (scheduledForIso) {
        metadata.scheduledFor = scheduledForIso;
      }
      if (form.channel === "push") {
        const fallbackEmail = form.fallbackEmailAudience.trim();
        const fallbackSms = form.fallbackSmsAudience.trim();
        if (fallbackEmail || fallbackSms) {
          metadata.fallback = {
            ...(fallbackEmail ? { emailAudience: fallbackEmail } : {}),
            ...(fallbackSms ? { smsAudience: fallbackSms } : {}),
          };
        }
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
      <NotificationCampaignOverviewPanels
        businesses={businesses}
        selectedBusinessId={selectedBusinessId}
        loadingBusinesses={loadingBusinesses}
        loadingHistory={loadingHistory}
        busyAction={busyAction}
        error={error}
        notice={notice}
        jobStats={jobStats}
        onSelectBusiness={(nextBusinessId) => {
          setSelectedBusinessId(nextBusinessId);
          setForm((prev) => ({ ...prev, businessId: nextBusinessId }));
          setSelectedJobId(null);
          setJobAudit([]);
        }}
        onReload={async () => {
          await loadBusinesses();
          await loadHistory();
        }}
      />

      <div className="grid gap-4 xl:grid-cols-2">
        <NotificationCampaignComposePanel
          form={form}
          setForm={setForm}
          selectedBusinessId={selectedBusinessId}
          loadingBusinesses={loadingBusinesses}
          loadingHistory={loadingHistory}
          busyAction={busyAction}
          pushBusy={pushBusy}
          pushPermission={pushPermission}
          pushAudienceToken={pushAudienceToken}
          onSubmit={submitCampaign}
          onProcessQueueNow={processQueueNow}
          onSubscribeBrowserForPush={subscribeBrowserForPush}
          onUnsubscribeBrowserPush={unsubscribeBrowserPush}
        />

        <NotificationCampaignHistoryPanels
          businesses={businesses}
          jobs={jobs}
          jobAudit={jobAudit}
          selectedJobId={selectedJobId}
          loadingHistory={loadingHistory}
          loadingAudit={loadingAudit}
          busyAction={busyAction}
          historyFilter={historyFilter}
          onHistoryFilterChange={setHistoryFilter}
          onRefreshHistory={loadHistory}
          onLoadJobAudit={loadJobAudit}
          onRetryJob={retryJob}
        />
      </div>
    </section>
  );
}
