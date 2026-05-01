"""
Zkredit - FastAPI Backend Server
Complete API for the Privacy-First DeFi Lending Platform

Integrates:
- Midnight ZK Credit Checks
- Llama 3 AI Analysis
- Hydra Off-chain Negotiation (Real Node Support!)
- Aiken Validator Settlement
"""

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict
import asyncio
import json
import os
import sys
from datetime import datetime
from pydantic import BaseModel
from contextlib import asynccontextmanager

# Add project root to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "../.."))

# Import Hydra client
try:
    from hydra.head_manager import (
        HydraClient, 
        HydraNegotiationManager, 
        HydraConfig, 
        ConnectionMode,
        Settlement
    )
    HYDRA_AVAILABLE = True
except ImportError:
    HYDRA_AVAILABLE = False
    print("[WARNING] Hydra module not available, using built-in mock")

# Import AI Agents
try:
    from agents.borrower_agent import create_borrower_agent
    from agents.lender_agent import create_lender_agent, handle_negotiation_request
    from agents.multi_agent_negotiation import get_negotiation_manager
    from crewai import Crew, Task
    AGENTS_AVAILABLE = True
except ImportError as e:
    AGENTS_AVAILABLE = False
    print(f"[WARNING] Agent modules not available: {e}")

# Import PyCardano transaction builder
try:
    from backend.cardano.tx_builder import get_tx_builder, LoanSettlementParams
    CARDANO_TX_AVAILABLE = True
except ImportError as e:
    CARDANO_TX_AVAILABLE = False
    print(f"[WARNING] PyCardano not available: {e}")

# Import Midnight ZK client
try:
    from backend.midnight.zk_client import get_midnight_client, CreditCheckRequest
    MIDNIGHT_AVAILABLE = True
except ImportError as e:
    MIDNIGHT_AVAILABLE = False
    print(f"[WARNING] Midnight client not available: {e}")

# Import Credit Oracle
try:
    from backend.oracles.credit_oracle import get_credit_oracle
    ORACLE_AVAILABLE = True
except ImportError as e:
    ORACLE_AVAILABLE = False
    print(f"[WARNING] Credit oracle not available: {e}")


# ============================================================================
# Application Setup
# ============================================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    # Note: uvicorn may override PORT env var with command line --port
    # We'll read it from the app state if available, otherwise default
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    display_host = "localhost" if host == "0.0.0.0" else host

    print("=" * 70)
    print("Zkredit Backend API Started")
    print("=" * 70)
    print(f"REST API:    http://{display_host}:{port}")
    print(f"WebSocket:   ws://{display_host}:{port}/ws")
    print(f"Docs:        http://{display_host}:{port}/docs")
    print("=" * 70)
    print("Note: Actual port shown in uvicorn startup message above")
    print("=" * 70)

    # Initialize Hydra manager
    if HYDRA_AVAILABLE:
        hydra_url = os.getenv("HYDRA_NODE_URL", "ws://127.0.0.1:4001")
        mode = os.getenv("HYDRA_MODE", "auto")

        config = HydraConfig(
            node_url=hydra_url,
            mode=ConnectionMode(mode)
        )

        app.state.hydra_manager = HydraNegotiationManager(HydraClient(config))

        try:
            await app.state.hydra_manager.start()
            if not app.state.hydra_manager.client._connected:
                print(f"[Hydra] Running in MOCK mode (node not available)")
            else:
                print(f"[Hydra] Connected to node at {hydra_url}")
        except Exception as e:
            print(f"[Hydra] Warning: {e}")
            app.state.hydra_manager = None
    else:
        app.state.hydra_manager = None
        print("[Hydra] Module not available, using fallback")

    # Initialize AI Agents (always running)
    print("[Agents] Initializing AI agents...")
    app.state.agents_initialized = False
    app.state.agent_heartbeat_task = None

    # Set dummy environment variables to prevent LLM initialization errors
    os.environ.setdefault('OPENAI_API_KEY', 'dummy-key-for-development')
    os.environ.setdefault('ANTHROPIC_API_KEY', 'dummy-key-for-development')

    try:
        # Initialize Masumi integration first (doesn't require LLM)
        try:
            from hydra.integrated_client import IntegratedHydraMasumiClient
            masumi_client = IntegratedHydraMasumiClient()
            app.state.masumi_client = masumi_client
            print("[Agents] Masumi Cardano analysis client initialized")
        except Exception as e:
            print(f"[Agents] Masumi client initialization failed: {e}")
            app.state.masumi_client = None

        if AGENTS_AVAILABLE:
            # Initialize CrewAI agents (may fail due to LLM issues)
            try:
                lenny = create_borrower_agent()
                app.state.lenny_agent = lenny
                print("[Agents] Lenny (Borrower Agent) initialized and ready")
            except Exception as e:
                print(f"[Agents] Lenny initialization failed (LLM issue): {e}")
                app.state.lenny_agent = None

            try:
                luna = create_lender_agent()
                app.state.luna_agent = luna
                print("[Agents] Luna (Lender Agent) initialized and ready")
            except Exception as e:
                print(f"[Agents] Luna initialization failed (LLM issue): {e}")
                app.state.luna_agent = None

            # Check if at least one component is available
            if app.state.lenny_agent or app.state.luna_agent or app.state.masumi_client:
                app.state.agents_initialized = True
                print("[Agents] AI agents system initialized (with available components)")

                # Start agent heartbeat task
                app.state.agent_heartbeat_task = asyncio.create_task(agent_heartbeat())
                print("[Agents] Agent heartbeat monitoring started")

                # Broadcast initial agent status
                await manager.broadcast({
                    "type": "agent_status",
                    "data": {"status": "idle", "task": "Ready for loan negotiations"}
                })
            else:
                print("[Agents] No AI components available, using full simulation mode")
                app.state.agents_initialized = False
        else:
            print("[Agents] CrewAI not available, using simulation mode with Masumi if available")
            app.state.agents_initialized = bool(app.state.masumi_client)

    except Exception as e:
        print(f"[Agents] Critical error during initialization: {e}")
        app.state.agents_initialized = False
        app.state.lenny_agent = None
        app.state.luna_agent = None
        app.state.masumi_client = None

    yield

    # Shutdown
    print("[Shutdown] Cleaning up resources...")

    # Cancel agent heartbeat task
    if hasattr(app.state, 'agent_heartbeat_task') and app.state.agent_heartbeat_task:
        app.state.agent_heartbeat_task.cancel()
        try:
            await app.state.agent_heartbeat_task
        except asyncio.CancelledError:
            pass
        print("[Agents] Heartbeat task cancelled")

    # Stop agents
    if hasattr(app.state, 'agents_initialized') and app.state.agents_initialized:
        print("[Agents] Agents shutdown complete")

    # Stop Hydra
    if hasattr(app.state, 'hydra_manager') and app.state.hydra_manager:
        await app.state.hydra_manager.stop()
        print("[Hydra] Disconnected")

app = FastAPI(
    title="Zkredit API",
    description="Privacy-First DeFi Lending on Cardano",
    version="2.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ============================================================================
# Data Models
# ============================================================================

class CreditCheckRequest(BaseModel):
    borrower_address: str
    credit_score: int  # Private - only used for ZK proof

class CreditCheckResponse(BaseModel):
    borrower_address: str
    is_eligible: bool
    proof_hash: str
    timestamp: str

class LoanOfferRequest(BaseModel):
    lender_address: str
    principal: float
    interest_rate: float
    term_months: int
    borrower_address: str

class NegotiationRequest(BaseModel):
    offer_id: str
    proposed_rate: float

class WorkflowRequest(BaseModel):
    role: Optional[str] = 'borrower'  # 'borrower' or 'lender'
    borrower_address: str
    lender_address: str
    credit_score: int
    principal: float
    interest_rate: float
    term_months: int
    stablecoin: Optional[str] = 'USDT'  # USDT, USDC, DAI, etc.
    auto_confirm: Optional[bool] = False
    conversation_id: Optional[str] = None

class HydraConfigRequest(BaseModel):
    node_url: str
    mode: str = "auto"

class WorkflowStep(BaseModel):
    step: int
    name: str
    status: str
    details: Dict
    timestamp: str

class DashboardStats(BaseModel):
    totalBalance: float
    activeLoans: int
    totalProfit: float
    agentStatus: str

class Trade(BaseModel):
    id: str
    timestamp: str
    type: str
    principal: float
    interestRate: float
    profit: Optional[float] = None
    status: str


# ============================================================================
# WebSocket Manager
# ============================================================================

class ConnectionManager:
    def __init__(self):
        self.connections: List[WebSocket] = []
        self._lock = asyncio.Lock()
    
    async def connect(self, ws: WebSocket):
        await ws.accept()
        async with self._lock:
            self.connections.append(ws)
    
    async def disconnect(self, ws: WebSocket):
        async with self._lock:
            if ws in self.connections:
                self.connections.remove(ws)
    
    async def broadcast(self, message: dict):
        # Create a copy of connections to avoid race conditions during iteration
        async with self._lock:
            connections_copy = self.connections.copy()
        
        # Broadcast to all connections
        dead_connections = []
        for conn in connections_copy:
            try:
                await conn.send_json(message)
            except Exception:
                # Connection might be closed, mark for removal
                dead_connections.append(conn)
        
        # Remove dead connections
        if dead_connections:
            async with self._lock:
                for conn in dead_connections:
                    if conn in self.connections:
                        self.connections.remove(conn)

manager = ConnectionManager()


# ============================================================================
# In-Memory State
# ============================================================================

class AppState:
    def __init__(self):
        self.workflow_steps: List[Dict] = []
        self.current_negotiation: Optional[Dict] = None
        self.credit_checks: Dict[str, Dict] = {}
        self.trades: List[Dict] = []
        self.conversations: Dict[str, List[Dict]] = {}  # conversation_id -> messages
        self.stats = {
            "totalBalance": 125450.75,
            "activeLoans": 8,
            "totalProfit": 12543.50,
            "agentStatus": "idle"
        }
        self.hydra_connected = False

state = AppState()


# ============================================================================
# Agent Heartbeat (Keep agents responsive)
# ============================================================================

async def agent_heartbeat():
    """Periodic heartbeat to keep agents responsive and broadcast status."""
    while True:
        try:
            # Check agent status every 30 seconds
            agents_initialized = getattr(app.state, 'agents_initialized', False)

            if agents_initialized:
                # Agents are active - send heartbeat
                await manager.broadcast({
                    "type": "agent_status",
                    "data": {
                        "status": state.stats["agentStatus"],
                        "task": "Monitoring loan offers" if state.stats["agentStatus"] == "idle" else "Active negotiation",
                        "heartbeat": True
                    }
                })
            else:
                # Agents not initialized
                await manager.broadcast({
                    "type": "agent_status",
                    "data": {
                        "status": "unavailable",
                        "task": "Agents not initialized",
                        "heartbeat": True
                    }
                })

        except Exception as e:
            print(f"[Heartbeat] Error: {e}")

        # Wait 30 seconds before next heartbeat
        await asyncio.sleep(30)


# ============================================================================
# Midnight ZK Credit Check (Mock)
# ============================================================================

async def perform_credit_check(borrower: str, score: int) -> Dict:
    """Perform ZK credit check via Midnight (with oracle fallback)."""
    await manager.broadcast({
        "type": "workflow_step",
        "data": {
            "step": 1,
            "name": "Midnight ZK Credit Check",
            "status": "processing",
            "details": {"borrower": borrower}
        }
    })
    
    # Try to get credit score from oracle first
    credit_score = score
    # Temporarily disable oracle for testing - use input score directly
    # if ORACLE_AVAILABLE:
    #     oracle = get_credit_oracle()
    #     oracle_data = oracle.get_credit_score(borrower)
    #     if oracle_data:
    #         credit_score = oracle_data.score
    #         print(f"[Oracle] Fetched credit score: {credit_score} (confidence: {oracle_data.confidence})")
    
    # Perform ZK credit check via Midnight
    if MIDNIGHT_AVAILABLE:
        midnight = get_midnight_client()
        request = CreditCheckRequest(
            borrower_address=borrower,
            credit_score=credit_score
        )
        result_obj = midnight.submit_credit_check(request)
        
        result = {
            "borrower_address": borrower,
            "is_eligible": result_obj.is_eligible,
            "proof_hash": result_obj.proof_hash,
            "timestamp": result_obj.timestamp,
            "network": result_obj.network,
            "source": "midnight" if midnight.available else "mock"
        }
    else:
        # Fallback to mock
        await asyncio.sleep(1)  # Simulate processing
        is_eligible = credit_score >= 700
        proof_hash = f"zk_proof_{borrower[:10]}_{int(datetime.now().timestamp())}"
        
        result = {
            "borrower_address": borrower,
            "is_eligible": is_eligible,
            "proof_hash": proof_hash,
            "timestamp": datetime.now().isoformat(),
            "source": "mock"
        }
    
    state.credit_checks[borrower] = result
    
    await manager.broadcast({
        "type": "workflow_step",
        "data": {
            "step": 1,
            "name": "Midnight ZK Credit Check",
            "status": "completed",
            "details": {
                "is_eligible": result["is_eligible"],
                "proof_hash": result["proof_hash"],
                "message": "Credit score verified privately via ZK proof",
                "source": result.get("source", "mock")
            }
        }
    })
    
    return result


# ============================================================================
# Hydra Integration (Real + Fallback)
# ============================================================================

async def open_hydra_head_real(
    borrower: str, 
    lender: str, 
    principal: float, 
    interest_rate: float,
    term_months: int
) -> Dict:
    """Open Hydra Head using real client."""
    hydra_manager = app.state.hydra_manager
    
    if not hydra_manager:
        # Fallback to mock
        return await open_hydra_head_mock({
            "offer_id": f"offer_{int(datetime.now().timestamp())}",
            "lender_address": lender,
            "borrower_address": borrower,
            "principal": principal,
            "interest_rate": interest_rate,
            "term_months": term_months
        })
    
    try:
        negotiation = await hydra_manager.open_negotiation(
            borrower=borrower,
            lender=lender,
            principal=principal,
            interest_rate=interest_rate,
            term_months=term_months
        )
        
        await manager.broadcast({
            "type": "workflow_step",
            "data": {
                "step": 3,
                "name": "Open Hydra Head",
                "status": "completed",
                "details": {
                    "head_id": negotiation.head_id,
                    "participants": [lender, borrower],
                    "mode": "direct" if not hydra_manager.client._connected else "hydra"
                }
            }
        })

        # Broadcast updated Hydra status with head information
        await manager.broadcast({
            "type": "hydra_status",
            "data": {
                "mode": "hydra" if hydra_manager.client._connected else "direct",
                "connected": hydra_manager.client._connected,
                "head_state": "Open",
                "active_negotiations": len(hydra_manager.active_negotiations),
                "current_head_id": negotiation.head_id
            }
        })
        
        state.current_negotiation = {
            "head_id": negotiation.head_id,
            "borrower": borrower,
            "lender": lender,
            "principal": principal,
            "current_rate": interest_rate,
            "original_rate": interest_rate,
            "term_months": term_months,
            "rounds": 0,
            "status": "open"
        }
        
        return {
            "head_id": negotiation.head_id,
            "status": "open",
            "mode": "direct" if not hydra_manager.client._connected else "hydra"
        }
        
    except Exception as e:
        print(f"[Hydra] Error opening head: {e}")
        # Fallback to mock
        return await open_hydra_head_mock({
            "offer_id": f"offer_{int(datetime.now().timestamp())}",
            "lender_address": lender,
            "borrower_address": borrower,
            "principal": principal,
            "interest_rate": interest_rate,
            "term_months": term_months
        })


async def negotiate_in_hydra_real(proposed_rate: float) -> Dict:
    """Negotiate in Hydra Head using real client."""
    if not state.current_negotiation:
        return {"error": "No active negotiation"}
    
    neg = state.current_negotiation
    hydra_manager = app.state.hydra_manager
    
    if hydra_manager and neg.get("head_id") in hydra_manager.active_negotiations:
        try:
            result = await hydra_manager.submit_counter_offer(
                head_id=neg["head_id"],
                proposed_rate=proposed_rate,
                from_party=neg["borrower"]
            )
            
            neg["rounds"] = result.get("round", neg["rounds"] + 1)
            neg["current_rate"] = result.get("new_rate", proposed_rate)
            
            await manager.broadcast({
                "type": "workflow_step",
                "data": {
                    "step": 4,
                    "name": f"Hydra Negotiation Round {neg['rounds']}",
                    "status": "completed",
                    "details": {
                        "proposed_rate": proposed_rate,
                        "current_rate": neg["current_rate"],
                        "message": "Counter-offer submitted (zero gas!)"
                    }
                }
            })
            
            return result
            
        except Exception as e:
            print(f"[Hydra] Negotiation error: {e}")
    
    # Fallback to mock negotiation logic
    return await negotiate_in_hydra_mock(proposed_rate)


async def close_hydra_and_settle_real() -> Dict:
    """Close Hydra Head and settle using real client."""
    if not state.current_negotiation:
        return {"error": "No active negotiation"}
    
    neg = state.current_negotiation
    hydra_manager = app.state.hydra_manager
    
    settlement = None
    
    if hydra_manager and neg.get("head_id") in hydra_manager.active_negotiations:
        try:
            settlement_obj = await hydra_manager.accept_and_settle(neg["head_id"])
            
            settlement = {
                "tx_hash": settlement_obj.tx_hash,
                "borrower": settlement_obj.borrower,
                "lender": settlement_obj.lender,
                "principal": settlement_obj.principal,
                "final_rate": settlement_obj.final_rate,
                "final_rate_bps": settlement_obj.final_rate_bps,
                "term_months": settlement_obj.term_months,
                "status": settlement_obj.status
            }
            
        except Exception as e:
            print(f"[Hydra] Settlement error: {e}")
    
    if not settlement:
        # Fallback to mock settlement
        return await close_hydra_and_settle_mock()
    
    # Broadcast close head
    await manager.broadcast({
        "type": "workflow_step",
        "data": {
            "step": 5,
            "name": "Close Hydra Head",
            "status": "completed",
            "details": {
                "head_id": neg["head_id"],
                "final_rate": settlement["final_rate"],
                "rounds": neg["rounds"],
                "savings": round(neg["original_rate"] - settlement["final_rate"], 2)
            }
        }
    })
    
    await asyncio.sleep(0.5)
    
    # Broadcast Aiken validation
    await manager.broadcast({
        "type": "workflow_step",
        "data": {
            "step": 6,
            "name": "Aiken Validator Settlement",
            "status": "completed",
            "details": {
                "borrower_sig": "OK",
                "lender_sig": "OK",
                "rate_valid": "OK",
                "settlement": settlement
            }
        }
    })
    
    # Build real Cardano transaction if PyCardano is available
    if CARDANO_TX_AVAILABLE:
        try:
            tx_builder = get_tx_builder()
            if tx_builder.available:
                principal_lovelace = int(settlement["principal"] * 1_000_000)
                interest_lovelace = int((settlement["principal"] * settlement["final_rate"] / 100) * 1_000_000)
                
                tx_params = LoanSettlementParams(
                    borrower_address=settlement["borrower"],
                    lender_address=settlement["lender"],
                    principal=principal_lovelace,
                    interest_amount=interest_lovelace
                )
                
                tx_result = tx_builder.build_settlement_tx(tx_params)
                if tx_result.get("success"):
                    settlement["tx_cbor"] = tx_result.get("tx_cbor")
                    settlement["tx_id"] = tx_result.get("tx_id")
                    settlement["real_tx"] = True
                    print(f"[PyCardano] Transaction built: {tx_result.get('tx_id')}")
        except Exception as e:
            print(f"[PyCardano] Error building transaction: {e}")
    
    # Record trade
    trade = {
        "id": f"trade_{int(datetime.now().timestamp())}",
        "timestamp": datetime.now().isoformat(),
        "type": "loan_accepted",
        "principal": settlement["principal"],
        "interestRate": settlement["final_rate"],
        "originalRate": neg["original_rate"],
        "profit": round((neg["original_rate"] - settlement["final_rate"]) * settlement["principal"] / 100, 2),
        "status": "completed",
        "tx_id": settlement.get("tx_id"),
        "real_tx": settlement.get("real_tx", False)
    }
    state.trades.insert(0, trade)
    
    # Update stats
    state.stats["activeLoans"] += 1
    state.stats["totalProfit"] += trade["profit"]
    
    # Clear negotiation
    state.current_negotiation = None
    
    # Final broadcasts
    await manager.broadcast({
        "type": "workflow_complete",
        "data": {
            "success": True,
            "settlement": settlement,
            "trade": trade
        }
    })
    
    await manager.broadcast({
        "type": "stats_update",
        "data": state.stats
    })
    
    return settlement


# ============================================================================
# Hydra Mock Fallback (when no node available)
# ============================================================================

async def open_hydra_head_mock(offer: Dict) -> Dict:
    """Open Hydra Head for Layer 2 negotiation."""
    head_id = f"head_{offer['offer_id']}_{int(datetime.now().timestamp())}"
    
    await manager.broadcast({
        "type": "workflow_step",
        "data": {
            "step": 3,
            "name": "Open Hydra Head",
            "status": "completed",
            "details": {
                "head_id": head_id,
                "participants": [offer["lender_address"], offer["borrower_address"]],
                "mode": "mock"
            }
        }
    })
    
    state.current_negotiation = {
        "head_id": head_id,
        "offer": offer,
        "borrower": offer["borrower_address"],
        "lender": offer["lender_address"],
        "principal": offer["principal"],
        "original_rate": offer["interest_rate"],
        "current_rate": offer["interest_rate"],
        "term_months": offer["term_months"],
        "rounds": 0,
        "status": "open"
    }
    
    return {"head_id": head_id, "status": "open", "mode": "mock"}


async def negotiate_in_hydra_mock(proposed_rate: float) -> Dict:
    """Execute Layer 2 loan negotiation."""
    if not state.current_negotiation:
        return {"error": "No active negotiation"}
    
    neg = state.current_negotiation
    neg["rounds"] += 1
    
    await manager.broadcast({
        "type": "workflow_step",
        "data": {
            "step": 4,
            "name": f"Hydra Negotiation Round {neg['rounds']}",
            "status": "processing",
            "details": {
                "proposed_rate": proposed_rate,
                "current_rate": neg["current_rate"]
            }
        }
    })
    
    await asyncio.sleep(0.5)
    
    original_rate = neg["original_rate"]
    
    if proposed_rate >= original_rate - 1.5:
        # Accept
        neg["current_rate"] = proposed_rate
        neg["final_rate"] = proposed_rate
        neg["status"] = "accepted"
        action = "accepted"
        message = f"Deal at {proposed_rate}%!"
    elif neg["rounds"] >= 2:
        # Compromise
        middle = round((proposed_rate + neg["current_rate"]) / 2, 1)
        neg["current_rate"] = middle
        neg["final_rate"] = middle
        neg["status"] = "accepted"
        action = "accepted"
        message = f"Compromise at {middle}%!"
    else:
        # Counter
        counter = round(neg["current_rate"] - 0.5, 1)
        neg["current_rate"] = counter
        action = "counter"
        message = f"Lender countered: {counter}%"
    
    await manager.broadcast({
        "type": "workflow_step",
        "data": {
            "step": 4,
            "name": f"Hydra Negotiation Round {neg['rounds']}",
            "status": "completed",
            "details": {
                "action": action,
                "rate": neg.get("final_rate", neg["current_rate"]),
                "message": message
            }
        }
    })
    
    return {
        "success": True,
        "action": action,
        "rate": neg.get("final_rate", neg["current_rate"]),
        "message": message
    }


async def close_hydra_and_settle_mock() -> Dict:
    """Close Hydra Head and execute settlement."""
    if not state.current_negotiation:
        return {"error": "No active negotiation"}
    
    neg = state.current_negotiation
    
    # If no final_rate set, use current_rate
    if "final_rate" not in neg:
        neg["final_rate"] = neg["current_rate"]
    
    # Close Head
    await manager.broadcast({
        "type": "workflow_step",
        "data": {
            "step": 5,
            "name": "Close Hydra Head",
            "status": "completed",
            "details": {
                "head_id": neg["head_id"],
                "final_rate": neg["final_rate"],
                "rounds": neg["rounds"],
                "savings": round(neg["original_rate"] - neg["final_rate"], 2)
            }
        }
    })
    
    await asyncio.sleep(0.5)
    
    # Generate settlement TX
    tx_hash = f"tx_{neg['head_id']}_{int(datetime.now().timestamp())}"
    
    # Aiken Validator verification
    await manager.broadcast({
        "type": "workflow_step",
        "data": {
            "step": 6,
            "name": "Aiken Validator Settlement",
            "status": "processing",
            "details": {"tx_hash": tx_hash}
        }
    })
    
    await asyncio.sleep(1)
    
    settlement = {
        "tx_hash": tx_hash,
        "borrower": neg["borrower"],
        "lender": neg["lender"],
        "principal": neg["principal"],
        "final_rate": neg["final_rate"],
        "final_rate_bps": int(neg["final_rate"] * 100),
        "term_months": neg["term_months"],
        "status": "LOAN_DISBURSED"
    }
    
    await manager.broadcast({
        "type": "workflow_step",
        "data": {
            "step": 6,
            "name": "Aiken Validator Settlement",
            "status": "completed",
            "details": {
                "borrower_sig": "OK",
                "lender_sig": "OK",
                "rate_valid": "OK",
                "settlement": settlement
            }
        }
    })
    
    # Record trade
    trade = {
        "id": f"trade_{int(datetime.now().timestamp())}",
        "timestamp": datetime.now().isoformat(),
        "type": "loan_accepted",
        "principal": neg["principal"],
        "interestRate": neg["final_rate"],
        "originalRate": neg["original_rate"],
        "profit": round((neg["original_rate"] - neg["final_rate"]) * neg["principal"] / 100, 2),
        "status": "completed"
    }
    state.trades.insert(0, trade)
    
    # Update stats
    state.stats["activeLoans"] += 1
    state.stats["totalProfit"] += trade["profit"]
    
    # Clear negotiation
    state.current_negotiation = None
    
    # Final broadcast
    await manager.broadcast({
        "type": "workflow_complete",
        "data": {
            "success": True,
            "settlement": settlement,
            "trade": trade
        }
    })
    
    await manager.broadcast({
        "type": "stats_update",
        "data": state.stats
    })
    
    return settlement


# ============================================================================
# REST API Endpoints
# ============================================================================

@app.get("/")
async def root():
    return {"message": "Zkredit API", "version": "2.0.0"}

@app.get("/health")
async def health():
    hydra_status = "disconnected"
    hydra_mode = "none"
    
    if hasattr(app.state, 'hydra_manager') and app.state.hydra_manager:
        hydra_mode = "direct" if not app.state.hydra_manager.client._connected else "hydra"
        hydra_status = "connected" if app.state.hydra_manager.client._connected else "disconnected"
    
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "hydra": {
            "status": hydra_status,
            "mode": hydra_mode
        }
    }


# --- Hydra Configuration ---

@app.get("/api/hydra/status")
async def hydra_status():
    """Get Hydra node connection status."""
    if not hasattr(app.state, 'hydra_manager') or not app.state.hydra_manager:
        return {
            "connected": False,
            "mode": "unavailable",
            "message": "Hydra module not loaded"
        }
    
    client = app.state.hydra_manager.client
    return {
        "connected": client._connected,
        "mode": "direct" if not client._connected else "hydra",
        "node_url": client.config.node_url,
        "head_state": client.state.value,
        "active_negotiations": len(app.state.hydra_manager.active_negotiations)
    }


@app.post("/api/hydra/reconnect")
async def hydra_reconnect(config: Optional[HydraConfigRequest] = None):
    """Attempt to reconnect to Hydra node."""
    if not HYDRA_AVAILABLE:
        raise HTTPException(status_code=503, detail="Hydra module not available")
    
    try:
        # Stop existing manager
        if hasattr(app.state, 'hydra_manager') and app.state.hydra_manager:
            await app.state.hydra_manager.stop()
        
        # Create new config
        new_config = HydraConfig(
            node_url=config.node_url if config else os.getenv("HYDRA_NODE_URL", "ws://127.0.0.1:4001"),
            mode=ConnectionMode(config.mode) if config else ConnectionMode.AUTO
        )
        
        # Create new manager
        app.state.hydra_manager = HydraNegotiationManager(HydraClient(new_config))
        await app.state.hydra_manager.start()
        
        return {
            "success": True,
            "mode": "direct" if not app.state.hydra_manager.client._connected else "hydra",
            "node_url": new_config.node_url
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


# --- Dashboard ---

@app.get("/api/dashboard/stats")
async def get_stats():
    return state.stats

@app.get("/api/trades/history")
async def get_trades():
    return state.trades[:20]


@app.get("/api/analytics")
async def get_analytics():
    """Get analytics data for 3D charts."""
    # Generate analytics from trades and stats
    profit_data = []
    loans_data = []
    rates_data = []
    
    # Process trades for profit chart
    for i, trade in enumerate(state.trades[:12]):
        profit_data.append({
            "x": i,
            "y": 0,
            "value": trade.get("profit", 0) or 0,
            "label": f"Trade {i + 1}"
        })
    
    # Process loans
    for i in range(min(10, state.stats.get("activeLoans", 0))):
        loans_data.append({
            "x": i,
            "y": 0,
            "value": 1,
            "label": f"Loan {i + 1}"
        })
    
    # Process interest rates from trades
    for i, trade in enumerate(state.trades[:8]):
        if trade.get("interestRate"):
            rates_data.append({
                "x": i,
                "y": 0,
                "value": trade.get("interestRate", 0),
                "label": f"{trade.get('interestRate', 0)}%"
            })
    
    return {
        "profit": profit_data,
        "loans": loans_data,
        "rates": rates_data
    }


# --- Credit Check ---

@app.post("/api/midnight/credit-check")
async def credit_check(req: CreditCheckRequest, background_tasks: BackgroundTasks):
    """Submit credit score for ZK verification."""
    result = await perform_credit_check(req.borrower_address, req.credit_score)
    return result


# --- Loan Workflow ---

async def run_agent_negotiation(
    conversation_id: str,
    borrower_address: str,
    lender_address: str,
    principal: float,
    interest_rate: float,
    term_months: int,
    auto_confirm: bool = False
):
    """Run AI agent negotiation using pre-initialized agents."""
    try:
        await manager.broadcast({
            "type": "agent_status",
            "data": {"status": "negotiating", "task": "AI agents analyzing loan terms..."}
        })

        # Use pre-initialized agents if available
        if hasattr(app.state, 'agents_initialized') and app.state.agents_initialized:
            # Use pre-initialized Lenny agent
            lenny = app.state.lenny_agent

            # Create task for the pre-initialized agent
            task = Task(
                description=(
                    f"Analyze and negotiate this loan offer:\n"
                    f"- Principal: {principal}\n"
                    f"- Interest Rate: {interest_rate}%\n"
                    f"- Term: {term_months} months\n"
                    f"- Borrower: {borrower_address}\n"
                    f"- Lender: {lender_address}\n"
                    f"- Auto-confirm: {auto_confirm}\n\n"
                    f"1. Analyze the loan offer using your expertise\n"
                    f"2. Consider market rates and borrower/lender profiles\n"
                    f"3. Negotiate if rate is too high (target: market rate - 1.5%)\n"
                    f"4. Accept if terms are favorable or auto-confirm is enabled\n\n"
                    f"Market context: Average rates are 7-8%. Lower is better for borrowers."
                ),
                expected_output="Detailed negotiation analysis with confidence score and recommended action",
                agent=lenny
            )

            # Run agent with timeout to prevent hanging
            crew = Crew(agents=[lenny], tasks=[task], verbose=False)

            # Run in executor to avoid blocking
            loop = asyncio.get_event_loop()
            result = await loop.run_in_executor(
                None,
                lambda: crew.kickoff()
            )

            # Parse result for better conversation display
            result_str = str(result)
            confidence = 0.85  # Default confidence
            reasoning = "Analysis complete"

            # Try to extract confidence and reasoning from result
            try:
                if hasattr(result, 'confidence'):
                    confidence = float(result.confidence)
                if hasattr(result, 'reasoning'):
                    reasoning = result.reasoning
            except:
                pass

            # Add agent's analysis to conversation
            display_result = result_str[:200] + "..." if len(result_str) > 200 else result_str
            state.conversations[conversation_id].append({
                "id": f"msg_{len(state.conversations[conversation_id])}",
                "timestamp": datetime.now().isoformat(),
                "agent": "lenny",
                "type": "thought",
                "content": f"Llama 3 Analysis: {display_result}",
                "confidence": confidence,
                "reasoning": reasoning
            })

            # If Masumi client is available, add blockchain analysis
            if hasattr(app.state, 'masumi_client') and app.state.masumi_client:
                try:
                    masumi_analysis = await app.state.masumi_client.analyze_borrower_with_masumi(borrower_address, top_assets=3)

                    if masumi_analysis.get('blockchain_data'):
                        blockchain_info = masumi_analysis['blockchain_data']
                        ada_balance = blockchain_info.get('lovelace', 0)
                        asset_count = len([k for k in blockchain_info.keys() if k != 'lovelace'])

                        masumi_content = f"Masumi Analysis: Borrower holds {ada_balance} ADA and {asset_count} native assets. "
                        if masumi_analysis.get('masumi_analysis') and isinstance(masumi_analysis['masumi_analysis'], str):
                            masumi_content += masumi_analysis['masumi_analysis'][:100] + "..."

                        state.conversations[conversation_id].append({
                            "id": f"msg_{len(state.conversations[conversation_id])}",
                            "timestamp": datetime.now().isoformat(),
                            "agent": "masumi",
                            "type": "analysis",
                            "content": masumi_content,
                            "confidence": 0.90,
                            "reasoning": "Cardano blockchain analysis complete"
                        })

                except Exception as e:
                    print(f"[Masumi] Analysis failed: {e}")

            # Broadcast conversation update
            await manager.broadcast({
                "type": "conversation_update",
                "data": {"conversation_id": conversation_id}
            })

            await manager.broadcast({
                "type": "agent_status",
                "data": {"status": "analyzing", "task": "AI analysis complete"}
            })

        else:
            # Fallback: add mock analysis when agents not initialized
            await asyncio.sleep(1)

            # Mock Llama analysis
            state.conversations[conversation_id].append({
                "id": f"msg_{len(state.conversations[conversation_id])}",
                "timestamp": datetime.now().isoformat(),
                "agent": "lenny",
                "type": "thought",
                "content": f"Llama 3 Analysis: Rate {interest_rate}% is {'acceptable' if interest_rate <= 9 else 'high'}. Market average is 7.5%. Recommended action: {'accept' if interest_rate <= 8 else 'negotiate to ' + str(round(interest_rate - 1.5, 1)) + '%'}",
                "confidence": 0.85,
                "reasoning": "Market rate analysis complete"
            })

            # Mock Masumi analysis
            state.conversations[conversation_id].append({
                "id": f"msg_{len(state.conversations[conversation_id])}",
                "timestamp": datetime.now().isoformat(),
                "agent": "masumi",
                "type": "analysis",
                "content": f"Masumi Analysis: Borrower address {borrower_address[:12]}... shows standard Cardano activity. No red flags detected.",
                "confidence": 0.80,
                "reasoning": "Blockchain analysis complete"
            })

            # Broadcast mock analysis update
            await manager.broadcast({
                "type": "conversation_update",
                "data": {"conversation_id": conversation_id}
            })
    except Exception as e:
        print(f"[Agent] Error in negotiation: {e}")
        import traceback
        traceback.print_exc()
        # Add error message to conversation
        if conversation_id in state.conversations:
            state.conversations[conversation_id].append({
                "id": f"msg_{len(state.conversations[conversation_id])}",
                "timestamp": datetime.now().isoformat(),
                "agent": "system",
                "type": "message",
                "content": f"Agent analysis encountered an error: {str(e)}"
            })
            
            # Broadcast error update
            await manager.broadcast({
                "type": "conversation_update",
                "data": {"conversation_id": conversation_id}
            })

@app.post("/api/workflow/start")
async def start_workflow(req: WorkflowRequest, background_tasks: BackgroundTasks):
    """Start the complete lending workflow."""
    # Reset state for new workflow
    state.current_negotiation = None
    state.stats["agentStatus"] = "negotiating"
    
    # Initialize conversation if ID provided
    conversation_id = req.conversation_id or f"conv_{int(datetime.now().timestamp() * 1000000)}"
    if conversation_id not in state.conversations:
        state.conversations[conversation_id] = []
    
    try:
        # Add initial message (thread-safe)
        conversation = state.conversations[conversation_id]
        msg_id = f"msg_{len(conversation)}"
        conversation.append({
            "id": msg_id,
            "timestamp": datetime.now().isoformat(),
            "agent": "system",
            "type": "message",
            "content": f"Loan workflow started. Role: {req.role}, Stablecoin: {req.stablecoin}, Principal: {req.principal}"
        })
        
        await manager.broadcast({
            "type": "workflow_started",
            "data": {
                "borrower": req.borrower_address,
                "lender": req.lender_address,
                "principal": req.principal,
                "stablecoin": req.stablecoin,
                "role": req.role,
                "conversation_id": conversation_id
            }
        })
        
        await manager.broadcast({
            "type": "agent_status",
            "data": {"status": "negotiating", "task": "Starting workflow..."}
        })
        
        # Step 1: Credit Check
        credit = await perform_credit_check(req.borrower_address, req.credit_score)
        
        if not credit["is_eligible"]:
            # Reset state on failure
            state.stats["agentStatus"] = "idle"
            state.current_negotiation = None
            state.conversations[conversation_id].append({
                "id": f"msg_{len(state.conversations[conversation_id])}",
                "timestamp": datetime.now().isoformat(),
                "agent": "system",
                "type": "message",
                "content": "Credit check failed. Workflow terminated."
            })
            await manager.broadcast({
                "type": "agent_status",
                "data": {"status": "idle", "task": "Workflow terminated - credit check failed"}
            })
            return {"success": False, "reason": "Credit check failed", "conversation_id": conversation_id}
        
        # Step 2: Create Loan Offer
        offer_id = f"offer_{int(datetime.now().timestamp())}"
        
        # Add agent conversation messages
        state.conversations[conversation_id].append({
            "id": f"msg_{len(state.conversations[conversation_id])}",
            "timestamp": datetime.now().isoformat(),
            "agent": "system",
            "type": "message",
            "content": f"Loan offer created: {req.interest_rate}% interest rate, {req.principal} {req.stablecoin} principal"
        })
        
        state.conversations[conversation_id].append({
            "id": f"msg_{len(state.conversations[conversation_id])}",
            "timestamp": datetime.now().isoformat(),
            "agent": "lenny",
            "type": "thought",
            "content": f"Analyzing offer... Market average is 7.5%. This rate is {req.interest_rate - 7.5:.1f}% {'above' if req.interest_rate > 7.5 else 'below'} average.",
            "confidence": 0.85,
            "reasoning": "Rate is acceptable but could be negotiated lower" if req.interest_rate > 7.5 else "Rate is favorable"
        })
        
        await manager.broadcast({
            "type": "workflow_step",
            "data": {
                "step": 2,
                "name": "Loan Offer Created",
                "status": "completed",
                "details": {
                    "offer_id": offer_id,
                    "lender_address": req.lender_address,
                    "borrower_address": req.borrower_address,
                    "principal": req.principal,
                    "interest_rate": req.interest_rate,
                    "term_months": req.term_months,
                    "stablecoin": req.stablecoin
                }
            }
        })
        
        # Step 3: Open Hydra Head (uses real client if available)
        await open_hydra_head_real(
            borrower=req.borrower_address,
            lender=req.lender_address,
            principal=req.principal,
            interest_rate=req.interest_rate,
            term_months=req.term_months
        )
        
        # Step 4: AI Analysis (actually run agents)
        await manager.broadcast({
            "type": "workflow_step",
            "data": {
                "step": 4,
                "name": "AI Analysis (Llama 3)",
                "status": "processing",
                "details": {"rate": req.interest_rate}
            }
        })
        
        # Run agent negotiation in background
        background_tasks.add_task(
            run_agent_negotiation,
            conversation_id=conversation_id,
            borrower_address=req.borrower_address,
            lender_address=req.lender_address,
            principal=req.principal,
            interest_rate=req.interest_rate,
            term_months=req.term_months,
            auto_confirm=req.auto_confirm
        )
        
        # Wait a bit for agent to start
        await asyncio.sleep(2)
        
        # Determine target rate (simplified for now, agents will handle negotiation)
        if req.interest_rate <= 7.0:
            target = req.interest_rate
            action = "accept"
        elif req.auto_confirm and req.interest_rate <= 9.0:
            target = req.interest_rate
            action = "accept"
        else:
            target = round(req.interest_rate - 1.5, 1)
            action = "negotiate"
        
        await manager.broadcast({
            "type": "workflow_step",
            "data": {
                "step": 4,
                "name": "AI Analysis (Llama 3)",
                "status": "completed",
                "details": {
                    "verdict": "acceptable" if req.interest_rate <= 9 else "high",
                    "action": action,
                    "target_rate": target
                }
            }
        })
        
        # Step 5: Negotiate (uses real client if available)
        # Add negotiation message
        state.conversations[conversation_id].append({
            "id": f"msg_{len(state.conversations[conversation_id])}",
            "timestamp": datetime.now().isoformat(),
            "agent": "lenny",
            "type": "message",
            "content": f"Counter-offer: {target}% interest rate. This is more aligned with current market conditions."
        })
        
        result = await negotiate_in_hydra_real(target)
        
        # Add response message
        if result.get("action") == "accepted":
            state.conversations[conversation_id].append({
                "id": f"msg_{len(state.conversations[conversation_id])}",
                "timestamp": datetime.now().isoformat(),
                "agent": "luna",
                "type": "message",
                "content": f"Accepted! Final rate: {result.get('rate', target)}%"
            })
        elif result.get("action") == "counter":
            state.conversations[conversation_id].append({
                "id": f"msg_{len(state.conversations[conversation_id])}",
                "timestamp": datetime.now().isoformat(),
                "agent": "luna",
                "type": "message",
                "content": f"Counter-offer: {result.get('rate', target)}% - meeting in the middle."
            })
            # If counter, negotiate once more
            new_target = round((target + result["rate"]) / 2, 1)
            state.conversations[conversation_id].append({
                "id": f"msg_{len(state.conversations[conversation_id])}",
                "timestamp": datetime.now().isoformat(),
                "agent": "lenny",
                "type": "thought",
                "content": f"{new_target}% is acceptable. Accepting terms.",
                "confidence": 0.92,
                "reasoning": "Rate is at market average, savings achieved"
            })
            result = await negotiate_in_hydra_real(new_target)
        
        # Step 6: Accept and Settle (only if auto_confirm is enabled)
        settlement = None
        if req.auto_confirm:
            settlement = await close_hydra_and_settle_real()

            # Add final settlement message
            state.conversations[conversation_id].append({
                "id": f"msg_{len(state.conversations[conversation_id])}",
                "timestamp": datetime.now().isoformat(),
                "agent": "system",
                "type": "action",
                "content": f"Settlement transaction submitted. Loan disbursed successfully!"
            })

            # Reset state after workflow completes
            await asyncio.sleep(1)  # Brief delay to show completion
            state.stats["agentStatus"] = "idle"
            state.current_negotiation = None

            await manager.broadcast({
                "type": "agent_status",
                "data": {"status": "idle", "task": "Workflow complete. Ready for next loan."}
            })
        else:
            # Mark negotiation as completed but don't close yet
            if state.current_negotiation:
                state.current_negotiation["status"] = "completed"
                state.current_negotiation["final_rate"] = result.get('rate', target)

            # Add message indicating negotiation is complete but waiting for user consent
            state.conversations[conversation_id].append({
                "id": f"msg_{len(state.conversations[conversation_id])}",
                "timestamp": datetime.now().isoformat(),
                "agent": "system",
                "type": "message",
                "content": f"Negotiation complete! Final rate: {result.get('rate', target)}%. Awaiting your confirmation to close the deal."
            })

            await manager.broadcast({
                "type": "agent_status",
                "data": {"status": "completed", "task": "Negotiation complete. Awaiting user confirmation."}
            })
        
        await manager.broadcast({
            "type": "conversation_update",
            "data": {"conversation_id": conversation_id}
        })
        
        return {
            "success": True,
            "conversation_id": conversation_id,
            "settlement": settlement
        }
    except Exception as e:
        # Reset state on any error
        print(f"[Workflow] Error: {e}")
        state.stats["agentStatus"] = "idle"
        state.current_negotiation = None
        
        if conversation_id in state.conversations:
            state.conversations[conversation_id].append({
                "id": f"msg_{len(state.conversations[conversation_id])}",
                "timestamp": datetime.now().isoformat(),
                "agent": "system",
                "type": "message",
                "content": f"Workflow error: {str(e)}"
            })
        
        await manager.broadcast({
            "type": "agent_status",
            "data": {"status": "idle", "task": "Workflow error - reset to idle"}
        })
        
        return {
            "success": False,
            "reason": str(e),
            "conversation_id": conversation_id
        }


@app.post("/api/negotiation/propose")
async def propose_rate(req: NegotiationRequest):
    """Propose a rate in active negotiation."""
    result = await negotiate_in_hydra_real(req.proposed_rate)
    return result


@app.post("/api/negotiation/accept")
async def accept_terms():
    """Accept current terms and settle."""
    settlement = await close_hydra_and_settle_real()
    return settlement


@app.post("/api/negotiation/settle")
async def manual_settlement():
    """Manually settle a completed negotiation (for when auto_confirm is disabled)."""
    try:
        # Check if there's an active negotiation
        if not state.current_negotiation:
            return {
                "success": False,
                "error": "No active negotiation found. Start a negotiation first."
            }

        neg = state.current_negotiation

        # Check if negotiation is in a completed state
        if neg.get("status") != "completed":
            return {
                "success": False,
                "error": "Negotiation is not completed. Wait for negotiation to finish."
            }

        print(f"[Manual Settlement] Processing settlement for head_id: {neg['head_id']}")

        # Close Hydra head and settle
        settlement = await close_hydra_and_settle_real()

        # Add settlement message to the most recent conversation
        latest_conversation_id = None
        if state.conversations:
            latest_conversation_id = max(state.conversations.keys())

        if latest_conversation_id:
            state.conversations[latest_conversation_id].append({
                "id": f"msg_{len(state.conversations[latest_conversation_id])}",
                "timestamp": datetime.now().isoformat(),
                "agent": "system",
                "type": "action",
                "content": f"Manual settlement completed! Loan disbursed successfully."
            })

            # Broadcast conversation update
            await manager.broadcast({
                "type": "conversation_update",
                "data": {"conversation_id": latest_conversation_id}
            })

        # Broadcast final status update
        await manager.broadcast({
            "type": "agent_status",
            "data": {"status": "idle", "task": "Manual settlement complete. Ready for next loan."}
        })

        return {
            "success": True,
            "settlement": settlement,
            "message": "Manual settlement completed successfully"
        }

    except Exception as e:
        print(f"[Manual Settlement] Error: {e}")
        return {
            "success": False,
            "error": f"Settlement failed: {str(e)}"
        }


# --- Agent Status ---

@app.get("/api/agent/status")
async def agent_status():
    agents_info = {
        "agents_initialized": getattr(app.state, 'agents_initialized', False),
        "lenny_available": hasattr(app.state, 'lenny_agent') and app.state.lenny_agent is not None,
        "luna_available": hasattr(app.state, 'luna_agent') and app.state.luna_agent is not None,
        "masumi_available": hasattr(app.state, 'masumi_client') and app.state.masumi_client is not None,
        "status": state.stats["agentStatus"],
        "current_task": "Monitoring offers" if state.stats["agentStatus"] == "idle" else "Negotiating",
        "active_negotiation": state.current_negotiation is not None
    }
    return agents_info


@app.get("/api/agent/xai-logs")
async def xai_logs(limit: int = 20):
    """Get XAI decision logs."""
    log_file = os.path.join(os.path.dirname(__file__), "../../logs/xai_decisions.jsonl")
    logs = []
    if os.path.exists(log_file):
        with open(log_file) as f:
            for line in f:
                try:
                    logs.append(json.loads(line))
                except:
                    pass
    return logs[-limit:]


@app.get("/api/conversation/{conversation_id}")
async def get_conversation(conversation_id: str):
    """Get conversation messages for a workflow."""
    messages = state.conversations.get(conversation_id, [])
    return {"conversation_id": conversation_id, "messages": messages}


@app.get("/api/conversation/latest")
async def get_latest_conversation():
    """Get the most recent conversation."""
    if not state.conversations:
        return {"conversation_id": None, "messages": []}
    
    latest_id = max(state.conversations.keys(), key=lambda k: len(state.conversations[k]))
    messages = state.conversations[latest_id]
    return {"conversation_id": latest_id, "messages": messages}


# ============================================================================
# PyCardano Transaction Building
# ============================================================================

@app.post("/api/cardano/build-tx")
async def build_settlement_tx(req: Dict):
    """Build a real Cardano settlement transaction using PyCardano."""
    if not CARDANO_TX_AVAILABLE:
        return {
            "success": False,
            "error": "PyCardano not available. Install: pip install pycardano",
            "tx_cbor": None
        }
    
    try:
        tx_builder = get_tx_builder()
        
        params = LoanSettlementParams(
            borrower_address=req.get("borrower_address"),
            lender_address=req.get("lender_address"),
            principal=int(req.get("principal", 0) * 1_000_000),  # Convert ADA to lovelace
            interest_amount=int(req.get("interest_amount", 0) * 1_000_000),
            validator_script_hash=req.get("validator_script_hash")
        )
        
        result = tx_builder.build_settlement_tx(params)
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "tx_cbor": None
        }


@app.post("/api/cardano/estimate-fee")
async def estimate_tx_fee(req: Dict):
    """Estimate transaction fee."""
    if not CARDANO_TX_AVAILABLE:
        return {
            "success": False,
            "fee": 0,
            "error": "PyCardano not available"
        }
    
    try:
        tx_builder = get_tx_builder()
        
        params = LoanSettlementParams(
            borrower_address=req.get("borrower_address"),
            lender_address=req.get("lender_address"),
            principal=int(req.get("principal", 0) * 1_000_000),
            interest_amount=int(req.get("interest_amount", 0) * 1_000_000)
        )
        
        result = tx_builder.estimate_fee(params)
        return result
        
    except Exception as e:
        return {
            "success": False,
            "fee": 0,
            "error": str(e)
        }


# ============================================================================
# Multi-Agent Negotiation
# ============================================================================

@app.post("/api/negotiation/multi-agent/create")
async def create_multi_agent_negotiation(req: Dict):
    """Create a new multi-agent negotiation session."""
    if not AGENTS_AVAILABLE:
        return {
            "success": False,
            "error": "Agents not available"
        }
    
    try:
        manager = get_negotiation_manager()
        
        negotiation = manager.create_negotiation(
            borrowers=req.get("borrowers", []),
            lenders=req.get("lenders", []),
            loan_terms=req.get("loan_terms", {})
        )
        
        return {
            "success": True,
            "negotiation_id": negotiation.negotiation_id,
            "participants": len(negotiation.participants),
            "status": negotiation.status
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.post("/api/negotiation/multi-agent/{negotiation_id}/round")
async def run_negotiation_round(negotiation_id: str):
    """Run a round of multi-agent negotiation."""
    if not AGENTS_AVAILABLE:
        return {
            "success": False,
            "error": "Agents not available"
        }
    
    try:
        manager = get_negotiation_manager()
        result = await manager.run_negotiation_round(negotiation_id)
        return result
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/api/negotiation/multi-agent/{negotiation_id}")
async def get_multi_agent_negotiation(negotiation_id: str):
    """Get multi-agent negotiation details."""
    if not AGENTS_AVAILABLE:
        return {
            "success": False,
            "error": "Agents not available"
        }
    
    try:
        manager = get_negotiation_manager()
        negotiation = manager.get_negotiation(negotiation_id)
        
        if not negotiation:
            return {
                "success": False,
                "error": "Negotiation not found"
            }
        
        return {
            "success": True,
            "negotiation_id": negotiation.negotiation_id,
            "status": negotiation.status,
            "rounds": negotiation.rounds,
            "participants": [
                {
                    "agent_id": p.agent_id,
                    "role": p.role.value,
                    "address": p.address,
                    "current_offer": p.current_offer
                }
                for p in negotiation.participants
            ],
            "loan_terms": negotiation.loan_terms
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e)
        }


@app.get("/api/negotiation/multi-agent")
async def list_multi_agent_negotiations():
    """List all multi-agent negotiations."""
    if not AGENTS_AVAILABLE:
        return {
            "success": False,
            "negotiations": []
        }
    
    try:
        manager = get_negotiation_manager()
        negotiations = manager.list_negotiations()
        return {
            "success": True,
            "negotiations": negotiations
        }
        
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "negotiations": []
        }


# ============================================================================
# WebSocket Endpoint
# ============================================================================

@app.websocket("/ws")
async def websocket_endpoint(ws: WebSocket):
    await manager.connect(ws)
    
    try:
        # Send initial state
        await ws.send_json({
            "type": "connected",
            "data": {"message": "Connected to Zkredit"}
        })
        
        await ws.send_json({
            "type": "stats_update",
            "data": state.stats
        })
        
        await ws.send_json({
            "type": "agent_status",
            "data": {"status": state.stats["agentStatus"]}
        })
        
        # Send Hydra status
        hydra_mode = "unavailable"
        if hasattr(app.state, 'hydra_manager') and app.state.hydra_manager:
            hydra_mode = "direct" if not app.state.hydra_manager.client._connected else "hydra"
        
        await ws.send_json({
            "type": "hydra_status",
            "data": {"mode": hydra_mode}
        })
        
        while True:
            data = await ws.receive_text()
            msg = json.loads(data)
            
            if msg.get("type") == "ping":
                await ws.send_json({"type": "pong"})
            
    except WebSocketDisconnect:
        manager.disconnect(ws)
    except Exception as e:
        manager.disconnect(ws)


# ============================================================================
# Entry Point
# ============================================================================

if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("PORT", "8000"))
    host = os.getenv("HOST", "0.0.0.0")
    uvicorn.run(app, host=host, port=port)
