import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react';
import { Sparkles, X, RotateCcw, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, ExternalLink, ChefHat, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { faultTolerantFetch } from './api';

export type JobType = 'recipe_generation' | 'meal_plan' | 'vision_scan' | 'custom';
export type JobStatus = 'running' | 'completed' | 'failed' | 'cancelled';

export interface BackgroundJob {
  id: string;
  type: JobType;
  title: string;
  progress: number;
  status: JobStatus;
  stepText: string;
  error: string | null;
  result: any;
  payload: any; // Saves input parameters for retry
  startedAt: Date;
  completedAt?: Date;
  minimized: boolean;
  onSuccess?: (result: any) => void;
  onFailure?: (error: string) => void;
}

interface BackgroundJobContextType {
  jobs: BackgroundJob[];
  addJob: (
    type: JobType,
    title: string,
    payload: any,
    endpoint: string,
    onSuccess?: (result: any) => void,
    onFailure?: (error: string) => void
  ) => string;
  cancelJob: (id: string) => void;
  retryJob: (id: string) => void;
  dismissJob: (id: string) => void;
  toggleMinimize: (id: string) => void;
  activeJobsCount: number;
}

const BackgroundJobContext = createContext<BackgroundJobContextType | undefined>(undefined);

export function useBackgroundJobs() {
  const context = useContext(BackgroundJobContext);
  if (!context) {
    throw new Error('useBackgroundJobs must be used within a BackgroundJobProvider');
  }
  return context;
}

interface ProviderProps {
  children: ReactNode;
}

export function BackgroundJobProvider({ children }: ProviderProps) {
  const [jobs, setJobs] = useState<BackgroundJob[]>([]);
  const controllersRef = useRef<{ [jobId: string]: AbortController }>({});

  // Active jobs count
  const activeJobsCount = jobs.filter(j => j.status === 'running').length;

  // Clean up abort controllers on unmount
  useEffect(() => {
    return () => {
      Object.values(controllersRef.current).forEach(ctrl => ctrl.abort());
    };
  }, []);

  // Helper timer to update progress for running jobs to look authentic and active
  useEffect(() => {
    if (activeJobsCount === 0) return;

    const interval = setInterval(() => {
      setJobs(prevJobs =>
        prevJobs.map(job => {
          if (job.status !== 'running') return job;

          // Compute fake steps text progress
          let nextProgress = job.progress;
          let nextStep = job.stepText;

          if (job.type === 'recipe_generation') {
            if (nextProgress < 22) {
              nextProgress += 1.8;
              nextStep = "Evaluating pantry credentials & diet rules...";
            } else if (nextProgress < 52) {
              nextProgress += 1.3;
              nextStep = "Analyzing gourmet ratios & flavor profiles...";
            } else if (nextProgress < 78) {
              nextProgress += 0.8;
              nextStep = "Structuring step-by-step instructions...";
            } else if (nextProgress < 96) {
              nextProgress += 0.3;
              nextStep = "Garnishing presentation layout...";
            }
          } else if (job.type === 'meal_plan') {
            if (nextProgress < 25) {
              nextProgress += 2.1;
              nextStep = "Mapping weekly calorie distribution...";
            } else if (nextProgress < 55) {
              nextProgress += 1.2;
              nextStep = "Synthesizing grocery logistics...";
            } else if (nextProgress < 82) {
              nextProgress += 0.7;
              nextStep = "Vetting ingredient overlap for budgeting...";
            } else if (nextProgress < 96) {
              nextProgress += 0.2;
              nextStep = "Reviewing diet compliance indices...";
            }
          } else if (job.type === 'vision_scan') {
            if (nextProgress < 30) {
              nextProgress += 2.5;
              nextStep = "Optimizing visual matrices...";
            } else if (nextProgress < 60) {
              nextProgress += 1.5;
              nextStep = "Identifying pantry contour bounds...";
            } else if (nextProgress < 85) {
              nextProgress += 0.9;
              nextStep = "Running culinary classification networks...";
            } else if (nextProgress < 96) {
              nextProgress += 0.3;
              nextStep = "Finalizing confidence vectors...";
            }
          } else {
            // General custom long-running task
            if (nextProgress < 94) {
              nextProgress += 1.5;
              nextStep = "Processing secure backend task...";
            }
          }

          return {
            ...job,
            progress: Math.min(nextProgress, 99), // Caps at 99 until fetch actually succeeds
            stepText: nextStep,
          };
        })
      );
    }, 150);

    return () => clearInterval(interval);
  }, [activeJobsCount]);

  // Execute a specific job fetch with connection timeouts, signals, error boundaries
  const executeJobFetch = async (
    jobId: string,
    endpoint: string,
    payload: any,
    onSuccess?: (res: any) => void,
    onFailure?: (err: string) => void
  ) => {
    // Create abort controller for cancellation
    const ctrl = new AbortController();
    controllersRef.current[jobId] = ctrl;

    try {
      // 30 seconds soft timeout
      const timeoutId = setTimeout(() => {
        ctrl.abort();
      }, 35000);

      const response = await faultTolerantFetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: ctrl.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMsg = `Server error ${response.status}`;
        try {
          const errData = await response.json();
          errorMsg = errData.details || errData.error || errorMsg;
        } catch {
          // Non-JSON
        }
        throw new Error(errorMsg);
      }

      const data = await response.json();

      // Complete job state
      setJobs(prev =>
        prev.map(job =>
          job.id === jobId
            ? {
                ...job,
                status: 'completed',
                progress: 100,
                stepText: 'Completed successfully!',
                result: data,
                completedAt: new Date(),
              }
            : job
        )
      );

      if (onSuccess) onSuccess(data);

      // Dispatch custom events for loose coupling
      const jobType = jobId.split('_')[0];
      window.dispatchEvent(new CustomEvent(`job_completed_${jobId}`, { detail: data }));
      window.dispatchEvent(new CustomEvent(`job_type_completed_${jobType}`, { detail: { id: jobId, result: data } }));
      if (jobType === 'vision_scan') {
        window.dispatchEvent(new CustomEvent('vision_scan_ready', { detail: data }));
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Job was cancelled by user
        setJobs(prev =>
          prev.map(job =>
            job.id === jobId
              ? {
                  ...job,
                  status: 'cancelled',
                  stepText: 'Operation cancelled by user.',
                  error: 'Cancelled',
                }
              : job
          )
        );
        if (onFailure) onFailure('Operation cancelled.');
      } else {
        // Real failure: let's build the descriptive explanation
        let explanation = error.message || 'An unexpected connection failure occurred.';
        if (explanation.includes('Failed to fetch') || error instanceof TypeError) {
          explanation = 'Network error: Host could not be reached. Check your connection or retry.';
        } else if (explanation.includes('503')) {
          explanation = 'Service overloaded: The AI helper took too long to think. Please try again.';
        }

        setJobs(prev =>
          prev.map(job =>
            job.id === jobId
              ? {
                  ...job,
                  status: 'failed',
                  stepText: 'Operation failed.',
                  error: explanation,
                }
              : job
          )
        );

        if (onFailure) onFailure(explanation);
      }
    } finally {
      delete controllersRef.current[jobId];
    }
  };

  // Trigger a new background task
  const addJob = (
    type: JobType,
    title: string,
    payload: any,
    endpoint: string,
    onSuccess?: (result: any) => void,
    onFailure?: (error: string) => void
  ) => {
    const id = `${type}_${Date.now()}`;
    const initialStep =
      type === 'recipe_generation'
        ? "Evaluating ingredients..."
        : type === 'meal_plan'
        ? "Building layout templates..."
        : "Analyzing request...";

    const newJob: BackgroundJob = {
      id,
      type,
      title,
      progress: 0,
      status: 'running',
      stepText: initialStep,
      error: null,
      result: null,
      payload: { payload, endpoint }, // Save call details for retry options
      startedAt: new Date(),
      minimized: false,
      onSuccess,
      onFailure,
    };

    setJobs(prev => [newJob, ...prev]);

    // Start background thread immediately
    executeJobFetch(id, endpoint, payload, onSuccess, onFailure);

    return id;
  };

  // Cancel job
  const cancelJob = (id: string) => {
    if (controllersRef.current[id]) {
      controllersRef.current[id].abort();
    } else {
      // Just set job status as cancelled if no active controller
      setJobs(prev =>
        prev.map(job =>
          job.id === id
            ? {
                ...job,
                status: 'cancelled',
                stepText: 'Cancelled',
                error: 'Cancelled by user',
              }
            : job
        )
      );
    }
  };

  // Retry job
  const retryJob = (id: string) => {
    setJobs(prev =>
      prev.map(job => {
        if (job.id !== id) return job;
        return {
          ...job,
          status: 'running',
          progress: 5,
          stepText: 'Re-triggering connection vault...',
          error: null,
        };
      })
    );

    const oldJob = jobs.find(j => j.id === id);
    if (oldJob && oldJob.payload) {
      executeJobFetch(
        id,
        oldJob.payload.endpoint,
        oldJob.payload.payload,
        oldJob.onSuccess,
        oldJob.onFailure
      );
    }
  };

  // Dismiss job from deck list
  const dismissJob = (id: string) => {
    // Abort if running
    if (controllersRef.current[id]) {
      controllersRef.current[id].abort();
    }
    setJobs(prev => prev.filter(job => job.id !== id));
  };

  // Minimize toggle
  const toggleMinimize = (id: string) => {
    setJobs(prev =>
      prev.map(job => (job.id === id ? { ...job, minimized: !job.minimized } : job))
    );
  };

  return (
    <BackgroundJobContext.Provider
      value={{
        jobs,
        addJob,
        cancelJob,
        retryJob,
        dismissJob,
        toggleMinimize,
        activeJobsCount,
      }}
    >
      {children}
    </BackgroundJobContext.Provider>
  );
}

/**
 * An extremely polished floating dock display manager for active background tasks, retries, and errors
 */
export function BackgroundJobDeck() {
  const { jobs, cancelJob, retryJob, dismissJob, toggleMinimize } = useBackgroundJobs();
  const [isExpanded, setIsExpanded] = useState(true);

  if (jobs.length === 0) return null;

  const runningCount = jobs.filter(j => j.status === 'running').length;
  const errorCount = jobs.filter(j => j.status === 'failed').length;

  return (
    <div className="fixed bottom-6 right-6 z-50 max-w-[420px] w-full px-4 md:px-0 select-none">
      <div className="bg-graphite/95 backdrop-blur-xl border border-white/10 rounded-[32px] overflow-hidden shadow-2xl shadow-black/80 transition-all duration-300">
        
        {/* Header summary bar */}
        <div 
          onClick={() => setIsExpanded(!isExpanded)}
          className="px-6 py-4 bg-black/40 flex items-center justify-between cursor-pointer border-b border-white/5"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              {runningCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-amber-accent animate-ping" />
              )}
              <ChefHat className={`w-5 h-5 ${runningCount > 0 ? 'text-amber-accent animate-spin' : 'text-white/60'}`} style={{ animationDuration: '4s' }} />
            </div>
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-white">Kitchen Operations</h4>
              <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">
                {runningCount > 0 ? `${runningCount} active task${runningCount > 1 ? 's' : ''}` : 'All tasks completed'}
                {errorCount > 0 && <span className="text-red-500 font-black ml-1.5">• {errorCount} failed</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="text-white/40 hover:text-white p-1 hover:bg-white/5 rounded-lg transition-all">
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Detailed tasks deck section */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="max-h-[360px] overflow-y-auto divide-y divide-white/5 scrollbar-thin"
            >
              <AnimatePresence initial={false}>
                {jobs.map(job => {
                  const isRunning = job.status === 'running';
                  const isCompleted = job.status === 'completed';
                  const isFailed = job.status === 'failed';
                  const isCancelled = job.status === 'cancelled';

                  return (
                    <motion.div
                      key={job.id}
                      initial={{ x: 100, opacity: 0 }}
                      animate={{ x: 0, opacity: 1 }}
                      exit={{ x: -100, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="p-5 space-y-3 relative group/item"
                    >
                      {/* Minimize toggle inside job box */}
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2.5">
                          {isRunning && <Sparkles className="w-4 h-4 text-amber-accent animate-pulse" />}
                          {isCompleted && <CheckCircle2 className="w-4 h-4 text-green-400" />}
                          {isFailed && <AlertTriangle className="w-4 h-4 text-red-500" />}
                          {isCancelled && <X className="w-4 h-4 text-gray-500" />}
                          <span className="text-[11px] font-black uppercase tracking-wider text-white">
                            {job.title}
                          </span>
                        </div>

                        {/* Top corner window dismiss controls */}
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => toggleMinimize(job.id)}
                            className="text-white/20 hover:text-white/80 p-1 rounded hover:bg-white/5 transition-all text-[9px] uppercase font-black tracking-widest px-1.5"
                          >
                            {job.minimized ? 'Expand' : 'Hide'}
                          </button>
                          <button
                            onClick={() => dismissJob(job.id)}
                            className="text-white/20 hover:text-red-500 p-1 rounded hover:bg-white/5 transition-all"
                            title="Dismiss task"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Render collapsed or expanded tasks */}
                      {!job.minimized && (
                        <div className="space-y-3 pt-0.5">
                          {/* Inner status log description */}
                          <p className="text-[11px] text-white/50 italic leading-snug font-light">
                            {isRunning ? job.stepText : isCompleted ? "Your handcrafted meal layout is structured in your book." : isFailed ? job.error : "Clipped by user command."}
                          </p>

                          {/* Action controls */}
                          {isRunning && (
                            <div className="space-y-2">
                              <div className="h-1.5 bg-white/5 rounded-full overflow-hidden relative">
                                <motion.div
                                  animate={{ width: `${job.progress}%` }}
                                  transition={{ ease: "easeOut" }}
                                  className="h-full bg-amber-accent rounded-full shadow-[0_0_8px_#f59e0b]"
                                />
                              </div>
                              <div className="flex justify-between items-center">
                                <span className="text-[9px] text-amber-accent/80 font-black tracking-widest uppercase">
                                  COMPILING: {Math.round(job.progress)}%
                                </span>
                                <button
                                  onClick={() => cancelJob(job.id)}
                                  className="text-[9px] text-red-400 hover:text-red-300 font-bold uppercase tracking-wider transition-colors cursor-pointer"
                                >
                                  Cancel Operation
                                </button>
                              </div>
                            </div>
                          )}

                          {isFailed && (
                            <div className="flex items-center justify-between pt-1">
                              <span className="text-[9px] text-red-500 font-black tracking-widest uppercase">
                                error state detected
                              </span>
                              <button
                                onClick={() => retryJob(job.id)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-amber-accent hover:text-white rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all border border-amber-accent/20 cursor-pointer"
                              >
                                <RotateCcw className="w-2.5 h-2.5" /> Try Again
                              </button>
                            </div>
                          )}

                          {isCancelled && (
                            <div className="flex justify-end pt-1">
                              <button
                                onClick={() => retryJob(job.id)}
                                className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white rounded-lg text-[9px] font-bold uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                              >
                                <RotateCcw className="w-2.5 h-2.5" /> Re-execute
                              </button>
                            </div>
                          )}

                          {isCompleted && job.result && (
                            <div className="bg-amber-accent/5 px-4 py-2.5 border border-amber-accent/10 rounded-xl flex items-center justify-between">
                              <span className="text-[10px] text-amber-accent font-semibold tracking-wide italic">
                                Ready to be savored!
                              </span>
                              <div className="flex gap-2">
                                {job.type === 'recipe_generation' && (
                                  <button
                                    onClick={() => {
                                      // Special trigger handled by layout or session
                                      sessionStorage.setItem('temp_generated_recipe', JSON.stringify(job.result));
                                      window.dispatchEvent(new CustomEvent('recipe_ready', { detail: job.result }));
                                      // Dismiss to clean up
                                      dismissJob(job.id);
                                    }}
                                    className="px-2.5 py-1 bg-amber-accent hover:bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    View Blueprint <ExternalLink className="w-2.5 h-2.5" />
                                  </button>
                                )}
                                {job.type === 'meal_plan' && (
                                  <button
                                    onClick={() => {
                                      window.dispatchEvent(new CustomEvent('mealplan_ready', { detail: job.result }));
                                      // Dismiss list to keep clean
                                      dismissJob(job.id);
                                    }}
                                    className="px-2.5 py-1 bg-amber-accent hover:bg-white text-black rounded-lg text-[9px] font-black uppercase tracking-wider flex items-center gap-1 transition-all cursor-pointer"
                                  >
                                    Review Plan <Calendar className="w-2.5 h-2.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
