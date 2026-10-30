from sqlalchemy import Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index, Integer, String, false, func

from app.models.base import Base

DISCOGS_IMPORT_STATUSES = ("queued", "running", "done", "failed")


class DiscogsImport(Base):
    """
    Import of a public Discogs collection into one collection of the user.

    The imports run one at a time on the whole server (see DiscogsImportService), so the
    Discogs rate limit shared with the live search is never exceeded. The counters are the
    progress shown while the import runs, then its summary.
    """

    __tablename__ = "discogs_imports"
    __table_args__ = (
        CheckConstraint(
            "status IN ('queued', 'running', 'done', 'failed')",
            name="ck_discogs_imports_status"
        ),
        CheckConstraint("phase IN ('collection', 'wantlist')", name="ck_discogs_imports_phase"),
        # The latest import of a user, polled while it runs
        Index("ix_discogs_imports_user_id_id", "user_id", "id"),
    )

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # SET NULL: the summary of an import outlives its collection (removed when a new one fails empty)
    collection_id = Column(Integer, ForeignKey("collections.id", ondelete="SET NULL"), nullable=True)
    discogs_username = Column(String(100), nullable=False)
    # Saved before importing into an existing collection: the owner deletes it once all is fine
    saved_copy_collection_id = Column(Integer, ForeignKey("collections.id", ondelete="SET NULL"), nullable=True)
    saved_copy_name = Column(String(255), nullable=True)
    created_collection = Column(Boolean, nullable=False, server_default=false(),
                                comment="The collection was created for this import (removed if it fails empty)")
    status = Column(String(20), nullable=False, server_default="queued")

    pages_total = Column(Integer, nullable=False, server_default="0")
    pages_done = Column(Integer, nullable=False, server_default="0")
    items_total = Column(Integer, nullable=False, server_default="0", comment="Discogs items, every format")
    vinyl_found = Column(Integer, nullable=False, server_default="0", comment="Distinct vinyl releases")
    other_formats = Column(Integer, nullable=False, server_default="0", comment="Items skipped: not vinyl")
    added = Column(Integer, nullable=False, server_default="0", comment="Releases added to the collection")
    copies_added = Column(Integer, nullable=False, server_default="0", comment="Copies, duplicates included")
    already_in_collection = Column(Integer, nullable=False, server_default="0")
    other_pressings = Column(Integer, nullable=False, server_default="0",
                             comment="Added releases whose work was already in the collection, another pressing")
    in_other_collections = Column(Integer, nullable=False, server_default="0",
                                  comment="Added releases already in another collection of the user")

    # Wantlist, imported into the wishlist after the collection when asked (same import, second phase)
    include_wantlist = Column(Boolean, nullable=False, server_default=false())
    phase = Column(String(20), nullable=False, server_default="collection",
                   comment="'collection' then 'wantlist': what pages_total and pages_done count")
    wantlist_items_total = Column(Integer, nullable=False, server_default="0", comment="Every format")
    wantlist_vinyl_found = Column(Integer, nullable=False, server_default="0")
    wantlist_other_formats = Column(Integer, nullable=False, server_default="0")
    wantlist_added = Column(Integer, nullable=False, server_default="0", comment="Added to the wishlist")
    wantlist_already_in_wishlist = Column(Integer, nullable=False, server_default="0")
    wantlist_owned = Column(Integer, nullable=False, server_default="0",
                            comment="Skipped: this very pressing is in a collection of the user")
    wantlist_other_pressings_owned = Column(Integer, nullable=False, server_default="0",
                                            comment="Added: another pressing of the work is in a collection")
    wantlist_error = Column(String(255), nullable=True,
                            comment="Why the wantlist was not imported (the collection was)")
    error_message = Column(String(255), nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)
    finished_at = Column(DateTime(timezone=True), nullable=True)

    def __repr__(self):
        return f"<DiscogsImport(id={self.id}, user_id={self.user_id}, status={self.status})>"
