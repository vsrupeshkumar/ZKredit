# Hydra Node Configuration

This document explains how to configure and manage Hydra nodes for Zkredit's off-chain negotiation system.

## Overview

Zkredit uses Hydra Heads for zero-gas, off-chain loan negotiations on Cardano. The `hydra_nodes.yaml` file allows you to manually configure which Hydra nodes the system connects to.

## Configuration File

The main configuration file is located at `hydra/hydra_nodes.yaml`. This YAML file contains:

- **Environments**: Different node configurations for development, staging, and production
- **Custom Nodes**: Your own manually added nodes
- **Global Settings**: Connection and health check settings
- **Selection Strategy**: How nodes are chosen for connections

## File Structure

```yaml
# Default environment to use
default_environment: development

# Node configurations by environment
environments:
  development:
    nodes:
      - name: "Local Hydra Node"
        url: "ws://localhost:4001"
        description: "Development node running locally"
        timeout: 30
        retry_count: 3
        enabled: true

# Custom nodes you add
custom_nodes:
  - name: "My Custom Node"
    url: "ws://my-hydra-node.example.com:4001"
    description: "My custom Hydra node"
    timeout: 30
    retry_count: 3
    enabled: false

# Global settings
global_settings:
  connection_timeout: 10
  heartbeat_interval: 30
  max_reconnect_attempts: 5
  reconnect_delay: 5

# Node selection strategy
selection_strategy: "round_robin"  # round_robin, random, priority

# Health check settings
health_check:
  enabled: true
  interval: 60
  timeout: 10
  unhealthy_threshold: 3
  recovery_threshold: 2
```

## Node Properties

Each node has the following properties:

- **`name`**: Human-readable name for the node
- **`url`**: WebSocket URL (ws:// or wss://)
- **`description`**: Optional description
- **`timeout`**: Connection timeout in seconds (default: 30)
- **`retry_count`**: Number of retry attempts (default: 3)
- **`enabled`**: Whether this node should be used (default: true)

## Environments

The system supports multiple environments:

- **`development`**: Local development and testing
- **`staging`**: Staging/testnet environment
- **`production`**: Mainnet production environment

Set the `default_environment` to choose which environment to use by default.

## Adding Custom Nodes

To add your own Hydra nodes:

1. Edit `hydra/hydra_nodes.yaml`
2. Add nodes to the `custom_nodes` section:

```yaml
custom_nodes:
  - name: "My Hydra Node"
    url: "ws://my-server.com:4001"
    description: "My custom Hydra node"
    timeout: 45
    retry_count: 5
    enabled: true
```

3. Or add to a specific environment:

```yaml
environments:
  production:
    nodes:
      - name: "My Production Node"
        url: "wss://my-prod-node.com:4001"
        description: "Production Hydra node"
        enabled: true
```

## Node Selection Strategies

Choose how nodes are selected for connections:

- **`round_robin`**: Cycle through enabled nodes in order
- **`random`**: Randomly select from enabled nodes
- **`priority`**: Use nodes in the order they appear (first enabled node gets priority)

## Health Checks

The system can automatically monitor node health:

- **`enabled`**: Enable/disable health checks
- **`interval`**: Check interval in seconds
- **`timeout`**: Health check timeout
- **`unhealthy_threshold`**: Mark unhealthy after this many failures
- **`recovery_threshold`**: Mark healthy after this many successes

## Usage in Code

The configuration is automatically loaded by the Hydra manager:

```python
from hydra.hydra_config import get_hydra_config, get_hydra_node_url

# Get the full configuration
config = get_hydra_config()

# Get all enabled nodes for default environment
nodes = config.get_all_enabled_nodes()

# Get primary node URL
primary_url = get_hydra_node_url()
```

## Node Management Script

Use the included management script to easily manage your Hydra nodes:

```bash
cd /path/to/zkredit-ai/hydra

# List all configured nodes
python3 manage_nodes.py list

# Add a custom node
python3 manage_nodes.py add "My Node" "ws://my-server.com:4001" "My custom Hydra node"

# Enable/disable nodes
python3 manage_nodes.py enable "My Node"
python3 manage_nodes.py disable "TestNet Node 2"

# Remove custom nodes
python3 manage_nodes.py remove "My Node"

# Test node connections
python3 manage_nodes.py test
```

## Testing Configuration

Test your configuration programmatically:

```bash
cd /path/to/zkredit-ai
python3 -c "from hydra.hydra_config import get_hydra_config; config = get_hydra_config(); print(f'Loaded {len(config.get_all_enabled_nodes())} nodes')"
```

## Troubleshooting

**Configuration not loading?**
- Check YAML syntax with: `python3 -c "import yaml; yaml.safe_load(open('hydra/hydra_nodes.yaml'))"`
- Ensure the file exists at `hydra/hydra_nodes.yaml`

**Nodes not connecting?**
- Verify URLs are accessible
- Check firewall settings
- Ensure WebSocket protocol (ws:// or wss://) is correct

**Wrong environment being used?**
- Check `default_environment` setting
- Pass environment name explicitly: `get_hydra_node_url('production')`

## Examples

### Add a local test node
```yaml
custom_nodes:
  - name: "Local Test"
    url: "ws://localhost:4002"
    description: "Additional local node for testing"
    enabled: true
```

### Configure for production
```yaml
default_environment: production
environments:
  production:
    nodes:
      - name: "Prod Node 1"
        url: "wss://hydra-prod-1.mycompany.com:4001"
        enabled: true
      - name: "Prod Node 2"
        url: "wss://hydra-prod-2.mycompany.com:4001"
        enabled: true
```

## Security Notes

- Use `wss://` (secure WebSocket) for production environments
- Keep node URLs and credentials secure
- Regularly update and test node configurations
- Monitor node health and performance
