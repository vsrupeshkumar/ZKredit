"""
Zkredit - Multi-Agent Negotiation System
Supports multiple borrowers and lenders negotiating simultaneously
"""

import asyncio
from typing import List, Dict, Optional, Any
from dataclasses import dataclass
from datetime import datetime
from enum import Enum

from crewai import Agent, Task, Crew, LLM
from crewai.tools import BaseTool

from .borrower_agent import create_borrower_agent, LoanOffer
from .lender_agent import create_lender_agent


class NegotiationRole(Enum):
    """Role in multi-agent negotiation."""
    BORROWER = "borrower"
    LENDER = "lender"
    MEDIATOR = "mediator"  # Optional AI mediator for complex negotiations


@dataclass
class NegotiationParticipant:
    """Participant in multi-agent negotiation."""
    agent_id: str
    role: NegotiationRole
    address: str
    agent: Agent
    current_offer: Optional[Dict] = None
    negotiation_history: List[Dict] = None
    
    def __post_init__(self):
        if self.negotiation_history is None:
            self.negotiation_history = []


@dataclass
class MultiAgentNegotiation:
    """Multi-agent negotiation session."""
    negotiation_id: str
    participants: List[NegotiationParticipant]
    loan_terms: Dict[str, Any]
    status: str = "active"
    rounds: int = 0
    max_rounds: int = 10
    created_at: str = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now().isoformat()


class MultiAgentNegotiationManager:
    """Manages multi-agent negotiation scenarios."""
    
    def __init__(self):
        self.active_negotiations: Dict[str, MultiAgentNegotiation] = {}
    
    def create_negotiation(
        self,
        borrowers: List[Dict[str, Any]],
        lenders: List[Dict[str, Any]],
        loan_terms: Dict[str, Any]
    ) -> MultiAgentNegotiation:
        """
        Create a new multi-agent negotiation.
        
        Args:
            borrowers: List of borrower configurations
            lenders: List of lender configurations
            loan_terms: Initial loan terms
        
        Returns:
            Multi-agent negotiation session
        """
        negotiation_id = f"multi_neg_{int(datetime.now().timestamp())}"
        
        participants = []
        
        # Create borrower agents
        for i, borrower_config in enumerate(borrowers):
            agent = create_borrower_agent()
            participant = NegotiationParticipant(
                agent_id=f"borrower_{i}",
                role=NegotiationRole.BORROWER,
                address=borrower_config.get("address", f"addr_borrower_{i}"),
                agent=agent
            )
            participants.append(participant)
        
        # Create lender agents
        for i, lender_config in enumerate(lenders):
            agent = create_lender_agent()
            participant = NegotiationParticipant(
                agent_id=f"lender_{i}",
                role=NegotiationRole.LENDER,
                address=lender_config.get("address", f"addr_lender_{i}"),
                agent=agent
            )
            participants.append(participant)
        
        negotiation = MultiAgentNegotiation(
            negotiation_id=negotiation_id,
            participants=participants,
            loan_terms=loan_terms
        )
        
        self.active_negotiations[negotiation_id] = negotiation
        return negotiation
    
    async def run_negotiation_round(
        self,
        negotiation_id: str
    ) -> Dict[str, Any]:
        """
        Run a single round of multi-agent negotiation.
        
        Args:
            negotiation_id: Negotiation session ID
        
        Returns:
            Round results
        """
        negotiation = self.active_negotiations.get(negotiation_id)
        if not negotiation:
            return {"error": "Negotiation not found"}
        
        if negotiation.status != "active":
            return {"error": f"Negotiation is {negotiation.status}"}
        
        if negotiation.rounds >= negotiation.max_rounds:
            negotiation.status = "max_rounds_reached"
            return {"error": "Maximum rounds reached"}
        
        negotiation.rounds += 1
        round_results = []
        
        # Each participant makes an offer/counter-offer
        for participant in negotiation.participants:
            if participant.role == NegotiationRole.BORROWER:
                # Borrower analyzes and makes counter-offer
                task = Task(
                    description=(
                        f"Analyze the current loan terms:\n"
                        f"- Principal: {negotiation.loan_terms.get('principal', 0)}\n"
                        f"- Interest Rate: {negotiation.loan_terms.get('interest_rate', 0)}%\n"
                        f"- Term: {negotiation.loan_terms.get('term_months', 0)} months\n\n"
                        f"Make a counter-offer if the terms are not favorable."
                    ),
                    expected_output="Counter-offer with reasoning",
                    agent=participant.agent
                )
                
                crew = Crew(agents=[participant.agent], tasks=[task], verbose=False)
                result = crew.kickoff()
                
                # Parse result and update offer
                # In production, this would parse the agent's response
                participant.current_offer = {
                    "interest_rate": negotiation.loan_terms.get("interest_rate", 0) - 0.5,
                    "reasoning": str(result)
                }
                
            elif participant.role == NegotiationRole.LENDER:
                # Lender evaluates and responds
                task = Task(
                    description=(
                        f"Evaluate the current negotiation:\n"
                        f"- Current Rate: {negotiation.loan_terms.get('interest_rate', 0)}%\n"
                        f"- Principal: {negotiation.loan_terms.get('principal', 0)}\n\n"
                        f"Decide whether to accept, counter, or reject."
                    ),
                    expected_output="Decision with reasoning",
                    agent=participant.agent
                )
                
                crew = Crew(agents=[participant.agent], tasks=[task], verbose=False)
                result = crew.kickoff()
                
                participant.current_offer = {
                    "interest_rate": negotiation.loan_terms.get("interest_rate", 0),
                    "decision": "counter",
                    "reasoning": str(result)
                }
            
            round_results.append({
                "participant": participant.agent_id,
                "role": participant.role.value,
                "offer": participant.current_offer
            })
            
            participant.negotiation_history.append({
                "round": negotiation.rounds,
                "offer": participant.current_offer,
                "timestamp": datetime.now().isoformat()
            })
        
        # Check for consensus
        consensus = self._check_consensus(negotiation)
        
        if consensus["reached"]:
            negotiation.status = "completed"
            return {
                "round": negotiation.rounds,
                "consensus": True,
                "final_terms": consensus["terms"],
                "participants": round_results
            }
        
        return {
            "round": negotiation.rounds,
            "consensus": False,
            "participants": round_results,
            "next_round": True
        }
    
    def _check_consensus(self, negotiation: MultiAgentNegotiation) -> Dict[str, Any]:
        """Check if all participants have reached consensus."""
        borrower_offers = [
            p.current_offer for p in negotiation.participants
            if p.role == NegotiationRole.BORROWER and p.current_offer
        ]
        lender_offers = [
            p.current_offer for p in negotiation.participants
            if p.role == NegotiationRole.LENDER and p.current_offer
        ]
        
        if not borrower_offers or not lender_offers:
            return {"reached": False}
        
        # Simple consensus: rates are within 0.5% of each other
        borrower_rates = [o.get("interest_rate", 0) for o in borrower_offers]
        lender_rates = [o.get("interest_rate", 0) for o in lender_offers]
        
        avg_borrower_rate = sum(borrower_rates) / len(borrower_rates)
        avg_lender_rate = sum(lender_rates) / len(lender_rates)
        
        if abs(avg_borrower_rate - avg_lender_rate) <= 0.5:
            final_rate = (avg_borrower_rate + avg_lender_rate) / 2
            return {
                "reached": True,
                "terms": {
                    **negotiation.loan_terms,
                    "interest_rate": round(final_rate, 2)
                }
            }
        
        return {"reached": False}
    
    def get_negotiation(self, negotiation_id: str) -> Optional[MultiAgentNegotiation]:
        """Get negotiation by ID."""
        return self.active_negotiations.get(negotiation_id)
    
    def list_negotiations(self) -> List[Dict[str, Any]]:
        """List all active negotiations."""
        return [
            {
                "negotiation_id": neg.negotiation_id,
                "status": neg.status,
                "rounds": neg.rounds,
                "participants": len(neg.participants),
                "created_at": neg.created_at
            }
            for neg in self.active_negotiations.values()
        ]


# Global instance
_negotiation_manager: Optional[MultiAgentNegotiationManager] = None


def get_negotiation_manager() -> MultiAgentNegotiationManager:
    """Get or create global negotiation manager."""
    global _negotiation_manager
    if _negotiation_manager is None:
        _negotiation_manager = MultiAgentNegotiationManager()
    return _negotiation_manager

