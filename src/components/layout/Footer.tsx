import { Link } from 'react-router-dom';
import { Shield, Scale, FileText, Mail, BookOpen } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const appName = localStorage.getItem('legal_app_name') || 'Daily Meal Recipe';

  return (
    <footer className="w-full bg-graphite border-t border-white/5 py-8 mt-auto select-none transition-colors duration-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col lg:flex-row items-center justify-between gap-6">
        {/* Branding */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
          <span className="font-serif text-sm tracking-widest text-white uppercase">
            DAILY MEAL <span className="italic text-amber-accent font-light">Recipe</span>
          </span>
          <span className="hidden sm:inline text-[10px] text-white/20 font-mono">|</span>
          <p className="text-[10px] text-white/40 uppercase font-mono tracking-wider">
            © {currentYear} {appName}
          </p>
        </div>

        {/* Links */}
        <div className="flex flex-wrap items-center justify-center gap-6 text-[11px] font-medium uppercase tracking-wider text-white/60">
          <Link 
            to="/privacy" 
            className="flex items-center gap-1.5 hover:text-amber-accent transition-colors py-1"
          >
            <Shield className="w-3.5 h-3.5 text-amber-accent/80" />
            <span>Privacy Policy</span>
          </Link>
          
          <Link 
            to="/terms" 
            className="flex items-center gap-1.5 hover:text-amber-accent transition-colors py-1"
          >
            <Scale className="w-3.5 h-3.5 text-amber-accent/80" />
            <span>Terms of Service</span>
          </Link>

          <Link 
            to="/refund-policy" 
            className="flex items-center gap-1.5 hover:text-amber-accent transition-colors py-1"
          >
            <FileText className="w-3.5 h-3.5 text-amber-accent/80" />
            <span>Refund Policy</span>
          </Link>

          <Link 
            to="/blog" 
            className="flex items-center gap-1.5 hover:text-amber-accent transition-colors py-1"
          >
            <BookOpen className="w-3.5 h-3.5 text-amber-accent/80" />
            <span>Kitchen Journal</span>
          </Link>
        </div>

        {/* Support & Enquiries */}
        <div className="flex items-center gap-2 text-[10px] text-white/60 font-medium tracking-wide uppercase">
          <Mail className="w-3.5 h-3.5 text-amber-accent/80" />
          <span className="text-[9px] tracking-widest text-white/40">Support:</span>
          <a 
            href="mailto:info@dailymealrecipe.online" 
            className="text-amber-accent/80 hover:text-amber-accent transition-colors underline decoration-dotted font-bold lowercase tracking-normal"
          >
            info@dailymealrecipe.online
          </a>
        </div>
      </div>
    </footer>
  );
}
