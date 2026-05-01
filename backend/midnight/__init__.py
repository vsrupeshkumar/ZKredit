"""
Zkredit - Midnight Network Integration
Zero-Knowledge credit checks
"""

from .zk_client import (
    MidnightZKClient,
    CreditCheckRequest,
    CreditCheckResult,
    get_midnight_client
)

__all__ = [
    "MidnightZKClient",
    "CreditCheckRequest",
    "CreditCheckResult",
    "get_midnight_client"
]

