"use client";

import { usePathname } from "next/navigation";
import { useState } from "react";
import { motion } from "motion/react";

// nav order — slide direction depends on where the target sits relative to the source
const ORDER = ["/", "/memory", "/chat", "/reminders", "/logs", "/settings"];

function sectionIndex(path: string): number {
  let best = -1;
  let bestLen = -1;
  ORDER.forEach((p, i) => {
    const match = p === "/" ? path === "/" : path.startsWith(p);
    if (match && p.length > bestLen) {
      bestLen = p.length;
      best = i;
    }
  });
  return best;
}

// module-level: survive the (multiple) remounts Next does per navigation.
// Next can remount template several times per nav, so we only compute the
// direction on the FIRST mount where the path actually changed, then reuse it.
let prevPath: string | null = null;
let lastDir = 0;

export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  const path = usePathname();

  const [dir] = useState<number>(() => {
    if (path === prevPath) return lastDir; // a repeat mount of the same route
    const from = prevPath;
    prevPath = path;
    const isMobile = typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches;
    let d = 0;
    if (isMobile && from) {
      const a = sectionIndex(from);
      const b = sectionIndex(path);
      if (a >= 0 && b >= 0 && a !== b) d = b > a ? 1 : -1;
    }
    lastDir = d;
    return d;
  });

  return (
    <motion.div
      initial={dir === 0 ? { opacity: 0 } : { x: `${dir * 100}%`, opacity: 0.4 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: dir === 0 ? 0.22 : 0.3, ease: [0.32, 0.72, 0, 1] }}
      className="flex min-h-0 flex-1 flex-col will-change-transform"
    >
      {children}
    </motion.div>
  );
}
