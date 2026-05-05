import React from 'react';
import { Home, Search, Library, Plus, Music, Disc, LogOut, User as UserIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { User } from 'firebase/auth';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  playlists: any[];
  user: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onCreatePlaylistClick: () => void;
}

export const Sidebar = React.memo(function Sidebar({ activeTab, setActiveTab, playlists, user, onLogin, onLogout, onCreatePlaylistClick }: SidebarProps) {
  const menuItems = [
    { icon: Home, label: 'Descoberta', id: 'discover' },
    { icon: Search, label: 'Pesquisa', id: 'search' },
    { icon: Library, label: 'Sua Biblioteca', id: 'library' },
    { icon: Disc, label: 'Categorias', id: 'categories' },
  ];

  return (
    <div className="w-64 h-full bg-cyber-dark/95 backdrop-blur-3xl border-r border-white/5 flex flex-col p-6 md:pb-28 gap-8 overflow-hidden">
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 bg-gradient-to-br from-neon-cyan to-neon-pink rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(0,243,255,0.4)]">
          <Disc className="text-white w-6 h-6 animate-spin-slow" />
        </div>
        <h1 className="text-xl font-bold tracking-tighter text-neon-cyan neon-text-cyan">NEONBEAT</h1>
      </div>

      <nav className="flex flex-col gap-2 flex-grow overflow-hidden">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "flex items-center gap-4 px-4 py-3 rounded-xl transition-all duration-300 group",
              activeTab === item.id 
                ? "bg-white/10 text-neon-cyan border border-white/5" 
                : "text-zinc-400 hover:text-white hover:bg-white/5"
            )}
          >
            <item.icon className={cn(
              "w-5 h-5 transition-colors",
              activeTab === item.id ? "text-neon-cyan" : "group-hover:text-neon-cyan"
            )} />
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
        
        <div className="flex flex-col gap-4 mt-8 flex-1 overflow-hidden">
          <div className="flex items-center justify-between px-4 shrink-0">
            <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">Playlists</span>
            <Plus 
              className="w-4 h-4 text-zinc-500 hover:text-white cursor-pointer transition-colors" 
              onClick={() => {
                if (!user) {
                  try { alert('Faça login com o Google para criar playlists.'); } catch(e){}
                  return;
                }
                onCreatePlaylistClick();
              }}
            />
          </div>
          
          <div className="flex flex-col gap-1 overflow-y-auto scrollbar-hide pb-4">
            {playlists.map((playlist) => (
              <button
                key={playlist.id}
                onClick={() => setActiveTab(`playlist-${playlist.id}`)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 rounded-lg text-sm transition-all text-zinc-400 hover:text-white hover:bg-white/5 shrink-0",
                  activeTab === `playlist-${playlist.id}` && "text-neon-pink bg-white/5"
                )}
              >
                <Music className="w-4 h-4 shrink-0" />
                <span className="truncate">{playlist.name}</span>
              </button>
            ))}
            {playlists.length === 0 && (
              <p className="px-4 text-xs text-zinc-600 italic">Nenhuma salva ainda...</p>
            )}
          </div>
        </div>
      </nav>

      <div className="mt-auto shrink-0 border-t border-white/10 pt-6">
        {user ? (
          <div className="flex items-center justify-between group">
            <div className="flex items-center gap-3">
              <img src={user.photoURL || ''} alt="Profile" className="w-10 h-10 rounded-full border border-white/10" referrerPolicy="no-referrer" />
              <div className="flex items-start flex-col">
                <span className="text-sm font-bold text-white truncate max-w-[100px]">{user.displayName}</span>
                <span className="text-[10px] uppercase tracking-widest text-zinc-500">Conectado</span>
              </div>
            </div>
            <button onClick={onLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-zinc-400 hover:text-white" title="Sair">
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button 
            onClick={onLogin}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 bg-white text-black font-bold text-sm tracking-wide rounded-xl hover:bg-zinc-200 transition-colors"
          >
            <UserIcon className="w-4 h-4" />
            Entrar com Google
          </button>
        )}
      </div>
    </div>
  );
});

export default Sidebar;
