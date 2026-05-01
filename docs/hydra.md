# Hydra Head Protocol Integration

## Overview

Zkredit uses the Hydra Head Protocol for Layer 2 scaling on Cardano, enabling zero-gas off-chain loan negotiations between AI agents.

## Key Benefits

- **Zero Gas Fees**: All negotiation happens off-chain
- **Instant Finality**: No waiting for block confirmations
- **Privacy**: Only participants see transaction details
- **Scalability**: Handle multiple concurrent negotiations

## Architecture

Hydra Heads provide isolated execution environments where:
- Borrower and lender agents negotiate loan terms
- Multiple offer/counter-offer rounds occur instantly
- Final agreement triggers on-chain settlement
- Only the final outcome is recorded on Layer 1

## Integration Points

### Client Implementation

Located in `hydra/` directory:
- `head_manager.py` - Core Hydra client and negotiation manager
- `integrated_client.py` - Combined Hydra + Masumi integration
- `keys/` - Hydra signing keys management

### Workflow States

1. **Init** - Create new Hydra Head (~20 ADA cost)
2. **Commit** - Both parties commit funds to the Head
3. **Open** - Head becomes active for off-chain transactions
4. **Negotiate** - AI agents exchange offers (free)
5. **Close** - Final agreement reached
6. **Fanout** - Distribute funds to Layer 1 (~2 ADA)

## Configuration

### Environment Variables

```env
HYDRA_NODE_URL=ws://127.0.0.1:4001  # Hydra node WebSocket URL
HYDRA_MODE=auto                      # auto, hydra, or direct
HYDRA_TIMEOUT=10.0                   # Connection timeout
```

### Mode Options

- `auto` - Try Hydra Layer 2, fallback to direct
- `hydra` - Only use Hydra Layer 2 node
- `direct` - Always use direct Cardano transactions

## Usage in Zkredit

### Automatic Fallback

The system automatically detects Hydra availability:
- If Hydra Layer 2 available: Use zero-fee negotiations
- If not available: Use direct Cardano transactions
- All functionality works seamlessly in both modes

### Negotiation Flow

```python
from hydra.integrated_client import IntegratedHydraMasumiClient

client = IntegratedHydraMasumiClient()
result = await client.negotiate_loan(
    borrower_address="addr1_...",
    lender_address="addr1_...",
    principal=1000,
    initial_rate=8.5
)
```

## Security Considerations

- **Contestation Period**: Configurable time window for dispute resolution
- **Dual Signatures**: Both parties must sign final settlement
- **UTxO Management**: Careful tracking of committed funds
- **Peer Verification**: Validate counterparty identities

## Development

### Running with Direct Mode

```bash
# Backend automatically uses direct mode when no Hydra node available
cd backend/api
uvicorn server:app --port 8000
```

### Connecting to Real Hydra

1. Install Hydra node
2. Generate signing keys
3. Configure environment variables
4. Restart Zkredit services

## Resources

- [Hydra Head Protocol Specification](https://hydra.family/head-protocol/core-concepts/specification)
- [Hydra API Reference](https://hydra.family/head-protocol/api-reference)
- [Cardano Layer 2 Scaling](https://docs.cardano.org/explore-cardano/cardano-layer-2-scaling-solutions/)
