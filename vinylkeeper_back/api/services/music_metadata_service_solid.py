from typing import Optional
from fastapi import HTTPException
from api.repositories.interfaces import IMusicMetadataRepository
from api.core.logging import logger


class MusicMetadataService:
    """SOLID Music Metadata Service - Business Logic Layer"""
    
    def __init__(self, metadata_repo: IMusicMetadataRepository):
        self.metadata_repo = metadata_repo
    
    def get_album_metadata(
        self, 
        album_id: str, 
        artist_name: Optional[str] = None, 
        album_title: Optional[str] = None
    ) -> dict:
        """Get detailed album metadata with business validation"""
        
        if not album_id or not album_id.strip():
            raise HTTPException(
                status_code=400,
                detail="Album ID cannot be empty"
            )
        
        try:
            metadata = {}
            
            if album_id.isdigit():
                deezer_data = self.metadata_repo.fetch_deezer_album_metadata(album_id)
                if deezer_data:
                    metadata.update(deezer_data)
                    logger.info(f"Deezer metadata retrieved for album ID: {album_id}")
            
            if artist_name and album_title:
                if len(artist_name.strip()) < 1 or len(album_title.strip()) < 1:
                    logger.warning("Artist name or album title too short for MusicBrainz query")
                else:
                    mb_data = self.metadata_repo.fetch_musicbrainz_album_metadata(
                        artist_name.strip(), 
                        album_title.strip()
                    )
                    if mb_data:
                        if 'release_year' in mb_data:
                            metadata['release_year'] = mb_data['release_year']
                        if 'tracklist' not in metadata and 'tracklist' in mb_data:
                            metadata['tracklist'] = mb_data['tracklist']
                        logger.info(f"MusicBrainz metadata enhanced for: {artist_name} - {album_title}")
            
            if not metadata:
                metadata = {
                    'title': album_title or 'Unknown Album',
                    'artist': artist_name or 'Unknown Artist',
                    'message': 'No metadata available from external sources'
                }
                logger.info(f"No external metadata found for album ID: {album_id}")
            
            return metadata
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Music metadata service error for album {album_id}: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching album metadata: {str(e)}"
            )
    
    def get_artist_metadata(
        self, 
        artist_id: str, 
        artist_name: Optional[str] = None
    ) -> dict:
        """Get detailed artist metadata with business validation"""
        
        if not artist_id or not artist_id.strip():
            raise HTTPException(
                status_code=400,
                detail="Artist ID cannot be empty"
            )
        
        if not artist_name or len(artist_name.strip()) < 1:
            raise HTTPException(
                status_code=400,
                detail="Artist name is required for metadata lookup"
            )
        
        try:
            metadata = {}
            
            mb_data = self.metadata_repo.fetch_musicbrainz_artist_metadata(artist_name.strip())
            if mb_data:
                metadata.update(mb_data)
                logger.info(f"MusicBrainz artist metadata retrieved for: {artist_name}")
            
            if not metadata:
                metadata = {
                    'name': artist_name.strip(),
                    'message': 'No metadata available from external sources'
                }
                logger.info(f"No external metadata found for artist: {artist_name}")
            
            return metadata
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Music metadata service error for artist {artist_name}: {str(e)}")
            raise HTTPException(
                status_code=500,
                detail=f"Error fetching artist metadata: {str(e)}"
            ) 