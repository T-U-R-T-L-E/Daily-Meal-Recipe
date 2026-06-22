import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp, getDoc, getDocs } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';
import { ShoppingListItem, Recipe } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle2, Circle, Trash2, Plus, ShoppingBag, Sparkles } from 'lucide-react';
import { cn } from '../lib/utils';
import AuthModal from '../components/auth/AuthModal';

export default function ShoppingList() {
  const { user } = useAuth();
  const [items, setItems] = useState<ShoppingListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ item: '', amount: 'As needed', category: 'Oils & Vinegars' });
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const categories = ['Oils & Vinegars', 'Spices', 'Grains', 'Proteins', 'Vegetables', 'Dairy', 'Baking', 'Other'];

  // Load user's families for Shared Kitchen Council integration
  const [families, setFamilies] = useState<any[]>([]);
  const [activeFamily, setActiveFamily] = useState<any | null>(null);
  const [loadingFamilies, setLoadingFamilies] = useState(true);

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

  // Load shopping list items inside real-time snapshot listeners
  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    setLoading(true);

    let q = query(
      collection(db, 'shoppingLists'),
      where('userId', '==', user.uid)
    );

    if (activeFamily) {
      q = query(
        collection(db, 'shoppingLists'),
        where('familyId', '==', activeFamily.id)
      );
    }

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => {
          const d = doc.data();
          return { 
            id: doc.id, 
            ...d,
            createdAt: d.createdAt ? d.createdAt.toDate() : new Date()
          } as ShoppingListItem;
        });
        
        // If in Solo Mode, filter out items that belong to a family group to avoid crossing scopes
        const filtered = activeFamily 
          ? data 
          : data.filter(item => !item.familyId);

        setItems(filtered);
        setLoading(false);
      },
      (err) => {
        console.error("Failed to sync shopping list in real-time:", err);
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'shoppingLists');
      }
    );

    return () => unsubscribe();
  }, [user, activeFamily]);

  const addItem = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    if (!newItem.item.trim()) return;
    try {
      const itemToAdd: any = {
        item: newItem.item.trim(),
        amount: newItem.amount.trim() || "As needed",
        category: newItem.category,
        completed: false,
        createdAt: serverTimestamp(),
        userId: user.uid,
        addedByName: user.displayName || 'Anonymous Cook',
        addedByPhoto: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`,
      };

      if (activeFamily) {
        itemToAdd.familyId = activeFamily.id;
      }

      await addDoc(collection(db, 'shoppingLists'), itemToAdd);
      setNewItem({ item: '', amount: 'As needed', category: 'Oils & Vinegars' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shoppingLists');
    }
  };

  const toggleComplete = async (id: string, currentStatus: boolean) => {
    try {
      const nextCompleted = !currentStatus;
      await updateDoc(doc(db, 'shoppingLists', id), { 
        completed: nextCompleted,
        completedBy: nextCompleted ? user.uid : null,
        completedByName: nextCompleted ? (user.displayName || 'Collaborator') : null
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `shoppingLists/${id}`);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'shoppingLists', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `shoppingLists/${id}`);
    }
  };

  const syncFromMealPlan = async () => {
    if (!user) {
      setIsAuthModalOpen(true);
      return;
    }
    try {
      // 1. Get recent meal plans (scope dynamically to active kitchen council)
      const q = activeFamily
        ? query(collection(db, 'mealPlans'), where('familyId', '==', activeFamily.id))
        : query(collection(db, 'mealPlans'), where('userId', '==', user.uid));

      const planSnap = await getDocs(q);
      const recipeIds = planSnap.docs.map(d => d.data().recipeId);
      
      // 2. Fetch all unique recipes
      const uniqueRecipeIds = [...new Set(recipeIds)];
      for (const rid of uniqueRecipeIds) {
        let recipe: Recipe | null = null;

        if (rid.startsWith('ai-')) {
          try {
            const aiResultsRaw = sessionStorage.getItem('ai_search_results');
            const aiResults = (aiResultsRaw && aiResultsRaw !== 'undefined') ? JSON.parse(aiResultsRaw) : [];
            recipe = aiResults.find((r: Recipe) => r.id === rid) || null;
            
            if (!recipe) {
              const savedRaw = localStorage.getItem('saved_recipes');
              const saved = (savedRaw && savedRaw !== 'undefined') ? JSON.parse(savedRaw) : [];
              recipe = saved.find((r: Recipe) => r.id === rid) || null;
            }
          } catch (e) {
            console.error("Failed to parse cached recipes", e);
          }
        } else {
          const rSnap = await getDoc(doc(db, 'recipes', rid));
          if (rSnap.exists()) {
            recipe = rSnap.data() as Recipe;
          }
        }

        if (recipe) {
          for (const ing of recipe.ingredients) {
            // Check if already in list
            if (!items.find(i => i.item.toLowerCase() === ing.item.toLowerCase())) {
              const newItemToAdd: any = {
                userId: user.uid,
                item: ing.item,
                amount: ing.amount,
                completed: false,
                createdAt: serverTimestamp(),
                addedByName: user.displayName || 'Anonymous Cook',
                addedByPhoto: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`,
              };
              if (activeFamily) {
                newItemToAdd.familyId = activeFamily.id;
              }
              await addDoc(collection(db, 'shoppingLists'), newItemToAdd);
            }
          }
        }
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'shoppingLists/sync');
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 md:space-y-12 px-4 md:px-0">
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

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-white/5 pb-8 md:pb-10">
        <div className="space-y-3">
          <h1 className="font-serif text-4xl md:text-6xl font-light text-white">Shopping List</h1>
          <p className="text-gray-500 font-light text-base md:text-xl italic tracking-tight text-amber-accent/60">Manage your grocery needs easily.</p>
        </div>
        <div className="flex gap-3 w-full md:w-auto">
          <button 
            onClick={() => {
              if (!user) {
                setIsAuthModalOpen(true);
              } else {
                setIsAdding(true);
              }
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3.5 bg-white text-black hover:bg-amber-accent rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-md focus:outline-none"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
          <button 
            onClick={() => {
              if (!user) {
                setIsAuthModalOpen(true);
              } else {
                syncFromMealPlan();
              }
            }}
            className="flex-1 md:flex-none flex items-center justify-center gap-3 px-6 py-3.5 bg-graphite text-white border border-white/10 rounded-full text-[10px] font-black uppercase tracking-[0.2em] hover:bg-amber-accent hover:text-black hover:border-amber-accent transition-all shadow-2xl focus:outline-none"
          >
            <Sparkles className="w-4 h-4" />
            Sync from Planner
          </button>
        </div>
      </div>

      <div className="space-y-8">
        <AnimatePresence>
          {isAdding && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="p-6 md:p-8 bg-graphite rounded-[32px] border border-white/10 shadow-2xl animate-fade-in"
            >
              <form onSubmit={addItem} className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6 items-end">
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">Ingredients</label>
                  <input 
                    required
                    value={newItem.item}
                    onChange={e => setNewItem({...newItem, item: e.target.value})}
                    className="w-full bg-onyx border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-accent/50 text-base"
                    placeholder="e.g. Maldon Sea Salt"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">Inventory</label>
                  <input 
                    required
                    value={newItem.amount}
                    onChange={e => setNewItem({...newItem, amount: e.target.value})}
                    className="w-full bg-onyx border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-accent/50 text-base"
                    placeholder="e.g. 500g"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">Category</label>
                  <select 
                    value={newItem.category}
                    onChange={e => setNewItem({...newItem, category: e.target.value})}
                    className="w-full bg-onyx border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-accent/50 text-base"
                  >
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="flex gap-3">
                  <button type="submit" className="flex-1 bg-amber-accent text-black font-bold uppercase tracking-widest text-[10px] py-3.5 rounded-xl">Add Item</button>
                  <button type="button" onClick={() => setIsAdding(false)} className="px-5 border border-white/10 text-white rounded-xl text-[10px] uppercase tracking-widest font-bold">Cancel</button>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="bg-graphite rounded-[32px] md:rounded-[48px] border border-white/5 overflow-hidden shadow-2xl">
          <AnimatePresence mode="popLayout">
            {loading ? (
              <div className="divide-y divide-white/5 animate-pulse">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="p-6 md:p-10 flex items-center justify-between">
                    <div className="flex items-center gap-4 md:gap-8 flex-grow">
                      <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/5 shrink-0" />
                      <div className="space-y-2 flex-grow">
                        <div className="h-5 bg-white/5 w-1/3 rounded-lg" />
                        <div className="h-3 bg-white/5 w-12 rounded-lg" />
                      </div>
                    </div>
                    <div className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-white/5 shrink-0" />
                  </div>
                ))}
              </div>
            ) : items.length > 0 ? (
              <div className="divide-y divide-white/5">
                <AnimatePresence mode="popLayout">
                  {items.sort((a,b) => Number(a.completed) - Number(b.completed)).map((item) => (
                    <motion.div
                      key={item.id}
                      layout
                      initial={{ opacity: 0, scale: 0.95, y: 15 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, x: -30, scale: 0.95 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="group flex items-center justify-between p-5 md:p-8 hover:bg-onyx transition-colors gap-3"
                    >
                    <div className="flex items-center gap-4 md:gap-6 min-w-0 flex-1">
                      <button 
                        onClick={() => toggleComplete(item.id!, item.completed)}
                        className={cn(
                          "transition-all duration-300 transform group-hover:scale-110 shrink-0",
                          item.completed ? "text-amber-accent" : "text-white/10 hover:text-amber-accent"
                        )}
                      >
                        {item.completed ? <CheckCircle2 className="w-6 h-6 md:w-8 md:h-8" /> : <Circle className="w-6 h-6 md:w-8 md:h-8" />}
                      </button>
                      <div className="space-y-1 min-w-0 pr-2">
                        <p className={cn(
                          "font-serif text-lg md:text-2.5xl font-light transition-all truncate",
                          item.completed ? "line-through text-white/10 italic" : "text-white italic"
                        )}>
                          {item.item}
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[10px] uppercase tracking-widest font-black text-amber-accent opacity-50">{item.amount}</span>
                          {item.category && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-white/20" />
                              <span className="text-[10px] uppercase tracking-widest font-medium text-white/40">{item.category}</span>
                            </>
                          )}
                          
                          {/* Co-Op addedBy label */}
                          {item.addedByName && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-white/20" />
                              <span className="text-[9px] uppercase tracking-wider text-white/35 flex items-center gap-1.5 font-bold">
                                {item.addedByPhoto && (
                                  <img 
                                    referrerPolicy="no-referrer"
                                    src={item.addedByPhoto} 
                                    alt={item.addedByName} 
                                    className="w-4 h-4 rounded-full ring-1 ring-white/10 object-cover"
                                  />
                                )}
                                <span>by {item.addedByName}</span>
                              </span>
                            </>
                          )}

                          {/* Co-Op completedBy label */}
                          {item.completed && item.completedByName && (
                            <>
                              <span className="w-1 h-1 rounded-full bg-white/20" />
                              <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-bold">
                                Done by {item.completedByName}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    <button 
                      onClick={() => deleteItem(item.id!)}
                      className="p-2.5 md:p-3 text-red-500/75 dark:text-red-400/60 hover:text-red-500 dark:hover:text-red-300 hover:bg-red-500/10 transition-all rounded-full shrink-0 md:opacity-0 md:group-hover:opacity-100"
                      title="Delete item"
                    >
                      <Trash2 className="w-4 h-4 md:w-5 md:h-5" />
                    </button>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            ) : (
              <div className="py-24 md:py-40 flex flex-col items-center justify-center text-center space-y-6 md:space-y-8 px-6 md:px-12 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-b from-amber-accent/5 to-transparent opacity-20 pointer-events-none"></div>
                <div className="w-16 h-16 md:w-24 md:h-24 bg-onyx rounded-full flex items-center justify-center border border-white/5 shadow-inner">
                  <ShoppingBag className="w-8 h-8 md:w-10 md:h-10 text-white/10" />
                </div>
                <div className="space-y-2 relative z-10">
                  <p className="font-serif text-2xl md:text-3xl font-light text-white italic">Your list is empty</p>
                  <p className="text-gray-500 font-light italic text-sm md:text-base tracking-tight">Add items manually or sync them from your meal plan.</p>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Gourmet Shopping List"
        message="To create custom grocery shopping checklists, sync items from your weekly meal planner automatically, or co-manage lists with your roommate pod, please sign in to your Daily Meal Recipe account."
        actionName="manage your shopping list"
      />
    </div>
  );
}
