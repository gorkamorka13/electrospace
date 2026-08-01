import re

with open("pdf_extracted_text.txt", "r", encoding="utf-8") as f:
    text = f.read()

lines = text.split("\n")

# Trouver où commence le contenu réel (après le sommaire, page 7)
# Le sommaire se termine avant "--- PAGE 7 ---"
content_start = None
for i, line in enumerate(lines):
    if "--- PAGE 7 ---" in line:
        content_start = i
        break

print(f"Contenu réel commence à la ligne {content_start}")

# 1. Trouver les débuts d'exercices
exercise_starts = []
for i, line in enumerate(lines):
    if i < content_start:
        continue
    match = re.match(r'^Exercice\s+(\d+)', line)
    if match:
        num = int(match.group(1))
        exercise_starts.append((num, i, line.strip()[:90]))

print(f"Exercices trouvés après le sommaire: {len(exercise_starts)}")

# 2. Trouver les titres de chapitres APRÈS le sommaire
# Le format est "N Titre du chapitre" (sans numéro de page à la fin)
chapter_titles = [
    (1, "Rédaction, modes de raisonnement"),
    (2, "Calculs algébriques"),
    (3, "Inégalités, inéquations, trinôme du second degré réel"),
    (4, "Trigonométrie"),
    (5, "Calcul des limites"),
    (6, "Dérivation"),
    (7, "Complément : les fonctions puissances"),
    (8, "Intégration"),
    (9, "Probabilités"),
    (10, "Nombres complexes"),
    (11, "Polynômes et équations algébriques"),
    (12, "Arithmétique"),
]

chapter_positions = []
for num, title in chapter_titles:
    # Chercher "N Titre" exactement après le sommaire
    pattern = re.compile(r'^' + str(num) + r'\s+' + re.escape(title) + r'\s*$')
    for i, line in enumerate(lines):
        if i < content_start:
            continue
        if pattern.match(line.strip()):
            chapter_positions.append((num, title, i, line.strip()))
            break

print("\n=== Positions des chapitres (après sommaire) ===")
for cp in chapter_positions:
    print(f"  Chapitre {cp[0]}: ligne {cp[2]} - '{cp[3]}'")

# 3. Répartir les exercices par chapitre
print("\n=== Répartition des exercices par chapitre ===")

if len(chapter_positions) == 12:
    for idx, (num, title, line_pos, _) in enumerate(chapter_positions):
        end_pos = chapter_positions[idx + 1][2] if idx + 1 < len(chapter_positions) else len(lines)

        count = 0
        first_ex = None
        last_ex = None
        for ex_num, ex_line, ex_text in exercise_starts:
            if line_pos <= ex_line < end_pos:
                count += 1
                if first_ex is None:
                    first_ex = ex_num
                last_ex = ex_num

        print(f"  Chapitre {num}: {count} exercices (n°{first_ex} à n°{last_ex})")
else:
    print("  ATTENTION: Tous les chapitres n'ont pas été localisés!")
    # Debug: afficher les lignes autour des endroits probables
    for i, line in enumerate(lines):
        if re.match(r'^\d{1,2}\s+[A-Z]', line.strip()) and i > content_start:
            print(f"    Ligne {i}: {line.strip()[:80]}")
