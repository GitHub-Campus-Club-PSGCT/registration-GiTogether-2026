import { motion } from 'motion/react';
import { cardVariants } from '@/lib/motion';

export default function AuthCard({ wide = false, children }) {
  return (
    <motion.div
      variants={cardVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      className={`relative mx-auto w-full ${wide ? 'max-w-md sm:max-w-2xl lg:max-w-5xl' : 'max-w-md'}`}
    >
      <div className="absolute -inset-px rounded-[28px] bg-gradient-to-b from-brand-600/70 via-graphite-500/30 to-transparent" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[27px] border border-white/[0.08] bg-gradient-to-b from-graphite-800/95 via-graphite-900/95 to-graphite-950/98 p-6 shadow-[0_0_0_1px_rgba(225,6,0,0.25),0_24px_64px_-24px_rgba(225,6,0,0.4)] sm:p-10">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-brand-600 to-transparent" aria-hidden="true" />
        <div className="absolute -top-24 left-1/2 h-48 w-48 -translate-x-1/2 rounded-full bg-brand-600/20 blur-3xl" aria-hidden="true" />
        <div className="relative">{children}</div>
      </div>
    </motion.div>
  );
}
