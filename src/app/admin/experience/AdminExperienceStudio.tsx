"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { AdminExperienceSystemPanels } from "../AdminExperienceSystemPanels";
import ExperienceStudioOverviewPanel from "./ExperienceStudioOverviewPanel";
import ExperienceStudioPackManagementPanels from "./ExperienceStudioPackManagementPanels";
import ExperienceStudioPublishingPanels from "./ExperienceStudioPublishingPanels";
import {
  buildImmersivePreviewHref,
  requestJson,
  type StudioPayload,
} from "./experienceStudioSupport";
import type { ExperiencePackStatus } from "@prisma/client";

export default function AdminExperienceStudio() {
  const [payload, setPayload] = useState<StudioPayload | null>(null);
  const [selectedPackId, setSelectedPackId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [packDraft, setPackDraft] = useState({
    name: "",
    slug: "",
    description: "",
    status: "DRAFT" as ExperiencePackStatus,
    isSelectable: false,
    coverImageUrl: "",
  });
  const [uploadDraft, setUploadDraft] = useState({
    experiencePackId: "",
    routeKey: "home",
    title: "",
    notes: "",
    viewportLabel: "desktop",
  });
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [coverUploadTarget, setCoverUploadTarget] = useState<"draft" | "selected" | null>(null);
  const [latestPreview, setLatestPreview] = useState<{
    href: string;
    label: string;
  } | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await requestJson<StudioPayload>("/api/admin/experience/studio", {
        method: "GET",
        cache: "no-store",
      });
      setPayload(data);
      setSelectedPackId((current) => current ?? data.packs[0]?.id ?? null);
      setUploadDraft((current) => ({
        ...current,
        experiencePackId: current.experiencePackId || data.packs[0]?.id || "",
      }));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : String(loadError));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const selectedPack = useMemo(
    () => payload?.packs.find((pack) => pack.id === selectedPackId) ?? null,
    [payload, selectedPackId],
  );

  const routeCatalog = payload?.routeCatalog ?? [];
  const statusCatalog = payload?.statusCatalog ?? [];
  const uploadPack = useMemo(
    () => payload?.packs.find((pack) => pack.id === uploadDraft.experiencePackId) ?? null,
    [payload, uploadDraft.experiencePackId],
  );
  const uploadRoute = useMemo(
    () => routeCatalog.find((route) => route.key === uploadDraft.routeKey) ?? null,
    [routeCatalog, uploadDraft.routeKey],
  );
  const pendingPreviewHref =
    uploadPack && uploadRoute ? `/preview/${uploadPack.slug}/${uploadRoute.key}` : null;

  const updateSelectedPack = (
    next: Partial<{
      name: string;
      description: string | null;
      coverImageUrl: string | null;
      status: ExperiencePackStatus;
      isSelectable: boolean;
    }>,
  ) => {
    if (!selectedPack) {
      return;
    }
    setPayload((current) =>
      current
        ? {
            ...current,
            packs: current.packs.map((pack) =>
              pack.id === selectedPack.id ? { ...pack, ...next } : pack,
            ),
          }
        : current,
    );
  };

  const createPack = () => {
    startTransition(async () => {
      try {
        setError(null);
        setNotice(null);
        await requestJson("/api/admin/experience/packs", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify(packDraft),
        });
        setNotice("Experience pack created.");
        setPackDraft({
          name: "",
          slug: "",
          description: "",
          status: "DRAFT",
          isSelectable: false,
          coverImageUrl: "",
        });
        await load();
      } catch (createError) {
        setError(createError instanceof Error ? createError.message : String(createError));
      }
    });
  };

  const uploadCoverImage = (file: File, target: "draft" | "selected") => {
    startTransition(async () => {
      try {
        setError(null);
        setNotice(null);
        setCoverUploadTarget(target);

        const formData = new FormData();
        formData.set("packSlug", target === "draft" ? packDraft.slug || packDraft.name : selectedPack?.slug || selectedPack?.name || "");
        formData.set("file", file);

        const uploaded = await requestJson<{
          imageUrl: string;
          originalFilename: string | null;
          fileSizeBytes: number;
        }>("/api/admin/experience/assets", {
          method: "POST",
          body: formData,
        });

        if (target === "draft") {
          setPackDraft((current) => ({
            ...current,
            coverImageUrl: uploaded.imageUrl,
          }));
        } else {
          updateSelectedPack({
            coverImageUrl: uploaded.imageUrl,
          });
        }

        setNotice("Cover image uploaded.");
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
      } finally {
        setCoverUploadTarget(null);
      }
    });
  };

  const saveSelectedPack = () => {
    if (!selectedPack) {
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        setNotice(null);
        const currentPack = payload?.packs.find((pack) => pack.id === selectedPack.id);
        if (!currentPack) {
          return;
        }

        await requestJson(`/api/admin/experience/packs/${selectedPack.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json",
          },
          body: JSON.stringify({
            name: currentPack.name,
            description: currentPack.description ?? "",
            coverImageUrl: currentPack.coverImageUrl ?? "",
            status: currentPack.status,
            isSelectable: currentPack.isSelectable,
          }),
        });
        setNotice("Experience pack updated.");
        await load();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : String(saveError));
      }
    });
  };

  const uploadMockup = () => {
    if (!uploadDraft.experiencePackId || !uploadFile) {
      setError("Choose a pack and a PNG/JPG/WEBP file first.");
      return;
    }

    startTransition(async () => {
      try {
        setError(null);
        setNotice(null);

        const formData = new FormData();
        formData.set("experiencePackId", uploadDraft.experiencePackId);
        formData.set("routeKey", uploadDraft.routeKey);
        formData.set("title", uploadDraft.title || uploadDraft.routeKey);
        formData.set("notes", uploadDraft.notes);
        formData.set("viewportLabel", uploadDraft.viewportLabel);
        formData.set("file", uploadFile);

        const response = await requestJson<{
          pack: StudioPayload["packs"][number];
          page: StudioPayload["packs"][number]["pages"][number] | null;
        }>("/api/admin/experience/pages", {
          method: "POST",
          body: formData,
        });

        if (response.page?.previewHref) {
          setLatestPreview({
            href: response.page.previewHref,
            label: `${response.page.routeLabel} preview`,
          });
        } else {
          setLatestPreview(null);
        }

        setNotice("Mockup uploaded and preview route published.");
        setUploadFile(null);
        setUploadDraft((current) => ({
          ...current,
          title: "",
          notes: "",
        }));
        await load();
      } catch (uploadError) {
        setError(uploadError instanceof Error ? uploadError.message : String(uploadError));
      }
    });
  };

  return (
    <div className="space-y-4">
      <AdminExperienceSystemPanels />

      <ExperienceStudioOverviewPanel payload={payload} error={error} notice={notice} />

      <section className="grid gap-4 2xl:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <ExperienceStudioPackManagementPanels
          payload={payload}
          loading={loading}
          isPending={isPending}
          selectedPackId={selectedPackId}
          packDraft={packDraft}
          statusCatalog={statusCatalog}
          onPackDraftChange={(next) =>
            setPackDraft((current) => ({
              ...current,
              ...next,
            }))
          }
          onCreatePack={createPack}
          onSelectPack={(packId) => {
            setSelectedPackId(packId);
            setUploadDraft((current) => ({
              ...current,
              experiencePackId: packId,
            }));
          }}
        />

        <ExperienceStudioPublishingPanels
          payload={payload}
          isPending={isPending}
          selectedPack={selectedPack}
          statusCatalog={statusCatalog}
          uploadDraft={uploadDraft}
          coverUploadTarget={coverUploadTarget}
          latestPreview={latestPreview}
          pendingPreviewHref={pendingPreviewHref}
          uploadRoute={uploadRoute}
          onUploadDraftChange={(next) =>
            setUploadDraft((current) => ({
              ...current,
              ...next,
            }))
          }
          onUploadFileChange={setUploadFile}
          onUploadMockup={uploadMockup}
          onUpdateSelectedPack={updateSelectedPack}
          onUploadSelectedCover={(file) => uploadCoverImage(file, "selected")}
          onSaveSelectedPack={saveSelectedPack}
        />
      </section>
    </div>
  );
}
