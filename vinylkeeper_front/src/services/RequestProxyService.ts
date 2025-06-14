  async getArtistMetadata(artistName: string): Promise<ArtistMetadata> {
    const response = await this.api.get<ArtistMetadata>(`/api/artist/${encodeURIComponent(artistName)}`);
    return response.data;
  } 