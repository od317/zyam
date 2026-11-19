"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { DoorPanels } from "./doors";

const KEY = "zyam_gate_seen";
type Phase = "closed" | "opening" | "done";

export function Gate({ skipLabel }: { skipLabel: string }) {
  // Starts "closed" so the server-rendered HTML already covers the hall.
  const [phase, setPhase] = useState<Phase>("closed");

  useEffect(() => {
    let seen = false;
    try {
      seen = sessionStorage.getItem(KEY) === "1";
    } catch {}
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (seen || reduce) {
      setPhase("done");
      return;
    }
    const timer = setTimeout(() => setPhase("opening"), 1500); // time to show the logo
    return () => clearTimeout(timer);
  }, []);

  // Remember the visit only once the gate has finished (not at the start, so React's dev double-run is harmless).
  useEffect(() => {
    if (phase !== "done") return;
    try {
      sessionStorage.setItem(KEY, "1");
    } catch {}
  }, [phase]);

  // No scrolling behind the gate.
  useEffect(() => {
    if (phase === "done") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [phase]);

  return (
    <>
      <noscript>
        <style>{`[data-gate]{display:none!important}`}</style>
      </noscript>
      <AnimatePresence>
        {phase !== "done" && (
          <motion.div
            key="gate"
            data-gate
            role="dialog"
            aria-label="Zyam Design"
            className="fixed inset-0 z-[100]"
            style={{ perspective: 1800 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <DoorPanels
              open={phase === "opening"}
              duration={1.6}
              onOpened={() => setPhase("done")}
            />

            <motion.div
              className="pointer-events-none absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, y: 12 }}
              animate={
                phase === "opening"
                  ? { opacity: 0, scale: 1.1 }
                  : { opacity: 1, y: 0 }
              }
              transition={{ duration: phase === "opening" ? 0.5 : 0.9 }}
            >
              <p className="font-display text-4xl font-bold tracking-[0.25em] text-gold sm:text-6xl">
                ZYAM DESIGN
              </p>
            </motion.div>

            <button
              type="button"
              onClick={() => setPhase("done")}
              className="absolute inset-x-0 bottom-10 mx-auto w-fit rounded border border-gold/60 px-5 py-2 text-sm text-gold transition-colors hover:bg-gold hover:text-ink"
            >
              {skipLabel}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
