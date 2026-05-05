import React from 'react';
import { useEffect, useState } from 'react';
import { useMusicApi } from '../useMusicApi';
import { Track } from '../types';
import { TrackCard } from './TrackCard';
import { Disc } from 'lucide-react';

const GENRES = [
  "Pop", "Eletrônica", "Rock", "Hip Hop", "R&B", 
  "K-Pop", "Sertanejo", "Funk Brasileiro", "Reggaeton", 
  "Jazz", "Música Clássica", "Heavy Metal", "Lo-Fi",
  "Rap de Anime", "Trap", "Phonk", "Indie Rock", "MPB",
  "Pagode", "Forró", "Synthwave", "J-Pop", "J-Rock",
  "Gamer", "Nerdcore", "Vocaloid"
];

interface CategoriesTabProps {
  playTrack: (track: Track) => void;
  saveToPlaylist: (track: Track) => void;
}

export const CategoriesTab = React.memo(function CategoriesTab({ playTrack, saveToPlaylist }: CategoriesTabProps) {
  return (
    <div className="space-y-16">
      <div className="flex items-center gap-3 border-b border-white/10 pb-6">
        <Disc className="text-neon-cyan w-8 h-8" />
        <h2 className="text-3xl font-bold tracking-tight">Categorias</h2>
      </div>
      
      {GENRES.map(genre => (
        <GenreSlider 
          key={genre} 
          genre={genre} 
          playTrack={playTrack} 
          saveToPlaylist={saveToPlaylist} 
        />
      ))}
    </div>
  );
});

interface GenreSliderProps {
  genre: string;
  playTrack: (t: Track) => void;
  saveToPlaylist: (t: Track) => void;
}

const GenreSlider: React.FC<GenreSliderProps> = ({ genre, playTrack, saveToPlaylist }) => {
  const [tracks, setTracks] = useState<Track[]>([]);
  const { getGenreTracks, loading } = useMusicApi();
  const [fetched, setFetched] = useState(false);

  // Use IntersectionObserver to lazy load genres
  useEffect(() => {
    let observer: IntersectionObserver;
    const element = document.getElementById(`genre-${genre}`);
    
    if (element) {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !fetched) {
            setFetched(true);
            getGenreTracks(genre).then(setTracks);
          }
        },
        { rootMargin: "200px" } // trigger before fully visible
      );
      observer.observe(element);
    }
    
    return () => {
      if (observer) observer.disconnect();
    };
  }, [genre, fetched, getGenreTracks]);

  return (
    <div id={`genre-${genre}`} className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold tracking-widest uppercase text-zinc-200 border-l-2 pl-4 border-neon-pink">{genre}</h3>
      </div>
      
      <div className="relative">
        <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 px-2 snap-x">
          {!fetched || loading && tracks.length === 0 ? (
            // Skeleton loaders
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="min-w-[250px] w-[250px] h-[300px] glass-panel rounded-2xl animate-pulse shrink-0 snap-start"></div>
            ))
          ) : (
            tracks.map(track => (
              <div key={track.id} className="min-w-[250px] w-[250px] shrink-0 snap-start">
                <TrackCard 
                  track={track} 
                  onPlay={() => playTrack(track)}
                  onSave={saveToPlaylist}
                />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
