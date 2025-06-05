export interface StreamingPlatform {
  name: string;
  icon: string;
  webUrl: string;
  mobileUrl?: string;
}

export interface StreamingQuery {
  artist?: string;
  album?: string;
  track?: string;
}

class MusicStreamingService {
  private platforms: StreamingPlatform[] = [
    {
      name: "Spotify",
      icon: "🎧",
      webUrl: import.meta.env.VITE_SPOTIFY_WEB_URL,
      mobileUrl: import.meta.env.VITE_SPOTIFY_MOBILE_URL,
    },
    {
      name: "Deezer",
      icon: "🎧",
      webUrl: import.meta.env.VITE_DEEZER_WEB_URL,
      mobileUrl: import.meta.env.VITE_DEEZER_MOBILE_URL,
    },
    {
      name: "YouTube Music",
      icon: "🎧",
      webUrl: import.meta.env.VITE_YOUTUBE_MUSIC_URL,
    },
  ];

  private isMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
  }

  private buildSearchQuery(query: StreamingQuery): string {
    const parts: string[] = [];

    if (query.artist) parts.push(query.artist);
    if (query.album) parts.push(query.album);
    if (query.track) parts.push(query.track);

    return encodeURIComponent(parts.join(" "));
  }

  private buildUrl(platform: StreamingPlatform, searchQuery: string): string {
    const isMobile = this.isMobile();

    if (isMobile && platform.mobileUrl) {
      return `${platform.mobileUrl}:${searchQuery}`;
    }

    // Format spécifique selon la plateforme
    if (platform.name === "Spotify" || platform.name === "Deezer") {
      return `${platform.webUrl}/${searchQuery}`;
    } else {
      return `${platform.webUrl}?q=${searchQuery}`;
    }
  }

  public redirectTo(platformName: string, query: StreamingQuery): void {
    const platform = this.platforms.find((p) => p.name === platformName);
    if (!platform) {
      console.error(`Platform ${platformName} not found`);
      return;
    }

    const searchQuery = this.buildSearchQuery(query);
    const url = this.buildUrl(platform, searchQuery);

    if (this.isMobile() && platform.mobileUrl) {
      this.attemptMobileRedirect(url, platform, searchQuery);
    } else {
      window.open(url, "_blank", "noopener,noreferrer");
    }
  }

  private attemptMobileRedirect(
    mobileUrl: string,
    platform: StreamingPlatform,
    searchQuery: string
  ): void {
    const webFallback = `${platform.webUrl}?q=${searchQuery}`;

    const iframe = document.createElement("iframe");
    iframe.style.display = "none";
    iframe.src = mobileUrl;
    document.body.appendChild(iframe);

    setTimeout(() => {
      document.body.removeChild(iframe);
      window.open(webFallback, "_blank", "noopener,noreferrer");
    }, 1000);
  }

  public getPlatforms(): StreamingPlatform[] {
    return this.platforms;
  }
}

export const musicStreamingService = new MusicStreamingService();
