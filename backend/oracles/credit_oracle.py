"""
Zkredit - Credit Score Oracle Integration
Fetches real credit scores from external oracles
"""

import os
import json
from typing import Dict, Optional, List
from dataclasses import dataclass
from datetime import datetime

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("[Oracle] Warning: requests not installed. Run: pip install requests")


@dataclass
class CreditScoreData:
    """Credit score data from oracle."""
    score: int
    source: str
    timestamp: str
    confidence: float  # 0.0 to 1.0
    metadata: Optional[Dict] = None


class CreditOracle:
    """Oracle client for fetching credit scores."""
    
    def __init__(
        self,
        oracle_url: Optional[str] = None,
        api_key: Optional[str] = None
    ):
        """
        Initialize credit oracle.
        
        Args:
            oracle_url: Oracle API endpoint
            api_key: API key for authentication
        """
        self.oracle_url = oracle_url or os.getenv("CREDIT_ORACLE_URL")
        self.api_key = api_key or os.getenv("CREDIT_ORACLE_API_KEY")
        self._available = REQUESTS_AVAILABLE and bool(self.oracle_url)
    
    @property
    def available(self) -> bool:
        """Check if oracle is available."""
        return self._available
    
    def get_credit_score(
        self,
        borrower_address: str,
        borrower_id: Optional[str] = None
    ) -> Optional[CreditScoreData]:
        """
        Fetch credit score from oracle.
        
        Args:
            borrower_address: Cardano address
            borrower_id: Optional borrower identifier (KYC/AML)
        
        Returns:
            Credit score data or None if unavailable
        """
        if not self.available:
            return None
        
        try:
            # In production, this would call the actual oracle API
            # Example oracle providers: Chainlink, Band Protocol, etc.
            
            # response = requests.get(
            #     f"{self.oracle_url}/credit-score",
            #     params={"address": borrower_address, "id": borrower_id},
            #     headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {},
            #     timeout=10
            # )
            # data = response.json()
            
            # For now, return mock data
            return self._mock_credit_score(borrower_address)
            
        except Exception as e:
            print(f"[Oracle] Error fetching credit score: {e}")
            return None
    
    def _mock_credit_score(self, borrower_address: str) -> CreditScoreData:
        """Mock credit score for development."""
        # Simulate credit score based on address hash
        import hashlib
        address_hash = int(hashlib.sha256(borrower_address.encode()).hexdigest()[:8], 16)
        score = 600 + (address_hash % 200)  # Score between 600-800
        
        return CreditScoreData(
            score=score,
            source="mock-oracle",
            timestamp=datetime.now().isoformat(),
            confidence=0.85,
            metadata={
                "address": borrower_address,
                "provider": "mock"
            }
        )
    
    def get_multiple_scores(
        self,
        borrower_addresses: List[str]
    ) -> Dict[str, CreditScoreData]:
        """
        Fetch credit scores for multiple borrowers.
        
        Args:
            borrower_addresses: List of borrower addresses
        
        Returns:
            Dictionary mapping addresses to credit scores
        """
        results = {}
        for address in borrower_addresses:
            score = self.get_credit_score(address)
            if score:
                results[address] = score
        return results


# Global instance
_credit_oracle: Optional[CreditOracle] = None


def get_credit_oracle() -> CreditOracle:
    """Get or create global credit oracle instance."""
    global _credit_oracle
    if _credit_oracle is None:
        oracle_url = os.getenv("CREDIT_ORACLE_URL")
        api_key = os.getenv("CREDIT_ORACLE_API_KEY")
        _credit_oracle = CreditOracle(oracle_url=oracle_url, api_key=api_key)
    return _credit_oracle

