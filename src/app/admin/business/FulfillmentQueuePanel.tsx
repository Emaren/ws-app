import {
  assigneeLabel,
  centsToDollars,
  customerLabel,
  dueLabel,
  formatStatusLabel,
  itemLabel,
  leadStatusBadge,
  normalizePhoneForTel,
  type DeliveryLeadRecord,
} from "./fulfillmentConsoleSupport";

type FulfillmentQueuePanelProps = {
  loading: boolean;
  leads: DeliveryLeadRecord[];
  selectedLeadId: string | null;
  totalLeads: number;
  onSelectLead: (leadId: string) => void;
};

export function FulfillmentQueuePanel({
  loading,
  leads,
  selectedLeadId,
  totalLeads,
  onSelectLead,
}: FulfillmentQueuePanelProps) {
  return (
    <div className="admin-card space-y-3 p-4 md:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Lead Queue</h3>
        <span className="rounded-full border border-white/20 px-2 py-0.5 text-xs opacity-80">
          {totalLeads} total
        </span>
      </div>

      {loading ? (
        <p className="text-sm opacity-70">Loading leads...</p>
      ) : leads.length === 0 ? (
        <p className="text-sm opacity-70">No leads found for these filters.</p>
      ) : (
        <ul className="max-h-[560px] space-y-3 overflow-auto pr-1">
          {leads.map((lead) => {
            const phone = lead.recipient?.phone?.trim() || "";
            const callHref = phone ? `tel:${normalizePhoneForTel(phone)}` : "";

            return (
              <li
                key={lead.id}
                className={`admin-surface rounded-xl p-3 ${
                  selectedLeadId === lead.id ? "ring-1 ring-amber-300/60" : ""
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-medium">{customerLabel(lead)}</p>
                    <p className="mt-0.5 text-xs opacity-75">{lead.business.name}</p>
                  </div>
                  <span className={`rounded-full px-2 py-0.5 text-xs ${leadStatusBadge(lead.status)}`}>
                    {formatStatusLabel(lead.status)}
                  </span>
                </div>

                <p className="mt-1 text-xs opacity-80">{itemLabel(lead)}</p>
                <p className="mt-1 text-xs opacity-70">
                  Qty {lead.requestedQty} · {centsToDollars(lead.totalCents)} ·{" "}
                  {new Date(lead.requestedAt).toLocaleString()}
                </p>
                <p className="mt-1 text-xs opacity-70">
                  Owner: {assigneeLabel(lead)} · {dueLabel(lead)}
                </p>
                <p className="mt-1 line-clamp-2 text-xs opacity-70">
                  {lead.deliveryAddress || "No address"}
                </p>

                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => onSelectLead(lead.id)}
                    className="rounded-lg border px-2 py-1.5 text-xs transition hover:bg-white/5"
                  >
                    {selectedLeadId === lead.id ? "Selected" : "Open"}
                  </button>

                  {callHref ? (
                    <a
                      href={callHref}
                      className="rounded-lg border px-2 py-1.5 text-center text-xs transition hover:bg-white/5"
                    >
                      Tap to Call
                    </a>
                  ) : (
                    <span className="rounded-lg border px-2 py-1.5 text-center text-xs opacity-50">
                      No phone
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
