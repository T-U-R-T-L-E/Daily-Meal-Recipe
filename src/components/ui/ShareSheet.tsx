import { Facebook, Twitter, Link2, Share2, MessageSquare, Instagram } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useState } from 'react';

interface ShareSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  text: string;
  url: string;
}

export default function ShareSheet({ isOpen, onClose, title, text, url }: ShareSheetProps) {
  const [copied, setCopied] = useState(false);

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
            <div className="max-w-md mx-auto space-y-8">
              <div className="flex justify-between items-center">
                <div className="space-y-1">
                  <h3 className="text-white font-serif text-2xl italic">Share this creation</h3>
                  <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest text-white/40">Spread the culinary inspiration</p>
                </div>
                <button 
                  onClick={onClose}
                  className="p-2 text-white/40 hover:text-white transition-colors"
                >
                  <Share2 className="w-5 h-5" />
                </button>
              </div>

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
                  className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center px-6 gap-4 hover:bg-white/10 transition-all group"
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
                    className="w-full h-14 bg-amber-accent text-black rounded-2xl font-bold uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:bg-white transition-all"
                  >
                    <Share2 className="w-4 h-4" />
                    More sharing options
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
