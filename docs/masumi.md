# Masumi AI Agent System

## Overview

Masumi is Zkredit's specialized Cardano blockchain analysis agent, built with CrewAI. It provides intelligent analysis of borrower addresses, asset holdings, and market conditions to inform lending decisions.

## Key Capabilities

- **Address Analysis**: Deep inspection of Cardano wallet holdings
- **Asset Intelligence**: Token registry lookups and metadata analysis
- **Risk Assessment**: Portfolio diversification and liquidity evaluation
- **Market Context**: Real-time Cardano ecosystem insights

## Agent Architecture

### Crew Composition

Masumi consists of three specialized agents:

#### 1. Researcher
- **Role**: Senior Cryptocurrency Researcher
- **Function**: Gathers raw blockchain data using Kupo API
- **Tools**: KupoTool for address balance queries
- **Output**: Complete asset holdings with exact amounts

#### 2. Token Registry Analyst
- **Role**: Cardano Token Registry Specialist
- **Function**: Maps asset IDs to human-readable token names
- **Tools**: TokenRegistryTool for metadata lookups
- **Output**: Enhanced asset list with proper token names

#### 3. Reporting Analyst
- **Role**: Cryptocurrency Reporting Analyst
- **Function**: Creates structured JSON reports with insights
- **Tools**: Analysis and reasoning capabilities
- **Output**: Final ReportResult with commentary

## Integration Points

### Core Components

Located in `agents/masumi/` directory:
- `crew.py` - Main CrewAI orchestration
- `main.py` - Execution entry point
- `config/` - Agent and task configurations
- `tools/` - Kupo and Token Registry tools
- `models/` - Data structures and report formats

### Tools Used

#### KupoTool
- **Purpose**: Query Cardano addresses for native assets
- **API**: Connects to Kupo indexer service
- **Features**: Unspent UTxO analysis, lovelace tracking
- **Limits**: Configurable top asset filtering

#### TokenRegistryTool
- **Purpose**: Convert asset IDs to token names
- **API**: Cardano Token Registry service
- **Features**: Metadata lookup, ticker resolution
- **Batch Processing**: Up to 10 assets per request

## Usage in Zkredit

### Automatic Analysis

Masumi runs automatically during loan workflows:

```python
from agents.masumi.crew import DegenCrew

crew = DegenCrew()
result = crew.crew().kickoff(inputs={
    'addresses': ['addr1_borrower...', 'addr1_lender...']
})
```

### Analysis Output

Returns structured JSON with:
- **Asset Holdings**: Complete token balances
- **Token Names**: Human-readable identifiers
- **Risk Commentary**: AI-generated insights
- **Confidence Scores**: Analysis reliability metrics

## Configuration

### Environment Variables

```env
KUPO_BASE_URL=https://kupo-preprod.kupo.network  # Kupo indexer URL
TOKEN_REGISTRY_URL=https://tokens.cardano.org    # Registry API
```

### Task Configuration

Defined in `config/tasks.yaml`:
- `research_task`: Raw data collection
- `token_registry_task`: Name resolution
- `reporting_task`: Final analysis and reporting

## Agent Workflow

### Sequential Processing

1. **Research Phase**
   - Query borrower address via Kupo
   - Extract all native assets and amounts
   - Filter top holdings (configurable)

2. **Registry Phase**
   - Look up asset metadata
   - Replace IDs with token names
   - Handle missing metadata gracefully

3. **Reporting Phase**
   - Analyze portfolio composition
   - Generate risk insights
   - Create structured JSON output

### Example Output

```json
{
  "addresses": [
    {
      "address": "addr1_...",
      "assets": [
        {"name": "ADA", "amount": 1000000},
        {"name": "DJED", "amount": 500000},
        {"name": "SNEK", "amount": 250000}
      ],
      "comment": "Strong diversified portfolio with stablecoin exposure"
    }
  ]
}
```

## Development

### Running Standalone

```bash
cd agents/masumi
python main.py
```

### Testing Individual Components

```python
# Test Kupo integration
from tools.kupo_tool import KupoTool
tool = KupoTool()
assets = tool._run("addr1_...", top_assets_filter=5)

# Test token registry
from tools.token_registry_tool import TokenRegistryTool
registry = TokenRegistryTool()
names = registry._run(["asset_id_1", "asset_id_2"])
```

## Integration with Hydra

Masumi enhances Hydra negotiations by:

1. **Pre-Negotiation Analysis**: Assess borrower credibility
2. **Real-time Insights**: Provide market context during talks
3. **Risk Evaluation**: Help AI agents make informed decisions
4. **Post-Settlement Verification**: Confirm asset transfers

## Security Considerations

- **Data Privacy**: No sensitive information stored
- **API Rate Limits**: Respect indexer service limits
- **Error Handling**: Graceful degradation on API failures
- **Input Validation**: Strict address format checking

## Performance Optimization

- **Caching**: Asset metadata cached locally
- **Batch Processing**: Multiple addresses in single run
- **Async Operations**: Non-blocking API calls
- **Configurable Depth**: Adjustable analysis granularity

## Resources

- [CrewAI Framework](https://docs.crewai.com/)
- [Kupo Indexer](https://cardanosolutions.github.io/kupo/)
- [Cardano Token Registry](https://developers.cardano.org/docs/native-tokens/token-registry/)
- [Cardano Native Assets](https://docs.cardano.org/native-tokens/)
