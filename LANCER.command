#!/bin/bash
cd "$(dirname "$0")"
if command -v python3 >/dev/null 2>&1; then
  python3 serveur.py
elif command -v python >/dev/null 2>&1; then
  python serveur.py
else
  echo "Python n'est pas installe. Installez-le depuis https://www.python.org/downloads/"
  read -p "Appuyez sur Entree pour quitter..."
fi
