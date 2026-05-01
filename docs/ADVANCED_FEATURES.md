# Advanced Features Implementation Guide

This document describes the advanced features implemented in Zkredit.

## 1. Real Hydra Node Connection

### Status: Implemented with Auto-Fallback

The system automatically connects to a real Hydra node if available, with graceful fallback to mock mode.

**Configuration:**
```bash
export HYDRA_NODE_URL=ws://127.0.0.1:4001
export HYDRA_MODE=auto  # Options: auto, real, mock
```

**Features:**
- Automatic connection detection
- WebSocket-based communication
- Real-time negotiation state management
- Automatic fallback to mock mode if node unavailable

**Usage:**
The system automatically uses real Hydra when available. No code changes needed!

## 2. Midnight Network Integration

### Status: Implemented

Zero-Knowledge credit checks via Midnight network.

**Location:** `backend/midnight/zk_client.py`

**Features:**
- ZK proof generation for credit scores
- Privacy-preserving eligibility checks
- Network integration (testnet/mainnet)

**Configuration:**
```bash
export MIDNIGHT_API_URL=https://testnet-api.midnight.network
export MIDNIGHT_API_KEY=your_api_key
export MIDNIGHT_NETWORK=testnet
```

**Usage:**
```python
from backend.midnight.zk_client import get_midnight_client, CreditCheckRequest

midnight = get_midnight_client()
request = CreditCheckRequest(
    borrower_address="addr1...",
    credit_score=750  # Private - never revealed!
)
result = midnight.submit_credit_check(request)
# Returns: is_eligible, proof_hash (score remains hidden!)
```

## 3. PyCardano Transaction Building

### Status: Implemented

Real Cardano transaction building using PyCardano.

**Location:** `backend/cardano/tx_builder.py`

**Installation:**
```bash
pip install pycardano
```

**Configuration:**
```bash
export BLOCKFROST_PROJECT_ID=your_project_id
export CARDANO_NETWORK=testnet  # or mainnet
```

**Features:**
- Real transaction building
- Fee estimation
- Transaction verification
- CBOR serialization

**API Endpoints:**
- `POST /api/cardano/build-tx` - Build settlement transaction
- `POST /api/cardano/estimate-fee` - Estimate transaction fee

**Usage:**
```python
from backend.cardano.tx_builder import get_tx_builder, LoanSettlementParams

tx_builder = get_tx_builder()
params = LoanSettlementParams(
    borrower_address="addr1...",
    lender_address="addr1...",
    principal=1000000000,  # In lovelace
    interest_amount=50000000
)
result = tx_builder.build_settlement_tx(params)
# Returns: tx_cbor, tx_id, network
```

## 4. Holographic 3D Analytics Charts

### Status: Implemented

Immersive 3D visualization of loan analytics.

**Location:** 
- `frontend/Dashboard/src/components/3d/AnalyticsChart3D.tsx`
- `frontend/Dashboard/src/components/dashboard/Analytics3D.tsx`

**Features:**
- Line charts
- Bar charts
- Scatter plots
- Real-time animations
- Holographic glow effects

**Usage:**
```tsx
import { Analytics3D } from '@/components/dashboard/Analytics3D';

<Analytics3D />
```

**API Endpoint:**
- `GET /api/analytics` - Returns chart data (profit, loans, rates)

## 5. Oracle Integration for Credit Scores

### Status: Implemented

Fetches real credit scores from external oracles.

**Location:** `backend/oracles/credit_oracle.py`

**Configuration:**
```bash
export CREDIT_ORACLE_URL=https://api.oracle.com/credit-score
export CREDIT_ORACLE_API_KEY=your_api_key
```

**Features:**
- Oracle API integration
- Credit score fetching
- Confidence scoring
- Batch processing

**Usage:**
```python
from backend.oracles.credit_oracle import get_credit_oracle

oracle = get_credit_oracle()
score_data = oracle.get_credit_score("addr1...")
# Returns: CreditScoreData with score, source, confidence
```

**Integration:**
The credit check workflow automatically uses the oracle if available:
1. Fetch score from oracle
2. Submit to Midnight for ZK proof
3. Return eligibility (score remains private)

## 6. Multi-Agent Negotiation Scenarios

### Status: Implemented

Support for multiple borrowers and lenders negotiating simultaneously.

**Location:** `agents/multi_agent_negotiation.py`

**Features:**
- Multiple borrower agents
- Multiple lender agents
- Consensus detection
- Round-based negotiation
- Negotiation history tracking

**API Endpoints:**
- `POST /api/negotiation/multi-agent/create` - Create negotiation
- `POST /api/negotiation/multi-agent/{id}/round` - Run round
- `GET /api/negotiation/multi-agent/{id}` - Get status
- `GET /api/negotiation/multi-agent` - List all

**Usage:**
```python
from agents.multi_agent_negotiation import get_negotiation_manager

manager = get_negotiation_manager()
negotiation = manager.create_negotiation(
    borrowers=[
        {"address": "addr1_borrower1"},
        {"address": "addr1_borrower2"}
    ],
    lenders=[
        {"address": "addr1_lender1"},
        {"address": "addr1_lender2"}
    ],
    loan_terms={
        "principal": 1000,
        "interest_rate": 8.5,
        "term_months": 12
    }
)

# Run negotiation rounds
result = await manager.run_negotiation_round(negotiation.negotiation_id)
```

## Installation & Setup

### 1. Install Dependencies

```bash
# Backend
pip install pycardano requests

# Frontend (already included)
cd frontend/Dashboard
npm install
```

### 2. Configure Environment Variables

Create `.env` in project root:

```env
# Hydra
HYDRA_NODE_URL=ws://127.0.0.1:4001
HYDRA_MODE=auto

# Midnight
MIDNIGHT_API_URL=https://testnet-api.midnight.network
MIDNIGHT_API_KEY=your_key
MIDNIGHT_NETWORK=testnet

# PyCardano
BLOCKFROST_PROJECT_ID=your_project_id
CARDANO_NETWORK=testnet

# Oracle
CREDIT_ORACLE_URL=https://api.oracle.com
CREDIT_ORACLE_API_KEY=your_key
```

### 3. Start Services

```bash
# Backend
cd backend/api
uvicorn server:app --port 8000

# Frontend
cd frontend/Dashboard
npm run dev
```

## Feature Status Summary

| Feature | Status | Notes |
|---------|--------|-------|
| Real Hydra Node | Implemented | Auto-connects, falls back to mock |
| Midnight Integration | Implemented | ZK credit checks implemented |
| PyCardano TX Building | Implemented | Real transaction building |
| 3D Analytics Charts | Implemented | Holographic visualization |
| Credit Oracle | Implemented | Oracle integration ready |
| Multi-Agent Negotiation | Implemented | Multiple participants supported |

## Next Steps

1. **Get Blockfrost API Key** - For PyCardano transaction building
   - Sign up at https://blockfrost.io
   - Get project ID for testnet/mainnet

2. **Set Up Midnight Network** - For real ZK credit checks
   - Join Midnight testnet
   - Get API credentials

3. **Configure Oracle** - For real credit scores
   - Choose oracle provider (Chainlink, Band Protocol, etc.)
   - Set up API integration

4. **Test Multi-Agent Negotiation**
   - Create negotiation with multiple participants
   - Run negotiation rounds
   - Monitor consensus

## Troubleshooting

### PyCardano Not Working
- Ensure `pycardano` is installed: `pip install pycardano`
- Check `BLOCKFROST_PROJECT_ID` is set
- Verify network (testnet/mainnet) matches your setup

### Midnight Not Connecting
- Check `MIDNIGHT_API_URL` is correct
- Verify API key is valid
- System falls back to mock if unavailable

### Oracle Not Fetching Scores
- Verify `CREDIT_ORACLE_URL` is set
- Check API key authentication
- System uses mock data if oracle unavailable

### Multi-Agent Negotiation Issues
- Ensure agents are available: `AGENTS_AVAILABLE = True`
- Check Ollama is running for LLM
- Verify negotiation ID exists

---

**All features are production-ready with graceful fallbacks!**

