# Skill de Edição de Reels com IA

São 6 comandos para o **Claude Code** que pegam um vídeo seu falando para a câmera e devolvem o reel pronto: vertical 1080x1920, com legenda grande sincronizada e a edição montada a partir do que você fala.

Feito por **Pedro Zanatta** ([@pedrozanatta1](https://instagram.com/pedrozanatta1)) · Gramado Publicidade

## Os 6 estilos

| comando | o que faz | bom para |
|---|---|---|
| `/reel-negocios` | Alterna tela cheia, tela dividida (card animado com número, lista ou texto em cima e você embaixo) e animação de palavras gigantes. Cada corte tem tranco e flash. | dados, resultados, provas |
| `/formato-ranking` | Lista ranqueada em cima que preenche um card por vez, quando você fala cada item. O vencedor ganha um selo. | top 3, comparações |
| `/reel-profundidade` | Você recortado na frente e janelas de interface flutuando atrás da sua cabeça: formulário, terminal, mensagem, gráfico ou seus prints. | tutoriais de ferramenta |
| `/grade-recorte` | Você recortado, com contorno branco, no centro de 4 blocos de texto ou foto que viram em 3D a cada troca. | apresentação pessoal, resumos |
| `/painel-explicativo` | Explicação animada em cima (chips, barras, passos, número grande) que troca conforme a fala. Você num painel embaixo. | passo a passo |
| `/reel-pessoal` | Corta os silêncios sozinho, muda o zoom a cada frase e mostra legenda gigante de uma palavra, com destaque nas palavras-chave. | storytelling, opinião |

## O que você precisa

- **Claude Code** no computador (app de desktop ou terminal). Precisa de um plano pago do Claude.
- macOS, Windows ou Linux.
- Python 3.9+ e Node.js 18+. Se não tiver, o Claude instala para você.
- Cerca de 2 GB livres.

## Instalação

**Jeito fácil.** Abra o Claude Code e cole:

```
https://github.com/masterpz/skill-edicao-reels
Instala essa skill e roda o setup do motor.
```

**Jeito manual:**

```bash
git clone https://github.com/masterpz/skill-edicao-reels.git
cp -r skill-edicao-reels/skills/* ~/.claude/skills/
python3 ~/.claude/skills/motor-reels/motor.py setup
```

No Windows, a pasta é `%USERPROFILE%\.claude\skills\` e o comando é `python` em vez de `python3`.

**Como plugin:**

```
/plugin marketplace add masterpz/skill-edicao-reels
/plugin install edicao-reels
```

O setup baixa as ferramentas (transcrição, recorte, navegador do renderizador) **uma vez só**. Leva de 5 a 15 minutos.

## Como usar

1. Grave você falando para a câmera, entre 15 e 90 segundos, com áudio limpo e você inteiro no quadro. Pode ser vertical ou horizontal.
2. No Claude Code, peça:
   ```
   /reel-negocios edita o vídeo C:\Users\voce\Desktop\take.mp4
   ```
3. O Claude transcreve a fala, monta o plano da edição, confere algumas prévias e renderiza.
4. O vídeo sai ao lado do original, com o nome `take_negocios.mp4`.

Você pode pedir ajustes em texto livre: "muda a cor pra azul", "usa minhas fotos na grade", "corrige o nome na legenda" ou "só do segundo 10 ao 40".

## Dicas

- Fale de frente para a câmera e com boa luz. O recorte e o enquadramento ficam melhores assim.
- Passe os nomes próprios e termos técnicos que você fala ("Claude Code, n8n, Meta"). A legenda acerta mais.
- Um vídeo de 30 s leva de 2 a 5 minutos para renderizar, dependendo do computador.
- Tudo roda no seu computador e o seu vídeo não sobe para lugar nenhum.

---

## Instruções para o Claude (instalação)

Quando o usuário pedir para instalar esta skill:

1. Clone o repositório numa pasta temporária: `git clone https://github.com/masterpz/skill-edicao-reels.git`.
2. Copie **todas** as pastas de `skills/` para `~/.claude/skills/` (Windows: `%USERPROFILE%\.claude\skills\`). Todas precisam ficar lado a lado, porque os estilos usam a pasta `motor-reels`.
3. Rode o setup com o caminho absoluto: `python3 ~/.claude/skills/motor-reels/motor.py setup` (Windows: `python` ou `py`).
   - Se faltar Python ou Node, instale seguindo `skills/motor-reels/SKILL.md` e rode o setup de novo.
4. Confirme rodando `python3 ~/.claude/skills/motor-reels/motor.py diagnostico`. Não pode aparecer nenhum "FALTA".
5. Diga ao usuário que os comandos `/reel-negocios`, `/formato-ranking`, `/reel-profundidade`, `/grade-recorte`, `/painel-explicativo` e `/reel-pessoal` estão prontos. Para ativar as skills, pode ser preciso reiniciar o Claude Code.

## Licença

MIT. Pode usar, modificar e compartilhar.
