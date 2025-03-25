from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta

from . import models, schemas, auth, blockchain, games
from .database import engine, get_db

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Celestia API",
    description="Modern REST API for Celestia - University Token System",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication endpoints
@app.post("/api/institutions", response_model=List[schemas.InstitutionBase])
async def get_institutions():
    """Get list of Nigerian institutions"""
    nelf_client = auth.NELFClient()
    result = nelf_client.get_institutions()
    if not result or not result.get("status"):
        raise HTTPException(status_code=400, detail="Failed to fetch institutions")
    return result["data"]

@app.post("/api/verify/institute")
async def verify_institute(verification: schemas.InstituteVerification):
    """Verify institute details"""
    nelf_client = auth.NELFClient()
    result = nelf_client.verify_institute_details(
        verification.matric_number,
        verification.provider_id
    )
    if not result or not result.get("status"):
        raise HTTPException(status_code=400, detail="Institute verification failed")
    return result

@app.post("/api/verify/jamb")
async def verify_jamb(verification: schemas.JambVerification,
                     institute_verification: schemas.InstituteVerification,
                     db: Session = Depends(get_db)):
    """Complete verification process and create user"""
    user = auth.verify_user(db, institute_verification, verification)
    if not user:
        raise HTTPException(status_code=400, detail="Verification failed")
    
    access_token_expires = timedelta(minutes=auth.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = auth.create_access_token(
        data={"sub": user.reg_number}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# User endpoints
@app.get("/api/me", response_model=schemas.User)
async def get_current_user(current_user: models.User = Depends(auth.get_current_user)):
    """Get current user details"""
    return current_user

@app.get("/api/me/wallet", response_model=schemas.Wallet)
async def get_wallet(current_user: models.User = Depends(auth.get_current_user),
                    db: Session = Depends(get_db)):
    """Get user's wallet"""
    wallet = db.query(models.Wallet).filter(
        models.Wallet.user_id == current_user.id
    ).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallet

@app.get("/api/me/transactions", response_model=List[schemas.Transaction])
async def get_transactions(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
    limit: int = 10
):
    """Get user's transaction history"""
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).order_by(models.Transaction.created_at.desc()).limit(limit).all()
    return transactions

# Token market endpoints
@app.post("/api/token/buy")
async def buy_tokens(
    amount: float,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Buy tokens"""
    token_manager = blockchain.TokenMarketManager(db)
    result = token_manager.process_transaction(
        current_user.id,
        "buy",
        amount,
        current_user.institution_code
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@app.post("/api/token/sell")
async def sell_tokens(
    amount: float,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Sell tokens"""
    token_manager = blockchain.TokenMarketManager(db)
    result = token_manager.process_transaction(
        current_user.id,
        "sell",
        amount,
        current_user.institution_code
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@app.get("/api/token/market/{institution_code}")
async def get_market_stats(
    institution_code: str,
    db: Session = Depends(get_db)
):
    """Get token market statistics"""
    token_manager = blockchain.TokenMarketManager(db)
    result = token_manager.get_market_stats(institution_code)
    if not result["success"]:
        raise HTTPException(status_code=404, detail=result["message"])
    return result

# Game endpoints
@app.post("/api/games/play")
async def play_game(
    game_type: str,
    stake_amount: float,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db)
):
    """Play a game"""
    game_manager = games.GameManager(db)
    result = game_manager.create_game(
        current_user.id,
        game_type,
        stake_amount,
        current_user.institution_code
    )
    if not result["success"]:
        raise HTTPException(status_code=400, detail=result["message"])
    return result

@app.get("/api/games/history", response_model=List[schemas.Game])
async def get_game_history(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(get_db),
    limit: int = 10
):
    """Get user's game history"""
    game_manager = games.GameManager(db)
    return game_manager.get_user_games(current_user.id, limit)

@app.get("/")
async def root():
    return {
        "message": "Welcome to Celestia API",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }
