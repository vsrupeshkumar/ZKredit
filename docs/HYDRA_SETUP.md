# Hydra Node Setup Guide

This guide explains how to connect Zkredit to an actual Cardano Hydra node for real off-chain negotiations.

## Overview

Hydra is Cardano's Layer 2 scaling solution that enables:
- **Zero gas fees** for off-chain transactions
- **Instant finality** (no waiting for blocks)
- **Private state** (only participants see transactions)

Zkredit uses Hydra Heads for loan negotiations - multiple rounds of offers/counter-offers happen off-chain for free!

## Quick Start (Mock Mode)

By default, Zkredit runs in **mock mode** if no Hydra node is available:

```bash
# Start backend (will use mock Hydra)
cd backend/api
uvicorn server:app --port 8000

# Check Hydra status
curl http://localhost:8000/api/hydra/status
# Response: {"connected": true, "mode": "mock", ...}
```

Mock mode simulates all Hydra operations - perfect for development and demos.

---

## Connecting to a Real Hydra Node

### Option 1: Local Hydra Node (Recommended for Testing)

#### Prerequisites

1. **Cardano Node** - You need a running Cardano node
2. **Hydra Node** - The Hydra Head protocol node

#### Step 1: Install Hydra

```bash
# Using Nix (recommended)
nix develop github:input-output-hk/hydra

# Or download pre-built binaries
# https://github.com/input-output-hk/hydra/releases
```

#### Step 2: Generate Keys

```bash
# Generate Hydra signing key
hydra-tools gen-hydra-key --output-file hydra.sk

# Generate Cardano signing key (if you don't have one)
cardano-cli address key-gen \
  --signing-key-file cardano.sk \
  --verification-key-file cardano.vk
```

#### Step 3: Start Hydra Node

```bash
hydra-node \
  --node-id 1 \
  --api-host 127.0.0.1 \
  --api-port 4001 \
  --host 0.0.0.0 \
  --port 5001 \
  --hydra-signing-key hydra.sk \
  --cardano-signing-key cardano.sk \
  --cardano-verification-key cardano.vk \
  --ledger-protocol-parameters protocol-parameters.json \
  --testnet-magic 1 \
  --node-socket /path/to/node.socket \
  --persistence-dir ./hydra-state
```

#### Step 4: Connect Zkredit

```bash
# Set environment variable
export HYDRA_NODE_URL=ws://127.0.0.1:4001

# Or configure via API
curl -X POST http://localhost:8000/api/hydra/reconnect \
  -H "Content-Type: application/json" \
  -d '{"node_url": "ws://127.0.0.1:4001", "mode": "real"}'
```

---

### Option 2: Hydra for Payments Demo

For a simpler setup, use the Hydra for Payments demo:

```bash
# Clone hydra-pay
git clone https://github.com/input-output-hk/hydra
cd hydra/demo

# Start with docker
docker-compose up
```

The demo provides a pre-configured Hydra setup with multiple nodes.

---

### Option 3: Preview/Preprod Testnet

Connect to Cardano testnets for more realistic testing:

```bash
# Preview testnet
export CARDANO_NODE_SOCKET_PATH=/path/to/preview/node.socket
export CARDANO_TESTNET_MAGIC=2

# Preprod testnet  
export CARDANO_NODE_SOCKET_PATH=/path/to/preprod/node.socket
export CARDANO_TESTNET_MAGIC=1
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `HYDRA_NODE_URL` | `ws://127.0.0.1:4001` | WebSocket URL of Hydra node |
| `HYDRA_MODE` | `auto` | Connection mode: `auto`, `real`, `mock` |
| `HYDRA_TIMEOUT` | `10.0` | Connection timeout in seconds |

### Mode Descriptions

- **auto** - Try to connect to real node, fall back to mock if unavailable
- **real** - Only use real node, fail if unavailable
- **mock** - Always use mock mode (no real Hydra connection)

---

## API Endpoints

### Check Hydra Status

```bash
GET /api/hydra/status

# Response
{
  "connected": true,
  "mode": "real",  # or "mock"
  "node_url": "ws://127.0.0.1:4001",
  "head_state": "Idle",
  "active_negotiations": 0
}
```

### Reconnect to Node

```bash
POST /api/hydra/reconnect
Content-Type: application/json

{
  "node_url": "ws://192.168.1.100:4001",
  "mode": "real"
}

# Response
{
  "success": true,
  "mode": "real",
  "node_url": "ws://192.168.1.100:4001"
}
```

---

## Hydra Protocol Messages

Zkredit's Hydra client handles these messages:

### Client -> Node (Commands)

| Command | Description |
|---------|-------------|
| `Init` | Initialize a new Head |
| `Commit` | Commit UTxOs to the Head |
| `NewTx` | Submit off-chain transaction |
| `Close` | Close the Head |
| `Fanout` | Distribute funds to L1 |
| `GetUTxO` | Query current UTxO set |

### Node -> Client (Events)

| Event | Description |
|-------|-------------|
| `HeadIsInitializing` | Head initialization started |
| `Committed` | Participant committed funds |
| `HeadIsOpen` | Head is ready for transactions |
| `TxValid` | Transaction confirmed in Head |
| `HeadIsClosed` | Head closed, contestation started |
| `ReadyToFanout` | Contestation period over |
| `HeadIsFinalized` | Funds distributed to L1 |

---

## Workflow with Real Hydra

When connected to a real Hydra node:

```
1. Borrower requests loan
   ↓
2. Midnight ZK credit check (off-chain)
   ↓
3. Open Hydra Head (on-chain, ~20 ADA)
   ├── Init transaction submitted
   ├── Both parties commit funds
   └── HeadIsOpen event received
   ↓
4. Negotiate in Head (off-chain, FREE!)
   ├── AI agent proposes rate
   ├── Counter-offers exchanged
   └── Agreement reached
   ↓
5. Close Head (on-chain, ~2 ADA)
   ├── Close transaction submitted
   ├── Contestation period (60s default)
   └── ReadyToFanout event
   ↓
6. Fanout & Settlement (on-chain, ~2 ADA)
   └── Funds distributed per final state
```

**Total on-chain cost: ~24 ADA** (vs potentially unlimited for on-chain negotiation)

---

## Troubleshooting

### Connection Refused

```
Error: Connection refused at ws://127.0.0.1:4001
```

**Solution**: Ensure Hydra node is running and accessible:
```bash
# Check if port is open
nc -zv 127.0.0.1 4001

# Check Hydra node logs
journalctl -u hydra-node -f
```

### Timeout

```
Error: Connection timed out after 10.0 seconds
```

**Solution**: Increase timeout or check network:
```bash
export HYDRA_TIMEOUT=30.0
```

### Head Already Open

```
Error: Head already exists
```

**Solution**: Close existing head or use a different node-id:
```bash
hydra-node --node-id 2 ...
```

---

## Multi-Party Setup

For production, you need multiple Hydra nodes (one per participant):

### Borrower Node
```bash
hydra-node \
  --node-id borrower \
  --peer lender:5001 \
  ...
```

### Lender Node
```bash
hydra-node \
  --node-id lender \
  --peer borrower:5001 \
  ...
```

Both nodes must be online to open a Head.

---

## Resources

- [Hydra Head Protocol](https://hydra.family/head-protocol/)
- [Hydra GitHub](https://github.com/input-output-hk/hydra)
- [Hydra Specification](https://hydra.family/head-protocol/core-concepts/specification)
- [Hydra API Reference](https://hydra.family/head-protocol/api-reference)

---

## Security Considerations

1. **Private Keys** - Never expose signing keys
2. **Contestation Period** - Set appropriate duration (60s for testing, longer for production)
3. **UTxO Management** - Track committed UTxOs carefully
4. **Peer Verification** - Verify peer identities before opening Heads

