import { motion } from 'motion/react';
import { ChefHat, Clock, Sparkles } from 'lucide-react';

/**
 * A beautiful, elegant shimmer element for standard loading states
 */
export function Shimmer({ className = "h-4 bg-white/5 rounded-lg" }: { className?: string }) {
  return (
    <div className={`shimmer-bar relative overflow-hidden ${className}`}>
      <motion.div
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          repeat: Infinity,
          duration: 1.6,
          ease: "linear",
        }}
        className="shimmer-wave absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.05] to-transparent w-[50%]"
      />
    </div>
  );
}

/**
 * High-fidelity skeleton that mimics the exact live RecipeCard layout
 */
export function RecipeCardSkeleton() {
  return (
    <div className="bg-graphite rounded-[24px] overflow-hidden border border-white/5 space-y-4">
      {/* Aspect Image Frame */}
      <div className="shimmer-box relative aspect-[4/5] bg-white/[0.02] flex items-center justify-center overflow-hidden">
        <ChefHat className="text-skeleton-muted w-10 h-10 text-white/5 animate-pulse" />
        <Shimmer className="absolute inset-0 w-full h-full" />
      </div>

      {/* Details Container */}
      <div className="p-8 space-y-5">
        <div className="space-y-3">
          {/* Tags */}
          <div className="flex gap-2">
            <Shimmer className="h-4 w-12 rounded-full" />
            <Shimmer className="h-4 w-16 rounded-full" />
          </div>
          {/* Title */}
          <div className="space-y-2">
            <Shimmer className="h-7 w-4/5" />
            <Shimmer className="h-7 w-2/3" />
          </div>
        </div>

        {/* Description */}
        <div className="space-y-2 pt-1">
          <Shimmer className="h-3.5 w-full" />
          <Shimmer className="h-3.5 w-[90%]" />
        </div>

        {/* Footer info bar */}
        <div className="pt-5 border-t border-white/5 flex items-center justify-between">
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Clock className="text-skeleton-icon w-3.5 h-3.5 text-white/10" />
              <Shimmer className="h-3.5 w-12" />
            </div>
            <div className="flex items-center gap-2">
              <ChefHat className="text-skeleton-icon w-3.5 h-3.5 text-white/10" />
              <Shimmer className="h-3.5 w-14" />
            </div>
          </div>
          <Shimmer className="h-3 w-10" />
        </div>
      </div>
    </div>
  );
}

/**
 * Skeletal layout that matches the dual-column RecipeDetails page perfectly
 */
export function RecipeDetailsSkeleton() {
  return (
    <div className="space-y-12 animate-pulse">
      {/* Large Header Section */}
      <div className="shimmer-box relative h-[450px] md:h-[550px] rounded-[36px] bg-white/[0.02] overflow-hidden border border-white/5 flex flex-col justify-end p-12">
        <Shimmer className="absolute inset-0 w-full h-full" />
        <div className="relative space-y-4 max-w-2xl">
          <div className="flex gap-3">
            <Shimmer className="h-5 w-20 rounded-full" />
            <Shimmer className="h-5 w-24 rounded-full" />
          </div>
          <Shimmer className="h-14 w-4/5" />
          <Shimmer className="h-10 w-1/2" />
          <div className="flex gap-6 pt-2">
            <Shimmer className="h-4 w-24" />
            <Shimmer className="h-4 w-28" />
          </div>
        </div>
      </div>

      {/* Main Grid Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
        {/* Ingredients List Left column */}
        <div className="space-y-6">
          <Shimmer className="h-8 w-2/3 border-b border-white/5 pb-2" />
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="flex justify-between items-center py-2">
                <Shimmer className="h-4 w-1/2" />
                <Shimmer className="h-6 w-16" />
              </div>
            ))}
          </div>
        </div>

        {/* Instructions Steps right columns */}
        <div className="lg:col-span-2 space-y-10 pl-0 lg:pl-10 lg:border-l border-white/5">
          <Shimmer className="h-8 w-1/3 border-b border-white/5 pb-2" />
          <div className="space-y-10">
            {[1, 2, 3].map(i => (
              <div key={i} className="space-y-4">
                <div className="flex items-center gap-4">
                  <Shimmer className="h-8 w-8 rounded-full" />
                  <Shimmer className="h-5 w-20" />
                </div>
                <div className="space-y-2 pl-12">
                  <Shimmer className="h-4 w-full" />
                  <Shimmer className="h-4 w-[95%]" />
                  <Shimmer className="h-4 w-[80%]" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * Profile page skeleton mimic
 */
export function ProfileSkeleton() {
  return (
    <div className="space-y-12 animate-pulse">
      {/* Minimal Header card */}
      <div className="bg-graphite p-10 rounded-[32px] border border-white/5 flex flex-col md:flex-row items-center gap-8">
        <div className="shimmer-box w-24 h-24 rounded-full bg-white/5 relative overflow-hidden shrink-0">
          <Shimmer className="absolute inset-0 w-full h-full" />
        </div>
        <div className="space-y-4 flex-grow w-full">
          <Shimmer className="h-8 w-48" />
          <Shimmer className="h-5 w-36" />
          <div className="flex gap-4 pt-2">
            <Shimmer className="h-6 w-20" />
            <Shimmer className="h-6 w-24" />
          </div>
        </div>
      </div>

      {/* Core Lists */}
      <div className="space-y-6">
        <Shimmer className="h-7 w-32" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => <RecipeCardSkeleton key={i} />)}
        </div>
      </div>
    </div>
  );
}

/**
 * Week Calendar screen placeholder for MealPlanner
 */
export function MealPlannerSkeleton() {
  return (
    <div className="space-y-10 animate-pulse">
      <div className="flex justify-between items-center">
        <Shimmer className="h-10 w-48" />
        <Shimmer className="h-10 w-32 rounded-xl" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
        {[1, 2, 3, 4, 5, 6, 7].map(i => (
          <div key={i} className="bg-graphite p-4 rounded-2xl border border-white/5 space-y-4">
            <Shimmer className="h-4 w-12 mx-auto" />
            <Shimmer className="h-6 w-8 mx-auto rounded-full" />
            <div className="space-y-2 pt-2">
              <Shimmer className="h-16 w-full rounded-xl" />
              <Shimmer className="h-16 w-full rounded-xl" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Leaderboard Master ranking lists skeleton structure
 */
export function LeaderboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="text-center space-y-4 max-w-xl mx-auto">
        <Shimmer className="h-5 w-24 mx-auto rounded-full" />
        <Shimmer className="h-12 w-3/4 mx-auto" />
        <Shimmer className="h-4 w-1/2 mx-auto" />
      </div>

      <div className="bg-graphite rounded-[32px] border border-white/5 p-8 max-w-4xl mx-auto space-y-4">
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} className="flex items-center justify-between p-4 border-b border-white/5 last:border-0">
            <div className="flex items-center gap-4">
              <Shimmer className="h-8 w-8 rounded-full" />
              <div className="shimmer-box w-10 h-10 rounded-full bg-white/5" />
              <div className="space-y-2">
                <Shimmer className="h-4 w-24" />
                <Shimmer className="h-3 w-16" />
              </div>
            </div>
            <div className="flex items-center gap-6">
              <Shimmer className="h-4 w-12" />
              <Shimmer className="h-6 w-16 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Beautiful Progress Indicator for Uploads, AI scanning, and downloads
 */
export function ProgressIndicator({
  title = "Analyzing elements",
  subtitle = "Evaluating structural composition...",
  progress = 40,
  className = ""
}: {
  title?: string;
  subtitle?: string;
  progress: number;
  className?: string;
}) {
  return (
    <div className={`p-8 bg-coal/80 backdrop-blur-md rounded-[32px] border border-white/10 max-w-md w-full mx-auto space-y-5 shadow-2xl relative overflow-hidden ${className}`}>
      <div className="space-y-1">
        <span className="text-[10px] font-black uppercase tracking-widest text-amber-accent flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 animate-spin" /> {title}
        </span>
        <p className="text-xs text-gray-400 font-light">{subtitle}</p>
      </div>

      {/* Track bar */}
      <div className="space-y-2">
        <div className="h-2 bg-white/5 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: '0%' }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="h-full bg-amber-accent rounded-full shadow-[0_0_10px_rgba(245,158,11,0.5)]"
          />
        </div>
        <div className="flex justify-between items-center text-[10px] text-white/40 uppercase font-black">
          <span>PROGRESS</span>
          <span className="text-amber-accent">{Math.round(progress)}%</span>
        </div>
      </div>
    </div>
  );
}
