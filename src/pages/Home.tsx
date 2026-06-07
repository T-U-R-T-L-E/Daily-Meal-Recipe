import { motion, AnimatePresence } from 'motion/react';
import { Link, useNavigate } from 'react-router-dom';
import { ChefHat, Sparkles, Utensils, ArrowRight, Clock, Sun, Moon, Coffee, Heart, Star, Calendar, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../lib/useAuth';
import { signIn, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { cn } from '../lib/utils';
import { collection, query, limit, getDocs, where } from 'firebase/firestore';
import { useEffect, useState, useMemo } from 'react';
import { Recipe } from '../types';
import RecipeCard from '../components/recipes/RecipeCard';
import { RecipeCardSkeleton, Shimmer } from '../components/recipes/RecipeSkeleton';

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [featuredRecipes, setFeaturedRecipes] = useState<Recipe[]>([]);
  const [recipeOfTheDay, setRecipeOfTheDay] = useState<Recipe | null>(null);
  const [loading, setLoading] = useState(true);

  // Time context logic
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
        
        // 1. Get Recipe of the Day
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
        handleFirestoreError(error, OperationType.LIST, 'recipes');
        setLoading(false);
      }
    }

    loadDynamicContent();
  }, [timeContext]);

  const handleFeatureClick = (href: string, requiresAuth: boolean) => {
    if (requiresAuth && !user) {
      signIn();
    } else {
      navigate(href);
    }
  };

  return (
    <div className="space-y-12 sm:space-y-24 md:space-y-36 py-4 sm:py-12 md:py-20 pb-4 md:pb-6 selection:bg-amber-accent/20 selection:text-amber-accent">
      {/* Premium Hero Section */}
      <section className="text-center space-y-6 sm:space-y-8 max-w-4xl mx-auto px-1 sm:px-6">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 border border-white/10 bg-white/[0.02] text-white/80 rounded-full text-[10px] font-bold uppercase tracking-widest leading-none">
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
          A straightforward kitchen companion. Type standard ingredients you already have, generate step-by-step recipes, and organize your weekly meals without food waste.
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
              onClick={signIn}
              className="w-full sm:w-auto px-8 py-4 bg-amber-accent text-black hover:bg-white rounded-2xl font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-3 border border-transparent shadow-lg shadow-amber-accent/10 cursor-pointer"
            >
              Get Started Free
              <Sparkles className="w-3.5 h-3.5" />
            </button>
          )}
          <Link
            to="/discover"
            className="w-full sm:w-auto px-8 py-4 border border-white/10 text-white rounded-2xl font-bold text-xs uppercase tracking-wider hover:bg-white/5 hover:border-white/20 transition-all text-center. cursor-pointer"
          >
            Browse Public Catalog
          </Link>
        </motion.div>

        {/* Real-time trust metrics */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="flex flex-wrap items-center justify-center gap-y-2 gap-x-6 pt-6 text-[10px] uppercase font-bold text-white/30 tracking-widest"
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-accent/60" />
            <span>Zero-waste meal planner</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-amber-accent/60" />
            <span>Fast client-side cache load</span>
          </div>
        </motion.div>
      </section>

      {/* Main Core Features Section */}
      <section className="max-w-7xl xxl:max-w-[1400px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] mx-auto px-1 sm:px-6">
        <div className="border border-white/5 bg-coal/50 rounded-[24px] sm:rounded-[40px] p-4 sm:p-10 md:p-16 space-y-8 sm:space-y-12">
          <div className="max-w-2xl space-y-2 px-1 sm:px-0">
            <span className="text-[10px] font-bold uppercase tracking-widest text-amber-accent">Core Capabilities</span>
            <h2 className="font-serif text-3xl sm:text-4xl italic text-white font-normal">Everything you need to run your kitchen efficiently.</h2>
            <p className="text-xs text-gray-400 font-light leading-relaxed">
              We focus purely on tools that help you prepare meals without complex planning or unnecessary grocery spending.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 3xl:gap-8 5xl:gap-12">
            {[
              {
                title: "Recipe Generator",
                desc: "Type or select the items in your fridge. We calculate matching instructions and cooking times instantly.",
                icon: Sparkles,
                href: "/generate",
                requiresAuth: true,
                badge: "AI Powered"
              },
              {
                title: "Camera & Label Scanner",
                desc: "Scan package barcodes or use the camera to match produce with suitable culinary ideas.",
                icon: ChefHat,
                href: "/scanner",
                requiresAuth: true,
                badge: "Mobile Ready"
              },
              {
                title: "Simple Meal Planner",
                desc: "Organize meals week-by-week and convert those dates into a clean, unified grocery list.",
                icon: Utensils,
                href: "/planner",
                requiresAuth: true,
                badge: "Fully Integrated"
              }
            ].map((feature) => (
              <div
                key={feature.title}
                onClick={() => handleFeatureClick(feature.href, feature.requiresAuth)}
                className="p-5 sm:p-8 rounded-[24px] sm:rounded-[30px] border border-white/5 bg-onyx flex flex-col justify-between hover:border-white/15 cursor-pointer group transition-all"
              >
                <div className="space-y-6">
                  <div className="flex justify-between items-start">
                    <div className="w-12 h-12 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-center group-hover:border-amber-accent/20 transition-all">
                      <feature.icon className="w-5 h-5 text-amber-accent" />
                    </div>
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/30 bg-white/5 px-2 py-0.5 rounded">
                      {feature.badge}
                    </span>
                  </div>

                  <div className="space-y-2">
                    <h3 className="font-serif text-2xl font-normal text-white group-hover:text-amber-accent transition-colors">
                      {feature.title}
                    </h3>
                    <p className="text-gray-400 font-light text-xs leading-relaxed">
                      {feature.desc}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-white/[0.02] flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-white/40 group-hover:text-amber-accent transition-all mt-6">
                  <span>Open Tool</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Curated Feed Section */}
      <section className="max-w-7xl xxl:max-w-[1400px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] mx-auto px-1 sm:px-6 space-y-10 sm:space-y-16">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-10 items-stretch">
          
          {/* Main Column: Handpicked Suggestion */}
          <div className="lg:col-span-2 flex flex-col justify-between">
            <div className="flex justify-between items-end mb-4 sm:mb-6 px-1 sm:px-0">
              <div className="space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-accent">Daily Selection</span>
                <h2 className="font-serif text-3xl sm:text-4xl text-white italic font-normal">Curated Today</h2>
              </div>
              <div className="text-[9px] font-mono text-white/30 uppercase tracking-widest flex items-center gap-2 pb-1">
                <Calendar className="w-3.5 h-3.5" />
                <span>{new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>

            {recipeOfTheDay ? (
              <div 
                onClick={() => navigate(`/recipe/${recipeOfTheDay.id}`)}
                className="group relative h-[320px] sm:h-[400px] md:h-[500px] rounded-[24px] sm:rounded-[36px] overflow-hidden border border-white/5 cursor-pointer shadow-xl flex-grow"
              >
                {/* Clean image placeholder frame - removes gradient, focuses layout transparency */}
                <img 
                  src={recipeOfTheDay.imageUrl || "https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&q=80&w=1000"} 
                  alt={recipeOfTheDay.name}
                  className="absolute inset-0 w-full h-full object-cover md:grayscale md:group-hover:grayscale-0 transition-all duration-700 group-hover:scale-102"
                  referrerPolicy="no-referrer"
                  loading="eager"
                  onError={(e) => {
                     e.currentTarget.onerror = null;
                     e.currentTarget.src = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&q=80&w=1000";
                  }}
                />
                {/* Solid overlay mask instead of complex neon-blue gradient */}
                <div className="absolute inset-0 bg-black/50" />
                
                <div className="absolute top-4 sm:top-6 left-4 sm:left-6 flex gap-2">
                  <div className="px-3 sm:px-4 py-1 sm:py-1.5 bg-amber-accent text-black rounded-full text-[9px] font-bold uppercase tracking-widest leading-none">
                    Recipe of the Day
                  </div>
                  <div className="px-3 sm:px-4 py-1 sm:py-1.5 bg-black/40 text-white rounded-full text-[9px] font-bold uppercase tracking-widest border border-white/10 leading-none">
                    Verified Healthy
                  </div>
                </div>

                <div className="absolute bottom-4 sm:bottom-10 left-4 sm:left-10 right-4 sm:right-10 space-y-2 sm:space-y-3">
                  <div className="flex items-center gap-3 text-amber-accent/90">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{recipeOfTheDay.cuisine}</span>
                    <div className="w-1 h-1 rounded-full bg-white/30" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-widest">{recipeOfTheDay.difficulty}</span>
                  </div>
                  <h3 className="font-serif text-2xl sm:text-4xl text-white italic leading-tight group-hover:translate-x-1 transition-transform duration-300">
                    {recipeOfTheDay.name}
                  </h3>
                  <p className="text-gray-300 font-light text-xs max-w-lg line-clamp-2">
                    {recipeOfTheDay.description}
                  </p>
                </div>
              </div>
            ) : (
              <div className="h-[320px] sm:h-[400px] md:h-[500px] rounded-[24px] sm:rounded-[36px] bg-white/[0.01] border border-white/5 p-8 sm:p-12 relative flex flex-col justify-end overflow-hidden flex-grow animate-pulse shadow-lg">
                <Shimmer className="absolute inset-0 w-full h-full" />
                <div className="space-y-4 max-w-sm relative z-10">
                  <Shimmer className="h-5 w-24 rounded-full" />
                  <Shimmer className="h-10 w-4/5" />
                  <Shimmer className="h-4 w-full" />
                </div>
              </div>
            )}
          </div>

          {/* Right Column: Fresh Additions Feed */}
          <div className="flex flex-col justify-between mt-6 lg:mt-0">
            <div className="mb-4 sm:mb-6 space-y-1 px-1 sm:px-0">
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-accent">Fresh & Popular Ideas</span>
              <h3 className="font-serif text-3xl text-white italic font-normal">Sought-after Meals</h3>
            </div>

            <div className="space-y-3 flex-grow flex flex-col justify-between">
              {[
                { title: "Rhubarb & Ginger Galette", time: "45 min", tag: "Spring Dessert" },
                { title: "Asparagus Cream Risotto", time: "30 min", tag: "Light Lunch" },
                { title: "Wild Garlic & Potato Gnocchi", time: "25 min", tag: "Handmade" },
                { title: "Garlic Butter Salmon", time: "20 min", tag: "Popular Favorite" },
                { title: "Truffle Mushroom Fettuccine", time: "15 min", tag: "Trending Diner" },
                { title: "Spicy Tikka Masala", time: "35 min", tag: "Highly Rated" }
              ].map((item, i) => (
                <div 
                  key={i}
                  onClick={() => {
                    sessionStorage.setItem('temp_search_query', item.title);
                    navigate('/discover');
                  }}
                  className="p-3.5 sm:p-4 md:p-5 bg-coal border border-white/5 hover:border-white/15 rounded-[20px] sm:rounded-3xl cursor-pointer flex items-center justify-between group transition-all"
                >
                  <div className="space-y-1">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-amber-accent/80">{item.tag}</span>
                    <h4 className="font-serif text-base text-white font-normal group-hover:text-amber-accent transition-colors">{item.title}</h4>
                  </div>
                  <div className="flex items-center gap-2 text-white/30 group-hover:text-white transition-colors text-[10px] font-bold tracking-widest">
                    <span>{item.time}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              ))}

              {/* Informative Callout */}
              <div className="p-5 sm:p-8 bg-coal border border-white/10 rounded-3xl space-y-3 mt-3">
                <span className="text-[9px] font-bold uppercase tracking-widest text-amber-accent">Kitchen Advice</span>
                <h4 className="font-serif text-xl text-white font-normal italic">Simple ingredients go a long way.</h4>
                <p className="text-[11px] text-gray-400 font-light leading-relaxed">
                  Avoid excessive grocery costs. Our seasonal lists pair ingredients to help you finish fresh vegetables before they turn.
                </p>
                <Link to="/discover" className="text-[9px] font-bold uppercase tracking-widest text-amber-accent flex items-center gap-1.5 hover:text-white transition-colors pt-2">
                  Browse Full Collection <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </div>

        </div>

        {/* Dynamic Contextual Recommendations Row */}
        <div className="space-y-8 pt-8 sm:pt-10 border-t border-white/5 px-1 sm:px-0">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 sm:gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <timeContext.icon className="w-5 h-5 text-amber-accent" />
                <h3 className="font-serif text-2xl sm:text-3xl text-white italic font-normal">{timeContext.theme}</h3>
              </div>
              <p className="text-gray-400 font-light text-xs">Based on ingredients and meals standard for {timeContext.label.toLowerCase()}-hour preparation.</p>
            </div>
            <Link 
              to="/discover" 
              className="w-full md:w-auto text-center px-6 py-3 rounded-xl border border-white/10 text-white/70 text-[10px] font-bold uppercase tracking-widest hover:text-white hover:border-white/20 transition-all cursor-pointer"
            >
              Explore All {timeContext.label} Selection
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 3xl:grid-cols-6 4xl:grid-cols-8 gap-4 sm:gap-6 3xl:gap-8">
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

      {/* Down-to-Earth Trust & Pragmatic Testimonial Section */}
      <section className="bg-coal border border-white/5 p-5 sm:p-10 md:p-20 rounded-[24px] sm:rounded-[40px] flex flex-col lg:flex-row items-center justify-between gap-8 md:gap-12 max-w-7xl xxl:max-w-[1400px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] mx-1 sm:mx-6 lg:mx-auto relative">
        <div className="space-y-8 max-w-xl z-10 w-full">
          <span className="text-[10px] font-bold uppercase tracking-widest text-amber-accent">Real Experiences</span>
          <h2 className="font-serif text-4xl md:text-5xl font-normal leading-tight text-white">
            Practical cooking <br />
            <span className="italic text-amber-accent">for busy weeks.</span>
          </h2>
          <p className="text-gray-400 font-light text-base leading-relaxed">
            "We used to throw away stale produce nearly every Friday. Daily Meal Recipe changed that immediately. I type in whatever vegetables we have left on Thursday, and cook a reliable family dinner in less than forty minutes."
          </p>
          
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-full border border-white/10 bg-onyx overflow-hidden shrink-0">
              <img 
                src="https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&q=80" 
                alt="Sarah" 
                className="w-full h-full object-cover md:grayscale" 
                loading="lazy"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.onerror = null;
                  e.currentTarget.src = "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=120&q=80";
                }}
              />
            </div>
            <div>
              <p className="text-xs font-bold text-white uppercase tracking-wider">Sarah J.</p>
              <p className="text-[10px] text-gray-500 uppercase">Home Cook & Planner Enthusiast</p>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap gap-4 items-center">
            <button 
              onClick={() => user ? navigate('/discover') : signIn()} 
              className="px-8 py-4 bg-white hover:bg-amber-accent text-black rounded-xl font-bold text-xs uppercase tracking-widest transition-colors cursor-pointer"
            >
              {user ? 'Browse Database' : 'Start Cooking For Free'}
            </button>
            <span className="text-[10px] text-white/30 uppercase font-bold tracking-widest">
              Join index of over 2,000 active kitchens
            </span>
          </div>
        </div>

        <div className="w-full lg:w-1/2 relative bg-onyx/50 rounded-3xl overflow-hidden border border-white/5 p-2">
          <img 
            src="https://images.unsplash.com/photo-1544025162-d76694265947?ixlib=rb-1.2.1&auto=format&fit=crop&w=1000&q=80" 
            className="w-full aspect-[4/3] object-cover rounded-2xl border border-white/10 md:grayscale md:hover:grayscale-0 transition-all duration-700"
            alt="Authentic kitchen counter cooking selection"
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={(e) => {
              e.currentTarget.onerror = null;
              e.currentTarget.src = "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1000&q=80";
            }}
          />
        </div>
      </section>

      {/* Brand Footer with Support / Enquiry details */}
      <footer className="w-full py-12 border-t border-white/5 text-center px-1 sm:px-6 mt-16 pb-6 md:pb-6">
        <div className="max-w-7xl xxl:max-w-[1400px] 3xl:max-w-[1800px] 4xl:max-w-[2400px] 5xl:max-w-[3200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/30">
            &copy; {new Date().getFullYear()} <span className="text-white/60">dailymealrecipe.online</span>. All Rights Reserved.
          </p>
          <div className="flex items-center gap-2">
            <span className="text-[9px] uppercase tracking-widest font-bold text-white/20">Support & Enquiries:</span>
            <a 
              href="mailto:info@dailymealrecipe.online" 
              className="text-[10px] font-bold tracking-wider text-amber-accent/80 hover:text-amber-accent transition-colors underline decoration-dotted"
            >
              info@dailymealrecipe.online
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

