import { Facebook, Twitter, Link2, Share2, MessageSquare, Sparkles, Copy, Check, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text: string;
  url: string;
  recipe?: any;
}

export default function ShareSheet({ isOpen, onClose, title, text, url, recipe }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [activeTab, setActiveTab] = useState<'quick' | 'snippet'>('quick');

  const shareOptions = [
    { 
      name: 'Twitter', 
      icon: Twitter, 
      color: 'bg-[#1DA1F2]', 
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` 
    },
    { 
      name: 'Facebook', 
      icon: Facebook, 
      color: 'bg-[#1877F2]', 
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` 
    },
    { 
      name: 'WhatsApp', 
      icon: MessageSquare, 
      color: 'bg-[#25D366]', 
      href: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}` 
    },
  ];

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        console.error('Native share failed', err);
      }
    }
  };

  // Generate a premium social snippet with rich icons, times, and emoji ratings
  const generateSnippet = () => {
    if (!recipe) {
      return `✨ DISCOVERED CULINARY GEM ✨

"${title}"
Check out this amazing find!

🧑‍🍳 Sourced via Daily Meal Recipe:
${url}`;
    }

    const recipeName = recipe.name || title;
    const description = recipe.description || "A delicious recipe to level up your culinary journey.";
    const prep = recipe.prepTime || 0;
    const cook = recipe.cookTime || 0;
    const total = prep + cook || recipe.totalTime || 0;
    const cuisine = recipe.cuisine || "Global";
    const category = recipe.category || "Gourmet";
    const ingredientsCount = recipe.ingredients ? recipe.ingredients.length : 0;
    const difficultySnippet = recipe.difficulty ? `(${recipe.difficulty} level)` : "";

    return `🍳 DAILY MEAL RECIPE GOURMET HIGHLIGHT 🍳

" ${recipeName} " ${difficultySnippet}

"${description}"

🍽️ Cuisine: ${cuisine}
🥗 Category: ${category}
⏱️ Total Therapy Time: ${total ? `${total} min` : 'Quick & Easy'}
📝 Ingredients Count: ${ingredientsCount ? `${ingredientsCount} curated ingredients` : 'Check fully detailed list'}

🧑‍🍳 Cook it yourself with structured instructions here:
${url}`;
  };

  const snippetText = generateSnippet();

  const copySnippetToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(snippetText);
      setCopiedSnippet(true);
      setTimeout(() => setCopiedSnippet(false), 2000);
    } catch (err) {
      console.error('Failed to copy snippet!', err);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100]"
          />
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed bottom-0 left-0 right-0 p-8 bg-graphite border-t border-white/10 rounded-t-[40px] z-[101]"
          >
            <div className="max-w-md mx-auto space-y-6">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-white font-serif text-2xl italic">Share this creation</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-white/40">Spread the culinary inspiration</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-white/40 hover:text-white transition-colors cursor-pointer"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

              {/* Segmented Control / Tabs */}
              <div className="flex border border-white/5 bg-black/20 p-1 rounded-2xl">
                <button 
                  onClick={() => setActiveTab('quick')}
                  className={`flex-grow py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'quick' ? 'bg-amber-accent text-black font-black' : 'text-white/60 hover:text-white'}`}
                >
                  <Link2 className="w-3.5 h-3.5" />
                  Quick Links
                </button>
                <button 
                  onClick={() => setActiveTab('snippet')}
                  className={`flex-grow py-2.5 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-2 ${activeTab === 'snippet' ? 'bg-amber-accent text-black font-black' : 'text-white/60 hover:text-white'}`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Social Snippet
                </button>
              </div>

              {activeTab === 'quick' ? (
                <div className="space-y-6">
                  <div className="grid grid-cols-3 gap-4">
                    {shareOptions.map((option) => (
                      <a
                        key={option.name}
                        href={option.href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex flex-col items-center gap-3 group"
                      >
                        <div className={`w-14 h-14 ${option.color} rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110 group-active:scale-95`}>
                          <option.icon className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest">{option.name}</span>
                      </a>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <button
                      onClick={copyToClipboard}
                      className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center px-6 gap-4 hover:bg-white/10 transition-all group cursor-pointer"
                    >
                      <Link2 className="w-5 h-5 text-amber-accent" />
                      <div className="flex-1 text-left truncate text-xs text-white/60 font-mono">
                        {url}
                      </div>
                      <span className="text-[10px] font-bold text-amber-accent uppercase tracking-widest">
                        {copied ? 'Copied!' : 'Copy'}
                      </span>
                    </button>

                    {typeof navigator.share !== 'undefined' && (
                      <button
                        onClick={handleNativeShare}
                        className="w-full h-14 bg-amber-accent text-black rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-white transition-all cursor-pointer"
                      >
                        <Share2 className="w-4 h-4" />
                        More sharing options
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-amber-accent/80 flex items-center gap-1.5">
                        <FileText className="w-3 h-3" />
                        Chef's Social Highlight Snippet
                      </p>
                      <span className="text-[8px] font-bold uppercase tracking-widest text-white/20">Read-Only Preview</span>
                    </div>
                    <textarea
                      readOnly
                      value={snippetText}
                      rows={6}
                      className="w-full bg-black/20 border border-white/5 p-4 rounded-xl text-[11px] font-mono text-white/70 leading-relaxed outline-none resize-none focus:border-amber-accent/30"
                    />
                  </div>

                  <button
                    onClick={copySnippetToClipboard}
                    className="w-full h-14 bg-amber-accent text-black rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-white transition-all cursor-pointer"
                  >
                    {copiedSnippet ? (
                      <>
                        <Check className="w-4 h-4" />
                        Snippet Copied to Clipboard!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Social Snippet
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
