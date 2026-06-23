import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, cleanRecipeImageUrl, getStableFoodImage } from '../../lib/utils';
import { ChefHat } from 'lucide-react';

interface LazyCookImageProps {
  src?: string;
  alt: string;
  className?: string;
  imageClassName?: string;
  layoutId?: string;
  recipeName?: string;
  category?: string;
  cuisine?: string;
  onClick?: (e: React.MouseEvent<HTMLImageElement>) => void;
  loadingStyle?: 'blur' | 'spinner' | 'both';
}

export default function LazyCookImage({
  src,
  alt,
  className = '',
  imageClassName = '',
  layoutId,
  recipeName = '',
  category = '',
  cuisine = '',
  onClick,
  loadingStyle = 'both'
}: LazyCookImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState(() => cleanRecipeImageUrl(src, recipeName, category, cuisine));
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFallback, setIsFallback] = useState(false);

  // Generate low-resolution placeholder URL for Unsplash photos for immediate load
  const lowResPlaceholder = (() => {
    if (resolvedSrc.includes('images.unsplash.com')) {
      const base = resolvedSrc.split('?')[0];
      return `${base}?auto=format&fit=crop&q=10&w=48&blur=25`;
    }
    // Return a smaller fallback for other links if possible or just the resolvedSrc
    return resolvedSrc;
  })();

  // Keep state updated in case the source url changed (e.g. editing, or surprise generators)
  useEffect(() => {
    setResolvedSrc(cleanRecipeImageUrl(src, recipeName, category, cuisine));
    setIsLoaded(false);
    setIsFallback(false);
  }, [src, recipeName, category, cuisine]);

  const handleImageLoad = () => {
    setIsLoaded(true);
  };

  const handleImageError = () => {
    if (!isFallback) {
      console.warn(`LazyCookImage: Fallback triggered for: "${recipeName}"`);
      const fallback = getStableFoodImage(recipeName, category, cuisine);
      setResolvedSrc(fallback);
      setIsFallback(true);
    } else {
      setIsLoaded(true); // Stop loading if even fallback failed
    }
  };

  return (
    <div className={cn("relative overflow-hidden w-full h-full bg-[#141414] select-none", className)}>
      {/* Blurred Placeholder image loaded instantly */}
      {!isLoaded && (
        <img
          src={lowResPlaceholder}
          alt={`Placeholder for ${alt}`}
          className="absolute inset-0 w-full h-full object-cover scale-105 filter blur-xl saturate-[1.5]"
          style={{ transform: 'scale(1.1)' }}
          referrerPolicy="no-referrer"
        />
      )}

      {/* Dynamic spinner overlay if both or spinner requested */}
      {!isLoaded && (loadingStyle === 'both' || loadingStyle === 'spinner') && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 z-10 backdrop-blur-[2px]">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="p-3 bg-black/40 border border-white/5 rounded-full shadow-xl"
          >
            <ChefHat className="w-5 h-5 text-amber-accent/80" />
          </motion.div>
        </div>
      )}

      {/* Shimmer light bar across loading cards */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.03] to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
      )}

      {/* High-Resolution image */}
      {layoutId ? (
        <motion.img
          layoutId={layoutId}
          src={resolvedSrc}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onClick={onClick}
          referrerPolicy="no-referrer"
          className={cn(
            "w-full h-full object-cover transition-all duration-[750ms] ease-out",
            isLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-105 blur-md",
            imageClassName
          )}
        />
      ) : (
        <img
          src={resolvedSrc}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          onClick={onClick}
          referrerPolicy="no-referrer"
          className={cn(
            "w-full h-full object-cover transition-all duration-[750ms] ease-out",
            isLoaded ? "opacity-100 scale-100 blur-0" : "opacity-0 scale-105 blur-lg",
            imageClassName
          )}
        />
      )}
    </div>
  );
}
