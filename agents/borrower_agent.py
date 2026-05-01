"""
Zkredit - Borrower Agent (Lenny)
Privacy-First DeFi Lending on Cardano

Complete Architecture:
    Borrower --> Midnight (submit credit score privately)
                    |
            is_eligible: true (public, ZK proof)
                    |
                    v
    Lender <-- Midnight
       |
    Loan Offer
       |
       v
    AI Agent (Lenny) --> Analyze with Llama 3
                              |
                        Open Hydra Head
                              |
                      Negotiate (off-chain, zero gas)
                              |
                        Accept Final Terms
                              |
                    Close Head --> Settlement Tx
                              |
                        Aiken Validator (verify dual sig)
                              |
                        Loan Disbursed!
"""

import json
import time
import os
from typing import Any, Dict, Optional
from dataclasses import dataclass
from crewai import Agent, Task, Crew, LLM
from crewai.tools import BaseTool

# Add parent directory to path
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ============================================================================
# PRIVACY-FIRST CONFIGURATION: Llama 3 via Ollama (Local)
# ============================================================================
# LLM is initialized lazily when agent is actually used, not at module import
# This prevents the model from starting before wallet connection
def get_llm():
    """Get LLM instance - initialized only when needed."""
    try:
        # Try to connect to Ollama first
        import requests
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        response = requests.get(f"{ollama_url}/api/tags", timeout=2)
        if response.status_code == 200:
            return LLM(
                model="ollama/llama3",
                base_url=ollama_url,
                temperature=0.7,
            )
        else:
            raise Exception("Ollama not responding")
    except Exception as e:
        print(f"[LLM] Ollama not available ({e}), using mock LLM")
        # Return a mock LLM that doesn't require external services
        return LLM(
            model="gpt-3.5-turbo",
            api_key="mock-key-for-development",
            base_url=ollama_url,  # This will fail gracefully
            temperature=0.7,
        )


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class CreditCheckResult:
    """Result from Midnight ZK credit check."""
    borrower_address: str
    is_eligible: bool
    proof_hash: str
    timestamp: float
    # Note: actual credit score is NEVER revealed (ZK magic!)


@dataclass
class LoanOffer:
    """Loan offer from a lender."""
    lender_address: str
    principal: float
    interest_rate: float
    term_months: int
    collateral_ratio: float = 1.5
    offer_id: str = ""
    requires_credit_check: bool = True
    
    def __post_init__(self):
        if not self.offer_id:
            self.offer_id = f"offer_{int(time.time())}"


@dataclass 
class NegotiationState:
    """Tracks negotiation state in Hydra Head."""
    head_id: str
    original_offer: LoanOffer
    current_rate: float
    rounds: int = 0
    status: str = "open"
    final_rate: Optional[float] = None


@dataclass
class SettlementTx:
    """Settlement transaction for Aiken Validator."""
    tx_hash: str
    head_id: str
    borrower: str
    lender: str
    principal: float
    final_rate_bps: int  # basis points
    term_months: int
    borrower_signature: str
    lender_signature: str
    status: str = "pending_verification"


# ============================================================================
# Midnight ZK Credit Check (Mock for Demo)
# ============================================================================

class MidnightClient:
    """
    Client for Midnight Network ZK credit checks.
    In production, this connects to actual Midnight network.
    """
    
    def __init__(self, endpoint: str = "https://midnight.network"):
        self.endpoint = endpoint
        self.demo_mode = True
    
    def submit_credit_score(self, borrower_address: str, credit_score: int) -> CreditCheckResult:
        """
        Submit credit score privately to Midnight.
        The actual score is NEVER revealed - only eligibility.
        
        Args:
            borrower_address: Borrower's Cardano address
            credit_score: Private credit score (700+ is eligible)
        """
        print(f"\n[Midnight] Borrower submitting credit score privately...")
        print(f"[Midnight] Address: {borrower_address}")
        print(f"[Midnight] Credit Score: *** (PRIVATE - never revealed!)")
        
        # ZK Circuit: check_eligibility(private credit_score) -> public is_eligible
        MIN_CREDIT_SCORE = 700
        is_eligible = credit_score >= MIN_CREDIT_SCORE
        
        # Generate ZK proof hash (mock)
        proof_hash = f"zk_proof_{borrower_address[:10]}_{int(time.time())}"
        
        result = CreditCheckResult(
            borrower_address=borrower_address,
            is_eligible=is_eligible,
            proof_hash=proof_hash,
            timestamp=time.time()
        )
        
        print(f"[Midnight] ZK Proof generated: {proof_hash}")
        print(f"[Midnight] Public result: is_eligible = {is_eligible}")
        print(f"[Midnight] (Lender only sees eligibility, NOT the actual score!)")
        
        return result
    
    def verify_eligibility(self, proof_hash: str) -> bool:
        """Verify a ZK eligibility proof."""
        print(f"[Midnight] Verifying proof: {proof_hash}")
        # In production, verify the ZK proof on Midnight network
        return proof_hash.startswith("zk_proof_")


# ============================================================================
# Integrated Hydra + Masumi Manager
# ============================================================================

# Import integrated client
try:
    from ..hydra.integrated_client import IntegratedHydraMasumiClient
    INTEGRATED_CLIENT_AVAILABLE = True
except ImportError:
    INTEGRATED_CLIENT_AVAILABLE = False
    print("[BorrowerAgent] Warning: Integrated client not available")

# Import Hydra configuration
try:
    from ..hydra.hydra_config import get_hydra_node_url
    HYDRA_CONFIG_AVAILABLE = True
except ImportError:
    HYDRA_CONFIG_AVAILABLE = False
    print("[BorrowerAgent] Warning: Hydra config not available, using defaults")


class HydraHeadManager:
    """Manages Hydra Head lifecycle for off-chain negotiations."""
    
    def __init__(self, node_url: str = "ws://localhost:4001"):
        self.node_url = node_url
        self.active_heads: Dict[str, NegotiationState] = {}
        self.demo_mode = True
    
    def open_head(self, offer: LoanOffer, borrower_address: str) -> NegotiationState:
        """Open a new Hydra Head for negotiation."""
        head_id = f"head_{offer.offer_id}_{int(time.time())}"
        
        print(f"\n[Hydra] Opening Head for off-chain negotiation...")
        print(f"[Hydra] Head ID: {head_id}")
        print(f"[Hydra] Participants: {offer.lender_address}, {borrower_address}")
        
        state = NegotiationState(
            head_id=head_id,
            original_offer=offer,
            current_rate=offer.interest_rate
        )
        self.active_heads[head_id] = state
        
        print(f"[Hydra] Head opened successfully!")
        return state
    
    def negotiate(self, head_id: str, proposed_rate: float) -> Dict:
        """Submit a counter-offer (zero gas!)."""
        if head_id not in self.active_heads:
            return {"success": False, "error": "Head not found"}
        
        state = self.active_heads[head_id]
        state.rounds += 1
        
        print(f"[Hydra] Round {state.rounds}: Proposed {proposed_rate}% (current: {state.current_rate}%)")
        
        # Simulate negotiation
        if proposed_rate >= state.original_offer.interest_rate - 1.5:
            state.current_rate = proposed_rate
            state.final_rate = proposed_rate
            state.status = "completed"
            return {
                "success": True,
                "action": "accepted",
                "final_rate": proposed_rate,
                "message": f"DEAL at {proposed_rate}%!"
            }
        elif state.rounds >= 2:
            middle = round((proposed_rate + state.current_rate) / 2, 1)
            state.current_rate = middle
            state.final_rate = middle
            state.status = "completed"
            return {
                "success": True,
                "action": "accepted",
                "final_rate": middle,
                "message": f"Compromise at {middle}%!"
            }
        else:
            counter = round(state.current_rate - 0.5, 1)
            state.current_rate = counter
            return {
                "success": True,
                "action": "counter",
                "lender_rate": counter,
                "message": f"Lender countered: {counter}%"
            }
    
    def accept_and_close(self, head_id: str, borrower_address: str) -> SettlementTx:
        """Accept terms and close head, generating settlement tx."""
        if head_id not in self.active_heads:
            raise ValueError("Head not found")
        
        state = self.active_heads[head_id]
        state.status = "settling"

        print(f"\n[Hydra] Accepting final terms...")
        print(f"[Hydra] Final rate: {state.final_rate}%")
        print(f"[Hydra] Rounds: {state.rounds}")
        print(f"[Hydra] Savings: {state.original_offer.interest_rate - state.final_rate}%")
        
        # Generate settlement transaction
        settlement = SettlementTx(
            tx_hash=f"tx_{head_id}_{int(time.time())}",
            head_id=head_id,
            borrower=borrower_address,
            lender=state.original_offer.lender_address,
            principal=state.original_offer.principal,
            final_rate_bps=int(state.final_rate * 100),
            term_months=state.original_offer.term_months,
            borrower_signature=f"sig_borrower_{int(time.time())}",
            lender_signature=f"sig_lender_{int(time.time())}"
        )
        
        print(f"\n[Hydra] Head closed. Settlement TX generated:")
        print(f"[Hydra] TX Hash: {settlement.tx_hash}")
        
        del self.active_heads[head_id]
        return settlement


# ============================================================================
# Aiken Validator Integration
# ============================================================================

class AikenValidator:
    """
    Interface to the Aiken settlement validator on Cardano.
    Verifies dual signatures and disburses loan.
    """
    
    def __init__(self):
        self.demo_mode = True
    
    def verify_and_settle(self, settlement: SettlementTx) -> Dict:
        """
        Verify settlement transaction and disburse loan.
        
        The Aiken validator checks:
        1. Both borrower and lender signatures are valid
        2. Interest rate is within bounds (0-100%)
        3. Principal and terms match
        """
        print(f"\n[Aiken] Verifying settlement transaction...")
        print(f"[Aiken] TX: {settlement.tx_hash}")
        print(f"[Aiken] Borrower: {settlement.borrower}")
        print(f"[Aiken] Lender: {settlement.lender}")
        print(f"[Aiken] Principal: {settlement.principal} ADA")
        print(f"[Aiken] Rate: {settlement.final_rate_bps} bps ({settlement.final_rate_bps/100}%)")
        
        # Verify signatures (mock)
        print(f"\n[Aiken] Checking borrower signature... OK")
        print(f"[Aiken] Checking lender signature... OK")
        
        # Verify rate bounds
        if 0 <= settlement.final_rate_bps <= 10000:
            print(f"[Aiken] Interest rate valid... OK")
        else:
            return {"success": False, "error": "Invalid interest rate"}
        
        # Disburse loan
        settlement.status = "completed"
        
        print(f"\n[Aiken] *** SETTLEMENT VERIFIED ***")
        print(f"[Aiken] Loan of {settlement.principal} ADA disbursed to {settlement.borrower}!")
        
        return {
            "success": True,
            "tx_hash": settlement.tx_hash,
            "borrower": settlement.borrower,
            "principal": settlement.principal,
            "rate": settlement.final_rate_bps / 100,
            "status": "LOAN_DISBURSED"
        }


# Global instances
midnight_client = MidnightClient()

# Initialize Hydra manager with configured node URL
try:
    if HYDRA_CONFIG_AVAILABLE:
        hydra_node_url = get_hydra_node_url()
        hydra_manager = HydraHeadManager(node_url=hydra_node_url)
        print(f"[BorrowerAgent] Using Hydra node: {hydra_node_url}")
    else:
        hydra_manager = HydraHeadManager()
        print("[BorrowerAgent] Using default Hydra node: ws://localhost:4001")
except Exception as e:
    print(f"[BorrowerAgent] Error loading Hydra config: {e}, using defaults")
    hydra_manager = HydraHeadManager()

aiken_validator = AikenValidator()


# ============================================================================
# CrewAI Tools
# ============================================================================

class AnalyzeLoanTool(BaseTool):
    """Analyzes a loan offer."""
    name: str = "AnalyzeLoanTool"
    description: str = "Analyzes loan offer. Input: interest_rate (number)"
    
    def _run(self, interest_rate: str) -> str:
        try:
            rate = float(interest_rate)
            market_avg = 7.0
            
            if rate <= 5.0:
                verdict, action, target = "excellent", "accept", rate
            elif rate <= 7.0:
                verdict, action, target = "good", "accept", rate
            elif rate <= 9.0:
                verdict, action, target = "acceptable", "negotiate", round(rate - 1.5, 1)
            else:
                verdict, action, target = "high", "negotiate", round(rate - 2.5, 1)
            
            result = {
                "rate": rate,
                "market_avg": market_avg,
                "verdict": verdict,
                "action": action,
                "target_rate": target
            }
            print(f"[Analysis] {rate}%: {verdict} - {action}")
            return json.dumps(result)
        except:
            return json.dumps({"error": "Invalid rate"})


class NegotiateTool(BaseTool):
    """Negotiates in Hydra Head."""
    name: str = "NegotiateTool"
    description: str = "Negotiates loan terms. Input: proposed_rate (number)"
    
    def _run(self, proposed_rate: str) -> str:
        try:
            rate = float(proposed_rate)
            if not hydra_manager.active_heads:
                return json.dumps({"error": "No active negotiation"})
            head_id = list(hydra_manager.active_heads.keys())[0]
            result = hydra_manager.negotiate(head_id, rate)
            return json.dumps(result)
        except:
            return json.dumps({"error": "Invalid rate"})


class AcceptAndSettleTool(BaseTool):
    """Accepts terms and triggers settlement."""
    name: str = "AcceptAndSettleTool"
    description: str = "Accepts terms and settles loan. Input: confirm (yes)"
    
    def _run(self, confirm: str) -> str:
        if confirm.lower() not in ["yes", "y"]:
            return json.dumps({"error": "Confirmation required"})
        
        if not hydra_manager.active_heads:
            return json.dumps({"error": "No active negotiation"})
        
        head_id = list(hydra_manager.active_heads.keys())[0]
        
        # Close Hydra Head and get settlement TX
        settlement = hydra_manager.accept_and_close(head_id, "addr1_borrower_lenny")
        
        # Submit to Aiken Validator
        result = aiken_validator.verify_and_settle(settlement)
        
        return json.dumps(result)


class XAILogTool(BaseTool):
    """Logs decisions for transparency."""
    name: str = "XAILogTool"
    description: str = "Logs decision. Input: decision (string)"
    
    def _run(self, decision: str) -> str:
        log_entry = {
            "timestamp": time.time(),
            "agent": "lenny",
            "decision": decision
        }
        
        log_file = os.path.join(os.path.dirname(__file__), "../logs/xai_decisions.jsonl")
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        
        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
        
        print(f"[XAI] Logged: {decision}")
        return json.dumps({"logged": True})


# ============================================================================
# Agent Creation
# ============================================================================

def create_borrower_agent() -> Agent:
    """Create the Lenny borrower agent."""
    return Agent(
        role="DeFi Loan Negotiator",
        goal="Negotiate the best loan terms in Hydra Heads",
        backstory="You are Lenny, an expert DeFi negotiator.",
        verbose=True,
        allow_delegation=False,
        llm=get_llm(),
        tools=[AnalyzeLoanTool(), NegotiateTool(), AcceptAndSettleTool(), XAILogTool()],
        max_iter=5
    )


# ============================================================================
# Complete Workflow
# ============================================================================

def run_integrated_workflow(
    borrower_address: str = "addr_test1wz4ydpqxpstg453xlr6v3elpg578ussvk8ezunkj62p9wjq7uw9zq",
    credit_score: int = 750,  # Private! Never revealed
    principal: float = 1000,
    initial_rate: float = 8.5,
    term_months: int = 12,
    lender_address: str = "addr1_lender_xyz",
    use_integrated_client: bool = True
) -> Dict:
    """
    Run the complete Zkredit workflow with Hydra + Masumi integration.

    This enhanced workflow includes:
    1. Midnight ZK credit check (privacy-preserving)
    2. Integrated Hydra + Masumi analysis and negotiation
    3. AI-powered loan terms optimization
    4. Real-time blockchain data integration

    Args:
        borrower_address: Cardano address for borrower analysis
        credit_score: Private credit score (700+ eligible)
        principal: Loan amount in ADA
        initial_rate: Starting interest rate (%)
        term_months: Loan duration
        lender_address: Lender's Cardano address
        use_integrated_client: Whether to use Hydra + Masumi integration

    Returns:
        Complete workflow result with integrated analysis
    """

    print("\n" + "=" * 70)
    print("ZKREDIT AI - INTEGRATED WORKFLOW (Hydra + Masumi)")
    print("Privacy-First DeFi Lending with AI Analysis")
    print("=" * 70)

    # =========================================
    # STEP 1: Midnight ZK Credit Check (UNCHANGED)
    # =========================================
    print("\n" + "-" * 50)
    print("STEP 1: MIDNIGHT ZK CREDIT CHECK")
    print("-" * 50)

    credit_result = midnight_client.submit_credit_score(borrower_address, credit_score)

    if not credit_result.is_eligible:
        print("\n[WORKFLOW] Borrower not eligible. Workflow stopped.")
        return {"success": False, "reason": "Credit check failed"}

    # =========================================
    # STEP 2: Lender receives eligibility (UNCHANGED)
    # =========================================
    print("\n" + "-" * 50)
    print("STEP 2: LENDER RECEIVES ELIGIBILITY")
    print("-" * 50)

    print(f"[Lender] Received from Midnight:")
    print(f"[Lender]   Borrower: {borrower_address}")
    print(f"[Lender]   is_eligible: {credit_result.is_eligible}")
    print(f"[Lender]   ZK Proof: {credit_result.proof_hash}")
    print(f"[Lender]   (Credit score remains PRIVATE!)")

    # =========================================
    # STEP 3: Lender creates loan offer (UNCHANGED)
    # =========================================
    print("\n" + "-" * 50)
    print("STEP 3: LENDER CREATES LOAN OFFER")
    print("-" * 50)

    offer = LoanOffer(
        lender_address=lender_address,
        principal=principal,
        interest_rate=initial_rate,
        term_months=term_months
    )

    print(f"[Lender] Loan offer created:")
    print(f"[Lender]   Principal: {offer.principal} ADA")
    print(f"[Lender]   Interest Rate: {offer.interest_rate}%")
    print(f"[Lender]   Term: {offer.term_months} months")

    # =========================================
    # STEP 4: INTEGRATED HYDRA + MASUMI NEGOTIATION
    # =========================================
    print("\n" + "-" * 50)
    print("STEP 4: INTEGRATED HYDRA + MASUMI NEGOTIATION")
    print("-" * 50)

    if use_integrated_client and INTEGRATED_CLIENT_AVAILABLE:
        print("[Workflow] Using integrated Hydra + Masumi client...")

        # Initialize integrated client
        integrated_client = IntegratedHydraMasumiClient()

        try:
            # Start the client
            import asyncio
            loop = asyncio.new_event_loop()
            asyncio.set_event_loop(loop)

            async def run_negotiation():
                await integrated_client.start()
                try:
                    result = await integrated_client.negotiate_with_ai_analysis(
                        borrower_address=borrower_address,
                        lender_address=lender_address,
                        principal=principal,
                        initial_rate=initial_rate,
                        term_months=term_months
                    )
                    return result
                finally:
                    await integrated_client.stop()

            # Run the negotiation
            negotiation_result = loop.run_until_complete(run_negotiation())

            # =========================================
            # STEP 5: AIKEN VALIDATOR VERIFICATION
            # =========================================
            print("\n" + "-" * 50)
            print("STEP 5: AIKEN VALIDATOR VERIFICATION")
            print("-" * 50)

            aiken_result = aiken_validator.verify_and_settle(negotiation_result.settlement)

            # =========================================
            # STEP 6: WORKFLOW COMPLETE
            # =========================================
            print("\n" + "=" * 70)
            print("INTEGRATED WORKFLOW COMPLETE!")
            print("=" * 70)

            print("\nSummary:")
            print(f"  Borrower: {borrower_address}")
            print(f"  Credit Check: PASSED (ZK proof, score hidden)")
            print(f"  Initial Rate: {offer.interest_rate}%")
            print(f"  Final Rate: {negotiation_result.final_rate}%")
            print(f"  Savings: {offer.interest_rate - negotiation_result.final_rate}%")
            print(f"  AI Analysis: COMPLETED")
            print(f"  Blockchain Data: {len(negotiation_result.blockchain_data)} assets analyzed")
            print(f"  Settlement: VERIFIED by Aiken")
            print(f"  Status: LOAN DISBURSED!")

            return {
                "success": True,
                "borrower": borrower_address,
                "credit_check": "passed",
                "initial_rate": offer.interest_rate,
                "final_rate": negotiation_result.final_rate,
                "savings": offer.interest_rate - negotiation_result.final_rate,
                "principal": principal,
                "settlement_tx": negotiation_result.settlement.tx_hash,
                "head_id": negotiation_result.head_id,
                "masumi_analysis": negotiation_result.masumi_analysis,
                "blockchain_data": negotiation_result.blockchain_data,
                "aiken_verification": aiken_result,
                "integrated_workflow": True
            }

        except Exception as e:
            print(f"[Workflow] Integrated negotiation failed: {e}")
            print("[Workflow] Falling back to standard workflow...")
            # Fall through to standard workflow

    # =========================================
    # FALLBACK: STANDARD WORKFLOW
    # =========================================
    print("[Workflow] Using standard CrewAI workflow...")

    # STEP 4: AI Agent receives offer and opens Hydra Head
    print("\n" + "-" * 50)
    print("STEP 4: AI AGENT (LENNY) RECEIVES OFFER")
    print("-" * 50)

    print(f"[Lenny] Received loan offer from {lender_address}")

    # Open Hydra Head
    negotiation = hydra_manager.open_head(offer, borrower_address)

    # STEP 5: AI Agent analyzes and negotiates
    print("\n" + "-" * 50)
    print("STEP 5: AI ANALYSIS & NEGOTIATION")
    print("-" * 50)

    lenny = create_borrower_agent()

    task = Task(
        description=(
            f"Negotiate this loan:\n"
            f"- Principal: {offer.principal} ADA\n"
            f"- Rate: {offer.interest_rate}%\n"
            f"- Term: {offer.term_months} months\n\n"
            f"1. Use AnalyzeLoanTool with: {offer.interest_rate}\n"
            f"2. Use NegotiateTool with your target rate\n"
            f"3. Use AcceptAndSettleTool with: yes"
        ),
        expected_output="Final settlement result",
        agent=lenny
    )

    crew = Crew(agents=[lenny], tasks=[task], verbose=True)
    result = crew.kickoff()

    # STEP 6: Summary
    print("\n" + "=" * 70)
    print("STANDARD WORKFLOW COMPLETE!")
    print("=" * 70)

    print("\nSummary:")
    print(f"  Borrower: {borrower_address}")
    print(f"  Credit Check: PASSED (ZK proof, score hidden)")
    print(f"  Original Rate: {offer.interest_rate}%")
    print(f"  Negotiation: Completed in Hydra Head")
    print(f"  Settlement: Verified by Aiken Validator")
    print(f"  Status: LOAN DISBURSED!")

    return {
        "success": True,
        "borrower": borrower_address,
        "principal": offer.principal,
        "original_rate": offer.interest_rate,
        "credit_check": "passed",
        "result": str(result),
        "integrated_workflow": False
    }


def run_complete_workflow(
    borrower_address: str = "addr1_borrower_xyz",
    credit_score: int = 750,  # Private! Never revealed
    principal: float = 1000,
    initial_rate: float = 8.5,
    term_months: int = 12,
    lender_address: str = "addr1_lender_xyz"
) -> Dict:
    """
    Run the complete Zkredit workflow:
    
    1. Borrower -> Midnight: Submit credit score (private)
    2. Midnight -> Lender: is_eligible: true (public ZK proof)
    3. Lender -> AI Agent: Loan offer
    4. AI Agent: Analyze with Llama 3
    5. AI Agent -> Hydra: Open Head
    6. Hydra: Negotiate (off-chain, zero gas)
    7. AI Agent -> Hydra: Accept Final Terms
    8. Hydra -> Aiken: Close Head, Settlement TX
    9. Aiken: Verify dual signatures
    10. Aiken -> Borrower: Loan Disbursed!
    """
    
    print("\n" + "=" * 70)
    print("ZKREDIT AI - COMPLETE WORKFLOW")
    print("Privacy-First DeFi Lending on Cardano")
    print("=" * 70)
    
    # =========================================
    # STEP 1: Borrower submits credit score to Midnight (PRIVATE)
    # =========================================
    print("\n" + "-" * 50)
    print("STEP 1: MIDNIGHT ZK CREDIT CHECK")
    print("-" * 50)
    
    credit_result = midnight_client.submit_credit_score(borrower_address, credit_score)
    
    if not credit_result.is_eligible:
        print("\n[WORKFLOW] Borrower not eligible. Workflow stopped.")
        return {"success": False, "reason": "Credit check failed"}
    
    # =========================================
    # STEP 2: Lender receives eligibility (only boolean, not score!)
    # =========================================
    print("\n" + "-" * 50)
    print("STEP 2: LENDER RECEIVES ELIGIBILITY")
    print("-" * 50)
    
    print(f"[Lender] Received from Midnight:")
    print(f"[Lender]   Borrower: {borrower_address}")
    print(f"[Lender]   is_eligible: {credit_result.is_eligible}")
    print(f"[Lender]   ZK Proof: {credit_result.proof_hash}")
    print(f"[Lender]   (Credit score remains PRIVATE!)")
    
    # =========================================
    # STEP 3: Lender creates loan offer
    # =========================================
    print("\n" + "-" * 50)
    print("STEP 3: LENDER CREATES LOAN OFFER")
    print("-" * 50)
    
    offer = LoanOffer(
        lender_address=lender_address,
        principal=principal,
        interest_rate=initial_rate,
        term_months=term_months
    )
    
    print(f"[Lender] Loan offer created:")
    print(f"[Lender]   Principal: {offer.principal} ADA")
    print(f"[Lender]   Interest Rate: {offer.interest_rate}%")
    print(f"[Lender]   Term: {offer.term_months} months")
    
    # =========================================
    # STEP 4: AI Agent receives offer and opens Hydra Head
    # =========================================
    print("\n" + "-" * 50)
    print("STEP 4: AI AGENT (LENNY) RECEIVES OFFER")
    print("-" * 50)
    
    print(f"[Lenny] Received loan offer from {lender_address}")
    
    # Open Hydra Head
    negotiation = hydra_manager.open_head(offer, borrower_address)
    
    # =========================================
    # STEP 5: AI Agent analyzes and negotiates
    # =========================================
    print("\n" + "-" * 50)
    print("STEP 5: AI ANALYSIS & NEGOTIATION")
    print("-" * 50)
    
    lenny = create_borrower_agent()
    
    task = Task(
        description=(
            f"Negotiate this loan:\n"
            f"- Principal: {offer.principal} ADA\n"
            f"- Rate: {offer.interest_rate}%\n"
            f"- Term: {offer.term_months} months\n\n"
            f"1. Use AnalyzeLoanTool with: {offer.interest_rate}\n"
            f"2. Use NegotiateTool with your target rate\n"
            f"3. Use AcceptAndSettleTool with: yes"
        ),
        expected_output="Final settlement result",
        agent=lenny
    )
    
    crew = Crew(agents=[lenny], tasks=[task], verbose=True)
    result = crew.kickoff()
    
    # =========================================
    # STEP 6: Summary
    # =========================================
    print("\n" + "=" * 70)
    print("WORKFLOW COMPLETE!")
    print("=" * 70)
    
    print(f"\nSummary:")
    print(f"  Borrower: {borrower_address}")
    print(f"  Credit Check: PASSED (ZK proof, score hidden)")
    print(f"  Original Rate: {offer.interest_rate}%")
    print(f"  Negotiation: Completed in Hydra Head")
    print(f"  Settlement: Verified by Aiken Validator")
    print(f"  Status: LOAN DISBURSED!")
    
    return {
        "success": True,
        "borrower": borrower_address,
        "principal": offer.principal,
        "original_rate": offer.interest_rate,
        "credit_check": "passed",
        "result": str(result)
    }


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("Zkredit - Privacy-First DeFi Lending")
    print("=" * 70)
    print("Components:")
    print("  - Midnight: ZK credit checks (privacy)")
    print("  - Llama 3: Local AI analysis (privacy)")
    print("  - Hydra: Off-chain negotiation (speed)")
    print("  - Aiken: On-chain settlement (security)")
    print("  - Masumi: AI blockchain analysis (NEW!)")
    print("=" * 70)

    # Run the integrated workflow (Hydra + Masumi)
    print("\nRunning INTEGRATED workflow with Hydra + Masumi...")
    result = run_integrated_workflow(
        borrower_address="addr_test1wz4ydpqxpstg453xlr6v3elpg578ussvk8ezunkj62p9wjq7uw9zq",
        credit_score=750,  # Private! Never revealed
        principal=1000,
        initial_rate=8.5,
        term_months=12,
        lender_address="addr1_lender_bob",
        use_integrated_client=True
    )

    if not result.get("integrated_workflow", False):
        print("\n" + "=" * 50)
        print("FALLING BACK TO STANDARD WORKFLOW")
        print("=" * 50)
        # Run the standard workflow as fallback
        run_complete_workflow(
            borrower_address="addr1_borrower_alice",
            credit_score=750,
            principal=1000,
            initial_rate=8.5,
            term_months=12,
            lender_address="addr1_lender_bob"
        )
