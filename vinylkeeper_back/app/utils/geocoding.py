import httpx
from typing import Optional, Tuple
from app.core.logging import logger


async def geocode_city(city: str, country: str) -> Optional[Tuple[float, float]]:
    """
    Geocode a city and country to get latitude and longitude coordinates.
    
    Args:
        city: The city name
        country: The country name
        
    Returns:
        Tuple of (latitude, longitude) or None if geocoding fails
    """
    try:
        # Clean and prepare the query
        city_clean = city.strip()
        country_clean = country.strip()
        query = f"{city_clean}, {country_clean}"
        
        # Use Nominatim API for geocoding
        url = "https://nominatim.openstreetmap.org/search"
        
        params = {
            "q": query,
            "format": "json",
            "limit": 1,
            "addressdetails": 1,
            "countrycodes": "",  # Let Nominatim find the best match
            "accept-language": "en"  # Prefer English results
        }
        
        headers = {
            "User-Agent": "VinylKeeper/1.0 (https://vinylkeeper.org)"
        }
        
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(url, params=params, headers=headers)
            response.raise_for_status()
            
            data = response.json()
            
            if data and len(data) > 0:
                result = data[0]
                lat = float(result.get("lat", 0))
                lon = float(result.get("lon", 0))
                
                # Validate coordinates
                if -90 <= lat <= 90 and -180 <= lon <= 180:
                    return (lat, lon)
                else:
                    logger.warning(f"Invalid coordinates returned for {query}: ({lat}, {lon})")
                    return None
            else:
                logger.warning(f"No geocoding results found for {query}")
                return None
                
    except httpx.RequestError as e:
        logger.error(f"Network error during geocoding for {city}, {country}: {str(e)}")
        return None
    except httpx.HTTPStatusError as e:
        logger.error(f"HTTP error during geocoding for {city}, {country}: {str(e)}")
        return None
    except (ValueError, KeyError, TypeError) as e:
        logger.error(f"Data parsing error during geocoding for {city}, {country}: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Unexpected error during geocoding for {city}, {country}: {str(e)}")
        return None 