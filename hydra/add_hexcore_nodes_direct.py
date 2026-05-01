#!/usr/bin/env python3
"""
Direct script to add Hexcore.io.vn nodes.
Usage: 
    python3 add_hexcore_nodes_direct.py <api_key1> <api_key2> ...
    OR
    python3 add_hexcore_nodes_direct.py --all
"""

import sys
import yaml
from pathlib import Path

def add_hexcore_nodes(api_keys):
    """Add Hexcore nodes directly to YAML file."""
    config_path = Path(__file__).parent / "hydra_nodes.yaml"
    
    # Read current config
    with open(config_path, 'r') as f:
        config = yaml.safe_load(f)
    
    # Ensure custom_nodes exists
    if 'custom_nodes' not in config:
        config['custom_nodes'] = []
    
    # Remove existing Hexcore nodes first
    config['custom_nodes'] = [
        node for node in config['custom_nodes'] 
        if not node.get('name', '').startswith('Hexcore')
    ]
    
    # Add new Hexcore nodes
    for i, api_key in enumerate(api_keys, 1):
        group = (i - 1) // 2 + 1
        node_num = (i - 1) % 2 + 1
        
        node = {
            'name': f'Hexcore Node {group}-{node_num}',
            'url': f'wss://{api_key}.hexcore.io.vn',
            'description': f'Hexcore.io.vn Hydra node (Group {group}, API: {api_key})',
            'timeout': 45,
            'retry_count': 5,
            'enabled': True
        }
        config['custom_nodes'].append(node)
        print(f"✓ Added Hexcore Node {group}-{node_num} ({api_key})")
    
    # Write back
    with open(config_path, 'w') as f:
        yaml.dump(config, f, default_flow_style=False, sort_keys=False, allow_unicode=True)
    
    print(f"\n✅ Added {len(api_keys)} Hexcore nodes to configuration")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == '--all':
        # All 10 API keys from the table
        # TODO: Replace with actual API keys from the table
        api_keys = [
            "e3fa6041998381f5",      # Group 1, Node 1
            "8f7b2a9b8bf31747",       # Group 1, Node 2
            "45f3987db6d8046c",      # Group 2, Node 1
            # Add remaining 7 API keys here
        ]
        print("⚠️  Warning: Only 3 API keys found. Please add all 10 API keys to the script.")
    else:
        # Get API keys from command line arguments
        api_keys = sys.argv[1:] if len(sys.argv) > 1 else []
    
    if not api_keys:
        print("Usage:")
        print("  python3 add_hexcore_nodes_direct.py <api_key1> <api_key2> ...")
        print("  python3 add_hexcore_nodes_direct.py --all")
        print("\nExample:")
        print("  python3 add_hexcore_nodes_direct.py e3fa6041998381f5 8f7b2a9b8bf31747 45f3987db6d8046c")
        sys.exit(1)
    
    add_hexcore_nodes(api_keys)
