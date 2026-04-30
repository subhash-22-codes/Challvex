import re

def slugify(text: str) -> str:
    """Turns 'My Org Name!!' into 'my-org-name'"""
    text = text.lower().strip()
    # Remove everything except letters, numbers, and spaces
    text = re.sub(r'[^\w\s-]', '', text)
    # Replace spaces with hyphens
    text = re.sub(r'[\s_-]+', '-', text)
    return text.strip('-')