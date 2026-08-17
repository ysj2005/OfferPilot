"""Shared job filtering helpers."""


def matching_deal_breaker(title: str, deal_breakers: list[str]) -> str | None:
    """Return the first deal-breaker keyword found in a job title."""
    title_lower = title.lower()
    for keyword in deal_breakers:
        cleaned_keyword = keyword.strip()
        if cleaned_keyword and cleaned_keyword.lower() in title_lower:
            return keyword
    return None
