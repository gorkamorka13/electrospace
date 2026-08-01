import re

# Lire le texte extrait
with open("pdf_extracted_text.txt", "r", encoding="utf-8") as f:
    text = f.read()

# Trouver les lignes contenant "Exercice N"
# Le format est "Exercice N (difficulté)/circlecopyrt" ou "Exercice N (...)"
# Il faut EXCLURE les références croisées comme "cf exercice 440", "l'exercice 3", etc.

lines = text.split("\n")

# Identifier les vrais débuts d'exercices (en début de ligne ou après un saut de page)
exercise_starts = []
for i, line in enumerate(lines):
    # Chercher "Exercice N" en début de ligne (après le marqueur de page)
    # Format typique: "Exercice 25 (1/circlecopyrt)." ou "Exercice 3 (2/circlecopyrt)."
    if re.match(r'^Exercice\s+(\d+)', line):
        num = int(re.match(r'^Exercice\s+(\d+)', line).group(1))
        exercise_starts.append((num, i, line.strip()[:80]))

print(f"=== Débuts d'exercices trouvés: {len(exercise_starts)} ===")
print(f"Plage: {exercise_starts[0][0]} à {exercise_starts[-1][0]}")

# Vérifier les numéros manquants dans la séquence
nums = [e[0] for e in exercise_starts]
expected = set(range(1, max(nums) + 1))
found = set(nums)
missing = sorted(expected - found)
print(f"\nNuméros manquants: {missing}")
print(f"Nombre de numéros uniques: {len(found)}")

# Trouver les titres de chapitres
# Dans le PDF, les chapitres sont formatés comme "1  Rédaction, modes de raisonnement"
# mais aussi "Chapitre 1" ou juste le numéro suivi du titre
print("\n=== Recherche des titres de chapitres ===")
# Chercher les lignes qui semblent être des titres de chapitre
for i, line in enumerate(lines):
    # Titre de chapitre: numéro + texte, ligne assez courte, pas un numéro de page
    m = re.match(r'^(\d{1,2})\s{2,}([A-ZÀ-Ü][A-Za-zÀ-ÿ ,:\'\-éèêëîïôöùûüç]+)$', line.strip())
    if m and len(line.strip()) < 80 and i > 300:  # après le sommaire
        print(f"  Ligne {i}: {line.strip()}")
