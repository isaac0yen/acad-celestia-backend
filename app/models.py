from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Float, DateTime, Enum, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base
import enum

class UserType(str, enum.Enum):
    STUDENT = "student"
    ADMIN = "admin"

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    reg_number = Column(String, unique=True, index=True)
    nin = Column(String, unique=True)
    surname = Column(String)
    first_name = Column(String)
    middle_name = Column(String)
    date_of_birth = Column(String)
    gender = Column(String)
    state_of_origin = Column(String)
    lga_of_origin = Column(String)
    admission_year = Column(String)
    institution = Column(String)
    institution_code = Column(String)
    course = Column(String)
    course_code = Column(String)
    admission_type = Column(String)
    profile_picture = Column(String, nullable=True)
    request_id = Column(String, unique=True)
    user_type = Column(Enum(UserType), default=UserType.STUDENT)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    wallet = relationship("Wallet", back_populates="user", uselist=False)
    transactions = relationship("Transaction", back_populates="user")
    games = relationship("Game", back_populates="user")

class Wallet(Base):
    __tablename__ = "wallets"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    balance = Column(Float, default=0.0)
    staked_balance = Column(Float, default=0.0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationships
    user = relationship("User", back_populates="wallet")
    transactions = relationship("Transaction", back_populates="wallet")

class TransactionType(str, enum.Enum):
    BUY = "buy"
    SELL = "sell"
    SEND = "send"
    STAKE = "stake"
    UNSTAKE = "unstake"
    GAME = "game"

class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    wallet_id = Column(Integer, ForeignKey("wallets.id"))
    transaction_type = Column(Enum(TransactionType))
    amount = Column(Float)
    fee = Column(Float, default=0.0)
    status = Column(String)  # pending, completed, failed
    transaction_data = Column(JSON, nullable=True)  # Additional transaction data
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="transactions")
    wallet = relationship("Wallet", back_populates="transactions")

class TokenMarket(Base):
    __tablename__ = "token_markets"

    id = Column(Integer, primary_key=True, index=True)
    institution_code = Column(String, unique=True, index=True)
    current_value = Column(Float)
    total_supply = Column(Float)
    liquidity_pool = Column(Float)
    last_updated = Column(DateTime(timezone=True), onupdate=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Game(Base):
    __tablename__ = "games"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    game_type = Column(String)
    stake_amount = Column(Float)
    result = Column(String)  # won, lost
    game_data = Column(JSON, nullable=True)  # Game specific data
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    user = relationship("User", back_populates="games")
