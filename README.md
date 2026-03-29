# Tell Your Story Web

Frontend em React para o jogo `Tell Your Story`.

## Stack

- React 19
- TypeScript
- Vite
- Vitest + Testing Library

## Funcionalidades atuais

- criação e entrada em sala
- seleção de avatar
- persistência de sessão local
- integração HTTP com a API
- sincronização realtime por WebSocket
- fluxo visual do jogo `Tell Your Story`
- base documental para o modo `three-lies-one-truth`

## Requisitos

- Node.js 20+
- npm

## Configuração

Crie o arquivo `.env` a partir do exemplo:

```powershell
Copy-Item .env.example .env
```

Variáveis:

```env
VITE_API_BASE_URL=http://localhost:8080
VITE_WS_BASE_URL=ws://localhost:8080
```

Para produção, aponte para a API publicada:

```env
VITE_API_BASE_URL=https://SEU_BACKEND_PUBLICO
VITE_WS_BASE_URL=wss://SEU_BACKEND_PUBLICO
```

## Como rodar

Instale as dependências:

```powershell
npm install
```

Inicie em desenvolvimento:

```powershell
npm run dev
```

Build de produção:

```powershell
npm run build
```

Preview local do build:

```powershell
npm run preview
```

Testes:

```powershell
npm test
```

## Estrutura principal

- `src/App.tsx`
  - composição principal da aplicação
- `src/components`
  - painéis e componentes da interface
- `src/hooks`
  - sessão, realtime e dados de rodada
- `src/lib`
  - utilitários e catálogos locais
- `src/assets`
  - branding e assets locais
- `public/avatars`
  - avatares disponíveis no jogo

## Fluxo atual

1. usuário cria ou entra em uma sala
2. sessão local é persistida com `user_id` e `session_token`
3. frontend sincroniza com a API via HTTP
4. frontend assina atualizações em tempo real via WebSocket
5. a interface renderiza o estado autoritativo da sala

## Documentação complementar

Especificações do modo `three-lies-one-truth`:

- `C:\projects\tell-your-story\docs\THREE-LIES-ONE-TRUTH_GHERKIN_API.md`
- `C:\projects\tell-your-story\docs\THREE-LIES-ONE-TRUTH_GHERKIN_WEB.md`
