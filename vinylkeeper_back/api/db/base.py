from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

import api.models.user_model
import api.models.collection_model
import api.models.rating_model
import api.models.loan_model
import api.models.wishlist_model
import api.models.artist_model
import api.models.album_model
import api.models.genre_model
import api.models.role_model

