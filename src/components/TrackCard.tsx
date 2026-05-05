import React from 'react';
import { Play, Plus, Heart, MoreVertical, X } from 'lucide-react';
import { Track } from '../types';
import { motion } from 'motion/react';

interface TrackCardProps {
  track: Track;
  onPlay: (track: Track) => void;
  onSave?: (track: Track) => void;
  onRemove?: (track: Track) => void;
}

export const TrackCard: React.FC<TrackCardProps> = React.memo(({ track, onPlay, onSave, onRemove }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -5 }}
      className="group relative glass-panel p-4 rounded-2xl md:hover:bg-white/10 transition-all duration-500 overflow-hidden cursor-pointer"
      onClick={() => onPlay(track)}
    >
      <div className="relative aspect-video rounded-xl overflow-hidden mb-4">
        <img
          src={track.thumbnail}
          alt={track.title}
          className="w-full h-full object-cover transition-transform duration-700 md:group-hover:scale-110"
        />
        <div className="hidden absolute inset-0 bg-black/60 md:opacity-0 md:group-hover:opacity-100 transition-opacity md:flex items-center justify-center gap-3">
          <button
            className="w-12 h-12 bg-neon-cyan rounded-full flex items-center justify-center shadow-[0_0_15px_#00f3ff] md:hover:scale-110 transition-transform"
          >
            <Play className="text-cyber-dark fill-cyber-dark w-6 h-6 transform translate-x-0.5" />
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <h3 className="font-bold text-sm truncate pr-10 md:group-hover:text-neon-cyan transition-colors" title={track.title}>
          {track.title}
        </h3>
        <p className="text-xs text-zinc-400 truncate">{track.artist}</p>
      </div>

      <div className="absolute top-4 right-4 flex flex-col gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity z-10">
        {onRemove ? (
          <button 
            onClick={(e) => { e.stopPropagation(); onRemove(track); }}
            className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:text-red-500 hover:bg-white/10 border border-white/5 transition-all shadow-lg block md:hidden md:group-hover:block"
          >
            <X className="w-4 h-4" />
          </button>
        ) : onSave ? (
          <button 
            onClick={(e) => { e.stopPropagation(); onSave(track); }}
            className="p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:text-neon-pink hover:bg-white/10 border border-white/5 transition-all shadow-lg block md:hidden md:group-hover:block"
          >
            <Plus className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    </motion.div>
  );
});
