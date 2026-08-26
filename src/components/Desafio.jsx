// Tela do candidato: apresenta o briefing, arquivos de referência e envio do resultado.
import { useEffect, useState } from 'react'
import { ArrowRight, Check, Clock3, Download, FileArchive, FileText, UploadCloud } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

function dataExibicao(valor) { return valor ? new Date(valor).toLocaleString('pt-BR') : '—' }

export default function Desafio() {
  const [dados, setDados] = useState({ desafio: null, referencias: [], submissao: null, arquivos: [], carregando: true })
  const [arquivo, setArquivo] = useState(null)
  const [mensagem, setMensagem] = useState('')
  const [enviando, setEnviando] = useState(false)

  async function carregar() {
    if (!supabase) { setDados(atual => ({ ...atual, carregando: false })); return }
    const { data: sessao } = await supabase.auth.getUser()
    if (!sessao.user) { setDados(atual => ({ ...atual, carregando: false })); return }
    const { data: desafio } = await supabase.from('challenges').select('*').eq('status', 'PUBLISHED').order('created_at', { ascending: false }).limit(1).maybeSingle()
    if (!desafio) { setDados({ desafio: null, referencias: [], submissao: null, arquivos: [], carregando: false }); return }
    const [{ data: referencias }, { data: submissao }] = await Promise.all([
      supabase.from('challenge_files').select('*').eq('challenge_id', desafio.id).order('created_at'),
      supabase.from('submissions').select('*').eq('candidate_id', sessao.user.id).eq('challenge_id', desafio.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
    ])
    let arquivos = []
    if (submissao) { const resposta = await supabase.from('submission_files').select('*').eq('submission_id', submissao.id); arquivos = resposta.data || [] }
    setDados({ desafio, referencias: referencias || [], submissao, arquivos, carregando: false })
  }

  useEffect(() => { carregar() }, [])

  async function baixarReferencia(item) {
    const { data, error } = await supabase.storage.from('desafio-arquivos').createSignedUrl(item.storage_key, 300)
    if (error) setMensagem(`Não foi possível abrir o arquivo: ${error.message}`)
    else window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function enviar(event) {
    event.preventDefault(); if (!arquivo || !dados.desafio) return
    setEnviando(true); setMensagem('')
    const { data: sessao } = await supabase.auth.getUser()
    const { data: anterior } = await supabase.from('submissions').select('version_number').eq('candidate_id', sessao.user.id).eq('challenge_id', dados.desafio.id).order('version_number', { ascending: false }).limit(1).maybeSingle()
    const { data: submissao, error } = await supabase.from('submissions').insert({ candidate_id: sessao.user.id, challenge_id: dados.desafio.id, version_number: (anterior?.version_number || 0) + 1 }).select().single()
    if (error) { setMensagem(error.message); setEnviando(false); return }
    const caminho = `${sessao.user.id}/${submissao.id}/${arquivo.name}`
    const upload = await supabase.storage.from('desafio-arquivos').upload(caminho, arquivo)
    if (upload.error) { setMensagem(upload.error.message); setEnviando(false); return }
    const registro = await supabase.from('submission_files').insert({ submission_id: submissao.id, storage_key: caminho, original_name: arquivo.name, mime_type: arquivo.type || 'application/octet-stream', size_bytes: arquivo.size, is_preview: arquivo.type.startsWith('image/') })
    if (registro.error) setMensagem(registro.error.message); else { setMensagem('Resultado enviado com sucesso.'); setArquivo(null); await carregar() }
    setEnviando(false)
  }

  if (dados.carregando) return <section className="card estado-vazio" aria-busy="true"><Clock3 size={30} /><h2>Aguarde...</h2></section>
  if (!dados.desafio) return <section className="card estado-vazio"><FileText size={30} /><h2>Nenhum desafio publicado</h2><p>A equipe ainda não publicou um desafio.</p></section>
  return <><div className="pagina-cabecalho"><div><p className="eyebrow">DESAFIO ATUAL</p><h2>{dados.desafio.title}</h2><p className="texto-suave">Confira o briefing e envie seu resultado.</p></div>{dados.desafio.closes_at && <div className="prazo-destaque"><Clock3 size={18} /><span>Encerra em<br /><strong>{dataExibicao(dados.desafio.closes_at)}</strong></span></div>}</div><div className="grid-desafio"><main className="card briefing"><div className="briefing-capa"><div className="selo">V</div><div><span>BRIEFING OFICIAL</span><strong>{dados.desafio.title}</strong></div></div><h3>O desafio</h3><p>{dados.desafio.description}</p>{dados.desafio.requirements?.length > 0 && <><h3>Requisitos</h3><ol>{dados.desafio.requirements.map((item, indice) => <li key={indice}>{item}</li>)}</ol></>}<div className="criterios"><strong>Arquivos de referência</strong>{dados.referencias.length ? dados.referencias.map(item => <button className="link-button" key={item.id} onClick={() => baixarReferencia(item)}><FileArchive size={15} /> {item.original_name} <Download size={15} /></button>) : <span>Nenhum arquivo anexado</span>}</div></main><aside className="coluna-envio"><section className="card envio-card"><div className="titulo-com-acao"><div><p className="eyebrow">SUA ENTREGA</p><h3>{dados.submissao ? 'Resultado enviado' : 'Envie seu resultado'}</h3></div><span className="status status-enviado">{dados.submissao ? 'Enviado' : 'Pendente'}</span></div>{dados.submissao ? <>{dados.arquivos.map(item => <div className="arquivo-enviado" key={item.id}><FileArchive size={19} /><div><strong>{item.original_name}</strong><small>{Math.round(item.size_bytes / 1024)} KB</small></div></div>)}<div className="envio-confirmado"><Check size={15} /> Sua entrega foi registrada</div></> : <form onSubmit={enviar}><label className="dropzone"><UploadCloud size={28} /><strong>{arquivo ? arquivo.name : 'Selecione o arquivo do resultado'}</strong><small>Formatos aceitos: {dados.desafio.accepted_extensions?.join(', ') || 'definidos pela equipe'}</small><input type="file" onChange={event => setArquivo(event.target.files?.[0] || null)} /></label><button className="botao-principal largura-total" disabled={!arquivo || enviando}>{enviando ? 'Enviando...' : 'Enviar resultado'} <ArrowRight size={17} /></button></form>}{mensagem && <div className="auth-mensagem">{mensagem}</div>}</section></aside></div></>
}
