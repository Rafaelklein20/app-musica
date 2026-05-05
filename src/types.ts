export interface Track {
  id: string;
  title: string;
  thumbnail: string;
  artist: string;
}

export interface Playlist {
  id: string;
  name: string;
  tracks: Track[];
  createdAt: number;
  cover?: string;
}
