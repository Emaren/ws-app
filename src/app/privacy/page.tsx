import type { Metadata } from "next";
import Link from "next/link";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Privacy Policy | Wheat & Stone",
  description:
    "How Wheat & Stone handles account data, analytics, social login details, and review platform operations.",
};

export default function PrivacyPage() {
  return (
    <LegalPageLayout
      eyebrow="Privacy"
      title="Privacy Policy"
      summary="Wheat & Stone keeps the account, review, and onboarding data needed to run the platform, protect accounts, and support local commerce operations."
      updatedLabel="Updated March 18, 2026"
    >
      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">What We Collect</h2>
        <p>
          We collect the details you give us directly, including your name, email address,
          password hash, account role, profile preferences, and anything you submit through review,
          business, commerce, or contributor tools.
        </p>
        <p>
          If you use Google or Facebook sign-in, we receive the basic identity data provided by the
          provider for account access, usually your email address, profile name, and provider user
          identifier. We do not receive your private messages or your full social profile history.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">How We Use It</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Authenticate users and keep accounts secure.</li>
          <li>Run reviews, reactions, offers, notifications, and contributor workflows.</li>
          <li>Support business dashboards, delivery leads, and premium features.</li>
          <li>Measure performance and onboarding quality through product analytics.</li>
        </ul>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">Analytics, Cookies, and Device Signals</h2>
        <p>
          Wheat & Stone uses first-party application cookies and session tokens to keep you signed
          in, remember preferences, and run secure flows such as password recovery. We also use
          privacy-focused site analytics to understand page visits, navigation, and onboarding
          conversion without selling your personal information.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">Data Sharing</h2>
        <p>
          We share data only when it is necessary to run the platform, complete payments, deliver
          email or notification workflows, or support connected login providers. We do not sell
          personal information to data brokers.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">Retention and Deletion</h2>
        <p>
          We retain account and operational records for as long as needed to run the service,
          support audits, prevent abuse, and honor contributor or commerce obligations. You can
          request account deletion or personal-data removal through our{" "}
          <Link href="/data-deletion" className="underline underline-offset-4">
            Data Deletion
          </Link>{" "}
          page.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">Contact</h2>
        <p>
          Privacy questions and deletion requests can be sent to{" "}
          <a className="underline underline-offset-4" href="mailto:info@wheatandstone.ca">
            info@wheatandstone.ca
          </a>
          .
        </p>
      </section>
    </LegalPageLayout>
  );
}
