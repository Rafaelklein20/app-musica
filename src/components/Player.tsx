import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Play, SkipBack, SkipForward, Volume2, Repeat, Shuffle, Maximize2, Cast, Youtube, X, Disc, Music } from 'lucide-react';
import { Track } from '../types';
import { useYouTubePlayer } from '../useYouTubePlayer';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

interface PlayerProps {
  currentTrack: Track | null;
  onNext: () => void;
  onPrev: () => void;
  canPrev?: boolean;
  relatedTracks?: Track[];
  queue?: Track[];
  onPlayTrack?: (track: Track, newQueue?: Track[]) => void;
}

export const Player = React.memo(function Player({ currentTrack, onNext, onPrev, canPrev, relatedTracks = [], queue = [], onPlayTrack }: PlayerProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [hasPlayedFirst, setHasPlayedFirst] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const isRepeatRef = useRef(isRepeat);

  const openFullScreen = useCallback(() => {
    setIsFullScreen(prev => {
      if (!prev) {
        window.history.pushState({ playerFullScreen: true }, '');
        return true;
      }
      return prev;
    });
  }, []);

  const closeFullScreen = useCallback(() => {
    setIsFullScreen(prev => {
      if (prev) {
        if (window.history.state?.playerFullScreen) {
          window.history.back();
        }
        return false;
      }
      return prev;
    });
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      setIsFullScreen(prev => {
        if (prev && !e.state?.playerFullScreen) {
          return false;
        }
        return prev;
      });
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);
  useEffect(() => {
    isRepeatRef.current = isRepeat;
  }, [isRepeat]);

  const [isDesktop, setIsDesktop] = useState(typeof window !== 'undefined' ? window.innerWidth >= 768 : true);
  
  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  const handleVideoEndRef = useRef<(() => void) | null>(null);

  const { 
    initPlayer, 
    pauseVideo, 
    playVideo, 
    seekTo, 
    updateVolume, 
    currentTime, 
    duration, 
    volume,
    isReady,
    isPlaying
  } = useYouTubePlayer(() => {
    if (handleVideoEndRef.current) {
      handleVideoEndRef.current();
    }
  });

  useEffect(() => {
    handleVideoEndRef.current = () => {
      if (isRepeatRef.current) {
        seekTo(0);
        playVideo();
      } else {
        onNext();
      }
    };
  }, [onNext, seekTo, playVideo]);

  useEffect(() => {
    if (currentTrack) {
      initPlayer(currentTrack.id);
      if (!hasPlayedFirst) {
        openFullScreen();
        setHasPlayedFirst(true);
      }
    }
  }, [currentTrack, initPlayer, hasPlayedFirst, openFullScreen]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <motion.div 
        initial={false}
        animate={isFullScreen ? {
          top: "120px",
          left: "5vw",
          width: isDesktop ? "42.5vw" : "90vw",
          height: isDesktop ? "45vh" : "30vh",
          opacity: 1,
          scale: 1,
          zIndex: 100,
        } : {
          top: "100%", 
          left: "2rem",
          width: "20rem",
          height: "11rem",
          opacity: 0,
          scale: 0.5,
          zIndex: 0,
        }}
        transition={{ type: "spring", damping: 35, stiffness: 150 }}
        className={cn(
          "fixed overflow-hidden shadow-[0_0_80px_rgba(0,243,255,0.3)] border border-neon-cyan/40 glass-panel bg-black rounded-3xl pointer-events-none",
          isFullScreen && "pointer-events-auto"
        )}
      >
        <div id="youtube-player-actual" className="w-full h-full bg-black">
           <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-neon-cyan/50">
             <Disc className="w-12 h-12 animate-spin-slow" />
             <p className="text-xs font-mono uppercase tracking-[0.3em]">Conectando ao Feed...</p>
           </div>
        </div>
      </motion.div>

      <AnimatePresence>
        {currentTrack && (
          <motion.div 
            key="bottom-player"
            initial={{ y: 100 }}
            animate={{ y: 0 }}
            exit={{ y: 100 }}
            className="fixed bottom-0 left-0 right-0 h-24 glass-panel border-t border-white/10 px-4 sm:px-8 flex items-center justify-between z-40 gap-4"
          >
            <div className="flex items-center gap-3 sm:gap-4 flex-1 md:w-1/3 min-w-0">
              <div 
                className="w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-lg overflow-hidden border border-white/10 relative group cursor-pointer"
                onClick={openFullScreen}
              >
                <img src={currentTrack.thumbnail} className="w-full h-full object-cover" alt="" />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Maximize2 className="w-4 h-4 text-white" />
                </div>
              </div>
              <div 
                className="flex flex-col gap-0.5 overflow-hidden cursor-pointer"
                onClick={openFullScreen}
              >
                <h4 className="text-sm font-bold truncate text-neon-cyan neon-text-cyan">{currentTrack.title}</h4>
                <p className="text-[10px] sm:text-[10px] text-zinc-500 uppercase tracking-widest truncate">{currentTrack.artist}</p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 md:w-1/3 shrink-0">
              <div className="flex items-center gap-4 sm:gap-6">
                <button className="hidden sm:block text-zinc-500 hover:text-white transition-colors"><Shuffle className="w-4 h-4" /></button>
                <button 
                  onClick={onPrev} 
                  disabled={!canPrev}
                  className="block text-zinc-300 hover:text-neon-cyan transition-colors disabled:opacity-20 disabled:pointer-events-none"
                >
                  <SkipBack className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                </button>
                <button 
                  disabled={!isReady}
                  onClick={() => {
                    if (isPlaying) pauseVideo();
                    else playVideo();
                  }}
                  className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-black hover:scale-110 transition-transform shadow-[0_0_15px_rgba(255,255,255,0.3)] disabled:opacity-50"
                >
                  {isPlaying ? (
                    <div className="w-3 h-4 flex gap-1">
                      <div className="w-1 h-full bg-black"></div>
                      <div className="w-1 h-full bg-black"></div>
                    </div>
                  ) : (
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 fill-current ml-1" />
                  )}
                </button>
                <button onClick={onNext} className="block text-zinc-300 hover:text-neon-cyan transition-colors"><SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" /></button>
                <button 
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={cn(
                    "block text-zinc-500 hover:text-white transition-colors",
                    isRepeat && "text-neon-cyan drop-shadow-[0_0_8px_rgba(0,243,255,0.5)] cursor-pointer"
                  )}
                >
                  <Repeat className="w-4 h-4" />
                </button>
              </div>
              <div className="hidden md:flex items-center gap-3 w-full max-w-md">
                <span className="text-[10px] font-mono text-zinc-500 w-8">{formatTime(currentTime)}</span>
                <div 
                  className="flex-1 h-1 bg-white/10 rounded-full relative overflow-hidden group cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    seekTo(percent * duration);
                  }}
                >
                  <div 
                    className="absolute top-0 left-0 h-full bg-neon-cyan shadow-[0_0_10px_#00f3ff]" 
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">{formatTime(duration)}</span>
              </div>
            </div>

            <div className="flex md:flex items-center justify-end gap-4 w-1/3">
              <div className="hidden md:flex items-center gap-2 group">
                <Volume2 className="w-4 h-4 text-zinc-400 group-hover:text-neon-cyan transition-colors" />
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  value={volume}
                  onChange={(e) => updateVolume(parseInt(e.target.value))}
                  className="w-24 h-1 bg-white/10 rounded-full appearance-none accent-neon-cyan cursor-pointer"
                />
              </div>
              <div className="relative">
                <button 
                  onClick={() => {
                    if (currentTrack?.youtubeId) {
                      window.open(`https://www.youtube.com/watch?v=${currentTrack.youtubeId}`, '_blank');
                    }
                  }} 
                  className="text-zinc-400 hover:text-neon-cyan flex transition-colors"
                  title="Abrir no YouTube para transmitir"
                >
                  <Youtube className="w-4 h-4" />
                </button>
              </div>
              <button onClick={openFullScreen} className="text-zinc-400 hover:text-white flex transition-colors" title="Tela Cheia">
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFullScreen && currentTrack && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-cyber-dark/95 backdrop-blur-3xl flex flex-col"
          >
            <div className="h-24 px-[5vw] flex justify-between items-center relative z-10 shrink-0 border-b border-white/5">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 bg-neon-cyan/20 rounded-lg flex items-center justify-center border border-neon-cyan/30">
                  <Disc className="text-neon-cyan w-6 h-6 animate-spin-slow" />
                </div>
                <h2 className="text-lg font-bold tracking-tighter text-neon-cyan neon-text-cyan">NEONBEAT PLAYER</h2>
              </div>
              <button 
                onClick={closeFullScreen}
                className="w-10 h-10 rounded-full hover:bg-white/10 transition-colors flex items-center justify-center text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="relative flex-1 w-full overflow-y-auto md:overflow-hidden flex flex-col md:flex-row">
              {/* Mobile spacer */}
              <div className="w-full shrink-0 block md:hidden" style={{ height: '30vh' }}></div>

              {/* Right Column - Track Info & Controls */}
              <div className="order-1 md:order-2 w-full md:w-[50vw] md:h-full flex flex-col md:overflow-y-auto pl-[5vw] pr-[5vw] md:pl-[2.5vw] pt-4 md:pt-[32px] pb-8 md:pb-24 scrollbar-hide">
                <div className="w-full max-w-[500px] flex flex-col gap-6 z-10 md:border-t-0 md:mt-0 md:pt-0">
                  <div className="space-y-4">
                    <span className="inline-block px-3 py-1 bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-[10px] uppercase tracking-[0.2em] font-bold rounded-full">Transmitindo Agora</span>
                    <h1 className="text-4xl font-bold leading-tight neon-text-cyan">{currentTrack.title}</h1>
                    <p className="text-zinc-400 text-xl uppercase tracking-[0.2em]">{currentTrack.artist}</p>
                  </div>

                  <div className="p-6 glass-panel rounded-3xl border-white/5 space-y-6 relative overflow-hidden group">
                     <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 blur-3xl -mr-16 -mt-16 transition-colors"></div>
                     <div className="flex items-start gap-4">
                        <div className="w-1 h-12 bg-gradient-to-b from-neon-cyan to-transparent shadow-[0_0_15px_#00f3ff]"></div>
                        <div>
                          <p className="text-[10px] text-neon-cyan uppercase font-black tracking-widest mb-2">Frequência Detectada</p>
                          <p className="text-sm italic text-zinc-300 leading-relaxed font-medium">Sintonizando tracks similares via API YouTube. Fluxo estável.</p>
                        </div>
                     </div>
                  </div>

                  <div className="flex items-center gap-2 md:gap-4 mt-4">
                    <button 
                      onClick={onPrev} 
                      disabled={!canPrev}
                      className="flex-1 py-4 glass-panel rounded-2xl hover:bg-white/10 transition-all font-bold uppercase text-xs tracking-widest text-white border border-white/5 disabled:opacity-20 disabled:pointer-events-none"
                    >
                      Anterior
                    </button>
                    <button onClick={onNext} className="flex-1 py-4 bg-neon-cyan text-cyber-dark rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-[0_0_30px_rgba(0,243,255,0.4)] hover:scale-[1.02] transition-transform">Próximo</button>
                    <button 
                      onClick={() => setIsRepeat(!isRepeat)}
                      className={cn(
                        "w-14 shrink-0 h-full py-4 glass-panel rounded-2xl hover:bg-white/10 transition-all font-bold uppercase text-white border border-white/5 flex items-center justify-center",
                        isRepeat && "bg-white/20 text-neon-cyan border-neon-cyan/50 shadow-[0_0_15px_rgba(0,243,255,0.2)]"
                      )}
                    >
                      <Repeat className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Left Column - Suggestions (scrolls under the fixed video) */}
              <div className="order-2 md:order-1 w-full md:w-[50vw] md:h-full flex flex-col md:overflow-y-auto scrollbar-hide pl-[5vw] pr-[5vw] md:pr-[2.5vw] md:pt-[24px] pb-24">
                {/* Desktop spacer */}
                <div className="hidden md:block w-full shrink-0" style={{ height: '45vh' }}></div>
                
                {(() => {
                  const currentIdx = queue.findIndex(t => t.id === currentTrack.id);
                  const isInPlaylist = queue.length > 0 && currentIdx !== -1;
                  
                  let displayTracks: Track[] = [];
                  let title = "Sugestões de Tracks";
                  
                  if (isInPlaylist) {
                    title = "Playlist";
                    displayTracks = [...queue.slice(currentIdx + 1), ...queue.slice(0, currentIdx)];
                  } else {
                    displayTracks = relatedTracks;
                  }

                  if (displayTracks.length === 0) return null;

                  return (
                    <div className="w-full mt-8">
                      <div className="flex items-center gap-3 mb-6">
                        <Music className="w-5 h-5 text-neon-cyan" />
                        <h3 className="text-sm border-white font-bold uppercase tracking-[0.3em] text-zinc-400">{title}</h3>
                      </div>
                      <div className="grid grid-cols-1 gap-3">
                        {displayTracks.map((track, i) => (
                          <div 
                            key={`${track.id}-${i}`} 
                            onClick={() => onPlayTrack?.(track, isInPlaylist ? queue : undefined)}
                            className="group flex items-center gap-4 p-3 glass-panel rounded-xl border-white/5 hover:bg-white/5 cursor-pointer transition-all hover:border-neon-cyan/30 bg-black/40"
                          >
                            <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-white/10 relative">
                              <img src={track.thumbnail} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                              <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                 <Play className="w-5 h-5 fill-neon-cyan text-neon-cyan drop-shadow-[0_0_10px_#00f3ff]" />
                              </div>
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="text-xs font-bold text-white truncate group-hover:text-neon-cyan transition-colors">{track.title}</h5>
                              <p className="text-[10px] text-zinc-500 uppercase tracking-tighter truncate">{track.artist}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

export default Player;
