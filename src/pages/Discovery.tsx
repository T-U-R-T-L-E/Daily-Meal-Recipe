import { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, limit, onSnapshot, doc, getDoc, setDoc, increment, orderBy } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Recipe, UserProfile } from '../types';
import RecipeCard from '../components/recipes/RecipeCard';
import { RecipeCardSkeleton } from '../components/recipes/RecipeSkeleton';
import { Search, RotateCcw, Plus, SlidersHorizontal, Sparkles, Zap, Coffee, Utensils, Moon, Candy, IceCream, Globe, Database, Heart, Filter, Clock, Check, ChevronDown, CheckCircle2, X, ChefHat, Mic, MicOff, Image as ImageIcon, Loader2, Flame, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/useAuth';
import { faultTolerantFetchJson } from '../lib/api';
import AuthModal from '../components/auth/AuthModal';
import AddRecipeModal from '../components/recipes/AddRecipeModal';
import { getPinnedRecipes } from '../lib/indexedDb';

// Client-side in-memory search query cache to make repetitive searches instantaneous (<1ms)
const clientSearchCache: Record<string, Recipe[]> = {};

export default function Discovery() {
  const { user } = useAuth();
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  
  // Recent Searches state
  const [recentSearches, setRecentSearches] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('recent_cooking_searches');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [category, setCategory] = useState('All');
  const [offlineOnly, setOfflineOnly] = useState(false);
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [favoriteRecipeIds, setFavoriteRecipeIds] = useState<Set<string>>(new Set());
  const [surpriseResults, setSurpriseResults] = useState<Recipe[] | null>(null);
  const [searchMode, setSearchMode] = useState<'local' | 'world'>('world');
  const [selectedCuisine, setSelectedCuisine] = useState('All');
  const [difficultyLevel, setDifficultyLevel] = useState(0); // 0: All, 1: Beginner, 2: Intermediate, 3: Expert, 4: Professional
  const [maxTime, setMaxTime] = useState(0); // In minutes, 0 means all
  const [selectedDietary, setSelectedDietary] = useState<Set<string>>(new Set());
  const [selectedMethod, setSelectedMethod] = useState('All');
  const [selectedOccasion, setSelectedOccasion] = useState('All');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [aiResults, setAiResults] = useState<Recipe[]>([]);
  const [pendingReveal, setPendingReveal] = useState<{
    type: 'ai' | 'surprise';
    mode: 'overwrite' | 'append';
    items: Recipe[];
  } | null>(null);
  const [isAISearching, setIsAISearching] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [trendingRecipes, setTrendingRecipes] = useState<Recipe[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<Recipe[]>([]);
  const [isLoadingSaved, setIsLoadingSaved] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [authModalTitle, setAuthModalTitle] = useState("Gourmet Recipe Search");
  const [authModalMessage, setAuthModalMessage] = useState("To search the global recipe index, utilize AI-powered search, generate surprise dishes, or upload photos to scan ingredients, please sign in to your Daily Meal Recipe account.");

  const handleAddRecipeClick = () => {
    if (!user) {
      setAuthModalTitle("Add Recipe");
      setAuthModalMessage("To create and share your gourmet cooking masterpiece with the community, please sign in first.");
      setIsAuthModalOpen(true);
    } else {
      setIsAddModalOpen(true);
    }
  };
  
  // Enhanced Search Features States
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);
  const [isAnalyzingImage, setIsAnalyzingImage] = useState(false);
  const [activePresetTags, setActivePresetTags] = useState<string[]>([]);
  const [conversationalPromptText, setConversationalPromptText] = useState('');
  const [showConversationalHelper, setShowConversationalHelper] = useState(false);

  // Quota & Billing Safety Cap Diagnostics
  const [quotaStatus, setQuotaStatus] = useState<{
    isOffline: boolean;
    offlineTimestamp: number;
    lastError: string;
    details: any;
  } | null>(null);
  const [isClearingQuota, setIsClearingQuota] = useState(false);

  const fetchQuotaStatus = async () => {
    try {
      const res = await faultTolerantFetchJson<any>('/api/ai/quota-status');
      if (res) {
        setQuotaStatus(res);
      }
    } catch (e) {
      console.warn("Failed to retrieve current server quota status profile:", e);
    }
  };

  useEffect(() => {
    fetchQuotaStatus();
  }, []);

  const handleClearQuota = async () => {
    setIsClearingQuota(true);
    try {
      const res = await fetch('/api/ai/quota-clear', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        await fetchQuotaStatus();
        // Force retry the current active world search
        handleSearch(undefined, searchTerm);
      }
    } catch (err) {
      console.error("Could not reset billing offline protection safety check:", err);
    } finally {
      setIsClearingQuota(false);
    }
  };

  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    async function loadUserProfile() {
      if (!user) return;
      try {
        const profSnap = await getDoc(doc(db, 'users', user.uid));
        if (profSnap.exists()) {
          setUserProfile(profSnap.data() as UserProfile);
        }
      } catch (error) {
        console.error("Profile load failed", error);
      }
    }
    loadUserProfile();
  }, [user]);

  useEffect(() => {
    async function loadTrending() {
      try {
        const q = query(
          collection(db, 'recipes'),
          where('isPublic', '==', true),
          limit(6)
        );
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
        // Only show approved recipes or those submitted by the current user (omit status field acts as approved for backward-compat)
        const filtered = data.filter(r => r.status === 'approved' || (user && r.authorId === user.uid) || !r.status);
        // Sort by viewCount + saveCount in memory
        filtered.sort((a, b) => ((b.viewCount || 0) + (b.saveCount || 0)) - ((a.viewCount || 0) + (a.saveCount || 0)));
        setTrendingRecipes(filtered);
      } catch (e) {
        console.error("Trending load failed", e);
      }
    }
    loadTrending();
  }, []);

  useEffect(() => {
    if (!user) {
      setFavoriteRecipeIds(new Set());
      return;
    }

    const q = query(
      collection(db, 'favorites'),
      where('userId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ids = new Set(snapshot.docs.map(doc => doc.data().recipeId as string));
      setFavoriteRecipeIds(ids);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    async function loadSavedRecipes() {
      if (!user || favoriteRecipeIds.size === 0) {
        setSavedRecipes([]);
        return;
      }

      setIsLoadingSaved(true);
      try {
        const ids = Array.from(favoriteRecipeIds).slice(0, 120);
        const docPromises = ids.map(id => 
          getDoc(doc(db, 'recipes', id)).catch(err => {
            console.warn(`Could not get recipe ${id}, skipping:`, err);
            return null;
          })
        );
        const snapshots = await Promise.all(docPromises);
        const data = snapshots
          .filter((snap): snap is NonNullable<typeof snap> => snap !== null && snap.exists())
          .map(snap => ({ id: snap.id, ...snap.data() } as Recipe));
        setSavedRecipes(data);
      } catch (e) {
        console.error("Failed to load saved recipes:", e);
      } finally {
        setIsLoadingSaved(false);
      }
    }
    loadSavedRecipes();
  }, [user, favoriteRecipeIds]);

  const categories = [
    { name: "All", icon: SlidersHorizontal },
    { name: "Breakfast", icon: Coffee },
    { name: "Lunch", icon: Utensils },
    { name: "Dinner", icon: Moon },
    { name: "Snack", icon: Candy },
    { name: "Dessert", icon: IceCream }
  ];

  const cuisines = [
    'All', 'Italian', 'Mexican', 'French', 'Japanese', 'Chinese', 'Indian', 'Mediterranean', 'American', 'Thai', 'Middle Eastern', 'Greek', 'Spanish'
  ];

  const difficultyLevels = ['All', 'Beginner', 'Intermediate', 'Expert', 'Professional'];

  const dietaryTags = ['Vegan', 'Vegetarian', 'Gluten-Free', 'Keto', 'Paleo', 'Dairy-Free'];
  const cookingMethods = ['All', 'Baking', 'Grilling', 'Sautéing', 'Slow Cooking', 'Air Frying', 'Steaming', 'Poaching', 'Roasting'];
  const occasions = ['All', 'Weeknight', 'Party', 'Holiday', 'Date Night', 'Kids Friendly', 'Breakfast in Bed', 'Picnic'];

  // Debounce mechanism for search input to prevent rapid API calls & DB queries during typing
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 400); // 400ms delay protects Firestore suggestions query and API limits from typing noise

    return () => {
      clearTimeout(handler);
    };
  }, [searchTerm]);

  const saveRecentSearch = (queryStr: string) => {
    if (!queryStr || queryStr.trim().length === 0) return;
    const cleanWord = queryStr.trim();
    setRecentSearches(prev => {
      const filtered = prev.filter(q => q.toLowerCase() !== cleanWord.toLowerCase());
      const updated = [cleanWord, ...filtered].slice(0, 6); // Keep top 6 recent searches
      localStorage.setItem('recent_cooking_searches', JSON.stringify(updated));
      return updated;
    });
  };

  const removeRecentSearch = (queryStr: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRecentSearches(prev => {
      const updated = prev.filter(q => q !== queryStr);
      localStorage.setItem('recent_cooking_searches', JSON.stringify(updated));
      return updated;
    });
  };

  // Close search suggestions on clicking outside the search input container
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.search-input-container')) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (debouncedSearchTerm.trim().length < 2) {
      setSuggestions([]);
      return;
    }

    const term = debouncedSearchTerm.toLowerCase();
    const matches = new Set<string>();

    // Search in recipes
    recipes.forEach(r => {
      if (r.name.toLowerCase().includes(term)) matches.add(r.name);
      r.ingredients.forEach(ing => {
        if (ing.item.toLowerCase().includes(term)) matches.add(ing.item);
      });
    });

    // Search in common tags/cuisines
    cuisines.forEach(c => {
      if (c.toLowerCase().includes(term) && c !== 'All') matches.add(c);
    });

    let active = true;

    const fetchSuggestions = async () => {
      try {
        // Query client-side Firestore directly to bypass server-side IAM limits
        const ref = collection(db, "search_suggestions");
        const q = query(ref, orderBy("count", "desc"), limit(40));
        const snap = await getDocs(q);
        if (active) {
          snap.forEach((doc) => {
            const d = doc.data();
            if (d && d.text) {
              const text = d.text.trim();
              if (text.toLowerCase().includes(term)) {
                matches.add(text);
              }
            }
          });
        }
      } catch (err) {
        console.warn("Client Firestore suggestions query failed, using offline api fallback:", err);
        try {
          const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(debouncedSearchTerm)}`);
          if (response.ok) {
            const data = await response.json();
            if (active && data && Array.isArray(data.suggestions)) {
              data.suggestions.forEach((s: string) => {
                matches.add(s);
              });
            }
          }
        } catch (apiErr) {
          console.warn("Error fetching online suggestions:", apiErr);
        }
      }
      if (active) {
        setSuggestions(Array.from(matches).slice(0, 6));
      }
    };

    fetchSuggestions();

    return () => {
      active = false;
    };
  }, [debouncedSearchTerm, recipes]);

  useEffect(() => {
    const urlMode = searchParams.get('mode');
    const urlSearch = searchParams.get('search');
    
    // Check if there is a search term in the URL or in sessionStorage/local state
    let termToSearch = urlSearch || '';
    let modeToUse: 'world' | 'local' = (urlMode === 'local' || urlMode === 'world') ? urlMode : 'world';

    const scanSession = sessionStorage.getItem('temp_scan_ingredients');
    if (scanSession && scanSession !== 'undefined') {
      try {
        const items = JSON.parse(scanSession);
        if (items.length > 0) {
          termToSearch = items.join(', ');
          modeToUse = 'world';
          // Clear it
          sessionStorage.removeItem('temp_scan_ingredients');
        }
      } catch (e) {
        console.error("Failed to parse scan ingredients", e);
      }
    }

    const homeSearchQuery = sessionStorage.getItem('temp_search_query');
    if (homeSearchQuery && homeSearchQuery !== 'undefined') {
      try {
        termToSearch = homeSearchQuery;
        modeToUse = 'world';
        sessionStorage.removeItem('temp_search_query');
      } catch (e) {
        console.error("Failed to parse home search query", e);
      }
    }

    if (termToSearch) {
      setSearchTerm(termToSearch);
      setSearchMode(modeToUse);
      
      const queryStr = modeToUse === 'world' ? (termToSearch + ' culinary recipes') : termToSearch;
      
      // If cached already, use cache
      if (clientSearchCache[queryStr]) {
        setAiResults([]);
        setPendingReveal({ type: 'ai', mode: 'overwrite', items: clientSearchCache[queryStr] });
        sessionStorage.setItem('ai_search_results', JSON.stringify(clientSearchCache[queryStr]));
        return;
      }

      // Otherwise do the fetch
      setIsAISearching(true);
      setAiError(null);
      
      faultTolerantFetchJson<any[]>('/api/ai/search-recipes', {
        method: 'POST',
        body: JSON.stringify({
          query: queryStr,
          userContext: userProfile ? {
            healthConditions: userProfile.healthConditions,
            fitnessGoals: userProfile.fitnessGoals,
            activityLevel: userProfile.activityLevel
          } : undefined
        })
      })
      .then((data) => {
        if (!Array.isArray(data)) {
          throw new Error("Returned data is not a valid list of recipes");
        }
        const formatted = data.map((r: any, i: number) => ({
          ...r,
          id: `ai-${Date.now()}-${i}`,
          cookingTime: r.cookTime || '30 min',
          isPublic: true
        }));
        
        clientSearchCache[queryStr] = formatted;
        setAiResults([]);
        setPendingReveal({ type: 'ai', mode: 'overwrite', items: formatted });
        sessionStorage.setItem('ai_search_results', JSON.stringify(formatted));
        
        // Scroll to results
        setTimeout(() => {
          const el = document.getElementById('results-target');
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      })
      .catch((err) => {
        console.error("Auto search failed:", err);
        setAiError(err instanceof Error ? err.message : "Connect to the world library failed.");
      })
      .finally(() => {
        setIsAISearching(false);
      });
    } else {
      // Load last AI search results if available
      try {
        const savedAI = sessionStorage.getItem('ai_search_results');
        if (savedAI && savedAI !== 'undefined') {
          setAiResults(JSON.parse(savedAI));
        }
        const savedTerm = sessionStorage.getItem('ai_search_term');
        if (savedTerm) {
          setSearchTerm(savedTerm);
        }
        const savedMode = sessionStorage.getItem('ai_search_mode');
        if (savedMode === 'local' || savedMode === 'world') {
          setSearchMode(savedMode as 'local' | 'world');
        }
      } catch (e) {
        console.error("Failed to parse saved AI results", e);
      }
    }
  }, [searchParams, userProfile]);

  useEffect(() => {
    if (!pendingReveal || pendingReveal.items.length === 0) return;

    const timer = setTimeout(() => {
      const nextItem = pendingReveal.items[0];
      const remainingItems = pendingReveal.items.slice(1);

      if (pendingReveal.type === 'ai') {
        setAiResults((prev) => {
          if (prev.some(r => r.id === nextItem.id)) return prev;
          return [...prev, nextItem];
        });
      } else {
        setSurpriseResults((prev) => {
          const current = prev || [];
          if (current.some(r => r.id === nextItem.id)) return current;
          return [...current, nextItem];
        });
      }

      if (remainingItems.length > 0) {
        setPendingReveal({
          type: pendingReveal.type,
          mode: pendingReveal.mode,
          items: remainingItems,
        });
      } else {
        setPendingReveal(null);
      }
    }, 400); // 400ms automatic interval per recipe item

    return () => clearTimeout(timer);
  }, [pendingReveal]);

  useEffect(() => {
    async function loadRecipes() {
      if (offlineOnly) {
        try {
          const pinned = await getPinnedRecipes();
          const savedRaw = localStorage.getItem('saved_recipes');
          const saved = (savedRaw && savedRaw !== 'undefined') ? JSON.parse(savedRaw) : [];
          
          const merged = [...pinned];
          for (const s of saved) {
            if (!merged.find(r => r.id === s.id)) {
              merged.push(s);
            }
          }
          setRecipes(merged);
        } catch (e) {
          console.error("Failed to parse offline recipes", e);
          setRecipes([]);
        }
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const q = query(
          collection(db, 'recipes'),
          where('isPublic', '==', true),
          limit(100)
        );
        const snapshot = await getDocs(q);
        let data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
        
        // Only show approved recipes or those submitted by the current user (omit status field acts as approved for backward-compat)
        data = data.filter(r => r.status === 'approved' || (user && r.authorId === user.uid) || !r.status);

        // Sort in memory to avoid index requirements
        data.sort((a, b) => {
          const aTime = a.createdAt?.seconds || 0;
          const bTime = b.createdAt?.seconds || 0;
          return bTime - aTime;
        });

        setRecipes(data);
      } catch (error) {
        console.error("Fetch Error:", error);
        if (error instanceof Error && error.message.includes('permission')) {
          handleFirestoreError(error, OperationType.LIST, 'recipes');
        }
        // Auto-fallback if network is down
        try {
          const pinned = await getPinnedRecipes();
          const savedRaw = localStorage.getItem('saved_recipes');
          const saved = (savedRaw && savedRaw !== 'undefined') ? JSON.parse(savedRaw) : [];
          const merged = [...pinned];
          for (const s of saved) {
            if (!merged.find(r => r.id === s.id)) {
              merged.push(s);
            }
          }
          setRecipes(merged);
        } catch (e) {
          console.error("Failed to parse fallback recipes", e);
        }
      } finally {
        setLoading(false);
      }
    }
    loadRecipes();
  }, [offlineOnly, refreshTrigger]);

  // Start dictating terms using Web Speech API
  const startVoiceSearch = () => {
    if (!user) {
      setAuthModalTitle("Voice Command Search");
      setAuthModalMessage("To use voice recognition and dictate gourmet recipe searches, please sign in first.");
      setIsAuthModalOpen(true);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setAiError("Speech recognition is not supported in this browser. Please type or try Chrome/Safari.");
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (err) {
        console.error("Error stopping voice recognition:", err);
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsListening(true);
        setAiError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setSearchTerm(transcript);
          setIsListening(false);
          // Automatically run the AI search with this voice input
          handleSearch(undefined, transcript);
        }
      };

      recognition.onerror = (e: any) => {
        console.error("Voice Recognition error:", e);
        setIsListening(false);
        if (e.error === 'not-allowed') {
          setAiError("Microphone permission was denied. Please grant access or type manually.");
        } else {
          setAiError(`Voice search helper encountered an issue: ${e.error || 'Check local signal.'}`);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error("Speech Recognition initialization error:", err);
      setIsListening(false);
    }
  };

  // Upload an ingredient/food item image and auto-fill search terms
  const handleImageSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!user) {
      setAuthModalTitle("AI Image Scan");
      setAuthModalMessage("To upload photos and utilize AI-powered recipe ingredient scanning, please sign in first.");
      setIsAuthModalOpen(true);
      return;
    }

    setIsAnalyzingImage(true);
    setAiError(null);
    const reader = new FileReader();

    reader.onload = async (event) => {
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        // Fit within 600px width/height while keeping aspect ratio for fast parsing
        const maxDim = 600;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }
        canvas.width = w;
        canvas.height = h;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setIsAnalyzingImage(false);
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        const base64 = canvas.toDataURL('image/jpeg', 0.85);

        try {
          const data = await faultTolerantFetchJson<{ items?: string[] }>('/api/ai/scan-image', {
            method: 'POST',
            body: JSON.stringify({ image: base64 }),
          });

          if (data.items && data.items.length > 0) {
            const ingredientStr = data.items.join(', ');
            setSearchTerm(ingredientStr);
            setSearchMode('world'); // Auto focus on AI-based world search
            handleSearch(undefined, ingredientStr);
          } else {
            setAiError("We couldn't identify any clear food items or ingredients. Please try another image.");
          }
        } catch (err) {
          console.error("Image search error:", err);
          setAiError("Failed to recognize image content. Please choose a sharper snapshot.");
        } finally {
          setIsAnalyzingImage(false);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Smart-toggle dynamic parameter tags
  const togglePresetTag = (tag: string) => {
    if (tag === 'Under 30m') {
      setMaxTime(prev => prev === 30 ? 0 : 30);
    } else if (['Vegan', 'Gluten-Free', 'Keto', 'Vegetarian'].includes(tag)) {
      setSelectedDietary(prev => {
        const next = new Set(prev);
        if (next.has(tag)) next.delete(tag);
        else next.add(tag);
        return next;
      });
    } else {
      setActivePresetTags(prev => {
        if (prev.includes(tag)) return prev.filter(t => t !== tag);
        return [...prev, tag];
      });
    }
  };

  const skipToRandom = async () => {
    if (loading || isAISearching) return;
    
    if (!user) {
      setAuthModalTitle("Curated Recipes");
      setAuthModalMessage("Please sign in first to skip to random curated gourmet recipes.");
      setIsAuthModalOpen(true);
      return;
    }
    
    if (searchMode === 'world') {
      setIsAISearching(true);
      try {
        const data = await faultTolerantFetchJson<any[]>('/api/ai/search-recipes', {
          method: 'POST',
          body: JSON.stringify({ 
            query: 'random surprising gourmet recipes',
            userContext: userProfile ? {
              healthConditions: userProfile.healthConditions,
              fitnessGoals: userProfile.fitnessGoals,
              activityLevel: userProfile.activityLevel
            } : undefined
          }),
        });

        const formatted = data.map((r: any, i: number) => ({
          ...r,
          id: `ai-${Date.now()}-${i}`,
          cookingTime: r.cookTime || '30 min',
          isPublic: true
        })).slice(0, 7);
        setSurpriseResults([]);
        setPendingReveal({ type: 'surprise', mode: 'overwrite', items: formatted });
        const el = document.getElementById('results-target');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      } catch (error) {
        console.error("AI Surprise failed:", error);
      } finally {
        setIsAISearching(false);
        fetchQuotaStatus();
      }
      return;
    }

    if (recipes.length > 0) {
      setSurpriseResults(null); 
      // Add a slight flicker effect to show it's working
      const shuffled = [...recipes].sort(() => 0.5 - Math.random());
      const selected = shuffled.slice(0, Math.min(7, shuffled.length));
      setSurpriseResults([]);
      setPendingReveal({ type: 'surprise', mode: 'overwrite', items: selected });
      setSearchTerm('');
      setCategory('All');
      setOfflineOnly(false);
      
      // Scroll to results
      const el = document.getElementById('results-target');
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSearch = async (e?: React.FormEvent, overrideTerm?: string) => {
    if (e) e.preventDefault();
    setSurpriseResults(null);

    if (!user) {
      setAuthModalTitle("Gourmet Recipe Search");
      setAuthModalMessage("To search the global recipe index, utilize AI-powered search, generate surprise dishes, or upload photos to scan ingredients, please sign in to your Daily Meal Recipe account.");
      setIsAuthModalOpen(true);
      return;
    }

    const termToUse = typeof overrideTerm === 'string' ? overrideTerm : searchTerm;
    
    // Persist search parameters in session storage for back navigation restoration
    sessionStorage.setItem('ai_search_term', termToUse);
    sessionStorage.setItem('ai_search_mode', searchMode);

    // Save search query to recent searches
    if (termToUse && termToUse.trim().length > 0) {
      saveRecentSearch(termToUse.trim());
    }

    // Log query term directly to client-side Firestore search suggestions securely (only if verified user is signed in)
    if (user && termToUse && termToUse.trim().length >= 2) {
      const queryClean = termToUse.trim();
      const suggestionDocId = queryClean.toLowerCase().replace(/[^a-z0-9]/g, "_");
      if (suggestionDocId) {
        try {
          const suggestionRef = doc(db, "search_suggestions", suggestionDocId);
          await setDoc(suggestionRef, {
            text: queryClean,
            count: increment(1),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } catch (suggestionErr) {
          console.warn("Could not save query suggestion client-side:", suggestionErr);
        }
      }
    }

    if (searchMode === 'world') {
      let queryStr = termToUse.trim() || 'trending gourmet recipes';
      if (selectedCuisine !== 'All') queryStr += ` ${selectedCuisine} cuisine`;
      if (difficultyLevel > 0) queryStr += ` ${difficultyLevels[difficultyLevel]} difficulty level`;
      if (maxTime > 0) queryStr += ` ready in under ${maxTime} minutes`;
      if (selectedDietary.size > 0) queryStr += ` ${Array.from(selectedDietary).join(', ')}`;
      if (selectedMethod !== 'All') queryStr += ` ${selectedMethod} method`;
      if (selectedOccasion !== 'All') queryStr += ` for ${selectedOccasion}`;
      if (activePresetTags.length > 0) {
        queryStr += ` ${activePresetTags.join(' ')}`;
      }

      // Check client-side (in-memory) search query cache first for instant load
      if (clientSearchCache[queryStr] && clientSearchCache[queryStr].length > 0) {
        console.log(`[Cache Hit] Instant load past search query: "${queryStr}"`);
        setAiResults([]);
        setPendingReveal({ type: 'ai', mode: 'overwrite', items: clientSearchCache[queryStr] });
        sessionStorage.setItem('ai_search_results', JSON.stringify(clientSearchCache[queryStr]));
        
        // Scroll to results
        const el = document.getElementById('results-target');
        if (el) el.scrollIntoView({ behavior: 'smooth' });
        return;
      }

      setIsAISearching(true);
      setAiError(null);
      try {
        const data = await faultTolerantFetchJson<any[]>('/api/ai/search-recipes', {
          method: 'POST',
          body: JSON.stringify({ 
            query: queryStr,
            userContext: userProfile ? {
              healthConditions: userProfile.healthConditions,
              fitnessGoals: userProfile.fitnessGoals,
              activityLevel: userProfile.activityLevel
            } : undefined
          }),
        });

        const formatted = data.map((r: any, i: number) => ({
          ...r,
          id: `ai-${Date.now()}-${i}`,
          cookingTime: r.cookTime || '30 min',
          isPublic: true
        }));
        
        // 2. Populate Client-side Cache
        clientSearchCache[queryStr] = formatted;
        setAiResults([]);
        setPendingReveal({ type: 'ai', mode: 'overwrite', items: formatted });
        sessionStorage.setItem('ai_search_results', JSON.stringify(formatted));
      } catch (error) {
        console.error("AI Search failed:", error);
        if (error instanceof Error && error.message.includes('Failed to fetch')) {
          setAiError("Connection to the World Library was interrupted. Please check your internet or try again in a moment.");
        } else {
          setAiError(error instanceof Error ? error.message : "Connect to the world library failed.");
        }
      } finally {
        setIsAISearching(false);
        fetchQuotaStatus();
      }
    }

    // Explicitly scroll to top of list when searching
    const el = document.getElementById('results-target');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const handleLoadMore = async () => {
    if (isLoadingMore || isAISearching) return;
    setIsLoadingMore(true);
    try {
      const queryStr = searchTerm.trim() || 'trending gourmet recipes';
      // Exclude more names to prevent duplicates from the AI
      const excludeNames = aiResults.map(r => r.name).slice(0, 50); 
      
      const data = await faultTolerantFetchJson<any[]>('/api/ai/search-recipes', {
        method: 'POST',
        body: JSON.stringify({ 
          query: queryStr,
          exclude: excludeNames,
          userContext: userProfile ? {
            healthConditions: userProfile.healthConditions,
            fitnessGoals: userProfile.fitnessGoals,
            activityLevel: userProfile.activityLevel
          } : undefined
        }),
      });
      const formatted = data.map((r: any, i: number) => ({
        ...r,
        id: `ai-${Date.now()}-${aiResults.length + i}`,
        cookingTime: r.cookTime || '30 min',
        isPublic: true
      }));
      
      // Filter out any duplicates that might have slipped through the AI exclusion
      const existingNames = new Set(aiResults.map(r => r.name.toLowerCase()));
      const uniqueNewResults = formatted.filter((r: Recipe) => !existingNames.has(r.name.toLowerCase()));

      if (uniqueNewResults.length > 0) {
        const newResults = [...aiResults, ...uniqueNewResults];
        setPendingReveal({ type: 'ai', mode: 'append', items: uniqueNewResults });
        sessionStorage.setItem('ai_search_results', JSON.stringify(newResults));
      }
    } catch (error) {
      console.error("AI Load More failed:", error);
    } finally {
      setIsLoadingMore(false);
      fetchQuotaStatus();
    }
  };

  const currentDisplay = surpriseResults || (searchMode === 'local' ? recipes.filter(r => {
    const name = (r.name || '').toLowerCase();
    const desc = (r.description || '').toLowerCase();
    const search = searchTerm.trim().toLowerCase();
    
    const matchesSearch = search === '' || name.includes(search) || desc.includes(search);
    const matchesCategory = category === 'All' || r.category === category;
    const matchesFavorite = !favoritesOnly || favoriteRecipeIds.has(r.id);
    const matchesCuisine = selectedCuisine === 'All' || (r.cuisine && r.cuisine.toLowerCase().includes(selectedCuisine.toLowerCase()));
    
    const difficultyMap: Record<string, number> = {
      'Beginner': 1,
      'Intermediate': 2,
      'Expert': 3,
      'Professional': 4
    };
    const matchesDifficulty = difficultyLevel === 0 || difficultyMap[r.difficulty] === difficultyLevel;
    
    // Advanced Filters
    const parseTime = (time: any) => {
      if (time === undefined || time === null) return 0;
      if (typeof time === 'number') return time;
      const timeStr = String(time);
      const mins = parseInt(timeStr) || 0;
      if (timeStr.toLowerCase().includes('hr')) return mins * 60;
      return mins;
    };
    const totalTime = parseTime(r.prepTime) + parseTime(r.cookTime);
    const matchesTime = maxTime === 0 || totalTime <= maxTime;
    
    const matchesDietary = selectedDietary.size === 0 || Array.from(selectedDietary).every(tag => 
      r.dietaryTags?.some(rTag => rTag.toLowerCase().includes(tag.toLowerCase()))
    );

    const matchesMethod = selectedMethod === 'All' || r.methods?.some(m => m.toLowerCase() === selectedMethod.toLowerCase());
    const matchesOccasion = selectedOccasion === 'All' || r.occasions?.some(o => o.toLowerCase() === selectedOccasion.toLowerCase());
    
    const matchesCustomTags = activePresetTags.length === 0 || activePresetTags.every(tag => {
      const lTag = tag.toLowerCase();
      return (
        name.includes(lTag) ||
        desc.includes(lTag) ||
        (r.cuisine && r.cuisine.toLowerCase().includes(lTag)) ||
        (r.category && r.category.toLowerCase().includes(lTag)) ||
        r.dietaryTags?.some(t => t.toLowerCase().includes(lTag))
      );
    });
    
    return matchesSearch && matchesCategory && matchesFavorite && matchesCuisine && matchesDifficulty && matchesTime && matchesDietary && matchesMethod && matchesOccasion && matchesCustomTags;
  }) : (searchTerm.trim() === '' ? savedRecipes : aiResults.filter(r => {
    return !favoritesOnly || favoriteRecipeIds.has(r.id);
  })));

  const activeSearchTags = [...Array.from(selectedDietary), ...activePresetTags];

  return (
    <div className="space-y-12">
      <div className="flex flex-col gap-10 border-b border-white/5 pb-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-3">
            <h1 className="font-serif text-6xl font-light text-white">Recipes</h1>
            <p className="text-gray-500 font-light text-lg">Browse our collection or find something new.</p>
          </div>
          <button
            onClick={handleAddRecipeClick}
            className="h-12 px-6 bg-amber-accent hover:bg-white text-black rounded-full text-xs font-bold uppercase tracking-widest transition-all gap-2 flex items-center shadow-xl shadow-amber-accent/20 self-start md:self-auto cursor-pointer font-sans"
          >
            <Plus className="w-4 h-4 text-black" />
            Add Recipe
          </button>
        </div>
        
        <div className="flex flex-col xl:flex-row gap-8 xl:items-center">
          <div className="flex gap-3 overflow-x-auto pb-4 xl:pb-0 scrollbar-hide flex-grow min-w-0">
            {categories.map(cat => (
              <button
                key={cat.name}
                onClick={() => {
                  setCategory(cat.name);
                  setSurpriseResults(null);
                }}
                className={`px-6 py-3 rounded-2xl border text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-3 cursor-pointer ${
                  category === cat.name 
                    ? 'bg-amber-accent border-amber-accent text-black shadow-lg shadow-amber-accent/20' 
                    : 'border-white/5 bg-white/[0.02] text-white/60 hover:border-white/20 hover:text-white'
                }`}
              >
                <cat.icon className={`w-3.5 h-3.5 ${category === cat.name ? 'text-black' : 'text-amber-accent/60'}`} />
                {cat.name}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 items-center shrink-0 relative z-10">
            <button 
              onClick={() => {
                setFavoritesOnly(!favoritesOnly);
                setSurpriseResults(null);
              }}
              className={`h-11 px-6 border rounded-full text-xs font-semibold uppercase tracking-wider transition-all gap-2 flex items-center cursor-pointer ${
                favoritesOnly 
                  ? 'bg-red-500 border-red-500 text-white' 
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
            >
             <Heart className={`w-3.5 h-3.5 ${favoritesOnly ? 'fill-current' : ''}`} />
             {favoritesOnly ? 'Favorited' : 'Favorites'}
            </button>

            <button 
              onClick={() => {
                setOfflineOnly(!offlineOnly);
                setSurpriseResults(null);
              }}
              className={`h-11 px-6 border rounded-full text-xs font-semibold uppercase tracking-wider transition-all gap-2 flex items-center cursor-pointer ${
                offlineOnly 
                  ? 'bg-amber-accent border-amber-accent text-black' 
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
            >
             <Zap className={`w-3.5 h-3.5 ${offlineOnly ? 'fill-current' : ''}`} />
             {offlineOnly ? 'Saved' : 'Show Saved'}
            </button>

            <button 
              onClick={skipToRandom}
              disabled={loading || isAISearching || (searchMode === 'local' && recipes.length === 0)}
              className="h-11 px-6 bg-white/5 border border-white/10 text-white rounded-full text-xs font-semibold uppercase tracking-wider flex items-center gap-2 hover:bg-white hover:text-black transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-accent" />
              Surprise Me
            </button>
            
            <div className="flex bg-white/5 p-1 rounded-full border border-white/10 shrink-0">
              <button
                onClick={() => setSearchMode('local')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                  searchMode === 'local' ? 'bg-white text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                Collection
              </button>
              <button
                onClick={() => setSearchMode('world')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider transition-all ${
                  searchMode === 'world' ? 'bg-amber-accent text-black' : 'text-white/60 hover:text-white'
                }`}
              >
                <Globe className="w-3.5 h-3.5" />
                World
              </button>
            </div>

            <button 
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`h-11 px-6 border rounded-full text-xs font-semibold uppercase tracking-wider transition-all gap-2 flex items-center cursor-pointer ${
                showAdvancedFilters 
                  ? 'bg-white/10 border-amber-accent/50 text-amber-accent' 
                  : 'bg-white/5 border-white/10 text-white/60 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              Filters
              <ChevronDown className={`w-3 h-3 transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
            </button>

            <form 
              onSubmit={(e) => handleSearch(e)}
              className="relative flex gap-2 search-input-container"
            >
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/20" />
                <input
                  type="text"
                  placeholder="Search recipes, ingredients or click mic..."
                  value={searchTerm}
                  onFocus={() => setShowSuggestions(true)}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    if (surpriseResults) setSurpriseResults(null);
                    setShowSuggestions(true);
                  }}
                  className="w-[220px] sm:w-[320px] h-11 pl-11 pr-24 bg-white/5 border border-white/10 rounded-full focus:outline-none focus:border-amber-accent/50 transition-all text-xs text-white placeholder:text-white/20"
                />

                {/* Integrated Media search actions inside the input field */}
                <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1.5 z-10">
                  {/* File Upload Trigger for Image search */}
                  <label 
                    htmlFor="search-image-upload" 
                    className="p-1.5 hover:bg-white/10 text-white/40 hover:text-amber-accent rounded-full transition-colors cursor-pointer flex items-center justify-center"
                    title="Upload ingredient image to search"
                  >
                    {isAnalyzingImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-accent" />
                    ) : (
                      <ImageIcon className="w-3.5 h-3.5" />
                    )}
                  </label>
                  <input 
                    type="file" 
                    id="search-image-upload" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleImageSearch} 
                  />

                  {/* Speech Recognition Trigger */}
                  <button
                    type="button"
                    onClick={startVoiceSearch}
                    className={`p-1.5 rounded-full transition-colors flex items-center justify-center ${
                      isListening 
                        ? 'bg-red-500/20 text-red-500 animate-pulse' 
                        : 'hover:bg-white/10 text-white/40 hover:text-amber-accent'
                    }`}
                    title="Voice search / Dictate criteria"
                  >
                    {isListening ? (
                      <MicOff className="w-3.5 h-3.5 animate-bounce" />
                    ) : (
                      <Mic className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <AnimatePresence>
                  {showSuggestions && (suggestions.length > 0 || recentSearches.length > 0) && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute top-full left-0 right-0 mt-2 bg-onyx border border-white/10 rounded-2xl overflow-hidden z-40 shadow-2xl min-w-[280px] sm:min-w-[320px]"
                    >
                      {/* Recent Searches Section */}
                      {recentSearches.length > 0 && (
                        <div className="p-3 bg-white/[0.02] border-b border-white/5 space-y-1.5">
                          <div className="flex items-center justify-between px-2">
                            <span className="text-[10px] font-black uppercase text-amber-accent/70 tracking-widest flex items-center gap-1">
                              <RotateCcw className="w-3 h-3 text-amber-accent" /> Recent Searches
                            </span>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setRecentSearches([]);
                                localStorage.removeItem('recent_cooking_searches');
                              }}
                              className="text-[9px] uppercase tracking-wider text-red-400 hover:text-red-300 font-bold transition-colors cursor-pointer"
                            >
                              Clear
                            </button>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            {recentSearches.map((term, i) => (
                              <div
                                key={`recent-${i}`}
                                onClick={() => {
                                  setSearchTerm(term);
                                  setShowSuggestions(false);
                                  handleSearch(undefined, term);
                                }}
                                className="flex items-center justify-between px-3 py-1.5 rounded-xl hover:bg-white/5 group transition-colors cursor-pointer"
                              >
                                <span className="text-xs text-white/50 group-hover:text-white transition-colors truncate pr-4">
                                  {term}
                                </span>
                                <button
                                  type="button"
                                  onClick={(e) => removeRecentSearch(term, e)}
                                  className="text-white/20 hover:text-red-400 p-1 rounded transition-colors cursor-pointer"
                                  title="Remove query from history"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Autocomplete suggestions Section */}
                      {suggestions.length > 0 && (
                        <div className="p-2">
                          <div className="px-3 py-1.5 text-[9px] font-black uppercase text-white/40 tracking-widest">
                            Suggestions
                          </div>
                          {suggestions.map((suggestion, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => {
                                setSearchTerm(suggestion);
                                setShowSuggestions(false);
                                handleSearch(undefined, suggestion);
                              }}
                              className="w-full text-left px-3 py-2 text-xs text-white/60 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer flex items-center gap-2"
                            >
                              <Search className="w-3 h-3 text-white/20" />
                              <span className="truncate">{suggestion}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <button 
                type="submit"
                disabled={isAISearching}
                className="h-11 px-6 bg-amber-accent text-black rounded-full text-xs font-bold uppercase tracking-wider hover:bg-white transition-all shadow-xl shadow-amber-accent/10 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isAISearching ? (
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="w-3 h-3 border-2 border-black border-t-transparent rounded-full"
                  />
                ) : (
                  <Search className="w-3 h-3" />
                )}
                <span>Search</span>
              </button>
            </form>
          </div>
        </div>

        {/* Dynamic Preset Tags & Conversational Assistant Drawer */}
        <div className="space-y-6 pt-2">
          {/* Smart Preset Tags Selector */}
          <div className="flex flex-col gap-3">
            <span className="text-gray-500 font-semibold text-xs uppercase tracking-widest flex items-center gap-1.5 select-none">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-accent" /> Tag-based parameters
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { tag: 'Under 30m', icon: Clock, color: 'hover:border-amber-accent/50 text-amber-accent/80' },
                { tag: 'High Protein', icon: Sparkles, color: 'hover:border-blue-400/50 text-blue-400/80 hover:bg-blue-400/5' },
                { tag: 'Vegan', icon: Heart, color: 'hover:border-emerald-400/50 text-emerald-400/80 hover:bg-emerald-400/5' },
                { tag: 'Gluten-Free', icon: Utensils, color: 'hover:border-amber-300/50 text-amber-300/80 hover:bg-amber-300/5' },
                { tag: 'Keto', icon: Zap, color: 'hover:border-purple-400/50 text-purple-400/80 hover:bg-purple-400/5' },
                { tag: 'Spicy', icon: Flame, color: 'hover:border-red-400/50 text-red-400/80 hover:bg-red-400/5' },
                { tag: 'Comfort Food', icon: ChefHat, color: 'hover:border-orange-400/50 text-orange-400/80 hover:bg-orange-400/5' }
              ].map(({ tag, icon: TagIcon, color }) => {
                const isActive = 
                  (tag === 'Under 30m' && maxTime === 30) ||
                  ((tag === 'Vegan' || tag === 'Gluten-Free' || tag === 'Keto') && selectedDietary.has(tag)) ||
                  (tag !== 'Under 30m' && !['Vegan', 'Gluten-Free', 'Keto'].includes(tag) && activePresetTags.includes(tag));

                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      togglePresetTag(tag);
                      // Auto execute search on value change
                      setTimeout(() => handleSearch(), 120);
                    }}
                    className={`px-4 py-2 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
                      isActive
                        ? 'bg-amber-accent border-amber-accent text-black shadow-lg shadow-amber-accent/10 scale-98'
                        : `bg-white/[0.01] border-white/5 text-white/50 ${color}`
                    }`}
                  >
                    <TagIcon className="w-3.5 h-3.5" />
                    {tag}
                  </button>
                );
              })}

              {(maxTime > 0 || selectedDietary.size > 0 || activePresetTags.length > 0) && (
                <button
                  type="button"
                  onClick={() => {
                    setMaxTime(0);
                    setSelectedDietary(new Set());
                    setActivePresetTags([]);
                    setTimeout(() => handleSearch(), 120);
                  }}
                  className="px-4 py-2 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-[10px] font-bold uppercase tracking-wider hover:bg-red-500 hover:text-white transition-all flex items-center gap-2 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                  Reset preset tags
                </button>
              )}
            </div>
          </div>

          {/* Conversational Prompts Block */}
          <div className="bg-white/[0.01] border border-white/5 rounded-[28px] p-5 space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[10px] uppercase tracking-widest font-extrabold text-white/40 flex items-center gap-2 select-none">
                <Sparkles className="w-3.5 h-3.5 text-amber-accent animate-pulse" /> Conversational exploration suggestions
              </span>
              <button
                type="button"
                onClick={() => setShowConversationalHelper(!showConversationalHelper)}
                className="text-[10px] uppercase font-bold tracking-widest text-amber-accent/70 hover:text-amber-accent transition-colors cursor-pointer"
              >
                {showConversationalHelper ? 'Dismiss list' : 'Reveal examples'}
              </button>
            </div>

            <p className="text-gray-500 font-light text-xs italic">
              Experience the power of NLP. Write your real craving or select an expressive cooking mood below to generate a beautiful custom gourmet match:
            </p>

            <AnimatePresence>
              {showConversationalHelper && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 overflow-hidden"
                >
                  {[
                    { sentence: "quick healthy vegan snacks for movie night", desc: "🌱 Speed bites for popcorn alternatives" },
                    { sentence: "authentic romantic French dinner ready in 45 mins", desc: "🍷 Candle-light level French gourmet step list" },
                    { sentence: "protein rich gluten-free breakfast with avocado", desc: "🥑 Power-fueled macros for positive startup routines" },
                    { sentence: "cozy spicy noodle bowls for weeknight comfort", desc: "🍜 Cozy winter night noodle recipes" }
                  ].map(({ sentence, desc }) => (
                    <button
                      key={sentence}
                      type="button"
                      onClick={() => {
                        setSearchTerm(sentence);
                        setSearchMode('world');
                        handleSearch(undefined, sentence);
                      }}
                      className="text-left p-4 bg-white/[0.02] hover:bg-amber-accent/5 border border-white/5 hover:border-amber-accent/20 rounded-2xl group transition-all duration-300 cursor-pointer"
                    >
                      <span className="block text-xs font-bold text-white/70 group-hover:text-amber-accent mb-1 transition-colors">
                        "{sentence}"
                      </span>
                      <span className="block text-[10px] text-gray-400 font-light">
                        {desc}
                      </span>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-white/5 rounded-[32px] border border-white/10"
            >
              <div className="p-8 space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                  {/* Cuisine & Difficulty */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
                        <Globe className="w-3 h-3" /> Origin & Style
                      </label>
                      <select 
                        value={selectedCuisine}
                        onChange={(e) => {
                          setSelectedCuisine(e.target.value);
                          setSurpriseResults(null);
                        }}
                        className="w-full bg-onyx border border-white/10 rounded-2xl px-5 py-3 text-xs text-white focus:outline-none focus:border-amber-accent cursor-pointer"
                      >
                        {cuisines.map(c => (
                          <option key={c} value={c}>{c} Cuisine</option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
                          <ChefHat className="w-3 h-3" /> Difficulty
                        </label>
                        <span className="text-xs font-bold text-amber-accent">{difficultyLevels[difficultyLevel]}</span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="4"
                        step="1"
                        value={difficultyLevel}
                        onChange={(e) => setDifficultyLevel(parseInt(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-accent"
                      />
                    </div>
                  </div>

                  {/* Dietary Restrictions */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
                      <Heart className="w-3 h-3" /> Dietary Needs
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {dietaryTags.map(tag => {
                        const isSelected = selectedDietary.has(tag);
                        return (
                          <button
                            key={tag}
                            onClick={() => {
                              const newDietary = new Set(selectedDietary);
                              if (isSelected) newDietary.delete(tag);
                              else newDietary.add(tag);
                              setSelectedDietary(newDietary);
                            }}
                            className={`px-4 py-2 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all gap-2 flex items-center cursor-pointer ${
                              isSelected 
                                ? 'bg-amber-accent/20 border-amber-accent text-amber-accent' 
                                : 'bg-onyx border-white/5 text-white/60 hover:border-white/20'
                            }`}
                          >
                            {isSelected && <Check className="w-3 h-3" />}
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Cooking Time & Method */}
                  <div className="space-y-6">
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <label className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
                          <Clock className="w-3 h-3" /> Ready In
                        </label>
                        <span className="text-xs font-bold text-amber-accent">
                          {maxTime === 0 ? 'Any time' : `< ${maxTime} min`}
                        </span>
                      </div>
                      <input 
                        type="range"
                        min="0"
                        max="120"
                        step="15"
                        value={maxTime}
                        onChange={(e) => setMaxTime(parseInt(e.target.value))}
                        className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-amber-accent"
                      />
                    </div>

                    <div className="space-y-4">
                      <label className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
                        <Utensils className="w-3 h-3" /> Cooking Method
                      </label>
                      <select 
                        value={selectedMethod}
                        onChange={(e) => setSelectedMethod(e.target.value)}
                        className="w-full bg-onyx border border-white/10 rounded-2xl px-5 py-3 text-xs text-white focus:outline-none focus:border-amber-accent cursor-pointer"
                      >
                        {cookingMethods.map(m => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Occasions */}
                  <div className="space-y-4">
                    <label className="text-xs font-bold uppercase tracking-wider text-white/60 flex items-center gap-2">
                      <Sparkles className="w-3 h-3" /> Special Occasion
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {occasions.map(occ => {
                        const isSelected = selectedOccasion === occ;
                        return (
                          <button
                            key={occ}
                            onClick={() => setSelectedOccasion(isSelected ? 'All' : occ)}
                            className={`px-4 py-2 rounded-xl border text-xs font-semibold uppercase tracking-wider transition-all flex items-center cursor-pointer ${
                              isSelected 
                                ? 'bg-white border-white text-black' 
                                : 'bg-onyx border-white/5 text-white/60 hover:border-white/20'
                            }`}
                          >
                            {occ}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/5 flex justify-end gap-4">
                  <button 
                    onClick={() => {
                      setSelectedCuisine('All');
                      setDifficultyLevel(0);
                      setMaxTime(0);
                      setSelectedDietary(new Set());
                      setSelectedMethod('All');
                      setSelectedOccasion('All');
                    }}
                    className="text-xs font-bold uppercase tracking-wider text-white/40 hover:text-white transition-colors"
                  >
                    Reset All
                  </button>
                  <button 
                    onClick={() => setShowAdvancedFilters(false)}
                    className="px-8 py-3 bg-white text-black rounded-full text-xs font-bold uppercase tracking-wider hover:bg-amber-accent transition-all"
                  >
                    Apply Filters
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div id="results-target" />

      {/* Trending Section */}
      {trendingRecipes.length > 0 && !searchTerm && !surpriseResults && category === 'All' && !favoritesOnly && !offlineOnly && savedRecipes.length === 0 && (
        <section className="space-y-10 pb-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="bg-amber-accent/10 p-3 rounded-2xl">
                <Sparkles className="w-6 h-6 text-amber-accent" />
              </div>
              <div>
                <h2 className="font-serif text-4xl text-white italic">Trending Picks</h2>
                <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Community favorites this week</p>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {trendingRecipes.map((recipe, index) => (
              <RecipeCard key={`trending-${recipe.id}`} recipe={recipe} index={index} activeTags={activeSearchTags} />
            ))}
          </div>
          <div className="border-b border-white/5 pt-10" />
        </section>
      )}

      {surpriseResults && (
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4 bg-amber-accent/5 p-6 rounded-[24px] border border-amber-accent/20"
        >
          <div className="p-3 bg-amber-accent rounded-full text-black">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-serif text-2xl text-white italic">Surprise Selection</h2>
            <p className="text-amber-accent/60 text-xs font-bold uppercase tracking-widest">{surpriseResults.length} random recipes selected for you</p>
          </div>
          <button 
            onClick={() => setSurpriseResults(null)}
            className="ml-auto px-4 py-2 border border-white/10 rounded-full text-xs font-bold uppercase tracking-wider text-white/60 hover:text-white hover:border-white/30 transition-all"
          >
            Clear Selection
          </button>
        </motion.div>
      )}

      {/* Saved Section Title */}
      {!searchTerm && !surpriseResults && category === 'All' && !favoritesOnly && !offlineOnly && savedRecipes.length > 0 && searchMode === 'world' && (
        <div className="flex items-center gap-4 mb-2">
          <div className="bg-amber-accent/10 p-3 rounded-2xl">
            <Heart className="w-6 h-6 text-amber-accent" />
          </div>
          <div>
            <h2 className="font-serif text-3xl text-white italic">Your Favorites</h2>
            <p className="text-gray-400 text-xs uppercase tracking-widest font-semibold">Quick access to your preferred dishes</p>
          </div>
        </div>
      )}

      {aiError && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-6 bg-red-500/10 border border-red-500/20 rounded-[24px] text-red-500 text-center font-light italic"
        >
          {aiError}
        </motion.div>
      )}

      {loading || isAISearching ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {[1,2,3,4,5,6].map(i => (
            <RecipeCardSkeleton key={i} />
          ))}
        </div>
      ) : (currentDisplay.length > 0 || pendingReveal !== null) ? (
        <div className="space-y-12">
          {searchMode === 'world' && (currentDisplay.some(r => r.isFallback) || (quotaStatus && quotaStatus.isOffline)) && (
            <motion.div 
              initial={{ opacity: 0, y: -15 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-amber-950/45 via-zinc-900 to-zinc-950 border border-amber-500/20 rounded-[28px] p-8 space-y-6 shadow-2xl relative overflow-hidden"
            >
              {/* Decorative Blur Backgrounds */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-[120px] pointer-events-none" />
              <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-red-500/5 rounded-full blur-[100px] pointer-events-none" />

              <div className="flex flex-col md:flex-row gap-6 items-start">
                <div className="bg-amber-500/10 p-4 rounded-xl text-amber-accent shrink-0 border border-amber-500/20 shadow-inner">
                  <Database className="w-8 h-8" />
                </div>
                
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="bg-amber-500/15 text-amber-accent text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-amber-500/20">
                      Resilient Cache Engaged
                    </span>
                    <span className="bg-red-500/15 text-red-400 text-[10px] font-extrabold uppercase tracking-widest px-3 py-1 rounded-full border border-red-500/20">
                      API Safety Cap Engaged (429)
                    </span>
                  </div>

                  <h3 className="text-xl font-serif text-white italic">Google AI Studio Safety Spending Cap Notification</h3>
                  
                  <div className="text-sm text-gray-350 font-light leading-relaxed space-y-3">
                    <p>
                      You have successfully upgraded to a **Paid API Plan**! However, Google AI Studio enforces a default safety **Monthly Spending Cap** (which defaults to **$0.00** on newly upgraded or newly configured billing portfolios).
                    </p>
                    <p>
                      Until this cap is proactively adjusted on the Google console, premium Google Search Grounding endpoints will transiently return a <code className="bg-white/10 px-1.5 py-0.5 rounded text-red-300 font-mono text-xs">RESOURCE_EXHAUSTED</code> spend limit error.
                    </p>
                    
                    {quotaStatus?.lastError && (
                      <div className="mt-4 p-4 bg-black/40 rounded-2xl border border-white/5 font-mono text-xs text-amber-200/80 leading-relaxed max-w-full overflow-x-auto">
                        <strong className="text-white block mb-1">Server Reported Diagnostic Profile:</strong>
                        {quotaStatus.lastError}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Guides & Direct Retry Trigger */}
              <div className="bg-white/[0.02] rounded-[20px] p-5 border border-white/10 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-5">
                <div className="space-y-1">
                  <p className="text-xs text-white font-medium">Quick Resolution Workflow:</p>
                  <p className="text-xs text-gray-400 font-light leading-relaxed">
                    1. Direct spend control: Visit <a href="https://ai.studio/spend" target="_blank" rel="noopener noreferrer" className="text-amber-accent hover:underline font-semibold inline-flex items-center gap-1">ai.studio/spend <ExternalLink className="w-3 h-3 inline" /></a> and increase your Monthly Spend Cap.<br />
                    2. Click the bypass toggle button on the right to refresh servers and test active live queries instantly.
                  </p>
                </div>

                <div className="shrink-0 flex items-center">
                  <button
                    onClick={handleClearQuota}
                    disabled={isClearingQuota}
                    className="relative w-full lg:w-auto px-6 py-4 bg-gradient-to-r from-amber-500 to-amber-accent text-black rounded-xl text-xs font-bold uppercase tracking-wider hover:opacity-90 active:scale-95 transition-all duration-300 shadow-[0_4px_20px_rgba(245,158,11,0.25)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isClearingQuota ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-black" />
                        <span>Rechecking Portfolios...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4 text-black fill-current" />
                        <span>Clear Safety Buffer & Search</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            {currentDisplay.map((recipe, index) => (
              <RecipeCard key={recipe.id} recipe={recipe} index={index} activeTags={activeSearchTags} />
            ))}
          </div>
          
          {searchMode === 'world' && !surpriseResults && searchTerm.trim() !== '' && aiResults.length > 0 && (
            <div className="flex justify-center pb-12">
              <button
                onClick={handleLoadMore}
                disabled={isLoadingMore}
                className="group relative px-10 py-5 bg-white/5 border border-white/10 rounded-full text-xs font-bold uppercase tracking-[0.2em] text-white hover:bg-white hover:text-black transition-all duration-500 overflow-hidden cursor-pointer disabled:opacity-50"
              >
                <div className="relative z-10 flex items-center gap-3">
                  {isLoadingMore ? (
                    <motion.div 
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-current border-t-transparent rounded-full"
                    />
                  ) : (
                    <Sparkles className="w-4 h-4 text-amber-accent group-hover:text-black transition-colors" />
                  )}
                  <span>{isLoadingMore ? 'Refining Library...' : 'Discover More Suggestions'}</span>
                </div>
                <motion.div 
                  className="absolute inset-0 bg-gradient-to-r from-amber-accent/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity"
                  animate={{ x: ['-100%', '100%'] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                />
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-32 bg-graphite rounded-[40px] border border-dashed border-white/10 px-6">
          <div className="max-w-md mx-auto space-y-6">
            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8">
              {searchMode === 'world' ? <Globe className="w-10 h-10 text-amber-accent/20" /> : <Search className="w-10 h-10 text-white/10" />}
            </div>
            <h3 className="font-serif text-3xl text-white italic">
              {searchMode === 'world' ? (favoritesOnly ? 'No favorited world recipes' : 'Discover World Flavors') : 'No recipes found'}
            </h3>
            <p className="text-gray-500 font-light italic">
              {searchMode === 'world' 
                ? (favoritesOnly 
                  ? "You haven't favorited any discovered recipes yet. Start exploring to save your favorites!"
                  : "Enter a specific dish or ingredient above to search the global library.")
                : (recipes.length === 0 
                  ? "Our collection is currently empty. Be the first to share a masterpiece!" 
                  : (favoritesOnly 
                    ? "You haven't favorited any recipes from our library yet." 
                    : "Your search filter didn't return any matches."))}
            </p>
            
            {(searchMode === 'local') && (
              <div className="flex flex-wrap gap-4 justify-center pt-4">
                {recipes.length === 0 ? (
                  <button 
                    onClick={handleAddRecipeClick}
                    className="px-8 py-4 bg-amber-accent text-black rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white transition-all shadow-xl shadow-amber-accent/20 cursor-pointer"
                  >
                    Add First Recipe
                  </button>
                ) : (
                  <button 
                    onClick={() => {
                      setSearchTerm('');
                      setCategory('All');
                      setOfflineOnly(false);
                      setFavoritesOnly(false);
                      setSurpriseResults(null);
                    }}
                    className="px-8 py-4 bg-white/5 text-white/40 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-white hover:text-black transition-all"
                  >
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title={authModalTitle}
        message={authModalMessage}
        actionName="search and discover recipes"
      />

      <AddRecipeModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={(id) => {
          console.log("Newly published recipe ID:", id);
          setSearchTerm('');
          setCategory('All');
          setOfflineOnly(false);
          setFavoritesOnly(false);
          setSurpriseResults(null);
          setSearchMode('local'); // set to local Collection search to see their newly added recipe!
          setRefreshTrigger(prev => prev + 1); // trigger list refresh
        }}
      />
    </div>
  );
}
