# Planos de edição (plano.json)

Depois do `prep`, a pasta do job tem `transcricao.txt`, com cada palavra e o segundo em que ela é falada. O plano diz **o que aparece na tela e quando**. Sempre use os tempos da transcrição: um card deve entrar no momento em que a palavra correspondente é dita.

## Campos que valem para todos os estilos

| campo | o que faz |
|---|---|
| `cor` | cor de destaque em hex. Padrão `#E8622C` (laranja). |
| `legendas` | `false` desliga as legendas. Padrão: ligadas. |
| `correcoes` | troca palavras que a transcrição errou, por exemplo `{"Clint": "Klint", "cloud": "Claude"}`. Só troca palavra inteira. Chaves com até 3 letras diferenciam maiúscula de minúscula: `{"A": "IA"}` não mexe no "a" comum. |

Regras gerais:
- Os tempos (`ini`, `fim`, `em`, `ate`) são segundos do vídeo final, ou seja, os mesmos da `transcricao.txt`.
- Os textos da tela saem da fala. Não invente números, nomes ou resultados que a pessoa não disse.
- Use textos curtos: títulos com até 8 palavras e itens com até 4. O motor reduz a fonte quando falta espaço, mas texto curto fica melhor.
- Sem emoji nos textos. A fonte do vídeo não tem emoji.

---

## negocios → /reel-negocios

Alterna três modos a cada corte, com tranco e flash na troca:
- `cheia`: a pessoa ocupa a tela inteira.
- `dividida`: card animado em cima e a pessoa embaixo.
- `animacao`: tela cheia na cor de destaque, com 2 a 4 palavras gigantes.

```json
{
  "cor": "#E8622C",
  "segmentos": [
    {"ini": 0,    "fim": 3.4,  "modo": "cheia"},
    {"ini": 3.4,  "fim": 7.9,  "modo": "dividida", "tipo": "numero", "rotulo": "MENSAGENS ENVIADAS", "valor": 2500, "sufixo": "+", "legenda": "entregues"},
    {"ini": 7.9,  "fim": 9.6,  "modo": "animacao", "palavras": ["USANDO", "API", "OFICIAL"]},
    {"ini": 9.6,  "fim": 14.0, "modo": "dividida", "tipo": "lista", "titulo": "O que você precisa", "destaque": "precisa", "itens": ["Conta Meta", "Número novo", "Template aprovado"]},
    {"ini": 14.0, "fim": 18.2, "modo": "dividida", "tipo": "texto", "rotulo": "DICA", "texto": "Nunca use seu número pessoal", "destaque": "pessoal"},
    {"ini": 18.2, "fim": 22.0, "modo": "cheia"}
  ]
}
```
- Corte a cada 2 a 5 segundos, sempre num fim de frase. Comece com `cheia` (o gancho com o rosto) e termine com `cheia` (o CTA).
- Use `animacao` em 1 ou 2 momentos de impacto, com 1,5 a 2,5 s cada. Sem `palavras`, o motor usa as palavras faladas naquele trecho, cada uma no seu tempo.
- Tipos de card da `dividida`:
  - `numero`: campos `rotulo`, `valor`, `prefixo`, `sufixo`, `legenda`. O valor conta subindo.
  - `lista`: campos `titulo`, `destaque` e `itens` (até 5).
  - `texto`: campos `rotulo`, `texto` e `destaque`.

## ranking → /formato-ranking

Lista ranqueada em cima, com um card entrando por vez e o vencedor ganhando um selo. A pessoa fica embaixo.

```json
{
  "titulo": "3 jeitos de disparar pela",
  "destaque": "API oficial",
  "itens": [
    {"titulo": "Software pago", "sub": "mensalidade + taxa por envio", "em": 4.2},
    {"titulo": "Na mão", "sub": "n8n e várias chamadas de API", "em": 8.9},
    {"titulo": "Seu próprio sistema", "sub": "sem mensalidade", "em": 13.1}
  ],
  "vencedor": 3,
  "selo": "O MEU ✓",
  "selo_em": 15.0,
  "tema": "claro"
}
```
- De 2 a 6 itens. Cada `em` é o segundo em que o item começa a ser falado.
- `vencedor` é opcional e conta a partir de 1. Os outros itens apagam quando o selo entra.
- `tema` aceita `claro` (padrão) ou `escuro`.

## profundidade → /reel-profundidade

A pessoa aparece recortada na frente e as janelas de interface flutuam atrás da cabeça. O fundo é o próprio vídeo, desfocado e escurecido.

```json
{
  "cor": "#E8622C",
  "janelas": [
    {"tipo": "campos",   "titulo": "Configuração da API", "campos": ["Token", "ID da conta", "ID do número"], "em": 1.0},
    {"tipo": "terminal", "titulo": "terminal", "linhas": ["$ enviar --lista clientes.csv", "200 OK · enviado", "200 OK · enviado"], "em": 3.5},
    {"tipo": "status",   "texto": "API conectada", "em": 6.0},
    {"tipo": "mensagem", "titulo": "template", "texto": "Oi, {{nome}}! Promo de hoje só pra você", "em": 8.2},
    {"tipo": "lista",    "titulo": "checklist", "itens": ["Conta verificada", "Número ativo"], "em": 11.0},
    {"tipo": "grafico",  "titulo": "respostas", "valores": [3, 5, 4, 8, 7, 11], "em": 13.0},
    {"tipo": "imagem",   "titulo": "print", "src": "C:/Users/voce/Desktop/print.png", "em": 15.0, "ate": 19.0}
  ]
}
```
- De 2 a 6 janelas, cada uma entrando no momento em que o assunto aparece na fala. `ate` (opcional) tira a janela de cena.
- Tipos de janela:
  - `campos`: formulário que se preenche. Aceita `valores` para mostrar texto em vez de pontinhos.
  - `terminal`: linhas digitadas.
  - `status`: selo de ok.
  - `mensagem`: balão de texto.
  - `lista`: checklist.
  - `grafico`: barras.
  - `imagem`: print do usuário, com o caminho completo ou relativo à pasta do job.
- `posicao` (de 1 a 8, opcional) fixa o lugar da janela.
- `topo_cabeca` (padrão 760) é a altura, em pixels de 0 a 1920, onde fica o topo da cabeça. `escala_pessoa` (padrão 1) aumenta ou diminui a pessoa.

## grade → /grade-recorte

Quatro blocos (2x2) preenchem a tela e viram juntos em 3D a cada troca. A pessoa aparece recortada no centro, com contorno branco.

```json
{
  "fundo": "#E8622C",
  "conjuntos": [
    {"em": 0,   "blocos": [
      {"rotulo": "QUEM", "texto": "Pedro Zanatta", "cor": "#E8622C"},
      {"rotulo": "ONDE", "texto": "Gramado · RS", "cor": "#151515"},
      {"rotulo": "FOCO", "texto": "IA", "cor": "#F3F1EC"},
      {"rotulo": "FOCO", "texto": "Automação", "cor": "#2160E0"}
    ]},
    {"em": 4.8, "blocos": [
      {"imagem": "fotos/1.jpg"}, {"imagem": "fotos/2.jpg"},
      {"rotulo": "FAZ", "texto": "Disparos"}, {"rotulo": "FAZ", "texto": "CRM"}
    ]}
  ]
}
```
- Cada conjunto tem exatamente 4 blocos, na ordem: cima-esquerda, cima-direita, baixo-esquerda e baixo-direita.
- Os blocos de baixo ficam quase todos atrás da pessoa, só o topo deles aparece. Use neles 1 palavra curta.
- Um bloco pode ser texto (`rotulo`, `texto`, `cor`, `corTexto`) ou imagem (`imagem`). Sem `cor`, o motor usa uma paleta padrão.
- Troque de conjunto a cada 3 a 6 segundos, sempre num fim de frase.
- `topo_cabeca` (padrão 880) e `escala_pessoa` (padrão 1) ajustam a posição e o tamanho da pessoa.

## painel → /painel-explicativo

Explicação animada na parte de cima, que troca de cena conforme a fala. A pessoa fica num painel com borda colorida embaixo.

```json
{
  "cor": "#E8622C",
  "cenas": [
    {"em": 0,    "tipo": "chips",  "titulo": "Disparos segmentados por estado", "destaque": "segmentados", "itens": ["RS", "SC", "PR", "SP", "RJ", "MG"], "ativos": [1, 3, 5]},
    {"em": 6.2,  "tipo": "barras", "titulo": "Relatório automático", "rotulo": "ÚLTIMO ENVIO", "itens": ["Entregues", "Lidas", "Respondidas"]},
    {"em": 11.5, "tipo": "passos", "titulo": "Como montar", "itens": ["Conecte a API", "Suba a lista", "Escolha o template"]},
    {"em": 16.0, "tipo": "numero", "titulo": "Custo por mensagem", "valor": "0,05", "prefixo": "R$ ", "rotulo": "na API oficial"},
    {"em": 20.0, "tipo": "texto",  "titulo": "Resumo", "texto": "Você paga só o que enviar, sem mensalidade."}
  ]
}
```
- Cada cena fica na tela até a próxima começar. Troque a cada 4 a 7 segundos.
- Os itens de `chips`, `barras` e `passos` podem ser texto simples, como `"Conecte a API"`, ou objetos com tempo próprio, como `{"texto": "Conecte a API", "em": 13.9}`. Com o tempo, o item entra no segundo exato em que é falado. Sem ele, os itens entram em sequência logo depois do título.
- `destaque` pinta as palavras do título na cor de destaque.
- Tipos de cena:
  - `chips`: até 9 itens. `ativos` acende alguns deles, contando a partir de 1.
  - `barras`: até 5 itens. Cada item pode ser `{"texto": "Lidas", "valor": 80}`.
  - `passos`: até 5 itens.
  - `numero`: campos `valor`, `prefixo`, `sufixo` e `rotulo`.
  - `texto`: campo `texto`.

## pessoal → /reel-pessoal

Cortes rápidos (o `prep` já remove os silêncios), zoom que muda a cada frase, legenda gigante de uma palavra por vez e granulado. O plano é **opcional**.

```json
{
  "destaques": ["importante", "nunca", "grátis", "dinheiro"],
  "correcoes": {"cloud": "Claude"}
}
```
- `destaques` são as palavras-chave da fala. Cada uma ganha caixa amarela, tremida e efeito RGB. Escolha de 3 a 8 palavras fortes que a pessoa realmente fala.
