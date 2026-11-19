"use client";

import { motion } from "motion/react";

const ease = [0.7, 0, 0.2, 1] as const;

// Positive rotateY on the left door and negative on the right swing both inward, away from the viewer.
// left-0 / right-0 are used on purpose: the doors are symmetric, so they must NOT flip with RTL.
export function DoorPanels({
  open,
  duration = 1.2,
  onOpened,
}: {
  open: boolean;
  duration?: number;
  onOpened?: () => void;
}) {
  const face =
    "absolute inset-y-0 w-1/2 bg-gradient-to-b from-ink via-ink-2 to-ink [backface-visibility:hidden]";
  return (
    <>
      <motion.div
        aria-hidden="true"
        className={`${face} left-0 border-r border-gold/50`}
        style={{ transformOrigin: "left center" }}
        initial={false}
        animate={{ rotateY: open ? 100 : 0 }}
        transition={{ duration, ease }}
        onAnimationComplete={() => open && onOpened?.()}
      >
        <div className="absolute inset-y-[30%] right-5 w-px bg-gold/60" />
      </motion.div>
      <motion.div
        aria-hidden="true"
        className={`${face} right-0 border-l border-gold/50`}
        style={{ transformOrigin: "right center" }}
        initial={false}
        animate={{ rotateY: open ? -100 : 0 }}
        transition={{ duration, ease }}
      >
        <div className="absolute inset-y-[30%] left-5 w-px bg-gold/60" />
      </motion.div>
    </>
  );
}
