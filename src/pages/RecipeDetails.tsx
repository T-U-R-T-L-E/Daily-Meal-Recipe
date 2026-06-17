import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, limit } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';
import { Recipe } from '../types';
import { motion, AnimatePresence, useScroll, useTransform } from 'motion/react';
import { Clock, ChefHat, User, Share2, CalendarPlus, ChevronLeft, X, Zap, CheckCircle2, Play, Video, ArrowRight, Info, Heart, Calendar, Box, Link2, Download, Printer, FileJson, FileText, AlertTriangle, Star } from 'lucide-react';
import { format } from 'date-fns';
import { updateDoc, increment } from 'firebase/firestore';
import { cn, cleanRecipeImageUrl, getStableFoodImage } from '../lib/utils';
import CommentSection from '../components/recipes/CommentSection';
import ShareSheet from '../components/ui/ShareSheet';
import AccessDenied from '../components/auth/AccessDenied';
import { RecipeDetailsSkeleton } from '../components/recipes/RecipeSkeleton';
import { getRecipeWarnings } from '../lib/recipeWarnings';

export default function RecipeDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [substitutions, setSubstitutions] = useState<{ alternative: string; reason: string }[]>([]);
  const [ingredientInfo, setIngredientInfo] = useState<{
    description: string;
    benefits: string[];
    seasonality: string;
    storage: string;
    ingredient: string;
  } | null>(null);
  const [fetchingSubs, setFetchingSubs] = useState(false);
  const [fetchingInfo, setFetchingInfo] = useState(false);
  const [isCooking, setIsCooking] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showCookedModal, setShowCookedModal] = useState(false);
  const [cookedRating, setCookedRating] = useState(5);
  const [cookedRatingHover, setCookedRatingHover] = useState<number | null>(null);
  const [cookedReviewText, setCookedReviewText] = useState("");
  const [submittingCookedRating, setSubmittingCookedRating] = useState(false);

  const handleCopyDeepLink = async () => {
    if (!recipe) return;
    try {
      const deepLink = `${window.location.origin}/recipe/${recipe.id}`;
      await navigator.clipboard.writeText(deepLink);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy deep link:', err);
    }
  };

  const handleCookedRatingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !recipe || submittingCookedRating) return;
    setSubmittingCookedRating(true);
    try {
      const reviewPayload = {
        userId: user.uid,
        userName: user.displayName || 'Anonymous Chef',
        userPhoto: user.photoURL || '',
        comment: cookedReviewText.trim() || 'Cooked this recipe! It turned out perfectly.',
        rating: cookedRating,
        createdAt: serverTimestamp(),
        recipeId: recipe.id
      };

      await addDoc(collection(db, 'recipes', recipe.id, 'reviews'), reviewPayload);

      const reviewsSnap = await getDocs(collection(db, 'recipes', recipe.id, 'reviews'));
      const reviewsData = reviewsSnap.docs.map(doc => doc.data());
      const validRatings = reviewsData.filter(r => typeof r.rating === 'number' && r.rating > 0);
      const count = validRatings.length;
      const avg = count > 0 ? (validRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / count) : 0;

      await updateDoc(doc(db, 'recipes', recipe.id), {
        ratingsCount: count,
        averageRating: avg
      });

      setRecipe(prev => prev ? {
        ...prev,
        ratingsCount: count,
        averageRating: avg
      } : null);

      setShowCookedModal(false);
      setCookedReviewText('');
      setCookedRating(5);
    } catch (err) {
      console.error('Failed to submit cooked review:', err);
    } finally {
      setSubmittingCookedRating(false);
    }
  };

  const exportRecipe = (format: 'json' | 'text') => {
    if (!recipe) return;

    let content = '';
    let mimeType = '';
    let extension = '';

    if (format === 'json') {
      content = JSON.stringify(recipe, null, 2);
      mimeType = 'application/json';
      extension = 'json';
    } else {
      content = `${recipe.name.toUpperCase()}\n`;
      content += "=".repeat(recipe.name.length) + "\n\n";
      content += `${recipe.description}\n\n`;
      content += `Prep: ${recipe.prepTime} | Cook: ${recipe.cookTime} | Servings: ${recipe.servings}\n\n`;
      content += `INGREDIENTS\n`;
      content += "-----------\n";
      recipe.ingredients.forEach(ing => {
        content += `- ${ing.amount} ${ing.item}\n`;
      });
      content += `\nINSTRUCTIONS\n`;
      content += "------------\n";
      recipe.instructions.forEach((step, i) => {
        const stepText = typeof step === 'string' ? step : (step as any).text;
        content += `${i + 1}. ${stepText}\n`;
      });
      content += `\nGenerated by Discovery AI Choice`;
      mimeType = 'text/plain';
      extension = 'txt';
    }

    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${recipe.name.toLowerCase().replace(/\s+/g, '_')}_recipe.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setIsExportOpen(false);
  };

  useEffect(() => {
    async function loadRecipe() {
      if (!id) return;
      
      // Check if it's a discovered recipe from session storage
      if (id.startsWith('ai-')) {
        try {
          const aiResultsRaw = sessionStorage.getItem('ai_search_results');
          const aiResults = (aiResultsRaw && aiResultsRaw !== 'undefined') ? JSON.parse(aiResultsRaw) : [];
          const found = aiResults.find((r: Recipe) => r.id === id);
          if (found) {
            setRecipe(found);
            setLoading(false);
            return;
          }

          // Check offline storage too
          const savedRaw = localStorage.getItem('saved_recipes');
          const saved = (savedRaw && savedRaw !== 'undefined') ? JSON.parse(savedRaw) : [];
          const savedFound = saved.find((r: Recipe) => r.id === id);
          if (savedFound) {
            setRecipe(savedFound);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Failed to parse cached recipes", e);
        }

        // If it starts with ai- and we didn't find it locally, we should check if it was already indexed
        try {
            // Some AI recipes might have been indexed in Firestore by others
            // We only want to find public ones here for security
            const q = query(
              collection(db, 'recipes'), 
              where('id', '==', id), 
              where('isPublic', '==', true),
              limit(1)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                setRecipe({ id: snap.docs[0].id, ...snap.docs[0].data() } as Recipe);
                setLoading(false);
                return;
            }
        } catch (e) {
            console.error("Discovery index check failed", e);
        }

        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'recipes', id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const isAuthor = user?.uid === data.authorId;
          const isPublic = data.isPublic === true;
          const isAdmin = profile?.role === 'admin';

          if (!isPublic && !isAuthor && !isAdmin) {
            setPermissionDenied(true);
            setLoading(false);
            return;
          }

          setRecipe({ id: docSnap.id, ...data } as Recipe);
          // Increment view count
          await updateDoc(docRef, {
            viewCount: increment(1)
          }).catch(e => console.warn("View increment failed", e));
        } else {
          setRecipe(null);
        }
      } catch (error: any) {
        const isPermissionError = error?.code === 'permission-denied' || 
          error?.message?.toLowerCase().includes('permission') || 
          error?.message?.toLowerCase().includes('insufficient');
        
        if (isPermissionError) {
          setPermissionDenied(true);
        } else {
          handleFirestoreError(error, OperationType.GET, `recipes/${id}`);
        }
      } finally {
        setLoading(false);
      }
    }
    loadRecipe();
  }, [id]);

  const getSubstitutions = async (ingredient: string) => {
    setFetchingSubs(true);
    try {
      const res = await fetch('/api/ai/substitutions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient, dish: recipe?.name }),
      });
      const data = await res.json();
      setSubstitutions(data);
    } catch (error) {
      console.error(error);
    } finally {
      setFetchingSubs(false);
    }
  };

  const getIngredientInfo = async (ingredient: string) => {
    if (ingredientInfo?.ingredient === ingredient) return;
    setFetchingInfo(true);
    try {
      const res = await fetch('/api/ai/ingredient-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ingredient }),
      });
      const data = await res.json();
      setIngredientInfo({ ...data, ingredient });
    } catch (error) {
      console.error(error);
    } finally {
      setFetchingInfo(false);
    }
  };

  const importRecipe = async () => {
    if (!user || !recipe) return;
    try {
      // Remove AI-prefixed ID and other internal fields
      const { id: _, ...recipeData } = recipe;
      const isUserAdmin = profile?.role === 'admin' || user.email === 'lewisiraki1@gmail.com';
      const docRef = await addDoc(collection(db, 'recipes'), {
        ...recipeData,
        authorId: user.uid,
        createdAt: serverTimestamp(),
        isPublic: true,
        status: isUserAdmin ? 'approved' : 'pending',
        importDate: serverTimestamp() // Track when it was imported
      });
      alert('Recipe imported to your collection!');
      navigate(`/recipe/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'recipes');
    }
  };

  const addToPlanner = () => {
    if (!recipe) return;
    navigate('/planner', { 
      state: { 
        addRecipe: {
          id: recipe.id,
          name: recipe.name
        } 
      } 
    });
  };

  const markAsCooked = async () => {
    if (!user || !recipe || isCooking) return;
    setIsCooking(true);
    try {
      // 1. Log to history
      await addDoc(collection(db, 'cookingLogs'), {
        userId: user.uid,
        recipeId: recipe.id,
        recipeName: recipe.name,
        timestamp: serverTimestamp(),
        servings: servings
      });

      // 2. Update user profile stats
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        cookedCount: increment(1),
        lastCookedDate: format(new Date(), 'yyyy-MM-dd')
      });

      // 3. Update recipe cooked count (if not a temporary AI search result)
      if (!id?.startsWith('ai-')) {
        await updateDoc(doc(db, 'recipes', id!), {
          cookedCount: increment(1)
        }).catch(e => console.warn("Recipe cookedCount update failed", e));
      }

      setShowCookedModal(true);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'users/cookingLogs');
    } finally {
      setIsCooking(false);
    }
  };

  const handleShareRecipe = async () => {
    if (!recipe) return;

    const shareData = {
      title: recipe.name,
      text: recipe.description || `Check out this amazing ${recipe.name} recipe on Daily Meal Recipe!`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.warn('Native web share failed, opening share card:', err);
          setIsShareOpen(true);
        }
      }
    } else {
      setIsShareOpen(true);
    }
  };

  const { scrollY } = useScroll();
  const y = useTransform(scrollY, [0, 500], [0, 100]);

  const [servings, setServings] = useState(recipe?.servings || 4);
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());

  useEffect(() => {
    if (recipe?.servings) {
      setServings(recipe.servings);
    }
    // Reset checks when recipe changes
    setCheckedIngredients(new Set());
  }, [recipe]);

  const toggleIngredientCheck = (index: number) => {
    const newChecked = new Set(checkedIngredients);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedIngredients(newChecked);
  };

  const scaleIngredient = (baseAmount: number) => {
    if (!recipe?.servings) return baseAmount;
    return (baseAmount / recipe.servings) * servings;
  };

  if (loading) return <RecipeDetailsSkeleton />;
  if (permissionDenied) return <AccessDenied message="You do not have permission to view this recipe. This recipe is private and belongs to another user." />;
  if (!recipe) return <div className="h-96 flex items-center justify-center font-serif text-2xl">Recipe not found.</div>;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-16 pb-24"
    >
      <button 
        onClick={() => navigate('/discover')}
        className="flex items-center gap-3 text-white/60 hover:text-amber-accent transition-all group mb-4"
      >
        <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-all" />
        <span className="text-xs font-bold uppercase tracking-wider">Back</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-start">
        <div className="space-y-12">
          <div className="space-y-8">
            <motion.h1
              layoutId={`recipe-title-${recipe.id}`}
              className="font-serif text-7xl md:text-8xl font-light tracking-tight text-white leading-[0.8]"
            >
              {recipe.name}
            </motion.h1>
            <p className="text-xl text-gray-400 font-light italic leading-relaxed max-w-xl">
              {recipe.description}
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-8 py-10 border-y border-white/5">
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-amber-accent">Prep</span>
              <div className="text-white italic tracking-tight">{recipe.prepTime || '15 min'}</div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-amber-accent">Cook</span>
              <div className="text-white italic tracking-tight">{recipe.cookTime || recipe.cookingTime}</div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-amber-accent">Rest</span>
              <div className="text-white italic tracking-tight">{recipe.restTime || '-'}</div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-amber-accent">Difficulty</span>
              <div className="text-white font-bold uppercase text-xs tracking-wider">{recipe.difficulty}</div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-amber-accent">Rating</span>
              <div className="text-white italic tracking-tight flex items-center gap-1.5">
                <Star className="w-4 h-4 text-amber-500 fill-amber-500 animate-pulse" />
                <span>{recipe.averageRating ? recipe.averageRating.toFixed(1) : '5.0'}</span>
                <span className="text-xs text-white/40">({recipe.ratingsCount || 0})</span>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="text-xs uppercase tracking-wider font-bold text-amber-accent">Views</span>
              <div className="text-white italic tracking-tight">{recipe.viewCount ?? 0} Views</div>
            </div>
          </div>

          {/* Video Guide Section */}
          {recipe.videoUrl && (
            <div className="space-y-6">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-3">
                  <div className="bg-amber-accent/10 p-2 rounded-xl">
                    <Video className="w-5 h-5 text-amber-accent" />
                  </div>
                  <h4 className="font-serif text-2xl text-white italic">Video Guide</h4>
                </div>
                <button 
                  onClick={() => window.open(recipe.videoUrl, '_blank')}
                  className="text-xs font-bold uppercase tracking-wider text-amber-accent hover:text-white transition-colors"
                >
                  Open in YouTube
                </button>
              </div>

              {recipe.videoUrl.includes('youtube.com/watch?v=') || recipe.videoUrl.includes('youtu.be/') ? (
                <div className="aspect-video w-full rounded-[40px] overflow-hidden border border-white/10 bg-onyx shadow-2xl relative group">
                  <iframe
                    className="w-full h-full md:grayscale md:group-hover:grayscale-0 transition-all duration-700"
                    src={recipe.videoUrl.replace('watch?v=', 'embed/').replace('youtu.be/', 'youtube.com/embed/')}
                    title="Recipe Video Guide"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                  />
                </div>
              ) : (
                <motion.div 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 bg-white/5 border border-white/10 rounded-[40px] flex items-center justify-between group cursor-pointer hover:border-amber-accent transition-all"
                  onClick={() => window.open(recipe.videoUrl, '_blank')}
                >
                  <div className="flex items-center gap-6">
                    <div className="w-16 h-16 bg-amber-accent rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                      <Play className="w-6 h-6 text-black fill-current" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-accent mb-1">Cinematic Mastery</p>
                      <h4 className="font-serif text-2xl text-white italic">Search Video Guide</h4>
                    </div>
                  </div>
                  <ArrowRight className="w-8 h-8 text-white/10 group-hover:text-amber-accent/20 transition-colors mr-4" />
                </motion.div>
              )}
            </div>
          )}

          {/* Personalized Health Tip */}
          {(profile || recipe.healthAdvice) && (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-8 bg-onyx rounded-[32px] border border-white/5 space-y-4 shadow-xl"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-accent/10 rounded-xl">
                  <Zap className="w-5 h-5 text-amber-accent" />
                </div>
                <h4 className="font-serif text-xl text-white italic">Smart Health Context</h4>
              </div>
              <div className="space-y-4">
                {recipe.healthAdvice && (
                  <p className="text-xs text-gray-300 font-light italic leading-relaxed border-b border-white/5 pb-4">
                    <span className="text-amber-accent font-bold uppercase tracking-wider mr-2 underline underline-offset-4 decoration-amber-accent/20">Tailored Guidance:</span> 
                    {recipe.healthAdvice}
                  </p>
                )}
                {profile && profile.healthConditions?.includes('Diabetic') && (
                  <p className="text-xs text-gray-300 font-light italic leading-relaxed">
                    <span className="text-amber-accent font-bold uppercase tracking-wider mr-2 underline underline-offset-4 decoration-amber-accent/20">Diabetic Focus:</span> 
                    This recipe was generated with your sugar restrictions in mind. If you see honey or syrup, consider using a stevia-based substitute or reducing the amount by half.
                  </p>
                )}
                {profile && profile.fitnessGoals?.includes('Muscle Gain') && (
                  <p className="text-xs text-gray-300 font-light italic leading-relaxed">
                    <span className="text-amber-accent font-bold uppercase tracking-wider mr-2 underline underline-offset-4 decoration-amber-accent/20">Muscle Gain Tip:</span> 
                    Boost this meal by adding 30g of extra lean protein (like grilled chicken or tofu) to hit your anabolic window.
                  </p>
                )}
                {profile && profile.activityLevel === 'Athlete' && (
                  <p className="text-xs text-gray-300 font-light italic leading-relaxed">
                    <span className="text-amber-accent font-bold uppercase tracking-wider mr-2 underline underline-offset-4 decoration-amber-accent/20">Athlete Insight:</span> 
                    Your high activity level requires glycogen replenishment. Ensure you pair this with a high-quality complex carb if it doesn't already have one.
                  </p>
                )}
                {profile && (!profile.healthConditions?.length && !profile.fitnessGoals?.length && !recipe.healthAdvice) && (
                  <p className="text-xs text-gray-300 font-light italic leading-relaxed">
                    Configure your health conditions and fitness goals in your profile to receive smarter nutritional advice here.
                  </p>
                )}
              </div>
            </motion.div>
          )}

          {/* Safety Warning Guard */}
          {recipe && (
            <AnimatePresence>
              {(() => {
                const warnings = getRecipeWarnings(recipe, [], profile);
                if (warnings.length === 0) return null;
                return (
                  <motion.div
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    key="safety-warnings"
                    className="p-8 bg-red-500/5 rounded-[32px] border border-red-500/20 space-y-4 shadow-xl text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-500/10 rounded-xl">
                        <AlertTriangle className="w-5 h-5 text-red-500" />
                      </div>
                      <h4 className="font-serif text-xl text-red-400 italic">Diet & Health Safety Alerts</h4>
                    </div>
                    <div className="space-y-2.5">
                      {warnings.map((warn, index) => (
                        <div key={index} className="flex gap-3 items-start bg-red-500/[0.04] p-4 rounded-2xl border border-red-500/10">
                          <span className="w-2 h-2 rounded-full bg-red-500 mt-1.5 shrink-0" />
                          <div>
                            <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-0.5">{warn.tag}</p>
                            <p className="text-xs text-gray-300 font-light leading-relaxed">{warn.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>
          )}

          {/* Discovery Import Bar */}
          {id?.startsWith('ai-') && (
            <div className="bg-amber-accent/10 p-8 rounded-3xl border border-amber-accent/20 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-amber-accent mb-1">Smart Discovery</p>
                <p className="text-white font-serif text-xl italic">Found in the Global Savor Library</p>
              </div>
              <button 
                onClick={importRecipe}
                className="px-6 py-3 bg-white text-black rounded-full font-bold uppercase tracking-wider text-xs hover:bg-amber-accent transition-all"
              >
                Save to My Collection
              </button>
            </div>
          )}

          {/* Servings Adjuster */}
          <div className="bg-graphite p-8 rounded-3xl border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-amber-accent mb-1">Servings</p>
              <p className="text-white font-serif text-2xl italic">{servings} Servings</p>
            </div>
            <div className="flex items-center gap-4">
              <button 
                onClick={() => setServings(Math.max(1, servings - 1))}
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-amber-accent text-white transition-colors"
              >-</button>
              <button 
                onClick={() => setServings(servings + 1)}
                className="w-10 h-10 rounded-full border border-white/10 flex items-center justify-center hover:border-amber-accent text-white transition-colors"
              >+</button>
            </div>
          </div>

          <div className="flex gap-6">
             <button 
               onClick={addToPlanner}
               className="flex-1 px-10 py-5 bg-onyx border border-white/10 text-white rounded-full font-bold uppercase tracking-wider text-xs hover:border-amber-accent transition-all flex items-center justify-center gap-3"
             >
               <CalendarPlus className="w-4 h-4" />
               Add to Plan
             </button>
             <button 
               onClick={markAsCooked}
               disabled={isCooking}
               className="flex-1 px-10 py-5 bg-amber-accent text-black rounded-full font-bold uppercase tracking-wider text-xs hover:bg-white transition-all flex items-center justify-center gap-3 shadow-xl shadow-amber-accent/10 disabled:opacity-50"
             >
               {isCooking ? (
                 <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                   <ChefHat className="w-4 h-4" />
                 </motion.div>
               ) : (
                 <CheckCircle2 className="w-4 h-4" />
               )}
               {isCooking ? 'Logging...' : 'Mark Cooked'}
             </button>
          </div>

          <div className="flex gap-4 pt-4 border-t border-white/5">
            <button 
              onClick={() => {
                try {
                  const savedRaw = localStorage.getItem('saved_recipes');
                  const saved = (savedRaw && savedRaw !== 'undefined') ? JSON.parse(savedRaw) : [];
                  if (!saved.find((r: any) => r.id === recipe.id)) {
                    localStorage.setItem('saved_recipes', JSON.stringify([...saved, recipe]));
                    alert('Recipe saved for offline access.');
                  }
                } catch (e) {
                  console.error("Failed to save recipes", e);
                }
              }}
              className="flex-1 px-6 py-3 bg-graphite border border-white/10 text-white rounded-full text-[9px] font-bold uppercase tracking-[0.2em] hover:border-amber-accent transition-all flex items-center justify-center gap-2"
            >
              <Zap className="w-3 h-3 text-amber-accent" />
              Save Offline
            </button>
            <button 
              onClick={handleShareRecipe}
              className="flex-1 px-6 py-3 bg-graphite border border-white/10 text-white rounded-full text-[9px] font-bold uppercase tracking-[0.2em] hover:border-amber-accent transition-all flex items-center justify-center gap-2"
            >
              <Share2 className="w-3 h-3 text-amber-accent" />
              Share Recipe
            </button>
            <button 
              onClick={handleCopyDeepLink}
              className={cn(
                "flex-1 px-6 py-3 bg-graphite border rounded-full text-[9px] font-bold uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2",
                copiedLink ? "border-amber-accent text-amber-accent shadow-lg shadow-amber-accent/5" : "border-white/10 text-white hover:border-amber-accent"
              )}
            >
              <Link2 className="w-3 h-3 text-amber-accent" />
              {copiedLink ? 'Copied Link!' : 'Copy Deep Link'}
            </button>
            <div className="relative flex-1">
              <button 
                onClick={() => setIsExportOpen(!isExportOpen)}
                className="w-full px-6 py-3 bg-graphite border border-white/10 text-white rounded-full text-[9px] font-bold uppercase tracking-[0.2em] hover:border-amber-accent transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-3 h-3 text-amber-accent" />
                Export
              </button>
              
              <AnimatePresence>
                {isExportOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute bottom-full mb-4 left-0 right-0 bg-onyx border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50 p-2 space-y-1"
                  >
                    <button 
                      onClick={() => exportRecipe('text')}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                    >
                      <FileText className="w-4 h-4 text-amber-accent" />
                      <div>
                        <p className="text-[10px] font-bold text-white uppercase tracking-wider">Download Text</p>
                        <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Plain text file</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => exportRecipe('json')}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                    >
                      <FileJson className="w-4 h-4 text-amber-accent" />
                      <div>
                        <p className="text-[10px] font-bold text-white uppercase tracking-wider">Download JSON</p>
                        <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">Developer format</p>
                      </div>
                    </button>
                    <button 
                      onClick={() => window.print()}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 rounded-xl transition-colors text-left"
                    >
                      <Printer className="w-4 h-4 text-amber-accent" />
                      <div>
                        <p className="text-[10px] font-bold text-white uppercase tracking-wider">Print Recipe</p>
                        <p className="text-[8px] text-gray-500 uppercase tracking-widest mt-0.5">PDF or Paper</p>
                      </div>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </div>

        <ShareSheet 
          isOpen={isShareOpen}
          onClose={() => setIsShareOpen(false)}
          title={recipe.name}
          text={`Check out this amazing ${recipe.name} recipe on Discovery!`}
          url={window.location.href}
        />

         <div className="space-y-8">
          <div className="rounded-[48px] border border-white/5 overflow-hidden shadow-2xl relative group h-[500px]">
             <motion.img 
              layoutId={`recipe-img-${recipe.id}`}
              style={{ y }}
              src={cleanRecipeImageUrl(recipe.imageUrl, recipe.name, recipe.category, recipe.cuisine)}
              className="w-full h-[120%] object-cover md:grayscale md:group-hover:grayscale-0 transition-all duration-1000 scale-105 group-hover:scale-100 absolute top-[-10%]"
              alt={recipe.name}
              loading="eager"
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.onerror = null;
                e.currentTarget.src = getStableFoodImage(recipe.name, recipe.category, recipe.cuisine);
              }}
             />
             <div className="absolute inset-0 bg-gradient-to-t from-onyx/40 to-transparent pointer-events-none" />
          </div>

          {/* Nutrition Profile Section */}
          {recipe.nutrition && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-onyx p-10 rounded-[48px] border border-white/10 space-y-10 shadow-2xl relative overflow-hidden group"
            >
              <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                <ChefHat className="w-32 h-32 text-white" />
              </div>

              <div className="space-y-2">
                <p className="text-[10px] font-bold text-amber-accent uppercase tracking-[0.4em]">Composition</p>
                <h3 className="font-serif text-4xl text-white italic tracking-tight">Nutritional Profile</h3>
              </div>

              <div className="grid grid-cols-2 gap-8 relative z-10">
                <div className="p-6 bg-graphite/50 rounded-3xl border border-white/5 space-y-3">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Calories</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-serif text-white italic leading-none">{recipe.nutrition.calories}</span>
                    <span className="text-[10px] text-white/20 uppercase font-black">kcal</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (recipe.nutrition.calories / 800) * 100)}%` }}
                      className="h-full bg-amber-accent"
                    />
                  </div>
                </div>

                <div className="p-6 bg-graphite/50 rounded-3xl border border-white/5 space-y-3">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Protein</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-serif text-white italic leading-none">{recipe.nutrition.protein}</span>
                    <span className="text-[10px] text-white/20 uppercase font-black">g</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (recipe.nutrition.protein / 50) * 100)}%` }}
                      className="h-full bg-blue-400"
                    />
                  </div>
                </div>

                <div className="p-6 bg-graphite/50 rounded-3xl border border-white/5 space-y-3">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Carbs</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-serif text-white italic leading-none">{recipe.nutrition.carbs}</span>
                    <span className="text-[10px] text-white/20 uppercase font-black">g</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (recipe.nutrition.carbs / 100) * 100)}%` }}
                      className="h-full bg-emerald-400"
                    />
                  </div>
                </div>

                <div className="p-6 bg-graphite/50 rounded-3xl border border-white/5 space-y-3">
                  <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Fat</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-serif text-white italic leading-none">{recipe.nutrition.fat}</span>
                    <span className="text-[10px] text-white/20 uppercase font-black">g</span>
                  </div>
                  <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${Math.min(100, (recipe.nutrition.fat / 40) * 100)}%` }}
                      className="h-full bg-red-400"
                    />
                  </div>
                </div>

                {recipe.nutrition.fiber !== undefined && (
                  <div className="p-6 bg-graphite/50 rounded-3xl border border-white/5 space-y-3">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Fiber</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-serif text-white italic leading-none">{recipe.nutrition.fiber}</span>
                      <span className="text-[10px] text-white/20 uppercase font-black">g</span>
                    </div>
                  </div>
                )}

                {recipe.nutrition.sugar !== undefined && (
                  <div className="p-6 bg-graphite/50 rounded-3xl border border-white/5 space-y-3">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Sugar</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-serif text-white italic leading-none">{recipe.nutrition.sugar}</span>
                      <span className="text-[10px] text-white/20 uppercase font-black">g</span>
                    </div>
                  </div>
                )}

                {recipe.nutrition.sodium !== undefined && (
                  <div className="p-6 bg-graphite/50 rounded-3xl border border-white/5 space-y-3">
                    <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block">Sodium</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-serif text-white italic leading-none">{recipe.nutrition.sodium}</span>
                      <span className="text-[10px] text-white/20 uppercase font-black">mg</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-6 border-t border-white/5">
                <p className="text-[9px] text-white/20 uppercase tracking-[0.2em] font-medium italic">
                  * Values indicated are per serving based on {servings} total servings.
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-20 pt-16 border-t border-white/5">
        <div className="space-y-10">
          <div className="space-y-3 flex justify-between items-end">
            <div>
              <h3 className="font-serif text-4xl font-light text-white italic">Ingredients</h3>
              <p className="text-xs text-amber-accent/60 font-bold uppercase tracking-wider">Click an ingredient for substitutions</p>
            </div>
            <button 
              onClick={() => {
                const text = recipe.ingredients.map(ing => `- ${ing.item}: ${ing.baseAmount ? `${scaleIngredient(ing.baseAmount).toFixed(1)} ${ing.unit || ''}` : ing.amount}`).join('\n');
                navigator.clipboard.writeText(text);
                alert('Ingredients copied to clipboard!');
              }}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-full text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-white hover:border-white/30 transition-all flex items-center gap-2"
            >
              Copy List
            </button>
          </div>
          <ul className="space-y-4">
            {recipe.ingredients.map((ing, i) => (
              <motion.li
                key={i}
                whileHover={{ x: 8, borderColor: 'rgba(245, 158, 11, 0.5)' }}
                className={cn(
                  "flex items-center justify-between p-5 bg-graphite rounded-2xl border transition-all shadow-sm group",
                  checkedIngredients.has(i) ? "border-amber-accent/20 bg-onyx/40" : "border-white/5"
                )}
              >
                <div className="flex items-center gap-4 flex-grow cursor-pointer" onClick={() => toggleIngredientCheck(i)}>
                  <div className={cn(
                    "w-6 h-6 rounded-lg border flex items-center justify-center transition-all",
                    checkedIngredients.has(i) ? "bg-amber-accent border-amber-accent text-black" : "border-white/10 text-white/10 group-hover:border-white/20"
                  )}>
                    {checkedIngredients.has(i) && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                  <span className={cn(
                    "font-light italic transition-all",
                    checkedIngredients.has(i) ? "text-white/20 line-through" : "text-gray-400 group-hover:text-white"
                  )}>
                    {ing.item}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <span className={cn(
                    "font-bold text-amber-accent text-xs px-3 py-1 bg-amber-accent/10 rounded-lg uppercase tracking-wider",
                    checkedIngredients.has(i) && "opacity-20"
                  )}>
                    {ing.baseAmount ? `${scaleIngredient(ing.baseAmount).toFixed(1)} ${ing.unit || ''}` : ing.amount}
                  </span>
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        getIngredientInfo(ing.item);
                      }}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-amber-accent/10 rounded-full transition-all text-amber-accent/40 hover:text-amber-accent"
                      title="Ingredient info"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        getSubstitutions(ing.item);
                      }}
                      className="p-2 opacity-0 group-hover:opacity-100 hover:bg-amber-accent/10 rounded-full transition-all text-amber-accent/40 hover:text-amber-accent"
                      title="Get substitutions"
                    >
                      <Zap className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </motion.li>
            ))}
          </ul>

          <AnimatePresence mode="wait">
            {fetchingInfo && (
              <motion.div
                key="loading-info"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-8 bg-white/5 border border-white/10 rounded-[40px] space-y-4 animate-pulse"
              >
                <div className="h-4 w-1/4 bg-white/10 rounded-full" />
                <div className="h-8 w-3/4 bg-white/10 rounded-full" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-white/5 rounded-full" />
                  <div className="h-3 w-full bg-white/5 rounded-full" />
                  <div className="h-3 w-2/3 bg-white/5 rounded-full" />
                </div>
              </motion.div>
            )}

            {ingredientInfo && !fetchingInfo && (
              <motion.div
                key="ingredient-info"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="p-8 bg-onyx border border-amber-accent/30 rounded-[40px] space-y-8 relative overflow-hidden shadow-2xl"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-amber-accent mb-1">Deep Dive</p>
                    <h4 className="font-serif text-3xl italic text-white leading-none">{ingredientInfo.ingredient}</h4>
                  </div>
                  <button onClick={() => setIngredientInfo(null)} className="p-2 hover:bg-white/5 rounded-full transition-colors text-white/40 hover:text-white">
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <p className="text-gray-400 text-sm italic font-light leading-relaxed pr-8 border-l border-amber-accent/20 pl-6">
                  {ingredientInfo.description}
                </p>

                <div className="grid grid-cols-1 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-amber-accent/60">
                      <Heart className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Health Benefits</span>
                    </div>
                    <ul className="space-y-2">
                      {ingredientInfo.benefits.map((benefit, i) => (
                        <li key={i} className="text-[11px] text-gray-300 flex items-start gap-2 italic">
                          <CheckCircle2 className="w-3 h-3 text-amber-accent mt-0.5 shrink-0" />
                          {benefit}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 rounded-2xl space-y-2 border border-white/5">
                      <div className="flex items-center gap-2 text-amber-accent/60">
                        <Calendar className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Season</span>
                      </div>
                      <p className="text-[11px] text-gray-300 italic">{ingredientInfo.seasonality}</p>
                    </div>
                    <div className="p-4 bg-white/5 rounded-2xl space-y-2 border border-white/5">
                      <div className="flex items-center gap-2 text-amber-accent/60">
                        <Box className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-bold uppercase tracking-widest">Storage</span>
                      </div>
                      <p className="text-[11px] text-gray-300 italic">{ingredientInfo.storage}</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {substitutions.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                className="p-8 bg-amber-accent text-black rounded-[32px] space-y-6 relative overflow-hidden shadow-2xl shadow-amber-accent/20"
              >
                <div className="flex items-center justify-between">
                  <h4 className="font-serif text-2xl italic leading-none">Substitutions</h4>
                  <button onClick={() => setSubstitutions([])} className="p-1 hover:bg-black/10 rounded-full transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
                <div className="space-y-5">
                  {substitutions.map((sub, i) => (
                    <div key={i} className="space-y-1.5 border-b border-black/10 pb-4 last:border-0 last:pb-0">
                      <p className="text-sm font-bold uppercase tracking-wider">{sub.alternative}</p>
                      <p className="text-xs font-medium italic opacity-70 leading-relaxed">{sub.reason}</p>
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="md:col-span-2 space-y-12">
          <h3 className="font-serif text-4xl font-light text-white italic border-b border-white/5 pb-4">Instructions</h3>
          <div className="space-y-16">
            {recipe.instructions.map((step, i) => {
              const text = typeof step === 'string' ? step : step.text;
              const imageUrl = typeof step === 'object' ? step.imageUrl : null;
              const tips = typeof step === 'object' ? step.tips : null;

              return (
                <div key={i} className="group">
                  <div className="flex flex-col lg:flex-row gap-12 relative">
                    <div className="font-serif text-[120px] text-white/5 font-bold leading-none absolute -left-12 -top-10 -z-0 select-none group-hover:text-amber-accent/5 transition-colors">
                      {i + 1}
                    </div>
                    <div className="flex-1 relative pt-4 space-y-6">
                      <span className="text-xs uppercase tracking-wider font-bold text-amber-accent block">Step {i + 1}</span>
                      <p className="text-xl text-gray-100 font-light leading-relaxed italic pr-12">
                        {text}
                      </p>
                      {tips && (
                        <div className="p-4 bg-white/5 border-l-2 border-amber-accent/40 rounded-r-xl">
                          <p className="text-xs uppercase font-black tracking-widest text-amber-accent/60 mb-1">Pro Tip</p>
                          <p className="text-gray-300 text-sm italic">{tips}</p>
                        </div>
                      )}
                    </div>
                    {imageUrl && (
                      <div className="w-full lg:w-48 h-48 rounded-3xl overflow-hidden border border-white/10 shrink-0 shadow-xl group-hover:border-amber-accent/20 transition-all bg-white/[0.01]">
                        <img 
                          src={imageUrl} 
                          alt={`Step ${i + 1}`} 
                          className="w-full h-full object-cover md:grayscale md:group-hover:grayscale-0 transition-all duration-700" 
                          referrerPolicy="no-referrer"
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&q=60&w=400";
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="pt-24 border-t border-white/5">
        <div className="max-w-4xl mx-auto">
          <CommentSection recipeId={recipe.id} />
        </div>
      </div>

      {/* Cooked Rating Celebration Modal */}
      <AnimatePresence>
        {showCookedModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-onyx border border-white/10 p-10 rounded-[40px] max-w-md w-full relative space-y-6 shadow-2xl shadow-amber-accent/5 overflow-hidden"
            >
              {/* Decorative background glow */}
              <div className="absolute top-0 right-0 w-44 h-44 bg-amber-accent/5 rounded-full blur-[80px]" />
              
              <button 
                onClick={() => setShowCookedModal(false)}
                className="absolute top-6 right-6 p-2 text-white/40 hover:text-white hover:bg-white/5 rounded-full transition-all"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="space-y-2 text-center">
                <div className="mx-auto bg-amber-accent/10 p-4 rounded-3xl w-fit">
                  <ChefHat className="w-8 h-8 text-amber-accent" />
                </div>
                <h3 className="font-serif text-3xl font-light text-white italic">Culinary Triumph!</h3>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-accent">You marked this recipe as cooked</p>
                <p className="text-sm font-light text-gray-400 italic">How did it turn out? Rate your experience and leave a note for the community.</p>
              </div>

              <form onSubmit={handleCookedRatingSubmit} className="space-y-6">
                {/* 5-star raw selector */}
                <div className="space-y-2 text-center">
                  <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Select Rating</span>
                  <div className="flex justify-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setCookedRating(star)}
                        onMouseEnter={() => setCookedRatingHover(star)}
                        onMouseLeave={() => setCookedRatingHover(null)}
                        className="hover:scale-125 active:scale-95 transition-transform p-1 cursor-pointer"
                      >
                        <Star
                          className={`w-8 h-8 transition-colors ${
                            star <= (cookedRatingHover ?? cookedRating)
                              ? "text-amber-500 fill-amber-500"
                              : "text-white/10"
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <p className="text-xs font-bold uppercase tracking-wider text-amber-accent leading-none mt-1">
                    {cookedRating === 5 ? 'Masterpiece (5/5)' : cookedRating === 4 ? 'Delicious (4/5)' : cookedRating === 3 ? 'Good (3/5)' : cookedRating === 2 ? 'Fair (2/5)' : 'Needs Work (1/5)'}
                  </p>
                </div>

                {/* Optional review input */}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-white/40">Optional Tip/Note</label>
                  <textarea
                    value={cookedReviewText}
                    onChange={(e) => setCookedReviewText(e.target.value)}
                    placeholder="E.g., I added a pinch of lemon zest, and it elevated the dish beautifully!"
                    className="w-full bg-graphite border border-white/5 rounded-2xl p-4 text-white text-sm font-light italic focus:outline-none focus:border-amber-accent/50 transition-all min-h-[100px] resize-none shadow-inner"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submittingCookedRating}
                  className="w-full py-4 bg-amber-accent text-black rounded-2xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-white hover:scale-[1.02] transition-all disabled:opacity-50 shadow-xl shadow-amber-accent/10 flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submittingCookedRating ? 'Submitting...' : 'Submit Rating & Tip'}
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
