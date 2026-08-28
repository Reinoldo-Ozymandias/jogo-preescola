#!/usr/bin/env python3
"""Servidor de desenvolvimento do jogo. OPCIONAL.

    ./servir.py          → http://localhost:8000/jogo/
    ./servir.py 8001     → outra porta

Para jogar não é preciso: o `jogo/index.html` abre com um duplo clique, sem
servidor nenhum. Isto serve para desenvolver, e dá duas coisas que o `file://`
não dá — recarregar sempre pegando o .js recém-editado (manda `Cache-Control`,
o que `python3 -m http.server` não faz) e um log sem as centenas de 404 das
ilustrações que ainda não existem.

Também é o jeito de conferir o caminho HTTP antes de hospedar em algum lugar.
"""
import socket
import sys
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer


class SemCache(SimpleHTTPRequestHandler):
    def end_headers(self):
        self.send_header("Cache-Control", "no-store, must-revalidate")
        super().end_headers()

    def log_message(self, formato, *args):
        # as ilustrações ainda não existem: seriam centenas de 404 por sessão
        if len(args) > 1 and str(args[1]) == "404" and "/img/" in str(args[0]):
            return
        super().log_message(formato, *args)


def porta_ocupada(porta):
    with socket.socket() as s:
        return s.connect_ex(("127.0.0.1", porta)) == 0


def main():
    porta = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

    if porta_ocupada(porta):
        print(f"A porta {porta} já está ocupada.\n", file=sys.stderr)
        print(f"  quem está usando:  ss -ltnp | grep :{porta}", file=sys.stderr)
        print(f"  usar outra porta:  ./servir.py {porta + 1}", file=sys.stderr)
        return 1

    print(f"Jogo:      http://localhost:{porta}/jogo/")
    print(f"Autoteste: http://localhost:{porta}/jogo/teste.html")
    print("\nCtrl+C para parar.\n")
    try:
        ThreadingHTTPServer(("127.0.0.1", porta), SemCache).serve_forever()
    except KeyboardInterrupt:
        print("\nservidor encerrado")
    return 0


if __name__ == "__main__":
    sys.exit(main())
