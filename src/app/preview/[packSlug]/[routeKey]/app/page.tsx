import { notFound } from "next/navigation";
import ExperiencePreviewSurface from "@/components/experience/ExperiencePreviewSurface";
import { findExperiencePreviewByPackAndRoute } from "@/lib/experienceStudioServer";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = {
  robots: {
    index: false,
    follow: false,
  },
};

export default async function ExperiencePreviewAppPage(
  props: { params: Promise<{ packSlug: string; routeKey: string }> },
) {
  const { packSlug, routeKey } = await props.params;
  const preview = await findExperiencePreviewByPackAndRoute({ packSlug, routeKey });

  if (!preview) {
    notFound();
  }

  return <ExperiencePreviewSurface preview={preview} routeKey={routeKey} mode="immersive" />;
}
