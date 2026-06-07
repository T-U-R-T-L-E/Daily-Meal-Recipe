import { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Sparkles, X, Search, Utensils, CheckCircle2, AlertCircle, Upload, Eye, Plus } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';
import { useBackgroundJobs } from '../lib/BackgroundJobContext';
import { useAuth } from '../lib/useAuth';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useErrorUX, InlineErrorHelper } from '../lib/ErrorUXContext';

export default function Scanner() {
  const { addJob, jobs, cancelJob, toggleMinimize } = useBackgroundJobs();
  const { user } = useAuth();
  const { handleError } = useErrorUX();
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanStep, setScanStep] = useState(0);
  const [scannedItems, setScannedItems] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('persist_scanned_basket');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('persist_scanned_basket', JSON.stringify(scannedItems));
    } catch (e) {
      console.error("Failed to save scanned items to local storage", e);
    }
  }, [scannedItems]);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();

  const activeScanJob = jobs.find(j => j.type === 'vision_scan' && j.status === 'running');
  const isCurrentlyScanning = (activeScanJob && !activeScanJob.minimized) || scanning;
  const hasBackgroundScan = activeScanJob && activeScanJob.minimized;

  // Listen to background completed visual scan events to automatically merge new items
  useEffect(() => {
    const handleVisionScanReady = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.items && detail.items.length > 0) {
        setScannedItems(prev => [...new Set([...prev, ...detail.items])]);
      }
    };
    window.addEventListener('vision_scan_ready', handleVisionScanReady);
    return () => window.removeEventListener('vision_scan_ready', handleVisionScanReady);
  }, []);

  useEffect(() => {
    if (!scanning) {
      setScanStep(0);
      return;
    }
    const timer = setInterval(() => {
      setScanStep(prev => (prev + 1) % scanCaptions.length);
    }, 1000);
    return () => clearInterval(timer);
  }, [scanning]);

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      setError(null);
      let mediaStream: MediaStream;
      try {
        // Try environment-facing (rear) camera first
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: { facingMode: 'environment' } 
        });
      } catch (firstErr) {
        console.warn("Rear camera not available, trying any default video input...", firstErr);
        // Fall back to any standard video device (e.g., default webcam)
        mediaStream = await navigator.mediaDevices.getUserMedia({ 
          video: true 
        });
      }
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      const friendlyVal = handleError(err, {
        componentName: 'Scanner',
        actionName: 'startCamera',
        preferredPlacement: 'inline'
      });
      setError(friendlyVal);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processImageFile(file);
  };

  const scanCaptions = [
    "Accessing digital snapshot...",
    "Extracting food patterns...",
    "Matching visual ingredient profiles...",
    "Finalizing search tags..."
  ];

  const processImageFile = (file: File) => {
    setScanning(true);
    setError(null);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) {
          setScanning(false);
          return;
        }
        canvas.width = img.width;
        canvas.height = img.height;
        const context = canvas.getContext('2d');
        if (!context) {
          setScanning(false);
          return;
        }
        context.drawImage(img, 0, 0);
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        addJob(
          'vision_scan',
          'Photo Ingredient Scan',
          { image: imageData },
          '/api/ai/scan-image',
          (data) => {
            if (data.items && data.items.length > 0) {
              setScannedItems(prev => [...new Set([...prev, ...data.items])]);
            }
            setScanning(false);
          },
          (err) => {
            const friendlyVal = handleError(err, {
              componentName: 'Scanner',
              actionName: 'processImageFile',
              preferredPlacement: 'inline'
            });
            setError(friendlyVal);
            setScanning(false);
          }
        );
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const captureAndScan = () => {
    if (!videoRef.current || !canvasRef.current || isCurrentlyScanning) return;

    setScanning(true);
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const context = canvas.getContext('2d');
    if (!context) {
      setScanning(false);
      return;
    }
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageData = canvas.toDataURL('image/jpeg', 0.8);

    addJob(
      'vision_scan',
      'Video Spotlight Scan',
      { image: imageData },
      '/api/ai/scan-image',
      (data) => {
        if (data.items && data.items.length > 0) {
          setScannedItems(prev => [...new Set([...prev, ...data.items])]);
        }
        setScanning(false);
      },
      (err) => {
        const friendlyVal = handleError(err, {
          componentName: 'Scanner',
          actionName: 'captureAndScan',
          preferredPlacement: 'inline'
        });
        setError(friendlyVal);
        setScanning(false);
      }
    );
  };

  const removeHandle = (item: string) => {
    setScannedItems(prev => prev.filter(i => i !== item));
  };

  const [addingToPantry, setAddingToPantry] = useState(false);
  const [pantrySuccess, setPantrySuccess] = useState<string | null>(null);

  const addToPantry = async () => {
    if (scannedItems.length === 0) return;
    if (!user) {
      const friendlyVal = handleError(
        "Unauthorized authorization token. No active profile details were detected in this session.",
        { componentName: 'Scanner', actionName: 'addToPantry', preferredPlacement: 'inline' }
      );
      setError(friendlyVal);
      return;
    }
    setAddingToPantry(true);
    setError(null);
    try {
      for (const item of scannedItems) {
        await addDoc(collection(db, 'pantry'), {
          item: item,
          quantity: '1',
          category: 'Other',
          userId: user.uid,
          createdAt: Timestamp.now()
        });
      }
      setPantrySuccess(`Successfully added ${scannedItems.length} item(s) to your pantry!`);
      setTimeout(() => setPantrySuccess(null), 4000);
    } catch (err: any) {
      console.error("Error adding to pantry:", err);
      handleFirestoreError(err, OperationType.CREATE, 'pantry');
    } finally {
      setAddingToPantry(false);
    }
  };

  const findRecipes = () => {
    if (scannedItems.length === 0) return;
    // Save to session storage and navigate to discovery with these as search terms
    sessionStorage.setItem('temp_scan_ingredients', JSON.stringify(scannedItems));
    navigate('/discovery?mode=world&search=' + encodeURIComponent(scannedItems.join(', ')));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-20">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h1 className="font-serif text-5xl font-light text-white italic">Food Scanner</h1>
          <p className="text-gray-500 font-light flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-amber-accent" />
            Point at ingredients or barcodes to identify them.
          </p>
        </div>
        <button 
          onClick={() => navigate(-1)}
          className="p-3 bg-white/5 border border-white/10 rounded-full text-white/40 hover:text-white transition-all"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Camera Preview */}
        <div className="space-y-6">
          <div className="relative aspect-[4/3] bg-black rounded-[40px] overflow-hidden border border-white/10 group">
            {error ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <InlineErrorHelper message={error} className="text-center justify-center text-xs font-light max-w-sm leading-relaxed text-rose-400 bg-rose-500/5 p-5 rounded-2xl border border-rose-500/10 italic" />
                <div className="flex flex-wrap gap-3 justify-center pt-2">
                  <button 
                    onClick={startCamera}
                    className="px-5 py-2.5 bg-white/10 rounded-xl text-[10px] font-bold uppercase tracking-widest text-white hover:bg-white/20 transition-all cursor-pointer"
                  >
                    Retry Camera
                  </button>
                  <label className="px-5 py-2.5 bg-amber-accent hover:bg-white text-black rounded-xl text-[10px] font-bold uppercase tracking-widest transition-all cursor-pointer flex items-center gap-1.5 shadow-lg shadow-amber-accent/15">
                    <Upload className="w-3.5 h-3.5" />
                    Upload Instead
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleFileUpload} 
                      className="hidden" 
                    />
                  </label>
                </div>
              </div>
            ) : (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  muted 
                  className="w-full h-full object-cover"
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Overlay UI */}
                <div className="absolute inset-0 border-[20px] border-black/40 pointer-events-none" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-white/20 rounded-3xl pointer-events-none">
                  <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-amber-accent rounded-tl-xl" />
                  <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-amber-accent rounded-tr-xl" />
                  <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-amber-accent rounded-bl-xl" />
                  <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-amber-accent rounded-br-xl" />
                </div>

                <AnimatePresence>
                  {isCurrentlyScanning && (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-black/60 backdrop-blur-md flex flex-col items-center justify-center overflow-hidden"
                    >
                      {/* Animated scanning laser line */}
                      <motion.div
                        animate={{ y: ['0%', '240px', '0%'] }}
                        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-amber-accent to-transparent shadow-[0_0_8px_#f59e0b]"
                        style={{ top: '20%' }}
                      />

                      <div className="flex flex-col items-center space-y-4 relative z-10 px-8 text-center max-w-xs">
                        <div className="relative">
                          {/* Pulsing ring */}
                          <div className="absolute inset-0 rounded-full border border-amber-accent/40 animate-ping" />
                          <div className="w-14 h-14 border-2 border-amber-accent border-t-transparent rounded-full animate-spin flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-amber-accent animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <span className="text-[10px] font-black text-amber-accent uppercase tracking-[0.3em]">Neural Analyzer</span>
                          <div className="h-4 flex items-center justify-center">
                            <AnimatePresence mode="wait">
                              <motion.p
                                key={activeScanJob ? activeScanJob.stepText : scanStep}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                className="text-[11px] text-white/80 font-light italic"
                              >
                                {activeScanJob ? activeScanJob.stepText : scanCaptions[scanStep]}
                              </motion.p>
                            </AnimatePresence>
                          </div>
                        </div>
                        
                        {activeScanJob && (
                          <div className="grid grid-cols-2 gap-3 pt-3 w-full">
                            <button
                              onClick={() => toggleMinimize(activeScanJob.id)}
                              className="px-3 py-2 bg-white/5 border border-white/10 hover:text-amber-accent hover:bg-white/10 text-[9px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-white"
                            >
                              Background
                            </button>
                            <button
                              onClick={() => cancelJob(activeScanJob.id)}
                              className="px-3 py-2 bg-red-500/10 hover:text-red-300 hover:bg-red-500/20 text-[9px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer text-red-400"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}
          </div>

          <div className="flex gap-4">
            {hasBackgroundScan && (
              <button
                onClick={() => toggleMinimize(activeScanJob.id)}
                className="px-4 py-4 bg-amber-accent/10 hover:bg-amber-accent/20 text-amber-accent border border-amber-accent/20 rounded-full font-bold uppercase tracking-[0.15em] text-[10px] flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Eye className="w-4 h-4 animate-bounce" /> Recover Scan Overlay
              </button>
            )}
            
            <button 
              onClick={captureAndScan}
              disabled={isCurrentlyScanning || !!error}
              className="flex-1 h-16 bg-white text-black rounded-full font-bold uppercase tracking-[0.2em] text-xs flex items-center justify-center gap-3 hover:bg-amber-accent transition-all shadow-2xl disabled:opacity-50"
            >
              <Camera className="w-5 h-5" />
              Capture If Ready
            </button>
            <button 
              onClick={startCamera}
              className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-white hover:bg-white/10 transition-all"
              title="Refresh Camera Stream"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {/* Fallback image upload dropzone component */}
          <div className="p-8 border border-dashed border-white/10 bg-white/[0.01] rounded-[30px] flex flex-col items-center text-center space-y-4">
            <div className="w-10 h-10 bg-white/5 border border-white/5 rounded-full flex items-center justify-center">
              <Upload className="w-5 h-5 text-amber-accent" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-white font-medium">Have a recipe photo or ingredient snapshot?</p>
              <p className="text-[10px] text-white/30 uppercase tracking-widest font-mono">PNG, Jpeg, WebP are fully supported</p>
            </div>
            <label className="px-6 py-2.5 bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest cursor-pointer transition-all">
              Choose Image File
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleFileUpload} 
                className="hidden" 
              />
            </label>
          </div>
        </div>

        {/* Identified Items */}
        <div className="bg-graphite rounded-[40px] border border-white/5 p-10 flex flex-col h-full min-h-[400px]">
          <div className="flex items-center justify-between mb-8">
            <div className="space-y-1">
              <h3 className="text-white font-serif text-2xl italic">Scan Basket</h3>
              <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{scannedItems.length} items identified</p>
            </div>
            <Utensils className="w-6 h-6 text-amber-accent/20" />
          </div>

          <div className="flex-grow">
            <div className="flex flex-wrap gap-3">
              <AnimatePresence mode="popLayout">
                {scannedItems.map((item) => (
                  <motion.div
                    key={item}
                    layout
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    className="group flex items-center gap-2 px-5 py-3 bg-white/5 border border-white/10 rounded-2xl transition-all hover:border-amber-accent/50"
                  >
                    <span className="text-xs text-white">{item}</span>
                    <button 
                      onClick={() => removeHandle(item)}
                      className="p-1 text-white/20 hover:text-red-500 transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>

              {scannedItems.length === 0 && (
                <div className="w-full py-20 flex flex-col items-center justify-center text-center space-y-4">
                  <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center">
                    <Camera className="w-8 h-8 text-white/5" />
                  </div>
                  <p className="text-gray-500 text-xs italic font-light max-w-[200px]">Identify ingredients to build your recipe basket.</p>
                </div>
              )}
            </div>
          </div>

          <div className="pt-8 border-t border-white/5 mt-8 space-y-4">
            <AnimatePresence>
              {pantrySuccess && (
                <motion.div 
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-[24px] flex items-center gap-3 text-emerald-400 text-xs font-light"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{pantrySuccess}</span>
                </motion.div>
              )}
            </AnimatePresence>

            <button 
              onClick={findRecipes}
              disabled={scannedItems.length === 0}
              className="w-full h-14 bg-amber-accent text-black rounded-full font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-white transition-all disabled:opacity-30"
            >
              <Search className="w-4 h-4" />
              Find Matching Recipes
            </button>

            <button 
              onClick={addToPantry}
              disabled={scannedItems.length === 0 || addingToPantry}
              className="w-full h-14 bg-white/5 hover:bg-white/10 text-white rounded-full border border-white/10 font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 transition-all disabled:opacity-30 cursor-pointer"
            >
              {addingToPantry ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4 text-amber-accent" />
              )}
              Add to Pantry
            </button>

            <button 
              onClick={() => setScannedItems([])}
              disabled={scannedItems.length === 0}
              className="w-full text-center text-[10px] font-bold uppercase tracking-widest text-white/20 hover:text-white/40 transition-colors pt-2 cursor-pointer"
            >
              Clear Basket
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10">
        {[
          { title: "Barcodes", desc: "Scan product barcodes for instant product data.", icon: CheckCircle2 },
          { title: "Fresh Food", desc: "Identify fruits, vegetables, and meats visually.", icon: CheckCircle2 },
          { title: "Packages", desc: "Read labels from spices, sauces, and dry goods.", icon: CheckCircle2 }
        ].map((feat, i) => (
          <div key={i} className="flex gap-4 p-6 bg-white/[0.02] border border-white/5 rounded-3xl">
            <feat.icon className="w-5 h-5 text-amber-accent shrink-0" />
            <div className="space-y-1">
              <h4 className="text-[11px] font-bold text-white uppercase tracking-widest">{feat.title}</h4>
              <p className="text-[11px] text-gray-500 font-light leading-relaxed">{feat.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
