#!/usr/bin/env python3
"""
Zkredit - Hydra Node Management Script
==========================================
Utility script to manage Hydra node configurations.

Usage:
    python3 manage_nodes.py list                    # List all nodes
    python3 manage_nodes.py add <name> <url>        # Add a custom node
    python3 manage_nodes.py enable <name>           # Enable a node
    python3 manage_nodes.py disable <name>          # Disable a node
    python3 manage_nodes.py remove <name>           # Remove a custom node
    python3 manage_nodes.py test                    # Test node connections
"""

import sys
import asyncio
from typing import List
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from hydra.hydra_config import HydraConfigLoader, HydraNode


def print_usage():
    """Print usage information."""
    print(__doc__)


def list_nodes():
    """List all configured nodes."""
    try:
        loader = HydraConfigLoader()
        config = loader.load_config()

        print("Zkredit - Hydra Node Configuration")
        print("=" * 50)
        print(f"Default Environment: {config.default_environment}")
        print(f"Selection Strategy: {config.selection_strategy}")
        print()

        for env_name, env in config.environments.items():
            print(f"Environment: {env_name}")
            print("-" * 30)
            for node in env.nodes:
                status = "✓ ENABLED" if node.enabled else "✗ DISABLED"
                print(f"  {status} | {node.name}")
                print(f"    URL: {node.url}")
                print(f"    Timeout: {node.timeout}s, Retries: {node.retry_count}")
                if node.description:
                    print(f"    Description: {node.description}")
                print()

        if config.custom_nodes:
            print("Custom Nodes:")
            print("-" * 30)
            for node in config.custom_nodes:
                status = "✓ ENABLED" if node.enabled else "✗ DISABLED"
                print(f"  {status} | {node.name}")
                print(f"    URL: {node.url}")
                print(f"    Timeout: {node.timeout}s, Retries: {node.retry_count}")
                if node.description:
                    print(f"    Description: {node.description}")
                print()

    except Exception as e:
        print(f"Error listing nodes: {e}")


def add_node(name: str, url: str, description: str = "", timeout: int = 30, retry_count: int = 3):
    """Add a custom node."""
    try:
        loader = HydraConfigLoader()
        config = loader.load_config()

        # Check if node with this name already exists
        for node in config.custom_nodes:
            if node.name == name:
                print(f"Error: Node with name '{name}' already exists")
                return

        # Create new node
        new_node = HydraNode(
            name=name,
            url=url,
            description=description,
            timeout=timeout,
            retry_count=retry_count,
            enabled=False  # New nodes start disabled
        )

        # Add to custom nodes
        config.custom_nodes.append(new_node)

        # Save configuration
        loader.save_config(config)

        print(f"✓ Added custom node '{name}'")
        print(f"  URL: {url}")
        print(f"  Status: DISABLED (use 'enable' command to activate)")

    except Exception as e:
        print(f"Error adding node: {e}")


def enable_node(name: str):
    """Enable a node."""
    try:
        loader = HydraConfigLoader()
        config = loader.load_config()

        # Search in environments
        found = False
        for env in config.environments.values():
            for node in env.nodes:
                if node.name == name:
                    node.enabled = True
                    found = True
                    break
            if found:
                break

        # Search in custom nodes
        if not found:
            for node in config.custom_nodes:
                if node.name == name:
                    node.enabled = True
                    found = True
                    break

        if not found:
            print(f"Error: Node '{name}' not found")
            return

        # Save configuration
        loader.save_config(config)
        print(f"✓ Enabled node '{name}'")

    except Exception as e:
        print(f"Error enabling node: {e}")


def disable_node(name: str):
    """Disable a node."""
    try:
        loader = HydraConfigLoader()
        config = loader.load_config()

        # Search in environments
        found = False
        for env in config.environments.values():
            for node in env.nodes:
                if node.name == name:
                    node.enabled = False
                    found = True
                    break
            if found:
                break

        # Search in custom nodes
        if not found:
            for node in config.custom_nodes:
                if node.name == name:
                    node.enabled = False
                    found = True
                    break

        if not found:
            print(f"Error: Node '{name}' not found")
            return

        # Save configuration
        loader.save_config(config)
        print(f"✓ Disabled node '{name}'")

    except Exception as e:
        print(f"Error disabling node: {e}")


def remove_node(name: str):
    """Remove a custom node."""
    try:
        loader = HydraConfigLoader()
        config = loader.load_config()

        # Only allow removing custom nodes
        original_count = len(config.custom_nodes)
        config.custom_nodes = [node for node in config.custom_nodes if node.name != name]

        if len(config.custom_nodes) == original_count:
            print(f"Error: Custom node '{name}' not found (only custom nodes can be removed)")
            return

        # Save configuration
        loader.save_config(config)
        print(f"✓ Removed custom node '{name}'")

    except Exception as e:
        print(f"Error removing node: {e}")


async def test_node_connection(node: HydraNode) -> bool:
    """Test connection to a single node."""
    try:
        import websockets
        import asyncio

        print(f"Testing {node.name} ({node.url})...")

        # Set a short timeout for testing
        timeout = node.timeout if node.timeout < 10 else 10

        try:
            async with websockets.connect(node.url, extra_headers={"User-Agent": "Zkredit-AI-Test"}) as websocket:
                # Send a simple ping or just test connection
                await asyncio.wait_for(websocket.ping(), timeout=timeout)
                print(f"  ✓ {node.name}: Connection successful")
                return True
        except asyncio.TimeoutError:
            print(f"  ✗ {node.name}: Connection timeout")
            return False
        except Exception as e:
            print(f"  ✗ {node.name}: Connection failed - {e}")
            return False

    except ImportError:
        print(f"  ? {node.name}: Cannot test (websockets library not available)")
        return False


async def test_connections():
    """Test connections to all enabled nodes."""
    try:
        import websockets
    except ImportError:
        print("Error: websockets library required for connection testing")
        print("Install with: pip install websockets")
        return

    try:
        loader = HydraConfigLoader()
        config = loader.load_config()

        print("Testing Hydra Node Connections")
        print("=" * 40)

        enabled_nodes = config.get_all_enabled_nodes()

        if not enabled_nodes:
            print("No enabled nodes to test")
            return

        print(f"Testing {len(enabled_nodes)} enabled nodes...")
        print()

        results = []
        for node in enabled_nodes:
            success = await test_node_connection(node)
            results.append((node.name, success))
            await asyncio.sleep(1)  # Small delay between tests

        print()
        print("Summary:")
        successful = sum(1 for _, success in results if success)
        print(f"  ✓ {successful}/{len(results)} nodes connected successfully")

        if successful == 0:
            print("  Warning: No nodes are reachable!")
        elif successful < len(results):
            print("  Warning: Some nodes are unreachable")

    except Exception as e:
        print(f"Error testing connections: {e}")


def main():
    """Main function."""
    if len(sys.argv) < 2:
        print_usage()
        return

    command = sys.argv[1].lower()

    try:
        if command == "list":
            list_nodes()

        elif command == "add":
            if len(sys.argv) < 4:
                print("Usage: python3 manage_nodes.py add <name> <url> [description]")
                return
            name = sys.argv[2]
            url = sys.argv[3]
            description = sys.argv[4] if len(sys.argv) > 4 else ""
            add_node(name, url, description)

        elif command == "enable":
            if len(sys.argv) < 3:
                print("Usage: python3 manage_nodes.py enable <name>")
                return
            enable_node(sys.argv[2])

        elif command == "disable":
            if len(sys.argv) < 3:
                print("Usage: python3 manage_nodes.py disable <name>")
                return
            disable_node(sys.argv[2])

        elif command == "remove":
            if len(sys.argv) < 3:
                print("Usage: python3 manage_nodes.py remove <name>")
                return
            remove_node(sys.argv[2])

        elif command == "test":
            asyncio.run(test_connections())

        else:
            print(f"Unknown command: {command}")
            print_usage()

    except KeyboardInterrupt:
        print("\nOperation cancelled")
    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
