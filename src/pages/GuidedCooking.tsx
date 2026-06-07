import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, getDoc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Recipe, Achievement } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { ChevronLeft, ChevronRight, Play, Pause, RotateCcw, X, Mic, Volume2, Utensils, ChefHat, Video, Sparkles, Share2, Award } from 'lucide-react';
import { cn } from '../lib/utils';
import ShareSheet from '../components/ui/ShareSheet';
import { useAuth } from '../lib/useAuth';
import AccessDenied from '../components/auth/AccessDenied';

export default function GuidedCooking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const currentStepRef = useRef(0);
  
  useEffect(() => {
    currentStepRef.current = currentStep;
  }, [currentStep]);
  const [timer, setTimer] = useState<number | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isFinished, setIsFinished] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [rewardPoints, setRewardPoints] = useState(0);

  const handleFinish = async () => {
    setIsFinished(true);
    if (!user || !profile || !recipe) return;

    const pointsToAward = 50;
    setRewardPoints(pointsToAward);

    try {
      const userRef = doc(db, 'users', user.uid);
      
      // Update basic stats
      const updates: any = {
        points: increment(pointsToAward),
        cookedCount: increment(1),
        lastCookedDate: new Date().toISOString()
      };

      // Progress challenges
      const updatedChallenges = (profile.activeChallenges || []).map(ch => {
        if (ch.progress < ch.goal) {
          return { ...ch, progress: ch.progress + 1 };
        }
        return ch;
      });
      updates.activeChallenges = updatedChallenges;

      // Check for first-time recipe badge if not already present
      if (profile.cookedCount === 0) {
        const newAchievement: Achievement = {
          id: 'first-recipe',
          name: 'First Masterpiece',
          description: 'Completed your very first guided recipe.',
          icon: 'ChefHat',
          unlockedAt: new Date().toISOString()
        };
        updates.achievements = [...(profile.achievements || []), newAchievement];
      }

      await updateDoc(userRef, updates);
    } catch (err) {
      console.error("Failed to award points:", err);
    }
  };

  const [showIngredients, setShowIngredients] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recog = new SpeechRecognition();
      recog.continuous = true;
      recog.interimResults = false;
      recog.lang = 'en-US';

      recog.onresult = (event: any) => {
        const last = event.results.length - 1;
        const command = event.results[last][0].transcript.toLowerCase().trim();
        console.log('Voice Command:', command);
        
        if (command.includes('next') || command.includes('forward')) {
          setCurrentStep(prev => {
            const next = Math.min(recipe!.instructions.length - 1, prev + 1);
            return next;
          });
        } else if (command.includes('back') || command.includes('previous')) {
          setCurrentStep(prev => Math.max(0, prev - 1));
        } else if (command.includes('repeat') || command.includes('read') || command.includes('again')) {
          const text = getStepText(recipe!.instructions[currentStepRef.current]);
          speak(text);
        } else if (command.includes('stop') || command.includes('pause')) {
          setIsActive(false);
        } else if (command.includes('start') || command.includes('timer')) {
          if (getStepText(recipe!.instructions[currentStep]).toLowerCase().includes('min')) {
            startTimer(600);
          }
        } else if (command.includes('ingredients') || command.includes('show')) {
          setShowIngredients(true);
        } else if (command.includes('close') || command.includes('hide')) {
          setShowIngredients(false);
        }
      };

      recog.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setIsListening(false);
        }
      };

      recog.onend = () => {
        // Automatically restart if it was supposed to be listening
        if (isListening) {
          try {
            recog.start();
          } catch (e) {
            console.error('Failed to restart recognition:', e);
          }
        }
      };

      setRecognition(recog);
    }
  }, [recipe]);

  // Handle Listening State
  useEffect(() => {
    if (isListening && recognition) {
      try {
        recognition.start();
      } catch (e) {
        console.error('Recognition already started');
      }
    } else if (recognition) {
      recognition.stop();
    }
    return () => {
      if (recognition) recognition.stop();
    };
  }, [isListening, recognition]);

  // Auto-speak on step change if listening
  useEffect(() => {
    if (isListening && recipe) {
      speak(getStepText(recipe.instructions[currentStep]));
    }
  }, [currentStep, isListening, recipe]);

  useEffect(() => {
    async function loadRecipe() {
      if (!id) return;

      // Check if it's an AI recipe
      if (id.startsWith('ai-')) {
        try {
          const aiResultsRaw = sessionStorage.getItem('ai_search_results');
          const aiResults = (aiResultsRaw && aiResultsRaw !== 'undefined') ? JSON.parse(aiResultsRaw) : [];
          const found = aiResults.find((r: Recipe) => r.id === id);
          if (found) {
            setRecipe(found);
            setLoading(false);
            return;
          }

          const savedRaw = localStorage.getItem('saved_recipes');
          const saved = (savedRaw && savedRaw !== 'undefined') ? JSON.parse(savedRaw) : [];
          const savedFound = saved.find((r: Recipe) => r.id === id);
          if (savedFound) {
            setRecipe(savedFound);
            setLoading(false);
            return;
          }
        } catch (e) {
          console.error("Failed to parse cached recipes", e);
        }

        setLoading(false);
        return;
      }

      try {
        const docSnap = await getDoc(doc(db, 'recipes', id));
        if (docSnap.exists()) {
          const data = docSnap.data();
          const isAuthor = user?.uid === data.authorId;
          const isPublic = data.isPublic === true;
          const isAdmin = profile?.role === 'admin';

          if (!isPublic && !isAuthor && !isAdmin) {
            setPermissionDenied(true);
            setLoading(false);
            return;
          }

          setRecipe({ id: docSnap.id, ...data } as Recipe);
        }
      } catch (error: any) {
        const isPermissionError = error?.code === 'permission-denied' || 
          error?.message?.toLowerCase().includes('permission') || 
          error?.message?.toLowerCase().includes('insufficient');
        
        if (isPermissionError) {
          setPermissionDenied(true);
        } else {
          handleFirestoreError(error, OperationType.GET, `recipes/${id}`);
        }
      } finally {
        setLoading(false);
      }
    }
    loadRecipe();
  }, [id]);

  useEffect(() => {
    let interval: any;
    if (isActive && timer && timer > 0) {
      interval = setInterval(() => {
        setTimer(prev => (prev !== null ? prev - 1 : null));
      }, 1000);
    } else if (timer === 0) {
      setIsActive(false);
      // Play sound notification here
    }
    return () => clearInterval(interval);
  }, [isActive, timer]);

  const startTimer = (seconds: number) => {
    setTimer(seconds);
    setIsActive(true);
  };

  const speak = (text: string) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    window.speechSynthesis.speak(utterance);
  };

  const getStepText = (step: any) => {
    return typeof step === 'string' ? step : step.text;
  };

  const getStepImage = (step: any) => {
    return typeof step === 'object' ? step.imageUrl : null;
  };

  const getStepTips = (step: any) => {
    return typeof step === 'object' ? step.tips : null;
  };

  if (loading) return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col items-center justify-center space-y-6">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-accent/5 blur-[80px] rounded-full pointer-events-none" />
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
        className="relative z-10"
      >
        <div className="w-20 h-20 border border-dashed border-amber-accent/30 rounded-full flex items-center justify-center" />
        <div className="absolute inset-0 flex items-center justify-center">
          <ChefHat className="w-8 h-8 text-amber-accent" />
        </div>
      </motion.div>
      <div className="space-y-2 text-center animate-pulse relative z-10 select-none">
        <h3 className="text-white font-serif text-xl italic">Launching Guided Kitchen...</h3>
        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-amber-accent/80">Calibrating speech engine assistance</p>
      </div>
    </div>
  );
  if (permissionDenied) return <div className="fixed inset-0 bg-black z-50 overflow-y-auto flex items-center justify-center"><AccessDenied message="You do not have permission to start guided cooking for this recipe, as it is private and belongs to another user." /></div>;
  if (!recipe) return <div className="h-screen bg-black flex items-center justify-center text-white">Error: Recipe not found.</div>;

  const totalSteps = recipe.instructions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;
  const currentInstruction = recipe.instructions[currentStep];

  return (
    <div className="fixed inset-0 bg-black z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="p-8 flex items-center justify-between border-b border-white/5 bg-onyx/80 backdrop-blur-xl z-20">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="p-4 rounded-full border border-white/10 text-white hover:bg-white/5 transition-all">
            <X className="w-6 h-6" />
          </button>
          <div>
            <h2 className="text-white font-serif text-2xl italic">{recipe.name}</h2>
            <p className="text-[10px] uppercase font-bold tracking-[0.3em] text-amber-accent">Cooking Mode</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={() => setShowIngredients(!showIngredients)} className="p-4 rounded-full border border-white/10 text-white hover:border-amber-accent transition-all" title="Ingredients">
            <Utensils className="w-6 h-6" />
          </button>
          {recipe.videoUrl && (
            <button 
              onClick={() => window.open(recipe.videoUrl, '_blank')} 
              className="p-4 rounded-full border border-white/10 text-white hover:border-amber-accent hover:bg-amber-accent/10 transition-all group"
              title="Watch Guide"
            >
              <Video className="w-6 h-6 group-hover:scale-110 transition-transform" />
            </button>
          )}
          <button onClick={() => speak(getStepText(currentInstruction))} className="p-4 rounded-full border border-white/10 text-white hover:border-amber-accent transition-all" title="Text-to-Speech">
            <Volume2 className="w-6 h-6" />
          </button>
          <button 
            onClick={() => setIsListening(!isListening)} 
            className={cn(
              "p-4 rounded-full border transition-all relative group",
              isListening ? "bg-amber-accent/20 border-amber-accent text-amber-accent" : "border-white/10 text-white hover:border-amber-accent"
            )}
            title={isListening ? "Stop Hands-Free Mode" : "Start Hands-Free Mode"}
          >
            <Mic className={cn("w-6 h-6", isListening && "animate-pulse")} />
            {isListening && (
              <motion.div
                layoutId="listening-glow"
                className="absolute inset-0 rounded-full bg-amber-accent/20 blur-xl animate-pulse"
              />
            )}
          </button>
        </div>
      </div>

      {/* Ingredients Sidebar */}
      <AnimatePresence>
        {showIngredients && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            className="fixed inset-y-0 right-0 w-full md:w-96 bg-onyx z-[60] border-l border-white/10 shadow-2xl p-12 overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-12">
              <h3 className="font-serif text-3xl text-white italic">Ingredients</h3>
              <button 
                onClick={() => setShowIngredients(false)}
                className="p-3 rounded-full hover:bg-white/5 text-white/40 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-amber-accent/5 border border-amber-accent/10 rounded-2xl mb-8">
                  <Mic className="w-4 h-4 text-amber-accent" />
                  <p className="text-[10px] text-amber-accent font-bold uppercase tracking-wider">Voice Control Active</p>
                </div>
                <div className="grid grid-cols-2 gap-2 mb-8">
                  {['Next', 'Back', 'Repeat', 'Ingredients'].map(cmd => (
                    <div key={cmd} className="px-3 py-2 bg-white/5 rounded-lg border border-white/5 flex items-center justify-between">
                      <span className="text-[9px] text-white/40 uppercase font-bold">Try</span>
                      <span className="text-[10px] text-white font-mono">"{cmd}"</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-amber-accent/40 font-bold uppercase tracking-widest mb-6">Quick reference for measurements</p>
              {recipe.ingredients.map((ing, i) => (
                <div key={i} className="p-5 bg-graphite rounded-2xl border border-white/5 space-y-1">
                  <p className="text-white text-sm italic font-light">{ing.item}</p>
                  <p className="text-amber-accent text-[10px] font-bold uppercase tracking-widest">{ing.amount}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Progress Bar */}
      <div className="h-1 bg-white/5 w-full relative z-20">
        <motion.div 
          className="h-full bg-amber-accent shadow-[0_0_15px_rgba(245,158,11,0.5)]"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
        />
      </div>

      {/* Main Instruction Area */}
      <div className="flex-1 overflow-y-auto">
        <div className="min-h-full flex flex-col items-center justify-center lg:flex-row">
          {/* Step Content */}
          <div className="flex-1 flex flex-col items-center justify-center p-12 lg:p-24 space-y-16">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-xl w-full space-y-12"
            >
              <div className="flex items-center gap-6">
                <div className="font-serif text-8xl text-white/10 font-bold leading-none select-none">
                  {currentStep + 1}
                </div>
                <div className="h-px flex-grow bg-white/5" />
              </div>
              
              <p className="text-4xl md:text-5xl text-white font-serif italic leading-tight text-left">
                {getStepText(currentInstruction)}
              </p>

              {getStepTips(currentInstruction) && (
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="p-6 bg-amber-accent/5 rounded-3xl border border-amber-accent/10 flex gap-4"
                >
                  <ChefHat className="w-6 h-6 text-amber-accent shrink-0" />
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-amber-accent/40">Pro Tip for Beginners</p>
                    <p className="text-white/60 text-sm italic font-light leading-relaxed">{getStepTips(currentInstruction)}</p>
                  </div>
                </motion.div>
              )}

              {/* Dynamic Timer Control */}
              {getStepText(currentInstruction).toLowerCase().includes('min') && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center gap-6 bg-graphite p-8 rounded-[40px] border border-white/10 w-fit"
                >
                  <div className="text-8xl font-mono text-amber-accent font-light">
                    {timer !== null ? `${Math.floor(timer / 60)}:${(timer % 60).toString().padStart(2, '0')}` : '??:??'}
                  </div>
                  <div className="flex items-center gap-4">
                    {!isActive ? (
                      <button 
                        onClick={() => startTimer(600)} 
                        className="px-10 py-4 bg-white text-black rounded-full font-bold uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-amber-accent transition-all"
                      >
                        <Play className="w-4 h-4 fill-current" />
                        Start Timer
                      </button>
                    ) : (
                      <button 
                        onClick={() => setIsActive(false)}
                        className="px-10 py-4 border border-white/20 text-white rounded-full font-bold uppercase tracking-widest text-xs flex items-center gap-3 hover:bg-red-500 transition-all"
                      >
                        <Pause className="w-4 h-4 fill-current" />
                        Pause
                      </button>
                    )}
                    <button onClick={() => setTimer(null)} className="p-4 border border-white/20 text-white rounded-full hover:bg-white/5 transition-all">
                        <RotateCcw className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>

          {/* Visual Guidance */}
          <AnimatePresence mode="wait">
            <motion.div
              key={`img-${currentStep}`}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              className="w-full lg:w-1/2 aspect-square lg:aspect-auto lg:h-full relative overflow-hidden"
            >
              {getStepImage(currentInstruction) ? (
                <img 
                  src={getStepImage(currentInstruction)} 
                  alt={`Step ${currentStep + 1}`}
                  className="w-full h-full object-cover md:grayscale md:hover:grayscale-0 transition-all duration-700"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full bg-onyx flex items-center justify-center font-serif italic text-white/5 text-2xl">
                  {recipe.name}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-transparent pointer-events-none lg:block hidden" />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {/* Footer Navigation */}
      <div className="p-12 flex items-center justify-between border-t border-white/5 bg-onyx z-20">
        <button 
          onClick={() => setCurrentStep(prev => Math.max(0, prev - 1))}
          disabled={currentStep === 0}
          className="flex items-center gap-4 text-white disabled:opacity-20 hover:text-amber-accent transition-all group"
        >
          <ChevronLeft className="w-8 h-8 group-hover:-translate-x-2 transition-all" />
          <span className="text-sm font-bold uppercase tracking-[0.4em]">Previous Step</span>
        </button>

        <div className="text-white/40 text-xs font-bold uppercase tracking-widest">
           Step {currentStep + 1} <span className="mx-4 text-white/5">/</span> {totalSteps}
        </div>

        <button 
          onClick={() => currentStep === totalSteps - 1 ? handleFinish() : setCurrentStep(prev => prev + 1)}
          className="flex items-center gap-4 text-white hover:text-amber-accent transition-all group"
        >
          <span className="text-sm font-bold uppercase tracking-[0.4em]">
            {currentStep === totalSteps - 1 ? 'Finished' : 'Next Step'}
          </span>
          <ChevronRight className="w-8 h-8 group-hover:translate-x-2 transition-all" />
        </button>
      </div>

      {/* Completion Screen Overlay */}
      <AnimatePresence>
        {isFinished && (
          <motion.div
            initial={{ opacity: 0, scale: 1.1 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.1 }}
            className="fixed inset-0 z-[100] bg-black flex items-center justify-center p-8 text-center"
          >
            <div className="max-w-xl w-full space-y-12">
              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="flex flex-col items-center gap-8"
              >
                <div className="relative">
                  <div className="w-24 h-24 bg-amber-accent rounded-full flex items-center justify-center shadow-[0_0_50px_rgba(245,158,11,0.3)]">
                    <Sparkles className="w-12 h-12 text-black" />
                  </div>
                  <motion.div 
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.8, type: 'spring' }}
                    className="absolute -top-4 -right-4 bg-white text-black px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1 shadow-2xl"
                  >
                    <Award className="w-3 h-3" />
                    +{rewardPoints} Pts
                  </motion.div>
                </div>
                <div className="space-y-4">
                  <h2 className="text-white font-serif text-6xl italic leading-none">Culinary Mastery!</h2>
                  <p className="text-gray-400 font-light italic text-xl">
                    You've successfully mastered <span className="text-white">{recipe.name}</span>.
                  </p>
                </div>
              </motion.div>

              <motion.div 
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="grid grid-cols-1 gap-4 pt-12"
              >
                <button 
                  onClick={() => setIsShareOpen(true)}
                  className="h-16 bg-white text-black rounded-full font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-amber-accent transition-all shadow-2xl"
                >
                  <Share2 className="w-5 h-5" />
                  Share My Achievement
                </button>
                <button 
                  onClick={() => navigate(`/recipe/${id}`)}
                  className="h-16 bg-white/5 border border-white/10 text-white rounded-full font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-white/10 transition-all"
                >
                  Return to Recipe
                </button>
              </motion.div>
            </div>

            <ShareSheet 
              isOpen={isShareOpen}
              onClose={() => setIsShareOpen(false)}
              title="Culinary Achievement"
              text={`I just mastered the ${recipe.name} recipe on Discovery! #CulinaryArts #HomeChef`}
              url={`${window.location.origin}/recipe/${id}`}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
