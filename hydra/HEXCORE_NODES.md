# Hexcore.io.vn Hydra Nodes Configuration

This document explains how to configure and use the active Hexcore.io.vn Hydra nodes for testing.

## Current Status

✅ **3 nodes configured** (out of 10 total)
- Hexcore Node 1-1: `wss://e3fa6041998381f5.hexcore.io.vn`
- Hexcore Node 1-2: `wss://8f7b2a9b8bf31747.hexcore.io.vn`
- Hexcore Node 2-1: `wss://45f3987db6d8046c.hexcore.io.vn`

## Adding Remaining Nodes

You have **7 more API keys** to add from your table. Here are the options:

### Option 1: Quick Add Script (Recommended)

1. Edit `hydra/update_hexcore_nodes.py`
2. Add all 10 API keys to the `ALL_API_KEYS` list:
   ```python
   ALL_API_KEYS = [
       "e3fa6041998381f5",      # Group 1, Node 1 ✓
       "8f7b2a9b8bf31747",       # Group 1, Node 2 ✓
       "45f3987db6d8046c",       # Group 2, Node 1 ✓
       "YOUR_API_KEY_4",        # Group 2, Node 2
       "YOUR_API_KEY_5",         # Group 3, Node 1
       "YOUR_API_KEY_6",         # Group 3, Node 2
       "YOUR_API_KEY_7",         # Group 4, Node 1
       "YOUR_API_KEY_8",         # Group 4, Node 2
       "YOUR_API_KEY_9",         # Group 5, Node 1
       "YOUR_API_KEY_10",        # Group 5, Node 2
   ]
   ```
3. Run: `python3 hydra/update_hexcore_nodes.py`

### Option 2: Direct YAML Edit

Edit `hydra/hydra_nodes.yaml` and add nodes to the `custom_nodes` section:

```yaml
custom_nodes:
  - name: "Hexcore Node 2-2"
    url: "wss://YOUR_API_KEY.hexcore.io.vn"
    description: "Hexcore.io.vn Hydra node (Group 2, API: YOUR_API_KEY)"
    timeout: 45
    retry_count: 5
    enabled: true
```

### Option 3: Using Management Script

```bash
cd hydra
python3 manage_nodes.py add "Hexcore Node 2-2" "wss://YOUR_API_KEY.hexcore.io.vn" "Hexcore node"
python3 manage_nodes.py enable "Hexcore Node 2-2"
```

## Testing Connections

### List All Nodes
```bash
python3 hydra/manage_nodes.py list
```

### Test All Connections
```bash
python3 hydra/manage_nodes.py test
```

### Verify Configuration
```python
from hydra.hydra_config import get_hydra_config

config = get_hydra_config()
hexcore_nodes = [n for n in config.get_all_enabled_nodes() if 'hexcore' in n.url.lower()]
print(f"Configured {len(hexcore_nodes)} Hexcore nodes")
```

## Node Selection

The system uses **round-robin** selection by default, cycling through all enabled Hexcore nodes. This provides:

- **Load balancing** across multiple nodes
- **Automatic failover** if a node is unavailable
- **High availability** for testing

## Using in Code

The borrower agent automatically uses configured Hexcore nodes:

```python
from agents.borrower_agent import hydra_manager
print(f"Using node: {hydra_manager.node_url}")
```

## Node Status

All nodes from your table show **STATUS: checked**, meaning they are:
- ✅ Verified and operational
- ✅ Ready for testing
- ✅ Accessible via WebSocket (wss://)

## Troubleshooting

**Nodes not connecting?**
- Verify the API key is correct
- Check network connectivity
- Ensure WebSocket protocol (wss://) is used
- Check firewall settings

**Wrong node being used?**
- Check `default_environment` in `hydra_nodes.yaml`
- Verify nodes are enabled: `python3 hydra/manage_nodes.py list`
- Check selection strategy (round_robin/random/priority)

**Need to disable a node?**
```bash
python3 hydra/manage_nodes.py disable "Hexcore Node 1-1"
```

## Next Steps

1. ✅ Add remaining 7 API keys using one of the methods above
2. ✅ Test all connections: `python3 hydra/manage_nodes.py test`
3. ✅ Start using Hexcore nodes for Hydra Head negotiations
4. ✅ Monitor node health and performance
