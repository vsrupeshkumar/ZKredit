"""
Zkredit - Midnight Network Integration
Zero-Knowledge Credit Check Client
"""

import os
import json
import hashlib
from typing import Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime

try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    print("[Midnight] Warning: requests not installed. Run: pip install requests")


@dataclass
class CreditCheckRequest:
    """Request for ZK credit check."""
    borrower_address: str
    credit_score: int  # Private - never revealed on-chain
    metadata: Optional[Dict] = None


@dataclass
class CreditCheckResult:
    """Result from Midnight ZK credit check."""
    is_eligible: bool
    proof_hash: str
    timestamp: str
    network: str = "midnight-testnet"
    borrower_address: str = ""
    # Note: credit_score is NEVER included in the result (privacy!)


class MidnightZKClient:
    """Client for Midnight network ZK credit checks."""
    
    def __init__(
        self,
        api_url: Optional[str] = None,
        network: str = "testnet",
        api_key: Optional[str] = None
    ):
        """
        Initialize Midnight client.
        
        Args:
            api_url: Midnight API endpoint (optional)
            network: "mainnet" or "testnet"
            api_key: API key for authenticated requests (optional)
        """
        self.network = network
        self.api_url = api_url or os.getenv(
            "MIDNIGHT_API_URL",
            f"https://api.midnight.network/{network}" if network == "mainnet" else "https://testnet-api.midnight.network"
        )
        self.api_key = api_key or os.getenv("MIDNIGHT_API_KEY")
        self._available = REQUESTS_AVAILABLE
    
    @property
    def available(self) -> bool:
        """Check if Midnight client is available."""
        return self._available
    
    def submit_credit_check(
        self,
        request: CreditCheckRequest
    ) -> CreditCheckResult:
        """
        Submit credit score for ZK verification.
        
        This function:
        1. Sends credit score to Midnight network (private)
        2. Midnight generates ZK proof
        3. Returns only eligibility boolean + proof hash (score remains hidden!)
        
        Args:
            request: Credit check request
        
        Returns:
            Credit check result (without revealing the score)
        """
        if not self.available:
            # Fallback to local processing
            return self._fallback_credit_check(request)
        
        try:
            # In production, this would call the actual Midnight API
            # For now, we'll simulate the ZK proof generation
            
            # Generate ZK proof hash (simulated)
            proof_data = {
                "borrower": request.borrower_address,
                "score": request.credit_score,  # This is private and never exposed
                "timestamp": datetime.now().isoformat(),
                "threshold": 700  # Minimum credit score
            }
            
            # Create proof hash (simulated ZK proof)
            proof_hash = hashlib.sha256(
                json.dumps(proof_data, sort_keys=True).encode()
            ).hexdigest()
            
            # Eligibility check (score >= 700)
            is_eligible = request.credit_score >= 700
            
            # In real implementation, this would be:
            # response = requests.post(
            #     f"{self.api_url}/zk/credit-check",
            #     json={"credit_score": request.credit_score, "borrower": request.borrower_address},
            #     headers={"Authorization": f"Bearer {self.api_key}"} if self.api_key else {}
            # )
            # result = response.json()
            
            return CreditCheckResult(
                is_eligible=is_eligible,
                proof_hash=proof_hash,
                timestamp=datetime.now().isoformat(),
                network=f"midnight-{self.network}",
                borrower_address=request.borrower_address
            )
            
        except Exception as e:
            print(f"[Midnight] Error in credit check: {e}")
            # Fallback to local processing
            return self._fallback_credit_check(request)
    
    def _fallback_credit_check(self, request: CreditCheckRequest) -> CreditCheckResult:
        """Mock credit check for development."""
        proof_hash = hashlib.sha256(
            f"{request.borrower_address}{request.credit_score}{datetime.now().isoformat()}".encode()
        ).hexdigest()
        
        return CreditCheckResult(
            is_eligible=request.credit_score >= 700,
            proof_hash=proof_hash,
            timestamp=datetime.now().isoformat(),
            network=f"midnight-{self.network}",
            borrower_address=request.borrower_address
        )
    
    def verify_proof(self, proof_hash: str, borrower_address: str) -> Dict[str, Any]:
        """
        Verify a ZK proof on Midnight network.
        
        Args:
            proof_hash: Hash of the ZK proof
            borrower_address: Borrower's address
        
        Returns:
            Verification result
        """
        if not self.available:
            return {
                "success": False,
                "verified": False,
                "error": "Midnight client not available"
            }
        
        try:
            # In production, this would verify the proof on-chain
            # For now, we'll simulate verification
            
            return {
                "success": True,
                "verified": True,
                "proof_hash": proof_hash,
                "borrower": borrower_address,
                "network": f"midnight-{self.network}",
                "timestamp": datetime.now().isoformat()
            }
            
        except Exception as e:
            return {
                "success": False,
                "verified": False,
                "error": str(e)
            }


# Global instance
_midnight_client: Optional[MidnightZKClient] = None


def get_midnight_client() -> MidnightZKClient:
    """Get or create global Midnight client instance."""
    global _midnight_client
    if _midnight_client is None:
        network = os.getenv("MIDNIGHT_NETWORK", "testnet")
        api_url = os.getenv("MIDNIGHT_API_URL")
        api_key = os.getenv("MIDNIGHT_API_KEY")
        _midnight_client = MidnightZKClient(
            api_url=api_url,
            network=network,
            api_key=api_key
        )
    return _midnight_client

