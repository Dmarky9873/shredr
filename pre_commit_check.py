#!/usr/bin/env python3
"""
Pre-commit helper script - runs linting and formatting before commits.
"""

import subprocess
import sys


def run_command(command: str) -> bool:
    """Run a command and return True if successful."""
    try:
        subprocess.run(command, shell=True, check=True)
        return True
    except subprocess.CalledProcessError:
        return False


def main():
    """Main function to run pre-commit checks."""
    print("🚀 Running pre-commit checks...")

    print("📝 Formatting code...")
    if not run_command("black ."):
        print("❌ Black formatting failed")
        return 1

    if not run_command("isort ."):
        print("❌ Import sorting failed")
        return 1

    print("🔍 Checking code quality...")
    if not run_command("flake8 ."):
        print("❌ Flake8 checks failed")
        return 1

    print("🧪 Running tests...")
    if not run_command("python run_tests.py --quick"):
        print("❌ Tests failed")
        return 1

    print("✅ All pre-commit checks passed!")
    return 0


if __name__ == "__main__":
    sys.exit(main())
