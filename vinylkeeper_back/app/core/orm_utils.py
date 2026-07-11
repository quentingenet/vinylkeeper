from sqlalchemy.exc import SQLAlchemyError


def is_loaded(obj, attr: str) -> bool:
    """True if the ORM relationship `attr` is already loaded on `obj`.

    Unlike hasattr(), this also catches SQLAlchemyError: lazy="raise" raises
    InvalidRequestError and lazy="select" under an AsyncSession raises
    MissingGreenlet (a subclass of InvalidRequestError) — hasattr() only
    swallows AttributeError, so it does not protect against either.
    """
    try:
        getattr(obj, attr)
        return True
    except (AttributeError, SQLAlchemyError):
        return False
