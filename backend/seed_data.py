import sqlite3

from .database import create_item, init_db


SAMPLE_ITEMS = [
    {
        "title": "Education grant announced for Burundi schools",
        "url": "https://example.org/education-grant-burundi",
        "source": "manual",
        "published_at": "2026-06-27T09:00:00Z",
        "language": "en",
        "raw_text": "A new grant program will support school supplies and teacher training in Burundi.",
    },
    {
        "title": "Animal welfare coalition opens funding round",
        "url": "https://example.org/animal-welfare-funding",
        "source": "manual",
        "published_at": "2026-06-27T10:00:00Z",
        "language": "en",
        "raw_text": "NGOs can apply for funding to improve animal welfare programs. Deadline is 2026-08-15.",
    },
    {
        "title": "Humanitarian update from East Africa",
        "url": "https://example.org/east-africa-humanitarian-update",
        "source": "manual",
        "published_at": "2026-06-27T11:00:00Z",
        "language": "en",
        "raw_text": "Humanitarian organizations report increased needs across East Africa.",
    },
]


def main() -> None:
    init_db()
    inserted = 0
    for item in SAMPLE_ITEMS:
        try:
            create_item(**item)
            inserted += 1
        except sqlite3.IntegrityError:
            continue
    print(f"Inserted {inserted} sample items")


if __name__ == "__main__":
    main()
