import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';
import { Track } from './types';

const apiCache = new Map<string, any>();
const CACHE_DURATION = 1000 * 60 * 15; // 15 minutes

interface CacheItem {
  data: any;
  timestamp: number;
}

function getFromCache(key: string) {
  const cached = apiCache.get(key) as CacheItem | undefined;
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setInCache(key: string, data: any) {
  apiCache.set(key, { data, timestamp: Date.now() });
}

export function useMusicApi() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const searchTracks = useCallback(async (query: string): Promise<Track[]> => {
    const cacheKey = `search-${query}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/search', { params: { q: query } });
      setInCache(cacheKey, response.data);
      return response.data;
    } catch (err) {
      setError('Failed to search tracks');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getDiscovery = useCallback(async (pageToken?: string): Promise<{ items: Track[], nextPageToken?: string }> => {
    const cacheKey = `discover-${pageToken || 'first'}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/discover', { params: { pageToken } });
      setInCache(cacheKey, response.data);
      return response.data;
    } catch (err) {
      setError('Failed to fetch discovery tracks');
      return { items: [] };
    } finally {
      setLoading(false);
    }
  }, []);
  
  const getRelatedTracks = useCallback(async (videoId: string, artist: string, title?: string): Promise<Track[]> => {
    const cacheKey = `related-${videoId}-${artist}-${title || ''}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    setLoading(true);
    setError(null);
    try {
      const response = await axios.get('/api/related', { params: { videoId, artist, title } });
      setInCache(cacheKey, response.data);
      return response.data;
    } catch (err) {
      setError('Failed to fetch related tracks');
      return [];
    } finally {
      setLoading(false);
    }
  }, []);

  const getGenreTracks = useCallback(async (genre: string): Promise<Track[]> => {
    const cacheKey = `genre-${genre}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get('/api/genre', { params: { genre } });
      setInCache(cacheKey, response.data);
      return response.data;
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  const getAutocomplete = useCallback(async (query: string): Promise<string[]> => {
    if (!query.trim()) return [];
    const cacheKey = `auto-${query}`;
    const cached = getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const response = await axios.get('/api/autocomplete', { params: { q: query } });
      setInCache(cacheKey, response.data);
      return response.data;
    } catch (err) {
      console.error(err);
      return [];
    }
  }, []);

  return { searchTracks, getDiscovery, getRelatedTracks, getGenreTracks, getAutocomplete, loading, error };
}
