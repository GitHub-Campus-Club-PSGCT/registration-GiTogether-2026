import { animate } from 'motion/react';

// Springs rather than timed animations, so anything moving can be interrupted and redirected smoothly.
export const SPRING = { type: 'spring', bounce: 0, duration: 0.55 };
export const SPRING_QUICK = { type: 'spring', bounce: 0, duration: 0.35 };
export const SPRING_LIVELY = { type: 'spring', bounce: 0.22, duration: 0.6 };
export const SPRING_SHEET = { type: 'spring', bounce: 0, duration: 0.4 };

// Where a flick would come to rest, so a quick flick can dismiss a sheet even after a short drag.
export const projectMomentum = (velocity, decelerationRate = 0.99) => ((velocity / 1000) * decelerationRate) / (1 - decelerationRate);

export const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.985 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { ...SPRING, staggerChildren: 0.05, delayChildren: 0.06 },
  },
  exit: { opacity: 0, scale: 0.985, transition: { duration: 0.16, ease: 'easeIn' } },
};

export const riseVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: SPRING },
};

export const memberVariants = {
  closed: { height: 0, opacity: 0, transition: { height: SPRING, opacity: { duration: 0.18 } } },
  open: { height: 'auto', opacity: 1, transition: { height: SPRING, opacity: { duration: 0.2 } } },
};

export const instantMemberVariants = {
  closed: { height: 0, opacity: 0, transition: { duration: 0 } },
  open: { height: 'auto', opacity: 1, transition: { duration: 0 } },
};

export const memberCardVariants = {
  closed: { y: 16, scale: 0.98, transition: { ...SPRING_QUICK, staggerChildren: 0.02, staggerDirection: -1 } },
  open: { y: 0, scale: 1, transition: { ...SPRING_LIVELY, staggerChildren: 0.055, delayChildren: 0.08 } },
};

export const memberFieldVariants = {
  closed: { opacity: 0, x: -18 },
  open: { opacity: 1, x: 0, transition: SPRING_LIVELY },
};

// A red line races across the top of a new member's card.
export const memberStreakVariants = {
  closed: { scaleX: 0, opacity: 1 },
  open: { scaleX: 1, opacity: [1, 1, 0], transition: { duration: 0.9, ease: [0.22, 1, 0.36, 1] } },
};

export const collapseProps = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1 },
  exit: { height: 0, opacity: 0 },
  transition: SPRING_QUICK,
};

let pageScroll = null;

// Scrolls on a spring and re-reads the target each frame, because errors opening above it can move it.
export function scrollPage(getTarget, reduceMotion) {
  pageScroll?.stop();
  if (reduceMotion) {
    window.scrollTo(0, getTarget());
    return;
  }

  const start = window.scrollY;
  const stopForUser = () => pageScroll?.stop();
  window.addEventListener('wheel', stopForUser, { once: true, passive: true });
  window.addEventListener('touchstart', stopForUser, { once: true, passive: true });
  pageScroll = animate(0, 1, {
    ...SPRING,
    onUpdate: (progress) => window.scrollTo(0, start + (getTarget() - start) * progress),
    onComplete: () => {
      window.removeEventListener('wheel', stopForUser);
      window.removeEventListener('touchstart', stopForUser);
    },
  });
}

export const scrollPageToTop = (reduceMotion) => scrollPage(() => 0, reduceMotion);

export const scrollPageToElement = (element, reduceMotion) =>
  scrollPage(() => {
    const { top, height } = element.getBoundingClientRect();
    return window.scrollY + top - (window.innerHeight - height) / 2;
  }, reduceMotion);
