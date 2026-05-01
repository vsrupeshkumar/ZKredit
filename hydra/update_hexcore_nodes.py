#!/usr/bin/env python3
"""
Quick script to add remaining Hexcore API keys.
Just update the API_KEYS list below with all 10 keys from your table.
"""

import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent.parent))

from hydra.hydra_config import HydraConfigLoader, HydraNode

# TODO: Add ALL 10 API keys from your table here
# Currently have 3, need 7 more
ALL_API_KEYS = [
    "e3fa6041998381f5",      # Group 1, Node 1 ✓
    "8f7b2a9b8bf31747",       # Group 1, Node 2 ✓
    "45f3987db6d8046c",       # Group 2, Node 1 ✓
    # Add the remaining 7 API keys here:
    # "api_key_4",  # Group 2, Node 2
    # "api_key_5",  # Group 3, Node 1
    # "api_key_6",  # Group 3, Node 2
    # "api_key_7",  # Group 4, Node 1
    # "api_key_8",  # Group 4, Node 2
    # "api_key_9",  # Group 5, Node 1
    # "api_key_10", # Group 5, Node 2
]

def main():
    loader = HydraConfigLoader()
    config = loader.load_config()
    
    # Get existing Hexcore node names
    existing = {node.name for node in config.custom_nodes if node.name.startswith("Hexcore")}
    
    added = 0
    for i, api_key in enumerate(ALL_API_KEYS, 1):
        group = (i - 1) // 2 + 1
        node_num = (i - 1) % 2 + 1
        name = f"Hexcore Node {group}-{node_num}"
        
        if name in existing:
            print(f"⏭  {name} already exists")
            continue
        
        node = HydraNode(
            name=name,
            url=f"wss://{api_key}.hexcore.io.vn",
            description=f"Hexcore.io.vn Hydra node (Group {group}, API: {api_key})",
            timeout=45,
            retry_count=5,
            enabled=True
        )
        config.custom_nodes.append(node)
        added += 1
        print(f"✓ Added {name}")
    
    if added > 0:
        loader.save_config(config)
        print(f"\n✅ Added {added} new nodes")
    else:
        print("\n✅ All nodes already configured")
    
    # Show summary
    hexcore_nodes = [n for n in config.custom_nodes if n.name.startswith("Hexcore")]
    enabled = [n for n in hexcore_nodes if n.enabled]
    print(f"\n📊 Hexcore Nodes Summary:")
    print(f"   Total: {len(hexcore_nodes)}")
    print(f"   Enabled: {len(enabled)}")
    print(f"   Disabled: {len(hexcore_nodes) - len(enabled)}")

if __name__ == "__main__":
    main()
