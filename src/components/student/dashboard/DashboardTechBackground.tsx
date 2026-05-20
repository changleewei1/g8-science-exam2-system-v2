"use client";

import { motion } from "framer-motion";

export function DashboardTechBackground() {
  return (
    <motion.div
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#050a14]"
      aria-hidden
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.6 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_120%_80%_at_50%_-10%,#1e3a5f_0%,#0a1220_40%,#050a14_100%)]" />
      <motion.div
        className="absolute -left-24 top-1/4 h-96 w-96 rounded-full bg-cyan-500/15 blur-[100px]"
        animate={{ x: [0, 24, 0], opacity: [0.3, 0.45, 0.3] }}
        transition={{ duration: 12, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-16 top-1/3 h-80 w-80 rounded-full bg-blue-600/20 blur-[90px]"
        animate={{ x: [0, -20, 0], opacity: [0.25, 0.4, 0.25] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <div
        className="absolute inset-0 opacity-[0.12]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(56,189,248,0.4) 1px, transparent 1px),
            linear-gradient(90deg, rgba(56,189,248,0.4) 1px, transparent 1px)
          `,
          backgroundSize: "40px 40px",
          maskImage: "radial-gradient(ellipse 90% 80% at 50% 20%, black 10%, transparent 70%)",
        }}
      />
    </motion.div>
  );
}
