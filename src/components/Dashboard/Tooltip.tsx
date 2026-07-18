import { useState, ReactNode } from "react";
import { motion, AnimatePresence } from "motion/react";

interface TooltipProps {
  children: ReactNode;
  content: string;
  enabled: boolean;
  direction?: 'left' | 'right' | 'bottom' | 'bottom-left' | 'bottom-right';
  key?: string | number;
}

export default function Tooltip({ children, content, enabled, direction = 'right' }: TooltipProps) {
  const [show, setShow] = useState(false);

  if (!enabled) {
    return <>{children}</>;
  }

  const tooltipClasses = direction === 'right' 
    ? "absolute left-full ml-4" 
    : direction === 'left'
    ? "absolute right-full mr-4"
    : direction === 'bottom-left'
    ? "absolute top-full mt-2 left-0"
    : direction === 'bottom-right'
    ? "absolute top-full mt-2 right-0"
    : "absolute top-full mt-2 left-1/2 -translate-x-1/2";
  
  const initialX = direction === 'right' ? -10 : direction === 'left' ? 10 : 0;
  const initialY = direction.startsWith('bottom') ? 10 : 0;

  return (
    <div 
      className="relative inline-flex items-center justify-center" 
      onMouseEnter={() => setShow(true)} 
      onMouseLeave={() => setShow(false)}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, x: initialX, y: initialY }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, x: initialX, y: initialY }}
            className={`${tooltipClasses} px-3 py-1.5 bg-black text-white text-xs font-bold rounded-lg whitespace-nowrap z-[99999] shadow-xl pointer-events-none`}
          >
            {content}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
