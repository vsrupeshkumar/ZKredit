#!/bin/bash
# Script to add all Hexcore.io.vn Hydra nodes
# Usage: ./add_all_hexcore_nodes.sh

# All 10 API keys from the table (5 groups, 2 nodes each)
API_KEYS=(
    "e3fa6041998381f5"      # Group 1, Node 1
    "8f7b2a9b8bf31747"       # Group 1, Node 2
    "45f3987db6d8046c"       # Group 2, Node 1
    # Add remaining 7 API keys here
    # "api_key_3"
    # "api_key_4"
    # etc...
)

echo "Adding Hexcore.io.vn Hydra nodes..."
echo "Note: Please add all 10 API keys to this script first"

for i in "${!API_KEYS[@]}"; do
    api_key="${API_KEYS[$i]}"
    group=$((i / 2 + 1))
    node=$((i % 2 + 1))
    
    echo "Adding Group $group, Node $node: $api_key"
    python3 hydra/manage_nodes.py add "Hexcore G${group}-N${node}" "wss://${api_key}.hexcore.io.vn" "Hexcore.io.vn node (API: ${api_key})"
    python3 hydra/manage_nodes.py enable "Hexcore G${group}-N${node}"
done

echo ""
echo "✅ Done! Listing all nodes:"
python3 hydra/manage_nodes.py list
