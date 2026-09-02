# Boardside

App de xadrez com treinador de IA. Feito para telemóvel: o chat fica reduzido à última mensagem e abre quando queres perguntar ou ver o histórico. O treinador marca casas e setas no tabuleiro.

Tens dois modos:

- **Bot** — jogas contra um motor local (fácil / clube / afiado)
- **Coach** — a IA joga do outro lado e explica as jogadas

Corre **sem chave de API**. Com `AI_GATEWAY_API_KEY` o treinador passa a usar um modelo live (Claude via Vercel AI Gateway).

## Correr localmente

Precisas de **Node.js 20+** e npm.

```bash
git clone https://github.com/luisvieiragmr/boardside.git
cd boardside
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

### Sem git (ZIP)

Descompacta o ZIP, entra na pasta e corre os mesmos comandos `npm install` e `npm run dev`.

### Treinador live (opcional)

```bash
cp .env.example .env.local
```

Edita `.env.local` e coloca a chave do [Vercel AI Gateway](https://vercel.com/ai-gateway). Reinicia o `npm run dev`.

## Scripts

| Comando | O quê |
| --- | --- |
| `npm run dev` | servidor de desenvolvimento |
| `npm run build` | build de produção |
| `npm run start` | corre o build |
| `npm run lint` | ESLint |

## Stack

Next.js 16 (App Router), React 19, Tailwind CSS 4, chess.js, react-chessboard, Vercel AI SDK.
