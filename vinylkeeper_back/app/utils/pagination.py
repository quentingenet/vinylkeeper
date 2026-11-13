def page_count(total: int, limit: int) -> int:
    """Pages needed for total items, limit per page: 0 when there is nothing."""
    return (total + limit - 1) // limit
