from datetime import datetime
from typing import Dict, Optional
import numpy as np
from sqlalchemy.orm import Session
from . import models, schemas

class TokenMarketManager:
    def __init__(self, db: Session):
        self.db = db
        self.volatility_constant = 0.05  # k value for price adjustments
        self.daily_decay = 0.001  # 0.1% daily decay for inactivity
        self.max_daily_change = 0.10  # 10% max daily change
        self.transaction_fee = 0.005  # 0.5% transaction fee

    def get_token_market(self, institution_code: str) -> Optional[models.TokenMarket]:
        return self.db.query(models.TokenMarket).filter(
            models.TokenMarket.institution_code == institution_code
        ).first()

    def initialize_market(self, institution_code: str, initial_supply: float = 1000000.0,
                         initial_value: float = 1.0, initial_liquidity: float = 100000.0):
        """Initialize a new token market for an institution"""
        market = models.TokenMarket(
            institution_code=institution_code,
            current_value=initial_value,
            total_supply=initial_supply,
            liquidity_pool=initial_liquidity
        )
        self.db.add(market)
        self.db.commit()
        self.db.refresh(market)
        return market

    def calculate_price_impact(self, amount: float, total_supply: float) -> float:
        """Calculate price impact based on transaction size"""
        return (amount / total_supply) * self.volatility_constant

    def apply_daily_decay(self, market: models.TokenMarket):
        """Apply daily decay to inactive markets"""
        if market.last_updated:
            days_since_update = (datetime.utcnow() - market.last_updated).days
            if days_since_update > 0:
                decay_factor = (1 - self.daily_decay) ** days_since_update
                market.current_value *= decay_factor

    def adjust_token_value(self, market: models.TokenMarket, transaction_type: str,
                          amount: float) -> float:
        """Adjust token value based on market activity"""
        self.apply_daily_decay(market)
        
        # Calculate price impact
        price_impact = self.calculate_price_impact(amount, market.total_supply)
        
        # Apply impact based on transaction type
        if transaction_type == "buy":
            new_value = market.current_value * (1 + price_impact)
        elif transaction_type == "sell":
            new_value = market.current_value * (1 - price_impact)
        else:
            new_value = market.current_value
            
        # Apply circuit breaker (max daily change)
        max_value = market.current_value * (1 + self.max_daily_change)
        min_value = market.current_value * (1 - self.max_daily_change)
        new_value = min(max_value, max(min_value, new_value))
        
        market.current_value = new_value
        market.last_updated = datetime.utcnow()
        self.db.commit()
        
        return new_value

    def process_transaction(self, user_id: int, transaction_type: str,
                          amount: float, institution_code: str) -> Dict:
        """Process a token transaction"""
        market = self.get_token_market(institution_code)
        if not market:
            market = self.initialize_market(institution_code)

        # Calculate transaction fee
        fee = amount * self.transaction_fee
        total_amount = amount + fee

        # Get user's wallet
        wallet = self.db.query(models.Wallet).filter(
            models.Wallet.user_id == user_id
        ).first()

        if not wallet:
            return {"success": False, "message": "Wallet not found"}

        # Validate transaction
        if transaction_type == "sell" and wallet.balance < amount:
            return {"success": False, "message": "Insufficient balance"}

        # Process transaction
        try:
            # Update market value
            new_value = self.adjust_token_value(market, transaction_type, amount)

            # Update wallet balance
            if transaction_type == "buy":
                wallet.balance += amount
                market.liquidity_pool += fee
            else:  # sell
                wallet.balance -= amount
                market.liquidity_pool += fee

            # Record transaction
            transaction = models.Transaction(
                user_id=user_id,
                wallet_id=wallet.id,
                transaction_type=transaction_type,
                amount=amount,
                fee=fee,
                status="completed",
                metadata={
                    "institution_code": institution_code,
                    "token_value": new_value
                }
            )
            self.db.add(transaction)
            self.db.commit()

            return {
                "success": True,
                "message": "Transaction completed",
                "new_balance": wallet.balance,
                "token_value": new_value,
                "fee": fee
            }

        except Exception as e:
            self.db.rollback()
            return {"success": False, "message": str(e)}

    def get_market_stats(self, institution_code: str) -> Dict:
        """Get market statistics for an institution"""
        market = self.get_token_market(institution_code)
        if not market:
            return {"success": False, "message": "Market not found"}

        # Get recent transactions
        recent_transactions = self.db.query(models.Transaction).filter(
            models.Transaction.metadata['institution_code'].astext == institution_code
        ).order_by(models.Transaction.created_at.desc()).limit(100).all()

        # Calculate market statistics
        total_volume = sum(t.amount for t in recent_transactions)
        buy_volume = sum(t.amount for t in recent_transactions if t.transaction_type == "buy")
        sell_volume = sum(t.amount for t in recent_transactions if t.transaction_type == "sell")

        return {
            "success": True,
            "current_value": market.current_value,
            "total_supply": market.total_supply,
            "liquidity_pool": market.liquidity_pool,
            "24h_volume": total_volume,
            "buy_volume": buy_volume,
            "sell_volume": sell_volume
        }
