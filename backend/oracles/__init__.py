"""
Zkredit - Oracle Integration
Credit score oracles
"""

from .credit_oracle import (
    CreditOracle,
    CreditScoreData,
    get_credit_oracle
)

__all__ = [
    "CreditOracle",
    "CreditScoreData",
    "get_credit_oracle"
]

