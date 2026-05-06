import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  Play,
  SkipBack,
  SkipForward,
  Volume2,
  Repeat,
  Shuffle,
  Maximize2,
  Cast,
  Youtube,
  X,
  Disc,
  Music,
  Sparkles,
  Timer,
} from "lucide-react";
import { Track } from "../types";
import { useYouTubePlayer } from "../useYouTubePlayer";
import { motion, AnimatePresence, Reorder } from "motion/react";
import { cn } from "../lib/utils";

interface PlayerProps {
  currentTrack: Track | null;
  onNext: () => void;
  onPrev: () => void;
  canPrev?: boolean;
  relatedTracks?: Track[];
  queue?: Track[];
  onPlayTrack?: (track: Track, newQueue?: Track[]) => void;
  onReorderQueue?: (newQueue: Track[]) => void;
}

export const Player = React.memo(function Player({
  currentTrack,
  onNext,
  onPrev,
  canPrev,
  relatedTracks = [],
  queue = [],
  onPlayTrack,
  onReorderQueue,
}: PlayerProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isImmersionMode, setIsImmersionMode] = useState(false);
  const [hasPlayedFirst, setHasPlayedFirst] = useState(false);
  const [isRepeat, setIsRepeat] = useState(false);
  const isRepeatRef = useRef(isRepeat);

  const [sleepTimerEnd, setSleepTimerEnd] = useState<number | null>(null);
  const [sleepTimerDropdownOpen, setSleepTimerDropdownOpen] = useState(false);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);

  const openFullScreen = useCallback(() => {
    if (isImmersionMode) return;
    setIsFullScreen((prev) => {
      if (!prev) {
        if (window.history.state?.playerState !== "fullscreen") {
          window.history.pushState({ playerState: "fullscreen" }, "");
        }
        return true;
      }
      return prev;
    });
  }, [isImmersionMode]);

  const closeFullScreen = useCallback(() => {
    setIsFullScreen(false);
    setIsImmersionMode(false);
    if (
      window.history.state?.playerState === "fullscreen" ||
      window.history.state?.playerState === "immersion"
    ) {
      window.history.back();
    }
  }, []);

  const openImmersionMode = useCallback(() => {
    setIsImmersionMode((prev) => {
      if (!prev) {
        if (window.history.state?.playerState !== "fullscreen") {
          window.history.replaceState({ playerState: "fullscreen" }, "");
        }
        window.history.pushState({ playerState: "immersion" }, "");
        return true;
      }
      return prev;
    });
  }, []);

  const closeImmersionMode = useCallback(() => {
    if (window.history.state?.playerState === "immersion") {
      window.history.back(); // This will appropriately trigger popstate and step back
    } else {
      setIsImmersionMode(false);
      setIsFullScreen(true);
    }
  }, []);

  useEffect(() => {
    const handlePopState = (e: PopStateEvent) => {
      const state = e.state?.playerState;

      setIsImmersionMode((prevImmersion) => {
        setIsFullScreen((prevFullscreen) => {
          if (state === "immersion") {
            return true;
          } else if (state === "fullscreen") {
            return true;
          } else {
            // Unintended pop from immersion directly to null state
            if (prevImmersion) {
              setTimeout(() => {
                window.history.replaceState({ playerState: "fullscreen" }, "");
              }, 0);
              return true;
            }
            return false;
          }
        });

        if (state === "immersion") return true;
        return false;
      });
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);
  useEffect(() => {
    isRepeatRef.current = isRepeat;
  }, [isRepeat]);

  const [isDesktop, setIsDesktop] = useState(
    typeof window !== "undefined" ? window.innerWidth >= 768 : true,
  );

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
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
    isPlaying,
    activePlayerIndex,
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
    if (sleepTimerEnd) {
      const interval = setInterval(() => {
        const now = Date.now();
        if (now >= sleepTimerEnd) {
          if (isPlaying) pauseVideo();
          setSleepTimerEnd(null);
          setRemainingSeconds(null);
        } else {
          setRemainingSeconds(Math.ceil((sleepTimerEnd - now) / 1000));
        }
      }, 1000);
      setRemainingSeconds(Math.ceil((sleepTimerEnd - Date.now()) / 1000));
      return () => clearInterval(interval);
    } else {
      setRemainingSeconds(null);
    }
  }, [sleepTimerEnd, isPlaying, pauseVideo]);

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
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <AnimatePresence>
        {isImmersionMode && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9990] bg-black flex items-center justify-center overflow-hidden"
          >
            {currentTrack && (
              <img
                src={currentTrack.thumbnail}
                alt=""
                className={cn(
                  "absolute w-[150vw] h-[150vh] object-cover blur-[100px] saturate-[2.5] opacity-60 transition-transform duration-[4000ms] ease-in-out",
                  isPlaying ? "scale-110" : "scale-100",
                )}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={false}
        animate={
          isImmersionMode
            ? {
                top: "50%",
                left: "50%",
                x: "-50%",
                y: "-50%",
                width: isDesktop ? "60vw" : "85vw",
                height: isDesktop ? "33.75vw" : "47.81vw",
                maxHeight: "80vh",
                opacity: 1,
                scale: 1,
                zIndex: 9999,
                boxShadow: !isPlaying
                  ? "0 0 40px rgba(0, 0, 0, 0.5)"
                  : "0 0 80px rgba(0, 0, 0, 0.8)",
              }
            : isFullScreen
              ? {
                  top: "120px",
                  left: "5vw",
                  x: "0%",
                  y: "0%",
                  width: isDesktop ? "42.5vw" : "90vw",
                  height: isDesktop ? "45vh" : "30vh",
                  maxHeight: "100vh",
                  opacity: 1,
                  scale: 1,
                  zIndex: 100,
                  boxShadow:
                    "0 0 80px color-mix(in srgb, var(--color-neon-cyan) 30%, transparent)",
                }
              : {
                  top: "100%",
                  left: "2rem",
                  x: "0%",
                  y: "0%",
                  width: "20rem",
                  height: "11rem",
                  maxHeight: "100vh",
                  opacity: 0,
                  scale: 0.5,
                  zIndex: 0,
                  boxShadow: "none",
                }
        }
        transition={{ type: "spring", damping: 35, stiffness: 150 }}
        className={cn(
          "fixed overflow-hidden glass-panel bg-black pointer-events-none transition-shadow duration-[2000ms] ease-in-out",
          (isFullScreen || isImmersionMode) && "pointer-events-auto",
          isImmersionMode
            ? "rounded-xl border border-white/5"
            : "rounded-3xl border border-neon-cyan/40",
        )}
      >
        <div
          className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out bg-black"
          style={{
            opacity: activePlayerIndex === 0 ? 1 : 0,
            zIndex: activePlayerIndex === 0 ? 10 : 1,
            pointerEvents: activePlayerIndex === 0 ? "auto" : "none",
          }}
        >
          <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center gap-4 text-neon-cyan/50 pointer-events-none">
            <Disc className="w-12 h-12 animate-spin-slow" />
            <p className="text-xs font-mono uppercase tracking-[0.3em]">
              Conectando ao Feed 1...
            </p>
          </div>
          <div
            id="youtube-player-0"
            className="w-full h-full absolute inset-0"
          ></div>
        </div>
        <div
          className="absolute inset-0 transition-opacity duration-[2000ms] ease-in-out bg-black"
          style={{
            opacity: activePlayerIndex === 1 ? 1 : 0,
            zIndex: activePlayerIndex === 1 ? 10 : 1,
            pointerEvents: activePlayerIndex === 1 ? "auto" : "none",
          }}
        >
          <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center gap-4 text-neon-cyan/50 pointer-events-none">
            <Disc className="w-12 h-12 animate-spin-slow" />
            <p className="text-xs font-mono uppercase tracking-[0.3em]">
              Conectando ao Feed 2...
            </p>
          </div>
          <div
            id="youtube-player-1"
            className="w-full h-full absolute inset-0"
          ></div>
        </div>
      </motion.div>

      <AnimatePresence>
        {isImmersionMode && (
          <motion.button
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={closeImmersionMode}
            className="fixed top-6 right-6 z-[9999] w-12 h-12 rounded-full bg-black/40 hover:bg-black/60 backdrop-blur-md border border-black/20 flex items-center justify-center transition-colors"
          >
            <X className="w-6 h-6 text-white" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {currentTrack && !isImmersionMode && (
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
                <img
                  src={currentTrack.thumbnail}
                  className="w-full h-full object-cover"
                  alt=""
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100">
                  <Maximize2 className="w-4 h-4 text-white" />
                </div>
              </div>
              <div
                className="flex flex-col gap-0.5 overflow-hidden cursor-pointer"
                onClick={openFullScreen}
              >
                <h4 className="text-sm font-bold truncate text-neon-cyan neon-text-cyan">
                  {currentTrack.title}
                </h4>
                <p className="text-[10px] sm:text-[10px] text-zinc-500 uppercase tracking-widest truncate">
                  {currentTrack.artist}
                </p>
              </div>
            </div>

            <div className="flex flex-col items-center gap-2 md:w-1/3 shrink-0">
              <div className="flex items-center gap-4 sm:gap-6">
                <button className="hidden sm:block text-zinc-500 hover:text-white transition-colors">
                  <Shuffle className="w-4 h-4" />
                </button>
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
                <button
                  onClick={onNext}
                  className="block text-zinc-300 hover:text-neon-cyan transition-colors"
                >
                  <SkipForward className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
                </button>
                <button
                  onClick={() => setIsRepeat(!isRepeat)}
                  className={cn(
                    "block text-zinc-500 hover:text-white transition-colors",
                    isRepeat &&
                      "text-neon-cyan drop-shadow-[0_0_8px_color-mix(in_srgb,var(--color-neon-cyan)_50%,transparent)] cursor-pointer",
                  )}
                >
                  <Repeat className="w-4 h-4" />
                </button>
              </div>
              <div className="hidden md:flex items-center gap-3 w-full max-w-md">
                <span className="text-[10px] font-mono text-zinc-500 w-8">
                  {formatTime(currentTime)}
                </span>
                <div
                  className="flex-1 h-1 bg-white/10 rounded-full relative overflow-hidden group cursor-pointer"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const percent = (e.clientX - rect.left) / rect.width;
                    seekTo(percent * duration);
                  }}
                >
                  <div
                    className="absolute top-0 left-0 h-full bg-neon-cyan shadow-[0_0_10px_var(--color-neon-cyan)]"
                    style={{ width: `${progress}%` }}
                  ></div>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 w-8 text-right">
                  {formatTime(duration)}
                </span>
              </div>
            </div>

            <div className="flex md:flex items-center justify-end gap-4 w-1/3">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    if (currentTrack?.id) {
                      window.open(
                        `https://www.youtube.com/watch?v=${currentTrack.id}`,
                        "_blank",
                      );
                    }
                  }}
                  className="text-zinc-400 hover:text-neon-cyan flex transition-colors"
                  title="Abrir no YouTube para transmitir"
                >
                  <Youtube className="w-4 h-4" />
                </button>
                <div className="relative">
                  <button
                    onClick={() =>
                      setSleepTimerDropdownOpen(!sleepTimerDropdownOpen)
                    }
                    className={cn(
                      "text-zinc-400 flex items-center transition-colors hover:text-white",
                      sleepTimerEnd &&
                        "text-neon-cyan drop-shadow-[0_0_8px_color-mix(in_srgb,var(--color-neon-cyan)_80%,transparent)] hover:text-neon-cyan",
                    )}
                    title="Modo Dormir"
                  >
                    <Timer className="w-4 h-4" />
                  </button>
                  {remainingSeconds !== null && (
                    <span className="absolute -top-3 -right-6 text-[10px] font-mono tracking-tighter bg-cyber-dark px-1 rounded-sm border border-neon-cyan/20 text-neon-cyan z-10 pointer-events-none">
                      {formatTime(remainingSeconds)}
                    </span>
                  )}

                  <AnimatePresence>
                    {sleepTimerDropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="absolute bottom-full right-0 mb-3 w-40 bg-cyber-dark/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden glass-panel z-50 flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
                      >
                        <div className="px-4 py-2 border-b border-white/5 bg-black/40">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                            Modo Dormir
                          </span>
                        </div>
                        {[15, 30, 45, 60].map((mins) => (
                          <button
                            key={mins}
                            onClick={() => {
                              setSleepTimerEnd(Date.now() + mins * 60000);
                              setSleepTimerDropdownOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left text-sm font-medium text-white hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 flex items-center justify-between"
                          >
                            {mins === 60 ? "1 Hora" : `${mins} Minutos`}
                            {remainingSeconds !== null &&
                              remainingSeconds > (mins - 15) * 60 &&
                              remainingSeconds <= mins * 60 && (
                                <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_8px_var(--color-neon-cyan)]"></div>
                              )}
                          </button>
                        ))}
                        {sleepTimerEnd && (
                          <button
                            onClick={() => {
                              setSleepTimerEnd(null);
                              setSleepTimerDropdownOpen(false);
                            }}
                            className="w-full px-4 py-3 text-left text-sm font-bold text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors mt-1 bg-red-400/5 text-center"
                          >
                            Desativar
                          </button>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="hidden md:flex items-center gap-2 group relative">
                <Volume2 className="w-4 h-4 text-zinc-400 group-hover:text-neon-cyan transition-colors" />
                <div className="relative w-24 h-4 flex items-center group/slider cursor-pointer">
                  <div className="absolute w-full h-1 bg-white/10 rounded-full overflow-hidden pointer-events-none">
                    <div
                      className="h-full bg-neon-cyan shadow-[0_0_10px_var(--color-neon-cyan)] transition-all duration-75"
                      style={{ width: `${volume}%` }}
                    ></div>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={volume}
                    onChange={(e) => updateVolume(parseInt(e.target.value))}
                    className="w-full absolute inset-0 opacity-0 cursor-pointer"
                  />
                  <div
                    className="absolute h-3 w-3 rounded-full bg-white shadow-[0_0_10px_var(--color-neon-cyan)] border border-neon-cyan scale-0 group-hover/slider:scale-100 transition-transform pointer-events-none"
                    style={{ left: `calc(${volume}% - 6px)` }}
                  ></div>
                </div>
              </div>
              <button
                onClick={openFullScreen}
                className="text-zinc-400 hover:text-white flex transition-colors"
                title="Tela Cheia"
              >
                <Maximize2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isFullScreen && !isImmersionMode && currentTrack && (
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
                <h2 className="text-lg font-bold tracking-tighter text-neon-cyan neon-text-cyan">
                  NEONBEAT PLAYER
                </h2>
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
              <div
                className="w-full shrink-0 block md:hidden"
                style={{ height: "30vh" }}
              ></div>

              {/* Right Column - Track Info & Controls */}
              <div className="order-1 md:order-2 w-full md:w-[50vw] md:h-full flex flex-col md:overflow-y-auto pl-[5vw] pr-[5vw] md:pl-[2.5vw] pt-4 md:pt-[32px] pb-8 md:pb-24 scrollbar-hide">
                <div className="w-full max-w-[500px] flex flex-col gap-6 z-10 md:border-t-0 md:mt-0 md:pt-0">
                  <div className="space-y-4">
                    <span className="inline-block px-3 py-1 bg-neon-cyan/10 border border-neon-cyan/20 text-neon-cyan text-[10px] uppercase tracking-[0.2em] font-bold rounded-full">
                      Transmitindo Agora
                    </span>
                    <h1 className="text-4xl font-bold leading-tight neon-text-cyan">
                      {currentTrack.title}
                    </h1>
                    <p className="text-zinc-400 text-xl uppercase tracking-[0.2em]">
                      {currentTrack.artist}
                    </p>
                  </div>

                  <div className="p-6 glass-panel rounded-3xl border-white/5 space-y-6 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-neon-cyan/5 blur-3xl -mr-16 -mt-16 transition-colors"></div>
                    <div className="flex items-start gap-4">
                      <div className="w-1 h-12 bg-gradient-to-b from-neon-cyan to-transparent shadow-[0_0_15px_var(--color-neon-cyan)]"></div>
                      <div>
                        <p className="text-[10px] text-neon-cyan uppercase font-black tracking-widest mb-2">
                          Frequência Detectada
                        </p>
                        <p className="text-sm italic text-zinc-300 leading-relaxed font-medium">
                          Sintonizando tracks similares via API YouTube. Fluxo
                          estável.
                        </p>
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
                    <button
                      onClick={onNext}
                      className="flex-1 py-4 bg-neon-cyan text-cyber-dark rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-[0_0_30px_color-mix(in_srgb,var(--color-neon-cyan)_40%,transparent)] hover:scale-[1.02] transition-transform"
                    >
                      Próximo
                    </button>
                    <button
                      onClick={() => setIsRepeat(!isRepeat)}
                      className={cn(
                        "w-14 shrink-0 h-full py-4 glass-panel rounded-2xl hover:bg-white/10 transition-all font-bold uppercase text-white border border-white/5 flex items-center justify-center",
                        isRepeat &&
                          "bg-white/20 text-neon-cyan border-neon-cyan/50 shadow-[0_0_15px_color-mix(in_srgb,var(--color-neon-cyan)_20%,transparent)]",
                      )}
                    >
                      <Repeat className="w-5 h-5" />
                    </button>
                    <div className="relative">
                      <button
                        onClick={() =>
                          setSleepTimerDropdownOpen(!sleepTimerDropdownOpen)
                        }
                        className={cn(
                          "w-14 shrink-0 h-full py-4 glass-panel rounded-2xl hover:bg-white/10 transition-all font-bold uppercase text-white border border-white/5 flex flex-col items-center justify-center gap-0.5",
                          sleepTimerEnd &&
                            "bg-white/20 text-neon-cyan border-neon-cyan/50 shadow-[0_0_15px_color-mix(in_srgb,var(--color-neon-cyan)_20%,transparent)]",
                        )}
                        title="Modo Dormir"
                      >
                        <Timer className="w-5 h-5 flex-shrink-0" />
                        {remainingSeconds !== null && (
                          <span
                            className="text-[9px] font-mono leading-none tracking-tighter"
                            style={{ marginTop: "-2px" }}
                          >
                            {formatTime(remainingSeconds)}
                          </span>
                        )}
                      </button>

                      <AnimatePresence>
                        {sleepTimerDropdownOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 10 }}
                            className="absolute bottom-full right-0 mb-3 w-40 bg-cyber-dark/95 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden glass-panel z-50 flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.5)]"
                          >
                            <div className="px-4 py-2 border-b border-white/5 bg-black/40">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                                Modo Dormir
                              </span>
                            </div>
                            {[15, 30, 45, 60].map((mins) => (
                              <button
                                key={mins}
                                onClick={() => {
                                  setSleepTimerEnd(Date.now() + mins * 60000);
                                  setSleepTimerDropdownOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left text-sm font-medium text-white hover:bg-white/10 transition-colors border-b border-white/5 last:border-0 flex items-center justify-between"
                              >
                                {mins === 60 ? "1 Hora" : `${mins} Minutos`}
                                {remainingSeconds !== null &&
                                  remainingSeconds > (mins - 15) * 60 &&
                                  remainingSeconds <= mins * 60 && (
                                    <div className="w-1.5 h-1.5 rounded-full bg-neon-cyan shadow-[0_0_8px_var(--color-neon-cyan)]"></div>
                                  )}
                              </button>
                            ))}
                            {sleepTimerEnd && (
                              <button
                                onClick={() => {
                                  setSleepTimerEnd(null);
                                  setSleepTimerDropdownOpen(false);
                                }}
                                className="w-full px-4 py-3 text-left text-sm font-bold text-red-400 hover:text-red-300 hover:bg-white/5 transition-colors mt-1 bg-red-400/5 text-center"
                              >
                                Desativar
                              </button>
                            )}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>

                  <button
                    onClick={openImmersionMode}
                    className="w-full mt-2 py-4 glass-panel rounded-2xl hover:bg-white/10 transition-all font-bold uppercase text-xs tracking-[0.2em] text-neon-cyan drop-shadow-[0_0_8px_color-mix(in_srgb,var(--color-neon-cyan)_80%,transparent)] border border-neon-cyan/20 flex items-center justify-center gap-2 animate-pulse group shadow-[0_0_15px_color-mix(in_srgb,var(--color-neon-cyan)_10%,transparent)]"
                  >
                    <Sparkles className="w-4 h-4 text-neon-cyan" />
                    Imersão Total
                  </button>
                </div>
              </div>

              {/* Left Column - Suggestions (scrolls under the fixed video) */}
              <div className="order-2 md:order-1 w-full md:w-[50vw] md:h-full flex flex-col md:overflow-y-auto scrollbar-hide pl-[5vw] pr-[5vw] md:pr-[2.5vw] md:pt-[24px] pb-24">
                {/* Desktop spacer */}
                <div
                  className="hidden md:block w-full shrink-0"
                  style={{ height: "45vh" }}
                ></div>

                {(() => {
                  const currentIdx = queue.findIndex(
                    (t) => t.id === currentTrack.id,
                  );
                  const isInPlaylist = queue.length > 0 && currentIdx !== -1;

                  let displayTracks: Track[] = [];
                  let title = "Sugestões de Tracks";

                  if (isInPlaylist) {
                    title = "Playlist";
                    displayTracks = [
                      ...queue.slice(currentIdx + 1),
                      ...queue.slice(0, currentIdx),
                    ];
                  } else {
                    displayTracks = relatedTracks;
                  }

                  if (displayTracks.length === 0) return null;

                  const handleReorder = (reorderedTracks: Track[]) => {
                    if (onReorderQueue && isInPlaylist && currentTrack) {
                      const currentIdx = queue.findIndex(
                        (t) => t.id === currentTrack.id,
                      );
                      if (currentIdx !== -1) {
                        onReorderQueue([
                          ...queue.slice(0, currentIdx + 1),
                          ...reorderedTracks,
                        ]);
                      }
                    }
                  };

                  const trackItems = displayTracks.map((track) => {
                    const content = (
                      <div
                        onClick={() =>
                          onPlayTrack?.(track, isInPlaylist ? queue : undefined)
                        }
                        className="group flex items-center gap-4 p-3 glass-panel rounded-xl border-white/5 hover:bg-white/5 cursor-pointer transition-all hover:border-neon-cyan/30 bg-black/40"
                      >
                        <div className="w-12 h-12 shrink-0 rounded-lg overflow-hidden border border-white/10 relative">
                          <img
                            src={track.thumbnail}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                            <Play className="w-5 h-5 fill-neon-cyan text-neon-cyan drop-shadow-[0_0_10px_var(--color-neon-cyan)]" />
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h5 className="text-xs font-bold text-white truncate group-hover:text-neon-cyan transition-colors">
                            {track.title}
                          </h5>
                          <p className="text-[10px] text-zinc-500 uppercase tracking-tighter truncate">
                            {track.artist}
                          </p>
                        </div>
                      </div>
                    );

                    return isInPlaylist ? (
                      <Reorder.Item
                        key={track.id}
                        value={track}
                        className="relative z-10 w-full mb-3"
                        style={{ listStyle: "none" }}
                      >
                        {content}
                      </Reorder.Item>
                    ) : (
                      <div key={track.id} className="relative z-10 w-full mb-3">
                        {content}
                      </div>
                    );
                  });

                  return (
                    <div className="w-full mt-8">
                      <div className="flex items-center gap-3 mb-6">
                        <Music className="w-5 h-5 text-neon-cyan" />
                        <h3 className="text-sm border-white font-bold uppercase tracking-[0.3em] text-zinc-400">
                          {title}
                        </h3>
                      </div>

                      {isInPlaylist ? (
                        <Reorder.Group
                          axis="y"
                          values={displayTracks}
                          onReorder={handleReorder}
                          className="w-full"
                        >
                          {trackItems}
                        </Reorder.Group>
                      ) : (
                        <div className="w-full">{trackItems}</div>
                      )}
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
