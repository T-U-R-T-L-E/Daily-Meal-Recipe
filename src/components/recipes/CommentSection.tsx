import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs, addDoc, serverTimestamp, doc, updateDoc, increment } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../../lib/firebase';
import { useAuth } from '../../lib/useAuth';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, Send, User, Star } from 'lucide-react';
import { format } from 'date-fns';
import { Shimmer } from './RecipeSkeleton';
import { sanitizeString, isValidString } from '../../lib/security';

interface Comment {
  id: string;
  userId: string;
  userName: string;
  userPhoto?: string;
  comment: string;
  createdAt: any;
  rating?: number;
}

interface CommentSectionProps {
  recipeId: string;
}

export default function CommentSection({ recipeId }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function loadComments() {
      if (recipeId.startsWith('ai-')) {
        setLoading(false);
        return;
      }

      try {
        const q = query(
          collection(db, 'recipes', recipeId, 'reviews'),
          orderBy('createdAt', 'desc')
        );
        const snapshot = await getDocs(q);
        const loaded = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        })) as Comment[];
        setComments(loaded);
      } catch (error) {
        console.error("Error loading comments:", error);
      } finally {
        setLoading(false);
      }
    }
    loadComments();
  }, [recipeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawComment = newComment.trim();
    if (!user || !rawComment || submitting) return;

    if (!isValidString(rawComment, 1, 2000)) {
      alert("Invalid input: Comments must be between 1 and 2000 characters.");
      return;
    }
    
    if (recipeId.startsWith('ai-')) {
      alert("Please 'Save to Collection' or 'Import' this discovery recipe first to start a community conversation!");
      return;
    }

    setSubmitting(true);
    try {
      const sanitizedComment = sanitizeString(rawComment);
      const sanitizedUserName = sanitizeString(user.displayName || 'Anonymous Chef');
      
      const commentData = {
        userId: user.uid,
        userName: sanitizedUserName,
        userPhoto: user.photoURL,
        comment: sanitizedComment,
        createdAt: serverTimestamp(),
        recipeId
      };

      const docRef = await addDoc(collection(db, 'recipes', recipeId, 'reviews'), commentData);
      
      // Update local state
      setComments([{ 
        id: docRef.id, 
        ...commentData, 
        createdAt: new Date() 
      } as any, ...comments]);
      
      setNewComment('');
      
      // Bonus: Increment interaction/view count as it's a social touchpoint
      await updateDoc(doc(db, 'recipes', recipeId), {
        saveCount: increment(1)
      });
      
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `recipes/${recipeId}/reviews`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-12">
      <div className="flex items-center gap-4">
        <div className="bg-amber-accent/10 p-3 rounded-2xl">
          <MessageSquare className="w-6 h-6 text-amber-accent" />
        </div>
        <h3 className="font-serif text-4xl font-light text-white italic">Community Tips</h3>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="relative">
          <textarea
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Share a tip or variation..."
            className="w-full bg-graphite border border-white/5 rounded-[32px] p-8 text-white font-light italic focus:outline-none focus:border-amber-accent/50 transition-all min-h-[150px] resize-none pr-24 shadow-inner"
          />
          <button
            type="submit"
            disabled={!newComment.trim() || submitting}
            className="absolute bottom-6 right-6 p-4 bg-amber-accent text-black rounded-2xl hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-amber-accent/10"
          >
            {submitting ? (
              <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                <Send className="w-5 h-5" />
              </motion.div>
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      ) : (
        <div className="p-8 bg-onyx rounded-3xl border border-white/5 text-center">
          <p className="text-gray-500 italic font-light">Sign in to share your culinary tips with the community.</p>
        </div>
      )}

      <div className="space-y-8">
        {loading ? (
          <div className="space-y-6">
            {[1, 2].map(i => (
              <div key={i} className="bg-graphite p-8 rounded-[32px] border border-white/5 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white/5 overflow-hidden relative shrink-0">
                    <Shimmer className="absolute inset-0 w-full h-full" />
                  </div>
                  <div className="space-y-2 flex-grow">
                    <Shimmer className="h-4 w-24 rounded-lg" />
                    <Shimmer className="h-3 w-16 rounded-lg" />
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <Shimmer className="h-3.5 w-full rounded-lg" />
                  <Shimmer className="h-3.5 w-[85%] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : comments.length > 0 ? (
          <div className="space-y-6">
            {comments.map((comment) => (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                key={comment.id}
                className="bg-graphite p-8 rounded-[32px] border border-white/5 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <img
                      src={comment.userPhoto || `https://ui-avatars.com/api/?name=${comment.userName}`}
                      className="w-10 h-10 rounded-full border border-white/10"
                      alt={comment.userName}
                    />
                    <div>
                      <p className="text-[10px] font-black text-white uppercase tracking-widest leading-none">{comment.userName}</p>
                      <p className="text-[9px] text-gray-500 uppercase tracking-widest mt-1">
                        {comment.createdAt?.toDate ? format(comment.createdAt.toDate(), 'MMM d, yyyy') : 'Just now'}
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-gray-400 font-light italic leading-relaxed">
                  "{comment.comment}"
                </p>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-[40px]">
             <p className="text-white/20 font-serif text-xl italic">No tips yet. Be the first to help others!</p>
          </div>
        )}
      </div>
    </div>
  );
}
