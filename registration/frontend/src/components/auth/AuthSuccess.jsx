import { motion } from 'motion/react';
import { SPRING_LIVELY, riseVariants } from '@/lib/motion';

const badgeVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { opacity: 1, scale: 1, transition: { ...SPRING_LIVELY, bounce: 0.45 } },
};

const drawVariants = {
  hidden: { pathLength: 0 },
  visible: { pathLength: 1, transition: { delay: 0.12, duration: 0.45, ease: [0.22, 1, 0.36, 1] } },
};

export default function AuthSuccess({ title, message, actionLabel, onAction, whatsappUrl }) {
  return (
    <div className="flex flex-col items-center py-4 text-center">
      <motion.div
        variants={badgeVariants}
        className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-success-500/40 bg-success-500/10 shadow-[0_0_32px_-4px_rgba(34,197,94,0.5)]"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-8 w-8 text-success-400" aria-hidden="true">
          <motion.circle cx="12" cy="12" r="10" variants={drawVariants} />
          <motion.path d="m8.5 12.5 2.5 2.5 4.5-5.5" variants={drawVariants} />
        </svg>
      </motion.div>

      <motion.h2 variants={riseVariants} className="font-display text-2xl font-bold uppercase tracking-[0.01em] text-white">
        {title}
      </motion.h2>

      <motion.p variants={riseVariants} className="mx-auto mt-3 max-w-sm font-display text-base leading-[1.4] text-graphite-300">
        {message}
      </motion.p>

      <motion.div variants={riseVariants} className="mt-6 w-full">
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noreferrer"
          className="flex h-12 w-full items-center justify-center rounded-xl bg-green-600 text-sm font-semibold uppercase tracking-[0.14em] text-white transition duration-150 hover:bg-green-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500 active:scale-[0.98]"
        >
          Join WhatsApp Group
        </a>
      </motion.div>

      <motion.div variants={riseVariants} className="mt-3 w-full">
        <button
          type="button"
          onClick={onAction}
          className="flex h-12 w-full items-center justify-center rounded-xl border border-graphite-600 text-sm font-medium uppercase tracking-[0.14em] text-graphite-200 transition duration-150 hover:border-graphite-400 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 active:scale-[0.98]"
        >
          {actionLabel}
        </button>
      </motion.div>
    </div>
  );
}
