"""
Zkredit - Hydra Node Configuration
=====================================
Configuration loader for manually specified Hydra nodes.

This module loads and manages Hydra node configurations from the hydra_nodes.yaml file,
allowing users to specify custom nodes for different environments.
"""

import os
import yaml
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from pathlib import Path


@dataclass
class HydraNode:
    """Configuration for a single Hydra node."""
    name: str
    url: str
    description: str = ""
    timeout: int = 30
    retry_count: int = 3
    enabled: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            "name": self.name,
            "url": self.url,
            "description": self.description,
            "timeout": self.timeout,
            "retry_count": self.retry_count,
            "enabled": self.enabled
        }


@dataclass
class HydraEnvironment:
    """Configuration for a specific environment."""
    name: str
    nodes: List[HydraNode]

    def get_enabled_nodes(self) -> List[HydraNode]:
        """Get only enabled nodes for this environment."""
        return [node for node in self.nodes if node.enabled]


@dataclass
class HydraConfig:
    """Complete Hydra configuration."""
    default_environment: str
    environments: Dict[str, HydraEnvironment]
    custom_nodes: List[HydraNode]
    global_settings: Dict[str, Any]
    selection_strategy: str
    health_check: Dict[str, Any]

    def get_environment(self, env_name: Optional[str] = None) -> HydraEnvironment:
        """Get configuration for a specific environment."""
        env = env_name or self.default_environment
        if env not in self.environments:
            raise ValueError(f"Environment '{env}' not found in configuration")
        return self.environments[env]

    def get_all_enabled_nodes(self, env_name: Optional[str] = None) -> List[HydraNode]:
        """Get all enabled nodes for an environment plus custom nodes."""
        env = self.get_environment(env_name)
        nodes = env.get_enabled_nodes()

        # Add enabled custom nodes
        custom_enabled = [node for node in self.custom_nodes if node.enabled]
        nodes.extend(custom_enabled)

        return nodes

    def get_primary_node(self, env_name: Optional[str] = None) -> Optional[HydraNode]:
        """Get the primary (first enabled) node for an environment."""
        enabled_nodes = self.get_all_enabled_nodes(env_name)
        return enabled_nodes[0] if enabled_nodes else None


class HydraConfigLoader:
    """Loader for Hydra node configuration files."""

    def __init__(self, config_path: Optional[str] = None):
        """
        Initialize the configuration loader.

        Args:
            config_path: Path to the hydra_nodes.yaml file. If None, uses default location.
        """
        if config_path is None:
            # Default to hydra/hydra_nodes.yaml relative to this file
            current_dir = Path(__file__).parent
            config_path = current_dir / "hydra_nodes.yaml"

        self.config_path = Path(config_path)

    def load_config(self) -> HydraConfig:
        """
        Load configuration from the YAML file.

        Returns:
            HydraConfig: The loaded configuration

        Raises:
            FileNotFoundError: If the configuration file doesn't exist
            ValueError: If the configuration is invalid
        """
        if not self.config_path.exists():
            raise FileNotFoundError(f"Hydra configuration file not found: {self.config_path}")

        try:
            with open(self.config_path, 'r') as f:
                data = yaml.safe_load(f)

            # Validate required fields
            if 'default_environment' not in data:
                raise ValueError("Missing 'default_environment' in configuration")

            if 'environments' not in data:
                raise ValueError("Missing 'environments' section in configuration")

            # Parse environments
            environments = {}
            for env_name, env_data in data['environments'].items():
                if 'nodes' not in env_data:
                    raise ValueError(f"Environment '{env_name}' missing 'nodes' section")

                nodes = []
                for node_data in env_data['nodes']:
                    # Validate required node fields
                    if 'name' not in node_data or 'url' not in node_data:
                        raise ValueError(f"Node missing required 'name' or 'url' field in environment '{env_name}'")

                    node = HydraNode(
                        name=node_data['name'],
                        url=node_data['url'],
                        description=node_data.get('description', ''),
                        timeout=node_data.get('timeout', 30),
                        retry_count=node_data.get('retry_count', 3),
                        enabled=node_data.get('enabled', True)
                    )
                    nodes.append(node)

                environments[env_name] = HydraEnvironment(name=env_name, nodes=nodes)

            # Parse custom nodes
            custom_nodes = []
            if 'custom_nodes' in data:
                for node_data in data['custom_nodes']:
                    if 'name' in node_data and 'url' in node_data:
                        node = HydraNode(
                            name=node_data['name'],
                            url=node_data['url'],
                            description=node_data.get('description', ''),
                            timeout=node_data.get('timeout', 30),
                            retry_count=node_data.get('retry_count', 3),
                            enabled=node_data.get('enabled', False)
                        )
                        custom_nodes.append(node)

            # Parse global settings with defaults
            global_settings = data.get('global_settings', {})
            selection_strategy = data.get('selection_strategy', 'round_robin')
            health_check = data.get('health_check', {'enabled': True})

            return HydraConfig(
                default_environment=data['default_environment'],
                environments=environments,
                custom_nodes=custom_nodes,
                global_settings=global_settings,
                selection_strategy=selection_strategy,
                health_check=health_check
            )

        except yaml.YAMLError as e:
            raise ValueError(f"Error parsing YAML configuration: {e}")

    def get_node_url(self, env_name: Optional[str] = None) -> str:
        """
        Get a single node URL for the specified environment.
        This is a convenience method for backward compatibility.

        Args:
            env_name: Environment name, uses default if None

        Returns:
            str: URL of the primary enabled node

        Raises:
            ValueError: If no enabled nodes are found
        """
        config = self.load_config()
        primary_node = config.get_primary_node(env_name)
        if primary_node is None:
            raise ValueError(f"No enabled nodes found for environment '{env_name or config.default_environment}'")
        return primary_node.url

    def save_config(self, config: HydraConfig) -> None:
        """
        Save configuration back to the YAML file.
        Useful for programmatically updating the configuration.

        Args:
            config: The configuration to save
        """
        # Convert config back to dictionary format
        data = {
            'default_environment': config.default_environment,
            'environments': {},
            'custom_nodes': [node.to_dict() for node in config.custom_nodes],
            'global_settings': config.global_settings,
            'selection_strategy': config.selection_strategy,
            'health_check': config.health_check
        }

        # Convert environments
        for env_name, env in config.environments.items():
            data['environments'][env_name] = {
                'nodes': [node.to_dict() for node in env.nodes]
            }

        # Ensure parent directory exists
        self.config_path.parent.mkdir(parents=True, exist_ok=True)

        # Write to file
        with open(self.config_path, 'w') as f:
            yaml.dump(data, f, default_flow_style=False, sort_keys=False)


# Global instance for easy access
_default_loader = None

def get_hydra_config(env_name: Optional[str] = None) -> HydraConfig:
    """
    Get the Hydra configuration for the current environment.

    Args:
        env_name: Environment name override, uses default if None

    Returns:
        HydraConfig: The loaded configuration
    """
    global _default_loader
    if _default_loader is None:
        _default_loader = HydraConfigLoader()
    return _default_loader.load_config()

def get_hydra_node_url(env_name: Optional[str] = None) -> str:
    """
    Get a Hydra node URL for the current environment.
    This is a convenience function for backward compatibility.

    Args:
        env_name: Environment name, uses default if None

    Returns:
        str: URL of an enabled Hydra node
    """
    global _default_loader
    if _default_loader is None:
        _default_loader = HydraConfigLoader()
    return _default_loader.get_node_url(env_name)


# Example usage:
if __name__ == "__main__":
    try:
        config = get_hydra_config()
        print(f"Default environment: {config.default_environment}")

        # Get all enabled nodes for default environment
        nodes = config.get_all_enabled_nodes()
        print(f"Enabled nodes: {len(nodes)}")
        for node in nodes:
            print(f"  - {node.name}: {node.url}")

        # Get primary node URL
        primary_url = get_hydra_node_url()
        print(f"Primary node URL: {primary_url}")

    except Exception as e:
        print(f"Error loading configuration: {e}")
