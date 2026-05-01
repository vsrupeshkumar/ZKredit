#!/usr/bin/env python3
"""
Test script for Hydra + Masumi integration.
Tests the core functionality without requiring CrewAI.
"""

import sys
import os

# Add current directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

def test_masumi_import():
    """Test if Masumi can be imported."""
    try:
        from agents.masumi.tools.kupo_tool import KupoTool
        from agents.masumi.tools.token_registry_tool import TokenRegistryTool
        print("✓ Masumi tools imported successfully")
        return True
    except ImportError as e:
        print(f"✗ Masumi import failed: {e}")
        return False

def test_hydra_import():
    """Test if Hydra client can be imported."""
    try:
        from hydra.head_manager import HydraClient, HydraNegotiationManager
        print("✓ Hydra client imported successfully")
        return True
    except ImportError as e:
        print(f"✗ Hydra import failed: {e}")
        return False

def test_integrated_client():
    """Test if integrated client can be imported."""
    try:
        from hydra.integrated_client import IntegratedHydraMasumiClient
        print("✓ Integrated client imported successfully")
        return True
    except ImportError as e:
        print(f"✗ Integrated client import failed: {e}")
        return False

def test_masumi_tools():
    """Test Masumi tools functionality."""
    try:
        from agents.masumi.tools.token_registry_tool import TokenRegistryTool
        tool = TokenRegistryTool()
        # Test with a known asset ID
        result = tool._run(["d100e1eae6f918d628b6304a01f03a7fbdc260a446054c68d389e290.72526964315f4144415f4c51"])
        print(f"✓ Token registry tool works: {result}")
        return True
    except Exception as e:
        print(f"✗ Token registry tool failed: {e}")
        return False

def main():
    """Run all integration tests."""
    print("=" * 60)
    print("ZKREDIT AI - INTEGRATION TEST SUITE")
    print("=" * 60)

    tests = [
        ("Masumi Import", test_masumi_import),
        ("Hydra Import", test_hydra_import),
        ("Integrated Client Import", test_integrated_client),
        ("Masumi Tools Functionality", test_masumi_tools),
    ]

    passed = 0
    total = len(tests)

    for test_name, test_func in tests:
        print(f"\n[{test_name}]")
        if test_func():
            passed += 1

    print("\n" + "=" * 60)
    print(f"TEST RESULTS: {passed}/{total} tests passed")
    print("=" * 60)

    if passed == total:
        print("🎉 All integrations working correctly!")
        print("\nNext steps:")
        print("1. Install CrewAI: pip install crewai crewai-tools")
        print("2. Set up Ollama: ollama pull llama3")
        print("3. Configure Kupo API endpoint")
        print("4. Run full workflow: python -m agents.borrower_agent")
    else:
        print("❌ Some integrations need fixing")

    return passed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
