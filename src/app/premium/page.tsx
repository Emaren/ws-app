// src/app/premium/page.tsx
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/authOptions";
import CheckoutButton from "@/components/premium/CheckoutButton";
import { prisma } from "@/lib/prisma";
import {
  entitlementHasPremiumAccess,
  getUserEntitlementByIdentity,
} from "@/lib/billing/entitlements";

function formatPeriod(value: Date | null | undefined): string {
  if (!value) return "n/a";
  return value.toLocaleDateString();
}

export default async function PremiumPage() {
  const session = await getServerSession(authOptions);
  const entitlement =
    session?.user
      ? await getUserEntitlementByIdentity(prisma, {
          userExternalId: session.user.id,
          userEmail: session.user.email ?? undefined,
        })
      : null;

  const hasAccess = entitlementHasPremiumAccess(entitlement);

  return (
    <main className="ws-container">
      <div className="ws-article">
        <header className="mb-6 md:mb-8">
          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight">
            Premium — Wheat &amp; Stone
          </h1>
          <p className="mt-2 opacity-75">
            Support independent, local-first reviews and get member perks.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-[minmax(0,720px)] justify-center">
          <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 md:p-8 bg-black/5 dark:bg:white/5 dark:bg-white/5">
            <div className="flex items-baseline gap-3">
              <div className="text-4xl font-bold">$9</div>
              <div className="opacity-70">/ month</div>
            </div>

            <ul className="mt-5 space-y-3 text-sm leading-relaxed">
              <li>• Member-only picks & deep dives</li>
              <li>• Early access to ratings & guides</li>
              <li>• Comment perks and future Discord role</li>
              <li>• Directly supports Alberta-made work</li>
            </ul>

            {!session ? (
              <div className="mt-6 flex items-center gap-4">
                <Link
                  href="/login"
                  className="underline underline-offset-4 opacity-90 hover:opacity-100 cursor-pointer"
                >
                  Login
                </Link>
                <Link
                  href="/register"
                  className="underline underline-offset-4 opacity-90 hover:opacity-100 cursor-pointer"
                >
                  Create an account
                </Link>
              </div>
            ) : (
              <div className="mt-6">
                {hasAccess ? (
                  <div className="rounded-xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-3 text-sm">
                    <p className="font-medium text-emerald-100">Premium access active</p>
                    <p className="mt-1 text-emerald-100/85">
                      Plan: {entitlement?.plan ?? "PREMIUM"} • Status:{" "}
                      {entitlement?.status ?? "ACTIVE"} • Renews through{" "}
                      {formatPeriod(entitlement?.currentPeriodEnd)}
                    </p>
                  </div>
                ) : (
                  <>
                    <CheckoutButton />
                    <p className="mt-3 text-xs opacity-70">
                      You’ll be redirected to secure checkout. Cancel anytime.
                    </p>
                    {entitlement ? (
                      <p className="mt-2 text-xs opacity-60">
                        Last entitlement: {entitlement.plan} / {entitlement.status}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
