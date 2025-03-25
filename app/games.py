from typing import Dict
import random
from sqlalchemy.orm import Session
from . import models
from .blockchain import TokenMarketManager

class GameManager:
    def __init__(self, db: Session):
        self.db = db
        self.token_manager = TokenMarketManager(db)

    def create_game(self, user_id: int, game_type: str, stake_amount: float,
                    institution_code: str) -> Dict:
        """Create and process a new game"""
        # Get user's wallet
        wallet = self.db.query(models.Wallet).filter(
            models.Wallet.user_id == user_id
        ).first()

        if not wallet or wallet.balance < stake_amount:
            return {"success": False, "message": "Insufficient balance"}

        try:
            # Process game logic
            result = self._process_game(game_type)
            
            # Create game record
            game = models.Game(
                user_id=user_id,
                game_type=game_type,
                stake_amount=stake_amount,
                result=result["outcome"],
                metadata={
                    "details": result["details"],
                    "institution_code": institution_code
                }
            )
            self.db.add(game)

            # Update wallet based on game result
            if result["outcome"] == "won":
                # Winner gets double the stake
                wallet.balance += stake_amount
                transaction_type = "game"
            else:
                # Loser loses their stake
                wallet.balance -= stake_amount
                transaction_type = "game"

            # Record transaction
            transaction = models.Transaction(
                user_id=user_id,
                wallet_id=wallet.id,
                transaction_type=transaction_type,
                amount=stake_amount,
                status="completed",
                metadata={
                    "game_id": game.id,
                    "game_type": game_type,
                    "result": result["outcome"],
                    "institution_code": institution_code
                }
            )
            self.db.add(transaction)

            # Update token market
            self.token_manager.adjust_token_value(
                self.token_manager.get_token_market(institution_code),
                transaction_type,
                stake_amount
            )

            self.db.commit()
            return {
                "success": True,
                "message": f"Game completed - You {result['outcome']}!",
                "details": result["details"],
                "new_balance": wallet.balance
            }

        except Exception as e:
            self.db.rollback()
            return {"success": False, "message": str(e)}

    def _process_game(self, game_type: str) -> Dict:
        """Process different game types"""
        if game_type == "coin_flip":
            return self._coin_flip()
        elif game_type == "dice_roll":
            return self._dice_roll()
        elif game_type == "number_guess":
            return self._number_guess()
        else:
            raise ValueError("Invalid game type")

    def _coin_flip(self) -> Dict:
        """Simple coin flip game"""
        result = random.choice(["heads", "tails"])
        outcome = "won" if result == "heads" else "lost"
        return {
            "outcome": outcome,
            "details": {
                "game": "coin_flip",
                "result": result
            }
        }

    def _dice_roll(self) -> Dict:
        """Dice roll game - win on 6"""
        roll = random.randint(1, 6)
        outcome = "won" if roll == 6 else "lost"
        return {
            "outcome": outcome,
            "details": {
                "game": "dice_roll",
                "roll": roll
            }
        }

    def _number_guess(self) -> Dict:
        """Number guessing game"""
        target = random.randint(1, 10)
        guess = random.randint(1, 10)
        outcome = "won" if guess == target else "lost"
        return {
            "outcome": outcome,
            "details": {
                "game": "number_guess",
                "target": target,
                "guess": guess
            }
        }

    def get_user_games(self, user_id: int, limit: int = 10) -> list:
        """Get user's game history"""
        return self.db.query(models.Game).filter(
            models.Game.user_id == user_id
        ).order_by(models.Game.created_at.desc()).limit(limit).all()
