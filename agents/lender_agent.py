"""
Zkredit - Lender Agent (Luna)
A privacy-first AI agent that manages lending operations and responds to borrower negotiations.

Flow:
1. Create and broadcast loan offers
2. Receive negotiation requests in Hydra Head
3. Evaluate counter-offers using Llama 3
4. Accept/Counter/Reject proposals
5. Sign settlement transaction for Aiken Validator
"""

import json
import time
import os
from typing import Any, Dict, List, Optional
from dataclasses import dataclass, field
from crewai import Agent, Task, Crew, LLM
from crewai.tools import BaseTool

# Add parent directory to path
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


# ============================================================================
# PRIVACY-FIRST CONFIGURATION: Llama 3 via Ollama (Local)
# ============================================================================
# LLM is initialized lazily when agent is actually used, not at module import
def get_llm():
    """Get LLM instance - initialized only when needed."""
    return LLM(
        model="ollama/llama3",
        base_url="http://localhost:11434",
        temperature=0.6,  # More conservative for lending decisions
    )


# ============================================================================
# Data Classes
# ============================================================================

@dataclass
class LendingPool:
    """Manages the lender's liquidity pool."""
    total_liquidity: float = 10000.0
    available_liquidity: float = 10000.0
    active_loans: List[Dict] = field(default_factory=list)
    min_rate: float = 5.0  # Minimum acceptable rate
    target_rate: float = 8.0  # Target rate
    
    def allocate(self, amount: float) -> bool:
        if amount <= self.available_liquidity:
            self.available_liquidity -= amount
            return True
        return False
    
    def release(self, amount: float, profit: float = 0):
        self.available_liquidity += amount + profit
        self.total_liquidity += profit


@dataclass
class NegotiationRequest:
    """A negotiation request from a borrower."""
    borrower_address: str
    principal: float
    proposed_rate: float
    term_months: int
    head_id: str
    rounds: int = 0


# ============================================================================
# Custom Tools for Lender Agent
# ============================================================================

class RiskAssessmentTool(BaseTool):
    """Tool to assess borrower risk."""
    
    name: str = "RiskAssessmentTool"
    description: str = "Assesses loan risk. Input: principal (number like 1000)"
    
    def _run(self, principal: str) -> str:
        """Assess risk based on loan parameters."""
        try:
            amount = float(principal)
            
            # Risk calculation
            base_risk = 0.3
            
            if amount > 5000:
                base_risk += 0.2
                risk_level = "high"
            elif amount > 1000:
                base_risk += 0.1
                risk_level = "medium"
            else:
                risk_level = "low"
            
            # Recommended rate based on risk
            base_rate = 5.0
            risk_premium = base_risk * 10
            recommended_rate = min(base_rate + risk_premium, 15.0)
            
            result = {
                "principal": amount,
                "risk_score": round(base_risk, 2),
                "risk_level": risk_level,
                "recommended_rate": round(recommended_rate, 1),
                "min_acceptable_rate": round(recommended_rate - 1.0, 1)
            }
            
            print(f"[Risk] {amount} ADA: {risk_level} risk, recommend {recommended_rate}%")
            return json.dumps(result)
        except ValueError:
            return json.dumps({"error": "Invalid principal amount"})


class EvaluateOfferTool(BaseTool):
    """Tool to evaluate a borrower's counter-offer."""
    
    name: str = "EvaluateOfferTool"
    description: str = "Evaluates borrower offer. Input: offered_rate (number like 7.0)"
    
    def _run(self, offered_rate: str) -> str:
        """Evaluate if the offered rate is acceptable."""
        try:
            rate = float(offered_rate)
            min_rate = 6.0  # Lender's minimum
            target_rate = 8.0
            
            if rate >= target_rate:
                action = "accept"
                message = f"Excellent! {rate}% meets our target"
            elif rate >= min_rate:
                action = "accept"
                message = f"Acceptable. {rate}% is above minimum"
            elif rate >= min_rate - 1.0:
                counter = (rate + min_rate) / 2
                action = "counter"
                message = f"Close. Counter with {counter:.1f}%"
            else:
                action = "reject"
                message = f"Too low. Minimum is {min_rate}%"
            
            result = {
                "offered_rate": rate,
                "min_rate": min_rate,
                "target_rate": target_rate,
                "action": action,
                "message": message
            }
            
            print(f"[Evaluate] {rate}%: {action} - {message}")
            return json.dumps(result)
        except ValueError:
            return json.dumps({"error": "Invalid rate"})


class CreateOfferTool(BaseTool):
    """Tool to create a loan offer."""
    
    name: str = "CreateOfferTool"
    description: str = "Creates loan offer. Input: principal (number like 1000)"
    
    def _run(self, principal: str) -> str:
        """Create a new loan offer."""
        try:
            amount = float(principal)
            
            offer = {
                "offer_id": f"offer_{int(time.time())}",
                "lender_address": "addr1_lender_luna",
                "principal": amount,
                "interest_rate": 8.5,
                "term_months": 12,
                "collateral_ratio": 1.5,
                "status": "active",
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ")
            }
            
            # Log the offer
            log_file = os.path.join(
                os.path.dirname(__file__),
                "../logs/loan_offers.jsonl"
            )
            os.makedirs(os.path.dirname(log_file), exist_ok=True)
            
            with open(log_file, "a") as f:
                f.write(json.dumps(offer) + "\n")
            
            print(f"[Offer] Created: {amount} ADA @ {offer['interest_rate']}%")
            return json.dumps({"success": True, "offer": offer})
        except ValueError:
            return json.dumps({"error": "Invalid principal"})


class SignSettlementTool(BaseTool):
    """Tool to sign a settlement transaction."""
    
    name: str = "SignSettlementTool"
    description: str = "Signs settlement for Aiken validator. Input: final_rate (number)"
    
    def _run(self, final_rate: str) -> str:
        """Sign the settlement transaction."""
        try:
            rate = float(final_rate)
            
            # In production, this would create a real signature
            settlement = {
                "signed": True,
                "signer": "lender_luna",
                "final_rate_bps": int(rate * 100),
                "signature": f"sig_luna_{int(time.time())}",
                "message": "Ready for Aiken validator verification"
            }
            
            print(f"[Settlement] Signed at {rate}% ({settlement['final_rate_bps']} bps)")
            return json.dumps(settlement)
        except ValueError:
            return json.dumps({"error": "Invalid rate"})


class XAITool(BaseTool):
    """Explainable AI Tool for transparency."""
    
    name: str = "XAITool"
    description: str = "Logs decision. Inputs: decision (string), reasoning (string), confidence (0-1)"
    
    def _run(self, decision: str, reasoning: str = "", confidence: str = "0.8") -> str:
        """Log a decision with reasoning."""
        try:
            conf = float(confidence)
        except ValueError:
            conf = 0.8
        
        log_entry = {
            "timestamp": time.time(),
            "agent": "lender_luna",
            "decision": decision,
            "reasoning": reasoning,
            "confidence": conf
        }
        
        log_file = os.path.join(
            os.path.dirname(__file__),
            "../logs/xai_decisions.jsonl"
        )
        os.makedirs(os.path.dirname(log_file), exist_ok=True)
        
        with open(log_file, "a") as f:
            f.write(json.dumps(log_entry) + "\n")
        
        print(f"[XAI] Logged: {decision} (confidence: {conf})")
        return json.dumps({"logged": True})


# ============================================================================
# The Lender Agent: "Luna"
# ============================================================================

def create_lender_agent() -> Agent:
    """Create the Luna lender agent."""
    try:
        llm = get_llm()
        return Agent(
            role="DeFi Lender",
            goal="Evaluate loan requests and maximize returns while managing risk",
            backstory=(
                "You are Luna, a prudent DeFi lender. "
                "You carefully assess risk, evaluate offers, "
                "and make fair lending decisions with clear reasoning."
            ),
            verbose=True,
            allow_delegation=False,
            llm=llm,
            tools=[RiskAssessmentTool(), EvaluateOfferTool(), CreateOfferTool(), SignSettlementTool(), XAITool()],
            max_iter=6
        )
    except Exception as e:
        print(f"[Luna] LLM not available ({e}), creating agent without LLM for basic operations")
        return Agent(
            role="DeFi Lender",
            goal="Evaluate loan requests and maximize returns while managing risk",
            backstory=(
                "You are Luna, a prudent DeFi lender. "
                "You carefully assess risk, evaluate offers, "
                "and make fair lending decisions with clear reasoning."
            ),
            verbose=True,
            allow_delegation=False,
            tools=[RiskAssessmentTool(), EvaluateOfferTool(), CreateOfferTool(), SignSettlementTool(), XAITool()],
            max_iter=6
        )


# ============================================================================
# Main Workflow
# ============================================================================

def handle_negotiation_request(
    borrower_address: str,
    principal: float,
    proposed_rate: float,
    term_months: int
) -> Dict:
    """
    Handle a negotiation request from a borrower.
    """
    print("\n" + "=" * 70)
    print("ZKREDIT AI - LENDER RESPONSE WORKFLOW")
    print("=" * 70)
    
    print(f"\n[1] NEGOTIATION REQUEST RECEIVED")
    print(f"    Borrower: {borrower_address}")
    print(f"    Principal: {principal} ADA")
    print(f"    Proposed Rate: {proposed_rate}%")
    print(f"    Term: {term_months} months")
    
    print(f"\n[2] AI AGENT EVALUATING")
    
    # Create agent
    luna = create_lender_agent()
    
    # Create task
    task = Task(
        description=(
            f"A borrower is requesting a loan:\n"
            f"- Principal: {principal} ADA\n"
            f"- Proposed Rate: {proposed_rate}%\n"
            f"- Term: {term_months} months\n\n"
            f"Steps:\n"
            f"1. Use RiskAssessmentTool with: {principal}\n"
            f"2. Use EvaluateOfferTool with: {proposed_rate}\n"
            f"3. If accepting, use SignSettlementTool with the final rate\n"
            f"4. Use XAITool to log your decision"
        ),
        expected_output="Decision to accept, counter, or reject with reasoning",
        agent=luna
    )
    
    # Execute
    crew = Crew(agents=[luna], tasks=[task], verbose=True)
    result = crew.kickoff()
    
    print(f"\n[3] EVALUATION COMPLETE")
    print(f"    Result: {result}")
    
    return {"result": str(result)}


def run_lender_agent() -> None:
    """Main entry point for lender agent."""
    print("[Luna] Starting lender agent...")
    
    # Simulate receiving a negotiation request
    mock_request = {
        "borrower_address": "addr1_borrower_xyz",
        "principal": 1000,
        "proposed_rate": 7.0,
        "term_months": 12
    }
    
    print(f"\n[Luna] Received request: {json.dumps(mock_request, indent=2)}\n")
    
    result = handle_negotiation_request(**mock_request)
    
    print("\n" + "=" * 70)
    print("LENDER WORKFLOW COMPLETE")
    print("=" * 70)


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    print("=" * 70)
    print("Zkredit - Lender Agent (Luna)")
    print("Privacy-First Configuration: Using Llama 3 via Ollama")
    llm = get_llm()
    print(f"Ollama Endpoint: {llm.base_url if hasattr(llm, 'base_url') else 'http://localhost:11434'}")
    print("=" * 70)
    print("Make sure Ollama is running: ollama serve")
    print("Make sure Llama 3 is installed: ollama pull llama3\n")
    
    run_lender_agent()
