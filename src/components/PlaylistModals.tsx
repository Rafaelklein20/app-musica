import React, { useState } from 'react';
import { X, Plus, Music } from 'lucide-react';
import { Track, Playlist } from '../types';

interface SaveTrackModalProps {
  track: Track;
  playlists: Playlist[];
  onClose: () => void;
  onSaveToPlaylist: (playlistId: string, track: Track) => void;
  onCreatePlaylist: (name: string, trackToSave?: Track) => void;
}

export function SaveTrackModal({ track, playlists, onClose, onSaveToPlaylist, onCreatePlaylist }: SaveTrackModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const hasFavorites = playlists.some(p => p.name === 'Favoritos');
  
  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPlaylistName.trim()) {
      onCreatePlaylist(newPlaylistName.trim(), track);
      setIsCreating(false);
      setNewPlaylistName('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-cyber-dark glass-panel border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Salvar na Playlist</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>

        {isCreating ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <input 
              autoFocus
              type="text" 
              placeholder="Nome da playlist" 
              value={newPlaylistName}
              onChange={e => setNewPlaylistName(e.target.value)}
              className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-neon-cyan"
            />
            <div className="flex gap-3">
              <button type="button" onClick={() => setIsCreating(false)} className="flex-1 py-3 text-zinc-400 hover:text-white transition-colors">Cancelar</button>
              <button type="submit" disabled={!newPlaylistName.trim()} className="flex-1 py-3 bg-neon-cyan text-cyber-dark font-bold rounded-xl disabled:opacity-50">Criar e Salvar</button>
            </div>
          </form>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-2 scrollbar-hide">
            {!hasFavorites && (
              <button 
                onClick={() => {
                  onSaveToPlaylist('favorites_new', track);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/10"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-neon-pink/20 rounded-lg flex items-center justify-center">
                    <Music className="w-5 h-5 text-neon-pink" />
                  </div>
                  <span className="font-bold">Favoritos</span>
                </div>
              </button>
            )}
            
            {playlists.map(playlist => (
              <button 
                key={playlist.id} 
                onClick={() => {
                  onSaveToPlaylist(playlist.id, track);
                  onClose();
                }}
                className="w-full flex items-center justify-between p-4 hover:bg-white/5 rounded-xl transition-colors border border-transparent hover:border-white/10 group"
              >
                <div className="flex items-center gap-3 w-full">
                  {playlist.cover ? (
                    <img src={playlist.cover} alt="" className="w-10 h-10 rounded-lg object-cover" />
                  ) : (
                    <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center">
                      <Music className="w-5 h-5 text-zinc-500" />
                    </div>
                  )}
                  <span className="font-bold truncate text-left flex-1">{playlist.name}</span>
                  {playlist.tracks?.some(t => t.id === track.id) && (
                    <span className="text-[10px] text-neon-cyan uppercase tracking-wider">Adicionada</span>
                  )}
                </div>
              </button>
            ))}
            
            <button 
              onClick={() => setIsCreating(true)}
              className="w-full flex items-center gap-3 p-4 hover:bg-white/5 rounded-xl transition-colors text-neon-cyan"
            >
              <div className="w-10 h-10 border border-neon-cyan border-dashed rounded-lg flex items-center justify-center">
                <Plus className="w-5 h-5" />
              </div>
              <span className="font-bold">Nova Playlist</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface CreatePlaylistModalProps {
  onClose: () => void;
  onCreate: (name: string) => void;
}

export function CreatePlaylistModal({ onClose, onCreate }: CreatePlaylistModalProps) {
  const [name, setName] = useState('');

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
      <div className="bg-cyber-dark glass-panel border border-white/10 w-full max-w-md rounded-2xl p-6 shadow-2xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Nova Playlist</h2>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <form onSubmit={handleCreate} className="space-y-4">
          <input 
            autoFocus
            type="text" 
            placeholder="Nome da playlist" 
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-zinc-500 focus:outline-none focus:border-neon-cyan"
          />
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="flex-1 py-3 text-zinc-400 hover:text-white transition-colors">Cancelar</button>
            <button type="submit" disabled={!name.trim()} className="flex-1 py-3 bg-neon-cyan text-cyber-dark font-bold rounded-xl disabled:opacity-50">Criar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
