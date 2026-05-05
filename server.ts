import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// Simple in-memory cache for server
const serverCache = new Map<string, { data: any, timestamp: number }>();
const SERVER_CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache on the server

function getFromServerCache(key: string) {
  const cached = serverCache.get(key);
  if (cached && Date.now() - cached.timestamp < SERVER_CACHE_DURATION) {
    return cached.data;
  }
  return null;
}

function setInServerCache(key: string, data: any) {
  serverCache.set(key, { data, timestamp: Date.now() });
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

  // YouTube search proxy
  app.get("/api/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!YOUTUBE_API_KEY) {
        return res.status(500).json({ error: "Missing YouTube API Key" });
      }

      const cacheKey = `search-${q}`;
      const cached = getFromServerCache(cacheKey);
      if (cached) return res.json(cached);

      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/search`,
        {
          params: {
            part: "snippet",
            maxResults: 30,
            q: q,
            type: "video",
            videoCategoryId: "10", // Music category
            key: YOUTUBE_API_KEY,
          },
        }
      );

      const items = response.data.items.map((item: any) => ({
        id: item.id.videoId,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        artist: item.snippet.channelTitle,
      }));

      setInServerCache(cacheKey, items);
      res.json(items);
    } catch (error: any) {
      console.error("Search error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch from YouTube" });
    }
  });

  // YouTube Trending/Discovery proxy
  app.get("/api/discover", async (req, res) => {
    try {
      const { pageToken } = req.query;
      if (!YOUTUBE_API_KEY) {
        return res.status(500).json({ error: "Missing YouTube API Key" });
      }

      const cacheKey = `discover-${pageToken || "first"}`;
      const cached = getFromServerCache(cacheKey);
      if (cached) return res.json(cached);

      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos`,
        {
          params: {
            part: "snippet,contentDetails",
            chart: "mostPopular",
            regionCode: "BR",
            videoCategoryId: "10", // Music
            maxResults: 50,
            pageToken: pageToken,
            key: YOUTUBE_API_KEY,
          },
        }
      );

      const items = response.data.items.map((item: any) => ({
        id: item.id,
        title: item.snippet.title,
        thumbnail: item.snippet.thumbnails.high.url,
        artist: item.snippet.channelTitle,
      }));

      const responseData = { items, nextPageToken: response.data.nextPageToken };
      setInServerCache(cacheKey, responseData);
      res.json(responseData);
    } catch (error: any) {
      console.error("Discover error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch trending music" });
    }
  });

  // YouTube Related/Suggested Tracks proxy
  app.get("/api/related", async (req, res) => {
    try {
      const { videoId, artist } = req.query;
      if (!YOUTUBE_API_KEY) {
        return res.status(500).json({ error: "Missing YouTube API Key" });
      }

      const cacheKey = `related-${videoId}-${artist}`;
      const cached = getFromServerCache(cacheKey);
      if (cached) return res.json(cached);

      // Improve search diversity by searching for artist and related genre tracks
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/search`,
        {
          params: {
            part: "snippet",
            maxResults: 15,
            q: `${artist} official music video`,
            type: "video",
            videoCategoryId: "10", // Music
            key: YOUTUBE_API_KEY,
          },
        }
      );

      const items = response.data.items
        .filter((item: any) => item.id.videoId !== videoId) // filter out current
        .map((item: any) => ({
          id: item.id.videoId,
          title: item.snippet.title,
          thumbnail: item.snippet.thumbnails.high.url,
          artist: item.snippet.channelTitle,
        }));

      setInServerCache(cacheKey, items);
      res.json(items);
    } catch (error: any) {
      console.error("Related error:", error.response?.data || error.message);
      res.status(500).json({ error: "Failed to fetch related tracks" });
    }
  });

      // Autocomplete proxy
      app.get("/api/autocomplete", async (req, res) => {
        try {
          const { q } = req.query;
          if (!q) return res.json([]);
          
          const cacheKey = `auto-${q}`;
          const cached = getFromServerCache(cacheKey);
          if (cached) return res.json(cached);

          const response = await axios.get(
            `http://suggestqueries.google.com/complete/search?client=firefox&ds=yt&q=${encodeURIComponent(q as string)}`
          );
          
          // response.data is something like ["query", ["sugg1", "sugg2"]]
          const suggestions = response.data[1] || [];
          setInServerCache(cacheKey, suggestions);
          res.json(suggestions);
        } catch (error: any) {
          console.error("Autocomplete error:", error.message);
          res.status(500).json({ error: "Failed to fetch autocomplete" });
        }
      });

      // YouTube Genre proxy
      app.get("/api/genre", async (req, res) => {
        try {
          const { genre } = req.query;
          if (!YOUTUBE_API_KEY) {
            return res.status(500).json({ error: "Missing YouTube API Key" });
          }
    
          const cacheKey = `genre-${genre}`;
          const cached = getFromServerCache(cacheKey);
          if (cached) return res.json(cached);

          const response = await axios.get(
            `https://www.googleapis.com/youtube/v3/search`,
            {
              params: {
                part: "snippet",
                maxResults: 15, // max recommended for carousel
                q: `${genre} hits current trending official music video`,
                type: "video",
                videoCategoryId: "10", // Music
                key: YOUTUBE_API_KEY,
              },
            }
          );
    
          const items = response.data.items.map((item: any) => ({
            id: item.id.videoId,
            title: item.snippet.title,
            thumbnail: item.snippet.thumbnails.high.url,
            artist: item.snippet.channelTitle,
          }));
    
          setInServerCache(cacheKey, items);
          res.json(items);
        } catch (error: any) {
          console.error("Genre error:", error.response?.data || error.message);
          res.status(500).json({ error: "Failed to fetch genre tracks" });
        }
      });
    
      // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
