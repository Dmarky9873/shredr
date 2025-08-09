from googlesearch import search

def findResturantLink(resturantName: str):
    searchQuery = f"{resturantName} Nutrition filetype:pdf"
    try:
        search_results = search(searchQuery, num_results=1)
        for result in search_results:
            return result
    except Exception as e:
        print(f"Error searching for {resturantName}: {e}")
        return None
  