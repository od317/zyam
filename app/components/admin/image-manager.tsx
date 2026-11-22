"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Language } from "@/app/lib/i18n";
import { adminDict } from "@/app/lib/admin-dict";
import {
  deleteProjectImageAction,
  reorderProjectImagesAction,
} from "@/app/[lang]/admin/(panel)/projects/actions";

type Img = {
  id: number;
  status: "processing" | "ready" | "failed";
  thumbUrl: string | null;
};
type Job = { name: string; pct: number; error?: string };

// XMLHttpRequest instead of fetch because only XHR reports upload progress.
function sendFile(
  projectId: number,
  file: File,
  onProgress: (pct: number) => void,
) {
  return new Promise<{ ok: true } | { ok: false; error: string }>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", `/api/admin/projects/${projectId}/images`);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable)
        onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve({ ok: true });
      let error = `Error ${xhr.status}`;
      try {
        error = JSON.parse(xhr.responseText).error ?? error;
      } catch {}
      resolve({ ok: false, error });
    };
    xhr.onerror = () => resolve({ ok: false, error: "Network error" });
    const body = new FormData();
    body.append("file", file);
    xhr.send(body);
  });
}

const badge = {
  processing: "bg-amber-900/60 text-amber-300",
  ready: "bg-emerald-900/60 text-emerald-300",
  failed: "bg-red-900/60 text-red-300",
} as const;

export function ImageManager({
  lang,
  projectId,
  images,
}: {
  lang: Language;
  projectId: number;
  images: Img[];
}) {
  const t = adminDict[lang].p.img;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  // While the worker is processing, look again every 3 seconds (for at most 2 minutes).
  const processing = images.some((i) => i.status === "processing");
  useEffect(() => {
    if (!processing) return;
    let ticks = 0;
    const timer = setInterval(() => {
      if (++ticks > 40) clearInterval(timer);
      else router.refresh();
    }, 3000);
    return () => clearInterval(timer);
  }, [processing, router]);

  async function uploadAll(files: File[]) {
    if (!files.length || busy) return;
    setBusy(true);
    setError("");
    setJobs(files.map((f) => ({ name: f.name, pct: 0 })));
    for (const [i, file] of files.entries()) {
      const res = await sendFile(projectId, file, (pct) =>
        setJobs((j) => j.map((x, k) => (k === i ? { ...x, pct } : x))),
      );
      if (!res.ok)
        setJobs((j) =>
          j.map((x, k) => (k === i ? { ...x, error: res.error } : x)),
        );
    }
    setJobs((j) => j.filter((x) => x.error)); // successes disappear, failures stay visible
    setBusy(false);
    router.refresh();
    if (fileRef.current) fileRef.current.value = "";
  }

  function move(i: number, d: -1 | 1) {
    const ids = images.map((x) => x.id);
    const j = i + d;
    if (j < 0 || j >= ids.length) return;
    [ids[i], ids[j]] = [ids[j], ids[i]];
    start(async () => {
      const res = await reorderProjectImagesAction(projectId, ids);
      setError(res.ok ? "" : res.error);
      router.refresh();
    });
  }

  function remove(id: number) {
    if (!window.confirm(t.confirmRemove)) return;
    start(async () => {
      const res = await deleteProjectImageAction(id);
      setError(res.ok ? "" : res.error);
      router.refresh();
    });
  }

  return (
    <div>
      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          void uploadAll(
            [...e.dataTransfer.files].filter((f) =>
              f.type.startsWith("image/"),
            ),
          );
        }}
        className="flex cursor-pointer flex-col items-center gap-1 rounded border-2 border-dashed border-stone-700 p-8 text-center hover:border-amber-600"
      >
        <span>{t.drop}</span>
        <span className="text-xs text-stone-500">{t.hint}</span>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp"
          className="sr-only"
          onChange={(e) => void uploadAll([...(e.target.files ?? [])])}
        />
      </label>

      {jobs.length > 0 && (
        <ul className="mt-3 space-y-2 text-sm">
          {jobs.map((j, i) => (
            <li key={i}>
              <div className="flex justify-between gap-4">
                <span className="truncate" dir="ltr">
                  {j.name}
                </span>
                <span className={j.error ? "text-red-400" : "text-stone-400"}>
                  {j.error ?? (busy ? `${t.uploading} ${j.pct}%` : "")}
                </span>
              </div>
              {!j.error && (
                <div className="mt-1 h-1 rounded bg-stone-800">
                  <div
                    className="h-1 rounded bg-amber-500"
                    style={{ width: `${j.pct}%` }}
                  />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {error}
        </p>
      )}

      {images.length === 0 ? (
        <p className="mt-6 text-sm text-stone-500">{t.none}</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {images.map((img, i) => (
            <li
              key={img.id}
              className="rounded border border-stone-800 bg-stone-900/60 p-2"
            >
              <div className="relative">
                {img.thumbUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.thumbUrl}
                    alt=""
                    className="aspect-[4/3] w-full rounded object-cover"
                  />
                ) : (
                  <div className="aspect-[4/3] w-full rounded bg-stone-800" />
                )}
                {i === 0 && (
                  <span className="absolute start-1 top-1 rounded bg-amber-600 px-1.5 text-xs font-semibold text-stone-950">
                    {t.cover}
                  </span>
                )}
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-xs">
                <span className={`rounded px-1.5 py-0.5 ${badge[img.status]}`}>
                  {t[img.status]}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={pending || i === 0}
                    onClick={() => move(i, -1)}
                    aria-label={t.earlier}
                    title={t.earlier}
                    className="rounded border border-stone-700 px-2 py-0.5 disabled:opacity-30"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block rtl:rotate-180"
                    >
                      ‹
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={pending || i === images.length - 1}
                    onClick={() => move(i, 1)}
                    aria-label={t.later}
                    title={t.later}
                    className="rounded border border-stone-700 px-2 py-0.5 disabled:opacity-30"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block rtl:rotate-180"
                    >
                      ›
                    </span>
                  </button>
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(img.id)}
                    className="rounded border border-red-900 px-2 py-0.5 text-red-400 disabled:opacity-30"
                  >
                    {t.remove}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
