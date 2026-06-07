import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle2, 
  Circle, 
  Trash2, 
  Plus, 
  Users, 
  Calendar as CalendarIcon, 
  Sparkles,
  ClipboardList,
  UserCheck,
  Tag,
  AlertCircle,
  UserPlus,
  Mail,
  Loader2,
  Check
} from 'lucide-react';
import { cn } from '../lib/utils';

interface SharedTodo {
  id?: string;
  text: string;
  completed: boolean;
  creatorId: string;
  creatorName: string;
  creatorPhoto: string;
  assignedTo?: string;
  assignedName?: string;
  category: 'prep' | 'clean' | 'grocery' | 'chore' | 'other';
  createdAt: any;
  completedBy?: string;
  completedByName?: string;
  familyId: string;
}

export default function SharedTodos() {
  const { user } = useAuth();
  const [todos, setTodos] = useState<SharedTodo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [category, setCategory] = useState<'prep' | 'clean' | 'grocery' | 'chore' | 'other'>('prep');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [assignedName, setAssignedName] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Family states
  const [families, setFamilies] = useState<any[]>([]);
  const [activeFamily, setActiveFamily] = useState<any | null>(null);
  const [loadingFamilies, setLoadingFamilies] = useState(true);
  const [newFamilyName, setNewFamilyName] = useState('');
  const [creatingFamily, setCreatingFamily] = useState(false);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [addingMember, setAddingMember] = useState(false);
  const [familySuccess, setFamilySuccess] = useState<string | null>(null);
  const [familyError, setFamilyError] = useState<string | null>(null);
  const [showCreateFamily, setShowCreateFamily] = useState(false);

  // Load user's families where they are members
  useEffect(() => {
    if (!user || !user.email) {
      setLoadingFamilies(false);
      return;
    }

    setLoadingFamilies(true);
    const q = query(
      collection(db, 'families'),
      where('members', 'array-contains', user.email.toLowerCase())
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const list = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setFamilies(list);
        
        // Auto-select family if none selected
        if (list.length > 0) {
          setActiveFamily(prev => {
            if (prev) {
              const found = list.find(f => f.id === prev.id);
              if (found) return found;
            }
            return list[0];
          });
        } else {
          setActiveFamily(null);
        }
        setLoadingFamilies(false);
      },
      (err) => {
        console.error("Failed to load families:", err);
        setLoadingFamilies(false);
        handleFirestoreError(err, OperationType.LIST, 'families');
      }
    );

    return () => unsubscribe();
  }, [user]);

  // Load real-time collaborative tasks scoped to active family via onSnapshot
  useEffect(() => {
    if (!user) return;
    if (!activeFamily) {
      setTodos([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    
    // Simple query by familyId. We will sort list client-side to guarantee correct ordering 
    // and avoid Firestore composite index compiled dependency crashes.
    const q = query(
      collection(db, 'sharedTodos'),
      where('familyId', '==', activeFamily.id),
      limit(150)
    );

    const unsubscribe = onSnapshot(q, 
      (snapshot) => {
        const data = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        } as SharedTodo));

        // Sort client side client-side by createdAt descending
        data.sort((a, b) => {
          const timeA = a.createdAt?.seconds || 0;
          const timeB = b.createdAt?.seconds || 0;
          return timeB - timeA;
        });

        setTodos(data);
        setLoading(false);
        setError(null);
      },
      (err) => {
        console.error("Shared todos snapshot failed:", err);
        setError("Database read restricted or missing credentials.");
        setLoading(false);
        handleFirestoreError(err, OperationType.LIST, 'sharedTodos');
      }
    );

    return () => unsubscribe();
  }, [user, activeFamily]);

  const handleCreateFamily = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !user.email || !newFamilyName.trim()) return;

    setCreatingFamily(true);
    setFamilyError(null);
    try {
      const docRef = await addDoc(collection(db, 'families'), {
        name: newFamilyName.trim(),
        members: [user.email.toLowerCase()],
        creatorId: user.uid,
        creatorName: user.displayName || 'Anonymous Cook',
        createdAt: serverTimestamp()
      });
      setNewFamilyName('');
      setShowCreateFamily(false);
      setFamilySuccess(`Family group "${newFamilyName.trim()}" created!`);
      setTimeout(() => setFamilySuccess(null), 4000);
    } catch (err: any) {
      console.error("Error creating family:", err);
      setFamilyError("Failed to build culinary family group.");
    } finally {
      setCreatingFamily(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !activeFamily || !newMemberEmail.trim()) return;

    const emailToAdd = newMemberEmail.trim().toLowerCase();
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToAdd)) {
      setFamilyError("Please enter a valid email address.");
      return;
    }

    setAddingMember(true);
    setFamilyError(null);
    try {
      const currentMembers = activeFamily.members || [];
      if (currentMembers.includes(emailToAdd)) {
        setFamilyError(`${emailToAdd} is already in this family group.`);
        setAddingMember(false);
        return;
      }

      const updatedMembers = [...currentMembers, emailToAdd];
      await updateDoc(doc(db, 'families', activeFamily.id), {
        members: updatedMembers
      });

      setNewMemberEmail('');
      setFamilySuccess(`Successfully added ${emailToAdd} to your family!`);
      setTimeout(() => setFamilySuccess(null), 4000);
    } catch (err: any) {
      console.error("Error adding family member:", err);
      setFamilyError("Failed to add member email.");
    } finally {
      setAddingMember(false);
    }
  };

  const handleAddTodo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !text.trim() || !activeFamily) return;

    try {
      const newTodo: any = {
        text: text.trim(),
        completed: false,
        creatorId: user.uid,
        creatorName: user.displayName || 'Anonymous Cook',
        creatorPhoto: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.displayName || 'User')}`,
        category,
        createdAt: serverTimestamp(),
        familyId: activeFamily.id // Securely scoped to current family!
      };

      if (assignedTo) {
        newTodo.assignedTo = assignedTo;
      }
      if (assignedName) {
        newTodo.assignedName = assignedName;
      }

      await addDoc(collection(db, 'sharedTodos'), newTodo);
      setText('');
      setAssignedTo('');
      setAssignedName('');
    } catch (err) {
      setError("Failed to create shared task chore.");
      handleFirestoreError(err, OperationType.CREATE, 'sharedTodos');
    }
  };

  const handleToggleComplete = async (todo: SharedTodo) => {
    if (!user || !todo.id) return;
    try {
      const nextCompleted = !todo.completed;
      await updateDoc(doc(db, 'sharedTodos', todo.id), {
        completed: nextCompleted,
        completedBy: nextCompleted ? user.uid : null,
        completedByName: nextCompleted ? (user.displayName || 'Collaborator') : null
      });
    } catch (err) {
      setError("Failed to tick off culinary chore.");
      handleFirestoreError(err, OperationType.UPDATE, `sharedTodos/${todo.id}`);
    }
  };

  const handleAssignToMe = async (todoId: string) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'sharedTodos', todoId), {
        assignedTo: user.uid,
        assignedName: user.displayName || 'Self'
      });
    } catch (err) {
      setError("Failed to self-assign task.");
      handleFirestoreError(err, OperationType.UPDATE, `sharedTodos/${todoId}`);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'sharedTodos', id));
    } catch (err) {
      setError("Delete restricted. Only the creator can remove shared tasks.");
      handleFirestoreError(err, OperationType.DELETE, `sharedTodos/${id}`);
    }
  };

  const filteredTodos = todos.filter(t => {
    if (filterCategory === 'all') return true;
    return t.category === filterCategory;
  });

  const categories: { value: SharedTodo['category']; label: string; color: string }[] = [
    { value: 'prep', label: 'Prep Cook', color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' },
    { value: 'clean', label: 'Cleaning', color: 'bg-sky-500/10 text-sky-400 border-sky-500/20' },
    { value: 'grocery', label: 'Grocery Run', color: 'bg-amber-accent/10 text-amber-accent border-amber-accent/20' },
    { value: 'chore', label: 'Kitchen Chore', color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' },
    { value: 'other', label: 'General', color: 'bg-white/10 text-white/70 border-white/10' }
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in">
      
      {/* Title Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/5 pb-8 gap-4">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-accent/10 text-amber-accent rounded-full text-[10px] font-black uppercase tracking-widest leading-none border border-amber-accent/20">
            <Users className="w-3.5 h-3.5 animate-pulse" /> Collaborative Kitchen Circle
          </div>
          <h1 className="font-serif text-5xl font-light text-white leading-none">Family Hub</h1>
          <p className="text-gray-500 font-light text-base italic mt-1 leading-snug">
            Manage your kitchen circle, add family members by email, and sync collaborative prep cook chores.
          </p>
        </div>
      </div>

      {/* Success / Error Banners for actions */}
      <AnimatePresence>
        {familySuccess && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-3 text-emerald-400 text-xs font-light"
          >
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{familySuccess}</span>
          </motion.div>
        )}

        {familyError && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }} 
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-light"
          >
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{familyError}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading States */}
      {loadingFamilies ? (
        <div className="p-12 bg-graphite rounded-[32px] border border-white/5 flex flex-col items-center justify-center space-y-4">
          <Loader2 className="w-8 h-8 text-amber-accent animate-spin" />
          <p className="text-xs font-bold uppercase tracking-widest text-white/40">Gathering kitchen circles...</p>
        </div>
      ) : families.length === 0 ? (
        /* Empty State & Initial Setup screen for Family groups */
        <div className="bg-graphite rounded-[40px] border border-white/5 p-8 md:p-12 shadow-2xl space-y-8 max-w-2xl mx-auto">
          <div className="text-center space-y-4 max-w-md mx-auto">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-full flex items-center justify-center text-amber-accent mx-auto">
              <Users className="w-6 h-6" />
            </div>
            <h2 className="font-serif text-3xl font-light text-white">Create Your Kitchen Circle</h2>
            <p className="text-gray-400 text-sm font-light leading-relaxed italic">
              Chores are now secured inside private Family groups. Set up your group, add your family, and share your chores instantly!
            </p>
          </div>

          <form onSubmit={handleCreateFamily} className="space-y-4 pt-4 border-t border-white/5">
            <div className="space-y-2">
              <label className="text-[10px] uppercase font-bold tracking-widest text-white/50">Family / Kitchen Name</label>
              <input 
                type="text"
                placeholder="E.g., The Smith Kitchen, Room 204 Bakers..."
                value={newFamilyName}
                onChange={(e) => setNewFamilyName(e.target.value)}
                required
                className="w-full h-14 px-6 bg-onyx border border-white/10 rounded-full focus:outline-none focus:border-amber-accent text-sm text-white placeholder:text-white/25 transition-all"
              />
            </div>
            
            <button
              type="submit"
              disabled={creatingFamily || !newFamilyName.trim()}
              className="w-full h-14 bg-white hover:bg-amber-accent text-black font-black uppercase tracking-widest text-xs rounded-full flex items-center justify-center gap-2 shadow-xl hover:shadow-amber-accent/10 transition-all disabled:opacity-40 cursor-pointer"
            >
              {creatingFamily ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Create Kitchen Circle
            </button>
          </form>
        </div>
      ) : (
        /* Active Family View & Configuration Panels */
        <div className="space-y-8">
          
          {/* Family Hub Header Block / Config Block */}
          <div className="bg-graphite rounded-[32px] border border-white/5 p-8 shadow-2xl space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/5">
              
              {/* Family Selector */}
              <div className="space-y-1.5 flex-1 max-w-xs">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/50">Active Kitchen Circle</label>
                <div className="relative">
                  <select
                    value={activeFamily?.id || ''}
                    onChange={(e) => {
                      const found = families.find(f => f.id === e.target.value);
                      if (found) setActiveFamily(found);
                    }}
                    className="w-full h-12 pl-5 pr-10 bg-onyx border border-white/10 rounded-xl focus:outline-none focus:border-amber-accent text-xs font-bold uppercase tracking-wider text-white select-none appearance-none cursor-pointer"
                  >
                    {families.map(f => (
                      <option key={f.id} value={f.id}>{f.name}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-white/40">
                    ▼
                  </div>
                </div>
              </div>

              {/* Toggle new family formation in inline drawer */}
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateFamily(!showCreateFamily)}
                  className="h-12 px-6 border border-white/10 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all cursor-pointer"
                >
                  {showCreateFamily ? 'Close Setup' : '+ Create Another Group'}
                </button>
              </div>
            </div>

            {/* Expandable setup panel for forming multiple families */}
            {showCreateFamily && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="p-6 bg-onyx/40 border border-white/5 rounded-2xl space-y-4"
              >
                <h4 className="text-xs font-black uppercase tracking-widest text-amber-accent">Create New Family Group</h4>
                <form onSubmit={handleCreateFamily} className="flex flex-col md:flex-row gap-3">
                  <input 
                    type="text"
                    placeholder="E.g., Summer Cabin Crew..."
                    value={newFamilyName}
                    onChange={(e) => setNewFamilyName(e.target.value)}
                    required
                    className="flex-grow h-12 px-5 bg-onyx border border-white/10 rounded-xl focus:outline-none focus:border-amber-accent text-xs text-white placeholder:text-white/20"
                  />
                  <button
                    type="submit"
                    disabled={creatingFamily || !newFamilyName.trim()}
                    className="h-12 px-6 bg-white hover:bg-amber-accent text-black font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    {creatingFamily ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create
                  </button>
                </form>
              </motion.div>
            )}

            {/* Members List and invitation forms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-2">
              
              {/* Member Emails displaying */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-white/50">
                  <Users className="w-3.5 h-3.5 text-amber-accent" />
                  <span>Circle Members ({activeFamily?.members?.length || 0})</span>
                </div>
                
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-2">
                  {activeFamily?.members?.map((email: string) => {
                    const isMe = email === user?.email?.toLowerCase();
                    return (
                      <span 
                        key={email}
                        className={cn(
                          "px-3 py-1.5 rounded-full border text-[10px] font-light flex items-center gap-2 tracking-wide",
                          isMe 
                            ? "bg-amber-accent/10 border-amber-accent/30 text-amber-accent" 
                            : "bg-white/5 border-white/5 text-white/60"
                        )}
                        title={email}
                      >
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        <span className="truncate max-w-[150px]">{isMe ? `${email} (You)` : email}</span>
                      </span>
                    );
                  })}
                </div>
              </div>

              {/* invitation form */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest text-white/50">
                  <UserPlus className="w-3.5 h-3.5 text-amber-accent" />
                  <span>Invite Member Email</span>
                </div>

                <form onSubmit={handleAddMember} className="flex gap-2">
                  <input 
                    type="email"
                    placeholder="E.g., sister@gourmet.com"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    required
                    className="flex-grow h-12 px-5 bg-onyx border border-white/10 rounded-xl focus:outline-none focus:border-amber-accent text-xs text-white placeholder:text-white/20 uppercase-none"
                  />
                  <button
                    type="submit"
                    disabled={addingMember || !newMemberEmail.trim()}
                    className="h-12 px-5 bg-amber-accent text-black font-black uppercase tracking-widest text-[10px] rounded-xl flex items-center justify-center gap-1.5 transition-all hover:bg-white disabled:opacity-40 cursor-pointer"
                  >
                    {addingMember ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                    Add
                  </button>
                </form>
                <p className="text-[10px] italic text-white/35">
                  Type their login email address and click "Add" to invite them to this isolated culinary circle instantly.
                </p>
              </div>

            </div>

          </div>

          {/* Render standard cooperative chores board, but fully localized to activeFamily */}
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }} 
              animate={{ opacity: 1, y: 0 }}
              className="p-5 bg-red-500/10 border border-red-500/30 rounded-3xl flex items-center gap-4 text-red-300 text-sm font-medium"
            >
              <AlertCircle className="w-5 h-5 shrink-0 text-red-400" />
              <span>{error}</span>
            </motion.div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
            
            {/* Creation panel */}
            <div className="lg:col-span-1 bg-graphite rounded-[32px] p-8 border border-white/5 shadow-2xl space-y-6">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-accent" />
                <h3 className="text-sm font-black uppercase tracking-widest text-white">Add Chore</h3>
              </div>

              <form onSubmit={handleAddTodo} className="space-y-5">
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/50">Task Description</label>
                  <textarea
                    placeholder="E.g., Marinate chickens, Clean skillet, Buy unsalted butter..."
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={300}
                    rows={3}
                    required
                    className="w-full px-5 py-4 bg-onyx border border-white/10 rounded-2xl focus:outline-none focus:border-amber-accent text-sm text-white placeholder:text-white/20 transition-all resize-none italic"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase font-bold tracking-widest text-white/50">Chore Category</label>
                  <div className="grid grid-cols-2 gap-2">
                    {categories.map((cat) => (
                      <button
                        key={cat.value}
                        type="button"
                        onClick={() => setCategory(cat.value)}
                        className={cn(
                          "px-3 py-2.5 rounded-xl border text-[10px] font-bold uppercase tracking-wider transition-all cursor-pointer text-center",
                          category === cat.value 
                            ? "bg-amber-accent text-black border-amber-accent" 
                            : "bg-white/5 border-white/5 text-white/60 hover:bg-white/10"
                        )}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={!text.trim()}
                    className="w-full h-12 bg-white hover:bg-amber-accent text-black font-black uppercase tracking-widest text-xs rounded-xl flex items-center justify-center gap-2 shadow-xl hover:shadow-amber-accent/10 transition-all disabled:opacity-40 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" /> Publish to Board
                  </button>
                </div>
              </form>
            </div>

            {/* Chores Listing panel */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* Category Filter Pills */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
                <button
                  onClick={() => setFilterCategory('all')}
                  className={cn(
                    "px-5 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer whitespace-nowrap",
                    filterCategory === 'all' 
                      ? "bg-white text-black border-white" 
                      : "bg-graphite border-white/5 text-white/40 hover:text-white"
                  )}
                >
                  All Board ({todos.length})
                </button>
                {categories.map((cat) => {
                  const count = todos.filter(t => t.category === cat.value).length;
                  return (
                    <button
                      key={cat.value}
                      onClick={() => setFilterCategory(cat.value)}
                      className={cn(
                        "px-4 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest border transition-all cursor-pointer whitespace-nowrap",
                        filterCategory === cat.value 
                          ? "bg-white text-black border-white" 
                          : "bg-graphite border-white/5 text-white/40 hover:text-white"
                      )}
                    >
                      {cat.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* List display */}
              <div className="bg-graphite rounded-[40px] border border-white/5 p-6 md:p-8 shadow-2xl relative min-h-[400px]">
                <AnimatePresence mode="popLayout">
                  {loading ? (
                    <div className="space-y-4 animate-pulse">
                      {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 bg-white/5 rounded-2xl w-full" />
                      ))}
                    </div>
                  ) : filteredTodos.length > 0 ? (
                    <div className="space-y-4">
                      {filteredTodos.map((todo) => {
                        const matchedCat = categories.find(c => c.value === todo.category);
                        return (
                          <motion.div
                            key={todo.id}
                            layout
                            initial={{ opacity: 0, y: 15 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={cn(
                              "flex flex-col md:flex-row items-start md:items-center justify-between p-6 rounded-2xl border transition-all hover:bg-white/[0.02] gap-4",
                              todo.completed 
                                ? "bg-black/30 border-white/5" 
                                : "bg-onyx/50 border-white/10"
                            )}
                          >
                            {/* Left items details */}
                            <div className="flex items-start gap-4 flex-1">
                              <button
                                onClick={() => handleToggleComplete(todo)}
                                className={cn(
                                  "transition-all duration-300 mt-1 cursor-pointer shrink-0",
                                  todo.completed ? "text-amber-accent" : "text-white/20 hover:text-amber-accent"
                                )}
                              >
                                {todo.completed ? <CheckCircle2 className="w-6 h-6" /> : <Circle className="w-6 h-6" />}
                              </button>

                              <div className="space-y-2">
                                <p className={cn(
                                  "text-base md:text-lg font-light leading-snug text-left",
                                  todo.completed ? "line-through text-white/20 italic" : "text-white font-medium"
                                )}>
                                  {todo.text}
                                </p>

                                {/* Creator info and subtags */}
                                <div className="flex flex-wrap items-center gap-3 text-[10px] text-white/40">
                                  <div className="flex items-center gap-1.5">
                                    <img 
                                      src={todo.creatorPhoto} 
                                      alt={todo.creatorName} 
                                      className="w-4 h-4 rounded-full border border-white/20 object-cover"
                                    />
                                    <span>{todo.creatorName}</span>
                                  </div>

                                  <span className="text-white/10">•</span>

                                  {matchedCat && (
                                    <span className={cn("px-2 py-0.5 rounded border text-[8px] font-black uppercase tracking-wider", matchedCat.color)}>
                                      {matchedCat.label}
                                    </span>
                                  )}

                                  {todo.completed && todo.completedByName && (
                                    <>
                                      <span className="text-white/10">•</span>
                                      <span className="text-emerald-400 font-bold flex items-center gap-1">
                                        Done by {todo.completedByName}
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            {/* Right assignments controls and actions */}
                            <div className="flex items-center gap-4 w-full md:w-auto justify-end border-t md:border-t-0 border-white/5 pt-3 md:pt-0 shrink-0">
                              {todo.assignedTo ? (
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 rounded-xl border border-white/10 text-[9px] font-extrabold uppercase tracking-widest text-white/70">
                                  <UserCheck className="w-3.5 h-3.5 text-amber-accent" />
                                  <span>{todo.assignedTo === user?.uid ? 'Me' : todo.assignedName}</span>
                                </div>
                              ) : (
                                !todo.completed && (
                                  <button
                                    onClick={() => handleAssignToMe(todo.id!)}
                                    className="px-3 py-1.5 bg-amber-accent/10 border border-amber-accent/20 hover:bg-amber-accent hover:text-black rounded-xl text-[9px] font-black uppercase tracking-widest text-amber-accent hover:border-amber-accent transition-all cursor-pointer"
                                  >
                                    Claim Chore
                                  </button>
                                )
                              )}

                              {/* Delete chore (Only creator can delete) */}
                              {todo.creatorId === user?.uid && (
                                <button
                                  onClick={() => handleDelete(todo.id!)}
                                  className="p-2.5 text-white/20 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                                  title="Delete Chore"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-8 space-y-6">
                      <div className="w-20 h-20 bg-onyx border border-white/5 rounded-full flex items-center justify-center text-white/30">
                        <ClipboardList className="w-8 h-8" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-xl font-serif italic text-white leading-none">Shared board is clean</h4>
                        <p className="text-sm font-light text-white/40 italic">No chores logged for this category inside "{activeFamily?.name}".</p>
                      </div>
                    </div>
                  )}
                </AnimatePresence>
              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
