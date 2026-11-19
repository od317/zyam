"use client";

import { useSyncExternalStore } from "react";
import { stage, subscribeStage } from "@/app/lib/nav-state";

// Wraps the project cards: they become transparent as soon as one is clicked.
export function ProjectsFade({ children }: { children: React.ReactNode }) {
  const leaving = useSyncExternalStore(
    subscribeStage,
    () => stage.leaving,
    () => false,
  );
  return (
    <div
      className={`transition-opacity duration-700 ${leaving ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      {children}
    </div>
  );
}
