import re

import time
from fastapi import HTTPException

RATE_LIMIT_STORE = {}

def check_rate_limit(key: str, limit: int = 5, window: int = 60):
    now = time.time()
    requests = RATE_LIMIT_STORE.get(key, [])

    # remove old requests
    requests = [r for r in requests if now - r < window]

    if len(requests) >= limit:
        raise HTTPException(
            status_code=429,
            detail="Too many requests. Try again later."
        )

    requests.append(now)
    RATE_LIMIT_STORE[key] = requests

def slugify(text: str) -> str:
    """Turns 'My Org Name!!' into 'my-org-name'"""
    text = text.lower().strip()
    # Remove everything except letters, numbers, and spaces
    text = re.sub(r'[^\w\s-]', '', text)
    # Replace spaces with hyphens
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')