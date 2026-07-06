import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  ChefHat, 
  Sparkles, 
  Utensils, 
  ArrowRight, 
  Clock, 
  Sun, 
  Moon, 
  Coffee, 
  Heart, 
  Star, 
  Calendar, 
  ShieldCheck, 
  CheckCircle2, 
  Mail, 
  Phone, 
  MapPin, 
  Send, 
  Loader2, 
  Info, 
  MessageSquare,
  Sparkle,
  BookOpen,
  ClipboardList,
  Flame,
  CheckCircle,
  HelpCircle,
  ShoppingBag
} from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';
import { collection, query, limit, getDocs, where, addDoc, serverTimestamp } from 'firebase/firestore';
import { useEffect, useState, useMemo, useRef } from 'react';
import { Recipe } from '../types';
import RecipeCard from '../components/recipes/RecipeCard';
import { RecipeCardSkeleton, Shimmer } from '../components/recipes/RecipeSkeleton';
import AuthModal from '../components/auth/AuthModal';

const C_HUB_DATA = [
  {
    tabLabel: "5-Minute Magic",
    title: "Easy food to make in 5 minutes",
    subtitle: "Quick solutions for snacks, lunch, desserts & kids",
    description: "Short on time? We specialize in 5-minute recipes for snacks, lunch, and dinner. Learn to prepare quick, easy healthy meals on a budget with absolutely no cook times, or satisfy a late-night craving with a fast sweet treat.",
    recipes: [
      {
        title: "5 Minute Recipes for Snacks",
        desc: "Super simple food recipes snacks that require only 3 pantry ingredients. Perfect as easy food to make in 5 minutes with few ingredients for busy afternoons.",
        tag: "Easy snacks to make in 5 minutes indian",
        time: "5 min",
        ingredients: "Spiced Chickpeas, Olive Oil, Sea Salt"
      },
      {
        title: "5-Minute Recipes for Lunch",
        desc: "Learn to whip up easy food to make in 5 minutes healthy on a budget. This is an excellent, quick easy healthy meals for one alternative to takeout.",
        tag: "Easy food to make in 5 minutes healthy",
        time: "5 min",
        ingredients: "Greek Yogurt, Cucumber, Dill, Pita Bread"
      },
      {
        title: "5 Minute Recipes for Dinner",
        desc: "Designed as easy food to make in 5 minutes healthy for weight loss, this is a clean, easy food to make in 5 minutes healthy no cook choice for late nights.",
        tag: "Easy food to make in 5 minutes for family",
        time: "5 min",
        ingredients: "Canned Tuna, Avocado, Baby Spinach, Lemon Juice"
      },
      {
        title: "5 Minute Recipes Dessert",
        desc: "Satisfy your cravings with a simple food recipes sweet bite. This microwave mug cake is incredibly easy food to make in 5 minutes for kids.",
        tag: "Simple Food recipes sweet",
        time: "5 min",
        ingredients: "Oat Flour, Cocoa Powder, Maple Syrup, Chocolate Chips"
      }
    ]
  },
  {
    tabLabel: "Simple Dinners",
    title: "Simple food recipes for dinner",
    subtitle: "Lazy dinner ideas & quick healthy meals for family & friends",
    description: "Explore simple food recipes for dinner healthy and delicious. Here you will find quick dinner ideas for 2, lazy dinner ideas for those exhausted evenings, and simple food recipes for students who need quick meals that fit tight budgets.",
    recipes: [
      {
        title: "Lazy Dinner Ideas for Family",
        desc: "One of our most popular simple food recipes for dinner for family. Cooked in a single pot to save on prep and clean up time.",
        tag: "Simple food recipes for dinner healthy",
        time: "15 min",
        ingredients: "Whole Wheat Pasta, Canned Tomatoes, Garlic, Basil"
      },
      {
        title: "Quick Dinner Ideas for 2",
        desc: "An elegant yet simple food recipes for dinner for two option. Excellent quick easy healthy meals for weight loss without sacrificing flavor.",
        tag: "Quick easy healthy meals for weight loss",
        time: "20 min",
        ingredients: "Chicken Breast / Tofu, Broccoli, Soy Sauce, Ginger"
      },
      {
        title: "Simple Food Recipes for Students",
        desc: "Frugal and healthy! These quick, easy healthy meals on a budget use cheap staple ingredients to deliver amazing nutritional value.",
        tag: "Quick easy healthy meals on a budget",
        time: "12 min",
        ingredients: "Brown Rice, Black Beans, Salsa, Shredded Cheese"
      }
    ]
  },
  {
    tabLabel: "Indian Specialties",
    title: "Food recipes Indian",
    subtitle: "Simple Indian vegetarian recipes for dinner",
    description: "Introduce rich, authentic spices to your kitchen table with quick dinner recipes Indian style. These are simple Indian vegetarian recipes for dinner that use minimal oils and can be customized to your taste in english.",
    recipes: [
      {
        title: "Quick Dinner Recipes Indian",
        desc: "A warm, comforting lentil curry that stands out on any food recipes list. High in plant protein and incredibly simple to cook.",
        tag: "Simple Indian vegetarian recipes for dinner",
        time: "25 min",
        ingredients: "Red Lentils, Turmeric, Cumin, Coconut Milk"
      },
      {
        title: "Easy Snacks to Make in 5 Minutes Indian",
        desc: "Whip up quick indian vegetarian snacks. Perfectly spiced puffed rice that is light, crispy, and gluten-free.",
        tag: "Food recipes Indian",
        time: "5 min",
        ingredients: "Puffed Rice, Roasted Peanuts, Mustard Oil, Chaat Masala"
      }
    ]
  },
  {
    tabLabel: "Every Day Basics",
    title: "Food recipes Website",
    subtitle: "Simple food recipes with few ingredients for every day",
    description: "Welcome to the ultimate food recipes app. We compile a robust food recipes list featuring simple food recipes with few ingredients that anyone can prepare. Great for showcasing simple food recipes instagram posts!",
    recipes: [
      {
        title: "Food Recipes Breakfast",
        desc: "Start your day right with simple food recipes for every day. Our food recipes breakfast collection is simple, clean, and nutritious.",
        tag: "Food recipes breakfast",
        time: "10 min",
        ingredients: "Rolled Oats, Chia Seeds, Almond Milk, Berries"
      },
      {
        title: "Food Recipes With Ingredients",
        desc: "Type in what you have! Our search engine acts as a food recipes app helper, instantly suggesting dishes you can cook with your exact ingredients.",
        tag: "Food recipes With ingredients",
        time: "Instant",
        ingredients: "Interactive Pantry Search Engine"
      },
      {
        title: "Simple Food Recipes Instagram Style",
        desc: "Elegantly plated, simple food recipes website selections that look beautiful in photographs and taste even better.",
        tag: "Simple food recipes instagram",
        time: "15 min",
        ingredients: "Sourdough Toast, Poached Egg, Avocado Rose"
      }
    ]
  }
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featuredRecipes, setFeaturedRecipes] = useState<Recipe[]>([]);
  const [recipeOfTheDay, setRecipeOfTheDay] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeHubTab, setActiveHubTab] = useState(0);

  // Authentication Modal states
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalTitle, setAuthModalTitle] = useState("Sign In Required");
  const [authModalMessage, setAuthModalMessage] = useState("To access premium cooking features, generate customized recipes, scan ingredients, or map weekly meal plans, please sign in.");

  // Contact Form states
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactSubject, setContactSubject] = useState("");
  const [contactMessage, setContactMessage] = useState("");
  const [contactSubmitting, setContactSubmitting] = useState(false);
  const [contactSuccess, setContactSuccess] = useState(false);
  const [contactError, setContactError] = useState("");

  // Sticky scroll section tracking
  const [activeSection, setActiveSection] = useState("home");
  const sections = [
    { id: "home", label: "Home" },
    { id: "mission", label: "Our Mission" },
    { id: "features", label: "Core Features" },
    { id: "how-it-works", label: "How It Works" },
    { id: "contact", label: "Contact Us" }
  ];

  // Time context logic for personalized welcoming and scheduling
  const timeContext = useMemo(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return { label: 'Morning', icon: Coffee, greeting: 'Good morning', category: 'Breakfast', theme: 'Fresh Breakfast Suggestions' };
    if (hour >= 11 && hour < 16) return { label: 'Afternoon', icon: Sun, greeting: 'Good afternoon', category: 'Lunch', theme: 'Balanced Lunches' };
    if (hour >= 16 && hour < 21) return { label: 'Evening', icon: ChefHat, greeting: 'Good evening', category: 'Dinner', theme: 'Wholesome Dinners' };
    return { label: 'Late Night', icon: Moon, greeting: 'Good evening', category: 'Snack', theme: 'Light Late-Night Bites' };
  }, []);

  useEffect(() => {
    async function loadDynamicContent() {
      try {
        const recipesRef = collection(db, 'recipes');
        
        // 1. Get Recipe of the Day for indexability
        const qOfTheDay = query(recipesRef, where('isPublic', '==', true), limit(10));
        const snap = await getDocs(qOfTheDay);
        const all = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
        const filteredAll = all.filter(r => r.status === 'approved' || (user && r.authorId === user.uid) || !r.status);
        
        if (filteredAll.length > 0) {
          const dateSeed = new Date().toISOString().split('T')[0];
          const index = dateSeed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % filteredAll.length;
          setRecipeOfTheDay(filteredAll[index]);
        }

        // 2. Get Time-Sensitive Suggestions
        const qTime = query(recipesRef, where('isPublic', '==', true), where('category', '==', timeContext.category), limit(10));
        const timeSnap = await getDocs(qTime);
        const timeRecipes = timeSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
        const filteredTime = timeRecipes.filter(r => r.status === 'approved' || (user && r.authorId === user.uid) || !r.status).slice(0, 4);
        
        if (filteredTime.length === 0) {
          const qFallback = query(recipesRef, where('isPublic', '==', true), limit(15));
          const fallbackSnap = await getDocs(qFallback);
          const rawFallback = fallbackSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Recipe));
          const filteredFallback = rawFallback.filter(r => r.status === 'approved' || (user && r.authorId === user.uid) || !r.status).slice(0, 4);
          setFeaturedRecipes(filteredFallback);
        } else {
          setFeaturedRecipes(filteredTime);
        }

        setLoading(false);
      } catch (error) {
        console.warn("Failed to load recipes on landing page:", error);
        setLoading(false);
      }
    }

    loadDynamicContent();
  }, [timeContext]);

  // Handle active navigation item on scroll
  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY + 200;
      for (const section of sections) {
        const element = document.getElementById(section.id);
        if (element) {
          const top = element.offsetTop;
          const height = element.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section.id);
          }
        }
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Scroll to section from URL hash if navigating from other pages (like Blog)
  useEffect(() => {
    if (window.location.hash) {
      const id = window.location.hash.replace("#", "");
      // Wait for content to render completely
      setTimeout(() => {
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });
          setActiveSection(id);
        }
      }, 500);
    }
  }, []);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
      setActiveSection(id);
    }
  };

  const handleContactSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactName.trim() || !contactEmail.trim() || !contactMessage.trim()) {
      setContactError("Please fill out all required fields.");
      return;
    }

    setContactSubmitting(true);
    setContactError("");

    try {
      // Save contact submission directly to Firestore for proper lead tracking
      await addDoc(collection(db, "contact_messages"), {
        name: contactName.trim(),
        email: contactEmail.trim(),
        subject: contactSubject.trim() || "General Inquiry",
        message: contactMessage.trim(),
        createdAt: serverTimestamp(),
        sourceUrl: window.location.href,
        userAgent: navigator.userAgent
      });

      setContactSuccess(true);
      setContactName("");
      setContactEmail("");
      setContactSubject("");
      setContactMessage("");
    } catch (err: any) {
      console.error("Error submitting contact form to Firestore:", err);
      // Fallback local storage backup if firestore block happens
      try {
        const existing = JSON.parse(localStorage.getItem("offline_contact_messages") || "[]");
        existing.push({
          name: contactName,
          email: contactEmail,
          subject: contactSubject,
          message: contactMessage,
          timestamp: new Date().toISOString()
        });
        localStorage.setItem("offline_contact_messages", JSON.stringify(existing));
        setContactSuccess(true);
        setContactName("");
        setContactEmail("");
        setContactSubject("");
        setContactMessage("");
      } catch (localErr) {
        setContactError("Something went wrong while delivering your message. Please try again.");
      }
    } finally {
      setContactSubmitting(false);
    }
  };

  return (
    <div className="space-y-16 selection:bg-amber-accent/20 selection:text-amber-accent relative">
      
      {/* 5-Menu Floating Sticky Sub-Navigation Header */}
      <div className="sticky top-0 md:top-20 z-40 bg-onyx/85 backdrop-blur-md border-y border-white/5 py-3 px-4 shadow-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div className="hidden md:flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-accent animate-pulse" />
            <span className="text-[11px] font-bold uppercase tracking-widest text-white/50">Zero-Waste Culinary Assistant</span>
          </div>
          
          <nav className="flex items-center overflow-x-auto no-scrollbar whitespace-nowrap gap-1.5 py-1 w-full md:w-auto justify-start md:justify-center">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all select-none cursor-pointer shrink-0",
                  activeSection === section.id
                    ? "bg-amber-accent text-black font-extrabold shadow-md shadow-amber-accent/15"
                    : "text-white/60 hover:text-white hover:bg-white/5"
                )}
              >
                {section.label}
              </button>
            ))}
            <Link
              to="/blog"
              className="px-3 py-1.5 rounded-lg text-[10px] sm:text-[11px] font-black uppercase tracking-wider transition-all select-none cursor-pointer text-white/60 hover:text-white hover:bg-white/5 shrink-0"
            >
              Blog
            </Link>
          </nav>
        </div>
      </div>

      {/* -------------------- SECTION 1: HOME (HERO) -------------------- */}
      <section id="home" className="scroll-mt-32 pt-6 sm:pt-12 text-center space-y-6 sm:space-y-8 max-w-4xl mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 border border-white/10 bg-white/[0.02] text-white/80 rounded-full text-[10px] font-black uppercase tracking-widest leading-none">
            <timeContext.icon className="w-3.5 h-3.5 text-amber-accent" />
            <span>{timeContext.greeting}{user ? `, ${user.displayName?.split(' ')[0]}` : ' - Welcome to Daily Meal Recipe'}</span>
          </div>

          <h1 className="font-serif text-5xl sm:text-7xl md:text-8xl font-normal leading-tight text-white tracking-tight">
            Stop wondering <br />
            <span className="italic text-amber-accent">what to cook.</span>
          </h1>
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto font-light leading-relaxed"
        >
          A straightforward, Google-indexed kitchen companion designed to combat domestic food waste. Enter standard pantry ingredients, instantly generate certified chef-quality recipes, organize your weekly meal plan, and sync lists.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.25 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4"
        >
          {user ? (
            <Link
              to="/generate"
              className="w-full sm:w-auto px-8 py-4 bg-amber-accent text-black hover:bg-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-3 group border border-transparent shadow-lg shadow-amber-accent/10 cursor-pointer"
            >
              Create New Recipe
              <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
            </Link>
          ) : (
            <button
              onClick={() => navigate('/auth')}
              className="w-full sm:w-auto px-8 py-4 bg-amber-accent text-black hover:bg-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-3 border border-transparent shadow-lg shadow-amber-accent/10 cursor-pointer"
            >
              Get Started Free
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
          <Link
            to="/discover"
            className="w-full sm:w-auto px-8 py-4 border border-white/10 text-white rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-white/5 hover:border-white/20 transition-all text-center cursor-pointer"
          >
            Browse Public Catalog
          </Link>
        </motion.div>

        {/* Real-time trust metrics */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 pt-6 text-[10px] uppercase font-bold text-white/30 tracking-widest border-t border-white/5"
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-accent/60" />
            <span>Zero-waste meal planner</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-accent/60" />
            <span>Secure personal ingredient vault</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-accent/60" />
            <span>Chef-approved custom recipe guides</span>
          </div>
        </motion.div>
      </section>

      {/* -------------------- SECTION 2: OUR MISSION -------------------- */}
      <section id="mission" className="scroll-mt-32 max-w-7xl mx-auto px-4 py-8">
        <div className="bg-coal/50 border border-white/5 rounded-[32px] p-8 md:p-16 space-y-12 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-accent/5 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="max-w-3xl space-y-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-accent">Our Core Mission</span>
            <h2 className="font-serif text-3xl sm:text-5xl italic text-white font-normal leading-tight">
              An elegant solution to reduce global food waste and domestic cooking stress.
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-start text-gray-400 font-light text-sm leading-relaxed">
            <div className="space-y-6">
              <p>
                Did you know that nearly <strong className="text-white">one-third of all food produced</strong> for human consumption is lost or wasted globally? In home kitchens, this often happens silently—vegetables wilt at the bottom of the drawer, pantry items pass their expiry dates unnoticed, and households buy redundant spices because of complex, single-use recipes.
              </p>
              <p>
                <strong>Daily Meal Recipe</strong> was built as an antidote to this kitchen clutter. We empower families to log what ingredients are already available in their pantries and generate tailored recipes in seconds. By streamlining domestic kitchen habits, we help you save money on groceries and make eco-friendly living a seamless, delicious daily ritual.
              </p>
            </div>
            <div className="space-y-6 bg-onyx/40 p-6 sm:p-8 rounded-2xl border border-white/5">
              <h3 className="font-serif text-xl text-white italic font-normal">Our Smart Kitchen Principles:</h3>
              <ul className="space-y-4 text-xs font-light">
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-amber-accent shrink-0 mt-0.5" />
                  <span><strong>Adaptive AI Formula:</strong> We reverse-engineer professional chef recipes to match what you already have in your kitchen, minimizing grocery bills and redundant trips to the store.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-amber-accent shrink-0 mt-0.5" />
                  <span><strong>Intuitive Habit Shifting:</strong> Turn cooking into a positive environmental act. Tracking and finishing food before expiration significantly lowers your household's carbon footprint.</span>
                </li>
                <li className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-amber-accent shrink-0 mt-0.5" />
                  <span><strong>Family Group Synchronization:</strong> Share a single digital family circle to instantly coordinate recipe selections, delegate prep steps, and avoid double-purchasing items.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Stat metrics */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-white/5 text-center">
            {[
              { value: "30%+", label: "Food Waste Prevented" },
              { value: "45 min", label: "Average Saved Weekly" },
              { value: "2,000+", label: "Happy Kitchens" },
              { value: "100%", label: "Real-time Pantry Sync" }
            ].map((stat, idx) => (
              <div key={idx} className="space-y-1">
                <p className="text-2xl sm:text-4xl font-serif text-amber-accent font-normal italic">{stat.value}</p>
                <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------- SECTION 3: CORE FEATURES (AND DYNAMIC CATALOG) -------------------- */}
      <section id="features" className="scroll-mt-32 max-w-7xl mx-auto px-4 space-y-12">
        <div className="space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-accent">Core Capabilities</span>
          <h2 className="font-serif text-3xl sm:text-5xl italic text-white font-normal">The 5 Pillars of Smart Meal Planning</h2>
          <p className="text-xs text-gray-400 font-light max-w-2xl">
            We focus exclusively on intuitive, server-side optimized tools that help preheat your cooking productivity without any clutter.
          </p>
        </div>

        {/* 5 Cards for 5 Core Features */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {[
            {
              title: "AI Recipe Generator",
              desc: "Enter whatever items are left in your fridge. We calculate matching instructions and meal times instantly.",
              icon: Sparkles,
              badge: "AI Genius",
              href: "/generate"
            },
            {
              title: "Gourmet Vault",
              desc: "Securely upload and store PDF cookbooks, XLSX sheets, and custom recipe files without size limits.",
              icon: BookOpen,
              badge: "Cloud Secure",
              href: "/files"
            },
            {
              title: "Simple Meal Planner",
              desc: "Coordinate breakfast, lunch, and dinner week-by-week. Sync assignments across the household.",
              icon: Calendar,
              badge: "Optimized",
              href: "/planner"
            },
            {
              title: "Pantry Tracker",
              desc: "An intelligent inventory tracker. Keep an eye on expiration dates to save money on grocery lists.",
              icon: ShoppingBag,
              badge: "Responsive",
              href: "/pantry"
            },
            {
              title: "Family Circles",
              desc: "Create shared roommate pods. Instantly allocate tasks, sync cooking schedules, and edit lists.",
              icon: ClipboardList,
              badge: "Real-time",
              href: "/shared-todos"
            }
          ].map((feat, index) => (
            <div
              key={feat.title}
              onClick={() => navigate(feat.href)}
              className="p-6 rounded-2xl border border-white/5 bg-coal/40 hover:bg-onyx flex flex-col justify-between hover:border-white/15 cursor-pointer group transition-all duration-300"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-10 h-10 bg-white/[0.02] border border-white/5 rounded-lg flex items-center justify-center group-hover:border-amber-accent/20 transition-all">
                    <feat.icon className="w-4 h-4 text-amber-accent" />
                  </div>
                  <span className="text-[8px] font-bold uppercase tracking-widest text-white/30 bg-white/5 px-1.5 py-0.5 rounded">
                    {feat.badge}
                  </span>
                </div>
                <div className="space-y-1">
                  <h3 className="font-serif text-lg font-normal text-white group-hover:text-amber-accent transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-gray-400 font-light text-[11px] leading-relaxed line-clamp-4">
                    {feat.desc}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/[0.02] flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-white/40 group-hover:text-amber-accent transition-all mt-4">
                <span>Configure Tool</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          ))}
        </div>

        {/* Dynamic Catalog: Real-time Recipes for Crawler Indexability */}
        <div className="pt-8 border-t border-white/5 space-y-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <timeContext.icon className="w-5 h-5 text-amber-accent animate-pulse" />
                <h3 className="font-serif text-2xl sm:text-3xl text-white italic font-normal">{timeContext.theme}</h3>
              </div>
              <p className="text-gray-400 font-light text-xs">Dynamic, crawlers-friendly meals loaded directly from our public recipes directory.</p>
            </div>
            <Link 
              to="/discover" 
              className="px-5 py-2.5 rounded-lg border border-white/10 text-white/70 text-[10px] font-bold uppercase tracking-widest hover:text-amber-accent hover:border-amber-accent/30 transition-all cursor-pointer"
            >
              Browse Global Catalog
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <RecipeCardSkeleton key={i} />
              ))
            ) : (
              featuredRecipes.map((recipe, idx) => (
                <RecipeCard key={recipe.id} recipe={recipe} index={idx} />
              ))
            )}
          </div>
        </div>
      </section>

      {/* -------------------- SECTION: PRO KITCHEN HACKS (ADDITIONAL USER VALUE CONTENT) -------------------- */}
      <section className="scroll-mt-32 max-w-7xl mx-auto px-4 space-y-12">
        <div className="space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-accent">Culinary Resourcefulness</span>
          <h2 className="font-serif text-3xl sm:text-5xl italic text-white font-normal">Pro Kitchen Hacks for Food Preservation</h2>
          <p className="text-xs text-gray-400 font-light max-w-2xl">
            Maximize the lifespan of your fresh ingredients with simple, certified techniques used by professional zero-waste kitchens.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              title: "The Crisper Drawer Secret",
              subtitle: "Optimize Humidity",
              desc: "Store root crops and thick-skin veggies under low humidity, while leafy greens and fresh herbs thrive in high humidity. Wrapping greens in damp reusable cloths can extend freshness by up to 10 days.",
              icon: BookOpen,
              tip: "Wrap celery tightly in foil before chilling to keep it crisp."
            },
            {
              title: "FIFO Organization Strategy",
              subtitle: "First In, First Out",
              desc: "Arrange your refrigerator shelves with a strict FIFO pattern. Position older jars and fresh items towards the front, and push fresh grocery store items to the back to naturally prevent spoilage.",
              icon: Utensils,
              tip: "Use our Pantry Tracker to receive automatic expiration alerts."
            },
            {
              title: "Creative Preservation Rituals",
              subtitle: "Save Limp Produce",
              desc: "Don't discard limp celery, carrots, or wilted spinach. Toss them into a ziploc bag in your freezer to boil into rich homemade vegetable broth later. Transform overripe bananas into banana bread or freeze them for delicious smoothies.",
              icon: Flame,
              tip: "Freeze fresh herbs in ice trays filled with olive oil for instant pan-ready cubes."
            }
          ].map((hack, index) => (
            <div
              key={index}
              className="p-8 rounded-[24px] border border-white/5 bg-coal/40 hover:bg-onyx flex flex-col justify-between hover:border-white/15 transition-all duration-300 relative group"
            >
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center group-hover:border-amber-accent/20 transition-all">
                    <hack.icon className="w-5 h-5 text-amber-accent" />
                  </div>
                  <span className="text-[9px] font-bold uppercase tracking-widest text-white/30 bg-white/5 px-2 py-0.5 rounded">
                    {hack.subtitle}
                  </span>
                </div>
                <div className="space-y-2">
                  <h3 className="font-serif text-xl font-normal text-white group-hover:text-amber-accent transition-colors">
                    {hack.title}
                  </h3>
                  <p className="text-gray-400 font-light text-xs leading-relaxed">
                    {hack.desc}
                  </p>
                </div>
              </div>
              <div className="pt-4 border-t border-white/[0.03] mt-6 flex flex-col gap-1">
                <span className="text-[8px] uppercase tracking-wider font-extrabold text-amber-accent">Pro Tip:</span>
                <span className="text-[11px] italic text-white/70 font-light leading-snug">
                  "{hack.tip}"
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* -------------------- SECTION: TRENDING CULINARY HUB (SEO KEYWORD TARGETED CONTENT) -------------------- */}
      <section className="scroll-mt-32 max-w-7xl mx-auto px-4 space-y-8">
        <div className="space-y-3">
          <span className="text-[10px] font-black uppercase tracking-widest text-amber-accent">Smart Meal Discovery</span>
          <h2 className="font-serif text-3xl sm:text-5xl italic text-white font-normal">Trending Food Recipes Hub</h2>
          <p className="text-xs text-gray-400 font-light max-w-2xl leading-relaxed">
            Welcome to the ultimate <strong className="text-white">food recipes website</strong> index. Explore clean, delicious, and <strong className="text-white">simple food recipes</strong> curated by chefs to minimize preparation times and grocery waste.
          </p>
        </div>

        {/* Tab Selector bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 pb-4">
          {C_HUB_DATA.map((tab, idx) => (
            <button
              key={idx}
              onClick={() => setActiveHubTab(idx)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all select-none cursor-pointer border",
                activeHubTab === idx
                  ? "bg-amber-accent/10 border-amber-accent/30 text-amber-accent shadow-sm"
                  : "bg-white/[0.02] border-white/5 text-white/60 hover:text-white hover:bg-white/5"
              )}
            >
              {tab.tabLabel}
            </button>
          ))}
        </div>

        {/* Selected Hub Tab Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Description Column */}
          <div className="lg:col-span-1 bg-coal/30 border border-white/5 rounded-[24px] p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <span className="text-[10px] uppercase font-bold text-amber-accent tracking-wider font-mono">
                Featured: {C_HUB_DATA[activeHubTab].title}
              </span>
              <h3 className="font-serif text-2xl sm:text-3xl text-white font-normal italic">
                {C_HUB_DATA[activeHubTab].subtitle}
              </h3>
              <p className="text-xs text-gray-400 font-light leading-relaxed">
                {C_HUB_DATA[activeHubTab].description}
              </p>
            </div>
            
            <div className="pt-6 border-t border-white/[0.03] space-y-3 text-[11px] font-light text-white/50">
              <p className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-accent shrink-0" />
                <span>Available fully in our <strong>food recipes app</strong></span>
              </p>
              <p className="flex items-center gap-2">
                <Utensils className="w-3.5 h-3.5 text-amber-accent shrink-0" />
                <span>Search <strong className="text-white/80">food recipes with ingredients</strong> instantly</span>
              </p>
            </div>
          </div>

          {/* Recipes Grid Column */}
          <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
            {C_HUB_DATA[activeHubTab].recipes.map((item, index) => (
              <div
                key={index}
                className="bg-coal/40 border border-white/5 hover:border-white/10 rounded-[20px] p-6 flex flex-col justify-between space-y-4 hover:bg-onyx transition-all duration-300 group"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-amber-accent bg-amber-accent/5 px-2 py-0.5 rounded-md">
                      {item.tag}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-white/40 font-mono">
                      <Clock className="w-3 h-3" />
                      {item.time}
                    </span>
                  </div>
                  <h4 className="font-serif text-lg text-white font-medium group-hover:text-amber-accent transition-colors">
                    {item.title}
                  </h4>
                  <p className="text-xs text-gray-400 font-light leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                <div className="pt-3 border-t border-white/[0.03] space-y-1">
                  <span className="text-[9px] font-bold uppercase text-white/30 tracking-wider">Pantry Staples Needed:</span>
                  <p className="text-[11px] italic text-white/80 font-light truncate">
                    {item.ingredients}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Culinary Directory & Companion Guide with naturally woven keywords */}
        <div className="pt-8 border-t border-white/5 space-y-6">
          <div className="space-y-1">
            <span className="text-[9px] uppercase font-bold text-amber-accent tracking-[0.2em] block">Culinary Reference</span>
            <h3 className="font-serif text-2xl text-white italic font-normal">
              Kitchen Companion & Recipe Directory Guide
            </h3>
            <p className="text-[11px] text-gray-500 font-light leading-relaxed max-w-2xl">
              An intuitive reference map for modern home chefs. Explore how to pair available pantry staples, coordinate cooking timers, and craft balanced menus effortlessly.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-gray-400 font-light leading-relaxed">
            <div className="space-y-4 bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
              <h4 className="text-white font-serif text-lg italic border-b border-white/5 pb-2">
                Daily Starters & Lunch Solutions
              </h4>
              <p>
                Our comprehensive <span className="text-white/80 font-medium">food recipes website</span> provides a fully-curated <span className="text-white/80 font-medium">food recipes list</span> for every scenario. Whether you are looking for creative and <span className="text-white/80 font-medium">simple food recipes</span>, highly customizable <span className="text-white/80 font-medium">food recipes with ingredients</span>, or exotic <span className="text-white/80 font-medium">food recipes Indian</span> style, our high-fidelity <span className="text-white/80 font-medium">food recipes app</span> has you covered.
              </p>
              <p>
                Kickstart your morning routine with nutritious <span className="text-white/80 font-medium">food recipes breakfast</span> options, or assemble a rapid <span className="text-white/80 font-medium">5-minute recipes for lunch</span> that fits active work schedules. We also bridge the gap with social media trends: enjoy verified instructions for <span className="text-white/80 font-medium">simple food recipes instagram</span> creators discuss daily, now converted into detailed, easy-to-follow instructions in our <span className="text-white/80 font-medium">simple food recipes website</span> database.
              </p>
            </div>

            <div className="space-y-4 bg-white/[0.01] border border-white/5 p-6 rounded-2xl">
              <h4 className="text-white font-serif text-lg italic border-b border-white/5 pb-2">
                Dinner Planning & Date Nights
              </h4>
              <p>
                When the day winds down, look through our collection of <span className="text-white/80 font-medium">simple food recipes for dinner</span> or explore the popular <span className="text-white/80 font-medium">lazy dinner ideas</span> page. For romantic occasions, we offer tailored <span className="text-white/80 font-medium">quick dinner ideas for 2</span> and <span className="text-white/80 font-medium">simple food recipes for dinner for two</span> that take the complexity out of date nights.
              </p>
              <p>
                Feed the entire household with comforting <span className="text-white/80 font-medium">simple food recipes for dinner for family</span>, or maintain your wellness goals with our calorie-conscious <span className="text-white/80 font-medium">simple food recipes for dinner healthy</span> options. If you crave warm, exotic spices, we feature an array of <span className="text-white/80 font-medium">quick dinner recipes Indian</span> delicacies and <span className="text-white/80 font-medium">simple Indian vegetarian recipes for dinner</span>, utilizing native herbs and detailed guides written as <span className="text-white/80 font-medium">food recipes in English</span> for international clarity.
              </p>
            </div>

            <div className="space-y-4 bg-white/[0.01] border border-white/5 p-6 rounded-2xl lg:col-span-1 md:col-span-2">
              <h4 className="text-white font-serif text-lg italic border-b border-white/5 pb-2">
                Express Cooking & Budget Wellness
              </h4>
              <p>
                For students or busy professionals, we share affordable <span className="text-white/80 font-medium">simple food recipes for students</span> and light <span className="text-white/80 font-medium">simple food recipes snacks</span>. Learn how to prepare an <span className="text-white/80 font-medium">easy food to make in 5 minutes</span> or configure an <span className="text-white/80 font-medium">easy food to make in 5 minutes with few ingredients</span> when you are short on time.
              </p>
              <p>
                Eat clean on a budget with <span className="text-white/80 font-medium">easy food to make in 5 minutes healthy</span> meals, including <span className="text-white/80 font-medium">easy food to make in 5 minutes healthy no cook</span> options, <span className="text-white/80 font-medium">easy food to make in 5 minutes healthy on a budget</span>, and <span className="text-white/80 font-medium">easy food to make in 5 minutes healthy for weight loss</span>. Satisfy your household with an <span className="text-white/80 font-medium">easy food to make in 5 minutes for family</span> or a quick <span className="text-white/80 font-medium">easy food to make in 5 minutes for kids</span>.
              </p>
              <p>
                For sweet cravings, try a <span className="text-white/80 font-medium">5 minute recipes dessert</span>, a rapid <span className="text-white/80 font-medium">5 minute recipes for snacks</span>, or a fast <span className="text-white/80 font-medium">5 minute recipes for dinner</span>. Our systems also suggest <span className="text-white/80 font-medium">quick, easy healthy meals on a budget</span>, an <span className="text-white/80 font-medium">easy snacks to make in 5 minutes Indian</span> treat, <span className="text-white/80 font-medium">quick easy healthy meals for one</span>, and <span className="text-white/80 font-medium">quick easy healthy meals for weight loss</span>. Reduce kitchen waste with <span className="text-white/80 font-medium">simple food recipes with few ingredients</span> and <span className="text-white/80 font-medium">simple food recipes for every day</span>.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- SECTION 4: HOW IT WORKS (GUIDES & DOCUMENTATION) -------------------- */}
      <section id="how-it-works" className="scroll-mt-32 max-w-7xl mx-auto px-4 py-8">
        <div className="bg-coal/40 border border-white/5 rounded-[32px] p-8 md:p-16 space-y-12">
          <div className="space-y-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-amber-accent">Step-by-step documentation</span>
            <h2 className="font-serif text-3xl sm:text-5xl text-white font-normal">
              How to Cook Efficiently with <span className="italic text-amber-accent">Zero Waste</span>
            </h2>
            <p className="text-gray-400 font-light text-sm max-w-2xl leading-relaxed">
              We have designed a continuous circular process to keep your kitchen fast, affordable, and organized. Here is a detailed breakdown of how to utilize the Daily Meal Recipe ecosystem.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              {
                step: "01",
                title: "Log Your Leftovers",
                detail: "Open the smart Pantry Tracker or recipe search. Type in the fresh ingredients that are close to expiring. No need to buy exotic spices—we adapt to your current fridge content."
              },
              {
                step: "02",
                title: "Generate Custom AI Meals",
                detail: "Our deep chef intelligence reviews your available elements and formulates exact prep times, visual guides, allergy substitutions, and nutritional estimations in real-time."
              },
              {
                step: "03",
                title: "Map Your Weekly Plan",
                detail: "Slide approved recipes directly into your customized breakfast, lunch, or dinner planner calendar. Invite roommates or family members to view and execute specific cooking steps."
              },
              {
                step: "04",
                title: "Auto-Compile Shopping Lists",
                detail: "The system reads your weekly plan, cross-references your current inventory, and creates a consolidated shopping list with checkbox items. Shop smarter and save on groceries."
              }
            ].map((stepObj) => (
              <div key={stepObj.step} className="space-y-4 border-l border-white/10 pl-6 relative">
                <span className="absolute -left-[1px] top-0 w-[2px] h-8 bg-amber-accent" />
                <span className="text-3xl font-serif text-amber-accent italic font-bold">{stepObj.step}.</span>
                <h3 className="font-serif text-xl font-normal text-white">{stepObj.title}</h3>
                <p className="text-[11px] text-gray-400 font-light leading-relaxed">
                  {stepObj.detail}
                </p>
              </div>
            ))}
          </div>

          {/* Deep Informative FAQ for Search Crawler Indexability */}
          <div className="pt-8 border-t border-white/5 space-y-6">
            <h3 className="font-serif text-2xl text-white italic font-normal">Frequently Asked Questions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs text-gray-400 font-light">
              <div className="space-y-2">
                <p className="text-white font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-accent" />
                  Is Daily Meal Recipe free to use?
                </p>
                <p>Yes, any home cook can search the public database of recipes, log basic pantry inventories, and use our static resources for free. We offer premium tiers for automated AI recipe creations and unlimited file vaults.</p>
              </div>
              <div className="space-y-2">
                <p className="text-white font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-accent" />
                  How do I connect my family circle?
                </p>
                <p>Simply navigate to the Family Hub and create an invitation link. Your partner, roommates, or children can join with a simple tap and instantly share grocery check-offs and recipes.</p>
              </div>
              <div className="space-y-2">
                <p className="text-white font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-accent" />
                  Does the app support specific diets or allergies?
                </p>
                <p>Absolutely. When configuring your profile, you can save specific dietary profiles (Vegan, Gluten-Free, Keto, etc.) which will automatically guide the AI recipe generation algorithms.</p>
              </div>
              <div className="space-y-2">
                <p className="text-white font-bold flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-amber-accent" />
                  How can I export my recipes?
                </p>
                <p>Under the Gourmet Vault, you can download all personal cooking records as structured PDF files, spreadsheet documents, or backups for safe keeping.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------- SECTION 5: CONTACT US -------------------- */}
      <section id="contact" className="scroll-mt-32 max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          
          {/* Left Column: Reach us directly */}
          <div className="lg:col-span-5 bg-coal/40 border border-white/5 rounded-[32px] p-8 md:p-12 flex flex-col justify-between space-y-8">
            <div className="space-y-6">
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-accent">Get in touch</span>
              <h2 className="font-serif text-3xl sm:text-5xl text-white font-normal leading-tight">
                Let's make <br />
                <span className="italic text-amber-accent">cooking easier.</span>
              </h2>
              <p className="text-gray-400 font-light text-sm leading-relaxed">
                Have questions about our zero-waste meal planner? Encountered a bug, need to setup custom subdomains, or interested in corporate licensing for your culinary team? Send us a message and our support chefs will get right back to you.
              </p>
            </div>

            <div className="space-y-4 pt-6 border-t border-white/5">
              <div className="flex items-center gap-4 text-xs font-light text-gray-400">
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                  <Mail className="w-4 h-4 text-amber-accent" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Help Desk Support</p>
                  <a href="mailto:info@dailymealrecipe.online" className="text-white hover:text-amber-accent transition-colors underline font-medium">
                    info@dailymealrecipe.online
                  </a>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-light text-gray-400">
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                  <Phone className="w-4 h-4 text-amber-accent" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Call & WhatsApp Contact</p>
                  <div className="flex items-center gap-2">
                    <a href="tel:+254143871716" className="text-white hover:text-amber-accent transition-colors underline font-medium">
                      +254 143 871 716
                    </a>
                    <span className="text-white/20">•</span>
                    <a href="https://wa.me/254143871716" target="_blank" rel="noopener noreferrer" className="text-white hover:text-amber-accent transition-colors underline font-medium">
                      WhatsApp Chat
                    </a>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-light text-gray-400">
                <div className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center shrink-0 border border-white/10">
                  <ShieldCheck className="w-4 h-4 text-amber-accent" />
                </div>
                <div>
                  <p className="text-[10px] uppercase font-bold text-white/40 tracking-wider">Privacy & Security</p>
                  <p className="text-white font-medium">SSL secured endpoint & compliant safety standards</p>
                </div>
              </div>
            </div>

            <p className="text-[10px] uppercase tracking-widest font-bold text-white/30 pt-4">
              © {new Date().getFullYear()} Daily Meal Recipe. All rights reserved.
            </p>
          </div>

          {/* Right Column: Interactive glassmorphic form */}
          <div className="lg:col-span-7 bg-coal/40 border border-white/5 rounded-[32px] p-8 md:p-12 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-80 h-80 bg-rose-500/[0.03] blur-[120px] rounded-full pointer-events-none" />
            
            <AnimatePresence mode="wait">
              {contactSuccess ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col items-center justify-center text-center p-6 space-y-6"
                >
                  <div className="w-16 h-16 rounded-full bg-amber-accent/10 border border-amber-accent/30 flex items-center justify-center animate-bounce">
                    <CheckCircle className="w-8 h-8 text-amber-accent" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="font-serif text-2xl text-white font-normal">Message Sent Successfully!</h3>
                    <p className="text-xs text-gray-400 max-w-sm leading-relaxed">
                      Thank you for contacting Daily Meal Recipe. Your message has been safely recorded in our secure kitchen system. One of our support representatives will respond to your email shortly.
                    </p>
                  </div>
                  <button
                    onClick={() => setContactSuccess(false)}
                    className="px-6 py-2 border border-white/10 text-white/80 hover:text-white hover:border-white/20 rounded-xl text-xs font-bold uppercase tracking-widest transition-all cursor-pointer"
                  >
                    Send Another Message
                  </button>
                </motion.div>
              ) : (
                <motion.form
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleContactSubmit}
                  className="space-y-6"
                >
                  <div className="space-y-1">
                    <h3 className="font-serif text-2xl text-white font-normal">Send a Direct Message</h3>
                    <p className="text-[11px] text-gray-400 font-light">We read and respond to every inquiry we receive.</p>
                  </div>

                  {contactError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-200 rounded-xl text-xs font-medium">
                      ⚠️ {contactError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest block">
                        Your Full Name <span className="text-amber-accent">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-onyx border border-white/5 focus:border-amber-accent/30 rounded-xl px-4 py-3 text-xs text-white placeholder-white/20 outline-none transition-all"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest block">
                        Email Address <span className="text-amber-accent">*</span>
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="john@example.com"
                        className="w-full bg-onyx border border-white/5 focus:border-amber-accent/30 rounded-xl px-4 py-3 text-xs text-white placeholder-white/20 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest block">
                      Subject
                    </label>
                    <input
                      type="text"
                      value={contactSubject}
                      onChange={(e) => setContactSubject(e.target.value)}
                      placeholder="e.g. Account setup, pricing, feature request"
                      className="w-full bg-onyx border border-white/5 focus:border-amber-accent/30 rounded-xl px-4 py-3 text-xs text-white placeholder-white/20 outline-none transition-all"
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] uppercase font-bold text-white/50 tracking-widest block">
                      Message <span className="text-amber-accent">*</span>
                    </label>
                    <textarea
                      required
                      rows={5}
                      value={contactMessage}
                      onChange={(e) => setContactMessage(e.target.value)}
                      placeholder="Type your message details here..."
                      className="w-full bg-onyx border border-white/5 focus:border-amber-accent/30 rounded-xl px-4 py-3 text-xs text-white placeholder-white/20 outline-none transition-all resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={contactSubmitting}
                    className="w-full py-4 bg-amber-accent hover:bg-white text-black rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 select-none disabled:opacity-50 cursor-pointer"
                  >
                    {contactSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Delivering Message...
                      </>
                    ) : (
                      <>
                        <Send className="w-3.5 h-3.5" />
                        Submit Secure Message
                      </>
                    )}
                  </button>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </div>
      </section>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title={authModalTitle}
        message={authModalMessage}
      />
    </div>
  );
}
