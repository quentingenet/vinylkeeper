from sqlalchemy.ext.declarative import declarative_base

Base = declarative_base()

import vinylkeeper_back.models.user_model
import vinylkeeper_back.models.collection_model
import vinylkeeper_back.models.rating_model
import vinylkeeper_back.models.loan_model
import vinylkeeper_back.models.wishlist_model
import vinylkeeper_back.models.artist_model
import vinylkeeper_back.models.album_model
import vinylkeeper_back.models.genre_model
import vinylkeeper_back.models.role_model

