#!/usr/bin/env python3
"""
Script to add Hexcore.io.vn Hydra nodes to the configuration.
Usage: python3 add_hexcore_nodes.py
"""

import sys
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from hydra.hydra_config import HydraConfigLoader, HydraNode

# Hexcore API keys from the table (5 groups, 2 nodes each = 10 nodes)
# Add all API keys from the table here
HEXCORE_API_KEYS = [
    # Group 1
    "e3fa6041998381f5",
    "8f7b2a9b8bf31747",
    # Group 2
    "45f3987db6d8046c",
    # TODO: Add remaining 7 API keys from Groups 2-5
    # Format: "api_key_here",
]

def add_hexcore_nodes():
    """Add all Hexcore nodes to the configuration."""
    loader = HydraConfigLoader()
    config = loader.load_config()

    # Check if nodes already exist
    existing_names = set()
    for node in config.custom_nodes:
        existing_names.add(node.name)

    added_count = 0
    skipped_count = 0

    for i, api_key in enumerate(HEXCORE_API_KEYS, 1):
        node_name = f"Hexcore Node {i} ({api_key[:8]}...)"
        ws_url = f"wss://{api_key}.hexcore.io.vn"

        # Skip if already exists
        if node_name in existing_names:
            print(f"⚠ Skipping {node_name} - already exists")
            skipped_count += 1
            continue

        # Create new node
        new_node = HydraNode(
            name=node_name,
            url=ws_url,
            description=f"Hexcore.io.vn Hydra node (API key: {api_key})",
            timeout=45,
            retry_count=5,
            enabled=True  # Enable by default for testing
        )

        config.custom_nodes.append(new_node)
        existing_names.add(node_name)
        added_count += 1
        print(f"✓ Added {node_name}")

    # Save configuration
    loader.save_config(config)

    print(f"\n✅ Added {added_count} Hexcore nodes")
    if skipped_count > 0:
        print(f"⚠ Skipped {skipped_count} existing nodes")
    print(f"📊 Total custom nodes: {len(config.custom_nodes)}")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        # Allow passing API keys as arguments
        HEXCORE_API_KEYS.extend(sys.argv[1:])
        print(f"Using {len(HEXCORE_API_KEYS)} API keys from command line")
    
    add_hexcore_nodes()
