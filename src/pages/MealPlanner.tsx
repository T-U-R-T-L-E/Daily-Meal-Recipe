import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, onSnapshot, deleteDoc, doc, addDoc, serverTimestamp, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';
import { MealPlan } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { format, addDays, startOfWeek, subDays } from 'date-fns';
import { Trash2, ChevronRight, ChefHat, Plus, X, Sparkles } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { MealPlannerSkeleton } from '../components/recipes/RecipeSkeleton';

export default function MealPlanner() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const [plans, setPlans] = useState<MealPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentWeekStart, setCurrentWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));

  const pendingRecipe = useMemo(() => location.state?.addRecipe as { id: string, name: string } | null, [location.state]);

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
    if (!user) return;
    setLoading(true);

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

    const unsubscribe = onSnapshot(q, 
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

        setPlans(filteredAndSorted);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to sync meal plan in real-time:", err);
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'mealPlans');
      }
    );

    return () => unsubscribe();
  }, [user, activeFamily]);

  const removePlan = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'mealPlans', id));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `mealPlans/${id}`);
    }
  };

  const addCustomMeal = async (date: string, mealType: "breakfast" | "lunch" | "dinner" | "snack" | "dessert", recipeName: string, recipeId: string = 'custom') => {
    if (!user || !recipeName.trim()) return;
    try {
      const mealToAdd: any = {
        userId: user.uid,
        date,
        mealType,
        recipeName: recipeName.trim(),
        recipeId: recipeId,
        createdAt: serverTimestamp(),
        addedByName: user.displayName || 'Anonymous Cook',
        addedByPhoto: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`,
      };

      if (activeFamily) {
        mealToAdd.familyId = activeFamily.id;
      }

      await addDoc(collection(db, 'mealPlans'), mealToAdd);
      
      // If we were adding a specific recipe, clear the state
      if (pendingRecipe && recipeId !== 'custom') {
        navigate(location.pathname, { replace: true, state: {} });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'mealPlans');
    }
  };

  const days = Array.from({ length: 7 }, (_, i) => addDays(currentWeekStart, i));

  const [addingTo, setAddingTo] = useState<{date: string, type: "breakfast" | "lunch" | "dinner" | "snack" | "dessert"} | null>(null);
  const [customInput, setCustomInput] = useState('');

  if (loading) return <MealPlannerSkeleton />;

  return (
    <div className="space-y-16">
      {/* Shared Kitchen Council Selector Box */}
      {user && (families.length > 0) && (
        <div className="bg-graphite/40 border border-white/5 rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-fade-in -mb-4">
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

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-3">
          <h1 className="font-serif text-6xl font-light text-white">Meal Plan</h1>
          <p className="text-gray-500 font-light text-lg italic tracking-tight">Plan your meals for the upcoming week.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-4 bg-graphite p-2 rounded-full border border-white/5">
             <button 
               onClick={() => setCurrentWeekStart(subDays(currentWeekStart, 7))}
               className="p-2 hover:bg-onyx rounded-full transition-colors text-white/40 hover:text-amber-accent"
             >
               <ChevronRight className="w-4 h-4 rotate-180" />
             </button>
             <span className="text-[9px] font-bold uppercase tracking-[0.2em] px-2 text-white/60">
               {format(currentWeekStart, 'MMM d')} — {format(addDays(currentWeekStart, 6), 'MMM d')}
             </span>
             <button 
               onClick={() => setCurrentWeekStart(addDays(currentWeekStart, 7))}
               className="p-2 hover:bg-onyx rounded-full transition-colors text-white/40 hover:text-amber-accent"
             >
               <ChevronRight className="w-4 h-4" />
             </button>
          </div>
        </div>
      </div>

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
              <p className="text-[10px] font-black uppercase tracking-widest opacity-60">Adding to Plan</p>
              <p className="font-serif text-xl italic font-light">{pendingRecipe.name}</p>
            </div>
            <div className="h-10 w-px bg-black/10 mx-2" />
            <p className="text-[10px] font-bold uppercase tracking-widest px-4">Choose a slot below</p>
            <button 
              onClick={() => navigate(location.pathname, { replace: true, state: {} })}
              className="p-3 hover:bg-black/10 rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-8">
        {days.map((day) => {
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
                    "w-12 h-12 rounded-2xl flex items-center justify-center font-serif text-2xl",
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

              <div className="space-y-4 relative z-10">
                <AnimatePresence mode="popLayout">
                  {dayPlans.map((plan) => (
                    <motion.div
                      key={plan.id}
                      layout
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="group/card relative bg-onyx/40 p-6 rounded-3xl border border-white/5 hover:border-amber-accent/30 transition-all"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div className="space-y-1">
                          <span className="text-[9px] uppercase tracking-widest font-black text-amber-accent/60 block">
                            {plan.mealType}
                          </span>
                          {plan.recipeId === 'custom' ? (
                            <p className="font-serif text-lg font-light text-white italic">{plan.recipeName}</p>
                          ) : (
                            <Link to={`/recipe/${plan.recipeId}`} className="font-serif text-lg font-light text-white block hover:text-amber-accent transition-colors italic">
                              {plan.recipeName}
                            </Link>
                          )}
                          
                          {/* Co-Op plan addedBy label */}
                          {(plan as any).addedByName && (
                            <div className="flex items-center gap-1.5 pt-1">
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
                    className="bg-onyx p-6 rounded-3xl border border-amber-accent/50 shadow-2xl shadow-amber-accent/10"
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
                          placeholder="What's for dinner?"
                          value={customInput}
                          onChange={e => setCustomInput(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter') {
                              const rid = (pendingRecipe && customInput === pendingRecipe.name) ? pendingRecipe.id : 'custom';
                              addCustomMeal(dateStr, addingTo.type, customInput, rid);
                              setAddingTo(null);
                              setCustomInput('');
                            }
                            if (e.key === 'Escape') setAddingTo(null);
                          }}
                          className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white italic text-base placeholder:text-white/10 outline-none focus:border-amber-accent/50 transition-all"
                        />
                      </div>
                      <div className="flex gap-3">
                        <button 
                          onClick={() => {
                            const rid = (pendingRecipe && customInput === pendingRecipe.name) ? pendingRecipe.id : 'custom';
                            addCustomMeal(dateStr, addingTo.type, customInput, rid);
                            setAddingTo(null);
                            setCustomInput('');
                          }}
                          className="flex-1 py-4 bg-amber-accent text-black text-[10px] font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-amber-accent/20 hover:bg-white transition-all"
                        >Save Meal</button>
                        <button 
                          onClick={() => {
                            setAddingTo(null);
                            setCustomInput('');
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
                        setAddingTo({ date: dateStr, type: 'dinner' });
                        setCustomInput(pendingRecipe.name);
                      } else {
                        setAddingTo({ date: dateStr, type: 'dinner' });
                        setCustomInput('');
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
                        <Plus className="w-4 h-4 group-hover:scale-125 transition-transform" />
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
    </div>
  );
}
