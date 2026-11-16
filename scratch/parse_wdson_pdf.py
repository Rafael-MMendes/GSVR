import pypdf
import sys

pdf_path = r'c:\Users\PMAL-DATEN\Desktop\projetos\GSVR\util\SGT WDSON - NOV.pdf'

reader = pypdf.PdfReader(pdf_path)
print(f"Num pages: {len(reader.pages)}")
for i, page in enumerate(reader.pages):
    print(f"--- PAGE {i+1} ---")
    print(page.extract_text())

