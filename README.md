# shredr

A Python project for analyzing restaurant menu items based on nutritional content.

## Features

- **MenuItem Class**: Represents individual menu items with nutritional information
- **Menu Class**: Manages collections of menu items and provides analysis capabilities
- **Nutritional Analysis**: Calculate protein, fat, and carbohydrate to calorie ratios
- **Sorting & Ranking**: Sort menu items by nutritional ratios

## Project Structure

```
shredr/
├── models/
│   ├── menu_item.py     # MenuItem class definition
│   └── menu.py          # Menu class definition
├── analysis/            # Analysis modules (planned)
├── scraping/            # Web scraping modules (planned)
├── tests/               # Comprehensive test suite
├── main.py              # Main application entry point
└── run_tests.py         # Test runner script
```

## Installation

1. Clone the repository
2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

## Usage

### Basic Example

```python
from models.menu_item import MenuItem
from models.menu import Menu

# Create menu items
burger = MenuItem("Burger", 14.99, "Beef burger", 750, 30.0, 45.0, 40.0)
salad = MenuItem("Salad", 11.99, "Greek salad", 350, 12.0, 25.0, 20.0)

# Create menu
menu = Menu("Restaurant Name", {burger, salad})

# Analyze protein content
protein_rankings = menu.calculate_sorted_protein_calorie_ratios()
print(f"Highest protein ratio: {protein_rankings[0]}")
```

## Testing

The project includes a comprehensive test suite with 100% code coverage.

### Quick Start

```bash
# Run all tests
python run_tests.py

# Run with verbose output
python run_tests.py --verbose

# Generate HTML coverage report
python run_tests.py --html

# Run quick tests (no coverage)
python run_tests.py --quick
```

### Manual Testing

```bash
# Run all tests with coverage
python -m pytest tests/ --cov=models --cov-report=term-missing

# Run specific test file
python -m pytest tests/test_menu_item.py -v
```

For detailed testing information, see [TESTING.md](TESTING.md).

## Development

### Current Status

- ✅ MenuItem class with nutritional ratio calculations
- ✅ Menu class with sorting and analysis features
- ✅ Comprehensive test suite (35 tests, 100% coverage)
- 🚧 Analysis modules (planned)
- 🚧 Web scraping capabilities (planned)

### Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `python run_tests.py`
5. Submit a pull request
