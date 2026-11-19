"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { DoorPanels } from "./doors";
import { HallCanvas, preloadHall } from "./hall-canvas";

type Mode = "idle" | "three" | "fade" | "css";

export function DoorTransition({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const previous = useRef(pathname);
  const [mode, setMode] = useState<Mode>("idle");

  // Download Three.js quietly, after the page has settled.
  useEffect(() => {
    const t = setTimeout(() => preloadHall().catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, []);

  // Layout effect: the black cover exists before the browser paints the new page.
  useLayoutEffect(() => {
    if (previous.current === pathname) return;
    previous.current = pathname;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setMode("three");
  }, [pathname]);

  useEffect(() => {
    if (mode !== "fade") return;
    const t = setTimeout(() => setMode("idle"), 500);
    return () => clearTimeout(t);
  }, [mode]);

  return (
    <>
      {children}
      {(mode === "three" || mode === "fade") && (
        <div
          aria-hidden="true"
          className={`pointer-events-none fixed inset-0 z-[90] bg-ink transition-opacity duration-500 ${
            mode === "fade" ? "opacity-0" : "opacity-100"
          }`}
        >
          <HallCanvas
            playing
            seconds={1.8}
            timeoutMs={600}
            onDone={() => setMode("fade")}
            onFail={() => setMode("css")}
          />
        </div>
      )}
      {mode === "css" && (
        <div
          className="pointer-events-none fixed inset-0 z-[90]"
          style={{ perspective: 1800 }}
          aria-hidden="true"
        >
          <DoorPanels open duration={0.9} onOpened={() => setMode("idle")} />
        </div>
      )}
    </>
  );
}
