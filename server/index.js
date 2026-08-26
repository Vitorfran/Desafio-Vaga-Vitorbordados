// API HTTP do portal de desafio. A autenticação completa e o armazenamento em nuvem
// entram na próxima etapa; aqui fica a fundação segura para o frontend consumir.
import 'dotenv/config'
import cors from 'cors'
import express from 'express'
import multer from 'multer'
import pg from 'pg'
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'

const { Pool } = pg
const app = express()
const porta = Number(process.env.PORT || 3001)
const pastaUploads = path.resolve(process.env.UPLOAD_DIR || 'storage/uploads')
const extensoesPermitidas = new Set(['.dst', '.emb', '.exp', '.pes', '.jef', '.vp3', '.xxx', '.png', '.jpg', '.jpeg', '.pdf'])

fs.mkdirSync(pastaUploads, { recursive: true })
app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json({ limit: '2mb' }))

const upload = multer({
  dest: pastaUploads,
  limits: { fileSize: 100 * 1024 * 1024, files: 5 },
  fileFilter: (_request, file, callback) => {
    const extensao = path.extname(file.originalname).toLowerCase()
    callback(null, extensoesPermitidas.has(extensao))
  },
})

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : null

// Envia os eventos de e-mail enfileirados pelo Supabase usando Microsoft Graph.
async function enviarEmailGraph(evento) {
  const obrigatorias = ['GRAPH_TENANT_ID', 'GRAPH_CLIENT_ID', 'GRAPH_CLIENT_SECRET', 'GRAPH_SENDER']
  if (obrigatorias.some(nome => !process.env[nome])) throw new Error('Microsoft Graph não configurado no servidor')
  const tokenResposta = await fetch(`https://login.microsoftonline.com/${process.env.GRAPH_TENANT_ID}/oauth2/v2.0/token`, { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ client_id: process.env.GRAPH_CLIENT_ID, client_secret: process.env.GRAPH_CLIENT_SECRET, scope: 'https://graph.microsoft.com/.default', grant_type: 'client_credentials' }) })
  const token = await tokenResposta.json()
  if (!tokenResposta.ok) throw new Error(token.error_description || 'Não foi possível autenticar no Microsoft Graph')
  const envio = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(process.env.GRAPH_SENDER)}/sendMail`, { method: 'POST', headers: { Authorization: `Bearer ${token.access_token}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ message: { subject: evento.subject, body: { contentType: 'Text', content: evento.body }, toRecipients: [{ emailAddress: { address: evento.recipient_email } }] }, saveToSentItems: true }) })
  if (!envio.ok) throw new Error(await envio.text())
}

function exigirBanco(_request, response, next) {
  if (!pool) return response.status(503).json({ error: 'Banco não configurado. Defina DATABASE_URL no arquivo .env.' })
  next()
}

app.get('/api/health', (_request, response) => response.json({ ok: true, bancoConfigurado: Boolean(pool) }))

// Webhook chamado pelo Supabase quando um email_events é criado.
app.post('/api/email-events', exigirBanco, async (request, response) => {
  if (!process.env.EMAIL_WEBHOOK_SECRET || request.headers.authorization !== `Bearer ${process.env.EMAIL_WEBHOOK_SECRET}`) return response.status(401).json({ error: 'Não autorizado' })
  const evento = request.body.record || request.body
  if (!evento?.id || evento.status !== 'QUEUED') return response.status(400).json({ error: 'Evento inválido' })
  try {
    await enviarEmailGraph(evento)
    await pool.query("UPDATE email_events SET status = 'SENT', sent_at = NOW() WHERE id = $1", [evento.id])
    response.status(202).json({ ok: true })
  } catch (error) {
    await pool.query("UPDATE email_events SET status = 'FAILED', error_message = $2 WHERE id = $1", [evento.id, error.message])
    console.error('Falha ao enviar e-mail:', error)
    response.status(502).json({ error: 'Não foi possível enviar o e-mail.' })
  }
})

app.get('/api/challenges/active', exigirBanco, async (_request, response) => {
  try {
    const resultado = await pool.query("SELECT id, title, description, requirements, accepted_extensions, max_file_size_bytes, opens_at, closes_at, version FROM challenges WHERE status = 'PUBLISHED' AND (opens_at IS NULL OR opens_at <= NOW()) AND (closes_at IS NULL OR closes_at >= NOW()) ORDER BY created_at DESC LIMIT 1")
    response.json(resultado.rows[0] || null)
  } catch (error) {
    console.error('Falha ao buscar desafio ativo:', error)
    response.status(500).json({ error: 'Não foi possível carregar o desafio.' })
  }
})

app.get('/api/admin/candidates', exigirBanco, async (request, response) => {
  try {
    const busca = String(request.query.search || '').trim()
    const valores = []
    const filtros = ["u.role = 'CANDIDATE'"]
    if (busca) { valores.push(`%${busca}%`); filtros.push('(u.name ILIKE $1 OR u.email ILIKE $1)') }
    const resultado = await pool.query(`SELECT u.id, u.name, u.email, p.city, p.state, p.wilcom_experience, p.wilcom_level, COALESCE(s.status, 'AGUARDANDO_ENVIO') AS status, s.submitted_at FROM users u LEFT JOIN candidate_profiles p ON p.user_id = u.id LEFT JOIN LATERAL (SELECT status, submitted_at FROM submissions WHERE candidate_id = u.id ORDER BY submitted_at DESC LIMIT 1) s ON TRUE WHERE ${filtros.join(' AND ')} ORDER BY u.created_at DESC`, valores)
    response.json(resultado.rows)
  } catch (error) {
    console.error('Falha ao buscar candidatos:', error)
    response.status(500).json({ error: 'Não foi possível carregar os candidatos.' })
  }
})

app.post('/api/candidates/:candidateId/submissions', exigirBanco, upload.array('files', 5), async (request, response) => {
  const arquivos = request.files || []
  if (!arquivos.length) return response.status(400).json({ error: 'Envie pelo menos um arquivo válido.' })
  const cliente = await pool.connect()
  try {
    await cliente.query('BEGIN')
    const { candidateId } = request.params
    const desafio = await cliente.query("SELECT id FROM challenges WHERE status = 'PUBLISHED' AND (opens_at IS NULL OR opens_at <= NOW()) AND (closes_at IS NULL OR closes_at >= NOW()) ORDER BY created_at DESC LIMIT 1")
    if (!desafio.rows[0]) return response.status(409).json({ error: 'Não existe desafio aberto para envio.' })
    const versao = await cliente.query('SELECT COALESCE(MAX(version_number), 0) + 1 AS next_version FROM submissions WHERE candidate_id = $1 AND challenge_id = $2', [candidateId, desafio.rows[0].id])
    const submissao = await cliente.query('INSERT INTO submissions (candidate_id, challenge_id, version_number, candidate_notes) VALUES ($1, $2, $3, $4) RETURNING id, version_number, submitted_at', [candidateId, desafio.rows[0].id, versao.rows[0].next_version, request.body.notes || null])
    for (const arquivo of arquivos) {
      const hash = crypto.createHash('sha256').update(fs.readFileSync(arquivo.path)).digest('hex')
      await cliente.query('INSERT INTO submission_files (submission_id, storage_key, original_name, mime_type, size_bytes, sha256, is_preview) VALUES ($1, $2, $3, $4, $5, $6, $7)', [submissao.rows[0].id, path.basename(arquivo.path), arquivo.originalname, arquivo.mimetype, arquivo.size, hash, ['image/png', 'image/jpeg'].includes(arquivo.mimetype)])
    }
    await cliente.query('COMMIT')
    response.status(201).json({ ...submissao.rows[0], files: arquivos.map(arquivo => arquivo.originalname) })
  } catch (error) {
    await cliente.query('ROLLBACK')
    console.error('Falha ao criar submissão:', error)
    response.status(500).json({ error: 'Não foi possível registrar o envio.' })
  } finally { cliente.release() }
})

app.listen(porta, () => console.log(`API do portal executando em http://localhost:${porta}`))
