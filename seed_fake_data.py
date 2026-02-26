import random

import pandas as pd
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from models import Base, Game, MerchSale, Promotion, Ticket

DB_URL = "sqlite:///nashville_sc_business.db"
RNG_SEED = 42


def normalize_text(value):
    return str(value).strip() if value is not None else ""


def main():
    random.seed(RNG_SEED)
    engine = create_engine(DB_URL)
    Base.metadata.create_all(engine)
    Session = sessionmaker(bind=engine)
    session = Session()

    try:
        # Idempotent reset so the DB exactly matches Attendance.csv rows.
        session.query(Ticket).delete()
        session.query(MerchSale).delete()
        session.query(Game).delete()
        session.query(Promotion).delete()
        session.commit()

        promo_names = [
            "Family Night",
            "Military Appreciation",
            "Student Discount",
            "Fan Giveaway",
        ]
        promotions = [Promotion(name=name, description=f"{name} special event") for name in promo_names]
        session.add_all(promotions)
        session.commit()

        promo_ids = [p.id for p in promotions]

        data = pd.read_csv("Attendance.csv")
        data["game_date"] = pd.to_datetime(data["game_date"]).dt.date
        data["attendance"] = pd.to_numeric(data["attendance"])
        data["opponent"] = data["opponent"].astype(str).str.strip()
        data["competition"] = data["competition"].astype(str).str.strip()
        data["venue"] = data["venue"].astype(str).str.strip()

        games = []
        for _, row in data.iterrows():
            game = Game(
                game_date=row["game_date"],
                opponent=normalize_text(row["opponent"]),
                attendance=int(row["attendance"]),
                competition=normalize_text(row["competition"]),
                venue=normalize_text(row["venue"]),
                promotion_id=random.choice(promo_ids),
            )
            games.append(game)

        session.add_all(games)
        session.commit()

        merch_items = ["Jersey", "Scarf", "Hat", "Poster"]
        merch_price = {"Jersey": 90, "Scarf": 25, "Hat": 30, "Poster": 15}

        for game in games:
            total_attendance = int(game.attendance)
            general = int(total_attendance * 0.65)
            season = int(total_attendance * 0.20)
            group = int(total_attendance * 0.10)
            vip = total_attendance - general - season - group

            tickets = [
                Ticket(game_id=game.id, type="General Admission", quantity=general, revenue=general * 35),
                Ticket(game_id=game.id, type="VIP", quantity=vip, revenue=vip * 100),
                Ticket(game_id=game.id, type="Season Ticket", quantity=season, revenue=season * 50),
                Ticket(game_id=game.id, type="Group", quantity=group, revenue=group * 25),
            ]
            session.add_all(tickets)

            merch_buyers_cap = int(total_attendance * 0.20)
            for item in merch_items:
                quantity = random.randint(0, merch_buyers_cap)
                total_revenue = quantity * merch_price[item]
                session.add(
                    MerchSale(
                        game_id=game.id,
                        item=item,
                        quantity=quantity,
                        total_revenue=total_revenue,
                    )
                )

        session.commit()
        print("Database reset and seeded from Attendance.csv")
        print(f"Games inserted: {len(games)}")

    finally:
        session.close()


if __name__ == "__main__":
    main()
