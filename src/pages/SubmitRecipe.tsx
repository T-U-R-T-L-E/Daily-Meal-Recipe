import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where, orderBy, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Recipe } from '../types';
import { useAuth } from '../lib/useAuth';
import { useNavigate, Link } from 'react-router-dom';
import { 
  ChefHat, 
  Plus, 
  Trash2, 
  Upload, 
  Image as ImageIcon, 
  X, 
  Clock, 
  Check, 
  AlertCircle, 
  Loader2, 
  ArrowLeft, 
  Sparkles, 
  CheckCircle2, 
  XSquare, 
  UtensilsCrossed, 
  ChevronRight,
  Eye,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function SubmitRecipe() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  // Tab states: 'form' | 'submissions'
  const [activeTab, setActiveTab] = useState<'form' | 'submissions'>('form');

  // Form step states
  const [formStep, setFormStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Core Form Fields
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert'>('Dinner');
  const [cuisine, setCuisine] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Expert' | 'Professional'>('Beginner');
  const [servings, setServings] = useState<number>(2);
  const [prepMinutes, setPrepMinutes] = useState<number>(15);
  const [cookMinutes, setCookMinutes] = useState<number>(20);
  
  // Ingredients list structure
  const [ingredients, setIngredients] = useState<Array<{ 
    item: string; 
    amount: string; 
    unit: string; 
    category: string;
  }>>([
    { item: '', amount: '1', unit: 'pcs', category: 'Other' }
  ]);

  // Instructions list structure
  const [instructions, setInstructions] = useState<Array<{ 
    text: string; 
    tips?: string; 
  }>>([
    { text: '' }
  ]);

  // Photo uploads
  const [photoOption, setPhotoOption] = useState<'upload' | 'url'>('upload');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // User Submissions History
  const [userRecipes, setUserRecipes] = useState<Recipe[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Categories and unit choices
  const categoryOptions = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Dessert'];
  const difficultyOptions = ['Beginner', 'Intermediate', 'Expert', 'Professional'];
  const ingredientCategoryOptions = [
    'Proteins', 'Vegetables', 'Dairy', 'Grains', 'Fruits', 'Spices', 'Baking', 'Other'
  ];
  const unitOptions = ['pcs', 'g', 'kg', 'ml', 'l', 'tbsp', 'tsp', 'cups', 'units', 'oz', 'lbs', 'cloves', 'to taste', 'pinch'];

  // Default food presets if no image is uploaded
  const presetFoodImages: Record<string, string> = {
    Breakfast: 'https://images.unsplash.com/photo-1525351484163-7529414344d8?auto=format&fit=crop&q=80&w=800',
    Lunch: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=800',
    Dinner: 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&q=80&w=800',
    Snack: 'https://images.unsplash.com/photo-1590080875515-8a3a8dc5735e?auto=format&fit=crop&q=80&w=800',
    Dessert: 'https://images.unsplash.com/photo-1551024601-bec78aea704b?auto=format&fit=crop&q=80&w=800'
  };

  // Convert uploaded image to low-res base64 string
  const handleImageFile = (file: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErrorMsg("Please select a valid image file.");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Simple HTML5 Canvas compression
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 400;
        const MAX_HEIGHT = 300;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const base64Str = canvas.toDataURL('image/jpeg', 0.7); // 70% quality jpeg
          setImagePreview(base64Str);
          setImageUrl(base64Str);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = () => {
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleImageFile(e.dataTransfer.files[0]);
    }
  };

  // Dynamic ingredient handlers
  const addIngredient = () => {
    setIngredients([...ingredients, { item: '', amount: '1', unit: 'pcs', category: 'Other' }]);
  };

  const removeIngredient = (index: number) => {
    if (ingredients.length === 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredientField = (index: number, field: string, value: string) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  // Dynamic instruction handlers
  const addInstruction = () => {
    setInstructions([...instructions, { text: '' }]);
  };

  const removeInstruction = (index: number) => {
    if (instructions.length === 1) return;
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const updateInstructionField = (index: number, field: string, value: string) => {
    const updated = [...instructions];
    updated[index] = { ...updated[index], [field]: value };
    setInstructions(updated);
  };

  // Save recipe to Firestore
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setErrorMsg("You must be signed in to submit a recipe.");
      return;
    }

    // Validation
    if (!name.trim()) {
      setErrorMsg("Recipe title is required.");
      setFormStep(1);
      return;
    }
    
    const filteredIngredients = ingredients.filter(ing => ing.item.trim() !== '');
    if (filteredIngredients.length === 0) {
      setErrorMsg("Please provide at least one valid ingredient.");
      setFormStep(2);
      return;
    }

    const filteredInstructions = instructions.filter(step => step.text.trim() !== '');
    if (filteredInstructions.length === 0) {
      setErrorMsg("Please provide at least one instruction step.");
      setFormStep(2);
      return;
    }

    setSubmitting(true);
    setErrorMsg(null);

    const finalImage = imageUrl.trim() || presetFoodImages[category];

    // Build the format required by database and components
    const finalRecipePayload = {
      name: name.trim(),
      description: description.trim() || `A customized delicious homemade ${category.toLowerCase()} dish.`,
      prepTime: `${prepMinutes} min`,
      cookTime: `${cookMinutes} min`,
      cookingTime: `${prepMinutes + cookMinutes} min`,
      difficulty: difficulty,
      servings: Number(servings),
      category: category,
      cuisine: cuisine.trim() || "International",
      isPublic: true,
      status: 'pending', // Starts in moderation queue!
      authorId: user.uid,
      authorName: user.displayName || user.email?.split('@')[0] || "Chef Enthusiast",
      createdAt: serverTimestamp(),
      imageUrl: finalImage,
      ingredients: filteredIngredients.map(ing => ({
        item: ing.item.trim(),
        amount: ing.amount,
        unit: ing.unit,
        baseAmount: parseFloat(ing.amount) || 1
      })),
      instructions: filteredInstructions.map(step => ({
        text: step.text.trim(),
        tips: step.tips?.trim() || ""
      })),
      dietaryTags: [],
      averageRating: 5.0,
      ratingsCount: 0,
      viewCount: 0,
      saveCount: 0
    };

    try {
      await addDoc(collection(db, 'recipes'), finalRecipePayload);
      setSuccess(true);
      
      // Clear form
      setName('');
      setDescription('');
      setCuisine('');
      setPrepMinutes(15);
      setCookMinutes(20);
      setIngredients([{ item: '', amount: '1', unit: 'pcs', category: 'Other' }]);
      setInstructions([{ text: '' }]);
      setImagePreview(null);
      setImageUrl('');
      setFormStep(1);

      // Load updated submissions list
      loadHistory();
    } catch (err) {
      console.error(err);
      setErrorMsg("Error submitting recipe. Please review your draft and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  // Load user previous submissions
  const loadHistory = async () => {
    if (!user) return;
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, 'recipes'),
        where('authorId', '==', user.uid),
        orderBy('createdAt', 'desc')
      );
      const snapshot = await getDocs(q);
      const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
      setUserRecipes(items);
    } catch (err) {
      console.error("Failed to load user recipes:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    if (user) {
      loadHistory();
    }
  }, [user]);

  // Remove draft/saved submissions
  const handleDeleteSubmission = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this submitted recipe? This will delete it permanently.")) return;
    try {
      await deleteDoc(doc(db, 'recipes', id));
      setUserRecipes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      console.error("Deletion failed:", err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 space-y-12">
      {/* Dynamic Breadcrumbs & Header banner */}
      <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between border-b border-white/5 pb-10">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-xs font-black uppercase text-amber-accent tracking-widest">
            <ChefHat className="w-4 h-4" />
            <span>Culinary Submission Portal</span>
          </div>
          <h1 className="font-serif text-5xl font-light text-white leading-tight">
            Share Your <span className="italic text-amber-accent font-light font-serif">Signature Recipe</span>
          </h1>
          <p className="text-gray-400 font-light text-base max-w-2xl">
            Pass down your culinary secrets. Every contribution is held in high-reverence. Once reviewed by our Master Chefs queue, it will be published to the global libraries.
          </p>
        </div>

        {/* View switching bar */}
        <div className="flex bg-white/5 p-1 rounded-2xl border border-white/5 self-start">
          <button
            onClick={() => setActiveTab('form')}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
              activeTab === 'form' 
                ? 'bg-amber-accent text-black font-semibold shadow-lg shadow-amber-accent/10' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            New Submission
          </button>
          <button
            onClick={() => {
              setActiveTab('submissions');
              loadHistory();
            }}
            className={`px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer relative ${
              activeTab === 'submissions' 
                ? 'bg-amber-accent text-black font-semibold shadow-lg shadow-amber-accent/10' 
                : 'text-white/60 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            My Submissions
            {userRecipes.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center border border-black animate-pulse">
                {userRecipes.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Main Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Form area / History area */}
        <div className="lg:col-span-2 space-y-8">
          <AnimatePresence mode="wait">
            {activeTab === 'form' ? (
              <motion.div
                key="form-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="bg-graphite/40 border border-white/5 p-8 md:p-12 rounded-[32px] shadow-2xl relative overflow-hidden"
              >
                {/* Visual Glow background */}
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-accent/2.5 blur-[80px] rounded-full pointer-events-none" />

                {success ? (
                  <motion.div 
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="py-16 text-center space-y-6 flex flex-col items-center"
                  >
                    <div className="bg-emerald-500/10 p-5 rounded-full border border-emerald-500/20">
                      <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                    </div>
                    <div className="space-y-2">
                      <h2 className="text-3xl font-serif text-white italic">Recipe Submitted Successfully!</h2>
                      <p className="text-gray-400 font-light max-w-md mx-auto text-sm leading-relaxed">
                        Your custom recipe has been dispatched to the Master Chef queue for review. You can check its current moderation status underneath <button onClick={() => { setSuccess(false); setActiveTab('submissions'); }} className="text-amber-accent hover:underline font-bold">My Submissions</button>.
                      </p>
                    </div>
                    <button
                      onClick={() => setSuccess(false)}
                      className="px-8 py-3.5 bg-white text-black hover:bg-amber-accent hover:text-black transition-all rounded-2xl text-xs font-black uppercase tracking-widest cursor-pointer"
                    >
                      Submit Another Recipe
                    </button>
                  </motion.div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-10">
                    
                    {/* Error Alerts */}
                    {errorMsg && (
                      <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 p-5 rounded-2xl text-red-300 text-sm">
                        <AlertCircle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                        <div className="space-y-0.5">
                          <span className="font-bold">Submission Blocked:</span>
                          <p className="font-light text-red-200/80">{errorMsg}</p>
                        </div>
                      </div>
                    )}

                    {/* Step Tracker Indicator */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-6">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-accent">Step {formStep} of 3</span>
                        <h2 className="text-xl font-medium text-white">
                          {formStep === 1 && "General Metadata & Story"}
                          {formStep === 2 && "Ingredients & Cooking Steps"}
                          {formStep === 3 && "Imagery & Food Aesthetics"}
                        </h2>
                      </div>
                      <div className="flex gap-1">
                        {[1, 2, 3].map((step) => (
                          <div 
                            key={step} 
                            className={`w-10 h-1.5 rounded-full transition-all duration-300 ${
                              formStep === step ? 'bg-amber-accent w-14' : formStep > step ? 'bg-amber-accent/40' : 'bg-white/10'
                            }`}
                          />
                        ))}
                      </div>
                    </div>

                    {/* STEP 1: Metadata */}
                    {formStep === 1 && (
                      <div className="space-y-8 animate-fadeIn">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block">Recipe Title *</label>
                          <input 
                            type="text"
                            required
                            placeholder="e.g., Grandmama's Slow-Roasted Basil Lasagna"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 focus:border-amber-accent hover:border-white/10 rounded-2xl text-white outline-none transition-all placeholder:text-white/20"
                          />
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block">Short Description / Subtitle</label>
                          <textarea 
                            rows={3}
                            placeholder="Describe the story, scent, origin, or unique personality of this signature dinner staple."
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 focus:border-amber-accent hover:border-white/10 rounded-2xl text-white outline-none transition-all placeholder:text-white/20 resize-none font-light leading-relaxed"
                          />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block">Meal Category *</label>
                            <select
                              value={category}
                              onChange={(e) => setCategory(e.target.value as any)}
                              className="w-full px-5 py-4 bg-graphite border border-white/5 focus:border-amber-accent rounded-2xl text-white outline-none transition-all cursor-pointer font-medium"
                            >
                              {categoryOptions.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block">Cuisine / Origin</label>
                            <input 
                              type="text"
                              placeholder="e.g., Italian, French, Japanese, Fusion"
                              value={cuisine}
                              onChange={(e) => setCuisine(e.target.value)}
                              className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 focus:border-amber-accent hover:border-white/10 rounded-2xl text-white outline-none transition-all placeholder:text-white/20"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block">Difficulty *</label>
                            <select
                              value={difficulty}
                              onChange={(e) => setDifficulty(e.target.value as any)}
                              className="w-full px-5 py-4 bg-graphite border border-white/5 focus:border-amber-accent rounded-2xl text-white outline-none transition-all cursor-pointer font-medium"
                            >
                              {difficultyOptions.map(dif => (
                                <option key={dif} value={dif}>{dif}</option>
                              ))}
                            </select>
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block font-sans">Prep Time (minutes) *</label>
                            <input 
                              type="number"
                              min={1}
                              value={prepMinutes}
                              onChange={(e) => setPrepMinutes(Math.max(1, parseInt(e.target.value) || 0))}
                              className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 focus:border-amber-accent hover:border-white/10 rounded-2xl text-white outline-none transition-all font-mono"
                            />
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block font-sans">Cook Time (minutes) *</label>
                            <input 
                              type="number"
                              min={0}
                              value={cookMinutes}
                              onChange={(e) => setCookMinutes(Math.max(0, parseInt(e.target.value) || 0))}
                              className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 focus:border-amber-accent hover:border-white/10 rounded-2xl text-white outline-none transition-all font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                          <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block">Servings *</label>
                            <div className="flex items-center gap-3">
                              <button 
                                type="button"
                                onClick={() => setServings(s => Math.max(1, s - 1))}
                                className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white text-lg font-bold flex items-center justify-center transition-all cursor-pointer"
                              >
                                -
                              </button>
                              <span className="w-16 text-center font-serif text-2xl text-white font-mono">{servings}</span>
                              <button 
                                type="button"
                                onClick={() => setServings(s => s + 1)}
                                className="w-12 h-12 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl text-white text-lg font-bold flex items-center justify-center transition-all cursor-pointer"
                              >
                                +
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-end">
                            <div className="text-right bg-amber-accent/5 border border-amber-accent/10 px-6 py-3 rounded-2xl shrink-0">
                              <span className="text-[9px] uppercase font-black text-amber-accent/60 tracking-wider block">Estimated Total Cook Time</span>
                              <div className="flex items-center gap-1.5 text-white font-mono font-bold justify-end">
                                <Clock className="w-3.5 h-3.5 text-amber-accent" />
                                <span>{prepMinutes + cookMinutes} minutes</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 2: Ingredients & Instructions */}
                    {formStep === 2 && (
                      <div className="space-y-10 animate-fadeIn">
                        {/* Ingredients Builder */}
                        <div className="space-y-6">
                          <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <h3 className="font-serif text-lg text-white font-medium">Ingredients List *</h3>
                            <button
                              type="button"
                              onClick={addIngredient}
                              className="px-3.5 py-1.5 bg-amber-accent/10 hover:bg-amber-accent text-amber-accent hover:text-black hover:shadow-lg transition-all rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Add Ingredient
                            </button>
                          </div>

                          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">
                            {ingredients.map((ing, i) => (
                              <div key={i} className="flex flex-col md:flex-row gap-3 items-start bg-white/[0.01] border border-white/5 p-4 rounded-2xl relative">
                                <div className="grid grid-cols-12 gap-3 w-full">
                                  {/* Ingredient Item Name */}
                                  <div className="col-span-12 md:col-span-5">
                                    <input 
                                      type="text"
                                      placeholder="Ingredient Name (e.g., Grated Basil)"
                                      required
                                      value={ing.item}
                                      id={`ing-item-${i}`}
                                      onChange={(e) => updateIngredientField(i, 'item', e.target.value)}
                                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 focus:border-amber-accent rounded-xl text-xs text-white outline-none transition-all placeholder:text-white/20"
                                    />
                                  </div>

                                  {/* Amount */}
                                  <div className="col-span-4 md:col-span-2">
                                    <input 
                                      type="text"
                                      placeholder="Amount"
                                      required
                                      value={ing.amount}
                                      onChange={(e) => updateIngredientField(i, 'amount', e.target.value)}
                                      className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 focus:border-amber-accent text-center font-mono rounded-xl text-xs text-white outline-none transition-all placeholder:text-white/20"
                                    />
                                  </div>

                                  {/* Unit */}
                                  <div className="col-span-4 md:col-span-2">
                                    <select
                                      value={ing.unit}
                                      onChange={(e) => updateIngredientField(i, 'unit', e.target.value)}
                                      className="w-full px-3 py-3 bg-graphite border border-white/5 focus:border-amber-accent rounded-xl text-xs text-white outline-none transition-all cursor-pointer"
                                    >
                                      {unitOptions.map(unit => (
                                        <option key={unit} value={unit}>{unit}</option>
                                      ))}
                                    </select>
                                  </div>

                                  {/* Ingredient Category */}
                                  <div className="col-span-4 md:col-span-3">
                                    <select
                                      value={ing.category}
                                      onChange={(e) => updateIngredientField(i, 'category', e.target.value)}
                                      className="w-full px-3 py-3 bg-graphite border border-white/5 focus:border-amber-accent rounded-xl text-xs text-white outline-none transition-all cursor-pointer"
                                    >
                                      {ingredientCategoryOptions.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                {ingredients.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeIngredient(i)}
                                    id={`delete-ing-btn-${i}`}
                                    className="p-3 bg-red-500/10 hover:bg-red-500 hover:text-black text-red-400 rounded-xl transition-all cursor-pointer self-stretch flex items-center justify-center shrink-0"
                                    title="Delete Ingredient"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Instructions Builder */}
                        <div className="space-y-6">
                          <div className="flex items-center justify-between border-b border-white/5 pb-3">
                            <h3 className="font-serif text-lg text-white font-medium">Preparation Steps *</h3>
                            <button
                              type="button"
                              onClick={addInstruction}
                              className="px-3.5 py-1.5 bg-amber-accent/10 hover:bg-amber-accent text-amber-accent hover:text-black hover:shadow-lg transition-all rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 cursor-pointer"
                            >
                              <Plus className="w-3 h-3" /> Add Step
                            </button>
                          </div>

                          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 scrollbar-thin">
                            {instructions.map((step, i) => (
                              <div key={i} className="flex gap-4 items-start bg-white/[0.01] border border-white/5 p-5 rounded-2xl relative">
                                <div className="flex flex-col items-center justify-center bg-white/5 text-amber-accent font-serif w-8 h-8 rounded-full border border-white/10 text-xs font-bold shrink-0">
                                  {i + 1}
                                </div>

                                <div className="space-y-3 flex-grow">
                                  <textarea 
                                    rows={2}
                                    placeholder={`Step ${i + 1} Instructions...`}
                                    required
                                    value={step.text}
                                    id={`step-text-${i}`}
                                    onChange={(e) => updateInstructionField(i, 'text', e.target.value)}
                                    className="w-full px-4 py-3 bg-white/[0.03] border border-white/5 focus:border-amber-accent rounded-xl text-xs text-white outline-none transition-all placeholder:text-white/20 resize-none font-light leading-relaxed"
                                  />
                                  <input 
                                    type="text"
                                    placeholder="Helpful tips or Chef's warning (optional)"
                                    value={step.tips || ''}
                                    onChange={(e) => updateInstructionField(i, 'tips', e.target.value)}
                                    className="w-full px-4 py-2 bg-white/[0.01] border border-white/5 focus:border-amber-accent rounded-lg text-[11px] text-gray-400 outline-none transition-all placeholder:text-white/20 font-light"
                                  />
                                </div>

                                {instructions.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() => removeInstruction(i)}
                                    id={`delete-step-btn-${i}`}
                                    className="p-3 bg-red-500/10 hover:bg-red-500 hover:text-black text-red-400 rounded-xl transition-all cursor-pointer self-start"
                                    title="Delete Step"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* STEP 3: Imagery upload / URL selection */}
                    {formStep === 3 && (
                      <div className="space-y-8 animate-fadeIn">
                        
                        {/* Selector tabs */}
                        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 max-w-xs">
                          <button
                            type="button"
                            onClick={() => setPhotoOption('upload')}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                              photoOption === 'upload' ? 'bg-amber-accent text-black' : 'text-white/50 hover:text-white'
                            }`}
                          >
                            Upload File
                          </button>
                          <button
                            type="button"
                            onClick={() => setPhotoOption('url')}
                            className={`flex-1 py-2 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer ${
                              photoOption === 'url' ? 'bg-amber-accent text-black' : 'text-white/50 hover:text-white'
                            }`}
                          >
                            External URL
                          </button>
                        </div>

                        {photoOption === 'upload' ? (
                          <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block">Upload Recipe Image</label>
                            
                            <div 
                              onDragOver={onDragOver}
                              onDragLeave={onDragLeave}
                              onDrop={onDrop}
                              className={`border-2 border-dashed rounded-[32px] p-8 md:p-12 text-center transition-all cursor-pointer relative flex flex-col items-center justify-center min-h-[220px] ${
                                isDragging 
                                  ? 'border-amber-accent bg-amber-accent/5' 
                                  : imagePreview 
                                    ? 'border-white/20 bg-black/40' 
                                    : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                              }`}
                            >
                              <input 
                                type="file"
                                id="recipe-photo-picker"
                                accept="image/*"
                                onChange={(e) => e.target.files && handleImageFile(e.target.files[0])}
                                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-15"
                              />

                              {imagePreview ? (
                                <div className="relative w-full max-w-sm h-48 rounded-2xl overflow-hidden shadow-xl border border-white/10 z-10">
                                  <img src={imagePreview} alt="Recipe Preview" className="w-full h-full object-cover" />
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setImagePreview(null);
                                      setImageUrl('');
                                    }}
                                    className="absolute top-3 right-3 bg-black/60 hover:bg-black p-2 rounded-full border border-white/10 text-white transition-all z-20 cursor-pointer"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              ) : (
                                <div className="space-y-4">
                                  <div className="mx-auto w-14 h-14 bg-white/5 border border-white/10 rounded-full flex items-center justify-center">
                                    <Upload className="w-6 h-6 text-amber-accent/80" />
                                  </div>
                                  <div className="space-y-1">
                                    <span className="text-sm font-semibold text-white block">Drag and drop recipe culinary masterpiece here</span>
                                    <span className="text-xs text-gray-500 font-light block">or click to browse local folders (JPG, PNG)</span>
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="space-y-2">
                              <label className="text-[10px] font-black uppercase tracking-widest text-white/50 block">Culinary Artwork Image URL</label>
                              <input 
                                type="url"
                                placeholder="https://images.unsplash.com/photo-..."
                                value={imageUrl}
                                onChange={(e) => {
                                  setImageUrl(e.target.value);
                                  setImagePreview(e.target.value);
                                }}
                                className="w-full px-5 py-4 bg-white/[0.03] border border-white/5 focus:border-amber-accent hover:border-white/10 rounded-2xl text-white outline-none transition-all placeholder:text-white/20 font-mono text-xs"
                              />
                            </div>

                            {imagePreview && (
                              <div className="w-full max-w-xs h-40 rounded-2xl overflow-hidden border border-white/10 relative">
                                <img src={imagePreview} alt="Dish representation" className="w-full h-full object-cover" />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Pre-submission informational banner */}
                        <div className="flex gap-4 bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
                          <Info className="w-5 h-5 text-amber-accent shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <span className="text-xs font-bold text-white block">Aesthetics Notice</span>
                            <p className="text-[11px] text-gray-400 font-light leading-relaxed">
                              If you leave the picture slot blank, our editor will assign a delicious high-contrast culinary cover corresponding to the <strong className="text-white font-bold">{category}</strong> category.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Navigation Buttons */}
                    <div className="flex justify-between items-center pt-8 border-t border-white/5">
                      {formStep > 1 ? (
                        <button
                          type="button"
                          onClick={() => setFormStep(s => s - 1)}
                          className="px-6 py-3.5 bg-white/5 text-white/80 hover:text-white rounded-2xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all border border-white/5"
                        >
                          <ArrowLeft className="w-4 h-4" /> Previous
                        </button>
                      ) : (
                        <div />
                      )}

                      {formStep < 3 ? (
                        <button
                          type="button"
                          onClick={() => setFormStep(s => s + 1)}
                          className="px-8 py-3.5 bg-amber-accent text-black rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer hover:shadow-lg hover:shadow-amber-accent/15 transition-all"
                        >
                          Continue <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={submitting}
                          className="px-10 py-3.5 bg-amber-accent hover:bg-amber-accent-hover text-black shadow-lg shadow-amber-accent/15 rounded-2xl text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                        >
                          {submitting ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin text-black" />
                              Sending draft...
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-4 h-4" /> Submit to Queue
                            </>
                          )}
                        </button>
                      )}
                    </div>

                  </form>
                )}
              </motion.div>
            ) : (
              // SUBMISSIONS HISTORY VIEW
              <motion.div
                key="submissions-view"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                className="space-y-6"
              >
                {loadingHistory ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4 text-center">
                    <Loader2 className="w-8 h-8 text-amber-accent animate-spin" />
                    <span className="text-xs uppercase font-black text-amber-accent/6 tracking-widest">Compiling historical files...</span>
                  </div>
                ) : userRecipes.length === 0 ? (
                  <div className="bg-graphite/40 border border-white/5 p-16 rounded-[32px] text-center space-y-6 flex flex-col items-center justify-center">
                    <div className="bg-white/5 p-5 rounded-full border border-white/10">
                      <UtensilsCrossed className="w-10 h-10 text-white/30" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-xl font-serif text-white italic">No Recipes Submitted Yet</h3>
                      <p className="text-sm text-gray-500 font-light max-w-sm">
                        You have not published any signature dishes yet. Switch to the form and write down your first custom recipe representation!
                      </p>
                    </div>
                    <button
                      onClick={() => setActiveTab('form')}
                      className="px-6 py-3 bg-amber-accent text-black font-black uppercase tracking-wider text-[10px] rounded-xl cursor-pointer"
                    >
                      Create Submission
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {userRecipes.map((recipe) => (
                      <div 
                        key={recipe.id}
                        className="bg-graphite/40 border border-white/5 rounded-[32px] overflow-hidden group hover:border-white/10 transition-all flex flex-col h-full"
                      >
                        {/* Photo representation */}
                        <div className="h-44 w-full overflow-hidden relative bg-white/5">
                          <img 
                            src={recipe.imageUrl} 
                            alt={recipe.name} 
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                          
                          {/* Status Badge overlays */}
                          <div className="absolute top-4 right-4">
                            {recipe.status === 'approved' ? (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[9px] font-black uppercase rounded-full tracking-widest shadow-lg">
                                <Check className="w-3 h-3" /> Approved
                              </span>
                            ) : recipe.status === 'rejected' ? (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-black uppercase rounded-full tracking-widest shadow-lg">
                                <XSquare className="w-3 h-3" /> Rejected
                              </span>
                            ) : (
                              <span className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] font-black uppercase rounded-full tracking-widest shadow-lg animate-pulse">
                                <Clock className="w-3 h-3" /> Pending Review
                              </span>
                            )}
                          </div>

                          <div className="absolute bottom-4 left-6 right-6">
                            <span className="text-[10px] font-bold text-amber-accent uppercase tracking-widest block mb-1">
                              {recipe.category} • {recipe.cuisine}
                            </span>
                            <h3 className="font-serif text-xl font-medium text-white line-clamp-1">{recipe.name}</h3>
                          </div>
                        </div>

                        {/* Content description */}
                        <div className="p-6 flex-grow flex flex-col justify-between space-y-4">
                          <p className="text-gray-400 font-light text-xs line-clamp-2 italic leading-relaxed">
                            {recipe.description}
                          </p>

                          <div className="flex items-center justify-between text-[11px] text-gray-500 border-t border-white/5 pt-4">
                            <div className="flex items-center gap-3">
                              <span>{recipe.ingredients.length} Ingredients</span>
                              <span>•</span>
                              <span>{recipe.instructions.length} Steps</span>
                            </div>
                            <span className="font-mono text-white font-medium">{recipe.cookingTime}</span>
                          </div>

                          {/* Extra info/rejection reason if rejected, else let them view page if approved */}
                          {recipe.status === 'rejected' && (
                            <div className="p-3 bg-rose-500/5 border border-rose-500/10 rounded-xl text-[10px] text-rose-300 font-light flex items-start gap-1.5 leading-relaxed">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                              <span>This recipe was rejected by moderators. Adjust title or step details to fit guidelines before resubmitting.</span>
                            </div>
                          )}

                          <div className="flex gap-2 pt-2">
                            {recipe.status === 'approved' && recipe.id && (
                              <Link 
                                to={`/recipe/${recipe.id}`}
                                className="flex-1 py-2.5 bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 text-[10px] font-black uppercase tracking-widest rounded-xl text-center transiton-all"
                              >
                                View Recipe Card
                              </Link>
                            )}
                            <button
                              onClick={() => recipe.id && handleDeleteSubmission(recipe.id)}
                              className="p-2.5 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-black rounded-xl transition-all cursor-pointer flex items-center justify-center"
                              title="Delete permanently"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Informative Sidebar Guide */}
        <div className="space-y-8">
          {/* Submission Guidelines Card */}
          <div className="bg-white/[0.02] border border-white/5 p-6 rounded-[32px] space-y-6">
            <h3 className="font-serif text-lg text-white font-medium italic border-b border-white/5 pb-3">Submission Guidelines</h3>
            
            <div className="space-y-4 text-xs font-light text-gray-400 leading-relaxed">
              <p>
                To secure quick publishing inside the global library, make sure your signatures follow these gold standards:
              </p>
              
              <ul className="space-y-3 list-disc pl-4 marker:text-amber-accent">
                <li>
                  <strong className="text-white font-bold">Descriptive Title:</strong> Keep it appetizing and distinctive (e.g., &quot;Garlic Rosemary Focaccia&quot; rather than just &quot;bread&quot;).
                </li>
                <li>
                  <strong className="text-white font-bold">Accurate Measures:</strong> Ensure amounts has correct units (grams, spoons, cups, etc.) to calculate food portions accurately in the meal planner.
                </li>
                <li>
                  <strong className="text-white font-bold">Clean Instructions:</strong> Write clear, sequentially ordered sentences. Break long sections into individual numbered steps.
                </li>
                <li>
                  <strong className="text-white font-bold">Honest Categories:</strong> Choose precise Cuisine tags and meal types so filters index your recipe appropriately.
                </li>
              </ul>
            </div>
          </div>

          {/* Moderation Process flow card */}
          <div className="bg-amber-accent/[0.02] border border-amber-accent/5 p-6 rounded-[32px] space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-accent" />
              <h3 className="text-xs font-black uppercase text-amber-accent tracking-widest">Moderation Trail</h3>
            </div>
            
            <div className="space-y-4 text-[11px] text-gray-400 leading-relaxed font-light">
              <div className="flex gap-3 relative">
                <div className="absolute top-4 bottom-0 left-[7px] w-0.5 bg-amber-accent/20" />
                <span className="w-4 h-4 rounded-full bg-amber-accent/10 border border-amber-accent/40 flex items-center justify-center shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-accent" />
                </span>
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">1. Draft & Submit</span>
                  <span>Review is initialized in pending status once submitted.</span>
                </div>
              </div>

              <div className="flex gap-3 relative">
                <div className="absolute top-4 bottom-0 left-[7px] w-0.5 bg-amber-accent/20" />
                <span className="w-4 h-4 rounded-full bg-amber-accent/10 border border-amber-accent/40 flex items-center justify-center shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-accent" />
                </span>
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">2. Chef Verification</span>
                  <span>System admins audit the recipe for quality and appropriate culinary values.</span>
                </div>
              </div>

              <div className="flex gap-3">
                <span className="w-4 h-4 rounded-full bg-amber-accent/10 border border-amber-accent/40 flex items-center justify-center shrink-0">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-accent" />
                </span>
                <div className="space-y-0.5">
                  <span className="font-bold text-white block">3. Global Syndication</span>
                  <span>Approved masterpieces are made instantly searchable for everyone on Discovery.</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
