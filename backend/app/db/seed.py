import uuid
from typing import List, Dict
from app.db.store import db_store

DEFAULT_BADGES = [
    {
        "id": "badge-water-guardian",
        "name": "Water Guardian",
        "code": "WATER_GUARDIAN",
        "description": "Awarded for reporting or resolving critical water leakage & sanitation issues.",
        "icon": "droplet",
        "points_threshold": 50
    },
    {
        "id": "badge-waste-champion",
        "name": "Waste Champion",
        "code": "WASTE_CHAMPION",
        "description": "Awarded for driving campus cleanliness & waste segregation actions.",
        "icon": "trash-2",
        "points_threshold": 50
    },
    {
        "id": "badge-energy-guardian",
        "name": "Energy Guardian",
        "code": "ENERGY_GUARDIAN",
        "description": "Awarded for identifying energy wastage and lighting infrastructure issues.",
        "icon": "zap",
        "points_threshold": 75
    },
    {
        "id": "badge-community-helper",
        "name": "Community Helper",
        "code": "COMMUNITY_HELPER",
        "description": "Awarded for actively confirming & validating nearby campus issues.",
        "icon": "users",
        "points_threshold": 30
    },
    {
        "id": "badge-top-contributor",
        "name": "Top Contributor",
        "code": "TOP_CONTRIBUTOR",
        "description": "Awarded to top 5% monthly sustainability contributors.",
        "icon": "award",
        "points_threshold": 150
    },
    {
        "id": "badge-sustainability-champion",
        "name": "Sustainability Champion",
        "code": "SUSTAINABILITY_CHAMPION",
        "description": "Ultimate campus recognition for outstanding overall sustainability leadership.",
        "icon": "trophy",
        "points_threshold": 300
    }
]

def seed_database():
    """Populates initial badges and demo data clearly labeled as DEMO DATA."""
    # Seed Badges
    for b in DEFAULT_BADGES:
        if b["code"] not in db_store.badges:
            db_store.badges[b["code"]] = b

    print(f"[Seed Engine] Successfully seeded {len(DEFAULT_BADGES)} default sustainability badges.")

if __name__ == "__main__":
    seed_database()
