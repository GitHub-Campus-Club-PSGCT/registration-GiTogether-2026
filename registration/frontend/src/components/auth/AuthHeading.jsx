import { motion } from 'motion/react';
import { riseVariants } from '@/lib/motion';

export default function AuthHeading({ eyebrow, title, description }) {
  return (
    <div className="mb-8 sm:text-center">
      <motion.p variants={riseVariants} className="mb-3 text-xs font-semibold uppercase tracking-[0.14em] text-brand-400">{eyebrow}</motion.p>
      <motion.h1 variants={riseVariants} className="font-display text-3xl font-bold uppercase leading-[1.1] tracking-[0.01em] text-white sm:text-4xl">{title}</motion.h1>
      <motion.p variants={riseVariants} className="mt-3 max-w-md font-display text-base leading-[1.4] text-graphite-300 sm:mx-auto">{description}</motion.p>
    </div>
  );
}
