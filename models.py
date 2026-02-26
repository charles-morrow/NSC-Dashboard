
from sqlalchemy import Column, Integer, String, Date, ForeignKey
from sqlalchemy.orm import declarative_base, relationship

Base = declarative_base()

class Promotion(Base):
    __tablename__ = 'promotions'
    id = Column(Integer, primary_key=True)
    name = Column(String)
    description = Column(String)
    games = relationship("Game", back_populates="promotion")

class Game(Base):
    __tablename__ = 'games'
    id = Column(Integer, primary_key=True)
    game_date = Column(Date)
    opponent = Column(String)
    attendance = Column(Integer)
    competition = Column(String)
    venue = Column(String)
    promotion_id = Column(Integer, ForeignKey('promotions.id'))
    promotion = relationship("Promotion", back_populates="games")
    merch_sales = relationship("MerchSale", back_populates="game")
    tickets = relationship("Ticket", back_populates="game")

class Ticket(Base):
    __tablename__ = 'tickets'
    id = Column(Integer, primary_key=True)
    game_id = Column(Integer, ForeignKey('games.id'))
    type = Column(String)
    quantity = Column(Integer)
    revenue = Column(Integer)
    game = relationship("Game", back_populates="tickets")

class MerchSale(Base):
    __tablename__ = 'merch_sales'
    id = Column(Integer, primary_key=True)
    game_id = Column(Integer, ForeignKey('games.id'))
    item = Column(String)
    quantity = Column(Integer)
    total_revenue = Column(Integer)
    game = relationship("Game", back_populates="merch_sales")
