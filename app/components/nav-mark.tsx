"use client";

import { useEffect } from "react";
import { nav } from "@/app/lib/nav-state";
import { preloadHall } from "./hall-canvas";

export function NavMark() {
  useEffect(() => {
    nav.ready = true;
    // Download Three.js quietly, so the first project click doesn't wait for it.
    const t = setTimeout(() => preloadHall().catch(() => {}), 1500);
    return () => clearTimeout(t);
  }, []);
  return null;
}
