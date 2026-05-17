"use client";

import { motion } from "framer-motion";

export function HeroBackground() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-20%,#1e3a5f_0%,#0a0f1f_45%,#050810_100%)]"
        animate={{ opacity: [0.95, 1, 0.95] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="absolute -left-32 top-1/4 h-[420px] w-[420px] rounded-full bg-cyan-500/20 blur-[100px]"
        animate={{ x: [0, 30, 0], y: [0, -20, 0], opacity: [0.35, 0.5, 0.35] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-24 top-1/3 h-[380px] w-[380px] rounded-full bg-violet-600/25 blur-[110px]"
        animate={{ x: [0, -25, 0], y: [0, 25, 0], opacity: [0.3, 0.45, 0.3] }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-0 left-1/2 h-[300px] w-[600px] -translate-x-1/2 rounded-full bg-blue-600/15 blur-[90px]"
        animate={{ opacity: [0.2, 0.35, 0.2] }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div
        className="absolute inset-0 opacity-[0.14]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.35) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.35) 1px, transparent 1px)
          `,
          backgroundSize: "48px 48px",
          maskImage: "radial-gradient(ellipse 80% 70% at 50% 40%, black 20%, transparent 75%)",
        }}
      />

      <div
        className="absolute bottom-0 left-0 right-0 h-[45%] opacity-25"
        style={{
          backgroundImage: `
            linear-gradient(rgba(34,211,238,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(34,211,238,0.25) 1px, transparent 1px)
          `,
          backgroundSize: "64px 40px",
          transform: "perspective(500px) rotateX(62deg)",
          transformOrigin: "bottom center",
          maskImage: "linear-gradient(to top, black 0%, transparent 85%)",
        }}
      />

      {Array.from({ length: 24 }).map((_, i) => (
        <motion.span
          key={i}
          className="absolute h-1 w-1 rounded-full bg-cyan-300/60"
          style={{
            left: `${(i * 17 + 7) % 100}%`,
            top: `${(i * 23 + 11) % 85}%`,
          }}
          animate={{
            opacity: [0.15, 0.7, 0.15],
            scale: [0.8, 1.4, 0.8],
            y: [0, -12 - (i % 5) * 4, 0],
          }}
          transition={{
            duration: 4 + (i % 6),
            repeat: Infinity,
            delay: i * 0.15,
            ease: "easeInOut",
          }}
        />
      ))}

      <motion.div
        className="absolute left-0 right-0 h-px bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent"
        animate={{ top: ["15%", "85%", "15%"] }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      />
    </div>
  );
}
