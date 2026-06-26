import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  DollarSign, 
  Star, 
  Search, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  XCircle, 
  Shield, 
  TrendingUp, 
  MoreVertical, 
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  UserX,
  Lock,
  Eye,
  MessageSquare,
  ChevronRight,
  Zap,
  Cpu,
  Activity,
  Database,
  Download
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  collectionGroup,
  getDocs, 
  query, 
  orderBy, 
  limit, 
  doc, 
  deleteDoc, 
  updateDoc, 
  where,
  Timestamp 
} from 'firebase/firestore';
import { useAuth } from '../lib/useAuth';
import { Navigate } from 'react-router-dom';
import { Recipe, UserProfile, Review } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import AccessDenied from '../components/auth/AccessDenied';

type AdminTab = 'overview' | 'cms' | 'users' | 'earnings' | 'reviews' | 'scalability' | 'database';

export default function Admin() {
  const { user, profile, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [passcode, setPasscode] = useState('');
  const [passcodeError, setPasscodeError] = useState<string | null>(null);
  const [isPasscodeUnlocked, setIsPasscodeUnlocked] = useState(localStorage.getItem('admin_authenticated') === 'true');
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [files, setFiles] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  const formatBytes = (bytes: number, decimals = 2) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  };

  // DB Explorer states
  const [dbCollection, setDbCollection] = useState<string>('users');
  const [dbDocuments, setDbDocuments] = useState<any[]>([]);
  const [dbLoading, setDbLoading] = useState<boolean>(false);
  const [dbSearch, setDbSearch] = useState<string>('');
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [isExportingAll, setIsExportingAll] = useState<boolean>(false);

  // DBA Diagnostics & Performance Tuning states
  const [dbSubTab, setDbSubTab] = useState<'explorer' | 'performance'>('explorer');
  const [explainQuery, setExplainQuery] = useState('SELECT * FROM recipes WHERE LOWER(name) LIKE \'chicken%\'');
  const [explainIndexScanning, setExplainIndexScanning] = useState(false);
  const [explainResult, setExplainResult] = useState<any>(null);
  const [explainLoading, setExplainLoading] = useState(false);
  const [statStatements, setStatStatements] = useState<any>(null);
  const [statLoading, setStatLoading] = useState(false);
  const [pgBouncerStats, setPgBouncerStats] = useState<any>(null);
  const [pgBouncerLoading, setPgBouncerLoading] = useState(false);

  // Load Testing simulation states
  const [concurrency, setConcurrency] = useState(120);
  const [useCache, setUseCache] = useState(true);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [telemetry, setTelemetry] = useState<any>(null);
  const [isClearingCache, setIsClearingCache] = useState(false);

  const fetchExplainPlan = async () => {
    setExplainLoading(true);
    try {
      const res = await fetch('/api/db/explain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ queryText: explainQuery, indexScanning: explainIndexScanning })
      });
      if (res.ok) {
        const data = await res.json();
        setExplainResult(data);
      }
    } catch (e) {
      console.error("Explain plan fetch failure", e);
    } finally {
      setExplainLoading(false);
    }
  };

  const fetchStatStatements = async () => {
    setStatLoading(true);
    try {
      const res = await fetch('/api/db/statistics');
      if (res.ok) {
        const data = await res.json();
        setStatStatements(data);
      }
    } catch (e) {
      console.error("pg_stat_statements fetch failure", e);
    } finally {
      setStatLoading(false);
    }
  };

  const fetchPgBouncer = async () => {
    setPgBouncerLoading(true);
    try {
      const res = await fetch('/api/db/pgbouncer');
      if (res.ok) {
        const data = await res.json();
        setPgBouncerStats(data);
      }
    } catch (e) {
      console.error("PgBouncer status fetch failure", e);
    } finally {
      setPgBouncerLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'database' && dbSubTab === 'performance') {
      fetchExplainPlan();
      fetchStatStatements();
      fetchPgBouncer();
    }
  }, [activeTab, dbSubTab, explainIndexScanning]);

  // Load telemetry stats initially and periodically
  const fetchTelemetry = async () => {
    try {
      const res = await fetch('/api/test/metrics');
      if (res.ok) {
        const data = await res.json();
        setTelemetry(data);
      }
    } catch (err) {
      console.error("Telemetry fetch error:", err);
    }
  };

  useEffect(() => {
    if (activeTab === 'scalability') {
      fetchTelemetry();
      const interval = setInterval(fetchTelemetry, 5000);
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const handleRunLoadTest = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await fetch('/api/test/simulate-surge', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ concurrency, useCache })
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult(data);
      } else {
        const errData = await res.json();
        alert(errData.message || "Test failed under high-load replication simulation");
      }
    } catch (err: any) {
      alert("Test aborted: Server was unresponsive or connection cut off: " + err.message);
    } finally {
      setIsTesting(false);
      fetchTelemetry();
    }
  };

  const handleClearCache = async () => {
    setIsClearingCache(true);
    try {
      const res = await fetch('/api/cache/clear', { method: 'POST' });
      if (res.ok) {
        alert("Server LRU memory caching entries flushed successfully.");
      }
    } catch (err) {
      alert("Failed to clear server cache");
    } finally {
      setIsClearingCache(false);
    }
  };

  const fetchDbDocuments = async (colName: string) => {
    setDbLoading(true);
    setDbDocuments([]);
    setSelectedDoc(null);
    try {
      const colRef = colName === 'reviews' ? collectionGroup(db, 'reviews') : collection(db, colName);
      const snap = await getDocs(query(colRef, limit(100)));
      const docs = snap.docs.map(doc => ({ id: doc.id, _refPath: doc.ref.path, ...doc.data() }));
      setDbDocuments(docs);
    } catch (err: any) {
      console.error("Error fetching db explorer collection:", err);
      alert("Error loading collection " + colName + ": " + err.message);
    } finally {
      setDbLoading(false);
    }
  };

  const handleDbDeleteDoc = async (colName: string, docId: string) => {
    if (!window.confirm(`Are you absolutely sure you want to permanently delete document "${docId}" from collection "${colName}"? This action is irreversible!`)) return;
    try {
      const foundDoc = dbDocuments.find(d => d.id === docId);
      const docRef = foundDoc?._refPath ? doc(db, foundDoc._refPath) : doc(db, colName, docId);
      await deleteDoc(docRef);
      setDbDocuments(prev => prev.filter(d => d.id !== docId));
      if (selectedDoc?.id === docId) {
        setSelectedDoc(null);
      }
      alert("Document deleted successfully from " + colName);
    } catch (err: any) {
      alert("Failed to delete document: " + err.message);
    }
  };

  const handleDownloadBackup = (colName: string, docs: any[]) => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(docs, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("download", `dailymealrecipe_backup_${colName}_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert("Backup export failed: " + err.message);
    }
  };

  const handleDownloadAllBackups = async () => {
    setIsExportingAll(true);
    try {
      const collections = [
        'users', 'recipes', 'reviews', 'pantry', 'mealPlans', 
        'shoppingLists', 'favorites', 'cookingLogs', 'sharedTodos', 'families', 'files'
      ];
      const backupData: any = {};
      
      await Promise.all(collections.map(async (col) => {
        try {
          const colRef = col === 'reviews' ? collectionGroup(db, 'reviews') : collection(db, col);
          const snap = await getDocs(query(colRef, limit(200)));
          backupData[col] = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (e: any) {
          console.warn(`Error compiling backup for ${col}:`, e.message);
          backupData[col] = { error: e.message };
        }
      }));

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      const dateStr = new Date().toISOString().slice(0, 10);
      downloadAnchor.setAttribute("download", `dailymealrecipe_full_system_backup_${dateStr}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err: any) {
      alert("Master backup export failed: " + err.message);
    } finally {
      setIsExportingAll(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'database') {
      fetchDbDocuments(dbCollection);
    }
  }, [activeTab, dbCollection]);

  const isAdmin = profile?.role === 'admin' || user?.email === 'lewisiraki1@gmail.com' || user?.email === 'lewisiraki3@gmail.com' || isPasscodeUnlocked;

  useEffect(() => {
    if (!isAdmin) return;

    async function fetchData() {
      setLoading(true);
      try {
        const [recipesSnap, usersSnap, filesSnap] = await Promise.all([
          getDocs(query(collection(db, 'recipes'), orderBy('createdAt', 'desc'), limit(50))),
          getDocs(query(collection(db, 'users'), limit(150))),
          getDocs(query(collection(db, 'files'), orderBy('createdAt', 'desc'), limit(150)))
        ]);

        let txs: any[] = [];
        try {
          const txSnap = await getDocs(query(collection(db, 'transactions'), limit(150)));
          txs = txSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (txErr) {
          console.warn("Transactions collection not accessible or empty:", txErr);
        }

        let reviewsDocs: any[] = [];
        try {
          const reviewsSnap = await getDocs(query(collectionGroup(db, 'reviews'), orderBy('createdAt', 'desc'), limit(50)));
          reviewsDocs = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (idxErr) {
          console.warn("Index not ready for sorted reviews, querying unsorted...", idxErr);
          try {
            const reviewsSnap = await getDocs(query(collectionGroup(db, 'reviews'), limit(50)));
            reviewsDocs = reviewsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          } catch (e) {
            console.error("Failed to query reviews collection group:", e);
          }
        }

        setRecipes(recipesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }) as Recipe));
        setUsers(usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as UserProfile)));
        setTransactions(txs);
        setReviews(reviewsDocs as Review[]);
        setFiles(filesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      } catch (error) {
        console.error("Admin fetch error:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [isAdmin]);

  const totalRevenue = useMemo(() => {
    let total = 0;
    const seenRefs = new Set<string>();

    // 1. Sum from transactions collection
    transactions.forEach(tx => {
      if (tx.status === 'success' || !tx.status) {
        const ref = tx.gatewayReferenceId || tx.transactionId || tx.reference || tx.id;
        if (ref && !seenRefs.has(ref)) {
          seenRefs.add(ref);
          total += Number(tx.amount) || 0;
        }
      }
    });

    // 2. Sum from user billing histories (avoid duplicate references if possible)
    users.forEach(u => {
      if (u.billingHistory && Array.isArray(u.billingHistory)) {
        u.billingHistory.forEach((item: any) => {
          if (item.status === 'success' || !item.status) {
            const ref = item.reference || item.id;
            if (ref && !seenRefs.has(ref)) {
              seenRefs.add(ref);
              total += Number(item.amount) || 0;
            }
          }
        });
      }
    });

    return total;
  }, [transactions, users]);

  const mergedTransactionsList = useMemo(() => {
    const list: Array<{
      id: string;
      user: string;
      amount: string;
      time: string;
      method: string;
      dateObj: Date;
      status: string;
      plan: string;
    }> = [];

    const seenRefs = new Set<string>();

    // Add from transactions collection
    transactions.forEach(tx => {
      const ref = tx.gatewayReferenceId || tx.transactionId || tx.reference || tx.id;
      if (ref && !seenRefs.has(ref)) {
        seenRefs.add(ref);
        const dateStr = tx.timestamp || tx.createdAt || new Date().toISOString();
        const amtStr = `+${tx.currency || 'USD'} ${(Number(tx.amount) || 0).toFixed(2)}`;
        list.push({
          id: ref,
          user: tx.userEmail || "Anonymous Chef",
          amount: amtStr,
          time: format(new Date(dateStr), 'MMM d, h:mm a'),
          method: 'Paystack Webhook',
          dateObj: new Date(dateStr),
          status: tx.status || 'success',
          plan: tx.plan || 'Gourmet Plus Plan'
        });
      }
    });

    // Add from user billing histories
    users.forEach(u => {
      if (u.billingHistory && Array.isArray(u.billingHistory)) {
        u.billingHistory.forEach((item: any) => {
          const ref = item.reference || item.id;
          if (ref && !seenRefs.has(ref)) {
            seenRefs.add(ref);
            const dateStr = item.date || new Date().toISOString();
            const amtStr = `+${item.currency || 'USD'} ${(Number(item.amount) || 0).toFixed(2)}`;
            list.push({
              id: ref,
              user: u.email || u.displayName || "Gourmet Member",
              amount: amtStr,
              time: format(new Date(dateStr), 'MMM d, h:mm a'),
              method: 'Paystack Direct',
              dateObj: new Date(dateStr),
              status: item.status || 'success',
              plan: item.plan || 'Gourmet Plus Plan'
            });
          }
        });
      }
    });

    // Sort descending by date
    return list.sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime());
  }, [transactions, users]);

  const weeklyHeights = useMemo(() => {
    const days = [0, 0, 0, 0, 0, 0, 0]; // Mon-Sun
    let max = 1;

    mergedTransactionsList.forEach(tx => {
      if (tx.status === 'success') {
        const dayIndex = (tx.dateObj.getDay() + 6) % 7; // shift so 0 = Mon, 6 = Sun
        const amtPart = tx.amount.split(' ').pop();
        const amt = amtPart ? parseFloat(amtPart) : 0;
        days[dayIndex] += amt;
      }
    });

    days.forEach(v => {
      if (v > max) max = v;
    });

    return days.map(v => ({
      amount: v,
      percentage: max > 0 ? (v / max) * 100 : 0
    }));
  }, [mergedTransactionsList]);

  if (authLoading) return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-amber-accent/5 blur-[80px] rounded-full pointer-events-none" />
      <div className="relative flex flex-col items-center max-w-sm px-6 text-center space-y-8 select-none">
        <motion.div
          animate={{ rotate: [0, 360] }}
          transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
          className="w-20 h-20 rounded-full border border-dashed border-amber-accent/20 flex items-center justify-center"
        >
          <div className="w-16 h-16 rounded-full border border-stone-800 flex items-center justify-center bg-black/40">
            <Shield className="w-6 h-6 text-amber-accent animate-pulse" />
          </div>
        </motion.div>
        <div className="space-y-2">
          <h3 className="text-white font-serif text-2xl italic">Verifying Credentials...</h3>
          <p className="text-[10px] uppercase font-bold tracking-[0.25em] text-amber-accent/80 flex items-center justify-center gap-1.5">
            <Lock className="w-3 h-3 text-amber-accent" /> Authing Premium Secure Clearance
          </p>
        </div>
      </div>
    </div>
  );
  const handlePasscodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '654321' || passcode === 'admin123' || passcode.toLowerCase() === 'lewisiraki') {
      localStorage.setItem('admin_authenticated', 'true');
      setIsPasscodeUnlocked(true);
      setPasscodeError(null);
      
      // Elevate role in Firestore for this logged-in user
      if (user) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            role: 'admin'
          });
          if (profile) {
            profile.role = 'admin';
          }
        } catch (err) {
          console.warn("Could not elevate profile role to admin in Firestore:", err);
        }
      }
    } else {
      setPasscodeError("Invalid Administrative Passcode. Access Denied.");
    }
  };

  if (!isAdmin) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-6 bg-onyx text-gray-300 select-none relative">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full pointer-events-none" />
        
        <motion.div 
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 bg-graphite/40 border border-white/5 rounded-[40px] space-y-6 relative overflow-hidden backdrop-blur-xl"
        >
          {/* Top Lock Badge */}
          <div className="flex flex-col items-center space-y-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-accent/10 border border-amber-accent/20 flex items-center justify-center text-amber-accent">
              <Lock className="w-6 h-6 animate-pulse" />
            </div>
            <div className="space-y-1.5">
              <h2 className="text-2xl font-serif text-white italic tracking-tight">Admin Gatekeeper</h2>
              <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-white/40">Secure Command Clearance</p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handlePasscodeSubmit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block">
                Master Passcode
              </label>
              <input
                type="password"
                placeholder="••••••"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                className="w-full px-5 py-4 bg-white/5 border border-white/10 focus:border-amber-accent rounded-2xl text-center text-lg font-mono tracking-widest text-white outline-none transition-all"
              />
            </div>

            {passcodeError && (
              <p className="text-xs text-rose-400 text-center font-medium bg-rose-500/10 py-2.5 px-4 rounded-xl border border-rose-500/20">
                ⚠️ {passcodeError}
              </p>
            )}

            <button
              type="submit"
              className="w-full py-4 bg-amber-accent text-black hover:bg-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <Shield className="w-4 h-4" /> Verify Credentials
            </button>
          </form>

          {/* Helper details */}
          <div className="pt-4 border-t border-white/5 text-center">
            <p className="text-[10px] text-white/30 leading-relaxed uppercase tracking-wider font-bold">
              Default Preview passcode is <span className="text-amber-accent font-black">654321</span> or <span className="text-amber-accent font-black font-mono">admin123</span>
            </p>
          </div>
        </motion.div>
      </div>
    );
  }

  const handleDeleteRecipe = async (id: string) => {
    if (!window.confirm('Delete this recipe permanently?')) return;
    try {
      await deleteDoc(doc(db, 'recipes', id));
      setRecipes(prev => prev.filter(r => r.id !== id));
    } catch (err) {
      alert('Fail to delete');
    }
  };

  const handleApproveRecipe = async (id: string) => {
    try {
      await updateDoc(doc(db, 'recipes', id), {
        status: 'approved'
      });
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
    } catch (err) {
      alert('Fail to approve recipe');
    }
  };

  const handleRejectRecipe = async (id: string) => {
    try {
      await updateDoc(doc(db, 'recipes', id), {
        status: 'rejected'
      });
      setRecipes(prev => prev.map(r => r.id === id ? { ...r, status: 'rejected' } : r));
    } catch (err) {
      alert('Fail to reject recipe');
    }
  };

  const toggleUserStatus = async (uid: string, currentStatus: string) => {
    const newStatus = currentStatus === 'active' ? 'expired' : 'active';
    try {
      await updateDoc(doc(db, 'users', uid), {
        'subscription.status': newStatus
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, subscription: { ...u.subscription!, status: newStatus as any } } : u));
    } catch (err) {
      alert('Fail to update user status');
    }
  };

  const updateUserSubscription = async (uid: string, status: 'active' | 'trial' | 'past_due' | 'canceled' | 'unpaid' | 'expired' | 'none') => {
    try {
      const now = new Date();
      const nextPayment = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      const subUpdate = {
        status,
        subscribedDate: status === 'active' ? now.toISOString() : (status === 'none' ? null : now.toISOString()),
        trialEndDate: new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        nextPaymentDate: status === 'active' || status === 'trial' ? nextPayment.toISOString() : null,
        endDate: status === 'canceled' ? nextPayment.toISOString() : null
      };

      await updateDoc(doc(db, 'users', uid), {
        'subscription': subUpdate
      });

      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, subscription: subUpdate as any } : u));
      alert(`User subscription status successfully set to: ${status.toUpperCase()}`);
    } catch (err: any) {
      alert(`Failed to update subscription: ${err.message}`);
    }
  };

  const updateUserRole = async (uid: string, newRole: 'admin' | 'user') => {
    try {
      await updateDoc(doc(db, 'users', uid), {
        role: newRole
      });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role: newRole } : u));
      alert(`User role successfully set to: ${newRole.toUpperCase()}`);
    } catch (err: any) {
      alert(`Failed to update user role: ${err.message}`);
    }
  };

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-amber-accent/10 border border-amber-accent/20 rounded-full text-[10px] font-black uppercase tracking-widest text-amber-accent flex items-center gap-2">
            <Lock className="w-3 h-3" />
            Admin Command Center
          </div>
        </div>
        <h1 className="text-6xl font-serif text-white italic tracking-tighter">
          Dashboard
        </h1>
      </header>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Revenue', value: `$${totalRevenue.toFixed(2)}`, icon: DollarSign, trend: totalRevenue > 0 ? '+100%' : '0%', up: totalRevenue > 0 },
          { label: 'Total Users', value: users.length.toString(), icon: Users, trend: '+5%', up: true },
          { label: 'Culinary Assets', value: files.length.toString(), icon: Database, trend: '+18%', up: true },
          { label: 'Asset Downloads', value: files.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0).toString(), icon: Download, trend: '+45%', up: true },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="p-6 bg-graphite/50 border border-white/5 rounded-[32px] space-y-4"
          >
            <div className="flex justify-between items-start">
              <div className="p-3 bg-white/5 rounded-2xl">
                <stat.icon className="w-5 h-5 text-amber-accent" />
              </div>
              <div className={cn(
                "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full",
                stat.up ? "text-emerald-400 bg-emerald-400/10" : "text-rose-400 bg-rose-400/10"
              )}>
                {stat.up ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {stat.trend}
              </div>
            </div>
            <div>
              <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest block mb-1">
                {stat.label}
              </span>
              <span className="text-3xl font-serif text-white italic">{stat.value}</span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Tabs Nav */}
      <div className="flex gap-2 p-1 bg-white/5 rounded-full border border-white/5 w-fit overflow-x-auto no-scrollbar max-w-full">
        {[
          { id: 'overview', icon: TrendingUp, label: 'Overview' },
          { id: 'cms', icon: BookOpen, label: 'CMS' },
          { id: 'users', icon: Users, label: 'Users' },
          { id: 'earnings', icon: DollarSign, label: 'Earnings' },
          { id: 'reviews', icon: MessageSquare, label: 'Reviews' },
          { id: 'database', icon: Database, label: 'DB Explorer & Backups' },
          { id: 'scalability', icon: Zap, label: 'Scalability & Load' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AdminTab)}
            className={cn(
              "px-6 py-2 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shrink-0",
              activeTab === tab.id 
                ? "bg-amber-accent text-black" 
                : "text-white/40 hover:text-white"
            )}
          >
            <tab.icon className="w-3" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className="min-h-[400px]"
        >
          {activeTab === 'cms' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-2xl font-serif text-white italic">Recipe Management</h2>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="text"
                    placeholder="Search recipes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-11 pr-6 py-3 bg-white/5 border border-white/10 rounded-full text-xs text-white focus:border-amber-accent transition-all outline-none"
                  />
                </div>
              </div>

              <div className="bg-graphite/50 border border-white/5 rounded-[32px] overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Recipe</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Cuisine</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Rating</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Status</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recipes.map((recipe) => (
                      <tr key={recipe.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/5 shrink-0">
                              <img src={recipe.imageUrl} alt="" className="w-full h-full object-cover" />
                            </div>
                            <div>
                              <span className="text-white font-medium block">{recipe.name}</span>
                              <span className="text-[10px] text-white/40 uppercase tracking-widest">{recipe.category}</span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <span className="text-xs text-white/60">{recipe.cuisine}</span>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-1">
                            <Star className="w-3 h-3 text-amber-accent fill-amber-accent" />
                            <span className="text-xs text-white font-mono">{recipe.averageRating.toFixed(1)}</span>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          {recipe.status === 'approved' ? (
                            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold uppercase rounded-full tracking-wider">
                              Approved
                            </span>
                          ) : recipe.status === 'rejected' ? (
                            <span className="px-2.5 py-1 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[10px] font-bold uppercase rounded-full tracking-wider">
                              Rejected
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold uppercase rounded-full tracking-wider">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2">
                            {recipe.status !== 'approved' && (
                              <button 
                                onClick={() => recipe.id && handleApproveRecipe(recipe.id)}
                                title="Approve recipe submission"
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-400 hover:text-black rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-emerald-500/20"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                              </button>
                            )}
                            {recipe.status !== 'rejected' && (
                              <button 
                                onClick={() => recipe.id && handleRejectRecipe(recipe.id)}
                                title="Reject recipe submission"
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500 text-rose-400 hover:text-black rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-rose-500/20"
                              >
                                <XCircle className="w-3.5 h-3.5" /> Reject
                              </button>
                            )}
                            <button 
                              onClick={() => recipe.id && handleDeleteRecipe(recipe.id)}
                              title="Delete permanently"
                              className="p-2 hover:bg-rose-500/15 rounded-lg text-white/40 hover:text-rose-400 transition-colors shrink-0"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h2 className="text-2xl font-serif text-white italic">User Management</h2>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                  <input 
                    type="text"
                    placeholder="Search users by name, email or UID..."
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-6 py-3 bg-white/5 border border-white/10 rounded-full text-xs text-white focus:border-amber-accent transition-all outline-none"
                  />
                </div>
              </div>

              <div className="bg-graphite/50 border border-white/5 rounded-[32px] overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-white/5">
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">User</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Role</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Tier / Status</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Joined</th>
                      <th className="px-8 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.filter(u => {
                      const s = userSearchTerm.toLowerCase().trim();
                      if (!s) return true;
                      return (
                        (u.email || '').toLowerCase().includes(s) ||
                        (u.displayName || '').toLowerCase().includes(s) ||
                        (u.uid || '').toLowerCase().includes(s)
                      );
                    }).map((u) => {
                      const userFiles = files.filter(f => f.userId === u.uid || f.userEmail === u.email);
                      return (
                        <>
                          <tr key={u.uid} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                            <td className="px-8 py-6">
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-full overflow-hidden bg-amber-accent/20 flex items-center justify-center shrink-0">
                                  {u.photoURL ? <img src={u.photoURL} alt="" className="w-full h-full object-cover" /> : <Users className="w-4 h-4 text-amber-accent" />}
                                </div>
                                <div>
                                  <span className="text-white font-medium block">{u.displayName || "Gourmet Chef"}</span>
                                  <span className="text-[10px] text-white/40 lowercase tracking-widest">{u.email}</span>
                                </div>
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className={cn(
                                "text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border",
                                u.role === 'admin' 
                                  ? "bg-amber-500/10 border-amber-500/20 text-amber-500" 
                                  : "bg-white/5 border-white/10 text-white/40"
                              )}>
                                {u.role || 'user'}
                              </span>
                            </td>
                            <td className="px-8 py-6">
                              <div className={cn(
                                "inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest",
                                u.subscription?.status === 'active' || u.subscription?.status === 'trial'
                                  ? "bg-amber-accent/10 border-amber-accent/20 text-amber-accent"
                                  : "bg-white/5 border-white/10 text-white/20"
                              )}>
                                <Shield className="w-3 h-3" />
                                {u.subscription?.status ? u.subscription.status.toUpperCase() : 'FREE'}
                              </div>
                            </td>
                            <td className="px-8 py-6">
                              <span className="text-xs text-white/60">
                                {u.createdAt ? format(new Date(u.createdAt), 'MMM d, yyyy') : 'N/A'}
                              </span>
                            </td>
                            <td className="px-8 py-6 text-right flex items-center justify-end gap-2 flex-wrap">
                              <button
                                onClick={() => setExpandedUserId(expandedUserId === u.uid ? null : u.uid)}
                                className={cn(
                                  "p-2 rounded-lg transition-colors text-amber-accent bg-white/5 hover:bg-white/10"
                                )}
                                title="View User Uploaded Assets"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Toggle Role */}
                              {u.role === 'admin' ? (
                                <button
                                  onClick={() => updateUserRole(u.uid, 'user')}
                                  className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-red-500/10 hover:bg-red-500 hover:text-black border border-red-500/20 text-red-400 rounded-lg transition-all"
                                  title="Revoke Admin privileges"
                                >
                                  Demote
                                </button>
                              ) : (
                                <button
                                  onClick={() => updateUserRole(u.uid, 'admin')}
                                  className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-blue-500/10 hover:bg-blue-500 hover:text-black border border-blue-500/20 text-blue-400 rounded-lg transition-all"
                                  title="Promote to Administrator"
                                >
                                  Make Admin
                                </button>
                              )}

                              {/* Subscription Activation / Cancellation */}
                              {u.subscription?.status === 'active' || u.subscription?.status === 'trial' ? (
                                <button
                                  onClick={() => updateUserSubscription(u.uid, 'canceled')}
                                  className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-rose-500/10 hover:bg-rose-500 hover:text-white border border-rose-500/20 text-rose-400 rounded-lg transition-all"
                                  title="Cancel Premium subscription"
                                >
                                  Cancel Sub
                                </button>
                              ) : (
                                <button
                                  onClick={() => updateUserSubscription(u.uid, 'active')}
                                  className="px-2.5 py-1 text-[9px] font-black uppercase tracking-wider bg-emerald-500/10 hover:bg-emerald-500 hover:text-black border border-emerald-500/20 text-emerald-400 rounded-lg transition-all"
                                  title="Activate subscription and start 30 days timer"
                                >
                                  Activate
                                </button>
                              )}

                              {/* Expire shortcut */}
                              {u.subscription?.status !== 'expired' && u.subscription?.status !== 'none' && (
                                <button
                                  onClick={() => updateUserSubscription(u.uid, 'expired')}
                                  className="px-2 py-1 text-[9px] font-bold bg-stone-500/10 hover:bg-stone-500 hover:text-white border border-stone-500/20 text-stone-400 rounded-lg transition-all"
                                  title="Expire Access Immediately"
                                >
                                  Expire
                                </button>
                              )}
                            </td>
                          </tr>
                          {expandedUserId === u.uid && (
                            <tr key={`${u.uid}-files`}>
                              <td colSpan={4} className="px-8 py-6 bg-black/45 border-b border-white/5">
                                <div className="space-y-4">
                                  <h4 className="text-xs font-black uppercase text-amber-accent tracking-widest">
                                    Uploaded culinary assets ({userFiles.length})
                                  </h4>
                                  {userFiles.length === 0 ? (
                                    <p className="text-xs text-white/40 italic">No files uploaded by this user yet.</p>
                                  ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                      {userFiles.map(f => (
                                        <div key={f.id} className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3">
                                          <div className="flex justify-between items-start">
                                            <div className="truncate">
                                              <p className="text-xs font-medium text-white truncate" title={f.fileName}>{f.fileName}</p>
                                              <p className="text-[10px] text-white/40 uppercase mt-0.5">{f.mimeType || 'binary/octet-stream'}</p>
                                            </div>
                                            <span className="text-[10px] font-mono text-amber-accent bg-amber-accent/10 py-1 px-2 rounded-full uppercase shrink-0">
                                              {f.downloadCount || 0} downloads
                                            </span>
                                          </div>
                                          <div className="flex justify-between text-[10px] font-medium text-white/40 pt-2 border-t border-white/5">
                                            <span>Size: {formatBytes(f.fileSize)}</span>
                                            <span>{f.status === 'active' ? 'Active' : 'Deleted'}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'earnings' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-serif text-white italic">Earnings & Growth</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-graphite/50 border border-white/5 rounded-[32px] space-y-8">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest">Revenue Breakdown</h3>
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-amber-accent" />
                        <span className="text-[10px] text-white/40 uppercase font-black">Subs</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-white/20" />
                        <span className="text-[10px] text-white/40 uppercase font-black">Ads</span>
                      </div>
                    </div>
                           <div className="h-48 flex items-end gap-3 px-4">
                    {weeklyHeights.map((day, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-2 group relative">
                        <div className="w-full space-y-1">
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${day.percentage}%` }}
                            className="w-full bg-amber-accent rounded-t-lg group-hover:bg-white transition-colors"
                          />
                          <motion.div 
                            initial={{ height: 0 }}
                            animate={{ height: `${day.percentage * 0.1}%` }}
                            className="w-full bg-white/10 rounded-b-lg"
                          />
                        </div>
                        <span className="text-[8px] text-white/20 font-black uppercase">{['M','T','W','T','F','S','S'][i]}</span>
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-black/90 border border-white/5 text-[8px] text-amber-accent rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10 font-mono">
                          ${day.amount.toFixed(2)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
 
                <div className="space-y-4">
                  <h3 className="text-[10px] font-black text-white/20 uppercase tracking-widest px-4 flex justify-between items-center">
                    <span>Recent Transactions</span>
                    <span className="text-[8px] text-amber-accent/80 font-mono select-none">LIVE FEED</span>
                  </h3>
                  <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-white/10">
                    {mergedTransactionsList.length === 0 ? (
                      <div className="h-40 flex flex-col items-center justify-center text-white/30 border border-dashed border-white/5 rounded-[24px] text-xs italic">
                        <span>No transactions recorded.</span>
                        <span className="text-[10px] mt-1 text-white/10 font-mono">Listening on Paystack webhook / ledger</span>
                      </div>
                    ) : (
                      mergedTransactionsList.map((tx, i) => (
                        <div key={tx.id || i} className="flex justify-between items-center p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/[0.08] transition-colors">
                          <div className="flex items-center gap-3 truncate">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${tx.status === 'success' ? 'bg-emerald-500/10' : 'bg-amber-500/10'}`}>
                              {tx.status === 'success' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                              ) : (
                                <XCircle className="w-4 h-4 text-amber-500" />
                              )}
                            </div>
                            <div className="truncate">
                              <span className="text-xs text-white font-medium block truncate select-all" title={tx.user}>{tx.user}</span>
                              <div className="flex items-center gap-2 mt-0.5 text-[9px] text-white/40 uppercase tracking-wider font-mono">
                                <span>{tx.time}</span>
                                <span>•</span>
                                <span className="text-[8px] text-white/30 truncate" title={tx.id}>{tx.id.slice(0, 10)}...</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className={`text-xs font-mono font-black block ${tx.status === 'success' ? 'text-emerald-400' : 'text-amber-500 line-through'}`}>{tx.amount}</span>
                            <span className="text-[8px] text-white/25 uppercase font-bold tracking-wide">{tx.method}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>          </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-6">
              <h2 className="text-2xl font-serif text-white italic">Review Moderation</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {reviews.map((review) => (
                  <div key={review.id} className="p-6 bg-graphite/50 border border-white/5 rounded-[32px] space-y-4 relative group">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden bg-white/5 shrink-0">
                          {review.userPhoto && <img src={review.userPhoto} alt="" className="w-full h-full object-cover" />}
                        </div>
                        <div>
                          <span className="text-xs text-white font-medium block">{review.userName}</span>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star key={i} className={cn("w-2 h-2", i < review.rating ? "fill-amber-accent text-amber-accent" : "text-white/10")} />
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="p-2 hover:bg-rose-500/10 rounded-lg text-rose-500 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="p-2 hover:bg-emerald-500/10 rounded-lg text-emerald-500 transition-colors">
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-white/60 italic leading-relaxed">
                      "{review.comment}"
                    </p>
                    <div className="flex items-center justify-between pt-4 border-t border-white/5">
                      <span className="text-[10px] text-amber-accent/60 uppercase font-black tracking-widest">Recipe ID: {review.recipeId.slice(0, 8)}...</span>
                      <span className="text-[10px] text-white/20 font-mono italic">
                        {review.createdAt instanceof Timestamp ? format(review.createdAt.toDate(), 'MMM d, h:mm a') : 'Recently'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2 space-y-6">
                <div className="p-8 bg-graphite/50 border border-white/5 rounded-[48px] space-y-6">
                   <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] flex justify-between items-center">
                     <span>Culinary Asset Uploads & Downloads Log</span>
                     <span className="text-[9px] text-amber-accent bg-amber-accent/10 px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse font-mono">LIVE FEED</span>
                   </h3>
                   <div className="max-h-60 overflow-y-auto space-y-3 pr-2 scrollbar-thin scrollbar-thumb-white/10">
                      {files.length === 0 ? (
                         <div className="h-40 flex items-center justify-center text-white/20 text-xs italic">
                            No upload/download events registered yet.
                         </div>
                      ) : (
                         files.slice(0, 50).map((f) => {
                            const latestHistory = f.history && f.history[f.history.length - 1];
                            return (
                               <div key={f.id} className="p-4 bg-white/5 border border-white/5 rounded-2xl flex items-center justify-between gap-4">
                                  <div className="truncate">
                                     <p className="text-xs text-white font-medium truncate">{f.fileName}</p>
                                     <p className="text-[10px] text-white/40 mt-1 select-all truncate">{f.userEmail || f.userId}</p>
                                     {latestHistory && (
                                        <p className="text-[10px] text-amber-accent/80 italic mt-1 font-mono leading-relaxed truncate">
                                           Last action: {latestHistory.details}
                                        </p>
                                     )}
                                  </div>
                                  <div className="text-right shrink-0">
                                     <span className="text-xs text-amber-accent font-mono block">{f.downloadCount || 0} downloads</span>
                                     <span className="text-[9px] text-white/20 uppercase block font-bold">{formatBytes(f.fileSize)}</span>
                                  </div>
                               </div>
                            )
                         })
                      )}
                   </div>
                </div>

                <div className="p-8 bg-graphite/50 border border-white/5 rounded-[48px]">
                   <div className="flex justify-between items-center mb-8">
                     <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em]">Pending Content</h3>
                     <button className="text-[10px] font-black text-amber-accent uppercase tracking-widest border-b border-amber-accent/20">View All</button>
                   </div>
                   <div className="space-y-4">
                      {recipes.slice(0, 3).map((r, i) => (
                        <div key={i} className="flex items-center justify-between p-4 border border-white/5 rounded-2xl hover:bg-white/5 transition-all group">
                           <div className="flex items-center gap-4">
                             <div className="w-12 h-12 rounded-xl bg-white/5 overflow-hidden">
                               <img src={r.imageUrl} alt="" className="w-full h-full object-cover" />
                             </div>
                             <div>
                               <span className="text-xs text-white font-medium block">{r.name}</span>
                               <span className="text-[10px] text-white/40 uppercase tracking-widest">By Gourmet Artifex</span>
                             </div>
                           </div>
                           <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-amber-accent transition-all" />
                        </div>
                      ))}
                   </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-8 bg-amber-accent text-black rounded-[48px] space-y-6 shadow-[0_0_50px_rgba(245,158,11,0.2)]">
                   <h3 className="text-xs font-black uppercase tracking-[0.2em]">Growth Sprint</h3>
                   <p className="text-2xl font-serif italic leading-tight">
                     You're on track to hit 100k revenue milestone early.
                   </p>
                   <div className="h-[2px] bg-black/10 w-full relative">
                      <div className="absolute left-0 top-0 h-full bg-black w-[75%]" />
                   </div>
                   <div className="flex justify-between items-center">
                     <span className="text-[10px] font-black uppercase tracking-widest">Quarterly Target</span>
                     <span className="text-[10px] font-mono italic">75% Complete</span>
                   </div>
                </div>

                <div className="p-8 bg-white/5 border border-white/5 rounded-[48px] space-y-6">
                   <h3 className="text-xs font-black text-white/40 uppercase tracking-[0.2em]">Team Notes</h3>
                   <div className="space-y-4">
                      {[
                        'Review New AI Model 05-20',
                        'Update Paystack Webhooks',
                        'Moderation sweep required'
                      ].map((note, i) => (
                        <div key={i} className="flex gap-3 items-start">
                           <div className="w-1 h-1 rounded-full bg-amber-accent mt-2" />
                           <p className="text-[10px] text-white/80 leading-relaxed italic">{note}</p>
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'scalability' && (
            <div className="space-y-8">
              {/* Introduction & Explanatory Card */}
              <div className="p-8 bg-gradient-to-br from-graphite to-coal border border-white/5 rounded-[40px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-accent/5 blur-[90px] rounded-full -mr-20 -mt-20"></div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-3">
                    <span className="px-3 py-1 bg-amber-accent/10 border border-amber-accent/20 rounded-full text-[9px] font-black uppercase tracking-widest text-amber-accent inline-flex items-center gap-1.5 leading-none">
                      <Cpu className="w-3.5 h-3.5" /> High Concurrency Architecture
                    </span>
                    <h2 className="text-3xl font-serif text-white italic tracking-tight">Systems Simulation Testing</h2>
                    <p className="text-xs text-white/60 max-w-2xl leading-relaxed">
                      Daily Meal Recipe's backend incorporates enterprise-grade network resource optimizations. Built with 
                      <strong> Node Sockets Pooling (TCP Keep-Alive)</strong>, 
                      <strong> Express dynamic FIFO queue request throttling (max 100 concurrent slots)</strong>, and 
                      <strong> Automated LRU cache TTL indexing</strong>. Run live simulated traffic surges below to prove server scalability!
                    </p>
                  </div>
                  <button
                    disabled={isClearingCache}
                    onClick={handleClearCache}
                    className="px-6 py-3.5 bg-white/5 hover:bg-white/10 text-white border border-white/5 hover:border-white/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer flex items-center gap-2"
                  >
                    <Activity className="w-3.5 h-3.5 text-amber-accent" />
                    {isClearingCache ? "Flushing..." : "Flush Server Cache"}
                  </button>
                </div>
              </div>

              {/* Live Telemetry Bar & Simulator controls */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Controller Panel */}
                <div className="lg:col-span-1 p-8 bg-graphite/50 border border-white/5 rounded-[40px] space-y-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-[0.25em] flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-accent" /> Setup Surge
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-2">Simulated Concurrency ({concurrency} Users)</label>
                      <input 
                        type="range" 
                        min="10" 
                        max="300" 
                        step="10" 
                        value={concurrency}
                        onChange={(e) => setConcurrency(Number(e.target.value))}
                        className="w-full accent-amber-accent bg-white/5 rounded-lg h-2"
                      />
                      <div className="flex justify-between text-[8px] font-mono text-white/20 uppercase mt-1">
                        <span>Min (10)</span>
                        <span>Paystack Cap (100)</span>
                        <span>Heavy Burst (200+)</span>
                        <span>Max (300)</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                      <div>
                        <span className="text-xs text-white font-medium block">Intelligent LRU Cache</span>
                        <span className="text-[9px] text-white/40 uppercase">Load hits serve under 1ms</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={useCache}
                        onChange={(e) => setUseCache(e.target.checked)}
                        className="w-4 h-4 accent-amber-accent cursor-pointer rounded border-white/10 bg-white/5"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleRunLoadTest}
                    disabled={isTesting}
                    className={cn(
                      "w-full py-4 rounded-2xl text-[10px] uppercase tracking-widest font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg",
                      isTesting 
                        ? "bg-amber-accent/45 text-black/50 cursor-not-allowed" 
                        : "bg-amber-accent text-black hover:bg-white active:scale-95 shadow-amber-accent/10"
                    )}
                  >
                    {isTesting ? (
                      <>
                        <Activity className="w-4 h-4 animate-spin text-black" />
                        Simulating Surge...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Trigger Surge Simulation
                      </>
                    )}
                  </button>
                </div>

                {/* Telemetry Panel */}
                <div className="lg:col-span-2 p-8 bg-graphite/50 border border-white/5 rounded-[40px] space-y-6">
                  <h3 className="text-sm font-bold text-white uppercase tracking-[0.25em] flex items-center justify-between font-serif tracking-normal italic">
                    <span>Live Server Telemetry</span>
                    <span className="text-[8px] font-black uppercase px-2 py-0.5 bg-emerald-400/10 text-emerald-400 rounded-full tracking-wider animate-pulse">● Live Tracking</span>
                  </h3>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                      <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-1">Active Express Slots</span>
                      <span className="text-3xl font-mono text-white leading-none block">{telemetry?.activeRequests ?? 0}</span>
                      <span className="text-[7px] font-bold text-amber-accent/60 uppercase tracking-wider block mt-2">Max Limit: {telemetry?.maxConcurrentRequests ?? 100}</span>
                    </div>

                    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                      <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-1">Wait Queue Depth</span>
                      <span className="text-3xl font-mono text-white leading-none block">{telemetry?.queueDepth ?? 0}</span>
                      <span className="text-[7px] font-bold text-white/20 uppercase tracking-wider block mt-2">Buffer Threshold: {telemetry?.maxQueueCapacity ?? 200}</span>
                    </div>

                    <div className="p-5 bg-white/5 border border-white/5 rounded-xl">
                      <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-1">Node VM Memory</span>
                      <span className="text-xl font-mono text-white leading-none block">
                        {telemetry?.heapUsedBytes ? `${(telemetry.heapUsedBytes / 1024 / 1024).toFixed(1)} MB` : "N/A"}
                      </span>
                      <span className="text-[7px] font-bold text-white/20 uppercase tracking-wider block mt-2">GC Auto allocation</span>
                    </div>

                    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl">
                      <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-1">Pooled TCP Sockets</span>
                      <span className="text-2xl font-mono text-white leading-none block">
                        {((telemetry?.outboundHttpsAgent?.activeRequests ?? 0) + (telemetry?.outboundHttpsAgent?.freeSockets ?? 0)) || 1}
                      </span>
                      <span className="text-[7px] font-bold text-amber-accent/60 uppercase tracking-wider block mt-2">Outbound Socket Cap: {telemetry?.outboundHttpsAgent?.maxSockets ?? 350}</span>
                    </div>

                    <div className="p-5 bg-white/5 border border-white/5 rounded-xl">
                      <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-1">Server Keep-Alive</span>
                      <span className="text-2xl font-mono text-white leading-none block">
                        {telemetry?.keepAliveTimeout ? `${telemetry.keepAliveTimeout / 1000}s` : "61s"}
                      </span>
                      <span className="text-[7px] font-bold text-white/20 uppercase tracking-wider block mt-2">Prevents socket stall</span>
                    </div>

                    <div className="p-5 bg-white/5 border border-white/5 rounded-xl">
                      <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-1">Server Uptime</span>
                      <span className="text-2xl font-mono text-white leading-none block">
                        {telemetry?.uptimeSeconds ? `${telemetry.uptimeSeconds}s` : "N/A"}
                      </span>
                      <span className="text-[7px] font-bold text-white/20 uppercase tracking-wider block mt-2">Continuous runtime</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Simulation Result Area */}
              {testResult && (
                <motion.div
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-8 bg-gradient-to-br from-coal via-graphite/40 to-coal border border-amber-accent/10 rounded-[40px] space-y-8"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-500/10 rounded-2xl text-emerald-400">
                        <CheckCircle2 className="w-5 h-5 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white uppercase tracking-wider">Surge Simulation Report</h4>
                        <span className="text-[9px] text-white/40 uppercase font-mono">Completed at: {new Date().toLocaleTimeString()}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-3 py-1 rounded-full uppercase tracking-widest">
                        {testResult.successRate.toFixed(1)}% Success Rate
                      </span>
                      <span className="text-[10px] text-white/40 font-bold uppercase py-1 px-3 bg-white/5 rounded-full">
                        {testResult.concurrencySimulated} Threads
                      </span>
                    </div>
                  </div>

                  {/* Grid of Simulation metrics */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl relative">
                      <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-2">Total Surge Time</span>
                      <span className="text-2xl font-mono text-white block leading-none">{testResult.totalExecutionTimeMs}ms</span>
                    </div>

                    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl relative">
                      <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-2">Mean Latency</span>
                      <span className="text-2xl font-mono text-white block leading-none">{testResult.metrics.avgLatencyMs}ms</span>
                    </div>

                    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl relative">
                      <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-1">p95 Latency</span>
                      <span className="text-2xl font-mono text-amber-accent block leading-none">{testResult.metrics.p95LatencyMs}ms</span>
                      <span className="text-[7px] text-white/20 uppercase tracking-wider block mt-2">Maximum peak under congestion</span>
                    </div>

                    <div className="p-5 bg-white/5 border border-white/5 rounded-2xl relative">
                      <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-1">Cache Hit Ratio</span>
                      <span className="text-2xl font-mono text-white block leading-none">{testResult.caching.hitRatio}%</span>
                      <span className="text-[7px] text-amber-accent/60 uppercase tracking-wider block mt-2">{testResult.caching.cacheHits} Cache hits saved query overhead</span>
                    </div>
                  </div>

                  {/* High Concurrency Highlights */}
                  <div className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4">
                    <h5 className="text-[10px] font-black uppercase tracking-widest text-white/60">Load Performance Diagnostics</h5>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-light text-white/70 leading-relaxed md:divide-x md:divide-white/5">
                      <div className="pr-4 space-y-2">
                        <p>
                          🔥 <strong>Graceful Queuing</strong>: Active express requests are fully bounded under a strict ceiling (<span className="text-amber-accent font-semibold">100 concurrent requests max</span>). Spikes are buffered in the FIFO queue waiting for completed threads, avoiding backend crashes.
                        </p>
                      </div>
                      <div className="md:pl-6 space-y-2">
                        <p>
                          ⚡ <strong>Cached Serving</strong>: Repeating operations can skip database bottlenecks entirely by retrieving data instantly from <strong>LRU cached elements</strong> in memory, optimizing throughput for repeated calls under 1ms.
                        </p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          )}

          {activeTab === 'database' && (
            <div className="space-y-8 animate-fade-in text-left">
              {/* Top Summary Card */}
              <div className="p-8 bg-gradient-to-br from-graphite to-coal border border-white/5 rounded-[40px] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-80 h-80 bg-amber-accent/5 blur-[90px] rounded-full -mr-20 -mt-20 block"></div>
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
                  <div className="space-y-3">
                    <span className="px-3 py-1 bg-amber-accent/10 border border-amber-accent/20 rounded-full text-[9px] font-black uppercase tracking-widest text-amber-accent inline-flex items-center gap-1.5 leading-none">
                      <Database className="w-3.5 h-3.5" /> High-Clearance Database Hub
                    </span>
                    <h2 className="text-3xl font-serif text-white italic tracking-tight">Database Explorer & Backups</h2>
                    <p className="text-xs text-white/60 max-w-2xl leading-relaxed">
                      This panel connects directly to your secure Firestore backend. You have live authorization to inspect full documents, moderate specific records, or pull instant encrypted snapshot backups of the entire application.
                    </p>
                  </div>
                  <button
                    disabled={isExportingAll}
                    onClick={handleDownloadAllBackups}
                    className="px-6 py-3.5 bg-amber-accent hover:bg-white text-black rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shrink-0 cursor-pointer flex items-center gap-2 shadow-lg shadow-amber-accent/10 hover:shadow-white/10 active:scale-95"
                  >
                    <Download className="w-3.5 h-3.5" />
                    {isExportingAll ? "Exporting Full DB..." : "Download Full Database Backup"}
                  </button>
                </div>
              </div>

              {/* DBA sub-navigation bar */}
              <div className="flex border-b border-white/5 gap-6">
                <button
                  onClick={() => setDbSubTab('explorer')}
                  className={cn(
                    "pb-4 text-xs font-black uppercase tracking-widest transition-all cursor-pointer border-b-2",
                    dbSubTab === 'explorer' 
                      ? "border-amber-accent text-amber-accent" 
                      : "border-transparent text-white/40 hover:text-white"
                  )}
                >
                  📁 Live Collections Explorer
                </button>
                <button
                  onClick={() => setDbSubTab('performance')}
                  className={cn(
                    "pb-4 text-xs font-black uppercase tracking-widest transition-all cursor-pointer border-b-2",
                    dbSubTab === 'performance' 
                      ? "border-amber-accent text-amber-accent" 
                      : "border-transparent text-white/40 hover:text-white"
                  )}
                >
                  ⚡ DBA Performance & Diagnostic Hub
                </button>
              </div>

              {dbSubTab === 'explorer' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* 1. Collection Selector Sidebar */}
                  <div className="lg:col-span-1 p-6 bg-graphite/40 border border-white/5 rounded-[32px] space-y-6">
                    <h3 className="text-sm font-bold text-white uppercase tracking-widest block border-b border-white/5 pb-4">
                      Collections
                    </h3>
                    <div className="flex flex-row lg:flex-col gap-1 overflow-x-auto no-scrollbar lg:overflow-visible pb-2 lg:pb-0">
                      {[
                        { id: 'users', label: 'User Profiles', description: 'System account details' },
                        { id: 'recipes', label: 'Recipes Library', description: 'Full gourmet files' },
                        { id: 'reviews', label: 'Reviews', description: 'User reviews and moderations' },
                        { id: 'pantry', label: 'Pantries', description: 'User current kitchen assets' },
                        { id: 'mealPlans', label: 'Meal Planners', description: 'Scheduled calendar plans' },
                        { id: 'shoppingLists', label: 'Shopping Lists', description: 'Active items checklist' },
                        { id: 'favorites', label: 'Favorites', description: 'Bookmarked lists' },
                        { id: 'cookingLogs', label: 'Cooking Logs', description: 'Completed recipes history' },
                        { id: 'sharedTodos', label: 'Family To-dos', description: 'Collaborative chores data' },
                        { id: 'families', label: 'Family Kitchens', description: 'Group directories' },
                        { id: 'files', label: 'Culinary Assets', description: 'Secure user uploaded files' }
                      ].map((col) => (
                        <button
                          key={col.id}
                          onClick={() => {
                            setDbCollection(col.id);
                            setDbSearch('');
                          }}
                          className={cn(
                            "w-full text-left p-4 rounded-2xl transition-all cursor-pointer flex flex-col gap-1 shrink-0 lg:shrink",
                            dbCollection === col.id 
                              ? "bg-white/10 border border-white/10 text-white" 
                              : "hover:bg-white/5 border border-transparent text-white/50 hover:text-white"
                          )}
                        >
                          <span className="text-xs font-bold uppercase tracking-wider">{col.label}</span>
                          <span className="text-[10px] text-white/40 font-normal lowercase max-w-full block truncate">{col.description}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* 2. Documents Grid & Search */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Search and Table Actions Header */}
                    <div className="flex flex-col sm:flex-row gap-4 justify-between items-stretch sm:items-center">
                      <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
                        <input 
                          type="text"
                          placeholder={`Search ${dbCollection} in page...`}
                          value={dbSearch}
                          onChange={(e) => setDbSearch(e.target.value)}
                          className="pl-11 pr-6 py-3.5 bg-white/5 border border-white/10 rounded-2xl text-xs text-white focus:border-amber-accent transition-all outline-none w-full"
                        />
                      </div>
                      
                      <button
                        disabled={dbDocuments.length === 0}
                        onClick={() => handleDownloadBackup(dbCollection, dbDocuments)}
                        className="px-5 py-3.5 bg-white/5 border border-white/5 hover:border-amber-accent/20 hover:bg-white/10 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer flex items-center gap-2 justify-center leading-none"
                      >
                        <Download className="w-3" />
                        Backup JSON
                      </button>
                    </div>

                    {/* Document Listing Area */}
                    <div className="bg-graphite/30 border border-white/5 rounded-[32px] overflow-hidden min-h-[400px]">
                      {dbLoading ? (
                        <div className="py-24 flex flex-col items-center justify-center space-y-4">
                          <Activity className="w-8 h-8 text-amber-accent animate-spin" />
                          <span className="text-[10px] uppercase font-bold tracking-widest text-white/40">Loading Database Nodes...</span>
                        </div>
                      ) : dbDocuments.length === 0 ? (
                        <div className="py-32 text-center space-y-2">
                          <Database className="w-8 h-8 text-white/10 mx-auto" />
                          <p className="text-xs text-white/40 italic">No records present or found in collection "{dbCollection}"</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-white/5 bg-white/[0.01]">
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Document ID</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Summary / Identification</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/20">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {dbDocuments
                                .filter(doc => {
                                  if (!dbSearch) return true;
                                  const searchStr = dbSearch.toLowerCase();
                                  return (
                                    doc.id.toLowerCase().includes(searchStr) ||
                                    JSON.stringify(doc).toLowerCase().includes(searchStr)
                                  );
                                })
                                .map((docItem) => (
                                  <tr key={docItem.id} className={cn("border-b border-white/5 hover:bg-white/[0.02] transition-colors group", selectedDoc?.id === docItem.id && "bg-white/[0.03]")}>
                                    <td className="px-6 py-5 text-xs font-mono text-white/70">
                                      {docItem.id}
                                    </td>
                                    <td className="px-6 py-5">
                                      <div className="max-w-[280px] truncate text-[11px] text-white/50 font-sans">
                                        {docItem.displayName || docItem.name || docItem.item || docItem.text || docItem.fileName || docItem.email || (
                                          <span className="italic text-white/20 font-mono">
                                            {JSON.stringify(docItem).slice(0, 80)}...
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                    <td className="px-6 py-5">
                                      <div className="flex items-center gap-2">
                                        <button 
                                          onClick={() => setSelectedDoc(docItem)}
                                          className="p-2 bg-white/5 hover:bg-amber-accent/10 border border-white/5 hover:border-amber-accent/20 rounded-xl text-white/40 hover:text-amber-accent transition-all cursor-pointer"
                                          title="View JSON"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <button 
                                          onClick={() => handleDbDeleteDoc(dbCollection, docItem.id)}
                                          className="p-2 bg-white/5 hover:bg-rose-500/15 border border-white/5 hover:border-rose-500/20 rounded-xl text-white/40 hover:text-rose-400 transition-all cursor-pointer"
                                          title="Erase Document"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-8 animate-fade-in text-left">
                  {/* Grid 1: EXPLAIN ANALYZE Simulator & Connection Pool stats */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    
                    {/* EXPLAIN ANALYZE Panel */}
                    <div className="lg:col-span-2 p-8 bg-graphite/40 border border-white/5 rounded-[40px] space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className="p-2.5 bg-amber-accent/10 border border-amber-accent/20 rounded-xl text-amber-accent">
                            <Activity className="w-4 h-4" />
                          </div>
                          <div>
                            <h3 className="text-sm font-bold text-white uppercase tracking-wider">EXPLAIN ANALYZE execution plan</h3>
                            <span className="text-[10px] text-white/40 uppercase">Interactive Query Strategy Visualizer</span>
                          </div>
                        </div>
                        <button
                          onClick={fetchExplainPlan}
                          disabled={explainLoading}
                          className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white border border-white/5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer"
                        >
                          {explainLoading ? "Re-running plan..." : "Run Plan Analysis"}
                        </button>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-white/40 block mb-2">Target SQL Database Query</label>
                          <input
                            type="text"
                            value={explainQuery}
                            onChange={(e) => setExplainQuery(e.target.value)}
                            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-xs text-white focus:border-amber-accent outline-none font-mono"
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl">
                          <div>
                            <span className="text-xs text-white font-medium block">Enable Case-Insensitive B-Tree Indexes</span>
                            <span className="text-[9px] text-white/40 uppercase font-mono">Instructs pg-planner to bypass Sequential Scans</span>
                          </div>
                          <input
                            type="checkbox"
                            checked={explainIndexScanning}
                            onChange={(e) => setExplainIndexScanning(e.target.checked)}
                            className="w-4 h-4 accent-amber-accent cursor-pointer rounded border-white/10 bg-white/5"
                          />
                        </div>

                        {explainResult && (
                          <div className="space-y-4">
                            {/* Fast metrics visual blocks */}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                              <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                                <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-1">Execution Mode</span>
                                <span className={cn(
                                  "text-xs font-bold font-mono tracking-wide block",
                                  explainResult.strategy.includes("Seq Scan") ? "text-rose-400" : "text-emerald-400"
                                )}>
                                  {explainResult.strategy}
                                </span>
                              </div>
                              <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                                <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-1">Total Cost estimate</span>
                                <span className="text-xs font-mono text-white leading-none block">{explainResult.totalCost}</span>
                                <span className="text-[7px] text-white/20 uppercase block mt-1">Planner cost units</span>
                              </div>
                              <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                                <span className="text-[8px] font-black uppercase text-white/40 tracking-widest block mb-1">Execution Duration</span>
                                <span className={cn(
                                  "text-xs font-mono leading-none block",
                                  explainResult.executionTimeMs > 50 ? "text-amber-accent font-bold" : "text-emerald-400"
                                )}>
                                  {explainResult.executionTimeMs} ms
                                </span>
                                <span className="text-[7px] text-white/20 uppercase block mt-1">Under 1ms is optimal!</span>
                              </div>
                            </div>

                            {/* Plan log code display */}
                            <div className="p-5 bg-black/40 border border-white/5 rounded-2xl space-y-2">
                              <span className="text-[8px] font-black uppercase tracking-widest text-white/30 block">Physical Query Plan Execution Tree</span>
                              <pre className="text-[10px] font-mono leading-relaxed text-emerald-400/90 overflow-x-auto whitespace-pre no-scrollbar">
                                {explainResult.explainText}
                              </pre>
                            </div>

                            {/* Advice banner */}
                            <div className={cn(
                              "p-4 rounded-xl border text-[11px] leading-relaxed",
                              explainIndexScanning 
                                ? "bg-emerald-500/5 border-emerald-500/10 text-emerald-300"
                                : "bg-rose-500/5 border-rose-500/10 text-rose-300"
                            )}>
                              <strong>DBA Performance advice:</strong> {explainResult.advice}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PgBouncer Pooling Monitor */}
                    <div className="p-8 bg-graphite/40 border border-white/5 rounded-[40px] space-y-6">
                      <div className="flex items-center gap-2.5 border-b border-white/5 pb-4">
                        <div className="p-2.5 bg-amber-accent/10 border border-amber-accent/20 rounded-xl text-amber-accent">
                          <Cpu className="w-4 h-4" />
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-white uppercase tracking-wider">PgBouncer Connection Pooler</h3>
                          <span className="text-[10px] text-white/40 uppercase">Sockets Recycling Diagnostics</span>
                        </div>
                      </div>

                      {pgBouncerStats ? (
                        <div className="space-y-6 text-left">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                              <span className="text-[8px] font-black uppercase text-white/40 block mb-1">Pooling Mode</span>
                              <span className="text-xs font-black uppercase text-amber-accent tracking-widest">{pgBouncerStats.pool_mode}</span>
                            </div>
                            <div className="p-4 bg-white/5 border border-white/5 rounded-xl">
                              <span className="text-[8px] font-black uppercase text-white/40 block mb-1">Router Port</span>
                              <span className="text-sm font-mono text-white font-bold">{pgBouncerStats.listen_port}</span>
                            </div>
                          </div>

                          <div className="space-y-3.5 divide-y divide-white/5 text-xs text-white/70">
                            <div className="flex justify-between items-center pt-2 pb-0.5">
                              <span>Active Clients linked</span>
                              <span className="font-mono text-white font-semibold">{pgBouncerStats.active_client_connections} clients</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 pb-0.5">
                              <span>Active Servers pooled</span>
                              <span className="font-mono text-white font-semibold">{pgBouncerStats.active_server_connections} connections</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 pb-0.5">
                              <span>Idle Server Links in reserve</span>
                              <span className="font-mono text-white/50">{pgBouncerStats.idle_server_connections} idle</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 pb-0.5">
                              <span>Waiting transaction queue</span>
                              <span className="font-mono text-emerald-400 font-bold">{pgBouncerStats.waiting_client_requests} queue</span>
                            </div>
                            <div className="flex justify-between items-center pt-2 pb-0.5">
                              <span>Saved database handshakes</span>
                              <span className="font-mono text-amber-accent font-semibold">+{pgBouncerStats.saved_socket_handshakes.toLocaleString()}</span>
                            </div>
                          </div>

                          <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-2">
                            <span className="text-[8px] font-black uppercase tracking-widest text-white/40 block">Proxy Connection String</span>
                            <code className="text-[9px] font-mono text-white/60 block leading-tight break-all">
                              DATABASE_URL=postgres://postgres:...@127.0.0.1:{pgBouncerStats.listen_port}/recipe_app_prod?prepared_threshold=0
                            </code>
                          </div>
                        </div>
                      ) : (
                        <div className="py-20 text-center text-white/30 italic text-xs">
                          Fetching connection pooler metrics...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cumulative Query Performance Section (pg_stat_statements) */}
                  <div className="p-8 bg-graphite/40 border border-white/5 rounded-[40px] space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/5 pb-5">
                      <div className="space-y-1">
                        <h3 className="text-base font-serif text-white italic tracking-tight flex items-center gap-2">
                          📈 Cumulative Query Performance Monitor (pg_stat_statements)
                        </h3>
                        <p className="text-[10px] text-white/40 uppercase">Sorted by overall total collective processing time</p>
                      </div>
                      <span className="px-3 py-1 bg-emerald-400/10 border border-emerald-400/20 rounded-full text-[9px] font-black uppercase tracking-widest text-emerald-400 inline-flex items-center gap-1.5 leading-none">
                        Enabled load module via postgresql.conf
                      </span>
                    </div>

                    {statStatements ? (
                      <div className="overflow-x-auto rounded-3xl border border-white/5">
                        <table className="w-full text-left font-sans">
                          <thead>
                            <tr className="border-b border-white/5 bg-white/[0.01]">
                              <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white/30">Target Aggregated Query Statement</th>
                              <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white/30 text-center">Execution Calls</th>
                              <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white/30 text-center">Cumulative Time (s)</th>
                              <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white/30 text-center font-mono">Mean/Avg Time (ms)</th>
                              <th className="px-5 py-4 text-[9px] font-black uppercase tracking-widest text-white/30 text-center">% Impact</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-xs">
                            {statStatements.queries.map((q: any, i: number) => (
                              <tr key={i} className="hover:bg-white/[0.01] transition-all group">
                                <td className="px-5 py-5 max-w-[320px] md:max-w-md">
                                  <div className="font-mono text-[10px] text-white/80 overflow-x-auto whitespace-pre no-scrollbar truncate">
                                    {q.query}
                                  </div>
                                  <div className="text-[9px] text-amber-accent/80 mt-1 italic leading-tight">
                                    {q.plan_analysis}
                                  </div>
                                  <div className="text-[8px] text-white/30 mt-0.5 leading-relaxed">
                                    {q.recommendation}
                                  </div>
                                </td>
                                <td className="px-5 py-5 text-center font-mono text-white/70">
                                  {q.calls.toLocaleString()}
                                </td>
                                <td className="px-5 py-5 text-center font-mono text-white">
                                  {(q.total_exec_time_ms / 1000).toFixed(1)}s
                                </td>
                                <td className="px-5 py-5 text-center font-mono text-white/70">
                                  {q.mean_exec_time_ms} ms
                                </td>
                                <td className="px-5 py-5">
                                  <div className="flex items-center justify-center gap-2">
                                    <span className="font-mono text-white">{q.system_impact_pct}%</span>
                                    <div className="w-16 bg-white/5 rounded-full h-1 overflow-hidden hidden sm:block">
                                      <div 
                                        className={cn(
                                          "h-full rounded-full",
                                          q.system_impact_pct > 30 ? "bg-rose-400" : q.system_impact_pct > 15 ? "bg-amber-accent" : "bg-emerald-400"
                                        )}
                                        style={{ width: `${q.system_impact_pct}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="py-20 text-center text-white/30 italic text-xs">
                        Loading pg_stat_statements metrics catalog...
                      </div>
                    )}
                  </div>

                  {/* Configuration Files Reference Hub */}
                  <div className="p-8 bg-gradient-to-br from-coal to-graphite border border-white/5 rounded-[40px] space-y-6">
                    <div className="space-y-2">
                      <span className="text-[9px] font-black uppercase text-amber-accent tracking-widest block font-mono">Tuning Assets Configuration</span>
                      <h3 className="text-xl font-serif text-white italic tracking-tight">Enterprise Scale-Up Targets</h3>
                      <p className="text-xs text-white/60 leading-relaxed">
                        These configuration assets are generated directly at the system root directory of this application. 
                        They satisfy optimal settings for thread management, transaction pooling, and cumulative activity indexation.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                      <div className="p-6 bg-white/5 border border-white/5 rounded-3xl flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <code className="text-xs font-mono text-amber-accent font-bold">/pgbouncer.ini</code>
                          <p className="text-[11px] text-white/50 leading-relaxed">
                            Specifies transaction pool limits, connection recycling thresholds, safety timeout margins, socket keep-alives, and proxy port address configurations.
                          </p>
                        </div>
                        <a 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            // Simple blob downloader targeting raw ini file
                            const content = `[databases]\nrecipe_app_prod = host=127.0.0.1 port=5432 dbname=recipe_app_prod\n\n[pgbouncer]\npool_mode = transaction\nmax_client_conn = 2000\ndefault_pool_size = 100\nmin_pool_size = 20\nlisten_port = 6432`;
                            const blob = new Blob([content], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = 'pgbouncer.ini';
                            link.click();
                          }}
                          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all text-center border border-white/5 block"
                        >
                          Download Setup Assets
                        </a>
                      </div>

                      <div className="p-6 bg-white/5 border border-white/5 rounded-3xl flex flex-col justify-between space-y-4">
                        <div className="space-y-1.5">
                          <code className="text-xs font-mono text-emerald-400 font-bold">/postgresql.conf</code>
                          <p className="text-[11px] text-white/50 leading-relaxed">
                            Secures shared preload memory modules for pg_stat_statements, scales shared buffer caches, reduces SSD costs multipliers, and enables direct database I/O tracking logs.
                          </p>
                        </div>
                        <a 
                          href="#"
                          onClick={(e) => {
                            e.preventDefault();
                            const content = `shared_preload_libraries = 'pg_stat_statements'\nmax_connections = 250\nshared_buffers = 2GB\nwork_mem = 64MB\npg_stat_statements.max = 10000\npg_stat_statements.track = all`;
                            const blob = new Blob([content], { type: 'text/plain' });
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = 'postgresql.conf';
                            link.click();
                          }}
                          className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all text-center border border-white/5 block"
                        >
                          Download Tuning Assets
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* JSON Live Inspector Draw Panel */}
              <AnimatePresence>
                {selectedDoc && (
                  <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 30 }}
                    className="p-8 bg-gradient-to-br from-coal via-graphite/60 to-coal border border-amber-accent/10 rounded-[40px] space-y-6 relative"
                  >
                    <div className="flex justify-between items-start border-b border-white/5 pb-5">
                      <div className="space-y-1">
                        <span className="text-[9px] font-black text-amber-accent uppercase tracking-widest block">Document Inspector</span>
                        <h4 className="text-lg font-serif text-white italic">
                          {dbCollection} / <span className="font-mono not-italic text-sm text-white/60">{selectedDoc.id}</span>
                        </h4>
                      </div>
                      <button 
                        onClick={() => setSelectedDoc(null)}
                        className="px-4 py-2 hover:bg-white/5 border border-white/10 hover:border-white/20 text-xs text-white/60 hover:text-white rounded-xl transition-all cursor-pointer"
                      >
                        Close Inspector
                      </button>
                    </div>

                    <div className="p-6 bg-black rounded-3xl border border-white/5 overflow-x-auto max-h-[450px]">
                      <pre className="text-xs text-emerald-400 font-mono text-left leading-relaxed">
                        {JSON.stringify(selectedDoc, null, 2)}
                      </pre>
                    </div>

                    <div className="flex gap-4 items-center">
                      <button 
                        onClick={() => handleDownloadBackup(`${dbCollection}_doc_${selectedDoc.id}`, [selectedDoc])}
                        className="px-5 py-3 bg-white/5 border border-white/10 text-xs text-white rounded-xl hover:bg-white/10 transition-all cursor-pointer flex items-center gap-1.5"
                      >
                        <Download className="w-3.5 h-3.5 text-amber-accent" />
                        Download This Document JSON
                      </button>
                      <button 
                        onClick={() => handleDbDeleteDoc(dbCollection, selectedDoc.id)}
                        className="px-5 py-3 hover:bg-rose-500/10 border border-rose-500/10 text-xs text-rose-400 hover:text-rose-300 rounded-xl transition-all cursor-pointer"
                      >
                        Delete Document Permanently
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
