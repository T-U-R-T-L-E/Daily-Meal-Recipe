import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { useAuth } from '../lib/useAuth';
import { PantryItem } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Plus, Trash2, Calendar, ShoppingCart, Search, Filter, AlertTriangle } from 'lucide-react';
import { format, isBefore, addDays } from 'date-fns';

export default function Pantry() {
  const { user } = useAuth();
  const [items, setItems] = useState<PantryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [newItem, setNewItem] = useState({ item: '', quantity: '', expiryDate: '', category: 'Oils & Vinegars' });
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['Oils & Vinegars', 'Spices', 'Grains', 'Proteins', 'Vegetables', 'Dairy', 'Baking', 'Other'];

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pantry'), where('userId', '==', user.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PantryItem)));
      setLoading(false);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pantry');
    });
    return unsubscribe;
  }, [user]);

  const addItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !newItem.item) return;
    try {
      await addDoc(collection(db, 'pantry'), {
        ...newItem,
        userId: user.uid,
        createdAt: Timestamp.now()
      });
      setNewItem({ item: '', quantity: '', expiryDate: '', category: 'Oils & Vinegars' });
      setIsAdding(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'pantry');
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'pantry', id));
    } catch (error) {
       handleFirestoreError(error, OperationType.DELETE, `pantry/${id}`);
    }
  };

  const sendToShoppingList = async (item: PantryItem) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'shoppingLists'), {
        userId: user.uid,
        item: item.item,
        amount: item.quantity,
        completed: false,
        createdAt: Timestamp.now()
      });
      alert(`${item.item} added to your shopping list.`);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'shoppingLists');
    }
  };

  const isExpiringSoon = (dateStr?: string) => {
    if (!dateStr) return false;
    const expiry = new Date(dateStr);
    return isBefore(expiry, addDays(new Date(), 3));
  };

  const filteredItems = items.filter(i => 
    i.item.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-white/5 pb-10">
        <div className="space-y-3">
          <h1 className="font-serif text-6xl font-light text-white">Pantry</h1>
          <p className="text-gray-500 font-light text-lg italic tracking-tight">Keep track of your kitchen staples and stock.</p>
        </div>

        <div className="flex gap-4">
          <div className="relative w-full md:w-64">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/20" />
            <input 
              type="text" 
              placeholder="Search stock..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-graphite border border-white/10 rounded-full text-xs text-white placeholder:text-white/20 focus:border-amber-accent outline-none"
            />
          </div>
          <button 
            onClick={() => setIsAdding(true)}
            className="px-6 py-3 bg-white text-black rounded-full font-bold uppercase tracking-widest text-[10px] hover:bg-amber-accent transition-all flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isAdding && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="p-8 bg-graphite rounded-[32px] border border-white/10 shadow-2xl"
          >
            <form onSubmit={addItem} className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">Ingredient</label>
                <input 
                  required
                  value={newItem.item}
                  onChange={e => setNewItem({...newItem, item: e.target.value})}
                  className="w-full bg-onyx border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-accent/50"
                  placeholder="e.g. Maldon Sea Salt"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">Inventory</label>
                <input 
                  required
                  value={newItem.quantity}
                  onChange={e => setNewItem({...newItem, quantity: e.target.value})}
                  className="w-full bg-onyx border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-accent/50"
                  placeholder="e.g. 500g"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold tracking-widest text-white/40">Category</label>
                <select 
                  value={newItem.category}
                  onChange={e => setNewItem({...newItem, category: e.target.value})}
                  className="w-full bg-onyx border border-white/5 rounded-xl px-4 py-3 text-white outline-none focus:border-amber-accent/50"
                >
                  {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="flex gap-4">
                <button type="submit" className="flex-1 bg-amber-accent text-black font-bold uppercase tracking-widest text-[10px] py-3.5 rounded-xl">Add to Pantry</button>
                <button type="button" onClick={() => setIsAdding(false)} className="px-6 border border-white/10 text-white rounded-xl">Cancel</button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-graphite p-8 rounded-[32px] border border-white/5 space-y-4 animate-pulse">
              <div className="space-y-2">
                <div className="h-3 bg-white/5 w-16 rounded-lg" />
                <div className="h-6 bg-white/5 w-1/2 rounded-lg" />
              </div>
              <div className="pt-4 border-t border-white/5 flex justify-between">
                <div className="h-4 bg-white/5 w-16 rounded-lg" />
                <div className="h-4 bg-white/5 w-12 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <motion.div
                layout
                key={item.id}
                initial={{ opacity: 0, scale: 0.95, y: 15 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -15 }}
                transition={{ duration: 0.25, ease: "easeOut" }}
                className="bg-graphite p-8 rounded-[32px] border border-white/5 group hover:border-amber-accent/30 transition-all shadow-xl"
              >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-amber-accent opacity-60 mb-2 block">{item.category}</span>
                  <h3 className="font-serif text-2xl text-white">{item.item}</h3>
                </div>
                <div className="flex gap-1 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => sendToShoppingList(item)} 
                    className="p-3 md:p-2 text-white/60 md:text-white/40 hover:text-white transition-colors"
                    title="Add to Shopping List"
                  >
                    <ShoppingCart className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => deleteItem(item.id!)} 
                    className="p-3 md:p-2 text-white/60 md:text-white/40 hover:text-red-400 transition-colors"
                    title="Delete Item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="text-gray-400 font-light italic">Stock: <span className="text-white font-bold not-italic ml-1">{item.quantity}</span></div>
                {item.expiryDate && (
                  <div className={`flex items-center gap-2 ${isExpiringSoon(item.expiryDate) ? 'text-amber-accent' : 'text-gray-500'}`}>
                    <Calendar className="w-4 h-4" />
                    <span className="text-[10px] font-bold uppercase tracking-widest italic">{format(new Date(item.expiryDate), 'MMM d, yyyy')}</span>
                    {isExpiringSoon(item.expiryDate) && <AlertTriangle className="w-3 h-3" />}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
          </AnimatePresence>
        </div>
      )}

      {items.length === 0 && !loading && (
        <div className="py-24 text-center space-y-6">
          <p className="font-serif text-3xl italic text-white/20">Your pantry is empty.</p>
          <button 
            onClick={() => setIsAdding(true)}
            className="px-8 py-4 border border-white/10 text-white rounded-full hover:bg-white/5 transition-all text-[10px] font-bold uppercase tracking-widest"
          >
            Add your first item
          </button>
        </div>
      )}
    </div>
  );
}
