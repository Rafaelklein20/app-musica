import { useState, useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

export function useYouTubePlayer(onVideoEnd: () => void) {
  const [player, setPlayer] = useState<any>(null);
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(100);
  const pendingVideoId = useRef<string | null>(null);
  const isApiLoaded = useRef(false);
  const timerRef = useRef<number | null>(null);
  const onVideoEndRef = useRef(onVideoEnd);

  useEffect(() => {
    onVideoEndRef.current = onVideoEnd;
  }, [onVideoEnd]);

  useEffect(() => {
    if (isReady && player && pendingVideoId.current) {
      player.loadVideoById(pendingVideoId.current);
      pendingVideoId.current = null;
    }
  }, [isReady, player]);

  useEffect(() => {
    if (isReady && player) {
      timerRef.current = window.setInterval(() => {
        if (player.getCurrentTime) {
          setCurrentTime(player.getCurrentTime());
          setDuration(player.getDuration());
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isReady, player]);

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

    return () => {
      // Manual cleanup if needed
    };
  }, []);

  const currentVideoId = useRef<string | null>(null);

  const initPlayer = useCallback((videoId: string) => {
    if (videoId === currentVideoId.current && player) return;
    
    if (!window.YT || !window.YT.Player) {
      pendingVideoId.current = videoId;
      window.onYouTubeIframeAPIReady = () => {
        initPlayer(videoId);
      };
      return;
    }

    const playerElement = document.getElementById('youtube-player-actual');
    if (!playerElement) {
      setTimeout(() => initPlayer(videoId), 100);
      return;
    }

    if (player) {
      if (isReady && typeof player.loadVideoById === 'function') {
        player.loadVideoById(videoId);
        currentVideoId.current = videoId;
      } else {
        pendingVideoId.current = videoId;
      }
      return;
    }

    try {
      const newPlayer = new window.YT.Player('youtube-player-actual', {
        height: '100%',
        width: '100%',
        videoId: videoId,
        playerVars: {
          autoplay: 1,
          modestbranding: 1,
          controls: 1,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            setIsReady(true);
            event.target.playVideo();
            setVolume(event.target.getVolume());
            currentVideoId.current = videoId;
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.PLAYING) {
              setIsPlaying(true);
            } else if (event.data === window.YT.PlayerState.PAUSED || event.data === window.YT.PlayerState.ENDED) {
              setIsPlaying(false);
            }
            if (event.data === window.YT.PlayerState.ENDED) {
              onVideoEndRef.current();
            }
          },
          onError: (e: any) => {
            if ([5, 100, 101, 150].includes(e.data)) {
              onVideoEndRef.current();
            }
          }
        },
      });

      setPlayer(newPlayer);
    } catch (err) {
      console.error('Failed to create YouTube player:', err);
    }
  }, [player, isReady, onVideoEnd]);

  const pauseVideo = useCallback(() => {
    if (player && typeof player.pauseVideo === 'function' && isReady) {
      player.pauseVideo();
    }
  }, [player, isReady]);

  const playVideo = useCallback(() => {
    if (player && typeof player.playVideo === 'function' && isReady) {
      player.playVideo();
    }
  }, [player, isReady]);

  const seekTo = useCallback((seconds: number) => {
    if (player && typeof player.seekTo === 'function' && isReady) {
      player.seekTo(seconds, true);
    }
  }, [player, isReady]);

  const updateVolume = useCallback((val: number) => {
    if (player && typeof player.setVolume === 'function' && isReady) {
      player.setVolume(val);
      setVolume(val);
    }
  }, [player, isReady]);

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
    isPlaying
  };
}
