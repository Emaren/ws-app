import type { Dispatch, SetStateAction } from "react";
import {
  LEAD_STATUSES,
  assigneeLabel,
  customerLabel,
  dueLabel,
  formatNotificationStatus,
  formatStatusLabel,
  itemLabel,
  notificationStatusBadge,
  type DeliveryLeadRecord,
  type DeliveryLeadStatus,
  type OperatorRecord,
  type TimelineEntry,
} from "./fulfillmentConsoleSupport";

type FulfillmentDetailPanelsProps = {
  selectedLead: DeliveryLeadRecord | null;
  operators: OperatorRecord[];
  viewerUserId: string | null;
  selectedAssigneeId: string;
  setSelectedAssigneeId: Dispatch<SetStateAction<string>>;
  selectedStatus: DeliveryLeadStatus;
  setSelectedStatus: Dispatch<SetStateAction<DeliveryLeadStatus>>;
  fulfillByInput: string;
  setFulfillByInput: Dispatch<SetStateAction<string>>;
  statusNote: string;
  setStatusNote: Dispatch<SetStateAction<string>>;
  notifyMessage: string;
  setNotifyMessage: Dispatch<SetStateAction<string>>;
  busyAction: string | null;
  timeline: TimelineEntry[];
  timelineLoading: boolean;
  onSaveLeadStatus: () => void | Promise<void>;
  onClaimLead: () => void | Promise<void>;
  onClearLeadOwner: () => void | Promise<void>;
  onNotifyCustomer: (channel: "email" | "sms") => void | Promise<void>;
};

export function FulfillmentDetailPanels({
  selectedLead,
  operators,
  viewerUserId,
  selectedAssigneeId,
  setSelectedAssigneeId,
  selectedStatus,
  setSelectedStatus,
  fulfillByInput,
  setFulfillByInput,
  statusNote,
  setStatusNote,
  notifyMessage,
  setNotifyMessage,
  busyAction,
  timeline,
  timelineLoading,
  onSaveLeadStatus,
  onClaimLead,
  onClearLeadOwner,
  onNotifyCustomer,
}: FulfillmentDetailPanelsProps) {
  return (
    <div className="space-y-4">
      <div className="admin-card space-y-4 p-4 md:p-5">
        <h3 className="text-base font-semibold">Lead Detail and Actions</h3>

        {!selectedLead ? (
          <p className="text-sm opacity-70">Select a lead to manage status and customer outreach.</p>
        ) : (
          <>
            <div className="admin-surface rounded-xl p-3 text-sm">
              <p className="font-medium">{customerLabel(selectedLead)}</p>
              <p className="mt-1 opacity-75">{itemLabel(selectedLead)}</p>
              <p className="mt-1 text-xs opacity-70">{selectedLead.business.name}</p>
              <p className="mt-1 text-xs opacity-70">
                Email: {selectedLead.recipient?.email || "-"} · Phone:{" "}
                {selectedLead.recipient?.phone || "-"}
              </p>
              <p className="mt-1 text-xs opacity-70">
                Owner: {assigneeLabel(selectedLead)} · {dueLabel(selectedLead)}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <label className="space-y-1 text-sm">
                <span>Owner</span>
                <select
                  value={selectedAssigneeId}
                  onChange={(event) => setSelectedAssigneeId(event.target.value)}
                  className="admin-surface w-full rounded-xl px-3 py-2"
                >
                  <option value="">Unassigned</option>
                  {operators.map((operator) => (
                    <option key={operator.id} value={operator.id}>
                      {operator.name} · {operator.role}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span>Status</span>
                <select
                  value={selectedStatus}
                  onChange={(event) =>
                    setSelectedStatus(event.target.value as DeliveryLeadStatus)
                  }
                  className="admin-surface w-full rounded-xl px-3 py-2"
                >
                  {LEAD_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {formatStatusLabel(status)}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1 text-sm">
                <span>Fulfill by</span>
                <input
                  type="datetime-local"
                  value={fulfillByInput}
                  onChange={(event) => setFulfillByInput(event.target.value)}
                  className="admin-surface w-full rounded-xl px-3 py-2"
                />
              </label>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              <button
                type="button"
                onClick={() => void onSaveLeadStatus()}
                disabled={busyAction !== null}
                className="rounded-xl border border-amber-300/40 bg-amber-200/20 px-4 py-2 text-sm font-medium transition hover:bg-amber-200/30 disabled:opacity-60"
              >
                {busyAction === "status-save" ? "Saving..." : "Save Workflow"}
              </button>
              <button
                type="button"
                onClick={() => void onClaimLead()}
                disabled={busyAction !== null || !viewerUserId}
                className="rounded-xl border px-4 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
              >
                {busyAction === "claim-lead" ? "Claiming..." : "Claim Lead"}
              </button>
              <button
                type="button"
                onClick={() => void onClearLeadOwner()}
                disabled={busyAction !== null}
                className="rounded-xl border px-4 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
              >
                {busyAction === "clear-owner" ? "Clearing..." : "Clear Owner"}
              </button>
            </div>

            <div className="grid gap-2 text-xs opacity-75 sm:grid-cols-3">
              <p>
                Assigned{" "}
                {selectedLead.assignedAt
                  ? new Date(selectedLead.assignedAt).toLocaleString()
                  : "not yet"}
              </p>
              <p>Requested {new Date(selectedLead.requestedAt).toLocaleString()}</p>
              <p>{selectedLead.notes ? "Lead has internal notes" : "No internal notes yet"}</p>
            </div>

            <label className="space-y-1 text-sm">
              <span>Status note (optional)</span>
              <textarea
                value={statusNote}
                onChange={(event) => setStatusNote(event.target.value)}
                className="admin-surface min-h-[74px] w-full rounded-xl px-3 py-2"
                placeholder="Internal note for this status change"
              />
            </label>

            <label className="space-y-1 text-sm">
              <span>Notification message</span>
              <textarea
                value={notifyMessage}
                onChange={(event) => setNotifyMessage(event.target.value)}
                className="admin-surface min-h-[96px] w-full rounded-xl px-3 py-2"
                placeholder="Customer update message"
              />
            </label>

            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => void onNotifyCustomer("email")}
                disabled={busyAction !== null || !selectedLead.recipient?.email}
                className="rounded-xl border px-4 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
              >
                {busyAction === "notify-email" ? "Sending..." : "Notify by Email"}
              </button>
              <button
                type="button"
                onClick={() => void onNotifyCustomer("sms")}
                disabled={busyAction !== null || !selectedLead.recipient?.phone}
                className="rounded-xl border px-4 py-2 text-sm transition hover:bg-white/5 disabled:opacity-60"
              >
                {busyAction === "notify-sms" ? "Sending..." : "Notify by SMS"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="admin-card space-y-3 p-4 md:p-5">
        <h3 className="text-base font-semibold">Activity Timeline</h3>

        {!selectedLead ? (
          <p className="text-sm opacity-70">Select a lead to inspect timeline events.</p>
        ) : timelineLoading ? (
          <p className="text-sm opacity-70">Loading timeline...</p>
        ) : timeline.length === 0 ? (
          <p className="text-sm opacity-70">No timeline entries yet.</p>
        ) : (
          <ul className="space-y-2">
            {timeline.map((entry) => (
              <li key={entry.id} className="admin-surface rounded-xl p-3 text-sm">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">{entry.title}</p>
                  <span className="text-xs opacity-70">
                    {new Date(entry.at).toLocaleString()}
                  </span>
                </div>

                <p className="mt-1 text-xs opacity-80">{entry.detail}</p>

                <div className="mt-2 flex flex-wrap gap-2 text-xs">
                  <span className="rounded-full border border-white/20 px-2 py-0.5 uppercase opacity-80">
                    {entry.category}
                  </span>
                  {entry.channel ? (
                    <span className="rounded-full border border-white/20 px-2 py-0.5 uppercase opacity-80">
                      {entry.channel}
                    </span>
                  ) : null}
                  {entry.status ? (
                    <span
                      className={`rounded-full px-2 py-0.5 ${notificationStatusBadge(entry.status)}`}
                    >
                      {formatNotificationStatus(entry.status)}
                    </span>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
