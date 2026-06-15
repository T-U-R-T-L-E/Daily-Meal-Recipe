import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { Clock, ChefHat, Heart, ArrowUpRight, AlertTriangle } from 'lucide-react';
import { Recipe } from '../../types';
import { cn } from '../../lib/utils';
import { useAuth } from '../../lib/useAuth';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { collection, query, where, getDocs, addDoc, deleteDoc, doc, serverTimestamp, onSnapshot } from 'firebase/firestore';
import { getRecipeWarnings } from '../../lib/recipeWarnings';

interface Props {
  recipe: Recipe;
  index: number;
  activeTags?: string[];
}

export default function RecipeCard({ recipe, index, activeTags = [] }: Props) {
  const { user, profile } = useAuth();
  const [isFavorited, setIsFavorited] = useState(false);
  const [favoriteId, setFavoriteId] = useState<string | null>(null);
  const [isToggling, setIsToggling] = useState(false);
  const [imageSrc, setImageSrc] = useState(recipe.imageUrl || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600`);
  const [imgLoading, setImgLoading] = useState(true);

  const warnings = getRecipeWarnings(recipe, activeTags, profile);

  useEffect(() => {
    setImageSrc(recipe.imageUrl || `https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=600`);
    setImgLoading(true);
  }, [recipe.imageUrl]);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid),
      where('recipeId', '==', recipe.id)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        setIsFavorited(true);
        setFavoriteId(snapshot.docs[0].id);
      } else {
        setIsFavorited(false);
        setFavoriteId(null);
      }
    }, (error) => {
      console.error("Favorite sync error:", error);
    });

    return () => unsubscribe();
  }, [user, recipe.id]);

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user || isToggling) return;

    setIsToggling(true);
    try {
      if (isFavorited && favoriteId) {
        await deleteDoc(doc(db, 'favorites', favoriteId));
      } else {
        await addDoc(collection(db, 'favorites'), {
          userId: user.uid,
          recipeId: recipe.id,
          recipeName: recipe.name,
          recipeImage: recipe.imageUrl || null,
          category: recipe.category || null,
          createdAt: serverTimestamp()
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'favorites');
    } finally {
      setIsToggling(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      className="group bg-graphite rounded-[24px] overflow-hidden border border-white/5 transition-all hover:border-amber-accent/50 hover:shadow-[0_0_40px_rgba(245,158,11,0.1)]"
    >
      <Link to={`/recipe/${recipe.id}`} className="block relative aspect-[4/5] overflow-hidden bg-white/[0.01]">
        {imgLoading && (
          <div className="absolute inset-0 bg-white/[0.02] animate-pulse flex items-center justify-center">
            <ChefHat className="w-8 h-8 text-amber-accent/20 animate-spin" />
          </div>
        )}
        <motion.img
          layoutId={`recipe-img-${recipe.id}`}
          src={imageSrc}
          alt={recipe.name}
          loading="lazy"
          referrerPolicy="no-referrer"
          onLoad={() => setImgLoading(false)}
          onError={() => {
            console.warn(`Fallback image triggered for: ${recipe.name}`);
            setImageSrc(`https://images.unsplash.com/featured/600x800/?food,${encodeURIComponent(recipe.category || recipe.name)}`);
            setImgLoading(false);
          }}
          className={cn(
            "w-full h-full object-cover transition-all duration-700 group-hover:scale-110 md:grayscale md:group-hover:grayscale-0",
            imgLoading ? "opacity-0" : "opacity-100"
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-onyx via-transparent to-transparent opacity-80" />
        
        <div className="absolute bottom-6 left-6 right-6 flex justify-end items-end">
          <div className="bg-amber-accent p-3 rounded-full text-black shadow-lg shadow-amber-accent/20 translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300">
            <ArrowUpRight className="w-5 h-5" />
          </div>
        </div>
      </Link>

      <div className="p-8 space-y-4">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1 flex-1">
            <div className="flex flex-wrap gap-1.5">
               {recipe.category && <span className="text-[8px] px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-white/40 uppercase font-bold tracking-widest">{recipe.category}</span>}
               {recipe.cuisine && <span className="text-[8px] px-2 py-0.5 bg-amber-accent/10 border border-amber-accent/20 rounded-full text-amber-accent uppercase font-bold tracking-widest">{recipe.cuisine}</span>}
            </div>
            <motion.h3
              layoutId={`recipe-title-${recipe.id}`}
              className="font-serif text-2xl font-light text-white group-hover:text-amber-accent transition-colors mt-1.5"
            >
              {recipe.name}
            </motion.h3>

            {/* Health & Diet Warning Indicators */}
            {warnings.length > 0 && (
              <div className="mt-3 space-y-1.5">
                {warnings.map((warn, wIdx) => (
                  <div
                    key={wIdx}
                    className={cn(
                      "flex items-start gap-1.5 px-3 py-2 rounded-xl border text-[9px] font-semibold tracking-wider leading-tight",
                      warn.severity === 'critical'
                        ? "bg-red-500/10 border-red-500/20 text-red-400"
                        : "bg-amber-500/10 border-amber-500/20 text-amber-400"
                    )}
                  >
                    <AlertTriangle className={cn("w-3 h-3 shrink-0 mt-0.5", warn.severity === 'critical' ? "text-red-500" : "text-amber-accent")} />
                    <span className="flex-1 font-sans">{warn.message}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <button 
            onClick={toggleFavorite}
            disabled={isToggling}
            className={cn(
              "transition-all pt-1 cursor-pointer disabled:opacity-50",
              isFavorited ? "text-red-500 hover:text-red-400" : "text-white/20 hover:text-white"
            )}
          >
            <Heart className={cn("w-5 h-5 transition-transform", isFavorited && "fill-current scale-110")} />
          </button>
        </div>

        <p className="text-gray-500 text-sm font-light line-clamp-2 leading-relaxed italic">
          {recipe.description}
        </p>

        <div className="pt-4 flex items-center justify-between border-t border-white/5">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
              <Clock className="w-3 h-3 text-amber-accent" />
              {recipe.cookingTime}
            </div>
            <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40">
              <ChefHat className="w-3 h-3 text-amber-accent" />
              {recipe.difficulty}
            </div>
          </div>
          
          <div className="flex items-center gap-3">
             {recipe.viewCount !== undefined && (
               <div className="text-[8px] font-black tracking-widest text-white/20 uppercase flex items-center gap-1">
                 <span className="text-white/40">{recipe.viewCount || 0}</span> Views
               </div>
             )}
             {recipe.saveCount !== undefined && (
               <div className="text-[8px] font-black tracking-widest text-white/20 uppercase flex items-center gap-1">
                 <span className="text-amber-accent/40">{recipe.saveCount || 0}</span> Saves
               </div>
             )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}
