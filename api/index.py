"""
Vercel Serverless Function - Deployable API surface for Zkredit.

This module intentionally avoids heavy AI/chain dependencies so it remains
within Vercel serverless constraints while still serving the frontend with
predictable API behavior.
"""

from __future__ import annotations

import threading
from datetime import datetime, timezone
from typing import Any, Dict, List, Literal, Optional

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


app = FastAPI(
    title="Zkredit API (Vercel Mode)",
    description="Deployable API for Vercel with lightweight workflow simulation.",
    version="2.1.0",
)


# In production this is same-origin with the frontend, but permissive CORS
# keeps preview environments and custom domains working smoothly.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


class HealthResponse(BaseModel):
    status: str
    mode: str
    message: str


class StatsResponse(BaseModel):
    totalBalance: float
    activeLoans: int
    totalProfit: float
    agentStatus: str


class WorkflowRequest(BaseModel):
    role: Literal["borrower", "lender"] = "borrower"
    borrower_address: str
    lender_address: str
    credit_score: int = Field(default=750, ge=300, le=850)
    principal: float = Field(gt=0)
    interest_rate: float = Field(gt=0, le=100)
    term_months: int = Field(ge=1, le=60)
    stablecoin: str = "USDT"
    auto_confirm: bool = False
    conversation_id: Optional[str] = None


class NegotiationRequest(BaseModel):
    proposed_rate: float = Field(gt=0, le=100)


_state_lock = threading.Lock()
_state: Dict[str, Any] = {
    "stats": {
        "totalBalance": 125450.75,
        "activeLoans": 0,
        "totalProfit": 0.0,
        "agentStatus": "idle",
    },
    "trades": [],
    "conversations": {},
    "conversation_touched": {},
    "latest_conversation_id": None,
    "xai_logs": [],
    "pending_settlement": None,
}


def _append_message(
    conversation_id: str,
    agent: str,
    message_type: str,
    content: str,
    confidence: Optional[float] = None,
    reasoning: Optional[str] = None,
) -> Dict[str, Any]:
    messages = _state["conversations"].setdefault(conversation_id, [])
    message = {
        "id": f"msg_{len(messages) + 1}",
        "timestamp": utc_now_iso(),
        "agent": agent,
        "type": message_type,
        "content": content,
    }
    if confidence is not None:
        message["confidence"] = confidence
    if reasoning:
        message["reasoning"] = reasoning

    messages.append(message)
    _state["conversation_touched"][conversation_id] = message["timestamp"]
    _state["latest_conversation_id"] = conversation_id
    return message


def _append_xai_log(agent: str, decision: str, reasoning: str, confidence: float) -> None:
    _state["xai_logs"].append(
        {
            "timestamp": int(datetime.now(timezone.utc).timestamp() * 1000),
            "agent": agent,
            "decision": decision,
            "reasoning": reasoning,
            "confidence": max(0.0, min(confidence, 1.0)),
        }
    )


def _derive_final_rate(initial_rate: float) -> float:
    if initial_rate <= 7.0:
        return round(initial_rate, 1)
    if initial_rate <= 10.0:
        return round(max(5.0, initial_rate - 1.5), 1)
    return round(max(5.0, initial_rate - 2.0), 1)


def _build_trade(
    principal: float,
    original_rate: float,
    final_rate: float,
    stablecoin: str,
) -> Dict[str, Any]:
    savings = max(original_rate - final_rate, 0.0)
    profit = round((savings * principal) / 100.0, 2)

    trade = {
        "id": f"trade_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
        "timestamp": utc_now_iso(),
        "type": "loan_accepted",
        "principal": principal,
        "interestRate": final_rate,
        "originalRate": original_rate,
        "profit": profit,
        "status": "completed",
        "stablecoin": stablecoin,
    }

    _state["trades"].insert(0, trade)
    _state["stats"]["activeLoans"] += 1
    _state["stats"]["totalProfit"] = round(_state["stats"]["totalProfit"] + profit, 2)
    _state["stats"]["agentStatus"] = "profiting"
    return trade


@app.get("/")
async def root() -> Dict[str, Any]:
    return {
        "message": "Zkredit API",
        "status": "vercel_mode",
        "version": "2.1.0",
        "mode": "lightweight",
        "endpoints": {
            "health": "/health",
            "stats": "/api/dashboard/stats",
            "workflow": "/api/workflow/start",
            "conversation_latest": "/api/conversation/latest",
            "docs": "/docs",
        },
    }


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(
        status="healthy",
        mode="vercel",
        message="API is running in deployable Vercel mode.",
    )


@app.get("/api/dashboard/stats", response_model=StatsResponse)
async def get_stats() -> StatsResponse:
    with _state_lock:
        stats = dict(_state["stats"])
    return StatsResponse(**stats)


@app.get("/api/trades/history")
async def get_trades() -> List[Dict[str, Any]]:
    with _state_lock:
        return list(_state["trades"][:20])


@app.get("/api/analytics")
async def get_analytics() -> Dict[str, List[Dict[str, Any]]]:
    with _state_lock:
        trades = list(_state["trades"][:12])
        active_loans = int(_state["stats"].get("activeLoans", 0))

    profit_data: List[Dict[str, Any]] = []
    loans_data: List[Dict[str, Any]] = []
    rates_data: List[Dict[str, Any]] = []

    for idx, trade in enumerate(trades):
        profit_data.append(
            {
                "x": idx,
                "y": 0,
                "value": float(trade.get("profit", 0) or 0),
                "label": f"Trade {idx + 1}",
            }
        )
        rates_data.append(
            {
                "x": idx,
                "y": 0,
                "value": float(trade.get("interestRate", 0) or 0),
                "label": f"{float(trade.get('interestRate', 0) or 0):.1f}%",
            }
        )

    for idx in range(min(active_loans, 10)):
        loans_data.append({"x": idx, "y": 0, "value": 1, "label": f"Loan {idx + 1}"})

    return {
        "profit": profit_data,
        "loans": loans_data,
        "rates": rates_data,
    }


@app.get("/api/agent/status")
async def agent_status() -> Dict[str, Any]:
    with _state_lock:
        pending = _state["pending_settlement"] is not None
        status = _state["stats"]["agentStatus"]

    return {
        "agents_initialized": True,
        "lenny_available": True,
        "luna_available": True,
        "masumi_available": True,
        "status": status,
        "current_task": "Awaiting manual settlement" if pending else "Monitoring opportunities",
        "active_negotiation": pending,
    }


@app.get("/api/agent/xai-logs")
async def xai_logs(limit: int = 20) -> List[Dict[str, Any]]:
    if limit < 1:
        limit = 1
    if limit > 100:
        limit = 100

    with _state_lock:
        return list(_state["xai_logs"][-limit:])


@app.get("/api/conversation/latest")
async def get_latest_conversation() -> Dict[str, Any]:
    with _state_lock:
        conversation_id = _state["latest_conversation_id"]
        if not conversation_id:
            return {"conversation_id": None, "messages": []}

        messages = list(_state["conversations"].get(conversation_id, []))

    return {"conversation_id": conversation_id, "messages": messages}


@app.get("/api/conversation/{conversation_id}")
async def get_conversation(conversation_id: str) -> Dict[str, Any]:
    with _state_lock:
        messages = list(_state["conversations"].get(conversation_id, []))

    return {"conversation_id": conversation_id, "messages": messages}


@app.post("/api/workflow/start")
async def start_workflow(req: WorkflowRequest) -> Dict[str, Any]:
    conversation_id = req.conversation_id or f"conv_{int(datetime.now(timezone.utc).timestamp() * 1000000)}"
    final_rate = _derive_final_rate(req.interest_rate)

    with _state_lock:
        _state["stats"]["agentStatus"] = "negotiating"

        _append_message(
            conversation_id,
            "system",
            "message",
            (
                f"Workflow started for {req.principal:.2f} {req.stablecoin}. "
                f"Initial rate {req.interest_rate:.1f}% for {req.term_months} months."
            ),
        )

        _append_message(
            conversation_id,
            "lenny",
            "thought",
            (
                f"Analyzing offer at {req.interest_rate:.1f}%. "
                f"Credit score is {req.credit_score}; target negotiation rate {final_rate:.1f}%."
            ),
            confidence=0.88,
            reasoning="Rate benchmarking against protocol average and borrower quality.",
        )

        if final_rate < req.interest_rate:
            _append_message(
                conversation_id,
                "lenny",
                "message",
                f"Counter-offer submitted: {final_rate:.1f}% for stronger borrower alignment.",
            )
            _append_message(
                conversation_id,
                "luna",
                "message",
                f"Accepted at {final_rate:.1f}%. Terms balance risk and liquidity utilization.",
            )
        else:
            _append_message(
                conversation_id,
                "luna",
                "message",
                f"Original rate {req.interest_rate:.1f}% accepted as market-competitive.",
            )

        _append_message(
            conversation_id,
            "masumi",
            "analysis",
            "On-chain borrower footprint scanned. No critical risk flags detected.",
            confidence=0.84,
            reasoning="Lightweight Cardano activity profile check completed.",
        )

        _append_xai_log(
            "lenny",
            "counter_offer" if final_rate < req.interest_rate else "accept_offer",
            (
                f"Optimized from {req.interest_rate:.1f}% to {final_rate:.1f}% based on score {req.credit_score}."
            ),
            0.88,
        )
        _append_xai_log(
            "luna",
            "accept_terms",
            "Accepted based on negotiated spread and repayment horizon.",
            0.81,
        )

        settlement: Optional[Dict[str, Any]] = None
        if req.auto_confirm:
            trade = _build_trade(req.principal, req.interest_rate, final_rate, req.stablecoin)
            settlement = {
                "tx_hash": f"tx_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
                "principal": req.principal,
                "final_rate": final_rate,
                "status": "LOAN_DISBURSED",
            }
            _state["pending_settlement"] = None
            _append_message(
                conversation_id,
                "system",
                "action",
                "Settlement finalized automatically. Loan disbursed.",
            )
        else:
            _state["pending_settlement"] = {
                "conversation_id": conversation_id,
                "principal": req.principal,
                "stablecoin": req.stablecoin,
                "original_rate": req.interest_rate,
                "final_rate": final_rate,
                "borrower_address": req.borrower_address,
                "lender_address": req.lender_address,
                "term_months": req.term_months,
            }
            _state["stats"]["agentStatus"] = "idle"
            _append_message(
                conversation_id,
                "system",
                "message",
                (
                    f"Negotiation complete at {final_rate:.1f}%. "
                    "Awaiting user confirmation for final settlement."
                ),
            )

    response: Dict[str, Any] = {
        "success": True,
        "conversation_id": conversation_id,
        "final_rate": final_rate,
        "mode": "auto_confirm" if req.auto_confirm else "manual_confirm",
    }

    if req.auto_confirm and settlement is not None:
        response["settlement"] = settlement
        response["trade"] = trade

    return response


@app.post("/api/negotiation/propose")
async def propose_rate(req: NegotiationRequest) -> Dict[str, Any]:
    with _state_lock:
        pending = _state["pending_settlement"]
        if not pending:
            raise HTTPException(status_code=404, detail="No active negotiation")

        current_rate = float(pending["final_rate"])
        proposed = req.proposed_rate
        blended = round((current_rate + proposed) / 2.0, 1)
        pending["final_rate"] = blended

        _append_message(
            pending["conversation_id"],
            "luna",
            "message",
            f"Updated counter-offer: {blended:.1f}% after new proposal.",
        )

    return {
        "success": True,
        "action": "counter",
        "rate": blended,
        "message": "Counter-offer recorded",
    }


@app.post("/api/negotiation/accept")
async def accept_terms() -> Dict[str, Any]:
    return await manual_settlement()


@app.post("/api/negotiation/settle")
async def manual_settlement() -> Dict[str, Any]:
    with _state_lock:
        pending = _state["pending_settlement"]
        if not pending:
            return {
                "success": False,
                "error": "No active negotiation found. Start a workflow first.",
            }

        trade = _build_trade(
            principal=float(pending["principal"]),
            original_rate=float(pending["original_rate"]),
            final_rate=float(pending["final_rate"]),
            stablecoin=str(pending["stablecoin"]),
        )

        settlement = {
            "tx_hash": f"tx_{int(datetime.now(timezone.utc).timestamp() * 1000)}",
            "borrower": pending["borrower_address"],
            "lender": pending["lender_address"],
            "principal": pending["principal"],
            "final_rate": pending["final_rate"],
            "term_months": pending["term_months"],
            "status": "LOAN_DISBURSED",
        }

        _append_message(
            pending["conversation_id"],
            "system",
            "action",
            "Manual settlement completed. Loan disbursed successfully.",
        )
        _state["pending_settlement"] = None

    return {
        "success": True,
        "settlement": settlement,
        "trade": trade,
        "message": "Manual settlement completed successfully",
    }


@app.get("/api/hydra/status")
async def hydra_status() -> Dict[str, Any]:
    with _state_lock:
        pending = _state["pending_settlement"] is not None

    return {
        "connected": False,
        "mode": "minimal",
        "head_state": "Open" if pending else "Idle",
        "active_negotiations": 1 if pending else 0,
    }


@app.get("/api/loans/offers")
async def get_loan_offers() -> List[Dict[str, Any]]:
    with _state_lock:
        pending = _state["pending_settlement"]

    if not pending:
        return []

    return [
        {
            "id": f"offer_{int(datetime.now(timezone.utc).timestamp())}",
            "lender_address": pending["lender_address"],
            "principal": pending["principal"],
            "initial_interest_rate": pending["original_rate"],
            "term_months": pending["term_months"],
            "offered_at": utc_now_iso(),
        }
    ]


@app.get("/ws")
async def websocket_unavailable() -> Dict[str, str]:
    return {
        "message": (
            "WebSocket is not available in Vercel serverless mode. "
            "Use polling endpoints instead."
        )
    }


# Export for Vercel
handler = app
