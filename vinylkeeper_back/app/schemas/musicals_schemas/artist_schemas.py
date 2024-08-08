from pydantic import BaseModel


class ArtistBase(BaseModel):
    name: str


class ArtistCreate(ArtistBase):
    pass


class Artist(ArtistBase):
    id: int

    class Config:
        from_attributes = True
