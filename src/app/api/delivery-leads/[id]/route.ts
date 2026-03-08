import type { DeliveryLeadStatus, Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { businessScopeWhere, requireCommerceManagerAuth } from "@/app/api/admin/commerce/_shared";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

const DELIVERY_LEAD_STATUS_VALUES: readonly DeliveryLeadStatus[] = [
  "NEW",
  "CONTACTED",
  "RESERVED",
  "FULFILLED",
  "CANCELLED",
  "EXPIRED",
];

function parseStatus(value: unknown): DeliveryLeadStatus | null {
  if (typeof value !== "string") {
    return null;
  }

  const upper = value.trim().toUpperCase();
  if ((DELIVERY_LEAD_STATUS_VALUES as readonly string[]).includes(upper)) {
    return upper as DeliveryLeadStatus;
  }

  return null;
}

function appendStatusNote(existing: string | null, note: string, timestamp: string): string {
  const cleanNote = note.trim();
  if (!cleanNote) {
    return existing ?? "";
  }

  const entry = `[${timestamp}] ${cleanNote}`;
  if (!existing?.trim()) {
    return entry;
  }

  return `${existing.trim()}\n\n${entry}`;
}

function parseOptionalDate(value: unknown): Date | null | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  if (typeof value !== "string") {
    throw new Error("fulfillBy must be a valid date");
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = new Date(trimmed);
  if (!Number.isFinite(parsed.getTime())) {
    throw new Error("fulfillBy must be a valid date");
  }

  return parsed;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const auth = await requireCommerceManagerAuth(req);
  if (auth instanceof NextResponse) {
    return auth;
  }

  const { id } = await params;
  const leadId = id.trim();
  if (!leadId) {
    return NextResponse.json({ message: "Lead id is required" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ message: "Invalid request body" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const nextStatus = parseStatus(payload.status);
  const note = typeof payload.note === "string" ? payload.note.trim() : "";
  const scopeWhere = businessScopeWhere(auth);

  let fulfillBy: Date | null | undefined;
  try {
    fulfillBy = parseOptionalDate(payload.fulfillBy);
  } catch (error) {
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Invalid fulfillBy" },
      { status: 400 },
    );
  }

  const assignmentRequested = Object.prototype.hasOwnProperty.call(payload, "assignedToUserId");
  const assignedToUserIdRaw =
    typeof payload.assignedToUserId === "string" ? payload.assignedToUserId.trim() : payload.assignedToUserId;
  const assignedToUserId =
    assignedToUserIdRaw === null || assignedToUserIdRaw === "" ? null : assignedToUserIdRaw;

  if (!nextStatus && !note && !assignmentRequested && fulfillBy === undefined) {
    return NextResponse.json(
      { message: "Provide a valid status, note, assignment, or fulfill-by value" },
      { status: 400 },
    );
  }

  const existing = await prisma.deliveryLead.findFirst({
    where: {
      id: leadId,
      business: scopeWhere,
    },
    select: {
      id: true,
      notes: true,
      assignedToUserId: true,
      assignedToName: true,
      assignedAt: true,
      fulfillBy: true,
      contactedAt: true,
      fulfilledAt: true,
      cancelledAt: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Lead not found" }, { status: 404 });
  }

  const now = new Date();
  const updatePatch: Prisma.DeliveryLeadUncheckedUpdateInput = {};
  const autoNotes: string[] = [];

  if (nextStatus) {
    updatePatch.status = nextStatus;

    if (nextStatus === "CONTACTED" && !existing.contactedAt) {
      updatePatch.contactedAt = now;
    }

    if (nextStatus === "FULFILLED" && !existing.fulfilledAt) {
      updatePatch.fulfilledAt = now;
    }

    if (nextStatus === "CANCELLED" && !existing.cancelledAt) {
      updatePatch.cancelledAt = now;
    }
  }

  if (assignmentRequested) {
    if (assignedToUserId === null) {
      updatePatch.assignedToUserId = null;
      updatePatch.assignedToName = null;
      updatePatch.assignedAt = null;

      if (existing.assignedToUserId) {
        autoNotes.push("Assignment cleared.");
      }
    } else if (typeof assignedToUserId === "string") {
      const assignee = await prisma.user.findFirst({
        where: {
          id: assignedToUserId,
          role: {
            in: ["OWNER", "ADMIN", "EDITOR"],
          },
        },
        select: {
          id: true,
          name: true,
          email: true,
        },
      });

      if (!assignee) {
        return NextResponse.json(
          { message: "Assigned operator was not found" },
          { status: 400 },
        );
      }

      const assigneeName = assignee.name?.trim() || assignee.email;
      updatePatch.assignedToUserId = assignee.id;
      updatePatch.assignedToName = assigneeName;
      updatePatch.assignedAt =
        existing.assignedToUserId === assignee.id ? existing.assignedAt ?? now : now;

      if (existing.assignedToUserId !== assignee.id) {
        autoNotes.push(`Assigned to ${assigneeName}.`);
      }
    } else {
      return NextResponse.json({ message: "assignedToUserId must be a string or null" }, { status: 400 });
    }
  }

  if (fulfillBy !== undefined) {
    updatePatch.fulfillBy = fulfillBy;
    autoNotes.push(
      fulfillBy
        ? `Fulfillment target set for ${fulfillBy.toISOString()}.`
        : "Fulfillment target cleared.",
    );
  }

  const combinedNote = [note, ...autoNotes].filter(Boolean).join("\n");
  if (combinedNote) {
    const nextNotes = appendStatusNote(existing.notes, combinedNote, now.toISOString());
    updatePatch.notes = nextNotes.slice(0, 2400);
  }

  const updated = await prisma.deliveryLead.update({
    where: { id: leadId },
    data: updatePatch,
    select: {
      id: true,
      status: true,
      assignedToUserId: true,
      assignedAt: true,
      assignedToName: true,
      fulfillBy: true,
      requestedAt: true,
      contactedAt: true,
      fulfilledAt: true,
      cancelledAt: true,
      updatedAt: true,
      notes: true,
    },
  });

  return NextResponse.json(updated);
}
