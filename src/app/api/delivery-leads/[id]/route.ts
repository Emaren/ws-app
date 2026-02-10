import type { DeliveryLeadStatus, Prisma } from "@prisma/client";
import { NextResponse, type NextRequest } from "next/server";
import { getApiAuthContext } from "@/lib/apiAuth";
import { prisma } from "@/lib/prisma";
import { hasAnyRole, RBAC_ROLE_GROUPS } from "@/lib/rbac";

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

async function requireStaff(req: NextRequest): Promise<NextResponse | null> {
  const auth = await getApiAuthContext(req);
  const isStaff = hasAnyRole(auth.role, RBAC_ROLE_GROUPS.staff);

  if (!auth.token || !isStaff) {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  return null;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const forbiddenResponse = await requireStaff(req);
  if (forbiddenResponse) {
    return forbiddenResponse;
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

  if (!nextStatus && !note) {
    return NextResponse.json(
      { message: "Provide a valid status or note" },
      { status: 400 },
    );
  }

  const existing = await prisma.deliveryLead.findUnique({
    where: { id: leadId },
    select: {
      id: true,
      notes: true,
      contactedAt: true,
      fulfilledAt: true,
      cancelledAt: true,
    },
  });

  if (!existing) {
    return NextResponse.json({ message: "Lead not found" }, { status: 404 });
  }

  const now = new Date();
  const updatePatch: Prisma.DeliveryLeadUpdateInput = {};

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

  if (note) {
    const nextNotes = appendStatusNote(existing.notes, note, now.toISOString());
    updatePatch.notes = nextNotes.slice(0, 2400);
  }

  const updated = await prisma.deliveryLead.update({
    where: { id: leadId },
    data: updatePatch,
    select: {
      id: true,
      status: true,
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
