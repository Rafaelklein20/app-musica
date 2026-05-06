import React, { useState, useEffect, useRef } from 'react';
import { Search as SearchIcon, User as UserIcon, Bell, Menu } from 'lucide-react';
import { User } from 'firebase/auth';
import { useMusicApi } from '../useMusicApi';

interface HeaderProps {
  onSearch: (query: string) => void;
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onToggleMobileMenu?: () => void;
}

export const Header = React.memo(function Header({ onSearch, user, onLogin, onLogout, onToggleMobileMenu }: HeaderProps) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const { getAutocomplete } = useMusicApi();
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchSuggestions = async () => {
      if (query.length > 1) {
        const results = await getAutocomplete(query);
        setSuggestions(results.slice(0, 5));
      } else {
        setSuggestions([]);
      }
    };

    const timer = setTimeout(() => {
      fetchSuggestions();
    }, 300);

    return () => clearTimeout(timer);
  }, [query, getAutocomplete]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = (searchQuery: string) => {
    onSearch(searchQuery);
    setShowSuggestions(false);
  };

  return (
    <header className="h-20 flex items-center justify-between px-4 sm:px-8 bg-cyber-dark/40 border-b border-white/5 sticky top-0 z-20 gap-4">
      {onToggleMobileMenu && (
        <button 
          onClick={onToggleMobileMenu}
          className="md:hidden p-2 text-zinc-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors z-30"
          aria-label="Menu"
        >
          <Menu className="w-6 h-6" />
        </button>
      )}
      
      <div className="flex-1 max-w-xl relative">
        <div ref={searchRef} className="relative group">
          <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500 group-focus-within:text-neon-cyan transition-colors" />
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Pesquisar por música, artista ou vibes..."
            className="w-full bg-white/5 border border-white/10 rounded-full py-3 pl-12 pr-6 outline-none focus:border-neon-cyan/50 focus:bg-white/10 transition-all text-sm tracking-wide"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && query.trim()) {
                handleSearch(query.trim());
              }
            }}
          />
          {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-cyber-dark/95 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden shadow-2xl z-50">
              {suggestions.map((suggestion, index) => (
                <div
                  key={index}
                  onClick={() => {
                    setQuery(suggestion);
                    handleSearch(suggestion);
                  }}
                  className="px-6 py-3 hover:bg-white/10 cursor-pointer flex items-center gap-3 transition-colors text-sm text-zinc-300 hover:text-white"
                >
                  <SearchIcon className="w-4 h-4 text-zinc-500" />
                  {suggestion}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 sm:gap-6 shrink-0">
        <button className="hidden sm:block relative text-zinc-400 hover:text-white transition-colors">
          <Bell className="w-5 h-5" />
          <span className="absolute top-0 right-0 w-2 h-2 bg-neon-pink rounded-full shadow-[0_0_8px_var(--color-neon-pink)]"></span>
        </button>
        
        {user ? (
          <div 
            onClick={onLogout}
            className="flex items-center gap-2 sm:gap-3 pl-0 sm:pl-6 sm:border-l border-white/5 group cursor-pointer"
            title="Sair da conta"
          >
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-white group-hover:text-neon-cyan transition-colors">{user.displayName || 'Usuário'}</p>
              <p className="text-[10px] text-zinc-500 uppercase tracking-tighter">Pro Listener</p>
            </div>
            <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-neon-cyan/30 flex items-center justify-center p-0.5 bg-gradient-to-br from-cyber-surface to-cyber-dark overflow-hidden shrink-0">
              <img src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.uid}`} alt="Profile" className="w-full h-full rounded-full object-cover" referrerPolicy="no-referrer" />
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-3 pl-0 sm:pl-6 sm:border-l border-white/5 shrink-0">
            <button 
              onClick={onLogin}
              className="text-[10px] sm:text-xs font-bold bg-white text-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-full hover:bg-zinc-200 transition-colors flex items-center gap-2"
            >
              <UserIcon className="w-3 h-3 sm:w-4 sm:h-4" />
              Entrar
            </button>
          </div>
        )}
      </div>
    </header>
  );
});

export default Header;
