from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from .models import UserType, TransactionType

class InstitutionBase(BaseModel):
    id: int
    name: str
    mdacode: Optional[str] = None
    level: Optional[str] = None
    type: str
    short_name: Optional[str] = None
    provider_id: str
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None
    status: str

class InstituteVerification(BaseModel):
    matric_number: str
    provider_id: str

class JambVerification(BaseModel):
    institution_id: str
    matric_number: str
    jamb_number: str
    date_of_birth: str

class UserBase(BaseModel):
    reg_number: str
    nin: str
    surname: str
    first_name: str
    middle_name: Optional[str] = None
    date_of_birth: str
    gender: str
    state_of_origin: str
    lga_of_origin: str
    admission_year: str
    institution: str
    institution_code: str
    course: str
    course_code: str
    admission_type: str
    profile_picture: Optional[str] = None
    request_id: str
    user_type: UserType = UserType.STUDENT

class UserCreate(UserBase):
    pass

class User(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserLogin(BaseModel):
    reg_number: str

class WalletBase(BaseModel):
    balance: float = 0.0
    staked_balance: float = 0.0

class Wallet(WalletBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class TransactionBase(BaseModel):
    transaction_type: TransactionType
    amount: float
    fee: float = 0.0
    metadata: Optional[Dict[str, Any]] = None

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: int
    user_id: int
    wallet_id: int
    status: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenMarketBase(BaseModel):
    institution_code: str
    current_value: float
    total_supply: float
    liquidity_pool: float

class TokenMarket(TokenMarketBase):
    id: int
    last_updated: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True

class GameBase(BaseModel):
    game_type: str
    stake_amount: float
    metadata: Optional[Dict[str, Any]] = None

class GameCreate(GameBase):
    pass

class Game(GameBase):
    id: int
    user_id: int
    result: str
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    """Token response schema"""
    access_token: str
    token_type: str = "bearer"
