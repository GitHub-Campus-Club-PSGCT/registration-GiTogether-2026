import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, useDragControls } from 'motion/react';
import { SPRING_SHEET, projectMomentum } from '@/lib/motion';

const DISMISS_SHARE = 0.35;

// Stops the page behind from scrolling or taking focus while something covers it.
export function useCoverPage() {
  useEffect(() => {
    const page = document.getElementById('root');
    const wasInert = page.inert;
    const pageOverflow = document.body.style.overflow;
    page.inert = true;
    document.body.style.overflow = 'hidden';
    return () => {
      page.inert = wasInert;
      document.body.style.overflow = pageOverflow;
    };
  }, []);
}

// Rises from the bottom and leaves the same way. Drag it down or flick it to dismiss.
export default function BottomSheet({ labelledBy, onDismiss, resistDrag = false, header, children, className = '' }) {
  const panelRef = useRef(null);
  const dragControls = useDragControls();
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useCoverPage();

  useEffect(() => {
    const opener = document.activeElement;
    panelRef.current?.focus();
    const dismissOnEscape = (event) => {
      if (event.key === 'Escape') dismissRef.current();
    };
    window.addEventListener('keydown', dismissOnEscape);
    return () => {
      window.removeEventListener('keydown', dismissOnEscape);
      opener?.focus?.();
    };
  }, []);

  const handleDragEnd = (event, { offset, velocity }) => {
    if (offset.y + projectMomentum(velocity.y) > panelRef.current.offsetHeight * DISMISS_SHARE) onDismiss();
  };

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <motion.div
        aria-hidden="true"
        onClick={onDismiss}
        className="absolute inset-0 bg-black/50"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={SPRING_SHEET}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        drag="y"
        dragListener={false}
        dragControls={dragControls}
        dragConstraints={{ top: 0, bottom: 0 }}
        dragElastic={{ top: 0.04, bottom: resistDrag ? 0.2 : 1 }}
        dragTransition={{ bounceStiffness: 500, bounceDamping: 45 }}
        onDragEnd={handleDragEnd}
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={SPRING_SHEET}
        className={`sheet-material relative flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-[28px] focus:outline-none ${className}`}
      >
        <div onPointerDown={(event) => dragControls.start(event)} className="shrink-0 cursor-grab touch-none select-none active:cursor-grabbing">
          <div className="mx-auto mb-1 mt-2.5 h-[5px] w-10 rounded-full bg-white/25" aria-hidden="true" />
          {header}
        </div>
        {children}
      </motion.div>
    </div>,
    document.body,
  );
}
