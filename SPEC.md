# Portal de Desafio — Vitor Bordados

## 1. Objetivo

Construir um portal para seleção de programadores de bordado da Vitor Bordados.
O candidato cria um perfil profissional, acessa um caso/desafio de programação,
envia o resultado produzido e acompanha o status da avaliação. O administrador
visualiza, filtra e compara candidatos, seus perfis, arquivos enviados e histórico
de avaliação.

## 2. Escopo do MVP

### Incluído

- Cadastro de candidato com nome, e-mail, telefone opcional e experiência com Wilcom.
- Campo de descrição profissional e portfólio/link opcional.
- Login seguro e recuperação de acesso.
- Apresentação de um desafio com briefing, anexos de referência e prazo.
- Upload do resultado do desafio.
- Campo de observações do candidato sobre a solução.
- Área administrativa protegida.
- Listagem, busca, filtros e visualização detalhada dos candidatos.
- Download/visualização dos arquivos enviados.
- Avaliação interna com notas, comentários e status.
- Registro de data/hora das principais ações.

### Fora do MVP

- Correção automática de qualidade do arquivo de bordado.
- Integração direta com Wilcom ou abertura automática de arquivos no computador do avaliador.
- Agendamento de entrevistas.
- Envio automático de e-mails transacionais avançados.
- Múltiplos desafios simultâneos por candidato.

## 3. Perfis de usuário

### Candidato

Pode criar e editar seu cadastro, consultar o desafio, enviar ou substituir o
resultado enquanto o prazo estiver aberto e acompanhar o status da avaliação.
Não pode visualizar dados de outros candidatos nem avaliações internas.

### Administrador

Pode criar/editar o desafio, visualizar candidatos, baixar os arquivos, registrar
avaliação, alterar status e exportar a listagem. Deve existir pelo menos um
administrador inicial criado por configuração segura do ambiente.

## 4. Fluxo principal do candidato

1. Acessa a página do processo seletivo.
2. Cria uma conta informando nome, e-mail e senha.
3. Preenche o perfil profissional:
   - nome completo;
   - e-mail;
   - telefone/WhatsApp opcional;
   - cidade/estado opcional;
   - há quanto tempo trabalha com Wilcom;
   - nível de experiência com Wilcom;
   - descrição profissional;
   - link de portfólio opcional.
4. Confirma ciência do tratamento dos dados e envia o cadastro.
5. Visualiza o briefing do desafio, requisitos e prazo.
6. Prepara o arquivo conforme as instruções.
7. Envia o resultado e, opcionalmente, uma imagem de prévia e comentários.
8. Confirma a submissão.
9. Visualiza o protocolo, data/hora e status “Enviado”.
10. Aguarda a avaliação.

## 5. Fluxo principal do administrador

1. Faz login na área administrativa.
2. Visualiza indicadores: total de inscritos, enviados, em análise,
   aprovados e reprovados.
3. Pesquisa por nome/e-mail e filtra por status, experiência com Wilcom e data.
4. Abre o perfil completo de um candidato.
5. Consulta e baixa os arquivos originais enviados.
6. Registra avaliação por critérios e comentário interno.
7. Altera o status da candidatura.
8. Opcionalmente adiciona observação visível ao candidato.
9. Exporta os dados permitidos para CSV.

## 6. Desafio

O desafio deve ser configurável pelo administrador com:

- título;
- descrição/briefing em texto formatado;
- objetivo esperado;
- medidas finais da peça;
- tipo de tecido, linha, máquina e demais premissas, quando aplicável;
- arquivos de referência;
- formatos de entrega aceitos;
- tamanho máximo dos arquivos;
- data/hora de abertura;
- data/hora limite;
- instruções de nomeação dos arquivos;
- critérios de avaliação exibidos ao candidato.

O MVP considera um único desafio ativo por vez. O sistema deve manter a versão
do briefing associada a cada submissão para que mudanças posteriores não alterem
o contexto histórico da avaliação.

## 7. Submissão do resultado

### Regras

- O candidato só pode enviar quando estiver com o perfil mínimo preenchido.
- O envio só é aceito dentro da janela de abertura e encerramento.
- O arquivo original deve ser armazenado sem conversão ou sobrescrita.
- O sistema deve gerar nome interno único para evitar colisão.
- O candidato pode substituir a submissão enquanto o prazo estiver aberto.
- Cada substituição gera uma nova versão; a versão anterior não deve ser apagada.
- Após o encerramento, apenas o administrador pode reabrir ou corrigir o envio.
- A confirmação deve mostrar nome, tamanho, tipo e data/hora do arquivo.

### Formatos sugeridos

O administrador define os formatos por desafio. Para um desafio de bordado, o
MVP pode aceitar `.DST`, `.EMB`, `.EXP`, `.PES`, `.JEF`, `.VP3`, `.XXX`, `.PNG`,
`.JPG` e `.PDF`, somente quando estiverem previstos no briefing. Não se deve
aceitar extensão apenas pelo nome: o backend deve validar MIME type, extensão e
tamanho.

### Limites sugeridos

- Arquivo principal: até 100 MB.
- Prévia visual: até 10 MB.
- Até 5 arquivos por versão de submissão.
- Todos os limites devem ser configuráveis por desafio.

## 8. Status

### Status da candidatura

- `CADASTRO_INCOMPLETO` — conta criada, perfil não concluído.
- `AGUARDANDO_ENVIO` — perfil concluído, sem resultado enviado.
- `ENVIADO` — resultado recebido.
- `EM_ANALISE` — administrador iniciou a avaliação.
- `APROVADO` — candidato aprovado na etapa.
- `REPROVADO` — candidato não aprovado.
- `ARQUIVADO` — registro oculto das operações correntes, sem exclusão física.

### Regras de transição

O candidato pode mover o registro de `CADASTRO_INCOMPLETO` para
`AGUARDANDO_ENVIO` ao concluir o perfil e de `AGUARDANDO_ENVIO` para `ENVIADO`
ao confirmar o resultado. Os demais status são controlados pelo administrador.

## 9. Avaliação administrativa

Critérios configuráveis, com nota de 0 a 10 e comentário opcional:

- interpretação do briefing;
- qualidade técnica da programação;
- organização de cores e sequência;
- adequação a medidas e materiais;
- acabamento/risco de falha na produção;
- domínio do Wilcom;
- clareza e organização da entrega.

O sistema deve calcular a média somente dos critérios preenchidos e permitir uma
recomendação final: “avançar”, “manter em análise” ou “não avançar”. Comentários
internos nunca devem aparecer para o candidato.

## 10. Telas

### Públicas

- Landing page do processo seletivo.
- Login.
- Criar conta.
- Recuperar senha.

### Candidato

- Dashboard com status da candidatura.
- Meu perfil.
- Desafio atual.
- Enviar resultado.
- Detalhe da submissão e histórico de versões.

### Administrador

- Login administrativo.
- Dashboard de indicadores.
- Lista de candidatos.
- Detalhe do candidato.
- Tela de avaliação.
- Cadastro/edição do desafio.
- Configurações de formatos e prazos.

## 11. Modelo de dados mínimo

### `users`

- `id`
- `name`
- `email` único
- `password_hash`
- `role` (`CANDIDATE` ou `ADMIN`)
- `created_at`, `updated_at`, `last_login_at`

### `candidate_profiles`

- `id`, `user_id` único
- `phone`, `city`, `state`
- `wilcom_experience_years` ou texto padronizado
- `wilcom_level`
- `professional_description`
- `portfolio_url`
- `consent_at`
- `profile_completed_at`

### `challenges`

- `id`, `title`, `description`
- `requirements_json`
- `accepted_extensions_json`
- `max_file_size_bytes`
- `opens_at`, `closes_at`
- `status` (`DRAFT`, `PUBLISHED`, `CLOSED`, `ARCHIVED`)
- `version`, `created_at`, `updated_at`

### `challenge_assets`

- `id`, `challenge_id`, `storage_key`, `original_name`, `mime_type`, `size_bytes`

### `submissions`

- `id`, `candidate_id`, `challenge_id`
- `version_number`
- `status`
- `candidate_notes`
- `submitted_at`
- `created_at`

### `submission_files`

- `id`, `submission_id`, `storage_key`, `original_name`
- `mime_type`, `size_bytes`, `sha256`, `is_preview`

### `evaluations`

- `id`, `submission_id` único, `evaluator_id`
- `criteria_json`, `average_score`
- `recommendation`, `internal_comment`, `candidate_comment`
- `created_at`, `updated_at`

### `audit_logs`

- `id`, `actor_id`, `action`, `entity_type`, `entity_id`
- `metadata_json`, `created_at`, `ip_hash` opcional

## 12. API mínima

### Autenticação

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/auth/forgot-password`
- `GET /api/auth/me`

### Candidato

- `GET /api/candidate/profile`
- `PUT /api/candidate/profile`
- `GET /api/candidate/challenge`
- `POST /api/candidate/submissions`
- `GET /api/candidate/submissions`
- `GET /api/candidate/submissions/:id`

### Administrador

- `GET /api/admin/dashboard`
- `GET /api/admin/candidates`
- `GET /api/admin/candidates/:id`
- `PATCH /api/admin/candidates/:id/status`
- `POST /api/admin/submissions/:id/evaluation`
- `PUT /api/admin/challenges/:id`
- `POST /api/admin/challenges`
- `GET /api/admin/export/candidates.csv`

Downloads devem usar autorização no backend e URL temporária/assinada; nunca
expor diretamente o caminho físico do armazenamento.

## 13. Segurança e privacidade

- Senhas armazenadas somente com hash forte, como Argon2id ou bcrypt.
- Sessão com cookie `HttpOnly`, `Secure` em produção e proteção CSRF quando aplicável.
- Autorização por papel em todas as rotas administrativas.
- Candidato só acessa seus próprios dados e submissões.
- Validação no servidor para todos os campos e uploads.
- Bloqueio de arquivos executáveis e nomes perigosos.
- Antivírus ou varredura de upload quando disponível.
- Rate limit para login, cadastro e envio de arquivos.
- Logs sem senha, tokens ou conteúdo sensível.
- Consentimento explícito para tratamento dos dados do processo seletivo.
- Política de retenção e exclusão definida pela Vitor Bordados.
- Backup dos metadados e dos arquivos com restauração testada.

## 14. Requisitos não funcionais

- Interface responsiva, prioritariamente em português do Brasil.
- Upload com barra de progresso e mensagem clara de erro.
- Layout acessível: teclado, contraste, labels, foco visível e mensagens associadas aos campos.
- Persistência de rascunho do perfil e das observações antes do envio final.
- Tamanho máximo de arquivo e espaço de armazenamento monitorados.
- Tratamento de falhas de upload sem criar submissões incompletas.
- Datas exibidas no fuso `America/Sao_Paulo`, armazenadas em UTC.
- Registro de versão da submissão para rastreabilidade.
- Build, lint e testes automatizados executados no CI.

## 15. Critérios de aceite do MVP

1. Um candidato consegue criar conta, concluir o perfil e acessar o desafio.
2. O sistema impede submissão sem perfil completo.
3. O sistema impede envio fora do prazo configurado.
4. Um arquivo válido é recebido, armazenado e associado ao candidato correto.
5. Um arquivo inválido ou acima do limite é rejeitado com mensagem compreensível.
6. A substituição mantém o histórico de versões anteriores.
7. O candidato não consegue acessar dados ou arquivos de outro candidato.
8. O administrador consegue pesquisar, filtrar e abrir o perfil completo.
9. O administrador consegue baixar o arquivo original enviado.
10. O administrador consegue avaliar por critérios e alterar o status.
11. Comentários internos não são exibidos ao candidato.
12. O briefing usado na submissão permanece rastreável mesmo após edição do desafio.
13. O sistema registra eventos relevantes de cadastro, envio, alteração de status e avaliação.
14. O fluxo principal funciona em desktop e celular.

## 16. Entrega recomendada por fases

### Fase 1 — Fundação

Autenticação, papéis, banco de dados, layout base e cadastro do candidato.

### Fase 2 — Desafio e envio

CRUD do desafio, janela de prazo, upload seguro, versões e área do candidato.

### Fase 3 — Avaliação

Dashboard administrativo, filtros, detalhe, avaliação e exportação.

### Fase 4 — Homologação

Testes de permissão, upload, prazo, responsividade, backup, logs e revisão de
privacidade. Validar o comportamento em ambiente de teste antes de qualquer
publicação em produção.

## 17. Decisões pendentes com a Vitor Bordados

- Qual é o texto definitivo e o material do caso/desafio?
- Quais formatos de arquivo serão obrigatórios?
- O resultado deve conter arquivo editável do Wilcom, matriz de bordado,
  imagem de prévia ou todos eles?
- Qual o prazo após o cadastro e qual o fuso oficial?
- Quais critérios têm maior peso na avaliação?
- Quem terá acesso de administrador?
- Por quanto tempo os dados e arquivos dos candidatos serão mantidos?
- O candidato receberá feedback e/ou e-mail quando o status mudar?
- A seleção precisa de uma etapa posterior de entrevista?

