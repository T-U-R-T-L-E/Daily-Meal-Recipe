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
  onRatingSubmitted?: (avg: number, count: number) => void;
}

export default function CommentSection({ recipeId, onRatingSubmitted }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);

  useEffect(() => {
    async function loadComments() {
      if (!recipeId) {
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
    if (!user || submitting) return;

    if (rawComment && !isValidString(rawComment, 1, 2000)) {
      alert("Invalid input: Comments must be between 1 and 2000 characters.");
      return;
    }

    setSubmitting(true);
    try {
      const sanitizedComment = rawComment ? sanitizeString(rawComment) : "";
      const sanitizedUserName = sanitizeString(user.displayName || 'Anonymous Chef');
      
      const commentData = {
        userId: user.uid,
        userName: sanitizedUserName,
        userPhoto: user.photoURL,
        comment: sanitizedComment,
        rating: rating,
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
      setRating(5); // Reset rating to 5 after successful submission
      
      // Increment interaction/view count
      await updateDoc(doc(db, 'recipes', recipeId), {
        saveCount: increment(1)
      }).catch(e => console.warn("Could not increment interaction count:", e));

      // Recalculate average rating of the recipe and update the recipe doc
      try {
        const reviewsSnap = await getDocs(collection(db, 'recipes', recipeId, 'reviews'));
        const reviewsData = reviewsSnap.docs.map(doc => doc.data());
        const validRatings = reviewsData.filter(r => typeof r.rating === 'number' && r.rating > 0);
        const count = validRatings.length;
        const avg = count > 0 ? (validRatings.reduce((sum, r) => sum + (r.rating || 0), 0) / count) : 0;
        
        await updateDoc(doc(db, 'recipes', recipeId), {
          ratingsCount: count,
          averageRating: avg
        });

        if (onRatingSubmitted) {
          onRatingSubmitted(avg, count);
        }
      } catch (calcErr) {
        console.warn("Failed to update recipe average rating:", calcErr);
      }
      
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
        <h3 className="font-serif text-4xl font-light text-white italic">Ratings & Reviews</h3>
      </div>

      {user ? (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex items-center gap-3 bg-graphite border border-white/5 rounded-2xl px-6 py-4 w-fit">
            <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Select Rating:</span>
            <div className="flex gap-1 border-r border-white/10 pr-3">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(null)}
                  className="hover:scale-110 active:scale-95 transition-transform cursor-pointer animate-pulse"
                >
                  <Star
                    className={`w-5 h-5 transition-colors ${
                      star <= (hoverRating ?? rating)
                        ? "text-amber-500 fill-amber-500"
                        : "text-white/10"
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-accent min-w-[80px] text-center">
              {rating === 5 ? 'Excellent' : rating === 4 ? 'Very Good' : rating === 3 ? 'Good' : rating === 2 ? 'Fair' : 'Poor'}
            </span>
          </div>

          <div className="relative">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Share a tip, review, or variation... (optional)"
              className="w-full bg-graphite border border-white/5 rounded-[32px] p-8 text-white font-light italic focus:outline-none focus:border-amber-accent/50 transition-all min-h-[150px] resize-none pr-24 shadow-inner"
            />
            <button
              type="submit"
              disabled={submitting}
              className="absolute bottom-6 right-6 p-4 bg-amber-accent text-black rounded-2xl hover:bg-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-amber-accent/10"
              title="Submit Rating and Review"
            >
              {submitting ? (
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}>
                  <Send className="w-5 h-5" />
                </motion.div>
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
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

                  {comment.rating !== undefined && comment.rating > 0 && (
                    <div className="flex gap-0.5 bg-white/5 border border-white/15 px-3 py-1.5 rounded-full">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star 
                          key={i} 
                          className={`w-3.5 h-3.5 ${i < comment.rating! ? 'text-amber-500 fill-amber-500' : 'text-white/10'}`} 
                        />
                      ))}
                    </div>
                  )}
                </div>
                {comment.comment ? (
                  <p className="text-gray-400 font-light italic leading-relaxed">
                    "{comment.comment}"
                  </p>
                ) : (
                  <p className="text-gray-500 font-light text-xs italic leading-relaxed">
                    Left a rating without a comment.
                  </p>
                )}
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12 border-2 border-dashed border-white/5 rounded-[40px]">
             <p className="text-white/20 font-serif text-xl italic">No ratings or reviews yet. Be the first to rate!</p>
          </div>
        )}
      </div>
    </div>
  );
}
