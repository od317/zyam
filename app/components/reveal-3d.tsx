"use client";

import { useRef } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useTransform,
} from "motion/react";

// Tilts and pushes its content in from depth as it scrolls into view, and eases it back out as it leaves.
// strength: 1 for images, about 0.35 for big text blocks.
export function Reveal3D({
  children,
  index = 0,
  strength = 1,
  className = "",
}: {
  children: React.ReactNode;
  index?: number;
  strength?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const side = index % 2 === 0 ? -1 : 1;
  const at = [0, 0.3, 0.7, 1];

  const rotateX = useTransform(scrollYProgress, at, [
    26 * strength,
    0,
    0,
    -14 * strength,
  ]);
  const rotateY = useTransform(scrollYProgress, at, [
    side * 20 * strength,
    0,
    0,
    side * -10 * strength,
  ]);
  const z = useTransform(scrollYProgress, at, [
    -240 * strength,
    0,
    0,
    -120 * strength,
  ]);
  const opacity = useTransform(
    scrollYProgress,
    [0, 0.22, 0.85, 1],
    [0, 1, 1, 0.25],
  );

  if (reduce) return <div className={className}>{children}</div>;

  return (
    <motion.div
      ref={ref}
      className={className}
      style={{
        rotateX,
        rotateY,
        z,
        opacity,
        transformPerspective: 1100,
        willChange: "transform",
      }}
    >
      {children}
    </motion.div>
  );
}
