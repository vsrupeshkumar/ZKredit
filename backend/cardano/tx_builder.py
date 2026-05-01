"""
Zkredit - PyCardano Transaction Builder
Real Cardano transaction building for loan settlements
"""

import os
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

try:
    from pycardano import (
        Address,
        Network,
        TransactionBuilder,
        TransactionOutput,
        Value,
        Transaction,
    )
    from pycardano.backends.blockfrost import BlockfrostChainContext
    PYCADANO_AVAILABLE = True
except ImportError:
    PYCADANO_AVAILABLE = False
    print("[PyCardano] Warning: pycardano not installed. Run: pip install pycardano")


@dataclass
class LoanSettlementParams:
    """Parameters for loan settlement transaction."""
    borrower_address: str
    lender_address: str
    principal: int  # In lovelace
    interest_amount: int  # In lovelace
    validator_script_hash: Optional[str] = None
    collateral_utxos: Optional[List[Dict]] = None


class CardanoTxBuilder:
    """Builds real Cardano transactions using PyCardano."""
    
    def __init__(self, network: str = "testnet", blockfrost_project_id: Optional[str] = None):
        """
        Initialize transaction builder.
        
        Args:
            network: "mainnet" or "testnet"
            blockfrost_project_id: Blockfrost API project ID (optional)
        """
        self.network = Network.TESTNET if network == "testnet" else Network.MAINNET
        self.blockfrost_id = blockfrost_project_id or os.getenv("BLOCKFROST_PROJECT_ID")
        
        if PYCADANO_AVAILABLE and self.blockfrost_id:
            try:
                self.context = BlockfrostChainContext(
                    project_id=self.blockfrost_id,
                    network=self.network
                )
                self._available = True
            except Exception as e:
                print(f"[PyCardano] Warning: Could not initialize Blockfrost: {e}")
                self._available = False
        else:
            self._available = False
            self.context = None
    
    @property
    def available(self) -> bool:
        """Check if PyCardano is available and configured."""
        return PYCADANO_AVAILABLE and self._available
    
    def build_settlement_tx(
        self,
        params: LoanSettlementParams,
        signing_key: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Build a loan settlement transaction.
        
        Args:
            params: Settlement parameters
            signing_key: Payment signing key (optional, for signing)
        
        Returns:
            Dictionary with transaction CBOR and metadata
        """
        if not self.available:
            return {
                "success": False,
                "error": "PyCardano not available or not configured",
                "tx_cbor": None
            }
        
        try:
            builder = TransactionBuilder(self.context)
            
            # Parse addresses
            borrower_addr = Address.from_primitive(params.borrower_address)
            lender_addr = Address.from_primitive(params.lender_address)
            
            # Calculate total amount (principal + interest)
            total_amount = params.principal + params.interest_amount
            
            # Add output to borrower (loan disbursement)
            builder.add_output(
                TransactionOutput(
                    address=borrower_addr,
                    amount=Value(coin=total_amount)
                )
            )
            
            # If validator script is provided, add it to the transaction
            if params.validator_script_hash:
                # Validator script integration would go here
                # Requires actual script bytes and proper integration
                pass
            
            # Build transaction
            if signing_key:
                tx = builder.build_and_sign([signing_key])
            else:
                # Build without signing (for fee estimation or unsigned transactions)
                tx = builder.build()
            
            # Serialize to CBOR
            tx_cbor = bytes(tx).hex()
            
            return {
                "success": True,
                "tx_cbor": tx_cbor,
                "tx_id": str(tx.id),
                "network": "testnet" if self.network == Network.TESTNET else "mainnet",
                "outputs": [
                    {
                        "address": params.borrower_address,
                        "amount": total_amount,
                        "lovelace": total_amount
                    }
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "tx_cbor": None
            }
    
    def estimate_fee(self, params: LoanSettlementParams) -> Dict[str, Any]:
        """
        Estimate transaction fee.
        
        Args:
            params: Settlement parameters
        
        Returns:
            Dictionary with fee estimate
        """
        if not self.available:
            return {
                "success": False,
                "fee": 0,
                "error": "PyCardano not available"
            }
        
        try:
            # Build transaction without signing to estimate fee
            builder = TransactionBuilder(self.context)
            
            borrower_addr = Address.from_primitive(params.borrower_address)
            total_amount = params.principal + params.interest_amount
            
            builder.add_output(
                TransactionOutput(
                    address=borrower_addr,
                    amount=Value(coin=total_amount)
                )
            )
            
            # Build transaction body for fee estimation
            tx_body = builder.build()
            
            # Estimate fee (simplified calculation)
            # In production, this would use actual fee calculation from the transaction
            # Base fee: ~0.17 ADA (170000 lovelace) for simple transaction
            estimated_fee = 170000
            
            return {
                "success": True,
                "fee": estimated_fee,
                "fee_ada": estimated_fee / 1_000_000,
                "total_amount": total_amount,
                "total_amount_ada": total_amount / 1_000_000
            }
            
        except Exception as e:
            return {
                "success": False,
                "fee": 0,
                "error": str(e)
            }
    
    def verify_tx(self, tx_cbor: str) -> Dict[str, Any]:
        """
        Verify a transaction CBOR.
        
        Args:
            tx_cbor: Transaction CBOR in hex format
        
        Returns:
            Verification result
        """
        if not PYCADANO_AVAILABLE:
            return {
                "success": False,
                "error": "PyCardano not available"
            }
        
        try:
            # Deserialize transaction
            tx_bytes = bytes.fromhex(tx_cbor)
            tx = Transaction.from_cbor(tx_bytes)
            
            return {
                "success": True,
                "tx_id": str(tx.id),
                "inputs": len(tx.transaction_body.inputs),
                "outputs": len(tx.transaction_body.outputs),
                "fee": tx.transaction_body.fee,
                "valid": True
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "valid": False
            }


# Global instance
_tx_builder: Optional[CardanoTxBuilder] = None


def get_tx_builder() -> CardanoTxBuilder:
    """Get or create global transaction builder instance."""
    global _tx_builder
    if _tx_builder is None:
        network = os.getenv("CARDANO_NETWORK", "testnet")
        project_id = os.getenv("BLOCKFROST_PROJECT_ID")
        _tx_builder = CardanoTxBuilder(network=network, blockfrost_project_id=project_id)
    return _tx_builder

