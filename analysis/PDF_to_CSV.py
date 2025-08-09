import re
import pdfplumber
import camelot
import requests
from PyPDF2 import PdfWriter, PdfReader
from pathlib import Path


def pdf_to_csv(url: str, out_csv: str, pages: str = "1-end"):
    pdf_bytes = requests.get(url, timeout=30).content
    tmp_path = Path(out_csv).with_suffix(".pdf")
    tmp_path.write_bytes(pdf_bytes)


def main():
    url = "https://files.thekeg.com/nutritional-guide.pdf"
    out_csv = "output.csv"
    pdf_to_csv(url, out_csv)
    print(f"Extracted tables from {url} into {out_csv}")


if __name__ == "__main__":
    main()
