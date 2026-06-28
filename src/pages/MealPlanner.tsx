import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';
import { MealPlan } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  addDays, 
  startOfWeek, 
  subDays, 
  startOfMonth, 
  endOfMonth, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths 
} from 'date-fns';
import { 
  Trash2, 
  ChevronRight, 
  ChevronLeft, 
  ChefHat, 
  Plus, 
  X, 
  Sparkles, 
  CalendarRange, 
  ShoppingCart, 
  Check, 
  Search, 
  Calendar as CalendarIcon, 
  ListPlus,
  ArrowRight
} from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { MealPlannerSkeleton } from '../components/recipes/RecipeSkeleton';
import AuthModal from '../components/auth/AuthModal';
import { cacheOfflineItems, getOfflineItems, addOfflineItem, deleteOfflineItem } from '../lib/indexedDb';

// Gourmet Chef-Curated fallback database for flawless ingrediet-based shopping list aggregation
const INCLUDED_GOURMET_RECIPES = [
  {
    id: "gourmet-lemon-garlic-roast-chicken",
    name: "Gourmet Lemon Garlic Roast Chicken",
    category: "Dinner",
    ingredients: [
      { item: "Organic Chicken Breast", amount: "350 g", unit: "g", category: "Proteins" },
      { item: "Organic Lemon", amount: "1 pc", unit: "pc", category: "Vegetables" },
      { item: "Fresh Garlic Cloves", amount: "4 cloves", unit: "cloves", category: "Spices" },
      { item: "Grass-Fed Butter", amount: "20 g", unit: "g", category: "Dairy" },
      { item: "Fresh Thyme Sprigs", amount: "3 pcs", unit: "pcs", category: "Spices" },
      { item: "Extra Virgin Olive Oil", amount: "15 ml", unit: "ml", category: "Oils & Vinegars" }
    ]
  },
  {
    id: "herb-crusted-pan-seared-salmon",
    name: "Herb-Crusted Pan-Seared Salmon",
    category: "Dinner",
    ingredients: [
      { item: "Atlantic Salmon Fillets", amount: "300 g", unit: "g", category: "Proteins" },
      { item: "Fresh Dill Sprigs", amount: "10 g", unit: "g", category: "Spices" },
      { item: "Flat Leaf Parsley", amount: "15 g", unit: "g", category: "Spices" },
      { item: "Dijon Mustard", amount: "15 g", unit: "g", category: "Other" },
      { item: "Extra Virgin Olive Oil", amount: "20 ml", unit: "ml", category: "Oils & Vinegars" },
      { item: "Fresh Lemon", amount: "1 pc", unit: "pc", category: "Vegetables" }
    ]
  },
  {
    id: "gourmet-lemon-butter-baked-cod",
    name: "Gourmet Lemon Butter Baked Cod",
    category: "Dinner",
    ingredients: [
      { item: "Pacific Cod Fillets", amount: "350 g", unit: "g", category: "Proteins" },
      { item: "Grass-Fed Butter", amount: "25 g", unit: "g", category: "Dairy" },
      { item: "Fresh Garlic Cloves", amount: "3 cloves", unit: "cloves", category: "Spices" },
      { item: "Capers in Brine", amount: "15 g", unit: "g", category: "Other" },
      { item: "Fresh Lemon", amount: "1 pc", unit: "pc", category: "Vegetables" },
      { item: "Fresh Flat Parsley", amount: "10 g", unit: "g", category: "Spices" }
    ]
  },
  {
    id: "artisanal-vegan-coconut-lentil-curry",
    name: "Artisanal Vegan Coconut Lentil Curry",
    category: "Dinner",
    ingredients: [
      { item: "Organic Red Lentils", amount: "200 g", unit: "g", category: "Grains" },
      { item: "Organic Coconut Milk", amount: "400 ml", unit: "ml", category: "Other" },
      { item: "Crushed Tomatoes", amount: "400 g", unit: "g", category: "Vegetables" },
      { item: "Fresh Ginger Root", amount: "15 g", unit: "g", category: "Spices" },
      { item: "Curry Powder Blend", amount: "10 g", unit: "g", category: "Spices" },
      { item: "Fresh Spinach Leaves", amount: "100 g", unit: "g", category: "Vegetables" }
    ]
  },
  {
    id: "avocado-sourdough-toast-with-egg",
    name: "Avocado Sourdough Toast with Egg",
    category: "Breakfast",
    ingredients: [
      { item: "Ripe Hass Avocado", amount: "1 pc", unit: "pc", category: "Vegetables" },
      { item: "Artisanal Sourdough", amount: "2 slices", unit: "slices", category: "Grains" },
      { item: "Organic Pastured Eggs", amount: "2 pcs", unit: "pcs", category: "Proteins" },
      { item: "Cherry Tomatoes", amount: "100 g", unit: "g", category: "Vegetables" },
      { item: "Chili Flakes", amount: "2 g", unit: "g", category: "Spices" }
    ]
  },
  {
    id: "artisanal-mediterranean-quinoa-bowl",
    name: "Artisanal Mediterranean Quinoa Bowl",
    category: "Lunch",
    ingredients: [
      { item: "Organic White Quinoa", amount: "150 g", unit: "g", category: "Grains" },
      { item: "English Cucumber", amount: "100 g", unit: "g", category: "Vegetables" },
      { item: "Cherry Tomatoes", amount: "100 g", unit: "g", category: "Vegetables" },
      { item: "Kalamata Olives", amount: "50 g", unit: "g", category: "Other" },
      { item: "Greek Feta Cheese", amount: "75 g", unit: "g", category: "Dairy" },
      { item: "Extra Virgin Olive Oil", amount: "20 ml", unit: "ml", category: "Oils & Vinegars" }
    ]
  },
  {
    id: "classic-tuscan-garlic-butter-steak",
    name: "Classic Tuscan Garlic Butter Steak",
    category: "Dinner",
    ingredients: [
      { item: "Prime Ribeye Steak", amount: "400 g", unit: "g", category: "Proteins" },
      { item: "Garlic Cloves", amount: "4 cloves", unit: "cloves", category: "Spices" },
      { item: "Fresh Rosemary Sprigs", amount: "3 pcs", unit: "pcs", category: "Spices" },
      { item: "Grass-Fed Butter", amount: "30 g", unit: "g", category: "Dairy" },
      { item: "Sea Salt Crystals", amount: "5 g", unit: "g", category: "Spices" }
    ]
  },
  {
    id: "rustic-italian-tomato-herb-pasta",
    name: "Rustic Italian Tomato Herb Pasta",
    category: "Dinner",
    ingredients: [
      { item: "Bronze-Cut Spaghetti", amount: "200 g", unit: "g", category: "Grains" },
      { item: "Peeled San Marzano Tomatoes", amount: "400 g", unit: "g", category: "Vegetables" },
      { item: "Fresh Sweet Basil", amount: "20 g", unit: "g", category: "Spices" },
      { item: "Extra Virgin Olive Oil", amount: "30 ml", unit: "ml", category: "Oils & Vinegars" },
      { item: "Parmigiano-Reggiano", amount: "40 g", unit: "g", category: "Dairy" }
    ]
  }
];

export default function MealPlanner() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  
  // Single synchronized focus date & interactive view mode toggling
  const [focalDate, setFocalDate] = useState<Date>(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('week');
  const [selectedDateStr, setSelectedDateStr] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const startAddingMeal = (dateStr: string, recipeData?: { id: string, name: string } | null) => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    setAddingTo({ date: dateStr, type: 'dinner' });
    if (recipeData) {
      setCustomInput(recipeData.name);
      setSelectedRecipeId(recipeData.id);
    } else {
      setCustomInput('');
      setSelectedRecipeId('custom');
    }
  };


  const pendingRecipe = useMemo(() => location.state?.addRecipe as { id: string, name: string } | null, [location.state]);

  // Handle setting active slot or recipe when navigation carries state
  useEffect(() => {
    if (pendingRecipe) {
      // Prompt user instantly by matching the pending date or focus on today
      setSelectedDateStr(format(new Date(), 'yyyy-MM-dd'));
    }
  }, [pendingRecipe]);

  // Load user's families for Shared Kitchen Council integration
  const [families, setFamilies] = useState<any[]>([]);
  const [activeFamily, setActiveFamily] = useState<any | null>(null);
  const [loadingFamilies, setLoadingFamilies] = useState(true);

  // Load families in real-time
  useEffect(() => {
    if (!user || !user.email) {
      setLoadingFamilies(false);
      return;
    }

    setLoadingFamilies(true);
    const q = query(
      collection(db, 'families'),
      where('members', 'array-contains', user.email.toLowerCase())
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFamilies(list);
        
        const storedFamilyId = localStorage.getItem('active_kitchen_family_id');
        if (list.length > 0) {
          const found = list.find(f => f.id === storedFamilyId);
          if (found) {
            setActiveFamily(found);
          }
        } else {
          setActiveFamily(null);
        }
        setLoadingFamilies(false);
      },
      (err) => {
        console.error("Failed to load families:", err);
        setLoadingFamilies(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Load meal plans in real-time matching the active circle
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    let isSubscribed = true;
    let unsubscribe: any = null;

    const loadMealPlans = async () => {
      // If we are offline, load immediately from IndexedDB
      if (!navigator.onLine) {
        try {
          const offlinePlans = await getOfflineItems('meal_plans');
          if (isSubscribed) {
            setPlans(offlinePlans);
            setLoading(false);
          }
        } catch (e) {
          console.error("Failed to load offline meal plans", e);
        }
        return;
      }

      let q = query(
        collection(db, 'mealPlans'),
        where('userId', '==', user.uid)
      );

      if (activeFamily) {
        q = query(
          collection(db, 'mealPlans'),
          where('familyId', '==', activeFamily.id)
        );
      }

      unsubscribe = onSnapshot(q, 
        (snapshot) => {
          const data = snapshot.docs.map(doc => {
            const d = doc.data();
            return {
              id: doc.id,
              ...d
            } as MealPlan;
          });

          // Filter and sort client-side (to avoid index layout crashes)
          const filteredAndSorted = (activeFamily 
            ? data 
            : data.filter(item => !(item as any).familyId))
            .sort((a, b) => a.date.localeCompare(b.date));

          if (isSubscribed) {
            setPlans(filteredAndSorted);
            setLoading(false);
          }
          // Cache to IndexedDB
          cacheOfflineItems('meal_plans', filteredAndSorted).catch(err => console.warn("Failed to cache meal plans:", err));
        },
        async (err) => {
          console.warn("Firestore meal plans sync failed, using offline fallback:", err);
          try {
            const offlinePlans = await getOfflineItems('meal_plans');
            if (isSubscribed) {
              setPlans(offlinePlans);
              setLoading(false);
            }
          } catch (e) {
            console.error("Failed to load offline meal plans on Firestore error", e);
          }
        }
      );
    };

    loadMealPlans();

    return () => {
      isSubscribed = false;
      if (unsubscribe) unsubscribe();
    };
  }, [user, activeFamily]);

  const removePlan = async (id: string) => {
    // Optimistic UI update
    setPlans(prev => prev.filter(plan => plan.id !== id));

    try {
      await deleteOfflineItem('meal_plans', id);
      if (navigator.onLine && !id.startsWith('temp-')) {
        await deleteDoc(doc(db, 'mealPlans', id));
      }
    } catch (error) {
      console.error("Failed to delete meal plan:", error);
      if (navigator.onLine) {
        handleFirestoreError(error, OperationType.DELETE, `mealPlans/${id}`);
      }
    }
  };

  const addCustomMeal = async (date: string, mealType: "breakfast" | "lunch" | "dinner" | "snack" | "dessert", recipeName: string, recipeId: string = 'custom') => {
    if (!user || !recipeName.trim()) return;

    const tempId = 'temp-' + Date.now();
    const mealToAdd: MealPlan = {
      id: tempId,
      userId: user.uid,
      date,
      mealType,
      recipeName: recipeName.trim(),
      recipeId: recipeId,
      createdAt: new Date() as any,
      addedByName: user.displayName || 'Anonymous Cook',
      addedByPhoto: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`,
    };

    if (activeFamily) {
      mealToAdd.familyId = activeFamily.id;
    }

    // Optimistic UI update
    setPlans(prev => [...prev, mealToAdd].sort((a, b) => a.date.localeCompare(b.date)));

    try {
      if (navigator.onLine) {
        const docRef = await addDoc(collection(db, 'mealPlans'), {
          userId: mealToAdd.userId,
          date: mealToAdd.date,
          mealType: mealToAdd.mealType,
          recipeName: mealToAdd.recipeName,
          recipeId: mealToAdd.recipeId,
          addedByName: mealToAdd.addedByName,
          addedByPhoto: mealToAdd.addedByPhoto,
          createdAt: serverTimestamp(),
          ...(mealToAdd.familyId ? { familyId: mealToAdd.familyId } : {})
        });
        // Replace temp ID with real ID in items and IndexedDB
        setPlans(prev => prev.map(item => item.id === tempId ? { ...item, id: docRef.id } : item));
        await addOfflineItem('meal_plans', { ...mealToAdd, id: docRef.id });
      } else {
        await addOfflineItem('meal_plans', mealToAdd);
      }

      if (pendingRecipe && recipeId !== 'custom') {
        navigate(location.pathname, { replace: true, state: {} });
      }
    } catch (error) {
      console.error("Failed to add meal plan:", error);
      if (navigator.onLine) {
        handleFirestoreError(error, OperationType.CREATE, 'mealPlans');
      }
    }
  };

  // Weeks arithmetic
  const weekStart = startOfWeek(focalDate, { weekStartsOn: 1 });
  const daysInWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // Months arithmetic (covers 42 grid cells starting on Monday)
  const monthStart = startOfMonth(focalDate);
  const monthGridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const daysInMonthGrid = Array.from({ length: 42 }, (_, i) => addDays(monthGridStart, i));

  const [addingTo, setAddingTo] = useState<{date: string, type: "breakfast" | "lunch" | "dinner" | "snack" | "dessert"} | null>(null);
  const [customInput, setCustomInput] = useState('');
  const [selectedRecipeId, setSelectedRecipeId] = useState<string>('custom');

  // Load and memoize user-saved custom local recipes combined with chef fallback list for instant dropdown selection
  const availableRecipesList = useMemo(() => {
    let saved: any[] = [];
    try {
      const raw = localStorage.getItem('saved_recipes');
      saved = raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.warn("Could not read saved recipes for picking list", e);
    }

    const combined = [
      ...saved.map(r => ({ id: r.id || 'custom', name: r.name, ingredients: r.ingredients || [], source: 'Saved Bookmarks' })),
      ...INCLUDED_GOURMET_RECIPES.map(r => ({ id: r.id, name: r.name, ingredients: r.ingredients, source: 'Gourmet Chef Collection' }))
    ];

    // Filter duplicate entries
    const seen = new Set<string>();
    return combined.filter(item => {
      const norm = item.name.toLowerCase().trim();
      if (seen.has(norm)) return false;
      seen.add(norm);
      return true;
    });
  }, []);

  // Filter recipes dynamically based on the current text typed inside search picker boxes
  const filteredSuggestions = useMemo(() => {
    const queryTerm = customInput.toLowerCase().trim();
    if (!queryTerm) {
      // Default recommended gourmet options
      return availableRecipesList.slice(0, 5);
    }
    return availableRecipesList.filter(r => r.name.toLowerCase().includes(queryTerm));
  }, [customInput, availableRecipesList]);

  // Aggregate shopping values strictly scoped to the active calendar view (visible range)
  const visiblePlans = useMemo(() => {
    if (viewMode === 'week') {
      const weekDaysStrs = daysInWeek.map(d => format(d, 'yyyy-MM-dd'));
      return plans.filter(p => weekDaysStrs.includes(p.date));
    } else {
      const activeMonthStr = format(focalDate, 'yyyy-MM');
      return plans.filter(p => p.date.startsWith(activeMonthStr));
    }
  }, [plans, viewMode, focalDate, daysInWeek]);

  // Shopping List Aggregator Logic
  const aggregatedIngredients = useMemo(() => {
    const resolvedRecipes: any[] = [];
    const customPlannedMealsList: string[] = [];

    // Get live bookmarks
    let bookmarks: any[] = [];
    try {
      const raw = localStorage.getItem('saved_recipes');
      bookmarks = raw ? JSON.parse(raw) : [];
    } catch (e) {}

    for (const plan of visiblePlans) {
      if (plan.recipeId === 'custom') {
        customPlannedMealsList.push(plan.recipeName || 'Custom Recipe');
      } else {
        const gourmetMatch = INCLUDED_GOURMET_RECIPES.find(r => r.id === plan.recipeId);
        if (gourmetMatch) {
          resolvedRecipes.push(gourmetMatch);
        } else {
          const bookmarkMatch = bookmarks.find(r => r.id === plan.recipeId);
          if (bookmarkMatch) {
            resolvedRecipes.push(bookmarkMatch);
          } else {
            customPlannedMealsList.push(plan.recipeName || 'Custom Recipe');
          }
        }
      }
    }

    // Accumulating map
    const ingredientsMap: Record<
      string, 
      { item: string; totalAmount: number; unit: string; category: string; count: number }
    > = {};

    for (const rec of resolvedRecipes) {
      const ingredients = rec.ingredients || [];
      for (const ing of ingredients) {
        if (!ing.item) continue;
        const key = ing.item.toLowerCase().trim();
        const amtStr = String(ing.amount || '');
        const numMatch = amtStr.match(/^([\d.]+)/);
        const numValue = numMatch ? parseFloat(numMatch[1]) : 0;
        const unit = ing.unit || amtStr.replace(/^[\d.\s]+/, '').trim() || 'As needed';
        const category = ing.category || 'Other';

        if (ingredientsMap[key]) {
          if (numValue > 0 && ingredientsMap[key].unit === unit) {
            ingredientsMap[key].totalAmount += numValue;
          }
          ingredientsMap[key].count += 1;
        } else {
          ingredientsMap[key] = {
            item: ing.item,
            totalAmount: numValue,
            unit: unit,
            category: category,
            count: 1
          };
        }
      }
    }

    // Format resolved ones
    const ingredientsOutput = Object.values(ingredientsMap).map(i => {
      const formattedAmount = i.totalAmount > 0 ? `${i.totalAmount} ${i.unit}` : i.unit;
      return {
        item: i.item,
        amount: formattedAmount,
        category: i.category,
        count: i.count,
        type: 'recipe_ingredient' as const
      };
    });

    // Group custom recipes simply
    const customUniqueMeals = Array.from(new Set(customPlannedMealsList)).map(name => {
      const totalCount = customPlannedMealsList.filter(x => x === name).length;
      return {
        item: name,
        amount: totalCount > 1 ? `${totalCount} portions` : "As needed",
        category: "Other Planned Custom Foods",
        count: totalCount,
        type: "pantry_fallback_item" as const
      };
    });

    return [...ingredientsOutput, ...customUniqueMeals];
  }, [visiblePlans]);

  // Export state mechanics
  const [exporting, setExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState(false);

  const handleExportShoppingList = async () => {
    if (!user || aggregatedIngredients.length === 0) return;
    setExporting(true);
    setExportSuccess(false);

    try {
      for (const ingredient of aggregatedIngredients) {
        const itemBody: any = {
          userId: user.uid,
          item: ingredient.item,
          amount: ingredient.amount,
          category: ingredient.category,
          completed: false,
          createdAt: serverTimestamp(),
          addedByName: user.displayName || 'Anonymous Cook',
          addedByPhoto: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`,
        };

        if (activeFamily) {
          itemBody.familyId = activeFamily.id;
        }

        await addDoc(collection(db, 'shoppingLists'), itemBody);
      }

      setExportSuccess(true);
      setTimeout(() => setExportSuccess(false), 5000);
    } catch (err) {
      console.error("Failed to commit pantry batch export:", err);
      alert("A database disruption occurred while attempting to backup groceries. Please retry.");
    } finally {
      setExporting(false);
    }
  };

  if (loading) return <MealPlannerSkeleton />;

  return (
    <div className="space-y-16 max-w-7xl mx-auto px-4 lg:px-0">
      
      {/* Shared Kitchen Council Selector Box */}
      {user && (families.length > 0) && (
        <div className="bg-graphite/40 border border-white/5 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-accent/10 border border-amber-accent/20 flex items-center justify-center text-amber-accent shrink-0">
              <Sparkles className="w-5 h-5 text-amber-accent animate-pulse" />
            </div>
            <div>
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-accent">Shared Kitchen Council</p>
              <h3 className="text-sm font-bold text-white">
                {activeFamily ? `Co-Op Mode: ${activeFamily.name}` : "Solo Kitchen Mode"}
              </h3>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-bold text-white/30 uppercase tracking-widest mr-1">Active Circle:</span>
            <select
              value={activeFamily?.id || 'solo'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'solo') {
                  setActiveFamily(null);
                  localStorage.removeItem('active_kitchen_family_id');
                } else {
                  const found = families.find(f => f.id === val);
                  if (found) {
                    setActiveFamily(found);
                    localStorage.setItem('active_kitchen_family_id', found.id);
                  }
                }
              }}
              className="bg-onyx border border-white/10 rounded-xl px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-white focus:outline-none focus:border-amber-accent cursor-pointer"
            >
              <option value="solo">Solo Kitchen (Private)</option>
              {families.map(f => (
                <option key={f.id} value={f.id}>{f.name} (Shared)</option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main Upper Segment controls */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-3">
          <h1 className="font-serif text-6xl font-light text-white tracking-tight">Meal Plan</h1>
          <p className="text-gray-500 font-light text-lg italic tracking-tight">
            Plan your gourmet recipes on an elegant weekly or monthly calendar.
          </p>
        </div>

        {/* Calendar View toggle and active pager */}
        <div className="flex flex-wrap items-center gap-4">
          
          {/* Calendar Toggle Buttons */}
          <div className="flex items-center p-1 bg-graphite rounded-2xl border border-white/5 shrink-0">
            <button
              onClick={() => setViewMode('week')}
              className={cn(
                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'week' 
                  ? "bg-amber-accent text-black font-extrabold shadow-md"
                  : "text-white/40 hover:text-white/80"
              )}
            >
              Weekly
            </button>
            <button
              onClick={() => setViewMode('month')}
              className={cn(
                "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                viewMode === 'month' 
                  ? "bg-amber-accent text-black font-extrabold shadow-md"
                  : "text-white/40 hover:text-white/80"
              )}
            >
              Monthly
            </button>
          </div>

          {/* Date range switcher pager widgets */}
          <div className="flex items-center gap-4 bg-graphite p-2 rounded-2xl border border-white/5 shrink-0">
             <button 
               onClick={() => {
                 if (viewMode === 'week') {
                   setFocalDate(subDays(focalDate, 7));
                 } else {
                   setFocalDate(subMonths(focalDate, 1));
                 }
               }}
               className="p-2 hover:bg-onyx rounded-full transition-colors text-white/40 hover:text-amber-accent"
             >
               <ChevronLeft className="w-4 h-4" />
             </button>
             
             <span className="text-[10px] font-mono tracking-widest font-extrabold px-2 text-white/80">
               {viewMode === 'week' ? (
                 <>
                   {format(weekStart, 'MMM d')} — {format(addDays(weekStart, 6), 'MMM d')}
                 </>
               ) : (
                 format(focalDate, 'MMMM yyyy')
               )}
             </span>

             <button 
               onClick={() => {
                 if (viewMode === 'week') {
                   setFocalDate(addDays(focalDate, 7));
                 } else {
                   setFocalDate(addMonths(focalDate, 1));
                 }
               }}
               className="p-2 hover:bg-onyx rounded-full transition-colors text-white/40 hover:text-amber-accent"
             >
               <ChevronRight className="w-4 h-4" />
             </button>
          </div>

          {/* Jump to Today option */}
          <button
            onClick={() => {
              setFocalDate(new Date());
              setSelectedDateStr(format(new Date(), 'yyyy-MM-dd'));
            }}
            className="px-4 py-3 border border-white/5 bg-onyx/20 text-white/70 hover:bg-white/5 text-[9px] font-black uppercase tracking-widest rounded-xl transition-all"
          >
            Today
          </button>
        </div>
      </div>

      {/* Embedded Floating pending indicator */}
      <AnimatePresence>
        {pendingRecipe && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-amber-accent text-black p-6 rounded-[32px] shadow-2xl flex items-center gap-6 border border-black/10 backdrop-blur-xl"
          >
            <div className="w-12 h-12 bg-black/10 rounded-2xl flex items-center justify-center">
              <ChefHat className="w-6 h-6" />
            </div>
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Add Recipe to Calendar</p>
              <p className="font-serif text-xl italic font-light">{pendingRecipe.name}</p>
            </div>
            <div className="h-10 w-px bg-black/10 mx-2" />
            <p className="text-[10px] font-bold uppercase tracking-widest px-4">Choose slot date below</p>
            <button 
              onClick={() => navigate(location.pathname, { replace: true, state: {} })}
              className="p-3 hover:bg-black/10 rounded-full transition-colors animate-pulse"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-12">
        
        {/* ==================== WEEK VIEW CALENDAR GRID ==================== */}
        {viewMode === 'week' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
            {daysInWeek.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const dayPlans = plans.filter(p => p.date === dateStr);
              const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;

              return (
                <div 
                  key={dateStr} 
                  className={cn(
                    "flex flex-col gap-6 p-10 rounded-[40px] border transition-all relative overflow-hidden",
                    isToday ? "bg-graphite border-amber-accent/40 shadow-2xl shadow-amber-accent/5" : "bg-graphite border-white/5"
                  )}
                >
                  <div className="flex items-center justify-between relative z-10">
                    <div className="flex items-center gap-4">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center font-serif text-2xl font-light",
                        isToday ? "bg-amber-accent text-black" : "bg-white/5 text-white/40"
                      )}>
                        {format(day, 'd')}
                      </div>
                      <div>
                        <span className={cn(
                          "text-[10px] uppercase tracking-[0.3em] font-black block",
                          isToday ? "text-amber-accent" : "text-white/20"
                        )}>{format(day, 'EEEE')}</span>
                        <span className="text-white/40 text-[10px] uppercase tracking-widest">{format(day, 'MMMM yyyy')}</span>
                      </div>
                    </div>
                    
                    {dayPlans.length > 0 && (
                      <div className="px-3 py-1 bg-white/5 rounded-full border border-white/10 text-[9px] font-bold text-white/40 uppercase tracking-widest">
                        {dayPlans.length} {dayPlans.length === 1 ? 'Meal' : 'Meals'}
                      </div>
                    )}
                  </div>

                  <div className="space-y-4 relative z-10 flex-1">
                    <AnimatePresence mode="popLayout">
                      {dayPlans.map((plan) => (
                        <motion.div
                          key={plan.id}
                          layout
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, scale: 0.95 }}
                          className="group/card relative bg-onyx/40 p-6 rounded-3xl border border-white/5 hover:border-amber-accent/30 transition-all text-left"
                        >
                          <div className="flex justify-between items-start gap-4">
                            <div className="space-y-1">
                              <span className="text-[9px] uppercase tracking-widest font-black text-amber-accent/60 block">
                                {plan.mealType}
                              </span>
                              {plan.recipeId === 'custom' ? (
                                <p className="font-serif text-lg font-light text-white italic">{plan.recipeName}</p>
                              ) : (
                                <Link to={`/recipe/${plan.recipeId}`} className="font-serif text-lg font-light text-white block hover:text-amber-accent transition-colors italic leading-tight">
                                  {plan.recipeName}
                                </Link>
                              )}
                              
                              {/* Co-Op plan addedBy label */}
                              {(plan as any).addedByName && (
                                <div className="flex items-center gap-1.5 pt-2">
                                  {(plan as any).addedByPhoto && (
                                    <img 
                                      referrerPolicy="no-referrer"
                                      src={(plan as any).addedByPhoto} 
                                      alt={(plan as any).addedByName} 
                                      className="w-4 h-4 rounded-full ring-1 ring-white/10 object-cover"
                                    />
                                  )}
                                  <span className="text-[8px] uppercase tracking-wider text-white/30 font-bold">by {(plan as any).addedByName}</span>
                                </div>
                              )}
                            </div>
                            <button 
                              onClick={() => removePlan(plan.id!)}
                              className="p-2 text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                    
                    {addingTo?.date === dateStr ? (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-onyx p-6 rounded-3xl border border-amber-accent/50 shadow-2xl shadow-amber-accent/10 text-left"
                      >
                        <div className="flex flex-wrap gap-2 mb-6">
                           {(['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] as const).map(t => (
                             <button 
                               key={t}
                               onClick={() => setAddingTo({ date: dateStr, type: t })}
                               className={cn(
                                 "px-3 py-2 text-[9px] uppercase font-black tracking-widest rounded-xl border transition-all flex-1 min-w-[80px]",
                                 addingTo.type === t ? "bg-amber-accent border-amber-accent text-black" : "border-white/5 text-white/20 hover:text-white hover:border-white/20"
                               )}
                             >
                               {t}
                             </button>
                           ))}
                        </div>
                        <div className="space-y-4">
                          <div className="relative">
                            <input 
                              autoFocus
                              placeholder="Type meal or search below..."
                              value={customInput}
                              onChange={e => {
                                setCustomInput(e.target.value);
                                setSelectedRecipeId('custom'); // Reset choice when typing custom input
                              }}
                              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white italic text-base placeholder:text-white/10 outline-none focus:border-amber-accent/50 transition-all font-serif"
                            />
                            
                            {/* RECIPE SELECTION DROPDOWN/DRAWER INTEGRATION */}
                            <div className="mt-4 bg-onyx/90 border border-white/5 rounded-2xl overflow-hidden shadow-xl max-h-48 overflow-y-auto">
                              <p className="p-3 border-b border-white/5 text-[8px] uppercase tracking-widest font-black text-white/30 bg-graphite/40">
                                CHEF RECIPES SUGGESTIONS
                              </p>
                              {filteredSuggestions.map((rec) => (
                                <button
                                  key={rec.id}
                                  type="button"
                                  onClick={() => {
                                    setCustomInput(rec.name);
                                    setSelectedRecipeId(rec.id);
                                  }}
                                  className={cn(
                                    "w-full text-left px-4 py-3 hover:bg-amber-accent/15 flex items-center justify-between text-xs transition-colors border-b border-white/5",
                                    selectedRecipeId === rec.id ? "bg-amber-accent/10 border-l-2 border-l-amber-accent" : ""
                                  )}
                                >
                                  <div>
                                    <p className="font-serif italic text-white text-sm">{rec.name}</p>
                                    <p className="text-[8px] uppercase tracking-wider text-amber-accent/50 font-bold">{rec.source}</p>
                                  </div>
                                  <div className="p-1 px-2.5 rounded bg-white/5 text-[8px] text-white/40 uppercase tracking-widest">
                                    Select
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex gap-3">
                            <button 
                              onClick={() => {
                                const rid = selectedRecipeId !== 'custom' ? selectedRecipeId : (pendingRecipe && customInput === pendingRecipe.name) ? pendingRecipe.id : 'custom';
                                addCustomMeal(dateStr, addingTo.type, customInput, rid);
                                setAddingTo(null);
                                setCustomInput('');
                                setSelectedRecipeId('custom');
                              }}
                              disabled={!customInput.trim()}
                              className="flex-1 py-4 bg-amber-accent disabled:opacity-45 text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-accent/20 hover:bg-white transition-all"
                            >Save Meal</button>
                            <button 
                              onClick={() => {
                                setAddingTo(null);
                                setCustomInput('');
                                setSelectedRecipeId('custom');
                              }} 
                              className="px-6 py-4 bg-white/5 text-white/40 text-[10px] font-black uppercase tracking-widest rounded-2xl hover:text-white transition-all"
                            >Cancel</button>
                          </div>
                        </div>
                      </motion.div>
                    ) : (
                      <button 
                        onClick={() => {
                          if (pendingRecipe) {
                            startAddingMeal(dateStr, pendingRecipe);
                          } else {
                            startAddingMeal(dateStr);
                          }
                        }}
                        className={cn(
                          "w-full py-6 border border-dashed rounded-3xl text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 group relative overflow-hidden",
                          pendingRecipe 
                            ? "border-amber-accent/50 text-amber-accent bg-amber-accent/5 hover:bg-amber-accent hover:text-black" 
                            : "border-white/10 text-white/10 hover:text-amber-accent hover:border-amber-accent hover:bg-amber-accent/5"
                        )}
                      >
                        {pendingRecipe ? (
                          <>
                            <ListPlus className="w-4 h-4 group-hover:scale-125 transition-transform" />
                            Add {pendingRecipe.name}
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
                            Plan a Meal
                          </>
                        )}
                      </button>
                    )}
                  </div>
                  
                  {isToday && (
                    <div className="absolute top-0 right-0 w-64 h-64 bg-amber-accent/10 blur-[100px] -mr-32 -mt-32 rounded-full pointer-events-none"></div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ==================== MONTH VIEW CALENDAR GRID ==================== */}
        {viewMode === 'month' && (
          <div className="space-y-8 animate-fade-in">
            
            {/* Desktop Month Calendar Layout Grid */}
            <div className="hidden lg:block bg-graphite border border-white/5 rounded-[40px] p-8 overflow-hidden shadow-xl">
              
              {/* Day headers */}
              <div className="grid grid-cols-7 border-b border-white/5 pb-4 text-center">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
                  <span key={day} className="text-[10px] uppercase font-black tracking-widest text-white/40">{day}</span>
                ))}
              </div>

              {/* Month dates cells */}
              <div className="grid grid-cols-7 grid-rows-6 gap-3 pt-6 min-h-[580px]">
                {daysInMonthGrid.map((day, dIdx) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const dayPlans = plans.filter(p => p.date === dateStr);
                  const isCurrentMonth = isSameMonth(day, focalDate);
                  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                  const isSelectedCell = selectedDateStr === dateStr;

                  return (
                    <div
                      key={dateStr}
                      onClick={() => setSelectedDateStr(dateStr)}
                      className={cn(
                        "group/cell rounded-3xl p-4 border transition-all flex flex-col justify-between cursor-pointer relative overflow-hidden",
                        isSelectedCell ? "bg-onyx border-amber-accent" : "bg-onyx/20 border-white/5 hover:border-white/10",
                        isToday ? "ring-2 ring-amber-accent/30" : "",
                        !isCurrentMonth ? "opacity-25" : ""
                      )}
                    >
                      {/* Top labels */}
                      <div className="flex justify-between items-center mb-2 relative z-10">
                        <span className={cn(
                          "w-7 h-7 rounded-lg text-xs font-mono font-bold flex items-center justify-center",
                          isToday ? "bg-amber-accent text-black font-extrabold" : "text-white/40 group-hover/cell:text-white"
                        )}>
                          {format(day, 'd')}
                        </span>
                        
                        {dayPlans.length > 0 && (
                          <span className="w-2.5 h-2.5 rounded-full bg-amber-accent shadow-sm shadow-amber-accent" />
                        )}
                      </div>

                      {/* Visible meal items preview lists inside cell */}
                      <div className="space-y-1 relative z-10 flex-grow max-h-24 overflow-hidden mt-2 text-left">
                        {dayPlans.slice(0, 2).map((item) => (
                          <div 
                            key={item.id} 
                            className="text-[9px] bg-white/5 border border-white/5 rounded px-2 py-0.5 truncate text-white/80"
                          >
                            <span className="text-amber-accent/80 font-black mr-1">{item.mealType.charAt(0).toUpperCase()}:</span>
                            {item.recipeName}
                          </div>
                        ))}
                        {dayPlans.length > 2 && (
                          <div className="text-[8px] uppercase tracking-widest text-white/30 text-center font-bold">
                            + {dayPlans.length - 2} more meals
                          </div>
                        )}
                      </div>

                      {/* Click cell helper overlay highlight */}
                      <div className="absolute inset-0 bg-gradient-to-t from-amber-accent/0 to-amber-accent/5 opacity-0 group-hover/cell:opacity-100 transition-opacity" />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Mobile/Compact Grid for Calendar view */}
            <div className="lg:hidden bg-graphite border border-white/5 rounded-[32px] p-6 shadow-xl">
              
              {/* Mon/Tue headers */}
              <div className="grid grid-cols-7 text-center pb-2 border-b border-white/5 text-[9px] font-bold text-white/30 uppercase tracking-wider">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, idx) => (
                  <span key={idx}>{day}</span>
                ))}
              </div>

              {/* Month dates cells list */}
              <div className="grid grid-cols-7 gap-1 pt-3">
                {daysInMonthGrid.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const hasMeals = plans.some(p => p.date === dateStr);
                  const isCurrentMonth = isSameMonth(day, focalDate);
                  const isToday = format(new Date(), 'yyyy-MM-dd') === dateStr;
                  const isSelectedCell = selectedDateStr === dateStr;

                  return (
                    <button
                      key={dateStr}
                      onClick={() => setSelectedDateStr(dateStr)}
                      className={cn(
                        "h-10 rounded-xl relative flex items-center justify-center text-xs font-mono transition-all",
                        isSelectedCell ? "bg-amber-accent text-black font-extrabold" : "text-white/60",
                        isToday && !isSelectedCell ? "border border-amber-accent/50" : "",
                        !isCurrentMonth ? "opacity-20" : ""
                      )}
                    >
                      {format(day, 'd')}
                      {hasMeals && (
                        <span className={cn(
                          "absolute bottom-1 w-1 h-1 rounded-full",
                          isSelectedCell ? "bg-black" : "bg-amber-accent"
                        )} />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Selected Month Date Detail & Scheduler Pane */}
            <div className="p-8 md:p-12 bg-graphite/40 border border-white/5 rounded-[40px] shadow-2xl relative overflow-hidden">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-accent">COMPREHENSIVE DAILY DIARY</p>
                  <h3 className="font-serif text-3xl text-white italic font-light mt-1">
                    {format(new Date(selectedDateStr + 'T12:00:00'), 'EEEE, MMMM d, yyyy')}
                  </h3>
                </div>
                <div className="px-5 py-2 bg-white/5 border border-white/10 rounded-full text-xs text-white/50 inline-flex items-center gap-2">
                  <CalendarIcon className="w-3.5 h-3.5 text-amber-accent" />
                  {plans.filter(p => p.date === selectedDateStr).length} Scheduled Meals
                </div>
              </div>

              {/* Day meal plan items scheduled */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8">
                
                {/* Active meals scheduled list */}
                <div className="space-y-4">
                  <h4 className="text-[9px] uppercase tracking-widest font-black text-white/30 text-left">SCHEDULED DISHES</h4>
                  
                  {plans.filter(p => p.date === selectedDateStr).length === 0 ? (
                    <div className="p-8 border border-dashed border-white/10 rounded-3xl text-center space-y-3">
                      <ChefHat className="w-8 h-8 text-white/10 mx-auto" />
                      <p className="text-sm font-light text-white/40 italic">No gourmet items scheduled for this day yet.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {plans.filter(p => p.date === selectedDateStr).map((plan) => (
                        <div
                          key={plan.id}
                          className="group relative bg-onyx p-6 rounded-3xl border border-white/5 hover:border-amber-accent/30 transition-all flex items-center justify-between gap-4 text-left"
                        >
                          <div>
                            <span className="text-[9px] uppercase tracking-widest font-black text-amber-accent/60 block mb-1">
                              {plan.mealType}
                            </span>
                            {plan.recipeId === 'custom' ? (
                              <p className="font-serif text-lg font-light text-white italic">{plan.recipeName}</p>
                            ) : (
                              <Link to={`/recipe/${plan.recipeId}`} className="font-serif text-lg font-light text-white block hover:text-amber-accent transition-colors italic leading-tight">
                                {plan.recipeName}
                              </Link>
                            )}
                          </div>
                          
                          <button 
                            onClick={() => removePlan(plan.id!)}
                            className="p-2 text-white/10 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Day Add Meal Box panel */}
                <div>
                  <h4 className="text-[9px] uppercase tracking-widest font-black text-white/30 mb-4 text-left">ADD DELICIOUS ENTRÉE</h4>
                  
                  {addingTo?.date === selectedDateStr ? (
                    <div className="bg-onyx p-6 rounded-3xl border border-amber-accent/40 text-left space-y-4 shadow-xl">
                      <div className="flex flex-wrap gap-2 mb-2">
                         {(['breakfast', 'lunch', 'dinner', 'snack', 'dessert'] as const).map(t => (
                           <button 
                             key={t}
                             onClick={() => setAddingTo({ date: selectedDateStr, type: t })}
                             className={cn(
                               "px-3 py-1.5 text-[8px] uppercase font-black tracking-widest rounded-lg border transition-all flex-1 min-w-[70px]",
                               addingTo.type === t ? "bg-amber-accent border-amber-accent text-black" : "border-white/5 text-white/20 hover:text-white"
                             )}
                           >
                             {t}
                           </button>
                         ))}
                      </div>

                      <div className="space-y-4">
                        <div className="relative">
                          <input 
                            autoFocus
                            placeholder="Entrée name or search Chef catalog..."
                            value={customInput}
                            onChange={e => {
                              setCustomInput(e.target.value);
                              setSelectedRecipeId('custom');
                            }}
                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white italic text-base placeholder:text-white/10 outline-none focus:border-amber-accent/50 transition-all font-serif"
                          />
                          
                          {/* Suggestion list picker */}
                          <div className="mt-3 bg-onyx border border-white/5 rounded-2xl overflow-hidden shadow-xl max-h-40 overflow-y-auto">
                            <p className="p-2 border-b border-white/5 text-[7px] uppercase tracking-wider font-extrabold text-white/20">
                              RECIPES IN-PLANNER SELECTION
                            </p>
                            {filteredSuggestions.map((rec) => (
                              <button
                                key={rec.id}
                                type="button"
                                onClick={() => {
                                  setCustomInput(rec.name);
                                  setSelectedRecipeId(rec.id);
                                }}
                                className={cn(
                                  "w-full text-left px-3 py-2.5 hover:bg-amber-accent/10 flex items-center justify-between text-xs transition-colors border-b border-white/5",
                                  selectedRecipeId === rec.id ? "bg-amber-accent/5 text-amber-accent" : ""
                                )}
                              >
                                <div>
                                  <p className="font-serif italic text-white text-xs">{rec.name}</p>
                                  <p className="text-[7px] text-white/30 uppercase tracking-widest font-bold">{rec.source}</p>
                                </div>
                                <span className="text-[8px] uppercase font-bold text-amber-accent/50">Pick</span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button 
                            onClick={async () => {
                              const rid = selectedRecipeId !== 'custom' ? selectedRecipeId : 'custom';
                              await addCustomMeal(selectedDateStr, addingTo.type, customInput, rid);
                              setAddingTo(null);
                              setCustomInput('');
                              setSelectedRecipeId('custom');
                            }}
                            disabled={!customInput.trim()}
                            className="flex-grow py-3.5 bg-amber-accent disabled:opacity-40 text-black text-[9px] font-black uppercase tracking-widest rounded-xl shadow-lg transition-all"
                          >Add To Calendar</button>
                          <button 
                            onClick={() => {
                              setAddingTo(null);
                              setCustomInput('');
                              setSelectedRecipeId('custom');
                            }} 
                            className="px-4 py-3.5 bg-white/5 text-white/30 text-[9px] font-black uppercase tracking-widest rounded-xl hover:text-white"
                          >Cancel</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        if (pendingRecipe) {
                          startAddingMeal(selectedDateStr, pendingRecipe);
                        } else {
                          startAddingMeal(selectedDateStr);
                        }
                      }}
                      className="w-full h-44 border-2 border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center gap-4 text-white/20 hover:text-amber-accent hover:border-amber-accent/40 hover:bg-amber-accent/5 transition-all"
                    >
                      <Plus className="w-8 h-8" />
                      <span className="text-[9px] font-black uppercase tracking-[0.25em]">
                        {pendingRecipe ? `Add: ${pendingRecipe.name}` : "Schedule Day Entrée"}
                      </span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ==================== DYNAMIC AGGREGATED GROCERIES / SHOPPING LIST SECTION ==================== */}
        <div className="bg-graphite border border-white/5 rounded-[40px] p-8 md:p-12 shadow-2xl relative overflow-hidden align-left text-left">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-8 border-b border-white/5">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-accent/10 border border-amber-accent/20 flex items-center justify-center text-amber-accent">
                <ShoppingCart className="w-5 h-5 text-amber-accent" />
              </div>
              <div className="text-left">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-amber-accent">AUTOMATED LIST ENGINE</p>
                <h2 className="font-serif text-3xl font-light text-white italic tracking-tight">
                  Aggregated Groceries Breakdowns
                </h2>
              </div>
            </div>

            {/* Cloud Export button controls */}
            {aggregatedIngredients.length > 0 && (
              <button
                onClick={handleExportShoppingList}
                disabled={exporting || exportSuccess}
                className={cn(
                  "px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest inline-flex items-center gap-2.5 transition-all shadow-xl shadow-amber-accent/10 cursor-pointer disabled:opacity-50",
                  exportSuccess 
                    ? "bg-green-500 text-white" 
                    : "bg-amber-accent hover:bg-white text-black"
                )}
              >
                {exporting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Syncing...
                  </>
                ) : exportSuccess ? (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    List Synced!
                  </>
                ) : (
                  <>
                    <CalendarRange className="w-4 h-4 text-black" />
                    Cloud Sync to Grocery List
                  </>
                )}
              </button>
            )}
          </div>

          <p className="text-[11px] font-mono tracking-wide text-white/30 pt-4 pb-6 text-left">
            * These items represent all parsed quantities and standalone items needed for {visiblePlans.length} plans in active {viewMode === 'week' ? 'Week window' : 'Month window'}.
          </p>

          {aggregatedIngredients.length === 0 ? (
            <div className="p-16 border border-dashed border-white/5 rounded-3xl text-center space-y-4">
              <ShoppingCart className="w-12 h-12 text-white/5 mx-auto" />
              <p className="text-white/40 font-light italic max-w-md mx-auto text-sm leading-relaxed">
                Add recipes to your weekly or monthly schedules, and our kitchen engine will dynamically compute your parsed unified shopping lists here.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
              {/* Grouped by generic parsed culinary bins */}
              {Array.from(new Set(aggregatedIngredients.map(i => i.category))).map(catName => (
                <div key={catName} className="p-6 bg-onyx/30 rounded-3xl border border-white/5 flex flex-col gap-4 text-left">
                  <div className="pb-2 border-b border-white/5">
                    <span className="text-[8px] uppercase tracking-widest font-black text-amber-accent/50 block">Culinary Department</span>
                    <h5 className="font-serif italic font-medium text-white text-base mt-0.5">{catName}</h5>
                  </div>

                  <div className="space-y-3 flex-1">
                    {aggregatedIngredients.filter(i => i.category === catName).map((ing, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs group/item">
                        <span className="text-white/80 font-light">{ing.item}</span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs px-2.5 py-0.5 bg-white/5 border border-white/5 text-white/60 rounded-full font-bold">
                            {ing.amount}
                          </span>
                          {ing.count > 1 && (
                            <span className="text-[8px] font-bold text-amber-accent/70 uppercase">
                              x{ing.count}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Schedule Culinary Plans"
        message="To plan your daily meals, schedule cooking schedules, and auto-aggregate your shopping list, please sign in to your Daily Meal Recipe account."
        actionName="schedule meals"
      />
    </div>
  );
}
