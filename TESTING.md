# Testing Guide for shredr

This document explains how to run and maintain tests for the shredr project.

## Overview

The test suite uses `pytest` as the testing framework and includes:

- Unit tests for individual classes (`MenuItem`, `Menu`)
- Integration tests for class interactions
- Code coverage reporting
- Fixtures for common test data

## Test Structure

```
tests/
├── __init__.py              # Makes tests a Python package
├── conftest.py              # Shared fixtures and configuration
├── test_menu_item.py        # Tests for MenuItem class
├── test_menu.py             # Tests for Menu class
└── test_integration.py      # Integration tests
```

## Running Tests

### Quick Commands

```bash
# Run all tests with coverage
python -m pytest tests/ --cov=models --cov=analysis --cov=scraping --cov-report=term-missing

# Run tests with verbose output
python -m pytest tests/ -v

# Run specific test file
python -m pytest tests/test_menu_item.py -v

# Run specific test function
python -m pytest tests/test_menu_item.py::TestMenuItem::test_protein_calorie_ratio_normal_case -v
```

### Using the Test Runner Script

The project includes a convenient test runner script:

```bash
# Run all tests with coverage (default)
python run_tests.py

# Run tests with verbose output
python run_tests.py --verbose

# Generate HTML coverage report
python run_tests.py --html

# Run quick tests without coverage
python run_tests.py --quick

# Run specific test
python run_tests.py --specific tests/test_menu_item.py
```

## Test Categories

### Unit Tests

#### MenuItem Tests (`test_menu_item.py`)

- **Initialization**: Tests proper object creation with all parameters
- **Ratio Calculations**: Tests protein, fat, and carb to calorie ratios
- **Edge Cases**: Tests zero calorie scenarios and decimal values
- **Parametrized Tests**: Tests multiple input combinations efficiently

Key test methods:

- `test_menu_item_initialization()`: Verifies all attributes are set correctly
- `test_protein_calorie_ratio_*()`: Tests protein ratio calculations
- `test_fat_calorie_ratio_*()`: Tests fat ratio calculations
- `test_carb_calorie_ratio_*()`: Tests carb ratio calculations

#### Menu Tests (`test_menu.py`)

- **Initialization**: Tests menu creation with and without items
- **Sorting Algorithms**: Tests all three ratio sorting methods
- **Empty Menu Handling**: Tests behavior with no menu items
- **Edge Cases**: Tests zero-calorie items and duplicate handling

Key test methods:

- `test_menu_initialization_*()`: Verifies menu setup
- `test_calculate_sorted_*_ratios()`: Tests sorting functionality
- `test_menu_with_zero_calorie_items()`: Tests edge case handling

### Integration Tests (`test_integration.py`)

These tests verify that `MenuItem` and `Menu` classes work together correctly:

- **Complete Workflow**: Tests full menu creation and analysis
- **Real-world Scenarios**: Tests with realistic restaurant data
- **Edge Case Integration**: Tests how classes handle edge cases together
- **Dynamic Menu Changes**: Tests menu modification effects

## Test Fixtures

Located in `conftest.py`, these provide reusable test data:

- `sample_menu_item`: Standard menu item for basic tests
- `zero_calorie_item`: Zero-calorie item for edge case tests
- `diverse_menu_items`: Collection of varied menu items
- `restaurant_menu`: Complete menu with diverse items
- `empty_menu`: Empty menu for testing edge cases

## Coverage Requirements

The project is configured to require 80% test coverage minimum, currently achieving **100% coverage**.

Coverage includes:

- `models/menu_item.py`: 100%
- `models/menu.py`: 100%
- `analysis/`: 100% (currently empty)
- `scraping/`: 100% (currently empty)

## Adding New Tests

### For New MenuItem Methods

1. Add unit tests in `test_menu_item.py`
2. Test normal cases, edge cases, and error conditions
3. Use parametrized tests for multiple input scenarios

Example:

```python
def test_new_method_normal_case(self):
    """Test the new method with normal values."""
    item = MenuItem(...)
    result = item.new_method()
    assert result == expected_value

@pytest.mark.parametrize("input_val,expected", [
    (10, 100),
    (20, 200),
    (0, 0),
])
def test_new_method_parametrized(self, input_val, expected):
    """Test new method with multiple inputs."""
    # Test implementation
```

### For New Menu Methods

1. Add unit tests in `test_menu.py`
2. Test with empty menus, single items, and multiple items
3. Add integration tests in `test_integration.py`

### For New Classes

1. Create new test file: `test_new_class.py`
2. Follow the existing pattern with test classes
3. Add integration tests if the class interacts with existing classes
4. Update `pyproject.toml` coverage settings if needed

## Best Practices

### Test Naming

- Use descriptive test method names
- Follow pattern: `test_<method_name>_<scenario>`
- Example: `test_protein_calorie_ratio_zero_calories`

### Test Structure

- Arrange: Set up test data
- Act: Execute the method being tested
- Assert: Verify the results

### Assertions

- Use specific assertions (`assert x == y` vs `assert x`)
- For floating-point comparisons, use tolerance: `abs(result - expected) < 1e-10`
- Test both success and failure cases

### Documentation

- Include docstrings for test classes and complex test methods
- Explain the purpose and expected behavior
- Document any special setup or teardown requirements

## Continuous Integration

The test configuration in `pyproject.toml` is ready for CI/CD integration:

```toml
[tool.pytest.ini_options]
testpaths = ["tests"]
addopts = [
    "--strict-markers",
    "--strict-config",
    "--cov=models",
    "--cov-fail-under=80"
]
```

## Troubleshooting

### Common Issues

1. **Import Errors**: Ensure you're running tests from the project root directory
2. **Coverage Not Working**: Verify `pytest-cov` is installed
3. **Tests Not Found**: Check that test files start with `test_` or end with `_test.py`

### Debugging Tests

```bash
# Run with Python debugger
python -m pytest tests/test_menu_item.py::test_specific_test --pdb

# Show local variables in failures
python -m pytest tests/ -l

# Stop on first failure
python -m pytest tests/ -x
```

## Performance Considerations

- Tests run in ~0.13 seconds for the full suite
- Use fixtures to avoid recreating test data
- Group related tests in classes
- Use parametrized tests to reduce code duplication

## Future Enhancements

Consider adding:

- Performance tests for large menus
- Property-based testing with `hypothesis`
- Mock testing for external dependencies
- Load testing for menu analysis operations
