"""
Zkredit - Integrated Hydra + Masumi Client
==============================================

This module integrates:
1. Hydra Head Protocol (Layer 2 scaling for Cardano)
2. Masumi Cardano Agent (AI-powered blockchain analysis)
3. Enhanced negotiation capabilities

The integration provides:
- Real-time Hydra head management
- AI-powered loan analysis using Masumi tools
- Privacy-preserving negotiation workflows
- Seamless Cardano blockchain integration
"""

import asyncio
import json
import time
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

from .head_manager import HydraClient, HydraNegotiationManager, NegotiationState, Settlement
from agents.masumi.crew import DegenCrew
from agents.masumi.tools.kupo_tool import KupoTool
from agents.masumi.tools.token_registry_tool import TokenRegistryTool


@dataclass
class IntegratedNegotiationResult:
    """Result from an integrated Hydra + Masumi negotiation."""
    head_id: str
    borrower_address: str
    lender_address: str
    final_rate: float
    principal: float
    settlement: Settlement
    masumi_analysis: Dict[str, Any]
    blockchain_data: Dict[str, Any]


class IntegratedHydraMasumiClient:
    """
    Integrated client combining Hydra Head Protocol with Masumi AI analysis.

    This client provides:
    1. Hydra Head management for off-chain negotiations
    2. Masumi-powered AI analysis of loan terms and borrower data
    3. Real-time blockchain data integration via Kupo
    4. Token registry lookups for asset information
    """

    def __init__(
        self,
        hydra_config: Optional[Any] = None,
        kupo_base_url: str = None,
        token_registry_url: str = "https://tokens.cardano.org/metadata/query"
    ):
        """Initialize the integrated client."""
        self.hydra_manager = HydraNegotiationManager()
        self.kupo_tool = KupoTool(base_url=kupo_base_url) if kupo_base_url else None
        self.token_registry_tool = TokenRegistryTool(base_url=token_registry_url)

        # Masumi Crew for AI analysis (with error handling)
        try:
            self.masumi_crew = DegenCrew()
            self.masumi_available = True
            print("[Integrated] Masumi AI analysis enabled")
        except Exception as e:
            print(f"[Integrated] Masumi AI analysis disabled: {e}")
            self.masumi_crew = None
            self.masumi_available = False

        print("[Integrated] Initialized Hydra + Masumi client")
        if self.kupo_tool:
            print("[Integrated] Kupo integration enabled")
        else:
            print("[Integrated] Kupo not configured - set KUPO_BASE_URL for blockchain data")

    async def start(self):
        """Start the integrated client."""
        await self.hydra_manager.start()
        print("[Integrated] Client started successfully")

    async def stop(self):
        """Stop the integrated client."""
        await self.hydra_manager.stop()
        print("[Integrated] Client stopped")

    async def analyze_borrower_with_masumi(
        self,
        borrower_address: str,
        top_assets: int = 5
    ) -> Dict[str, Any]:
        """
        Analyze borrower using Masumi's Kupo tool and AI analysis.

        Args:
            borrower_address: Cardano address to analyze
            top_assets: Number of top assets to include in analysis

        Returns:
            Analysis results including asset holdings and AI insights
        """
        print(f"[Integrated] Analyzing borrower: {borrower_address}")

        # Get blockchain data using Kupo
        blockchain_data = {}
        if self.kupo_tool:
            try:
                blockchain_data = self.kupo_tool._run(borrower_address, top_assets)
                print(f"[Integrated] Retrieved {len(blockchain_data)} assets from Kupo")
            except Exception as e:
                print(f"[Integrated] Kupo analysis failed: {e}")
                blockchain_data = {"error": str(e)}

        # Get token information for assets
        asset_ids = [asset_id for asset_id in blockchain_data.keys() if asset_id != "lovelace"]
        if asset_ids:
            try:
                token_info = self.token_registry_tool._run(asset_ids[:15])  # Max 15 per API
                blockchain_data["token_info"] = token_info
                print(f"[Integrated] Retrieved token info for {len(token_info)} assets")
            except Exception as e:
                print(f"[Integrated] Token registry lookup failed: {e}")

        # Use Masumi crew for comprehensive analysis (if available)
        masumi_analysis = {}
        if self.masumi_available and self.masumi_crew:
            analysis_inputs = {
                'addresses': [borrower_address]
            }

            try:
                masumi_result = self.masumi_crew.crew().kickoff(inputs=analysis_inputs)
                print("[Integrated] Masumi AI analysis completed")
                masumi_analysis = str(masumi_result)
            except Exception as e:
                print(f"[Integrated] Masumi analysis failed: {e}")
                masumi_analysis = {"error": str(e)}
        else:
            masumi_analysis = {"status": "unavailable", "reason": "LLM not configured"}

        return {
            "borrower_address": borrower_address,
            "blockchain_data": blockchain_data,
            "masumi_analysis": masumi_analysis,
            "timestamp": time.time()
        }

    async def negotiate_with_ai_analysis(
        self,
        borrower_address: str,
        lender_address: str,
        principal: float,
        initial_rate: float,
        term_months: int
    ) -> IntegratedNegotiationResult:
        """
        Conduct a complete negotiation with AI analysis integration.

        Args:
            borrower_address: Borrower's Cardano address
            lender_address: Lender's Cardano address
            principal: Loan principal amount
            initial_rate: Initial interest rate (%)
            term_months: Loan term in months

        Returns:
            Complete negotiation result with AI analysis
        """

        print(f"[Integrated] Starting AI-enhanced negotiation")
        print(f"[Integrated] Borrower: {borrower_address}")
        print(f"[Integrated] Lender: {lender_address}")
        print(f"[Integrated] Principal: {principal} ADA")
        print(f"[Integrated] Initial Rate: {initial_rate}%")

        # Step 1: Analyze borrower with Masumi
        borrower_analysis = await self.analyze_borrower_with_masumi(borrower_address)

        # Step 2: Open Hydra Head for negotiation
        negotiation_state = await self.hydra_manager.open_negotiation(
            borrower=borrower_address,
            lender=lender_address,
            principal=principal,
            interest_rate=initial_rate,
            term_months=term_months
        )

        # Step 3: AI-powered negotiation rounds
        print(f"[Integrated] Starting negotiation in Head: {negotiation_state.head_id}")

        # Simulate negotiation rounds with AI analysis
        # In production, this would involve real AI decision making
        current_rate = initial_rate

        # Round 1: Borrower proposes lower rate based on analysis
        if "lovelace" in borrower_analysis.get("blockchain_data", {}):
            lovelace_balance = borrower_analysis["blockchain_data"]["lovelace"]
            # Better collateral = better rate
            if lovelace_balance > principal * 2:  # Good collateral ratio
                proposed_rate = round(initial_rate - 0.8, 1)
            else:
                proposed_rate = round(initial_rate - 0.5, 1)
        else:
            proposed_rate = round(initial_rate - 0.5, 1)

        await self.hydra_manager.submit_counter_offer(
            head_id=negotiation_state.head_id,
            proposed_rate=proposed_rate,
            from_party=borrower_address
        )

        # Round 2: Lender responds
        lender_counter = round((proposed_rate + initial_rate) / 2, 1)
        await self.hydra_manager.submit_counter_offer(
            head_id=negotiation_state.head_id,
            proposed_rate=lender_counter,
            from_party=lender_address
        )

        # Round 3: Borrower accepts or final counter
        final_rate = lender_counter - 0.1
        await self.hydra_manager.submit_counter_offer(
            head_id=negotiation_state.head_id,
            proposed_rate=final_rate,
            from_party=borrower_address
        )

        # Step 4: Settle the negotiation
        settlement = await self.hydra_manager.accept_and_settle(negotiation_state.head_id)

        # Step 5: Return integrated result
        result = IntegratedNegotiationResult(
            head_id=negotiation_state.head_id,
            borrower_address=borrower_address,
            lender_address=lender_address,
            final_rate=final_rate,
            principal=principal,
            settlement=settlement,
            masumi_analysis=borrower_analysis,
            blockchain_data=borrower_analysis.get("blockchain_data", {})
        )

        print(f"[Integrated] Negotiation completed!")
        print(f"[Integrated] Final Rate: {final_rate}%")
        print(f"[Integrated] Settlement TX: {settlement.tx_hash}")

        return result


# Convenience functions
async def run_integrated_demo():
    """Run a demo of the integrated Hydra + Masumi client."""
    print("=" * 70)
    print("ZKREDIT AI - INTEGRATED HYDRA + MASUMI DEMO")
    print("=" * 70)

    # Initialize client
    client = IntegratedHydraMasumiClient()

    try:
        await client.start()

        # Demo borrower address (testnet)
        borrower_address = "addr_test1wz4ydpqxpstg453xlr6v3elpg578ussvk8ezunkj62p9wjq7uw9zq"

        # Run integrated negotiation
        result = await client.negotiate_with_ai_analysis(
            borrower_address=borrower_address,
            lender_address="addr_test_lender_example",
            principal=1000.0,
            initial_rate=8.5,
            term_months=12
        )

        print("\n" + "=" * 70)
        print("INTEGRATED NEGOTIATION COMPLETE!")
        print("=" * 70)
        print(f"Head ID:        {result.head_id}")
        print(f"Borrower:       {result.borrower_address}")
        print(f"Final Rate:     {result.final_rate}%")
        print(f"Principal:      {result.principal} ADA")
        print(f"Settlement TX:  {result.settlement.tx_hash}")
        print(f"Assets Found:   {len(result.blockchain_data)}")
        print("=" * 70)

    finally:
        await client.stop()


if __name__ == "__main__":
    print("[Integrated] Starting integrated demo...")
    asyncio.run(run_integrated_demo())
