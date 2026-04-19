#!/usr/bin/env python3
"""
Mini-serveur local pour lancer pronostics.html avec CORS activé.
Usage : double-cliquer sur LANCER.bat (Windows) ou exécuter 'python3 serveur.py' (Mac/Linux).
"""
import http.server
import socketserver
import webbrowser
import os
import sys
import threading

PORT = 8765
HOST = "127.0.0.1"
FICHIER = "pronostics.html"


class Handler(http.server.SimpleHTTPRequestHandler):
    # Silence les logs bruyants
    def log_message(self, fmt, *args):
        pass

    def end_headers(self):
        # En-têtes CORS ultra-permissifs pour dev local
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


def lancer():
    import subprocess

    # Se placer dans le dossier du script
    os.chdir(os.path.dirname(os.path.abspath(__file__)))

    if not os.path.exists(FICHIER):
        print(f"ERREUR : {FICHIER} introuvable dans {os.getcwd()}")
        input("Appuyez sur Entrée pour quitter...")
        sys.exit(1)

    url = f"http://{HOST}:{PORT}/{FICHIER}"
    print("=" * 60)
    print("  Pronostics Sportifs - Serveur local")
    print("=" * 60)
    print(f"  URL     : {url}")
    print(f"  Dossier : {os.getcwd()}")
    print("  Auto-refresh : activé (60s)")
    print("  Ctrl+C pour arreter le serveur.")
    print("=" * 60)

    # Lance le rafraîchissement automatique en arrière-plan
    auto_refresh_path = os.path.join(os.getcwd(), "auto_refresh.py")
    if os.path.exists(auto_refresh_path):
        try:
            log = open(os.path.join(os.getcwd(), "auto_refresh.log"), "a", encoding="utf-8")
            subprocess.Popen([sys.executable, auto_refresh_path],
                             stdout=log, stderr=log,
                             cwd=os.getcwd())
            print("  → auto_refresh.py lancé en arrière-plan (log: auto_refresh.log)")
        except Exception as e:
            print(f"  → auto_refresh désactivé ({e})")

    # Ouvrir le navigateur juste apres le demarrage
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()

    try:
        with socketserver.TCPServer((HOST, PORT), Handler) as httpd:
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServeur arrete.")
    except OSError as e:
        print(f"\nImpossible d'ouvrir le port {PORT} : {e}")
        print("Un autre programme utilise peut-etre ce port. Reessayez apres quelques secondes.")
        input("Appuyez sur Entree pour quitter...")


if __name__ == "__main__":
    lancer()
