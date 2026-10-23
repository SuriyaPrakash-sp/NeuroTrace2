"""Seed the demo student (Aarav Sharma).

    python scripts/seed.py            # idempotent
    python scripts/seed.py --reset    # wipe Aarav's demo data and recreate it
"""
import argparse
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.database import SessionLocal, init_db  # noqa: E402
from app.services.seed_service import seed_demo  # noqa: E402


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--reset", action="store_true", help="delete and recreate Aarav's demo data")
    args = parser.parse_args()
    init_db()
    with SessionLocal() as db:
        print(seed_demo(db, reset=args.reset))


if __name__ == "__main__":
    main()
