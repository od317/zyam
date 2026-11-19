"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { stage } from "@/app/lib/nav-state";
import { preloadHall, type Hall } from "./hall-canvas";

const LIST = /^\/(ar|en)\/projects\/?$/;
const DETAIL = /^\/(ar|en)\/projects\/[^/]+\/?$/;

// One 3D room behind the projects list AND the project page, so it never disappears between them.
// List: doors closed, behind the cards. Click: cards fade, doors open, camera enters. Detail: inside the room.
export function HallStage() {
  const pathname = usePathname();
  const mode = LIST.test(pathname)
    ? "list"
    : DETAIL.test(pathname)
      ? "detail"
      : null;
  const active = mode !== null;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hallRef = useRef<Hall | null>(null);
  const modeRef = useRef(mode);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    modeRef.current = mode;
  });

  // Create the scene when we enter the projects area, dispose it when we leave it.
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    let hall: Hall | null = null;

    preloadHall()
      .then(({ createHall }) => {
        if (cancelled || !canvasRef.current) return;
        const h: Hall = createHall(canvasRef.current, {
          endZ: -5.5,
          endFov: 62,
          startAt: modeRef.current === "detail" ? 1 : 0, // opened directly on a project: already inside
        });
        hall = h;
        hallRef.current = h;
        // With "reduce motion" there is no enter(), so a click is a normal link.
        if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
          stage.enter = async () => {
            stage.busy = true;
            stage.setLeaving(true); // cards fade out while the doors open
            const ok = await h.animateTo(1, 2.6);
            stage.busy = false;
            if (!ok) stage.setLeaving(false);
            return ok;
          };
        }
        setReady(true);
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      stage.enter = null;
      stage.busy = false;
      stage.setLeaving(false);
      hall?.dispose();
      hallRef.current = null;
      setReady(false);
    };
  }, [active]);

  // Follow the route: back to the list closes the doors again, a project page is "inside".
  useEffect(() => {
    if (mode === "detail") stage.setLeaving(false);
    const hall = hallRef.current;
    if (!hall || stage.busy) return;
    if (mode === "list") {
      hall.setScroll(0);
      hall.animateTo(0, 1.4);
    } else if (mode === "detail") {
      hall.snapTo(1);
    }
  }, [mode, ready]);

  // On a project page, scrolling moves the camera inside the room.
  useEffect(() => {
    if (mode !== "detail" || !ready) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      hallRef.current?.setScroll(max > 0 ? window.scrollY / max : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [mode, ready]);

  if (!active) return null;
  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 -z-10 bg-gradient-to-b from-ink via-ink-2 to-ink"
    >
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 h-full w-full transition-opacity duration-500 ${ready ? "opacity-100" : "opacity-0"}`}
      />
    </div>
  );
}
