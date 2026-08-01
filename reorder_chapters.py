import re

path = r"C:\Latex\Sup\PrepaSup\EXOS-TERMINALE3-3-versCPGE.tex"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# Trouver les positions des sections de chapitres
ch1_marker = "% CHAPITRE 1"
ch2_marker = "% CHAPITRE 2"

ch1_pos = content.find(ch1_marker)
ch2_pos = content.find(ch2_marker)

print(f"Position CHAPITRE 1: {ch1_pos}")
print(f"Position CHAPITRE 2: {ch2_pos}")

if ch1_pos > ch2_pos:
    print("Les chapitres sont inversés — correction...")

    # Extraire les deux blocs
    # Le bloc chapitre 1 va de ch1_marker jusqu'à la fin du fichier ou jusqu'au prochain \newpage + section
    # Le bloc chapitre 2 va de ch2_marker jusqu'à ch1_marker

    # Trouver la fin du bloc chapitre 2 (juste avant le début du chapitre 1)
    # Le contenu entre ch2_pos et ch1_pos est le bloc chapitre 2
    # Le contenu entre ch1_pos et la fin est le bloc chapitre 1

    bloc_ch2 = content[ch2_pos:ch1_pos]
    bloc_ch1 = content[ch1_pos:]

    print(f"Longueur bloc ch2: {len(bloc_ch2)}")
    print(f"Longueur bloc ch1: {len(bloc_ch1)}")

    # Réordonner : partie avant ch2 + bloc ch1 + bloc ch2
    prefix = content[:ch2_pos]
    new_content = prefix + bloc_ch1 + bloc_ch2

    with open(path, "w", encoding="utf-8") as f:
        f.write(new_content)

    print("Correction effectuée !")
else:
    print("L'ordre est correct.")
