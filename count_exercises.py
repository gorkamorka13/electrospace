import re
from PyPDF2 import PdfReader

pdf_path = r"C:\Latex\Sup\PrepaSup\EXOS-TERMINALE3-3-versCPGE.pdf"
reader = PdfReader(pdf_path)
print(f"Nombre de pages: {len(reader.pages)}")

full_text = ""
for i, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    full_text += f"\n--- PAGE {i+1} ---\n" + text

# Sauvegarder le texte complet pour analyse
with open("pdf_extracted_text.txt", "w", encoding="utf-8") as f:
    f.write(full_text)

# Compter les exercices - chercher "Exercice N" où N est un nombre
# Le pattern peut être "Exercice 1", "Exercice 2", etc.
exercise_pattern = re.compile(r'Exercice\s+(\d+)', re.IGNORECASE)
matches = exercise_pattern.findall(full_text)

print(f"\nNombre total d'occurrences 'Exercice N': {len(matches)}")
print(f"Numéros trouvés: {matches[:50]}...")

# Chercher aussi les numéros max pour voir la plage
if matches:
    nums = [int(m) for m in matches]
    print(f"Min: {min(nums)}, Max: {max(nums)}")

# Chercher les titres de chapitres
chapter_pattern = re.compile(r'^\s*(\d+)\s+([A-ZÀ-Ü][^\n]+)$', re.MULTILINE)
chapters = chapter_pattern.findall(full_text)
print(f"\nChapitres potentiels: {chapters[:30]}")
