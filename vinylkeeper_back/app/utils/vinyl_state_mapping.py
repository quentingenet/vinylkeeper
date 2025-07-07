from typing import Dict, Optional
from app.core.enums import VinylStateEnum


class VinylStateMapping:
    """Mapping utility for vinyl states between string names and IDs"""
    
    # Mapping based on the order in VinylStateEnum
    # The IDs are assigned sequentially starting from 1
    _NAME_TO_ID: Dict[str, int] = {
        "mint": 1,
        "near_mint": 2,
        "very_good_plus": 3,
        "very_good": 4,
        "good_plus": 5,
        "good": 6,
        "fair": 7,
        "poor": 8,
        "not_defined": 9
    }
    
    _ID_TO_NAME: Dict[int, str] = {
        1: "mint",
        2: "near_mint",
        3: "very_good_plus",
        4: "very_good",
        5: "good_plus",
        6: "good",
        7: "fair",
        8: "poor",
        9: "not_defined"
    }
    
    @classmethod
    def get_id_from_name(cls, name: str) -> Optional[int]:
        """Get vinyl state ID from name"""
        if not name:
            return None
        return cls._NAME_TO_ID.get(name.lower())
    
    @classmethod
    def get_name_from_id(cls, state_id: int) -> Optional[str]:
        """Get vinyl state name from ID"""
        if not state_id:
            return None
        return cls._ID_TO_NAME.get(state_id)
    
    @classmethod
    def get_all_names(cls) -> list[str]:
        """Get all available vinyl state names"""
        return list(cls._NAME_TO_ID.keys())
    
    @classmethod
    def get_all_ids(cls) -> list[int]:
        """Get all available vinyl state IDs"""
        return list(cls._ID_TO_NAME.keys())
    
    @classmethod
    def is_valid_name(cls, name: str) -> bool:
        """Check if a vinyl state name is valid"""
        return name.lower() in cls._NAME_TO_ID
    
    @classmethod
    def is_valid_id(cls, state_id: int) -> bool:
        """Check if a vinyl state ID is valid"""
        return state_id in cls._ID_TO_NAME 