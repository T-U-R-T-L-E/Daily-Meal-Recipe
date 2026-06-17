import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
}

export default function PullToRefresh({ children }: Props) {
  const [pullDistance, setPullDistance] = useState(0);
  const [status, setStatus] = useState<'idle' | 'pulling' | 'release' | 'refreshing'>('idle');
  
  const startY = useRef(0);
  const isPulling = useRef(false);
  const touchActive = useRef(false);

  const threshold = 70; // px after which it triggers
  const maxPull = 120; // maximum pull drag in px

  useEffect(() => {
    const handleTouchStart = (e: TouchEvent) => {
      // Only initiate pull-to-refresh if at the very top of the scroll viewport
      if (window.scrollY <= 2) {
        startY.current = e.touches[0].clientY;
        touchActive.current = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchActive.current) return;
      
      const currentY = e.touches[0].clientY;
      const deltaY = currentY - startY.current;

      if (deltaY > 0 && window.scrollY <= 2) {
        // Pulling down from the top
        isPulling.current = true;
        
        // resistance curves
        const resistanceDistance = Math.min(maxPull, Math.pow(deltaY, 0.85));
        setPullDistance(resistanceDistance);
        
        if (resistanceDistance >= threshold) {
          setStatus('release');
        } else {
          setStatus('pulling');
        }

        // Prevent elastic scroll bounce of browser when pulling
        if (e.cancelable) {
          e.preventDefault();
        }
      } else {
        isPulling.current = false;
        setPullDistance(0);
        setStatus('idle');
      }
    };

    const handleTouchEnd = () => {
      touchActive.current = false;
      if (!isPulling.current) return;

      isPulling.current = false;
      if (pullDistance >= threshold) {
        triggerRefresh();
      } else {
        setPullDistance(0);
        setStatus('idle');
      }
    };

    // Keep mouse-drags active for high-fidelity desktop experience
    const handleMouseDown = (e: MouseEvent) => {
      if (window.scrollY <= 2) {
        startY.current = e.clientY;
        touchActive.current = true;
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!touchActive.current) return;
      if (e.buttons !== 1) { // Left mouse button must be clicked
        touchActive.current = false;
        return;
      }

      const deltaY = e.clientY - startY.current;
      if (deltaY > 10 && window.scrollY <= 2) {
        isPulling.current = true;
        const resistanceDistance = Math.min(maxPull, Math.pow(deltaY, 0.85));
        setPullDistance(resistanceDistance);

        if (resistanceDistance >= threshold) {
          setStatus('release');
        } else {
          setStatus('pulling');
        }
        e.preventDefault();
      }
    };

    const handleMouseUp = () => {
      touchActive.current = false;
      if (!isPulling.current) return;

      isPulling.current = false;
      if (pullDistance >= threshold) {
        triggerRefresh();
      } else {
        setPullDistance(0);
        setStatus('idle');
      }
    };

    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('touchstart', handleTouchStart);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [pullDistance]);

  const triggerRefresh = () => {
    setStatus('refreshing');
    setPullDistance(threshold);

    // Short delays to enjoy professional culinary feedback before reload
    setTimeout(() => {
      window.location.reload();
    }, 1200);
  };

  return (
    <div className="relative w-full min-h-screen">
      {/* Pull down visual dialog / indicator */}
      <motion.div 
        style={{ height: pullDistance }}
        className="absolute top-0 left-0 right-0 overflow-hidden flex items-end justify-center bg-black/40 border-b border-white/5 z-[9999] pointer-events-none"
        animate={{ 
          height: status === 'refreshing' ? threshold : pullDistance 
        }}
        transition={status === 'idle' ? { type: 'spring', stiffness: 220, damping: 26 } : { duration: 0.1 }}
      >
        <div className="pb-4 flex flex-col items-center justify-center space-y-2">
          {status === 'refreshing' ? (
            <div className="flex flex-col items-center space-y-1">
              <RefreshCw className="w-5 h-5 text-amber-accent animate-spin" />
              <span className="text-[10px] font-mono tracking-widest text-amber-accent uppercase animate-pulse">
                Sourcing culinary updates...
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-1">
              <motion.div
                animate={{ rotate: pullDistance * 3 }}
                transition={{ ease: "linear", duration: 0 }}
              >
                <RefreshCw className={`w-5 h-5 ${status === 'release' ? 'text-amber-accent scale-110' : 'text-white/40'}`} />
              </motion.div>
              <span className="text-[10px] font-mono tracking-widest text-white/50 uppercase">
                {status === 'release' ? 'Release to install updates' : 'Pull down to refresh'}
              </span>
            </div>
          )}
        </div>
      </motion.div>

      {/* Elastic stretch container */}
      <motion.div
        animate={{ 
          y: status === 'refreshing' ? threshold : pullDistance * 0.4
        }}
        transition={status === 'idle' ? { type: 'spring', stiffness: 220, damping: 26 } : { duration: 0.1 }}
        className="min-h-screen w-full"
      >
        {children}
      </motion.div>
    </div>
  );
}
