import { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import Player from './components/Player';
import { TrackCard } from './components/TrackCard';
import { Track, Playlist } from './types';
import { useMusicApi } from './useMusicApi';
import { motion, AnimatePresence } from 'motion/react';
import { Disc, Library, Search as SearchIcon, Sparkles, MoreVertical } from 'lucide-react';
import { CategoriesTab } from './components/CategoriesTab';
import { CreatePlaylistModal, SaveTrackModal } from './components/PlaylistModals';

import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db, loginWithGoogle, logout } from './lib/firebase';
import { collection, query, orderBy, limit, getDocs, doc, setDoc, deleteDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firebaseUtils';

export default function App() {
  const [activeTab, setActiveTab] = useState('discover');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [queue, setQueue] = useState<Track[]>([]);
  const [searchResults, setSearchResults] = useState<Track[]>([]);
  const [discoveryTracks, setDiscoveryTracks] = useState<Track[]>([]);
  const [tasteTracks, setTasteTracks] = useState<Track[]>([]);
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [relatedTracks, setRelatedTracks] = useState<Track[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [playHistory, setPlayHistory] = useState<Track[]>([]);
  const [historyIndex, setHistoryIndex] = useState<number>(-1);
  const [playedTrackIds, setPlayedTrackIds] = useState<Set<string>>(new Set());
  
  const [user, setUser] = useState<User | null>(null);
  const [savingTrack, setSavingTrack] = useState<Track | null>(null);
  const [creatingPlaylist, setCreatingPlaylist] = useState(false);

  const { searchTracks, getDiscovery, getRelatedTracks, loading } = useMusicApi();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        // Load history from Firestore
        try {
          const qHistory = query(collection(db, 'users', currentUser.uid, 'history'), orderBy('playedAt', 'desc'), limit(50));
          const snap = await getDocs(qHistory);
          const fbHistory: string[] = [];
          snap.forEach(doc => {
            fbHistory.push(doc.data().title);
          });
          if (fbHistory.length > 0) {
            setHistory(fbHistory);
          } else {
            // Load local history if no remote history
            const savedHistory = localStorage.getItem('neonbeat_history');
            if (savedHistory) setHistory(JSON.parse(savedHistory));
          }
          
          // Load playlists
          const qPlaylists = query(collection(db, 'users', currentUser.uid, 'playlists'));
          const snapPlaylists = await getDocs(qPlaylists);
          const fbPlaylists: Playlist[] = [];
          snapPlaylists.forEach(doc => {
            fbPlaylists.push(doc.data() as Playlist);
          });
          if (fbPlaylists.length > 0) setPlaylists(fbPlaylists);
        } catch (err) {
          handleFirestoreError(err, OperationType.GET, 'users/history_or_playlists');
        }
      } else {
        // Logged out
        setPlaylists([]);
        
        const savedHistory = localStorage.getItem('neonbeat_history');
        if (savedHistory) setHistory(JSON.parse(savedHistory));
      }
    });

    return () => unsubscribe();
  }, []);

  // Load initial data for discovery
  useEffect(() => {
    let mounted = true;
    getDiscovery().then(async data => {
      if (!mounted) return;
      setDiscoveryTracks(data.items.slice(0, 20)); // Fixed 20
      
      const savedHistory = localStorage.getItem('neonbeat_history');
      const initialHistory = savedHistory ? JSON.parse(savedHistory) : [];
      
      if (initialHistory.length > 0) {
        const lastTitle = initialHistory[0];
        const res = await searchTracks(`${lastTitle} music playlist oficial`);
        if (res.length > 0 && mounted) {
          setTasteTracks(res.slice(0, 30));
        } else if (mounted) {
          setTasteTracks(data.items.slice(20, 50));
        }
      } else if (mounted) {
        setTasteTracks(data.items.slice(20, 50));
      }
    });
    return () => { mounted = false; };
  }, [getDiscovery, searchTracks]);


  useEffect(() => {
    // Dropdown global click listener
    const closeDropdowns = () => setActiveDropdown(null);
    document.addEventListener('click', closeDropdowns);
    return () => document.removeEventListener('click', closeDropdowns);
  }, []);

  useEffect(() => {
    // History popstate listener for back button
    const handlePopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setActiveTab(e.state.tab);
      }
    };
    window.addEventListener('popstate', handlePopState);
    
    // Set initial state if missing
    if (!window.history.state?.tab) {
      window.history.replaceState({ tab: 'discover' }, '', window.location.pathname);
    }
    
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    // Update history when activeTab changes, but avoid pushing if we arrived via popstate
    if (window.history.state?.tab !== activeTab) {
      window.history.pushState({ tab: activeTab }, '', '');
    }
  }, [activeTab]);

  useEffect(() => {
    if (history.length > 0 && relatedTracks.length === 0 && currentTrack) {
      getRelatedTracks(currentTrack.id, currentTrack.artist, currentTrack.title).then(setRelatedTracks);
    }
  }, [history, currentTrack, getRelatedTracks, relatedTracks.length]);

  useEffect(() => {
    localStorage.setItem('neonbeat_history', JSON.stringify(history));
  }, [history]);

  const handleSearch = useCallback(async (query: string) => {
    setActiveTab('search');
    const results = await searchTracks(query);
    setSearchResults(results);
  }, [searchTracks]);

  const handleCreatePlaylistClick = useCallback(() => {
    setCreatingPlaylist(true);
  }, []);

  const playTrack = useCallback(async (track: Track, newQueue?: Track[]) => {
    // Avoid re-adding the same track to history if it's the current one
    if (currentTrack?.id === track.id) return;

    setCurrentTrack(track);
    if (newQueue) {
      setQueue(newQueue);
    } else {
      setQueue(q => q.some(t => t.id === track.id) ? q : []);
    }
    
    setPlayedTrackIds(prev => new Set(prev).add(track.id));
    
    // Pointer-based history: truncate forward history and append new track
    setPlayHistory(prev => {
      const truncated = prev.slice(0, historyIndex + 1);
      return [...truncated, track];
    });
    setHistoryIndex(prev => prev + 1);

    setHistory(prev => {
      const newHistory = [track.title, ...prev.filter(t => t !== track.title)].slice(0, 50);
      return newHistory;
    });

    // Fetch related tracks for the new track
    getRelatedTracks(track.id, track.artist, track.title).then(setRelatedTracks);

    if (user) {
      try {
        const historyId = Math.random().toString(36).substr(2, 9);
        await setDoc(doc(db, 'users', user.uid, 'history', historyId), {
          id: track.id,
          title: track.title,
          thumbnail: track.thumbnail,
          artist: track.artist,
          playedAt: serverTimestamp(),
          userId: user.uid
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/history`);
      }
    }
  }, [currentTrack, getRelatedTracks, historyIndex, user]);

  const handleCreatePlaylist = async (name: string, trackToSave?: Track) => {
    const newPlaylist: Playlist = {
      id: Math.random().toString(36).substr(2, 9),
      name: name,
      tracks: trackToSave ? [trackToSave] : [],
      createdAt: Date.now(),
      cover: trackToSave ? trackToSave.thumbnail : undefined
    };
    
    setPlaylists(prev => [...prev, newPlaylist]);
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'playlists', newPlaylist.id), {
          id: newPlaylist.id,
          name: newPlaylist.name,
          tracks: newPlaylist.tracks,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          userId: user.uid,
          cover: newPlaylist.cover || ''
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/playlists`);
      }
    }
  };

  const handleSaveToPlaylistId = async (playlistId: string, track: Track) => {
    if (playlistId === 'favorites_new') {
      await handleCreatePlaylist('Favoritos', track);
      return;
    }

    let targetPlaylist = playlists.find(p => p.id === playlistId);
    if (!targetPlaylist) return;

    if (targetPlaylist.tracks?.some(t => t.id === track.id)) return;
    
    const updatedPlaylists = playlists.map(p => 
      p.id === playlistId 
        ? { ...p, tracks: [...(p.tracks || []), track], cover: track.thumbnail }
        : p
    );
    setPlaylists(updatedPlaylists);
    
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'playlists', playlistId), {
          tracks: [...(targetPlaylist.tracks || []), track],
          updatedAt: serverTimestamp(),
          cover: track.thumbnail
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/playlists`);
      }
    }
  };

  const handleRemoveFromPlaylist = async (playlistId: string, trackId: string) => {
    const targetPlaylist = playlists.find(p => p.id === playlistId);
    if (!targetPlaylist) return;

    const newTracks = targetPlaylist.tracks.filter(t => t.id !== trackId);
    const newCover = newTracks.length > 0 ? newTracks[newTracks.length - 1].thumbnail : '';

    const updatedPlaylists = playlists.map(p => 
      p.id === playlistId ? { ...p, tracks: newTracks, cover: newCover } : p
    );
    setPlaylists(updatedPlaylists);

    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'playlists', playlistId), {
          tracks: newTracks,
          updatedAt: serverTimestamp(),
          cover: newCover
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/playlists`);
      }
    }
  };

  const handleRenamePlaylist = async (playlistId: string, newName: string) => {
    setPlaylists(prev => prev.map(p => p.id === playlistId ? { ...p, name: newName } : p));
    if (user) {
      try {
        await setDoc(doc(db, 'users', user.uid, 'playlists', playlistId), {
          name: newName,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}/playlists`);
      }
    }
  };

  const handleDeletePlaylist = async (playlistId: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== playlistId));
    if (user) {
      try {
        await deleteDoc(doc(db, 'users', user.uid, 'playlists', playlistId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `users/${user.uid}/playlists`);
      }
    }
  };

  const saveToPlaylist = useCallback((track: Track) => {
    if (!user) {
      try { alert('Faça login com o Google para salvar playlists.'); } catch(e){}
      return;
    }
    setSavingTrack(track);
  }, [user]);

  const playNext = useCallback(async () => {
    if (!currentTrack) return;

    // 0. If we have forward history, just navigate forward
    if (historyIndex < playHistory.length - 1) {
      const nextIndex = historyIndex + 1;
      const nextTrack = playHistory[nextIndex];
      setHistoryIndex(nextIndex);
      setCurrentTrack(nextTrack);
      return;
    }
    
    // 0.5. Check if we are playing from a queue (e.g. playlist)
    if (queue.length > 0) {
      const currentIdxInQueue = queue.findIndex(t => t.id === currentTrack.id);
      if (currentIdxInQueue !== -1 && currentIdxInQueue < queue.length - 1) {
        // Next in queue
        playTrack(queue[currentIdxInQueue + 1], queue);
        return;
      }
      if (currentIdxInQueue !== -1 && currentIdxInQueue === queue.length - 1) {
        // Reached end of queue, loop back or stop
        playTrack(queue[0], queue);
        return;
      }
    }

    // 1. Try random unplayed related tracks (same artist/genre/diverse)
    const unplayedRelated = relatedTracks.filter(t => !playedTrackIds.has(t.id) && t.id !== currentTrack.id);
    if (unplayedRelated.length > 0) {
      const randomIdx = Math.floor(Math.random() * unplayedRelated.length);
      playTrack(unplayedRelated[randomIdx]);
      return;
    }

    // 2. Fallback to unplayed discovery tracks
    const unplayedDiscovery = discoveryTracks.filter(t => !playedTrackIds.has(t.id) && t.id !== currentTrack.id);
    if (unplayedDiscovery.length > 0) {
      const randomTrack = unplayedDiscovery[Math.floor(Math.random() * Math.min(unplayedDiscovery.length, 10))];
      playTrack(randomTrack);
      return;
    }

    // Last resort: Reset played IDs (except current) and pick a random discovery track
    setPlayedTrackIds(new Set([currentTrack.id]));
    if (discoveryTracks.length > 0) {
      const fallback = discoveryTracks.find(t => t.id !== currentTrack.id) || discoveryTracks[0];
      playTrack(fallback);
    }
  }, [currentTrack, relatedTracks, playedTrackIds, discoveryTracks, playTrack, historyIndex, playHistory, queue]);

  const playPrev = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      const prevTrack = playHistory[prevIndex];
      setHistoryIndex(prevIndex);
      setCurrentTrack(prevTrack);
    }
  }, [historyIndex, playHistory]);

  const renderContent = () => {
    switch (activeTab) {
      case 'discover':
        return (
          <div className="space-y-12">
            {relatedTracks.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <Disc className="text-neon-pink w-6 h-6 neon-text-pink" />
                  <h2 className="text-2xl font-bold tracking-tight">Vibrações Similares</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {relatedTracks.map((track, idx) => (
                    <TrackCard 
                      key={`rec-${track.id}-${idx}`} 
                      track={track} 
                      onPlay={(t) => playTrack(t)} 
                      onSave={saveToPlaylist}
                    />
                  ))}
                </div>
              </section>
            )}

            {tasteTracks.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-8">
                  <Disc className="text-neon-pink w-6 h-6 neon-text-pink" />
                  <h2 className="text-2xl font-bold tracking-tight">O Seu Som</h2>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {tasteTracks.map((track, idx) => (
                    <TrackCard 
                      key={`taste-${track.id}-${idx}`} 
                      track={track} 
                      onPlay={(t) => playTrack(t)} 
                      onSave={saveToPlaylist}
                    />
                  ))}
                </div>
              </section>
            )}

            <section>
              <div className="flex items-center gap-3 mb-8">
                <Sparkles className="text-neon-cyan w-6 h-6 neon-text-cyan" />
                <h2 className="text-2xl font-bold tracking-tight">Em Alta (Mais Tocadas)</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {discoveryTracks.map((track, idx) => (
                  <TrackCard 
                    key={`disc-${track.id}-${idx}`} 
                    track={track} 
                    onPlay={(t) => playTrack(t)} 
                    onSave={saveToPlaylist}
                  />
                ))}
              </div>
            </section>
          </div>
        );

      case 'search':
        return (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <SearchIcon className="text-neon-cyan w-6 h-6" />
              <h2 className="text-2xl font-bold tracking-tight">Resultados da Pesquisa</h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {searchResults.map(track => (
                <TrackCard 
                  key={track.id} 
                  track={track} 
                  onPlay={(t) => playTrack(t)} 
                  onSave={saveToPlaylist}
                />
              ))}
              {searchResults.length === 0 && !loading && (
                <div className="col-span-full h-64 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-white/5 rounded-3xl">
                   <p className="text-sm">Consulte o banco de dados... Nenhuma frequência encontrada.</p>
                </div>
              )}
            </div>
          </section>
        );

      case 'categories':
        return (
          <CategoriesTab 
            playTrack={playTrack} 
            saveToPlaylist={saveToPlaylist} 
          />
        );

      case 'library':
        return (
          <section>
            <div className="flex items-center gap-3 mb-8">
              <Library className="text-neon-pink w-6 h-6" />
              <h2 className="text-2xl font-bold tracking-tight">Sua Biblioteca</h2>
            </div>
            {playlists.length > 0 ? (
              <div className="flex flex-col gap-12">
                {playlists.map(p => (
                  <div key={p.id} className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-white/5 flex items-center justify-center">
                          {p.cover ? (
                            <img src={p.cover} alt={p.name} className="w-full h-full object-cover" />
                          ) : (
                            <Disc className="w-6 h-6 text-zinc-500" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-bold text-lg text-white hover:text-neon-pink cursor-pointer transition-colors" onClick={() => setActiveTab(`playlist-${p.id}`)}>{p.name}</h3>
                          <p className="text-xs text-zinc-500">{p.tracks?.length || 0} músicas</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => setActiveTab(`playlist-${p.id}`)}
                          className="hidden sm:block text-xs font-bold uppercase tracking-wider text-neon-cyan hover:text-white transition-colors px-4 py-2 border border-neon-cyan/30 rounded-full hover:bg-neon-cyan/10"
                        >
                          Ver todas
                        </button>
                        <div className="relative z-40">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveDropdown(activeDropdown === p.id ? null : p.id);
                            }}
                            className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          <div className={`absolute right-0 mt-2 w-48 bg-cyber-dark/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl transition-all ${activeDropdown === p.id ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                            <button 
                              onClick={() => {
                                const newName = prompt('Novo nome da playlist:', p.name);
                                if (newName && newName.trim()) handleRenamePlaylist(p.id, newName.trim());
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg text-sm text-white transition-colors"
                            >
                              Renomear
                            </button>
                            <button 
                              onClick={() => {
                                if (confirm('Tem certeza que deseja excluir esta playlist?')) {
                                  handleDeletePlaylist(p.id);
                                }
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-red-500/20 text-red-500 rounded-lg text-sm transition-colors mt-1"
                            >
                              Excluir
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    {p.tracks && p.tracks.length > 0 ? (
                      <div className="flex overflow-x-auto snap-x scrollbar-hide gap-6 pb-4">
                        {p.tracks.slice(0, 4).map((track, idx) => (
                          <div key={track.id} className="w-[80vw] sm:w-[300px] shrink-0 snap-start">
                            <TrackCard 
                              track={track} 
                              onPlay={(t) => playTrack(t, p.tracks)} 
                              onSave={saveToPlaylist}
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="h-24 flex items-center justify-center text-zinc-500 border border-dashed border-white/5 rounded-xl">
                        <p className="text-sm italic">Playlist vazia...</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-white/5 rounded-3xl">
                <p className="text-sm italic">Nenhuma playlist criada. Comece a salvar suas músicas favoritas...</p>
              </div>
            )}
          </section>
        );

      case activeTab.startsWith('playlist-') ? activeTab : '':
        const playlistId = activeTab.replace('playlist-', '');
        const playlist = playlists.find(p => p.id === playlistId);

        return (
          <section>
            <div className="flex flex-col mb-8 glass-panel p-8 rounded-3xl bg-black/40 border-white/5">
              <div className="flex items-end gap-6">
                <div className="w-40 h-40 shrink-0 rounded-2xl overflow-hidden bg-white/5 flex items-center justify-center shadow-2xl border border-white/10">
                  {playlist?.cover ? (
                    <img src={playlist.cover} alt={playlist.name} className="w-full h-full object-cover" />
                  ) : (
                    <Disc className="w-16 h-16 text-zinc-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-2">
                  <p className="text-xs uppercase tracking-widest text-zinc-400 font-bold mb-2">Playlist</p>
                  <div className="flex items-center gap-4">
                    <h2 className="text-4xl sm:text-5xl font-black tracking-tighter truncate">{playlist?.name}</h2>
                    <div className="relative z-40">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveDropdown(activeDropdown === 'current-playlist' ? null : 'current-playlist');
                        }}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                      >
                        <MoreVertical className="w-5 h-5" />
                      </button>
                      <div className={`absolute left-0 mt-2 w-48 bg-cyber-dark/95 backdrop-blur-xl border border-white/10 rounded-xl p-2 shadow-2xl transition-all ${activeDropdown === 'current-playlist' ? 'opacity-100 visible' : 'opacity-0 invisible'}`}>
                        <button 
                          onClick={() => {
                            const newName = prompt('Novo nome da playlist:', playlist?.name);
                            if (newName && newName.trim() && playlist) handleRenamePlaylist(playlist.id, newName.trim());
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-white/10 rounded-lg text-sm text-white transition-colors"
                        >
                          Renomear
                        </button>
                        <button 
                          onClick={() => {
                            if (confirm('Tem certeza que deseja excluir esta playlist?') && playlist) {
                              handleDeletePlaylist(playlist.id);
                              setActiveTab('library');
                            }
                          }}
                          className="w-full text-left px-4 py-2 hover:bg-red-500/20 text-red-500 rounded-lg text-sm transition-colors mt-1"
                        >
                          Excluir
                        </button>
                      </div>
                    </div>
                  </div>
                  <p className="text-sm text-zinc-500 mt-4">{playlist?.tracks?.length || 0} músicas</p>
                </div>
              </div>
            </div>

            {playlist && playlist.tracks?.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {playlist.tracks.map(track => (
                  <TrackCard 
                    key={`lib-${track.id}`} 
                    track={track} 
                    onPlay={(t) => playTrack(t, playlist.tracks)} 
                    onRemove={(t) => handleRemoveFromPlaylist(playlist.id, t.id)}
                  />
                ))}
              </div>
            ) : (
              <div className="h-64 flex flex-col items-center justify-center text-zinc-500 border-2 border-dashed border-white/5 rounded-3xl">
                <p className="text-sm italic">Esta playlist está vazia.</p>
              </div>
            )}
          </section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-cyber-dark text-white selection:bg-neon-cyan selection:text-cyber-dark relative">
      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar with mobile toggle classes */}
      <div className={`fixed inset-y-0 left-0 z-50 md:z-30 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => {
            setActiveTab(tab);
            setMobileMenuOpen(false);
          }} 
          playlists={playlists} 
          user={user}
          onLogin={loginWithGoogle}
          onLogout={logout}
          onCreatePlaylistClick={handleCreatePlaylistClick}
        />
      </div>
      
       <main className="flex-1 flex flex-col overflow-hidden relative w-full">
        <Header 
          onSearch={handleSearch} 
          user={user} 
          onLogin={loginWithGoogle} 
          onLogout={logout} 
          onToggleMobileMenu={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        
        <div className="flex-1 overflow-y-auto scrollbar-hide p-4 sm:p-8 pb-32">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>

        <Player 
          currentTrack={currentTrack} 
          onNext={playNext} 
          onPrev={playPrev}
          canPrev={historyIndex > 0}
          relatedTracks={relatedTracks}
          queue={queue}
          onPlayTrack={playTrack}
        />
      </main>

      {savingTrack && (
        <SaveTrackModal
          track={savingTrack}
          playlists={playlists}
          onClose={() => setSavingTrack(null)}
          onSaveToPlaylist={handleSaveToPlaylistId}
          onCreatePlaylist={handleCreatePlaylist}
        />
      )}

      {creatingPlaylist && (
        <CreatePlaylistModal
          onClose={() => setCreatingPlaylist(false)}
          onCreate={(name) => handleCreatePlaylist(name)}
        />
      )}

      {/* Aesthetic decorative elements */}
      <div className="fixed top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-neon-cyan/20 to-transparent pointer-events-none"></div>
      <div className="fixed bottom-0 left-0 w-[1px] h-full bg-gradient-to-b from-transparent via-neon-pink/10 to-transparent pointer-events-none"></div>
    </div>
  );
}
