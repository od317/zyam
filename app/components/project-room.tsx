"use client";

import { useEffect, useState } from "react";
import { nav } from "@/app/lib/nav-state";
import { HallCanvas } from "./hall-canvas";

export function ProjectRoom({ children }: { children: React.ReactNode }) {
  // Decided once, during the first render: did the visitor click their way here?
  // On a direct load nav.ready is still false (the initial render runs before any effect).
  const [intro] = useState(
    () =>
      nav.ready &&
      !(
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ),
  );
  const [entered, setEntered] = useState(!intro); // details visible
  const [failed, setFailed] = useState(false);

  // No scrolling while the doors open.
  useEffect(() => {
    if (entered) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [entered]);

  return (
    <>
      {/* Behind everything: negative z-index sits above the page background but below all content. */}
      <div
        aria-hidden="true"
        className="fixed inset-0 -z-10 bg-gradient-to-b from-ink via-ink-2 to-ink"
      >
        {!failed && (
          <HallCanvas
            playing={intro}
            instant={!intro}
            seconds={3}
            endZ={-9}
            endFov={62}
            timeoutMs={intro ? 800 : 6000}
            onDone={() => setEntered(true)}
            onFail={() => {
              setFailed(true);
              setEntered(true);
            }}
          />
        )}
      </div>

      <div
        className={`transition-opacity duration-700 ${entered ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        {children}
      </div>
    </>
  );
}
