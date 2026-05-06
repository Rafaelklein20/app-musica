import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export function useYouTubePlayer(onVideoEnd: () => void) {
  const [activePlayerIndex, setActivePlayerIndex] = useState<0 | 1>(0);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  
  const playersRef = useRef<any[]>([null, null]);
  const userVolume = useRef(100);
  const targetVideoId = useRef<string | null>(null);
  
  const isApiLoaded = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onVideoEndRef = useRef(onVideoEnd);
  
  const activeIdxRef = useRef<0 | 1>(0);

  useEffect(() => {
    onVideoEndRef.current = onVideoEnd;
  }, [onVideoEnd]);
  
  // Track time for active player
  useEffect(() => {
    timerRef.current = window.setInterval(() => {
      const activeP = playersRef.current[activeIdxRef.current];
      if (activeP && activeP.getCurrentTime) {
        setCurrentTime(activeP.getCurrentTime());
        setDuration(activeP.getDuration());
      }
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!window.YT) {
      if (!isApiLoaded.current) {
        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';
        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
        isApiLoaded.current = true;
      }
    }
  }, []);

  const crossfade = useCallback((oldIndex: 0 | 1, newIndex: 0 | 1) => {
    const oldP = playersRef.current[oldIndex];
    const newP = playersRef.current[newIndex];
    let volOld = userVolume.current;
    let volNew = 0;
    
    if (newP && typeof newP.setVolume === 'function') {
      newP.setVolume(volNew);
      newP.playVideo();
    }
    
    const steps = 30; // 3 seconds
    const intervalTime = 100;
    const fadeOutStep = volOld / steps;
    const fadeInStep = userVolume.current / steps;

    const interval = setInterval(() => {
      volOld -= fadeOutStep;
      volNew += fadeInStep;

      if (volOld <= 0 || volNew >= userVolume.current) {
        clearInterval(interval);
        if (oldP && typeof oldP.pauseVideo === 'function') {
          oldP.pauseVideo();
        }
        if (newP && typeof newP.setVolume === 'function') {
          newP.setVolume(userVolume.current);
        }
      } else {
        if (oldP && typeof oldP.setVolume === 'function') oldP.setVolume(Math.round(volOld));
        if (newP && typeof newP.setVolume === 'function') newP.setVolume(Math.round(volNew));
      }
    }, intervalTime);
  }, []);

  const createPlayer = useCallback((index: 0 | 1, videoId: string, autoplay: boolean, onload: () => void) => {
    try {
      const newPlayer = new window.YT.Player(`youtube-player-${index}`, {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: autoplay ? 1 : 0,
          modestbranding: 1,
          controls: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            playersRef.current[index] = newPlayer;
            if (!isReady && index === 0) setIsReady(true);
            
            onload();
          },
          onStateChange: (event: any) => {
            // Only update play state from active player
            if (activeIdxRef.current === index) {
              if (event.data === window.YT.PlayerState.PLAYING) {
                setIsPlaying(true);
              } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
                setIsPlaying(false);
              }
              if (event.data === window.YT.PlayerState.ENDED) {
                onVideoEndRef.current();
              }
            }
          },
          onError: (e: any) => {
            if (activeIdxRef.current === index) {
              if ([5, 100, 101, 150].includes(e.data)) {
                onVideoEndRef.current();
              }
            }
          }
        },
      });
    } catch (err) {
      console.error('Failed to create YouTube player:', err);
    }
  }, [isReady]);

  const initPlayer = useCallback((videoId: string) => {
    if (videoId === targetVideoId.current) return;
    targetVideoId.current = videoId;
    
    if (!window.YT || !window.YT.Player) {
      window.onYouTubeIframeAPIReady = () => {
        initPlayer(videoId);
      };
      return;
    }

    const currentIdx = activeIdxRef.current;
    
    // Initial start
    if (!playersRef.current[0] && !playersRef.current[1]) {
      createPlayer(0, videoId, true, () => {
        const p = playersRef.current[0];
        if(p) {
          p.setVolume(userVolume.current);
          p.playVideo();
        }
      });
      return;
    }

    // Changing track with existing player, use the other player for crossfade
    const nextIdx = currentIdx === 0 ? 1 : 0;
    activeIdxRef.current = nextIdx;
    setActivePlayerIndex(nextIdx);

    const oldP = playersRef.current[currentIdx];
    const newP = playersRef.current[nextIdx];

    const doTransition = () => {
      // If we're not currently playing, don't crossfade, just jump
      if (oldP && oldP.getPlayerState && oldP.getPlayerState() === window.YT.PlayerState.PLAYING) {
        crossfade(currentIdx, nextIdx);
      } else {
        if (oldP && typeof oldP.pauseVideo === 'function') oldP.pauseVideo();
        const p = playersRef.current[nextIdx];
        if (p && typeof p.setVolume === 'function') {
          p.setVolume(userVolume.current);
          p.playVideo();
        }
      }
    };

    if (!newP) {
      createPlayer(nextIdx, videoId, false, () => {
        doTransition();
      });
    } else {
      if (typeof newP.loadVideoById === 'function') {
        newP.loadVideoById(videoId);
        setTimeout(doTransition, 200); // Give it a moment to buffer slightly
      }
    }

  }, [createPlayer, crossfade]);

  const pauseVideo = useCallback(() => {
    const p = playersRef.current[activeIdxRef.current];
    if (p && typeof p.pauseVideo === 'function') {
      p.pauseVideo();
    }
  }, []);

  const playVideo = useCallback(() => {
    const p = playersRef.current[activeIdxRef.current];
    if (p && typeof p.playVideo === 'function') {
      p.playVideo();
    }
  }, []);

  const seekTo = useCallback((seconds: number) => {
    const p = playersRef.current[activeIdxRef.current];
    if (p && typeof p.seekTo === 'function') {
      p.seekTo(seconds, true);
    }
  }, []);

  const updateVolume = useCallback((val: number) => {
    userVolume.current = val;
    setVolume(val);
    const p = playersRef.current[activeIdxRef.current];
    if (p && typeof p.setVolume === 'function') {
      p.setVolume(val);
    }
  }, []);

  return { 
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
    activePlayerIndex
  };
}
