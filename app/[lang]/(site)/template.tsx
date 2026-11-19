"use client";

import { useLayoutEffect, useState } from "react";
import { DoorPanels } from "@/app/components/doors";

let firstLoad = true; // the very first render after a full page load gets no transition

export default function Template({ children }: { children: React.ReactNode }) {
  const [play, setPlay] = useState(false);

  // Layout effect: runs before the browser paints, so the doors are already closed on the first frame.
  useLayoutEffect(() => {
    if (firstLoad) {
      firstLoad = false;
      return;
    }
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    setPlay(true);
  }, []);

  return (
    <>
      {children}
      {play && (
        <div
          className="pointer-events-none fixed inset-0 z-[90]"
          style={{ perspective: 1800 }}
          aria-hidden="true"
        >
          <DoorPanels open duration={0.9} onOpened={() => setPlay(false)} />
        </div>
      )}
    </>
  );
}
