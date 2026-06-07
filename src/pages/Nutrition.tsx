import { useState, useEffect, useMemo, useRef } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  setDoc,
  getDocs,
  serverTimestamp 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';
import { MealPlan, Recipe } from '../types';
import { format, addDays, subDays, parseISO } from 'date-fns';
import { 
  Activity, 
  Droplet, 
  Flame, 
  Plus, 
  Trash2, 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  PlusCircle, 
  Check, 
  Settings, 
  Info,
  Scale,
  Brain,
  TrendingUp,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  Cell, 
  PieChart, 
  Pie
} from 'recharts';

interface DailyLog {
  waterIntake: number; // ml
  energyLevel: number; // 1-10
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  notes?: string;
}

const DEFAULT_TARGETS = {
  targetCalories: 2000,
  targetProtein: 130,
  targetCarbs: 220,
  targetFat: 65,
};

const ESTIMATED_NUTRITION_PRESETS: { [key: string]: { calories: number; protein: number; carbs: number; fat: number } } = {
  'oatmeal': { calories: 290, protein: 11, carbs: 49, fat: 5 },
  'porridge': { calories: 250, protein: 8, carbs: 40, fat: 4 },
  'eggs': { calories: 155, protein: 13, carbs: 1, fat: 11 },
  'scrambled egg': { calories: 140, protein: 11, carbs: 1, fat: 10 },
  'boiled egg': { calories: 75, protein: 6, carbs: 0.6, fat: 5 },
  'omelette': { calories: 210, protein: 14, carbs: 2, fat: 16 },
  'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
  'chicken': { calories: 220, protein: 25, carbs: 0, fat: 12 },
  'salmon': { calories: 208, protein: 22, carbs: 0, fat: 13 },
  'tuna': { calories: 130, protein: 28, carbs: 0, fat: 1 },
  'fish': { calories: 180, protein: 20, carbs: 2, fat: 8 },
  'salad': { calories: 140, protein: 3, carbs: 10, fat: 9 },
  'apple': { calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  'banana': { calories: 105, protein: 1.3, carbs: 27, fat: 0.4 },
  'avocado': { calories: 160, protein: 2, carbs: 9, fat: 15 },
  'rice': { calories: 205, protein: 4.2, carbs: 44.5, fat: 0.4 },
  'pasta': { calories: 288, protein: 10.5, carbs: 58, fat: 1.3 },
  'bread': { calories: 80, protein: 3, carbs: 15, fat: 1 },
  'toast': { calories: 120, protein: 4, carbs: 22, fat: 2 },
  'steak': { calories: 330, protein: 28, carbs: 0, fat: 24 },
  'beef': { calories: 250, protein: 26, carbs: 0, fat: 15 },
  'pork': { calories: 240, protein: 27, carbs: 0, fat: 14 },
  'yogurt': { calories: 130, protein: 12, carbs: 6, fat: 4 },
  'greek yogurt': { calories: 120, protein: 18, carbs: 5, fat: 3 },
  'milk': { calories: 120, protein: 8, carbs: 12, fat: 5 },
  'protein shake': { calories: 180, protein: 25, carbs: 5, fat: 3 },
  'protein powder': { calories: 120, protein: 24, carbs: 3, fat: 1.5 },
  'nuts': { calories: 170, protein: 6, carbs: 6, fat: 15 },
  'almonds': { calories: 160, protein: 6, carbs: 6, fat: 14 },
  'peanut butter': { calories: 190, protein: 8, carbs: 6, fat: 16 },
  'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4 },
  'sweet potato': { calories: 112, protein: 2, carbs: 26, fat: 0.1 },
  'potato': { calories: 130, protein: 3, carbs: 30, fat: 0.1 },
  'broccoli': { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 },
  'soup': { calories: 150, protein: 5, carbs: 20, fat: 6 },
  'pizza': { calories: 285, protein: 12, carbs: 36, fat: 10 },
  'burger': { calories: 350, protein: 18, carbs: 38, fat: 15 }
};

export default function Nutrition() {
  const { user } = useAuth();
  
  // Date State
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  // Database State
  const [meals, setMeals] = useState<MealPlan[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [dailyLog, setDailyLog] = useState<DailyLog>({
    waterIntake: 0,
    energyLevel: 5,
    ...DEFAULT_TARGETS
  });
  const [loadingMeals, setLoadingMeals] = useState(true);
  const [loadingLog, setLoadingLog] = useState(true);

  // Quick Addition Form
  const [quickMealType, setQuickMealType] = useState<"breakfast" | "lunch" | "dinner" | "snack" | "dessert">("snack");
  const [quickName, setQuickName] = useState("");
  const [quickCalories, setQuickCalories] = useState("");
  const [quickProtein, setQuickProtein] = useState("");
  const [quickCarbs, setQuickCarbs] = useState("");
  const [quickFat, setQuickFat] = useState("");
  const [isQuickLogExpanded, setIsQuickLogExpanded] = useState(false);

  // Target Editing View Toggle
  const [isEditingTargets, setIsEditingTargets] = useState(false);
  const [tempTargets, setTempTargets] = useState(DEFAULT_TARGETS);

  // Fetch Recipe details for matching meal plans
  useEffect(() => {
    if (!user) return;
    const fetchAllRecipes = async () => {
      try {
        const q = query(collection(db, 'recipes'));
        const snapshot = await getDocs(q);
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
        setRecipes(list);
      } catch (err) {
        console.error("Failed to load recipes for nutrition reference:", err);
      }
    };
    fetchAllRecipes();
  }, [user]);

  // Sync Meal Plan items for selected date in real-time
  useEffect(() => {
    if (!user) return;
    setLoadingMeals(true);

    const q = query(
      collection(db, 'mealPlans'),
      where('userId', '==', user.uid),
      where('date', '==', selectedDate)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const list = snapshot.docs.map(doc => {
          const d = doc.data();
          return {
            id: doc.id,
            ...d
          } as MealPlan;
        });
        setMeals(list);
        setLoadingMeals(false);
      },
      (err) => {
        console.error("Failed to fetch daily planner meals:", err);
        setLoadingMeals(false);
        handleFirestoreError(err, OperationType.LIST, 'mealPlans');
      }
    );

    return () => unsubscribe();
  }, [user, selectedDate]);

  // Sync daily water, energy, and goals log in real-time
  useEffect(() => {
    if (!user) return;
    setLoadingLog(true);

    const logId = `${user.uid}_${selectedDate}`;
    const docRef = doc(db, 'nutritionLogs', logId);

    const unsubscribe = onSnapshot(docRef, 
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setDailyLog({
            waterIntake: data.waterIntake || 0,
            energyLevel: data.energyLevel || 5,
            targetCalories: data.targetCalories || DEFAULT_TARGETS.targetCalories,
            targetProtein: data.targetProtein || DEFAULT_TARGETS.targetProtein,
            targetCarbs: data.targetCarbs || DEFAULT_TARGETS.targetCarbs,
            targetFat: data.targetFat || DEFAULT_TARGETS.targetFat,
            notes: data.notes || ""
          });
          setTempTargets({
            targetCalories: data.targetCalories || DEFAULT_TARGETS.targetCalories,
            targetProtein: data.targetProtein || DEFAULT_TARGETS.targetProtein,
            targetCarbs: data.targetCarbs || DEFAULT_TARGETS.targetCarbs,
            targetFat: data.targetFat || DEFAULT_TARGETS.targetFat,
          });
        } else {
          // No log present, keep defaults but reset water and energy
          setDailyLog({
            waterIntake: 0,
            energyLevel: 5,
            ...DEFAULT_TARGETS
          });
          setTempTargets(DEFAULT_TARGETS);
        }
        setLoadingLog(false);
      },
      (err) => {
        console.error("Failed to read daily nutrition logs:", err);
        setLoadingLog(false);
      }
    );

    return () => unsubscribe();
  }, [user, selectedDate]);

  // Estimate a food's macro and calorie count on input change (for quick add prediction)
  const automaticEstimates = useMemo(() => {
    if (!quickName.trim()) return null;
    const nameLower = quickName.toLowerCase();
    
    // Check direct matching phrases
    for (const phrase of Object.keys(ESTIMATED_NUTRITION_PRESETS)) {
      if (nameLower.includes(phrase)) {
        return ESTIMATED_NUTRITION_PRESETS[phrase];
      }
    }

    // Default category fallback
    switch (quickMealType) {
      case 'breakfast':
        return { calories: 380, protein: 12, carbs: 50, fat: 14 };
      case 'lunch':
      case 'dinner':
        return { calories: 550, protein: 32, carbs: 60, fat: 18 };
      case 'snack':
        return { calories: 160, protein: 6, carbs: 20, fat: 6 };
      case 'dessert':
        return { calories: 280, protein: 4, carbs: 42, fat: 11 };
      default:
        return { calories: 250, protein: 10, carbs: 30, fat: 8 };
    }
  }, [quickName, quickMealType]);

  // Map meals to nutrition values
  const richMeals = useMemo(() => {
    return meals.map(meal => {
      // 1. If it's a structural recipe, lookup recipe
      const matchedRecipe = recipes.find(r => r.id === meal.recipeId);
      
      let calories = 0;
      let protein = 0;
      let carbs = 0;
      let fat = 0;

      if (matchedRecipe && matchedRecipe.nutrition) {
        calories = matchedRecipe.nutrition.calories || 0;
        protein = matchedRecipe.nutrition.protein || 0;
        carbs = matchedRecipe.nutrition.carbs || 0;
        fat = matchedRecipe.nutrition.fat || 0;
      } else {
        // Look up preset keywords
        const mealNameLower = (meal.recipeName || "").toLowerCase();
        let matched = false;
        
        for (const phrase of Object.keys(ESTIMATED_NUTRITION_PRESETS)) {
          if (mealNameLower.includes(phrase)) {
            const val = ESTIMATED_NUTRITION_PRESETS[phrase];
            calories = val.calories;
            protein = val.protein;
            carbs = val.carbs;
            fat = val.fat;
            matched = true;
            break;
          }
        }

        if (!matched) {
          // Fallback based on meal type
          switch (meal.mealType) {
            case 'breakfast':
              calories = 350; protein = 12; carbs = 45; fat = 10;
              break;
            case 'lunch':
            case 'dinner':
              calories = 520; protein = 30; carbs = 55; fat = 15;
              break;
            case 'snack':
              calories = 150; protein = 5; carbs = 18; fat = 5;
              break;
            case 'dessert':
              calories = 260; protein = 3; carbs = 40; fat = 9;
              break;
          }
        }
      }

      // Allow manually added fields overrides on the document itself
      if ((meal as any).calories !== undefined) calories = Number((meal as any).calories);
      if ((meal as any).protein !== undefined) protein = Number((meal as any).protein);
      if ((meal as any).carbs !== undefined) carbs = Number((meal as any).carbs);
      if ((meal as any).fat !== undefined) fat = Number((meal as any).fat);

      return {
        ...meal,
        calories,
        protein,
        carbs,
        fat,
        hasRecipeLink: !!matchedRecipe
      };
    });
  }, [meals, recipes]);

  // Aggregated totals
  const aggregates = useMemo(() => {
    let completedCalories = 0;
    let completedProtein = 0;
    let completedCarbs = 0;
    let completedFat = 0;

    let totalPlannedCalories = 0;
    let totalPlannedProtein = 0;
    let totalPlannedCarbs = 0;
    let totalPlannedFat = 0;

    richMeals.forEach(meal => {
      totalPlannedCalories += meal.calories;
      totalPlannedProtein += meal.protein;
      totalPlannedCarbs += meal.carbs;
      totalPlannedFat += meal.fat;

      if (meal.completed) {
        completedCalories += meal.calories;
        completedProtein += meal.protein;
        completedCarbs += meal.carbs;
        completedFat += meal.fat;
      }
    });

    return {
      completed: {
        calories: Math.round(completedCalories),
        protein: Math.round(completedProtein),
        carbs: Math.round(completedCarbs),
        fat: Math.round(completedFat),
      },
      planned: {
        calories: Math.round(totalPlannedCalories),
        protein: Math.round(totalPlannedProtein),
        carbs: Math.round(totalPlannedCarbs),
        fat: Math.round(totalPlannedFat),
      }
    };
  }, [richMeals]);

  // Update specific daily log element (hydration, energy, targets)
  const saveDailyLogField = async (updatedData: Partial<DailyLog>) => {
    if (!user) return;
    try {
      const logId = `${user.uid}_${selectedDate}`;
      const docRef = doc(db, 'nutritionLogs', logId);

      const mergedData = {
        userId: user.uid,
        date: selectedDate,
        ...dailyLog,
        ...updatedData
      };

      await setDoc(docRef, mergedData, { merge: true });
    } catch (err) {
      console.error("Failed to write nutrition log entry:", err);
    }
  };

  // Water Hydration helper
  const addWater = (amount: number) => {
    const nextVal = Math.max(0, dailyLog.waterIntake + amount);
    saveDailyLogField({ waterIntake: nextVal });
  };

  // Toggle meal complete/incomplete
  const toggleMealComplete = async (mealId: string, currentVal: boolean) => {
    try {
      await updateDoc(doc(db, 'mealPlans', mealId), {
        completed: !currentVal
      });
    } catch (err) {
      console.error("Failed to toggle meal plan status:", err);
      handleFirestoreError(err, OperationType.UPDATE, `mealPlans/${mealId}`);
    }
  };

  // Remove meal
  const removeMeal = async (mealId: string) => {
    try {
       await deleteDoc(doc(db, 'mealPlans', mealId));
    } catch (err) {
       console.error("Failed to delete planner meal:", err);
    }
  };

  // Quick log new custom meal/food
  const handleQuickLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !quickName.trim()) return;

    try {
      const cal = Number(quickCalories) || (automaticEstimates?.calories ?? 150);
      const pro = Number(quickProtein) || (automaticEstimates?.protein ?? 10);
      const carb = Number(quickCarbs) || (automaticEstimates?.carbs ?? 25);
      const fat = Number(quickFat) || (automaticEstimates?.fat ?? 6);

      const mealObj: any = {
        userId: user.uid,
        date: selectedDate,
        mealType: quickMealType,
        recipeId: 'quick-log',
        recipeName: quickName.trim(),
        completed: true, // Auto-marked as eaten since they log it directly
        calories: cal,
        protein: pro,
        carbs: carb,
        fat: fat,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, 'mealPlans'), mealObj);

      // Reset Form fields
      setQuickName("");
      setQuickCalories("");
      setQuickProtein("");
      setQuickCarbs("");
      setQuickFat("");
      setIsQuickLogExpanded(false);
    } catch (err) {
      console.error("Failed to log food directly:", err);
    }
  };

  // Custom macro goals setting
  const saveMacroTargets = async (e: React.FormEvent) => {
    e.preventDefault();
    await saveDailyLogField({
      targetCalories: Number(tempTargets.targetCalories) || DEFAULT_TARGETS.targetCalories,
      targetProtein: Number(tempTargets.targetProtein) || DEFAULT_TARGETS.targetProtein,
      targetCarbs: Number(tempTargets.targetCarbs) || DEFAULT_TARGETS.targetCarbs,
      targetFat: Number(tempTargets.targetFat) || DEFAULT_TARGETS.targetFat,
    });
    setIsEditingTargets(false);
  };

  // Format date helper
  const dateFormattedDisplay = useMemo(() => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdayStr = format(subDays(new Date(), 1), 'yyyy-MM-dd');
    const tomorrowStr = format(addDays(new Date(), 1), 'yyyy-MM-dd');

    if (selectedDate === todayStr) return "Today";
    if (selectedDate === yesterdayStr) return "Yesterday";
    if (selectedDate === tomorrowStr) return "Tomorrow";

    try {
      const parsed = parseISO(selectedDate);
      return format(parsed, 'EE, MMM d, yyyy');
    } catch {
      return selectedDate;
    }
  }, [selectedDate]);

  // Navigate through dates
  const changeDate = (amount: number) => {
    try {
      const parsed = parseISO(selectedDate);
      const offset = amount > 0 ? addDays(parsed, 1) : subDays(parsed, 1);
      setSelectedDate(format(offset, 'yyyy-MM-dd'));
    } catch (e) {
      console.error("Failed to slide date state:", e);
    }
  };

  // Chart data for Recharts
  const macroChartData = [
    {
      name: 'Protein',
      Logged: aggregates.completed.protein,
      Target: dailyLog.targetProtein,
      unit: 'g'
    },
    {
      name: 'Carbs',
      Logged: aggregates.completed.carbs,
      Target: dailyLog.targetCarbs,
      unit: 'g'
    },
    {
      name: 'Fats',
      Logged: aggregates.completed.fat,
      Target: dailyLog.targetFat,
      unit: 'g'
    }
  ];

  // Circular gauge config
  const calPercent = Math.min(100, Math.round((aggregates.completed.calories / dailyLog.targetCalories) * 100)) || 0;
  
  const pieData = [
    { name: 'Completed', value: aggregates.completed.calories, color: '#f59e0b' },
    { name: 'Remaining', value: Math.max(0, dailyLog.targetCalories - aggregates.completed.calories), color: '#334155' }
  ];

  // Energy descriptors
  const getEnergyLevelBadge = (level: number) => {
    if (level <= 3) return { text: "Fatigued / Sleepy", color: "text-rose-400 bg-rose-500/10 border-rose-500/20" };
    if (level <= 6) return { text: "Steady Balance", color: "text-amber-accent bg-amber-accent/10 border-amber-accent/20" };
    if (level <= 8) return { text: "Sharp Focus", color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20" };
    return { text: "Peak Athleticism!", color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" };
  };

  return (
    <div className="max-w-4xl mx-auto space-y-10 px-4 md:px-0">
      
      {/* 1. Header Banner & Dynamic Date Wheel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-white/5 pb-8">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-amber-accent">
            <Activity className="w-5 h-5" />
            <span className="text-[10px] font-black uppercase tracking-[0.25em]">Direct Nutrition Portal</span>
          </div>
          <h1 className="font-serif text-4xl md:text-5xl font-light text-white">Fuel Management</h1>
          <p className="text-xs text-white/40 max-w-xl">
            Real-time analytics mapping energy synthesis, macronutrient targets, and water absorption directly linked to your recipe journal and grocery list.
          </p>
        </div>

        {/* Dynamic Date switcher */}
        <div className="bg-graphite/40 border border-white/5 p-2 rounded-2xl flex items-center gap-4 shadow-xl shrink-0 self-start md:self-center">
          <button 
            type="button"
            onClick={() => changeDate(-1)}
            className="p-3 bg-white/5 hover:bg-amber-accent/15 border border-white/5 text-white/60 hover:text-amber-accent rounded-xl transition-all cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <div className="flex flex-col items-center min-w-[130px] px-2 text-center">
            <span className="text-[9px] uppercase tracking-widest font-black text-amber-accent">{dateFormattedDisplay}</span>
            <input 
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-[11px] bg-transparent text-white/50 border-none font-sans font-bold focus:outline-none cursor-pointer text-center mt-0.5"
            />
          </div>

          <button 
            type="button"
            onClick={() => changeDate(1)}
            className="p-3 bg-white/5 hover:bg-amber-accent/15 border border-white/5 text-white/60 hover:text-amber-accent rounded-xl transition-all cursor-pointer"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Bento Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">

        {/* LEFT COLUMN: Caloric Progress and Interactive Graphical Charts (7/12 width) */}
        <div className="md:col-span-7 space-y-6">
          
          {/* Caloric Intake Gauge */}
          <div className="bg-graphite/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-accent/5 blur-3xl rounded-full" />
            
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-5 flex items-center gap-1.5">
              <Flame className="w-4 h-4 text-amber-accent" />
              Calorie Burn & Balance
            </h3>

            <div className="flex flex-col sm:flex-row items-center gap-6 justify-around">
              {/* Circular Gauge */}
              <div className="relative w-40 h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={65}
                      startAngle={90}
                      endAngle={-270}
                      paddingAngle={0}
                      dataKey="value"
                    >
                      <Cell fill="#f59e0b" />
                      <Cell fill="#1e293b" />
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
                
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-2xl font-bold text-white leading-none">{aggregates.completed.calories}</span>
                  <span className="text-[8px] font-bold text-amber-accent/60 uppercase tracking-widest mt-1">OF {dailyLog.targetCalories} kcal</span>
                  <span className="text-[10px] font-black text-emerald-400 mt-1">{calPercent}%</span>
                </div>
              </div>

              {/* Text Stats comparison */}
              <div className="space-y-4 self-center w-full sm:w-auto">
                <div className="bg-onyx/50 border border-white/5 rounded-2xl p-4.5 min-w-[200px] flex justify-between items-center">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-white/30 font-bold">Planned Intake</p>
                    <h4 className="text-lg font-bold text-white mt-0.5">{aggregates.planned.calories} cal</h4>
                    <p className="text-[8px] text-white/40 mt-0.5">{meals.length} planned meals</p>
                  </div>
                  <CalendarIcon className="w-5 h-5 text-white/20 shrink-0" />
                </div>

                <div className="bg-onyx/50 border border-white/5 rounded-2xl p-4.5 min-w-[200px] flex justify-between items-center">
                  <div>
                    <p className="text-[9px] uppercase tracking-wider text-emerald-400/80 font-bold">Logged Consumed</p>
                    <h4 className="text-lg font-bold text-emerald-400 mt-0.5">{aggregates.completed.calories} cal</h4>
                    <p className="text-[8px] text-white/40 mt-0.5">
                      {richMeals.filter(m => m.completed).length} items confirmed
                    </p>
                  </div>
                  <Check className="w-5 h-5 text-emerald-400/40 shrink-0 border border-emerald-500/20 rounded-full p-0.5 bg-emerald-500/5" />
                </div>
              </div>
            </div>
          </div>

          {/* Interactive Recharts Macronutrients Graph */}
          <div className="bg-graphite/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-6 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-amber-accent" />
              Macronutrient Profiles
            </h3>

            {/* Recharts Bar Chart */}
            <div className="h-[240px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={macroChartData}
                  layout="horizontal"
                  margin={{ top: 10, right: 10, left: -25, bottom: 5 }}
                >
                  <XAxis 
                    dataKey="name" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    fontWeight="bold"
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{ 
                      backgroundColor: '#18181b', 
                      borderColor: '#27272a', 
                      borderRadius: '16px',
                      color: '#ffffff',
                      fontSize: '11px',
                      fontFamily: 'monospace'
                    }}
                    cursor={{ fill: 'rgba(255, 255, 255, 0.02)' }}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={36} 
                    iconType="circle"
                    iconSize={8}
                    wrapperStyle={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.1em' }}
                  />
                  <Bar dataKey="Logged" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                    {macroChartData.map((entry, index) => (
                      <Cell key={`cell-logged-${index}`} fill={entry.Logged >= entry.Target ? '#34d399' : '#f59e0b'} />
                    ))}
                  </Bar>
                  <Bar dataKey="Target" fill="#334155" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Detailed Macro numerical list cards */}
            <div className="grid grid-cols-3 gap-2.5 mt-4">
              {macroChartData.map((macro) => {
                const percent = Math.min(100, Math.round((macro.Logged / macro.Target) * 100)) || 0;
                return (
                  <div key={macro.name} className="bg-onyx/40 border border-white/5 rounded-2xl p-2.5 text-center">
                    <p className="text-[8px] uppercase tracking-widest text-white/40 font-bold">{macro.name}</p>
                    <div className="flex items-baseline justify-center gap-0.5 mt-1">
                      <span className="text-sm font-bold text-white">{macro.Logged}</span>
                      <span className="text-[9px] text-white/30">/{macro.Target}{macro.unit}</span>
                    </div>
                    {/* Linear micro status bar */}
                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden mt-1.5 relative">
                      <div 
                        className={`absolute inset-y-0 left-0 rounded-full ${percent >= 100 ? 'bg-emerald-400' : 'bg-amber-accent'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <span className="text-[8px] mt-1 block font-mono text-white/30">{percent}% met</span>
                  </div>
                );
              })}
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Hydration Log, Well-being inputs, Goals Editing (5/12 width) */}
        <div className="md:col-span-5 space-y-6">

          {/* Hydration Tracker */}
          <div className="bg-graphite/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-5 flex items-center gap-1.5">
              <Droplet className="w-4 h-4 text-cyan-400" />
              Hydration Absorption
            </h3>

            <div className="flex flex-col items-center">
              {/* Massive Hydration Droplet Ring */}
              <div className="relative w-28 h-28 flex items-center justify-center bg-cyan-400/5 border border-cyan-400/10 rounded-full shadow-inner animate-pulse">
                <Droplet className="w-12 h-12 text-cyan-400 animate-bounce cursor-pointer" onClick={() => addWater(250)} />
                <div className="absolute bottom-2 font-mono text-xs font-bold text-cyan-400">{dailyLog.waterIntake} ml</div>
              </div>

              <div className="text-center mt-4">
                <span className="text-[10px] text-white/40 font-bold uppercase tracking-wider block">Recommended target: 2500 ml</span>
                <span className="text-[9px] font-bold text-cyan-400 uppercase mt-0.5 block">
                  {dailyLog.waterIntake >= 2500 ? "Fully Saturated! 💧" : `${Math.max(0, 2500 - dailyLog.waterIntake)} ml remaining`}
                </span>
              </div>

              {/* Water logging presets */}
              <div className="flex items-center gap-2 mt-5">
                <button 
                  onClick={() => addWater(250)}
                  className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl text-[10px] font-bold tracking-wide text-cyan-400 transition-all active:scale-95 cursor-pointer"
                >
                  +250ml
                </button>
                <button 
                  onClick={() => addWater(500)}
                  className="px-3 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded-xl text-[10px] font-bold tracking-wide text-cyan-400 transition-all active:scale-95 cursor-pointer"
                >
                  +500ml (Large Glass)
                </button>
                {dailyLog.waterIntake > 0 && (
                  <button 
                    onClick={() => saveDailyLogField({ waterIntake: 0 })}
                    className="p-2 bg-white/5 hover:bg-rose-500/15 border border-white/5 hover:border-rose-500/20 text-white/40 hover:text-rose-400 rounded-xl transition-all active:scale-95 cursor-pointer"
                    title="Reset Water Log"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Energy & Wellness Journal */}
          <div className="bg-graphite/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
            <h3 className="text-xs font-bold uppercase tracking-widest text-white/60 mb-5 flex items-center gap-1.5">
              <Brain className="w-4 h-4 text-amber-accent" />
              Mind-Body Synthesis
            </h3>

            <div className="space-y-6">
              {/* Energy rating (1 to 10 scale) */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-[10px] uppercase font-bold text-white/50 tracking-wide">Daily Energy Score</span>
                  <span className="font-mono font-bold text-amber-accent">{dailyLog.energyLevel}/10</span>
                </div>
                
                <input 
                  type="range"
                  min="1"
                  max="10"
                  step="1"
                  value={dailyLog.energyLevel}
                  onChange={(e) => saveDailyLogField({ energyLevel: Number(e.target.value) })}
                  className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-accent"
                />

                <div className="flex justify-between text-[8px] font-black uppercase text-white/30 tracking-widest pt-1">
                  <span>Slow</span>
                  <span>Steady</span>
                  <span>Athletic</span>
                </div>

                <div className={`mt-3 py-2 px-3 border rounded-xl text-[10px] font-bold flex items-center justify-center ${getEnergyLevelBadge(dailyLog.energyLevel).color} transition-all`}>
                  {getEnergyLevelBadge(dailyLog.energyLevel).text}
                </div>
              </div>

              {/* Notes block */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <label className="text-[10px] uppercase font-bold text-white/50 tracking-wide block">Wellness & Satiety Notes</label>
                <textarea
                  rows={2}
                  placeholder="How do you feel today? Any bloat, high focus, or craving?"
                  value={dailyLog.notes || ""}
                  onChange={(e) => saveDailyLogField({ notes: e.target.value })}
                  className="w-full bg-onyx/50 border border-white/10 rounded-2xl p-3 text-xs text-white focus:outline-none focus:border-amber-accent placeholder-white/20"
                />
              </div>
            </div>
          </div>

          {/* Target Limits Settings Panel */}
          <div className="bg-graphite/40 border border-white/5 rounded-3xl p-6 relative overflow-hidden backdrop-blur-md">
            {!isEditingTargets ? (
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white/80">Goal Targets</h4>
                  <p className="text-[10px] text-white/40 mt-1 font-mono">Cal: {dailyLog.targetCalories} cal | Pro: {dailyLog.targetProtein}g</p>
                </div>
                <button 
                  onClick={() => setIsEditingTargets(true)}
                  className="p-2.5 bg-white/5 hover:bg-amber-accent/15 border border-white/5 text-white/70 hover:text-amber-accent rounded-xl transition-colors cursor-pointer"
                >
                  <Settings className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <form onSubmit={saveMacroTargets} className="space-y-4">
                <div className="flex justify-between items-center mb-1">
                  <h4 className="text-xs font-bold uppercase tracking-widest text-white">Edit Goal Targets</h4>
                  <button 
                    type="button"
                    onClick={() => setIsEditingTargets(false)}
                    className="text-[9px] uppercase tracking-wider font-bold text-white/40 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] uppercase font-bold text-white/30 tracking-wider block mb-1">Calories (kcal)</label>
                    <input 
                      type="number"
                      required
                      value={tempTargets.targetCalories}
                      onChange={(e) => setTempTargets({...tempTargets, targetCalories: Number(e.target.value) || 0})}
                      className="w-full bg-onyx border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-accent text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-white/30 tracking-wider block mb-1">Protein (g)</label>
                    <input 
                      type="number"
                      required
                      value={tempTargets.targetProtein}
                      onChange={(e) => setTempTargets({...tempTargets, targetProtein: Number(e.target.value) || 0})}
                      className="w-full bg-onyx border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-accent text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-white/30 tracking-wider block mb-1">Carbs (g)</label>
                    <input 
                      type="number"
                      required
                      value={tempTargets.targetCarbs}
                      onChange={(e) => setTempTargets({...tempTargets, targetCarbs: Number(e.target.value) || 0})}
                      className="w-full bg-onyx border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-accent text-center"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] uppercase font-bold text-white/30 tracking-wider block mb-1">Fats (g)</label>
                    <input 
                      type="number"
                      required
                      value={tempTargets.targetFat}
                      onChange={(e) => setTempTargets({...tempTargets, targetFat: Number(e.target.value) || 0})}
                      className="w-full bg-onyx border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:ring-1 focus:ring-amber-accent text-center"
                    />
                  </div>
                </div>

                <button 
                  type="submit"
                  className="w-full py-2 bg-amber-accent hover:bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer mt-1"
                >
                  Save Settings
                </button>
              </form>
            )}
          </div>

        </div>

      </div>

      {/* 3. Daily Planner Meal Log & Completion Checkbox Tracker */}
      <div className="bg-graphite/40 border border-white/5 rounded-3xl p-6 backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-5 mb-5">
          <div>
            <h2 className="text-lg font-serif font-light text-white">Daily Consumption Journal</h2>
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mt-0.5">Toggle Eaten items to map nutrients</p>
          </div>

          <button 
            onClick={() => setIsQuickLogExpanded(!isQuickLogExpanded)}
            className="flex items-center gap-2 px-4 py-2.5 bg-amber-accent/10 hover:bg-amber-accent/20 border border-amber-accent/20 rounded-2xl text-[10px] tracking-widest font-black uppercase text-amber-accent transition-all cursor-pointer self-start sm:self-center"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Quick-Log Food</span>
          </button>
        </div>

        {/* Quick Log Form Block */}
        <AnimatePresence>
          {isQuickLogExpanded && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-b border-white/5 mb-6.5"
            >
              <form onSubmit={handleQuickLog} className="bg-white/[0.02] border border-white/5 rounded-3xl p-6 mb-6.5 space-y-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-accent animate-pulse" />
                  <span className="text-[9px] uppercase font-black tracking-widest text-amber-accent">Smart Log Prediction</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                  <div className="sm:col-span-3">
                    <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">Meal category</label>
                    <select
                      value={quickMealType}
                      onChange={(e) => setQuickMealType(e.target.value as any)}
                      className="w-full bg-onyx border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    >
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                      <option value="snack">Snack</option>
                      <option value="dessert">Dessert</option>
                    </select>
                  </div>

                  <div className="sm:col-span-5">
                    <label className="text-[9px] uppercase font-bold text-white/40 block mb-1">Food name (e.g. Oatmeal, Chicken breast)</label>
                    <input 
                      type="text"
                      required
                      placeholder="Banana or Homemade chili"
                      value={quickName}
                      onChange={(e) => setQuickName(e.target.value)}
                      className="w-full bg-onyx border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-4 self-end">
                    <button 
                      type="submit"
                      className="w-full py-2 bg-amber-accent hover:bg-white text-black rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                    >
                      Instant Confirm & Eat
                    </button>
                  </div>
                </div>

                {/* Macro predictions / Customize Overrides */}
                <div className="bg-onyx/40 border border-white/5 rounded-2xl p-4.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] text-white/40 font-bold flex items-center gap-1.5 uppercase">
                      <Info className="w-3.5 h-3.5" />
                      Macro Estimates (Customize below if you wish)
                    </p>
                    {automaticEstimates && (
                      <span className="text-[8px] bg-amber-accent/10 border border-amber-accent/20 px-2 py-0.5 rounded text-amber-accent uppercase tracking-widest font-bold">Matched Preset</span>
                    )}
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div>
                      <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest block mb-0.5">Cal (kcal)</label>
                      <input 
                        type="number"
                        placeholder={automaticEstimates ? String(automaticEstimates.calories) : "150"}
                        value={quickCalories}
                        onChange={(e) => setQuickCalories(e.target.value)}
                        className="w-full bg-onyx border border-white/5 rounded-xl py-1 px-2.5 text-xs text-white text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest block mb-0.5">Protein (g)</label>
                      <input 
                        type="number"
                        placeholder={automaticEstimates ? String(automaticEstimates.protein) : "10"}
                        value={quickProtein}
                        onChange={(e) => setQuickProtein(e.target.value)}
                        className="w-full bg-onyx border border-white/5 rounded-xl py-1 px-2.5 text-xs text-white text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest block mb-0.5">Carbs (g)</label>
                      <input 
                        type="number"
                        placeholder={automaticEstimates ? String(automaticEstimates.carbs) : "25"}
                        value={quickCarbs}
                        onChange={(e) => setQuickCarbs(e.target.value)}
                        className="w-full bg-onyx border border-white/5 rounded-xl py-1 px-2.5 text-xs text-white text-center font-mono"
                      />
                    </div>
                    <div>
                      <label className="text-[8px] font-bold text-white/30 uppercase tracking-widest block mb-0.5">Fat (g)</label>
                      <input 
                        type="number"
                        placeholder={automaticEstimates ? String(automaticEstimates.fat) : "6"}
                        value={quickFat}
                        onChange={(e) => setQuickFat(e.target.value)}
                        className="w-full bg-onyx border border-white/5 rounded-xl py-1 px-2.5 text-xs text-white text-center font-mono"
                      />
                    </div>
                  </div>
                </div>
              </form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loaded Meals checklist */}
        {loadingMeals ? (
          <div className="py-12 flex justify-center text-xs uppercase tracking-widest text-white/25">
            Synchronizing calorie logs...
          </div>
        ) : richMeals.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
            <Info className="w-8 h-8 text-white/10 mx-auto mb-3" />
            <h4 className="text-white font-serif font-light text-base">No planned nutrition logged for this date</h4>
            <p className="text-[10px] text-white/30 mt-1 max-w-sm mx-auto">
              Plan meals in your calendar page, or use the "Quick-Log" builder above to instantly confirm custom items!
            </p>
          </div>
        ) : (
          <div className="space-y-3.5">
            {richMeals.map((meal) => (
              <div 
                key={meal.id} 
                className={`border p-4.5 rounded-2xl flex items-center justify-between gap-4 transition-all ${
                  meal.completed 
                    ? 'bg-emerald-500/[0.02] border-emerald-500/20 shadow-sm' 
                    : 'bg-white/[0.01] border-white/5 hover:border-white/10'
                }`}
              >
                <div className="flex items-center gap-4">
                  {/* Status checklist trigger */}
                  <button 
                    onClick={() => toggleMealComplete(meal.id!, meal.completed || false)}
                    className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center cursor-pointer transition-all ${
                      meal.completed 
                        ? 'bg-emerald-500 border-emerald-500 text-black shadow-md' 
                        : 'border-white/20 text-transparent hover:border-amber-accent'
                    }`}
                  >
                    <Check className="w-4 h-4 text-current" />
                  </button>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[8px] font-black uppercase tracking-wider bg-white/5 text-white/50 px-2 py-0.5 rounded">
                        {meal.mealType}
                      </span>
                      {meal.completed && (
                        <span className="text-[8px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                          Eaten
                        </span>
                      )}
                    </div>
                    
                    <h4 className="text-sm font-bold text-white mt-1">{meal.recipeName}</h4>
                    
                    {/* Nutrient stats row */}
                    <div className="flex items-center gap-3.5 mt-1 font-mono text-[10px] text-white/40">
                      <span>{meal.calories} kcal</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span>P: {meal.protein}g</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span>C: {meal.carbs}g</span>
                      <span className="w-1 h-1 rounded-full bg-white/10" />
                      <span>F: {meal.fat}g</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2.5">
                  <button 
                    onClick={() => removeMeal(meal.id!)}
                    className="p-2 text-white/10 hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all cursor-pointer"
                    title="Remove Meal"
                  >
                    <Trash2 className="w-4.5 h-4.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
}
