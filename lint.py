#!/usr/bin/env python3
"""
Script to run all linting tools and fix common issues.
"""

import subprocess
import sys


def run_command(command: str, description: str) -> bool:
    """Run a command and return True if successful."""
    print(f"\n🔧 {description}")
    print(f"Running: {command}")

    try:
        result = subprocess.run(
            command, shell=True, check=True, text=True, capture_output=True
        )
        if result.stdout:
            print(result.stdout)
        return True
    except subprocess.CalledProcessError as e:
        print(f"❌ Failed: {e}")
        if e.stdout:
            print("STDOUT:", e.stdout)
        if e.stderr:
            print("STDERR:", e.stderr)
        return False


def main():
    """Main function to run all linting tools."""
    print("🚀 Running linting and formatting tools...")

    # List of commands to run
    commands = [
        ("black .", "Formatting code with Black"),
        ("isort .", "Sorting imports with isort"),
        ("flake8 .", "Checking code style with flake8"),
    ]

    success_count = 0
    for command, description in commands:
        if run_command(command, description):
            success_count += 1
        print("-" * 50)

    print(f"\n✅ Completed {success_count}/{len(commands)} tools successfully")

    if success_count == len(commands):
        print("🎉 All linting tools passed!")
        return 0
    else:
        print("⚠️  Some tools had issues. Please review the output above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())
