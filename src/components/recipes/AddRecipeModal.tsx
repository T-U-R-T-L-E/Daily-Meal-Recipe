import { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../lib/useAuth';
import { Recipe } from '../../types';
import { X, Plus, Trash2, CheckCircle, AlertCircle, ChefHat, Clock, Sparkles, Upload, Image as ImageIcon, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { uploadUserFile } from '../../lib/fileService';

interface AddRecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newRecipeId: string) => void;
}

export default function AddRecipeModal({ isOpen, onClose, onSuccess }: AddRecipeModalProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<'Breakfast' | 'Lunch' | 'Dinner' | 'Snack' | 'Dessert'>('Dinner');
  const [cuisine, setCuisine] = useState('');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Expert' | 'Professional'>('Intermediate');
  const [prepTime, setPrepTime] = useState('');
  const [cookTime, setCookTime] = useState('');
  const [restTime, setRestTime] = useState('');
  const [servings, setServings] = useState(4);
  const [imageUrl, setImageUrl] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [imageUploadMode, setImageUploadMode] = useState<'upload' | 'url'>('upload');
  const [uploadingImage, setUploadingImage] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      setError('Please sign in to upload images.');
      return;
    }

    if (!file.type.startsWith('image/')) {
      setError('Only image files are allowed.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setError('Image size should be less than 10MB.');
      return;
    }

    setUploadingImage(true);
    setError(null);

    try {
      const record = await uploadUserFile(file, user.uid);
      setImageUrl(record.downloadUrl);
    } catch (err: any) {
      console.error("Error uploading recipe cover image:", err);
      setError(err?.message || 'Failed to upload recipe image.');
    } finally {
      setUploadingImage(false);
    }
  };

  // Ingredients builder state
  const [ingredients, setIngredients] = useState<{ item: string; amount: string; unit: string }[]>([
    { item: '', amount: '', unit: '' }
  ]);

  // Instructions builder state
  const [instructions, setInstructions] = useState<{ text: string; tips: string }[]>([
    { text: '', tips: '' }
  ]);

  // Dietary Tags state (Available common options)
  const availableDietaryTags = [
    'Vegetarian', 'Vegan', 'Gluten-Free', 'Dairy-Free', 'Keto', 'Low-Carb', 'Halal', 'Kosher', 'Nut-Free'
  ];
  const [selectedDietaryTags, setSelectedDietaryTags] = useState<string[]>([]);

  // Optional Nutrition facts
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  if (!isOpen) return null;

  const handleAddIngredient = () => {
    setIngredients([...ingredients, { item: '', amount: '', unit: '' }]);
  };

  const handleRemoveIngredient = (index: number) => {
    if (ingredients.length === 1) return;
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const handleIngredientChange = (index: number, field: 'item' | 'amount' | 'unit', value: string) => {
    const updated = [...ingredients];
    updated[index][field] = value;
    setIngredients(updated);
  };

  const handleAddInstruction = () => {
    setInstructions([...instructions, { text: '', tips: '' }]);
  };

  const handleRemoveInstruction = (index: number) => {
    if (instructions.length === 1) return;
    setInstructions(instructions.filter((_, i) => i !== index));
  };

  const handleInstructionChange = (index: number, field: 'text' | 'tips', value: string) => {
    const updated = [...instructions];
    updated[index][field] = value;
    setInstructions(updated);
  };

  const toggleDietaryTag = (tag: string) => {
    if (selectedDietaryTags.includes(tag)) {
      setSelectedDietaryTags(selectedDietaryTags.filter(t => t !== tag));
    } else {
      setSelectedDietaryTags([...selectedDietaryTags, tag]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setError('Please sign in to share a recipe.');
      return;
    }

    // Validation
    if (!name.trim()) return setError('Recipe Name is required.');
    if (!description.trim()) return setError('Description is required.');
    if (!cuisine.trim()) return setError('Cuisine is required.');
    if (!prepTime.trim()) return setError('Prep Time is required.');
    if (!cookTime.trim()) return setError('Cook Time is required.');

    // Validate ingredients list
    const filteredIngredients = ingredients
      .map(ing => ({
        item: ing.item.trim(),
        amount: ing.amount.trim(),
        unit: ing.unit.trim(),
        baseAmount: Number(ing.amount) || 1
      }))
      .filter(ing => ing.item && ing.amount);

    if (filteredIngredients.length === 0) {
      return setError('Please provide at least one ingredient with a name and amount.');
    }

    // Validate instructions
    const filteredInstructions = instructions
      .map(step => ({
        text: step.text.trim(),
        tips: step.tips.trim() || undefined
      }))
      .filter(step => step.text);

    if (filteredInstructions.length === 0) {
      return setError('Please provide at least one step of instructions.');
    }

    setLoading(true);
    setError(null);

    const formattedPrepTime = prepTime.toLowerCase().includes('min') || prepTime.toLowerCase().includes('hour') ? prepTime : `${prepTime} mins`;
    const formattedCookTime = cookTime.toLowerCase().includes('min') || cookTime.toLowerCase().includes('hour') ? cookTime : `${cookTime} mins`;

    // Try parsing nutrition facts
    const parsedNutrition = calories || protein || carbs || fat ? {
      calories: parseFloat(calories) || 0,
      protein: parseFloat(protein) || 0,
      carbs: parseFloat(carbs) || 0,
      fat: parseFloat(fat) || 0
    } : undefined;

    // Build unique Recipe Data Payload matching our interface fields
    const recipeData: Omit<Recipe, 'id'> = {
      name: name.trim(),
      description: description.trim(),
      category,
      cuisine: cuisine.trim(),
      difficulty,
      prepTime: formattedPrepTime,
      cookTime: formattedCookTime,
      restTime: restTime.trim() || undefined,
      cookingTime: `${formattedPrepTime} prep, ${formattedCookTime} cook`,
      servings: Number(servings) || 4,
      ingredients: filteredIngredients,
      instructions: filteredInstructions,
      dietaryTags: selectedDietaryTags,
      imageUrl: imageUrl.trim() || undefined,
      videoUrl: videoUrl.trim() || undefined,
      authorId: user.uid,
      authorName: user.displayName || 'Gourmet Cook',
      isPublic: true,
      status: 'approved', // Mark approved directly for instant visibility
      viewCount: 0,
      saveCount: 0,
      ratingsCount: 0,
      averageRating: 5.0,
      createdAt: serverTimestamp()
    };

    if (parsedNutrition) {
      recipeData.nutrition = parsedNutrition;
    }

    try {
      const docRef = await addDoc(collection(db, 'recipes'), recipeData);
      setLoading(false);
      onSuccess?.(docRef.id);
      onClose();
    } catch (err: any) {
      setLoading(false);
      try {
        handleFirestoreError(err, OperationType.CREATE, 'recipes');
      } catch (wrappedErr: any) {
        setError(wrappedErr.message || 'Failed to submit recipe.');
      }
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop overlay */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.6 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/50 backdrop-blur-sm shadow-2xl"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 350 }}
          className="relative max-w-3xl w-full max-h-[90vh] bg-coal border border-white/5 rounded-[40px] shadow-3xl flex flex-col overflow-hidden z-10"
        >
          {/* Top Decorative Line */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500/20 via-amber-accent to-amber-500/20" />

          {/* Glowing background shapes */}
          <div className="absolute top-0 right-0 w-48 h-48 bg-amber-accent/5 blur-[80px] -mr-24 -mt-24 rounded-full pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-rose-500/5 blur-[80px] -ml-24 -mb-24 rounded-full pointer-events-none" />

          {/* Modal Header */}
          <div className="p-8 pb-4 border-b border-white/5 flex items-center justify-between relative shrink-0">
            <div className="space-y-1">
              <h2 className="text-white font-serif text-3xl italic flex items-center gap-3">
                <ChefHat className="text-amber-accent w-7 h-7" />
                Add Your Custom Recipe
              </h2>
              <p className="text-[9px] uppercase font-bold tracking-[0.25em] text-amber-accent/70">
                Share your culinary expertise with the world
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-white/5 border border-white/5 hover:border-white/10 text-gray-400 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4.5 h-4.5" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmit} className="flex-grow overflow-y-auto p-8 space-y-8 scrollbar-hide">
            {error && (
              <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-2xl flex items-center gap-3 text-xs">
                <AlertCircle className="w-5 h-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Basic Info Section */}
            <div className="space-y-6">
              <h3 className="text-white text-xs font-black uppercase tracking-widest text-amber-accent/40 border-b border-white/5 pb-2">
                1. Basic Details
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Recipe Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Handmade Fettuccine Alfredo"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-accent focus:bg-white/[0.08] transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Category *</label>
                    <select
                      value={category}
                      onChange={(e: any) => setCategory(e.target.value)}
                      className="w-full h-12 px-4 bg-coal border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-accent transition-all"
                    >
                      <option value="Breakfast">Breakfast</option>
                      <option value="Lunch">Lunch</option>
                      <option value="Dinner">Dinner</option>
                      <option value="Snack">Snack</option>
                      <option value="Dessert">Dessert</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Cuisine *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Italian"
                      value={cuisine}
                      onChange={(e) => setCuisine(e.target.value)}
                      className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-accent transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Short Description / Subtitle *</label>
                <textarea
                  required
                  rows={2}
                  placeholder="Describe your dish, its flavor profile, and story..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full p-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-accent focus:bg-white/[0.08] transition-all resize-none"
                />
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Prep Time (mins) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 15"
                    value={prepTime}
                    onChange={(e) => setPrepTime(e.target.value)}
                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-accent transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Cook Time (mins) *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 30"
                    value={cookTime}
                    onChange={(e) => setCookTime(e.target.value)}
                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-accent transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Rest Time (optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. 1 hour (optional)"
                    value={restTime}
                    onChange={(e) => setRestTime(e.target.value)}
                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-accent transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Servings *</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={servings}
                    onChange={(e) => setServings(Number(e.target.value) || 2)}
                    className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-accent transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Difficulty *</label>
                  <select
                    value={difficulty}
                    onChange={(e: any) => setDifficulty(e.target.value)}
                    className="w-full h-12 px-4 bg-coal border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-accent transition-all cursor-pointer"
                  >
                    <option value="Beginner">Beginner</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Expert">Expert</option>
                    <option value="Professional">Professional</option>
                  </select>
                </div>

                <div className="space-y-2 flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Cover Image (optional)</label>
                    <div className="flex bg-white/5 border border-white/5 rounded-full p-0.5 text-[9px] font-bold">
                      <button
                        type="button"
                        onClick={() => setImageUploadMode('upload')}
                        className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${imageUploadMode === 'upload' ? 'bg-amber-accent text-black font-extrabold' : 'text-white/60 hover:text-white'}`}
                      >
                        File Upload
                      </button>
                      <button
                        type="button"
                        onClick={() => setImageUploadMode('url')}
                        className={`px-2.5 py-1 rounded-full transition-all cursor-pointer ${imageUploadMode === 'url' ? 'bg-amber-accent text-black font-extrabold' : 'text-white/60 hover:text-white'}`}
                      >
                        Web URL
                      </button>
                    </div>
                  </div>

                  {imageUploadMode === 'upload' ? (
                    <div className="relative">
                      {imageUrl ? (
                        <div className="relative h-28 w-full rounded-2xl overflow-hidden border border-white/10 bg-white/[0.02] flex items-center justify-between p-4 group">
                          <img
                            src={imageUrl}
                            alt="Uploaded food snapshot"
                            className="absolute inset-0 w-full h-full object-cover opacity-40 blur-xs scale-105"
                            referrerPolicy="no-referrer"
                          />
                          <div className="relative z-10 flex items-center gap-3">
                            <div className="w-16 h-16 rounded-xl overflow-hidden border border-white/20 shadow-lg bg-black/40">
                              <img src={imageUrl} alt="Cover Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <div className="space-y-0.5">
                              <p className="text-white text-xs font-semibold">Ready for publication</p>
                              <p className="text-[10px] text-amber-accent/80 font-mono">Custom upload active</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="relative z-10 p-2.5 bg-rose-500/15 border border-rose-500/20 text-rose-400 hover:bg-rose-500/30 hover:border-rose-500/50 rounded-xl text-[10px] font-bold tracking-wider uppercase transition-all cursor-pointer"
                          >
                            Remove
                          </button>
                        </div>
                      ) : (
                        <label className="flex flex-col items-center justify-center h-28 w-full border border-dashed border-white/10 hover:border-amber-accent/30 bg-white/[0.01] hover:bg-white/[0.03] rounded-2xl cursor-pointer transition-all group">
                          {uploadingImage ? (
                            <div className="flex flex-col items-center gap-2">
                              <Loader2 className="w-6 h-6 animate-spin text-amber-accent" />
                              <span className="text-[11px] text-gray-400">Uploading photo to safe space...</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center gap-1.5 p-4 text-center">
                              <Upload className="w-5 h-5 text-amber-accent group-hover:scale-110 transition-transform" />
                              <div>
                                <span className="text-white text-xs font-semibold">Upload cover photo</span>
                                <p className="text-[9px] text-gray-500 font-light mt-0.5">Drag & drop or browse device (PNG, JPG, WEBP up to 10MB)</p>
                              </div>
                            </div>
                          )}
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleFileUpload}
                            disabled={uploadingImage}
                            className="hidden"
                          />
                        </label>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <input
                        type="url"
                        placeholder="https://images.unsplash.com/photo-1546069901-ba9599a7e63c"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full h-12 px-4 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:outline-none focus:border-amber-accent transition-all animate-fade-in"
                      />
                      {imageUrl && (
                        <div className="h-14 w-full rounded-xl overflow-hidden border border-white/5 bg-white/[0.02] flex items-center justify-between px-4 animate-fade-in">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-md overflow-hidden border border-white/10 shadow-md bg-black/40">
                              <img src={imageUrl} alt="Web Cover Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            </div>
                            <span className="text-[11px] text-gray-400 truncate max-w-[200px]">Live URL preview active</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setImageUrl('')}
                            className="text-[10px] text-rose-400 hover:text-rose-300 font-bold tracking-wider uppercase"
                          >
                            Clear
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Ingredients Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-white text-xs font-black uppercase tracking-widest text-amber-accent/40">
                  2. Ingredients *
                </h3>
                <button
                  type="button"
                  onClick={handleAddIngredient}
                  className="px-3 py-1.5 bg-amber-accent/10 border border-amber-accent/20 hover:bg-amber-accent/20 text-amber-accent text-[10px] uppercase tracking-wider font-extrabold rounded-full flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Row
                </button>
              </div>

              <div className="space-y-3">
                {ingredients.map((ing, index) => (
                  <div key={index} className="flex gap-3 items-center">
                    <div className="flex-grow grid grid-cols-12 gap-3">
                      <div className="col-span-6">
                        <input
                          type="text"
                          required
                          placeholder="Ingredient item (e.g. Pasta)"
                          value={ing.item}
                          onChange={(e) => handleIngredientChange(index, 'item', e.target.value)}
                          className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-accent transition-all"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          required
                          placeholder="Amount (e.g. 200 or 1.5)"
                          value={ing.amount}
                          onChange={(e) => handleIngredientChange(index, 'amount', e.target.value)}
                          className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-accent transition-all text-center"
                        />
                      </div>
                      <div className="col-span-3">
                        <input
                          type="text"
                          placeholder="Unit (e.g. g, cups, tbsp)"
                          value={ing.unit}
                          onChange={(e) => handleIngredientChange(index, 'unit', e.target.value)}
                          className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-accent transition-all text-center"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={ingredients.length === 1}
                      onClick={() => handleRemoveIngredient(index)}
                      className="p-2.5 bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 hover:bg-rose-500/25 rounded-xl transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Instructions Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-2">
                <h3 className="text-white text-xs font-black uppercase tracking-widest text-amber-accent/40">
                  3. Cooking Steps *
                </h3>
                <button
                  type="button"
                  onClick={handleAddInstruction}
                  className="px-3 py-1.5 bg-amber-accent/10 border border-amber-accent/20 hover:bg-amber-accent/20 text-amber-accent text-[10px] uppercase tracking-wider font-extrabold rounded-full flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Step
                </button>
              </div>

              <div className="space-y-4">
                {instructions.map((step, index) => (
                  <div key={index} className="flex gap-4 items-start bg-white/[0.01] border border-white/5 p-4 rounded-2xl relative">
                    <div className="w-8 h-8 rounded-full bg-white/5 text-white/50 border border-white/10 flex items-center justify-center font-mono text-[10px] shrink-0 mt-1 font-bold">
                      {index + 1}
                    </div>
                    
                    <div className="flex-grow grid grid-cols-1 gap-3">
                      <div>
                        <textarea
                          required
                          rows={2}
                          placeholder={`Describe instructions for step ${index + 1}...`}
                          value={step.text}
                          onChange={(e) => handleInstructionChange(index, 'text', e.target.value)}
                          className="w-full p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-accent transition-all resize-none"
                        />
                      </div>
                      <div>
                        <input
                          type="text"
                          placeholder="Pro chef tip for this step (optional)"
                          value={step.tips}
                          onChange={(e) => handleInstructionChange(index, 'tips', e.target.value)}
                          className="w-full h-10 px-3 bg-white/5 border border-white/10 rounded-xl text-[11px] text-gray-400 focus:outline-none focus:border-amber-accent transition-all font-light italic"
                        />
                      </div>
                    </div>

                    <button
                      type="button"
                      disabled={instructions.length === 1}
                      onClick={() => handleRemoveInstruction(index)}
                      className="p-2.5 bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 text-rose-400 hover:bg-rose-500/25 rounded-md transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed self-center"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Dietary Tags */}
            <div className="space-y-4">
              <h3 className="text-white text-xs font-black uppercase tracking-widest text-amber-accent/40 border-b border-white/5 pb-2">
                4. Dietary Preferences
              </h3>
              <div className="flex flex-wrap gap-2.5">
                {availableDietaryTags.map(tag => {
                  const isSelected = selectedDietaryTags.includes(tag);
                  return (
                    <button
                      type="button"
                      key={tag}
                      onClick={() => toggleDietaryTag(tag)}
                      className={`h-9 px-4 rounded-full text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5 ${
                        isSelected 
                          ? 'bg-amber-accent border-amber-accent text-black font-extrabold' 
                          : 'bg-white/5 border border-white/10 text-white/60 hover:border-white/20'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Optional Nutrition Facts */}
            <div className="space-y-4">
              <h3 className="text-white text-xs font-black uppercase tracking-widest text-amber-accent/40 border-b border-white/5 pb-2">
                5. Nutrition Facts (Optional, per serving)
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Calories (kcal)</label>
                  <input
                    type="number"
                    placeholder="e.g. 450"
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-accent text-center"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Protein (g)</label>
                  <input
                    type="number"
                    placeholder="e.g. 25"
                    value={protein}
                    onChange={(e) => setProtein(e.target.value)}
                    className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-accent text-center"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Carbs (g)</label>
                  <input
                    type="number"
                    placeholder="e.g. 45"
                    value={carbs}
                    onChange={(e) => setCarbs(e.target.value)}
                    className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-accent text-center"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] text-white/40 uppercase font-bold tracking-wider">Fat (g)</label>
                  <input
                    type="number"
                    placeholder="e.g. 15"
                    value={fat}
                    onChange={(e) => setFat(e.target.value)}
                    className="w-full h-11 px-4 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-amber-accent text-center"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button Controls */}
            <div className="w-full pt-8 border-t border-white/5 flex flex-col md:flex-row gap-4 items-center justify-end">
              <button
                type="button"
                onClick={onClose}
                className="w-full md:w-auto h-12 px-6 bg-white/5 hover:bg-white/10 text-gray-300 font-bold uppercase tracking-wider text-[10px] rounded-full transition-all cursor-pointer text-center"
              >
                Discard Draft
              </button>
              
              <button
                type="submit"
                disabled={loading}
                className="w-full md:w-auto h-12 px-8 bg-amber-accent hover:bg-white text-black font-bold uppercase tracking-widest text-[10px] rounded-full transition-all cursor-pointer flex items-center justify-center gap-2 shadow-xl shadow-amber-accent/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-4 w-4 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Uploading...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Publish Recipe
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
