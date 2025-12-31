import { getConfig } from "@/lib/config";

export const getLyricsApiBase = (): string => {
  const saved = localStorage.getItem("lyrics-settings");
  if (saved) {
    const settings = JSON.parse(saved);
    if (settings.lyricsApiBase.trim()) {
      return settings.lyricsApiBase.trim().replace(/\/$/, "");
    }
  }
  return getConfig("VITE_LYRICS_API_BASE");
};

export type LyricsFormatType = "lrc" | "srt" | "raw";

export interface LyricsLineLrc {
  timeTag: string;
  words: string;
}

export interface LyricsLineSrt {
  index: number;
  startTime: string;
  endTime: string;
  words: string;
}

export interface LyricsResponseLrc {
  error: boolean;
  message?: string;
  syncType?: "LINE_SYNCED" | "UNSYNCED";
  lines?: LyricsLineLrc[];
}

export interface LyricsResponseSrt {
  error: boolean;
  message?: string;
  syncType?: "LINE_SYNCED" | "UNSYNCED";
  lines?: LyricsLineSrt[];
}

export interface LyricsResponseRaw {
  error: boolean;
  message?: string;
  syncType?: "LINE_SYNCED" | "UNSYNCED";
  lines?: string;
}

export type LyricsResponse =
  | LyricsResponseLrc
  | LyricsResponseSrt
  | LyricsResponseRaw;

export interface LyricsLine {
  timeTag?: string;
  startTimeMs?: string;
  words: string;
  endTimeMs?: string;
}

export class LyricsApiError extends Error {
  constructor(
    message: string,
    public statusCode?: number,
    public isRateLimited: boolean = false,
    public isNotAvailable: boolean = false
  ) {
    super(message);
    this.name = "LyricsApiError";
  }
}

export const fetchLyrics = async (
  trackId: string,
  format: LyricsFormatType = "lrc"
): Promise<LyricsResponse> => {
  const apiBase = getLyricsApiBase();
  const url = `${apiBase}/?trackid=${trackId}&format=${format}`;

  const response = await fetch(url);
  if (response.status === 429) {
    const waitTime = 30;
    throw new LyricsApiError(
      `Rate limited. Please wait ${waitTime} seconds.`,
      429,
      true,
      false
    );
  }
  if (response.status === 404) {
    throw new LyricsApiError(
      "Lyrics not available on Spotify",
      404,
      false,
      true
    );
  }
  let data: LyricsResponse;
  try {
    data = await response.json();
  } catch {
    throw new LyricsApiError(
      `Failed to fetch lyrics: ${response.statusText}`,
      response.status,
      false,
      false
    );
  }
  if (data.error) {
    throw new LyricsApiError(
      data.message || "Failed to fetch lyrics",
      response.status,
      false,
      false
    );
  }
  return data;
};

export const formatLyricsToLrc = (
  lyrics: LyricsResponseLrc,
  trackName?: string,
  duration?: number,
  artist?: string,
  album?: string
): string => {
  const lines: string[] = [];

  if (trackName) lines.push(`[ti:${trackName}]`);
  if (artist) lines.push(`[ar:${artist}]`);
  if (album) lines.push(`[al:${album}]`);
  if (duration)
    lines.push(
      `[length:${Math.floor(duration / 60000)}:${Math.floor(
        (duration % 60000) / 1000
      )
        .toString()
        .padStart(2, "0")}]`
    );
  lines.push("");

  if (lyrics.lines && Array.isArray(lyrics.lines)) {
    for (const line of lyrics.lines) {
      if (line.timeTag) {
        lines.push(`[${line.timeTag}]${line.words}`);
      } else {
        lines.push(line.words);
      }
    }
  }

  return lines.join("\n");
};

export const formatLyricsToSrt = (lyrics: LyricsResponseSrt): string => {
  const lines: string[] = [];

  if (lyrics.lines && Array.isArray(lyrics.lines)) {
    for (const line of lyrics.lines) {
      lines.push(`${line.index}`);
      lines.push(`${line.startTime} --> ${line.endTime}`);
      lines.push(line.words);
      lines.push("");
    }
  }

  return lines.join("\n");
};

export const formatLyricsToRaw = (lyrics: LyricsResponseRaw): string => {
  return lyrics.lines;
};

export const formatLyrics = (
  lyrics: LyricsResponse,
  format: LyricsFormatType,
  trackName?: string,
  duration?: number,
  artist?: string,
  album?: string
): string => {
  switch (format) {
    case "srt":
      return formatLyricsToSrt(lyrics as LyricsResponseSrt);
    case "raw":
      return formatLyricsToRaw(lyrics as LyricsResponseRaw);
    default:
      return formatLyricsToLrc(
        lyrics as LyricsResponseLrc,
        trackName,
        duration,
        artist,
        album
      );
  }
};

export const downloadLyricsFile = (content: string, filename: string): void => {
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const getFileExtension = (format: LyricsFormatType): string => {
  switch (format) {
    case "raw":
      return "txt";
    case "lrc":
      return "lrc";
    case "srt":
      return "srt";
    default:
      return "lrc";
  }
};

export const generateFilename = (
  formatTokens: string[],
  trackNumber: number,
  trackName: string,
  artist: string,
  album: string,
  format: LyricsFormatType,
  trackId?: string
): string => {
  const sanitize = (str: string): string => {
    return str.replace(/[<>:"/\\|?*]/g, "_").trim();
  };

  const parts = formatTokens.map((token) => {
    switch (token) {
      case "{track_number}":
        return trackNumber.toString().padStart(2, "0");
      case "{track_name}":
        return sanitize(trackName);
      case "{track_artist}":
      case "{artist}":
        return sanitize(artist);
      case "{track_album}":
      case "{album}":
        return sanitize(album);
      case "{track_id}":
        return trackId || "";
      default:
        return token;
    }
  });

  const extension = getFileExtension(format);
  return `${parts.join("")}.${extension}`;
};
