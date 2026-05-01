"""
Zkredit - Hydra Integration Module

Provides WebSocket client for Cardano Hydra Head Protocol.
Supports both real Hydra nodes and mock mode for development.
"""

from .head_manager import (
    HydraClient,
    HydraNegotiationManager,
    HydraConfig,
    ConnectionMode,
    HeadState,
    UTxO,
    NegotiationState,
    Settlement,
    run_demo_negotiation,
)

__all__ = [
    "HydraClient",
    "HydraNegotiationManager", 
    "HydraConfig",
    "ConnectionMode",
    "HeadState",
    "UTxO",
    "NegotiationState",
    "Settlement",
    "run_demo_negotiation",
]
