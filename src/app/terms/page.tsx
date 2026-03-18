import type { Metadata } from "next";
import Link from "next/link";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Terms of Service | Wheat & Stone",
  description:
    "The terms that govern Wheat & Stone accounts, reviews, business dashboards, and token-powered platform participation.",
};

export default function TermsPage() {
  return (
    <LegalPageLayout
      eyebrow="Terms"
      title="Terms of Service"
      summary="These terms govern access to Wheat & Stone, including public reading, account creation, business dashboards, contributor participation, and token-related platform features."
      updatedLabel="Updated March 18, 2026"
    >
      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">Using the Service</h2>
        <p>
          By using Wheat & Stone, you agree to use the site lawfully, keep your account secure, and
          avoid abusive, misleading, or fraudulent behavior. You are responsible for activity that
          happens through your account.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">Accounts and Access</h2>
        <p>
          You may register with email/password or supported social login providers. We can suspend
          or remove accounts that violate platform rules, create security risk, impersonate others,
          or disrupt editorial or commerce operations.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">Reviews, Business Pages, and Contributions</h2>
        <p>
          Content submitted to Wheat & Stone must be accurate to the best of your knowledge and
          must not infringe on the rights of others. Businesses remain responsible for the accuracy
          of their own listings, dashboards, pricing, offers, and fulfillment information.
        </p>
        <p>
          Contributor compensation, business incentives, and community rewards may involve platform
          points, off-chain ledgers, or future token settlement flows. Those mechanics can evolve as
          the product matures.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">No Medical Advice</h2>
        <p>
          Wheat & Stone publishes reviews, commentary, and marketplace information. It is not a
          substitute for professional medical advice, diagnosis, or treatment.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">Availability and Changes</h2>
        <p>
          We may modify, improve, pause, or remove parts of the service as we continue building the
          platform. We may also update these terms to reflect new features, legal obligations, or
          operational changes.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">Privacy and Contact</h2>
        <p>
          Your use of the service is also governed by our{" "}
          <Link href="/privacy" className="underline underline-offset-4">
            Privacy Policy
          </Link>
          . Questions about these terms can be sent to{" "}
          <a className="underline underline-offset-4" href="mailto:info@wheatandstone.ca">
            info@wheatandstone.ca
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
