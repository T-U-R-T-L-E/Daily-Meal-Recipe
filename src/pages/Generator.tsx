import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Plus, X, Wand2, ChefHat, Save, Package, Check, ChevronDown, ChevronUp, Play, Eye, RotateCcw } from 'lucide-react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';
import { Recipe, UserProfile } from '../types';
import { cn } from '../lib/utils';
import { useNavigate } from 'react-router-dom';
import { useBackgroundJobs } from '../lib/BackgroundJobContext';
import { useErrorUX, InlineErrorHelper } from '../lib/ErrorUXContext';
import AIConsentModal from '../components/AIConsentModal';

export default function Generator() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { addJob, jobs, cancelJob, toggleMinimize } = useBackgroundJobs();
  const { handleError } = useErrorUX();

  const [ingredients, setIngredients] = useState<string[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [saving, setSaving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('Dinner');
  const [pantryItems, setPantryItems] = useState<{name: string, id: string}[]>([]);
  const [showPantry, setShowPantry] = useState(false);
  const [pantryLoading, setPantryLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isConsentOpen, setIsConsentOpen] = useState(false);

  // Find if there's active recipe generation job running
  const activeGeneratorJob = jobs.find(j => j.type === 'recipe_generation' && j.status === 'running');
  const hasBackgroundGenerator = activeGeneratorJob && activeGeneratorJob.minimized;
  const isLocalLoaderActive = (activeGeneratorJob && !activeGeneratorJob.minimized) || loading;

  // Listen to background recipe completion event in case user navigates away or keeps app open
  useEffect(() => {
    const handleRecipeReady = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setRecipe(detail);
      setLoading(false);
    };
    window.addEventListener('recipe_ready', handleRecipeReady);
    return () => window.removeEventListener('recipe_ready', handleRecipeReady);
  }, []);

  useEffect(() => {
    async function loadUserData() {
      if (!user) return;
      setPantryLoading(true);
      try {
        // Load Pantry
        const q = query(collection(db, 'pantry'), where('userId', '==', user.uid));
        const snapshot = await getDocs(q);
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          name: doc.data().item
        }));
        setPantryItems(items);

        // Load Profile
        const profSnap = await getDoc(doc(db, 'users', user.uid));
        if (profSnap.exists()) {
          setUserProfile(profSnap.data() as UserProfile);
        }
      } catch (error) {
        console.error("Error loading user data:", error);
      } finally {
        setPantryLoading(false);
      }
    }
    loadUserData();
  }, [user]);

  const categories = ["Breakfast", "Lunch", "Dinner", "Snack", "Dessert"];

  const togglePantryItem = (name: string) => {
    if (ingredients.includes(name)) {
      setIngredients(ingredients.filter(i => i !== name));
    } else {
      setIngredients([...ingredients, name]);
    }
  };

  const addIngredient = () => {
    if (currentInput.trim() && !ingredients.includes(currentInput.trim())) {
      setIngredients([...ingredients, currentInput.trim()]);
      setCurrentInput('');
    }
  };

  const removeIngredient = (item: string) => {
    setIngredients(ingredients.filter(i => i !== item));
  };

  const generateRecipe = () => {
    if (ingredients.length === 0) return;
    const hasConsent = localStorage.getItem('ai_consent_accepted') === 'true';
    if (!hasConsent) {
      setIsConsentOpen(true);
      return;
    }
    executeRecipeGeneration();
  };

  const executeRecipeGeneration = () => {
    setLoading(true);
    setError(null);
    setRecipe(null);

    addJob(
      'recipe_generation',
      'Artisanal Recipe Craft',
      {
        ingredients,
        userContext: userProfile ? {
          healthConditions: userProfile.healthConditions,
          fitnessGoals: userProfile.fitnessGoals,
          activityLevel: userProfile.activityLevel
        } : undefined
      },
      '/api/ai/generate-recipe',
      (data) => {
        setRecipe(data);
        setLoading(false);
      },
      (err) => {
        const friendlyVal = handleError(err, {
          componentName: 'Generator',
          actionName: 'generateRecipe',
          preferredPlacement: 'inline'
        });
        setError(friendlyVal);
        setLoading(false);
      }
    );
  };

  const saveRecipe = async () => {
    if (!recipe || !user) return;
    setSaving(true);
    try {
      const isUserAdmin = profile?.role === 'admin' || user.email === 'lewisiraki1@gmail.com';
      const docRef = await addDoc(collection(db, 'recipes'), {
        ...recipe,
        category: selectedCategory,
        authorId: user.uid,
        isPublic: true,
        status: isUserAdmin ? 'approved' : 'pending',
        createdAt: serverTimestamp(),
      });
      navigate(`/recipe/${docRef.id}`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'recipes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-16">
      <div className="text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-4 py-1 border border-amber-accent/20 bg-amber-accent/5 text-amber-accent rounded-full text-xs uppercase tracking-wider font-bold">
          <Sparkles className="w-3 h-3" />
          Recipe Generator
        </div>
        <h1 className="font-serif text-6xl font-light text-white leading-[0.9]">
          Recipe <span className="italic text-amber-accent">Generator.</span>
        </h1>
        <p className="text-gray-500 font-light max-w-lg mx-auto italic text-lg">
          Add your ingredients and we'll create a unique recipe for you.
        </p>
      </div>

      <div className="bg-graphite p-10 rounded-[40px] border border-white/5 shadow-2xl space-y-10">
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="w-full md:flex-1 md:pr-4">
              <div className="flex gap-2 sm:gap-4">
                <input
                  type="text"
                  placeholder="What ingredients do you have?"
                  value={currentInput}
                  onChange={(e) => setCurrentInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addIngredient()}
                  className="flex-1 px-4 sm:px-8 py-4 sm:py-5 bg-onyx border border-white/10 rounded-2xl focus:outline-none focus:border-amber-accent/50 text-white italic placeholder:text-white/20 text-sm sm:text-base min-w-0"
                />
                <button
                  onClick={addIngredient}
                  className="px-5 sm:px-8 py-4 sm:py-5 bg-amber-accent text-black rounded-2xl hover:bg-white transition-all font-bold uppercase tracking-wider text-[10px] sm:text-xs shrink-0"
                >
                  Add
                </button>
              </div>
            </div>
            
            <button 
              onClick={() => setShowPantry(!showPantry)}
              className={cn(
                "w-full md:w-auto h-14 md:h-[68px] px-6 sm:px-8 rounded-2xl border transition-all flex items-center justify-center md:justify-start gap-3 font-bold uppercase tracking-wider text-xs shrink-0",
                showPantry 
                  ? "bg-amber-accent border-amber-accent text-black" 
                  : "bg-white/5 border-white/10 text-white/60 hover:text-white hover:border-white/20"
              )}
            >
              <Package className="w-4 h-4" />
              My Pantry
              {showPantry ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          <AnimatePresence>
            {showPantry && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="p-8 bg-onyx rounded-3xl border border-white/5 space-y-6 mt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase tracking-wider text-white/40">From your kitchen</h3>
                    {pantryLoading && <div className="w-4 h-4 border-2 border-amber-accent/20 border-t-amber-accent rounded-full animate-spin" />}
                  </div>
                  
                  {pantryItems.length === 0 ? (
                    <p className="text-gray-600 italic font-light">Your pantry is empty. Add items in the Pantry tab first!</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {pantryItems.map(item => (
                        <button
                          key={item.id}
                          onClick={() => togglePantryItem(item.name)}
                          className={cn(
                            "px-4 py-3 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all flex items-center gap-2",
                            ingredients.includes(item.name)
                              ? "bg-amber-accent/10 border-amber-accent text-amber-accent"
                              : "bg-white/5 border-white/10 text-white/40 hover:border-white/20 hover:text-white"
                          )}
                        >
                          {ingredients.includes(item.name) && <Check className="w-3 h-3" />}
                          {item.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap gap-3">
            <AnimatePresence>
              {ingredients.map((item) => (
                <motion.span
                  key={item}
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.8, opacity: 0 }}
                  className="px-5 py-2.5 bg-onyx text-white rounded-full text-[11px] font-bold uppercase tracking-tighter flex items-center gap-3 group border border-white/10 hover:border-amber-accent/50 transition-colors"
                >
                  {item}
                  <button onClick={() => removeIngredient(item)} className="text-white/40 hover:text-red-500 transition-colors">
                    <X className="w-3 h-3" />
                  </button>
                </motion.span>
              ))}
            </AnimatePresence>
          </div>
        </div>

        <InlineErrorHelper message={error} className="text-sm bg-rose-500/5 p-6 rounded-3xl border border-rose-500/10 italic text-rose-450 justify-center font-sans tracking-wide leading-relaxed" />

        {isLocalLoaderActive ? (
          <div className="bg-onyx/60 p-8 rounded-[32px] border border-amber-accent/10 space-y-6 shadow-2xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/[0.01] to-transparent w-[200%] -translate-x-full animate-[shimmer_2s_infinite]" />
            
            <div className="flex justify-between items-center text-xs text-amber-accent font-black uppercase tracking-widest relative z-10">
              <span className="flex items-center gap-2">
                <ChefHat className="w-4 h-4 text-amber-accent animate-bounce" />
                Artisanal AI Chef is cooking...
              </span>
              <span>{Math.round(activeGeneratorJob ? activeGeneratorJob.progress : 15)}%</span>
            </div>

            <div className="h-3 bg-white/5 rounded-full overflow-hidden relative z-10">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${activeGeneratorJob ? activeGeneratorJob.progress : 15}%` }}
                transition={{ ease: "easeInOut" }}
                className="h-full bg-amber-accent rounded-full shadow-[0_0_15px_rgba(245,158,11,0.4)]"
              />
            </div>

            <div className="flex justify-between items-center relative z-10 pt-2">
              <div className="flex items-center gap-3 text-xs text-gray-400 font-light italic">
                <Sparkles className="w-3.5 h-3.5 text-amber-accent animate-pulse" />
                <span>{activeGeneratorJob ? activeGeneratorJob.stepText : "Preheating cloud stoves..."}</span>
              </div>
              
              {activeGeneratorJob && (
                <div className="flex gap-4">
                  <button
                    onClick={() => toggleMinimize(activeGeneratorJob.id)}
                    className="text-[10px] text-amber-accent hover:text-white uppercase font-bold tracking-wider transition-colors cursor-pointer"
                  >
                    Run in Background
                  </button>
                  <button
                    onClick={() => cancelJob(activeGeneratorJob.id)}
                    className="text-[10px] text-red-400 hover:text-red-300 uppercase font-bold tracking-wider transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {hasBackgroundGenerator && (
              <div className="p-5 bg-amber-accent/5 border border-amber-accent/20 rounded-2xl flex items-center justify-between text-xs">
                <span className="text-white/60 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-accent animate-ping" />
                  Your recipe is being handcrafted in the background. Feel free to browse.
                </span>
                <button
                  onClick={() => toggleMinimize(activeGeneratorJob.id)}
                  className="px-4 py-2 bg-amber-accent text-black font-bold uppercase tracking-wider text-[10px] rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" /> Back to Foreground
                </button>
              </div>
            )}
            
            <button
              onClick={generateRecipe}
              disabled={ingredients.length === 0}
              className="w-full py-6 bg-amber-accent text-black rounded-3xl font-serif text-2xl flex items-center justify-center gap-4 hover:bg-white disabled:opacity-30 disabled:grayscale transition-all group shadow-xl shadow-amber-accent/10 cursor-pointer"
            >
              Generate Recipe
              <Wand2 className="w-6 h-6 group-hover:rotate-12 transition-transform" />
            </button>
          </div>
        )}
      </div>

      {recipe && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-graphite rounded-[40px] border border-white/5 overflow-hidden shadow-2xl relative"
        >
          <div className="absolute top-8 right-8 z-20 flex items-center gap-4">
             <div className="bg-black/40 backdrop-blur-xl p-2 rounded-2xl border border-white/10 flex gap-1">
               {categories.map(cat => (
                 <button
                   key={cat}
                   onClick={() => setSelectedCategory(cat)}
                   className={cn(
                     "px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all",
                     selectedCategory === cat ? "bg-amber-accent text-black" : "text-white/40 hover:text-white"
                   )}
                 >
                   {cat}
                 </button>
               ))}
             </div>
             <button
              onClick={saveRecipe}
              disabled={saving}
              className="px-8 py-4 bg-white text-black rounded-full font-bold text-xs uppercase tracking-wider hover:bg-amber-accent transition-all flex items-center gap-3 shadow-2xl"
            >
              {saving ? 'Saving...' : 'Save to Collection'}
              <Save className="w-4 h-4" />
            </button>
          </div>

          <div className="aspect-[21/9] w-full bg-onyx relative overflow-hidden group">
             <img 
               src={recipe.imageUrl || "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200"} 
               className="w-full h-full object-cover opacity-60 mix-blend-overlay md:grayscale md:group-hover:grayscale-0 transition-all duration-700"
               alt={recipe.name}
             />
             <div className="absolute inset-0 bg-gradient-to-t from-onyx via-onyx/40 to-transparent" />
             
             {recipe.videoUrl && (
               <button 
                 onClick={() => window.open(recipe.videoUrl, '_blank')}
                 className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
               >
                 <div className="w-16 h-16 bg-amber-accent rounded-full flex items-center justify-center shadow-2xl scale-90 group-hover:scale-100 transition-transform">
                   <Play className="w-6 h-6 text-black fill-current ml-1" />
                 </div>
               </button>
             )}

             <div className="absolute bottom-12 left-12 right-12 text-white space-y-4">
                <div className="flex items-center gap-6 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-accent">
                  <span className="flex items-center gap-2"><ChefHat className="w-4 h-4" /> {recipe.difficulty}</span>
                  <span>•</span>
                  <span>{recipe.cookingTime}</span>
                </div>
                <h2 className="font-serif text-6xl font-light leading-tight">{recipe.name}</h2>
             </div>
          </div>

          <div className="p-16 grid grid-cols-1 md:grid-cols-3 gap-20">
            <div className="space-y-8">
              <h3 className="font-serif text-3xl font-light text-white italic border-b border-white/5 pb-4">Ingredients</h3>
              <ul className="space-y-6">
                {recipe.ingredients.map((ing, i) => (
                  <li key={i} className="flex justify-between items-center gap-6">
                    <span className="text-gray-400 font-light text-lg">{ing.item}</span>
                    <span className="font-bold text-amber-accent text-xs px-3 py-1 bg-amber-accent/10 rounded-lg uppercase tracking-wider">{ing.amount}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="md:col-span-2 space-y-12 border-l border-white/5 pl-0 md:pl-20">
              <h3 className="font-serif text-3xl font-light text-white italic border-b border-white/5 pb-4">Instructions</h3>
              <div className="space-y-12">
                {recipe.instructions.map((step, i) => (
                  <div key={i} className="flex gap-10 relative">
                    <span className="font-serif text-8xl text-white/5 font-bold leading-none absolute -left-12 -top-4 -z-0">{i + 1}</span>
                    <div className="relative z-10 pt-2">
                       <span className="text-xs font-bold uppercase tracking-wider text-amber-accent mb-2 block">Step {i + 1}</span>
                       <p className="text-gray-300 text-lg font-light leading-relaxed italic">
                         {typeof step === 'string' ? step : step.text}
                       </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <AIConsentModal
        isOpen={isConsentOpen}
        onClose={() => setIsConsentOpen(false)}
        onAccept={executeRecipeGeneration}
        dataTypesToSend={['Ingredients Inventory', 'Selected Category (' + selectedCategory + ')', 'Custom Profile Allergies & Health Goals']}
      />
    </div>
  );
}
