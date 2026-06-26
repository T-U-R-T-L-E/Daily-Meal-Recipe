export interface Recipe {
  id?: string;
  name: string;
  description: string;
  ingredients: { item: string; amount: string; unit?: string; baseAmount: number }[];
  instructions: { text: string; imageUrl?: string; tips?: string }[];
  prepTime: string;
  cookTime: string;
  restTime?: string;
  cookingTime: string; // Legacy aggregate
  difficulty: "Beginner" | "Intermediate" | "Expert" | "Professional";
  authorId: string;
  authorName?: string;
  isPublic: boolean;
  status?: "pending" | "approved" | "rejected";
  createdAt: any;
  imageUrl?: string;
  videoUrl?: string;
  viewCount?: number;
  saveCount?: number;
  category: "Breakfast" | "Lunch" | "Dinner" | "Snack" | "Dessert";
  cuisine: string;
  dietaryTags: string[];
  methods?: string[];
  occasions?: string[];
  nutrition?: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  ratingsCount: number;
  averageRating: number;
  servings: number;
  healthAdvice?: string;
  isFallback?: boolean;
}

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt: string;
}

export interface Challenge {
  id: string;
  name: string;
  description: string;
  endsAt: string;
  points: number;
  progress: number;
  goal: number;
}

export interface UserProfile {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
  dietaryPreferences: string[];
  allergies: string[];
  skillLevel: "Beginner" | "Intermediate" | "Expert" | "Professional";
  language: string;
  badges: string[];
  streaks: number;
  cookedCount: number;
  points: number;
  achievements: Achievement[];
  activeChallenges: Challenge[];
  healthConditions: string[];
  fitnessGoals: string[];
  activityLevel: 'Sedentary' | 'Light' | 'Moderate' | 'Active' | 'Athlete';
  lastCookedDate?: string;
  createdAt: string;
  role?: 'admin' | 'user' | 'seller';
  isProfileComplete?: boolean;
  themePreference?: 'dark' | 'light';
  preferredCurrency?: 'KES' | 'USD' | 'NGN' | 'GHS' | 'ZAR';
  subscription?: {
    status: 'active' | 'trial' | 'past_due' | 'canceled' | 'unpaid' | 'expired' | 'none';
    trialEndDate: string;
    subscribedDate?: string;
    endDate?: string;
    nextPaymentDate?: string;
  };
  paymentMethods?: SavedCard[];
  billingHistory?: BillingReceipt[];
}

export interface SavedCard {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
  id: string;
  card_type?: string;
}

export interface BillingReceipt {
  id: string;
  amount: number;
  status: 'success' | 'failed' | 'trial_active';
  date: string;
  plan: string;
  reference: string;
  currency?: string;
}

export interface MealPlan {
  id?: string;
  userId: string;
  recipeId: string;
  recipeName?: string;
  date: string;
  mealType: "breakfast" | "lunch" | "dinner" | "snack" | "dessert";
  completed?: boolean;
}

export interface NutritionLog {
  id?: string;
  userId: string;
  date: string; // YYYY-MM-DD
  waterIntake: number; // in ml
  energyLevel: number; // 1 to 10
  targetCalories: number;
  targetProtein: number;
  targetCarbs: number;
  targetFat: number;
  notes?: string;
}

export interface ShoppingListItem {
  id?: string;
  userId: string;
  item: string;
  amount: string;
  category?: string;
  completed: boolean;
  createdAt: any;
  familyId?: string;
  addedByName?: string;
  addedByPhoto?: string;
  completedBy?: string;
  completedByName?: string;
}

export interface PantryItem {
  id?: string;
  userId: string;
  item: string;
  quantity: string;
  expiryDate?: string;
  category: string;
}

export interface Review {
  id?: string;
  recipeId: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  rating: number;
  comment: string;
  photoUrl?: string;
  createdAt: any;
}
