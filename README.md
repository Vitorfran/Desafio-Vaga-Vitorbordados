# Portal de Desafio — Vitor Bordados

Protótipo React do portal de seleção para programadores de bordado.

## Banco de dados escolhido

Usaremos **PostgreSQL** na versão de produção. Ele é adequado para:

- usuários candidatos e administradores;
- perfis profissionais;
- desafios e versões do briefing;
- submissões com histórico de arquivos;
- avaliações e auditoria;
- filtros e relatórios administrativos.

Para uma próxima etapa, a recomendação é usar PostgreSQL com **Prisma** ou
**Drizzle ORM** e armazenamento de arquivos em S3, Cloudflare R2 ou Supabase
Storage. O protótipo atual usa dados simulados no frontend e ainda não grava em
banco.

## Como executar

```bash
npm install
npm run dev
```

Depois, abra o endereço informado pelo Vite no navegador.

## Prévia do protótipo

O botão “Prévia do administrador”, no canto inferior direito, alterna entre a
visão do candidato e o painel administrativo. O envio de arquivo é simulado no
frontend para demonstrar o fluxo antes da integração com API e armazenamento.

## Arquivos principais

- `SPEC.md` — especificação funcional e técnica do produto.
- `src/main.jsx` — telas do portal conectadas à autenticação, ao banco e ao armazenamento.
- `src/styles.css` — identidade visual, responsividade e comentários em português.
- `public/logo.png` — logo fornecida para o portal.
