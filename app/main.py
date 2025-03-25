from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta
from . import models, schemas, auth, blockchain, games
from .database import engine, get_db
import os
import uvicorn

# Create database tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="Acad Celestia API",
    description="""
    Acad Celestia Backend API - University Token Management System
    """,
    version="1.0.0",
    contact={
        "name": "Acad Celestia Team",
        "url": "https://acadcelestia.com",
        "email": "support@acadcelestia.com",
    },
    license_info={
        "name": "Private",
    },
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
@app.get("/api/institutions", response_model=List[schemas.InstitutionBase], tags=["Authentication"])
async def get_institutions():
    """
    Get list of Nigerian institutions.
    
    Returns a list of all registered institutions that can be used for verification.
    """
    nelf_client = auth.NELFClient()
    result = nelf_client.get_institutions()
    if not result or not result.get("status"):
        raise HTTPException(status_code=400, detail="Failed to fetch institutions")
    return result["data"]

@app.post("/api/auth/verify", response_model=schemas.Token, tags=["Authentication"])
async def verify_user(verification: schemas.JambVerification, db: Session = Depends(get_db)):
    """
    Verify user using JAMB details and create account.
    
    The verification process:
    1. Verifies institution details
    2. Uses the verification token to verify JAMB details
    3. Creates a new user account if verification succeeds
    
    Parameters:
    - **institution_id**: ID of the selected institution
    - **matric_number**: Student's matriculation number
    - **jamb_number**: JAMB registration number
    - **date_of_birth**: Date of birth in MM/DD/YYYY format
    
    Returns a JWT token on successful verification.
    """
    user = auth.verify_user(
        db,
        verification.institution_id,
        verification.matric_number,
        verification.jamb_number,
        verification.date_of_birth
    )
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification failed"
        )
    
    access_token = auth.create_access_token(data={"sub": user.id})
    return {"access_token": access_token, "token_type": "bearer"}

# User endpoints
@app.get("/api/me", response_model=schemas.User, tags=["User"])
def get_current_user(current_user: models.User = Depends(auth.verify_token)):
    """Get current user details"""
    return current_user

@app.get("/api/me/wallet", response_model=schemas.Wallet, tags=["Wallet"])
def get_wallet(current_user: models.User = Depends(auth.verify_token), db: Session = Depends(get_db)):
    """Get user's wallet"""
    wallet = db.query(models.Wallet).filter(
        models.Wallet.user_id == current_user.id
    ).first()
    if not wallet:
        raise HTTPException(status_code=404, detail="Wallet not found")
    return wallet

@app.get("/api/me/transactions", response_model=List[schemas.Transaction], tags=["Wallet"])
def get_transactions(
    current_user: models.User = Depends(auth.verify_token),
    db: Session = Depends(get_db),
    limit: int = 10
):
    """Get user's transaction history"""
    transactions = db.query(models.Transaction).filter(
        models.Transaction.user_id == current_user.id
    ).order_by(models.Transaction.created_at.desc()).limit(limit).all()
    return transactions

# Token market endpoints
@app.post("/api/token/buy", tags=["Token Market"])
async def buy_tokens(
    amount: float,
    current_user: models.User = Depends(auth.verify_token),
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

@app.post("/api/token/sell", tags=["Token Market"])
async def sell_tokens(
    amount: float,
    current_user: models.User = Depends(auth.verify_token),
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

@app.get("/api/token/market/{institution_code}", tags=["Token Market"])
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
@app.post("/api/games/play", tags=["Games"])
async def play_game(
    game_type: str,
    stake_amount: float,
    current_user: models.User = Depends(auth.verify_token),
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

@app.get("/api/games/history", response_model=List[schemas.Game], tags=["Games"])
async def get_game_history(
    current_user: models.User = Depends(auth.verify_token),
    db: Session = Depends(get_db),
    limit: int = 10
):
    """Get user's game history"""
    game_manager = games.GameManager(db)
    return game_manager.get_user_games(current_user.id, limit)

@app.get("/", tags=["Root"])
async def root():
    return {
        "message": "Welcome to Acad Celestia API",
        "docs_url": "/docs",
        "redoc_url": "/redoc"
    }

# Server startup
if __name__ == "__main__":
    port = int(os.getenv("PORT", 4000))
    uvicorn.run("app.main:app", host="0.0.0.0", port=port, reload=True)
