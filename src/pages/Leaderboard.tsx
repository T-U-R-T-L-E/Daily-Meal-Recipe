import { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { Trophy, Medal, Crown, Star, TrendingUp, Users, ChevronRight, Award } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { UserProfile } from '../types';
import { cn } from '../lib/utils';
import { LeaderboardSkeleton } from '../components/recipes/RecipeSkeleton';

export default function Leaderboard() {
  const [leaders, setLeaders] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaders() {
      try {
        const q = query(
          collection(db, 'users'),
          orderBy('points', 'desc'),
          limit(10)
        );
        const querySnapshot = await getDocs(q);
        const fetchedLeaders = querySnapshot.docs.map(doc => ({
          uid: doc.id,
          ...doc.data()
        } as UserProfile));
        setLeaders(fetchedLeaders);
      } catch (error) {
        console.error("Leaderboard fetch error:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchLeaders();
  }, []);

  if (loading) return <LeaderboardSkeleton />;

  const topThree = leaders.slice(0, 3);
  const rest = leaders.slice(3);

  return (
    <div className="space-y-16 pb-24">
      {/* Header */}
      <header className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="px-3 py-1 bg-amber-accent/10 border border-amber-accent/20 rounded-full text-[10px] font-black uppercase tracking-widest text-amber-accent flex items-center gap-2">
            <Trophy className="w-3 h-3" />
            Global Rankings
          </div>
        </div>
        <h1 className="text-6xl font-serif text-white italic tracking-tighter">
          Culinary Masters
        </h1>
        <p className="text-gray-400 font-light italic text-xl max-w-2xl leading-relaxed">
          The elite architects of flavor. Earn points by mastering recipes, completing challenges, and exploring new cuisines.
        </p>
      </header>

      {/* Podium */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-end max-w-4xl mx-auto px-4">
        {topThree[1] && <PodiumRank profile={topThree[1]} rank={2} color="bg-gray-400" icon={Medal} height="h-48" />}
        {topThree[0] && <PodiumRank profile={topThree[0]} rank={1} color="bg-amber-accent" icon={Crown} height="h-64" isMain />}
        {topThree[2] && <PodiumRank profile={topThree[2]} rank={3} color="bg-amber-700" icon={Award} height="h-32" />}
      </div>

      {/* Rankings List */}
      <div className="space-y-4 max-w-3xl mx-auto">
        <div className="flex items-center gap-4 px-8 text-[10px] font-black text-white/20 uppercase tracking-widest">
          <span className="w-8">Rank</span>
          <span className="flex-1">Artisan</span>
          <span className="w-24 text-right">Points</span>
        </div>
        
        <div className="space-y-3">
          {rest.map((leader, i) => (
            <motion.div
              key={leader.uid}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              className="group flex items-center gap-4 p-6 bg-graphite/50 border border-white/5 rounded-[32px] hover:border-white/10 transition-all"
            >
              <div className="w-8 text-xl font-serif text-white/20 group-hover:text-amber-accent transition-colors">
                #{i + 4}
              </div>
              <div className="flex-1 flex items-center gap-4">
                <div className="w-12 h-12 rounded-full overflow-hidden bg-white/5 border border-white/10 shrink-0">
                  {leader.photoURL ? (
                    <img src={leader.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white/20">
                      <Users className="w-6 h-6" />
                    </div>
                  )}
                </div>
                <div>
                  <span className="text-white font-medium block">{leader.displayName || 'Anonymous Artisan'}</span>
                  <span className="text-[10px] text-white/40 uppercase tracking-widest">{leader.skillLevel}</span>
                </div>
              </div>
              <div className="w-24 text-right">
                <div className="text-lg font-serif text-amber-accent italic">{leader.points || 0}</div>
                <div className="text-[10px] text-white/20 uppercase font-black tracking-widest">Pts</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Challenges CTA */}
      <section className="pt-12 border-t border-white/5">
        <div className="p-12 md:p-20 bg-amber-accent text-black rounded-[64px] relative overflow-hidden group shadow-[0_0_80px_rgba(245,158,11,0.2)]">
          <Star className="absolute top-10 right-10 w-32 h-32 text-black/5 rotate-12 group-hover:rotate-45 transition-transform duration-1000" />
          <div className="relative z-10 space-y-8 max-w-xl">
            <h2 className="text-5xl md:text-6xl font-serif italic leading-none">Rise through the ranks.</h2>
            <p className="text-black/60 text-lg leading-relaxed italic">
              Every dish you create brings you closer to culinary legendary status. Unlock exclusive rewards and badges.
            </p>
            <button className="h-16 px-12 bg-black text-white rounded-full font-bold uppercase tracking-[0.2em] text-xs hover:bg-white hover:text-black transition-all flex items-center gap-4">
              Explore Active Challenges
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function PodiumRank({ profile, rank, color, icon: Icon, height, isMain }: { profile: UserProfile, rank: number, color: string, icon: any, height: string, isMain?: boolean }) {
  return (
    <div className={cn("flex flex-col items-center gap-6", isMain ? "order-1 md:order-2" : rank === 2 ? "order-2 md:order-1" : "order-3 md:order-3")}>
      <div className="relative">
        <div className={cn(
          "w-24 h-24 rounded-full overflow-hidden border-4 bg-white/5 flex items-center justify-center",
          isMain ? "w-32 h-32 border-amber-accent" : "border-white/10"
        )}>
          {profile.photoURL ? (
            <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
          ) : (
            <Users className="w-12 h-12 text-white/10" />
          )}
        </div>
        <div className={cn(
          "absolute -bottom-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center shadow-lg",
          color
        )}>
          <Icon className={cn("w-5 h-5", isMain ? "text-black" : "text-white")} />
        </div>
      </div>
      <div className="text-center space-y-1">
        <span className="text-white font-serif italic text-xl whitespace-nowrap">{profile.displayName || 'Anonymous'}</span>
        <div className="flex flex-col items-center">
          <span className="text-2xl font-serif text-amber-accent italic leading-none">{profile.points || 0}</span>
          <span className="text-[10px] text-white/20 uppercase font-black">Points</span>
        </div>
      </div>
      <div className={cn("w-full bg-white/5 border border-white/5 rounded-t-3xl relative overflow-hidden", height)}>
        <div className="absolute inset-x-0 bottom-0 p-6 text-center">
          <span className="text-6xl font-serif text-white/5 italic">#{rank}</span>
        </div>
      </div>
    </div>
  );
}
