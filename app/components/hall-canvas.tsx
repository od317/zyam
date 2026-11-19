"use client";

import { useEffect, useRef, useState } from "react";

export type Hall = {
  play(seconds: number): Promise<void>;
  animateTo(to: number, seconds: number): Promise<boolean>;
  snapTo(p: number): void;
  setScroll(s: number): void;
  dispose(): void;
};

export const preloadHall = () => import("./hall-scene");

export function HallCanvas({
  playing,
  instant = false,
  seconds,
  endZ,
  endFov,
  timeoutMs,
  onDone,
  onFail,
  onHall,
}: {
  playing: boolean;
  instant?: boolean;
  seconds: number;
  endZ?: number;
  endFov?: number;
  timeoutMs: number;
  onDone: () => void;
  onFail: () => void;
  onHall?: (hall: Hall | null) => void; // gives the parent a handle, used for scroll
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hallRef = useRef<Hall | null>(null);
  const [ready, setReady] = useState(false);
  const callbacks = useRef({ onDone, onFail, onHall });

  useEffect(() => {
    callbacks.current = { onDone, onFail, onHall };
  });

  useEffect(() => {
    let cancelled = false;
    let hall: Hall | null = null;
    const timer = setTimeout(() => {
      if (!hall && !cancelled) {
        cancelled = true;
        callbacks.current.onFail();
      }
    }, timeoutMs);

    preloadHall()
      .then(({ createHall }) => {
        if (cancelled || !canvasRef.current) return;
        hall = createHall(canvasRef.current, {
          endZ,
          endFov,
          startAt: instant ? 1 : 0,
        });
        hallRef.current = hall;
        clearTimeout(timer);
        setReady(true);
        callbacks.current.onHall?.(hall);
      })
      .catch(() => {
        if (cancelled) return;
        cancelled = true;
        clearTimeout(timer);
        callbacks.current.onFail();
      });

    return () => {
      cancelled = true;
      clearTimeout(timer);
      callbacks.current.onHall?.(null);
      hall?.dispose();
      hallRef.current = null;
    };
  }, [timeoutMs, endZ, endFov, instant]);

  useEffect(() => {
    if (!ready || !playing || instant) return;
    let alive = true;
    hallRef.current
      ?.play(seconds)
      .then(() => alive && callbacks.current.onDone());
    return () => {
      alive = false;
    };
  }, [ready, playing, instant, seconds]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={`absolute inset-0 h-full w-full transition-opacity duration-300 ${ready ? "opacity-100" : "opacity-0"}`}
    />
  );
}
