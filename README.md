# Portal de Desafio — Vitor Bordados

Portal de processo seletivo para programadores de bordado da Vitor Bordados.

Repositório: https://github.com/Vitorfran/Desafio-Vaga-Vitorbordados

## Quem somos

A Vitor Bordados é uma empresa de Blumenau, Santa Catarina, com foco no
fornecimento de matrizes de bordado e no atendimento de pequenas quantidades.
O portal aproxima a empresa de profissionais de bordado e organiza todo o
processo de seleção em um só lugar.

## Funcionalidades

- Cadastro e login de candidatos pelo Supabase Auth.
- Controle de acesso por função: candidato e administrador.
- Perfil profissional com experiência em Wilcom, nível, idioma, localização,
  portfólio e descrição.
- Publicação de desafios com briefing e arquivos de referência.
- Envio de arquivos de resultado em formatos de bordado e imagem.
- Painel administrativo com candidatos, entregas, arquivos e avaliações.
- Alteração do status da candidatura para enviado, análise, aprovado ou
  desclassificado.
- Tela institucional “Quem somos”.

## Stack

- React + Vite
- Supabase Auth, PostgreSQL e Storage
- Lucide React
- Vercel para hospedagem do frontend

## Executar localmente

```bash
pnpm install
pnpm dev
```

Crie um arquivo `.env` com as variáveis públicas do Supabase:

```env
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publica
```

Nunca coloque a chave secreta do Supabase em uma variável `VITE_` ou no
frontend.

## Banco de dados

Execute `database/supabase-schema.sql` no SQL Editor do Supabase. Para bancos
que já possuem as tabelas, execute também as migrações em
`database/migrations/`.

## Produção na Vercel

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` no ambiente
**Production** da Vercel e faça um novo deploy após qualquer alteração.

O arquivo `vercel.json` mantém as rotas da aplicação React funcionando,
incluindo `/admin/login`.

## Estrutura principal

- `src/main.jsx` — entrada da aplicação e navegação do candidato.
- `src/components/Login.jsx` — autenticação.
- `src/components/Dashboard.jsx` — visão geral do candidato.
- `src/components/Desafio.jsx` — briefing, referências e envio de arquivos.
- `src/components/Admin.jsx` — painel administrativo.
- `src/components/QuemSomos.jsx` — apresentação institucional.
- `src/styles.css` — identidade visual e responsividade.
- `database/` — schema e migrações do Supabase.
- `public/logo.png` — logo da Vitor Bordados.
