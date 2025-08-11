import pytest
from unittest.mock import patch, MagicMock
from scraping.findResturantLink import findResturantLink


class TestFindResturantLink:

    @patch('scraping.findResturantLink.search')
    def test_successful_search(self, mock_search):
        """Test that function returns the first search result when search is successful."""
        mock_search.return_value = iter(['https://example.com/mcdonalds-nutrition.pdf'])
        restaurant_name = "McDonald's"
        
        result = findResturantLink(restaurant_name)
        
        assert result == 'https://example.com/mcdonalds-nutrition.pdf'
        mock_search.assert_called_once_with("McDonald's Nutrition filetype:pdf", num_results=1)

    @patch('scraping.findResturantLink.search')
    def test_multiple_results_returns_first(self, mock_search):
        """Test that function returns only the first result when multiple results are found."""
        mock_search.return_value = iter([
            'https://example.com/mcdonalds-nutrition.pdf',
            'https://another-site.com/mcdonalds-info.pdf'
        ])
        restaurant_name = "McDonald's"
        
        result = findResturantLink(restaurant_name)
        
        assert result == 'https://example.com/mcdonalds-nutrition.pdf'

    @patch('scraping.findResturantLink.search')
    def test_no_search_results(self, mock_search):
        """Test that function returns None when no search results are found."""
        mock_search.return_value = iter([])  # Empty iterator
        restaurant_name = "NonExistentRestaurant"
        
        result = findResturantLink(restaurant_name)
        
        assert result is None

    @patch('scraping.findResturantLink.search')
    def test_search_exception_handling(self, mock_search):
        """Test that function handles search exceptions gracefully."""
        mock_search.side_effect = Exception("Google search API error")
        restaurant_name = "TestRestaurant"
        
        result = findResturantLink(restaurant_name)
        
        assert result is None

    @patch('scraping.findResturantLink.search')
    @patch('builtins.print')
    def test_exception_error_message_printed(self, mock_print, mock_search):
        """Test that error message is printed when an exception occurs."""
        error_message = "Network timeout error"
        mock_search.side_effect = Exception(error_message)
        restaurant_name = "TestRestaurant"
        
        findResturantLink(restaurant_name)
        
        mock_print.assert_called_once_with(f"Error searching for {restaurant_name}: {error_message}")

    @patch('scraping.findResturantLink.search')
    def test_search_query_formatting(self, mock_search):
        """Test that the search query is properly formatted with the restaurant name."""
        mock_search.return_value = iter(['https://example.com/result.pdf'])
        restaurant_name = "Burger King"
        expected_query = "Burger King Nutrition filetype:pdf"
        
        findResturantLink(restaurant_name)
        
        mock_search.assert_called_once_with(expected_query, num_results=1)

    @patch('scraping.findResturantLink.search')
    def test_empty_restaurant_name(self, mock_search):
        """Test function behavior with empty restaurant name."""
        mock_search.return_value = iter(['https://example.com/result.pdf'])
        restaurant_name = ""
        expected_query = " Nutrition filetype:pdf"
        
        result = findResturantLink(restaurant_name)
        
        assert result == 'https://example.com/result.pdf'
        mock_search.assert_called_once_with(expected_query, num_results=1)

    @patch('scraping.findResturantLink.search')
    def test_restaurant_name_with_special_characters(self, mock_search):
        """Test function with restaurant names containing special characters."""
        mock_search.return_value = iter(['https://example.com/result.pdf'])
        restaurant_name = "Chick-fil-A"
        expected_query = "Chick-fil-A Nutrition filetype:pdf"
        
        result = findResturantLink(restaurant_name)
        
        assert result == 'https://example.com/result.pdf'
        mock_search.assert_called_once_with(expected_query, num_results=1)

    @patch('scraping.findResturantLink.search')
    def test_restaurant_name_with_spaces(self, mock_search):
        """Test function with restaurant names containing spaces."""
        mock_search.return_value = iter(['https://example.com/result.pdf'])
        restaurant_name = "Taco Bell Express"
        expected_query = "Taco Bell Express Nutrition filetype:pdf"
        
        result = findResturantLink(restaurant_name)
        
        assert result == 'https://example.com/result.pdf'
        mock_search.assert_called_once_with(expected_query, num_results=1)

    @patch('scraping.findResturantLink.search')
    def test_return_type_is_string_or_none(self, mock_search):
        """Test that function returns either a string URL or None."""
        # Test successful case
        mock_search.return_value = iter(['https://example.com/result.pdf'])
        result = findResturantLink("Test Restaurant")
        assert isinstance(result, str) or result is None
        
        # Test exception case
        mock_search.side_effect = Exception("Error")
        result = findResturantLink("Test Restaurant")
        assert result is None

    @patch('scraping.findResturantLink.search')
    def test_function_calls_search_exactly_once(self, mock_search):
        """Test that the search function is called exactly once per function call."""
        mock_search.return_value = iter(['https://example.com/result.pdf'])
        
        findResturantLink("Test Restaurant")
        
        assert mock_search.call_count == 1


# Integration test (commented out by default since it makes real API calls)
class TestFindResturantLinkIntegration:
    """Integration tests for findResturantLink function.
    
    Note: These tests make real API calls and should be run sparingly
    to avoid rate limiting and ensure they don't break due to external factors.
    """
    
    @pytest.mark.skip(reason="Integration test - makes real API calls")
    def test_real_search_mcdonalds(self):
        """Integration test with real McDonald's search."""
        result = findResturantLink("McDonald's")
        
        # Should return a URL or None (depending on search results)
        assert isinstance(result, str) or result is None
        
        # If a result is found, it should be a valid URL
        if result:
            assert result.startswith('http')

    @pytest.mark.skip(reason="Integration test - makes real API calls")
    def test_real_search_nonexistent_restaurant(self):
        """Integration test with a restaurant that likely doesn't exist."""
        result = findResturantLink("ZZZNonExistentRestaurantXYZ123")
        
        # Should handle gracefully and return None or a result
        assert isinstance(result, str) or result is None
