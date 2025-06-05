from typing import Optional
import requests
from api.repositories.interfaces import IMusicMetadataRepository
from api.core.logging import logger


class MusicMetadataRepository(IMusicMetadataRepository):
    """SOLID implementation of Music Metadata Repository"""
    
    def _musicbrainz_headers(self):
        return {"User-Agent": "VinylKeeper/1.0 (kent1@localhost)"}
    
    def fetch_album_metadata(self, source: str, external_id: str, artist_name: Optional[str], album_title: Optional[str]) -> Optional[dict]:
        if source == "deezer":
            return self.fetch_deezer_album_metadata(external_id)
        if source == "musicbrainz":
            return self.fetch_musicbrainz_album_metadata(artist_name, album_title)
        return None

    def fetch_artist_metadata(self, source: str, external_id: str, artist_name: Optional[str]) -> Optional[dict]:
        if source == "musicbrainz":
            return self.fetch_musicbrainz_artist_metadata(artist_name)
        return None

    def fetch_deezer_album_metadata(self, album_id: str) -> Optional[dict]:
        """Fetch album metadata from Deezer API, avec fallback recherche si id invalide"""
        try:
            url = f"https://api.deezer.com/album/{album_id}"
            logger.info(f"Deezer album API request: {url}")
            response = requests.get(url, timeout=10)
            response.raise_for_status()
            data = response.json()
            # Si Deezer retourne une erreur/no data, on tente une recherche
            if data.get('error') or not data.get('title'):
                logger.warning(f"Deezer album not found for id {album_id}")
                return None
            # Format tracklist
            tracklist = []
            if 'tracks' in data and 'data' in data['tracks']:
                for i, track in enumerate(data['tracks']['data']):
                    tracklist.append({
                        'position': i + 1,
                        'title': track.get('title', ''),
                        'duration': self._format_duration(track.get('duration', 0))
                    })
            result = {
                'title': data.get('title'),
                'artist': data.get('artist', {}).get('name'),
                'tracklist': tracklist,
                'cover_art': data.get('cover_medium'),
            }
            # Parse release date
            if 'release_date' in data:
                try:
                    from datetime import datetime
                    release_date = datetime.strptime(data['release_date'], '%Y-%m-%d')
                    result['release_year'] = release_date.year
                except:
                    pass
            logger.info(f"Deezer album metadata fetched successfully for ID: {album_id}")
            return result
        except requests.RequestException as e:
            logger.error(f"Deezer album API request failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error fetching Deezer album data: {str(e)}")
            return None
    
    def fetch_musicbrainz_album_metadata(self, artist_name: str, album_title: str) -> Optional[dict]:
        """Fetch album metadata from MusicBrainz API"""
        try:
            import urllib.parse
            import time
            headers = self._musicbrainz_headers()
            # Première requête pour obtenir l'ID de l'album
            query = f'release:"{album_title}" AND artist:"{artist_name}"'
            encoded_query = urllib.parse.quote(query)
            search_url = f"https://musicbrainz.org/ws/2/release?query={encoded_query}&fmt=json&limit=1"
            
            logger.info(f"MusicBrainz album search request: {search_url}")
            
            response = requests.get(search_url, timeout=10, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            logger.info(f"MusicBrainz album search raw response: {data}")
            
            if 'releases' in data and len(data['releases']) > 0:
                release = data['releases'][0]
                release_id = release.get('id')
                
                if not release_id:
                    logger.warning(f"No release ID found for: {artist_name} - {album_title}")
                    return None
                
                # Attendre 1 seconde pour respecter le rate limit de MusicBrainz
                time.sleep(1)
                
                # Deuxième requête pour obtenir les détails complets avec la tracklist
                details_url = f"https://musicbrainz.org/ws/2/release/{release_id}?inc=recordings&fmt=json"
                logger.info(f"MusicBrainz album details request: {details_url}")
                
                response = requests.get(details_url, timeout=10, headers=headers)
                response.raise_for_status()
                
                release_data = response.json()
                logger.info(f"MusicBrainz album details raw response: {release_data}")
                
                result = {
                    'title': release_data.get('title'),
                    'artist': release_data.get('artist-credit', [{}])[0].get('artist', {}).get('name'),
                    'release_year': None,
                    'tracklist': []
                }
                
                # Parse release date
                if 'date' in release_data:
                    try:
                        from datetime import datetime
                        release_date = datetime.strptime(release_data['date'], '%Y-%m-%d')
                        result['release_year'] = release_date.year
                    except:
                        try:
                            result['release_year'] = int(release_data['date'][:4])
                        except:
                            pass
                
                # Parse tracklist
                if 'media' in release_data:
                    for medium in release_data['media']:
                        if 'tracks' in medium:
                            for i, track in enumerate(medium['tracks']):
                                recording = track.get('recording', {})
                                result['tracklist'].append({
                                    'position': i + 1,
                                    'title': recording.get('title', ''),
                                    'duration': self._format_duration(recording.get('length', 0) / 1000)  # Convert ms to seconds
                                })
                
                logger.info(f"MusicBrainz album metadata fetched successfully for: {artist_name} - {album_title}")
                return result
            
            logger.info(f"No MusicBrainz album data found for: {artist_name} - {album_title}")
            return None
            
        except requests.RequestException as e:
            logger.error(f"MusicBrainz album API request failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error fetching MusicBrainz album data: {str(e)}")
            return None
    
    def fetch_musicbrainz_artist_metadata(self, artist_name: str) -> Optional[dict]:
        """Fetch artist metadata from MusicBrainz API"""
        try:
            import urllib.parse
            headers = self._musicbrainz_headers()
            query = f'artist:"{artist_name}"'
            encoded_query = urllib.parse.quote(query)
            url = f"https://musicbrainz.org/ws/2/artist?query={encoded_query}&fmt=json&limit=1"
            
            logger.info(f"MusicBrainz artist API request: {url}")
            
            response = requests.get(url, timeout=10, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            
            if 'artists' in data and len(data['artists']) > 0:
                artist = data['artists'][0]
                result = {
                    'name': artist.get('name'),
                    'country': artist.get('country'),
                    'biography': artist.get('disambiguation', ''),
                }
                
                # Extract genres from tags
                if 'tags' in artist:
                    genres = [tag['name'] for tag in artist['tags'][:5]]
                    result['genres'] = genres
                
                # Ajout Wikipedia summary
                wiki = self.fetch_wikipedia_artist_summary(artist.get('name'))
                if wiki:
                    result['biography'] = wiki['biography']
                    result['wikipedia_url'] = wiki['wikipedia_url']
                
                logger.info(f"MusicBrainz artist metadata fetched successfully for: {artist_name}")
                return result
            
            logger.info(f"No MusicBrainz artist data found for: {artist_name}")
            return None
            
        except requests.RequestException as e:
            logger.error(f"MusicBrainz artist API request failed: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Error fetching MusicBrainz artist data: {str(e)}")
            return None
    
    def _format_duration(self, seconds: int) -> str:
        """Format duration from seconds to MM:SS"""
        if not seconds:
            return ""
        
        minutes = seconds // 60
        remaining_seconds = seconds % 60
        return f"{minutes}:{remaining_seconds:02d}"

    def truncate_text(self, text: str, max_length: int = 300) -> str:
        if len(text) > max_length:
            return text[:max_length] + "..."
        return text

    def fetch_wikipedia_artist_summary(self, artist_name: str, lang: str = "fr") -> Optional[dict]:
        import urllib.parse
        def try_fetch(title: str, lang: str) -> Optional[dict]:
            query = urllib.parse.quote(title)
            url = f"https://{lang}.wikipedia.org/api/rest_v1/page/summary/{query}"
            logger.info(f"Wikipedia summary API request: {url}")
            try:
                response = requests.get(url, timeout=10)
                response.raise_for_status()
                data = response.json()
                summary = data.get("extract")
                page_url = data.get("content_urls", {}).get("desktop", {}).get("page")
                if summary:
                    return {"biography": self.truncate_text(summary, 300), "wikipedia_url": page_url}
                return None
            except Exception as e:
                logger.warning(f"Wikipedia summary API failed for {title} [{lang}]: {str(e)}")
                return None

        # 1. Essayer le nom brut en français
        result = try_fetch(artist_name, lang)
        if result and ("musique" in result["biography"].lower() or "groupe" in result["biography"].lower()):
            return result
        # 2. Essayer ' (groupe)' en français
        result = try_fetch(f"{artist_name} (groupe)", lang)
        if result and ("musique" in result["biography"].lower() or "groupe" in result["biography"].lower()):
            return result
        # 3. Essayer le nom brut en anglais
        result = try_fetch(artist_name, "en")
        if result and ("music" in result["biography"].lower() or "band" in result["biography"].lower()):
            return result
        # 4. Essayer ' (band)' en anglais
        result = try_fetch(f"{artist_name} (band)", "en")
        if result and ("music" in result["biography"].lower() or "band" in result["biography"].lower()):
            return result
        return None 