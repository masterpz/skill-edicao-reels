---
name: motor-reels
description: Motor compartilhado da skill de edição de reels. Instala, diagnostica e renderiza os 6 estilos (reel-negocios, formato-ranking, reel-profundidade, grade-recorte, painel-explicativo, reel-pessoal). Use quando pedirem para instalar ou configurar a skill de edição, quando der erro de instalação, ou quando um dos estilos precisar rodar o setup.
---

# Motor de edição de reels

Esta pasta contém o motor usado pelos 6 estilos de edição. Ele faz cinco coisas:
- Corta o vídeo para o formato vertical, centralizado na pessoa.
- Transcreve a fala com o tempo de cada palavra (faster-whisper, roda local).
- Recorta a pessoa do fundo (modelo u2net, roda local).
- Monta cada quadro num navegador sem janela (Playwright).
- Gera o mp4 final com o áudio original (ffmpeg).

## Comandos

Use sempre o caminho absoluto deste `motor.py`, entre aspas. No Windows, troque `python3` por `python` ou `py`.

| comando | para que serve |
|---|---|
| `python3 motor.py setup` | Instala tudo, uma vez só (5 a 15 min, cerca de 1 GB). |
| `python3 motor.py diagnostico` | Mostra o que está instalado e o que falta. |
| `python3 motor.py prep VIDEO --estilo NOME` | Prepara o vídeo. Opções: `--inicio`, `--fim`, `--vocab`, `--modelo small/medium`, `--cortar-silencios sim/nao`, `--idioma pt`. |
| `python3 motor.py stills PASTA_DO_JOB 1 5 10` | Gera imagens de conferência nesses segundos. |
| `python3 motor.py render PASTA_DO_JOB` | Gera o vídeo final. Opções: `--saida arquivo.mp4` e `--workers N`. |

Nomes de estilo para o `--estilo`: `negocios`, `ranking`, `profundidade`, `grade`, `painel` e `pessoal`.

O formato do `plano.json` de cada estilo está em `PLANOS.md`, nesta mesma pasta.

## Instalação: o que fazer quando faltar algo

- **Python 3.9+**
  - macOS: já vem instalado, ou use `brew install python`.
  - Windows: `winget install Python.Python.3.12`.
  - Linux: `sudo apt install python3 python3-venv`.
- **Node.js 18+**
  - macOS: `brew install node`.
  - Windows: `winget install OpenJS.NodeJS.LTS`.
  - Também dá para baixar em https://nodejs.org.
- **ffmpeg**: não precisa instalar. Se não existir no sistema, o motor usa o que vem com a biblioteca `imageio-ffmpeg`.
- **Navegador**: o setup tenta, nesta ordem, o Chromium do Playwright, o Google Chrome e o Microsoft Edge. Se nenhum abrir, ele baixa o Chromium.

Depois de instalar o que faltava, rode o `setup` de novo. Ele pula o que já está pronto.

Se o `pip` falhar com um Python muito novo (3.14 ou mais), faça o seguinte:
1. Instale o Python 3.12.
2. Apague a pasta `.venv` deste motor.
3. Rode o setup com o 3.12: `py -3.12 motor.py setup` no Windows ou `python3.12 motor.py setup` no macOS.
