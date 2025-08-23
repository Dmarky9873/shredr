"""
Test runner script for the shredr project.
This script provides different ways to run the tests.
"""

import argparse
import subprocess
from pathlib import Path


def run_command(command, description):
    """Run a command and handle errors."""
    print(f"\n{description}")
    print("-" * len(description))
    try:
        subprocess.run(
            command, shell=True, check=True, cwd=Path(__file__).parent.parent
        )
        return True
    except subprocess.CalledProcessError as e:
        print(f"Error running command: {e}")
        return False


def main():
    """Main entry point for the test runner."""
    parser = argparse.ArgumentParser(description="Run tests for the shredr project")
    parser.add_argument(
        "--coverage", action="store_true", help="Run tests with coverage report"
    )
    parser.add_argument(
        "--verbose", "-v", action="store_true", help="Verbose test output"
    )
    parser.add_argument(
        "--html", action="store_true", help="Generate HTML coverage report"
    )
    parser.add_argument(
        "--specific", "-s", type=str, help="Run specific test file or test function"
    )
    parser.add_argument(
        "--quick", "-q", action="store_true", help="Run tests without coverage"
    )

    args = parser.parse_args()

    base_cmd = "python -m pytest"

    if args.quick:
        cmd = f"{base_cmd} tests/"
        if args.verbose:
            cmd += " -v"
        run_command(cmd, "Running quick tests (no coverage)")

    elif args.specific:
        cmd = f"{base_cmd} {args.specific}"
        if args.verbose:
            cmd += " -v"
        if args.coverage:
            cmd += " --cov=app.models --cov=app.analysis --cov=app.scraping"
        run_command(cmd, f"Running specific test: {args.specific}")

    else:
        cmd = (
            f"{base_cmd} tests/ --cov=app.models --cov=app.analysis --cov=app.scraping "
            "--cov-report=term-missing"
        )
        if args.verbose:
            cmd += " -v"
        if args.html:
            cmd += " --cov-report=html:htmlcov"

        success = run_command(cmd, "Running all tests with coverage")

        if success and args.html:
            print("\nHTML coverage report generated in 'htmlcov/' directory")
            print(
                "Open 'htmlcov/index.html' in your browser to view the detailed report"
            )


if __name__ == "__main__":
    main()
