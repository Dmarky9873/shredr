"""Unit tests for the find_restaurant_link function."""

from unittest.mock import patch
from scraping.find_restaurant_link import find_restaurant_link, clean_restaurant_name


class TestFindRestaurantLink:
    """
    Tests for the find_restaurant_link function.
    """

    @patch("scraping.find_restaurant_link.search")
    def test_successful_search(self, mock_search):
        """Test that function returns the first search result when search is successful."""
        mock_search.return_value = iter(["https://example.com/mcdonalds-nutrition.pdf"])
        restaurant_name = "McDonald's"

        result = find_restaurant_link(restaurant_name)

        assert result == "https://example.com/mcdonalds-nutrition.pdf"
        mock_search.assert_called_once_with(
            "mcdonalds Nutrition filetype:pdf", num_results=5
        )

    @patch("scraping.find_restaurant_link.search")
    def test_multiple_results_returns_first(self, mock_search):
        """Test that function returns only the first result when multiple results are found."""
        mock_search.return_value = iter(
            [
                "https://example.com/mcdonalds-nutrition.pdf",
                "https://another-site.com/mcdonalds-info.pdf",
            ]
        )
        restaurant_name = "McDonald's"

        result = find_restaurant_link(restaurant_name)

        assert result == "https://example.com/mcdonalds-nutrition.pdf"

    @patch("scraping.find_restaurant_link.search")
    def test_no_search_results(self, mock_search):
        """Test that function returns None when no search results are found."""
        mock_search.return_value = iter([])
        restaurant_name = "NonExistentRestaurant"

        result = find_restaurant_link(restaurant_name)

        assert result is None

    @patch("scraping.find_restaurant_link.search")
    def test_search_exception_handling(self, mock_search):
        """Test that function handles search exceptions gracefully."""
        mock_search.side_effect = Exception("Google search API error")
        restaurant_name = "TestRestaurant"

        result = find_restaurant_link(restaurant_name)

        assert result is None

    @patch("scraping.find_restaurant_link.search")
    @patch("builtins.print")
    def test_exception_error_message_printed(self, mock_print, mock_search):
        """Test that error message is printed when an exception occurs."""
        error_message = "Network timeout error"
        mock_search.side_effect = Exception(error_message)
        restaurant_name = "TestRestaurant"
        cleaned_name = clean_restaurant_name(restaurant_name)

        find_restaurant_link(restaurant_name)

        mock_print.assert_called_once_with(
            f"Error searching for {cleaned_name}: {error_message}"
        )

    @patch("scraping.find_restaurant_link.search")
    def test_search_query_formatting(self, mock_search):
        """Test that the search query is properly formatted with the restaurant name."""

        mock_search.return_value = iter(["https://example.com/result.pdf"])
        restaurant_name = "Burger King"
        expected_query = (
            f"{clean_restaurant_name(restaurant_name)} Nutrition filetype:pdf"
        )

        find_restaurant_link(restaurant_name)

        mock_search.assert_called_once_with(expected_query, num_results=5)

    @patch("scraping.find_restaurant_link.search")
    def test_empty_restaurant_name(self, mock_search):
        """Test function behavior with empty restaurant name."""
        mock_search.return_value = iter(["https://example.com/result.pdf"])
        restaurant_name = ""
        expected_query = " Nutrition filetype:pdf"

        result = find_restaurant_link(restaurant_name)

        assert result == "https://example.com/result.pdf"
        mock_search.assert_called_once_with(expected_query, num_results=5)

    @patch("scraping.find_restaurant_link.search")
    def test_restaurant_name_with_special_characters(self, mock_search):
        """Test function with restaurant names containing special characters."""

        mock_search.return_value = iter(["https://example.com/result.pdf"])
        restaurant_name = "Chick-fil-A"
        expected_query = (
            f"{clean_restaurant_name(restaurant_name)} Nutrition filetype:pdf"
        )

        result = find_restaurant_link(restaurant_name)

        assert result == "https://example.com/result.pdf"
        mock_search.assert_called_once_with(expected_query, num_results=5)

    @patch("scraping.find_restaurant_link.search")
    def test_restaurant_name_with_spaces(self, mock_search):
        """Test function with restaurant names containing spaces."""

        mock_search.return_value = iter(["https://example.com/result.pdf"])
        restaurant_name = "Taco Bell Express"
        expected_query = (
            f"{clean_restaurant_name(restaurant_name)} Nutrition filetype:pdf"
        )

        result = find_restaurant_link(restaurant_name)

        assert result == "https://example.com/result.pdf"
        mock_search.assert_called_once_with(expected_query, num_results=5)

    @patch("scraping.find_restaurant_link.search")
    def test_return_type_is_string_or_none(self, mock_search):
        """Test that function returns either a string URL or None."""
        mock_search.return_value = iter(["https://example.com/result.pdf"])
        result = find_restaurant_link("Test Restaurant")
        assert isinstance(result, str) or result is None

        mock_search.side_effect = Exception("Error")
        result = find_restaurant_link("Test Restaurant")
        assert result is None

    @patch("scraping.find_restaurant_link.search")
    def test_function_calls_search_exactly_once(self, mock_search):
        """Test that the search function is called exactly once per function call."""
        mock_search.return_value = iter(["https://example.com/result.pdf"])

        find_restaurant_link("Test Restaurant")

        assert mock_search.call_count == 1

    @patch("scraping.find_restaurant_link.search")
    def test_relative_url_handling(self, mock_search):
        """Test that function handles relative URLs by converting them to full URLs."""
        mock_search.return_value = iter(
            ["/search?num=3", "https://example.com/result.pdf"]
        )
        restaurant_name = "Test Restaurant"

        result = find_restaurant_link(restaurant_name)

        assert result == "https://example.com/result.pdf"

    @patch("scraping.find_restaurant_link.search")
    def test_non_pdf_url_skipped(self, mock_search):
        """Test that function skips URLs that don't contain 'pdf'."""
        mock_search.return_value = iter(
            ["https://example.com/menu.html", "https://example.com/nutrition.pdf"]
        )
        restaurant_name = "Test Restaurant"

        result = find_restaurant_link(restaurant_name)

        assert result == "https://example.com/nutrition.pdf"

    @patch("scraping.find_restaurant_link.search")
    @patch("builtins.print")
    def test_no_valid_pdf_urls_found(self, mock_print, mock_search):
        """Test that function returns None when no valid PDF URLs are found."""
        mock_search.return_value = iter(
            ["https://example.com/menu.html", "https://example.com/about.jsp"]
        )
        restaurant_name = "Test Restaurant"
        cleaned_name = clean_restaurant_name(restaurant_name)

        result = find_restaurant_link(restaurant_name)

        assert result is None
        mock_print.assert_called_once_with(f"No valid PDF URL found for {cleaned_name}")


class TestFindRestaurantLinkIntegration:
    """Integration tests for find_restaurant_link function.

    Note: These tests make real API calls and should be run sparingly
    to avoid rate limiting and ensure they don't break due to external factors.
    """

    def test_real_search_popular_restaurants(self):
        """Integration test with real popular restaurant searches."""
        for restaurant in [
            "McDonald's",
            "Starbucks",
            "Chick-fil-A",
            "Taco Bell",
            "The Keg",
        ]:
            result = find_restaurant_link(restaurant)
            if not isinstance(result, str):
                print(f"No link found for {restaurant}; result: {result}")
            assert isinstance(result, str)
            assert result.startswith("http")

    def test_real_search_nonexistent_restaurant(self):
        """Integration test with a restaurant that likely doesn't exist."""
        result = find_restaurant_link("ZZZNonExistentRestaurantXYZ123")

        assert isinstance(result, str) or result is None
