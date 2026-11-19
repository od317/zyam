"use client";

import { useEffect, useState } from "react";

// The 3D room now lives in HallStage (behind everything). This only fades the details in.
export function ProjectRoom({ children }: { children: React.ReactNode }) {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div
      className={`transition-opacity duration-700 ${shown ? "opacity-100" : "opacity-0"}`}
    >
      {children}
    </div>
  );
}
