---
name: painel-explicativo
description: Edita um vídeo seu no estilo painel explicativo: explicação animada em cima (chips, barras, passos, número grande ou texto) que troca conforme a fala, e você num painel com borda colorida embaixo. Use quando pedirem /painel-explicativo, um "explicativo" ou um tutorial animado.
---

# Painel Explicativo

Explicação animada na parte de cima, que troca de cena conforme a fala (chips, relatório com barras, passos, número grande ou texto). Você aparece num painel com borda colorida embaixo.

Funciona no **Claude Code**, no computador da pessoa. O motor de edição roda localmente, então nada é enviado para fora.

## Onde fica o motor

O motor é a pasta `motor-reels`, que fica **ao lado** da pasta desta skill. Ele é compartilhado pelos 6 estilos.
- Caminho: `<pasta desta skill>/../motor-reels/motor.py`. Use o caminho absoluto. A pasta desta skill aparece como "Base directory" quando ela é carregada.
- Comando do Python:
  - macOS e Linux: `python3`.
  - Windows: `python` ou `py`. Teste qual dos dois existe.
- Sempre coloque os caminhos entre aspas, porque eles podem ter espaços.

## Passo a passo

1. **Instalação (só na primeira vez).** Rode `python3 "<motor>/motor.py" diagnostico`.
   - Se aparecer FALTA em algum item, rode `python3 "<motor>/motor.py" setup`. Leva de 5 a 15 minutos e baixa cerca de 1 GB: bibliotecas, modelo de recorte, navegador e modelo de transcrição.
   - Avise a pessoa que é só na primeira vez.
   - Se faltar o Node.js, instale antes de rodar o setup:
     - macOS: `brew install node`.
     - Windows: `winget install OpenJS.NodeJS.LTS`.
   - Se faltar o Python no Windows: `winget install Python.Python.3.12`.
2. **O vídeo.** Peça o caminho do vídeo se a pessoa ainda não passou.
   - O ideal é a pessoa falando para a câmera, com áudio limpo, entre 15 e 90 segundos. Pode ser vertical ou horizontal.
   - Se o vídeo for longo, pergunte qual trecho usar e passe `--inicio` e `--fim` em segundos.
3. **Preparar.** Rode:
   `python3 "<motor>/motor.py" prep "<video>" --estilo painel`
   - Acrescente `--vocab "Nome1, Marca2, Termo3"` com nomes próprios e termos técnicos que a pessoa costuma falar. Isso melhora a transcrição.
   - O prep leva de 1 a 5 minutos. Nos estilos com recorte (profundidade e grade) pode levar mais, porque ele recorta a pessoa quadro a quadro.
   - O prep cria a pasta `<nome-do-video>_painel_job` ao lado do vídeo. Dentro dela ficam `transcricao.txt` e `job.json`.
4. **Ler a fala.** Leia `transcricao.txt` inteira e entenda o roteiro: gancho, pontos principais e CTA. Anote os segundos de cada momento-chave.
5. **Escrever o plano.** Crie `plano.json` dentro da pasta do job, seguindo a seção **painel** de `<motor>/PLANOS.md` (leia esse arquivo).
   - Os textos da tela saem da fala. Não invente números nem promessas que a pessoa não fez.
   - Se a transcrição errou algum nome, corrija com `correcoes`.
   - Divida a fala em 3 a 6 cenas, cada uma com um título curto tirado do que é dito.
   - Escolha o tipo de cena que melhor ilustra cada trecho.
6. **Conferir antes de renderizar.** Rode `python3 "<motor>/motor.py" stills "<pasta do job>" 1 5 10 15`, escolhendo de 4 a 6 momentos importantes.
   - As imagens saem em `<pasta do job>/conferencia/`. Abra cada uma.
   - Se algum texto estiver cortado, sobreposto ou fora do tempo, ajuste o plano e confira de novo.
7. **Renderizar.** Rode `python3 "<motor>/motor.py" render "<pasta do job>"`.
   - Leva alguns minutos e mostra o progresso.
   - O vídeo final sai ao lado do original, com o nome `<nome>_painel.mp4`.
8. **Entregar.** Diga onde o arquivo ficou. Ofereça apagar a pasta do job, que é grande porque guarda os quadros do vídeo.

## Se der erro

- **"plano.json"**: o motor lista exatamente o que está errado no plano. Corrija e rode de novo.
- **"Node.js não encontrado" ou "navegador"**: rode o `setup` de novo.
- **Transcrição ruim**: rode o prep com `--modelo medium`. É mais lento e mais preciso.
- **Pessoa mal enquadrada**: confira os stills. O motor centraliza na pessoa automaticamente, mas o vídeo precisa mostrar a pessoa inteira no quadro.
