# Midnight Network ZK Proofs

## Overview

Zkredit uses Midnight Network's zero-knowledge proof technology to verify borrower credit scores while maintaining complete privacy. Credit scores are never revealed on-chain or to other parties.

## Key Benefits

- **Privacy Preservation**: Credit scores remain completely hidden
- **Trust Minimization**: No need to trust third parties with sensitive data
- **Mathematical Proofs**: Cryptographic guarantees of eligibility
- **On-Chain Verification**: ZK proofs can be verified by smart contracts

## How It Works

### ZK Proof Generation

1. Borrower submits credit score to Midnight network (private input)
2. Midnight generates zero-knowledge proof of eligibility
3. Only the proof and eligibility boolean are returned
4. Credit score itself is never exposed

### Circuit Logic

```compact
circuit check_eligibility(private credit_score: Uint) -> (public is_eligible: Boolean) {
  const MIN_CREDIT_SCORE: Uint = 700;
  is_eligible = credit_score > MIN_CREDIT_SCORE;
  return (is_eligible);
}
```

## Integration Points

### Client Implementation

Located in `backend/midnight/` directory:
- `zk_client.py` - Main ZK proof client
- `__init__.py` - Package initialization

Compiled contracts in `midnight/`:
- `credit_score.compact` - ZK circuit definition

### API Usage

```python
from backend.midnight.zk_client import MidnightZKClient

client = MidnightZKClient()
result = client.submit_credit_check(
    request=MidnightZKClient.CreditCheckRequest(
        borrower_address="addr1_...",
        credit_score=750
    )
)

# Returns: is_eligible=True, proof_hash="...", borrower_address="..."
# Note: credit_score is NEVER in the result
```

## Configuration

### Environment Variables

```env
MIDNIGHT_API_URL=https://api.midnight.network  # API endpoint
MIDNIGHT_API_KEY=your_api_key                  # Optional authentication
```

### Network Options

- `mainnet` - Production Midnight network
- `testnet` - Development/test network (default)

## Privacy Guarantees

### What Stays Private

- **Credit Score**: Never revealed to lender or on-chain
- **Personal Data**: No PII required or stored
- **Transaction History**: Not accessed by the protocol

### What's Public

- **Eligibility Boolean**: True/False based on threshold
- **ZK Proof**: Cryptographic proof of correctness
- **Borrower Address**: Required for loan association

## Development

### Local Processing

When Midnight network is unavailable:

```python
# Client automatically falls back to local ZK processing
client = MidnightZKClient()
result = client.submit_credit_check(request)
# Returns locally generated proof with correct eligibility
```

### Testing ZK Circuits

```bash
# Test circuit compilation
cd contracts
aiken check

# Verify ZK proof generation
cd backend/midnight
python -c "from zk_client import *; test_credit_check()"
```

## Security Considerations

- **Circuit Correctness**: ZK circuit must accurately implement eligibility rules
- **Proof Verification**: Smart contracts must verify ZK proofs
- **Threshold Management**: Credit score minimums should be configurable
- **Network Security**: Relies on Midnight network's security guarantees

## Integration with Lending

### Credit Check Flow

1. Borrower initiates loan request
2. Midnight ZK client generates eligibility proof
3. Lender receives only: `is_eligible: true/false`
4. If eligible, AI negotiation begins
5. Final settlement verifies ZK proof on-chain

### Smart Contract Verification

Aiken validators can verify ZK proofs:

```aiken
validator {
  fn verify_credit_eligibility(proof: ZKProof, context: ScriptContext) -> Bool {
    // Verify ZK proof cryptographically
    verify_zk_proof(proof, public_inputs)
  }
}
```

## Resources

- [Midnight Network Documentation](https://midnight.network/)
- [Zero-Knowledge Proofs](https://en.wikipedia.org/wiki/Zero-knowledge_proof)
- [Compact Language Reference](https://midnight.network/docs/compact)
- [Privacy-Preserving Credit Scoring](https://arxiv.org/abs/2107.00008)
