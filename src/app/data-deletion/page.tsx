import type { Metadata } from "next";
import LegalPageLayout from "@/components/legal/LegalPageLayout";

export const metadata: Metadata = {
  title: "Data Deletion | Wheat & Stone",
  description:
    "Instructions for requesting deletion of Wheat & Stone account data, including accounts created through Google or Facebook sign-in.",
};

export default function DataDeletionPage() {
  return (
    <LegalPageLayout
      eyebrow="Data Deletion"
      title="User Data Deletion Instructions"
      summary="If you want your Wheat & Stone account data deleted, use the instructions below. This page is suitable for Google and Meta app policy references."
      updatedLabel="Updated March 18, 2026"
    >
      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">How to Request Deletion</h2>
        <ol className="list-decimal space-y-1 pl-5">
          <li>
            Email{" "}
            <a className="underline underline-offset-4" href="mailto:info@wheatandstone.ca">
              info@wheatandstone.ca
            </a>{" "}
            from the address attached to your Wheat & Stone account.
          </li>
          <li>Use the subject line `Delete my Wheat & Stone data`.</li>
          <li>
            Include your account email and, if applicable, note that you signed in with Google or
            Facebook.
          </li>
        </ol>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">What We Delete</h2>
        <p>
          Once we verify the request, we will delete or anonymize the personal account data needed
          to identify you in the product, including profile information and linked social-login
          identifiers, except where records must be retained for fraud prevention, financial
          reconciliation, legal obligations, or unresolved abuse investigations.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold md:text-2xl">Timeline</h2>
        <p>
          We aim to acknowledge deletion requests within 7 days and complete them within 30 days,
          subject to verification and any required retention obligations.
        </p>
      </section>
    </LegalPageLayout>
  );
}
