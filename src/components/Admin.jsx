// Painel administrativo real: consulta candidatos e gerencia desafios por RPC protegida.
import { useEffect, useState } from 'react'
import { Check, Clock3, Download, FileText, Plus, UsersRound, X } from 'lucide-react'
import { supabase } from '../lib/supabase.js'
import '../admin.css'

const estadoInicial = { titulo: '', descricao: '', requisitos: '', formatos: 'DST, EMB, PES, PNG, JPG, PDF', abertura: '', encerramento: '' }

function dataExibicao(valor) {
  return valor ? new Date(valor).toLocaleString('pt-BR') : '—'
}

export default function Admin() {
  const [candidatos, setCandidatos] = useState([])
  const [desafios, setDesafios] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [mensagem, setMensagem] = useState('')
  const [modalAberto, setModalAberto] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [formulario, setFormulario] = useState(estadoInicial)
  const [arquivos, setArquivos] = useState([])
  const [selecionado, setSelecionado] = useState(null)
  const [detalhe, setDetalhe] = useState(null)
  const [salvandoAvaliacao, setSalvandoAvaliacao] = useState(false)
  const [filtroCandidatos, setFiltroCandidatos] = useState('TODOS')

  async function carregar() {
    if (!supabase) { setMensagem('Supabase não configurado.'); setCarregando(false); return }
    setCarregando(true)
    const [listaCandidatos, listaDesafios] = await Promise.all([
      supabase.rpc('admin_list_candidates'),
      supabase.rpc('admin_list_challenges'),
    ])
    if (listaCandidatos.error || listaDesafios.error) setMensagem((listaCandidatos.error || listaDesafios.error).message)
    else { setCandidatos(listaCandidatos.data || []); setDesafios(listaDesafios.data || []); setMensagem('') }
    setCarregando(false)
  }

  useEffect(() => { carregar() }, [])

  const candidatosFiltrados = candidatos.filter(item => filtroCandidatos === 'TODOS' || item.status === filtroCandidatos)

  const alterar = (campo, valor) => setFormulario(atual => ({ ...atual, [campo]: valor }))

  async function abrirDetalhe(id) {
    setMensagem('')
    const [{ data, error }, respostas] = await Promise.all([
      supabase.rpc('admin_get_candidate_detail', { p_candidate_id: id }),
      supabase.from('candidate_second_stage_responses').select('*').eq('candidate_id', id).maybeSingle(),
    ])
    if (error) setMensagem(error.message); else {
      const segundaEtapa = respostas.data || null
      const perfil = data.perfil ? { ...data.perfil } : {}
      if (segundaEtapa) perfil.professional_description = `${perfil.professional_description || ''} | RESPOSTAS DA SEGUNDA ETAPA — Experiência: ${segundaEtapa.embroidery_experience}; disponibilidade: ${segundaEtapa.availability}; produção média: ${segundaEtapa.average_production}; emite nota fiscal: ${segundaEtapa.can_issue_invoice ? 'Sim' : 'Não'}.`
      setSelecionado(id)
      setDetalhe({ ...data, perfil, segunda_etapa: segundaEtapa })
    }
  }

  async function mudarStatus(status) {
    setDetalhe(atual => ({ ...atual, status }))
    setCandidatos(atual => atual.map(item => item.id === selecionado ? { ...item, status } : item))
    const { error } = await supabase.rpc('admin_update_candidate_status', { p_candidate_id: selecionado, p_status: status })
    if (error) { setMensagem(error.message); await abrirDetalhe(selecionado) }
  }

  async function salvarAvaliacao(event) {
    event.preventDefault(); setSalvandoAvaliacao(true)
    const formulario = new FormData(event.currentTarget)
    const submissao = detalhe?.submissoes?.[0]
    const { error } = await supabase.rpc('admin_save_evaluation', { p_submission_id: submissao.id, p_average_score: Number(formulario.get('nota')) || null, p_recommendation: formulario.get('recomendacao'), p_internal_comment: formulario.get('comentario'), p_candidate_comment: formulario.get('retorno') || null })
    if (error) setMensagem(error.message); else { setMensagem('Avaliação salva.'); await abrirDetalhe(selecionado) }
    setSalvandoAvaliacao(false)
  }

  async function baixarArquivo(item) {
    const { data, error } = await supabase.storage.from('desafio-arquivos').createSignedUrl(item.storage_key, 300)
    if (error) setMensagem(error.message); else window.open(data.signedUrl, '_blank', 'noopener,noreferrer')
  }

  async function criarDesafio(event) {
    event.preventDefault()
    setSalvando(true); setMensagem('')
    const { data: desafioCriado, error } = await supabase.rpc('admin_create_challenge', {
      p_title: formulario.titulo,
      p_description: formulario.descricao,
      p_requirements: formulario.requisitos.split('\n').map(item => item.trim()).filter(Boolean),
      p_accepted_extensions: formulario.formatos.split(',').map(item => item.trim().toUpperCase()).filter(Boolean),
      p_opens_at: formulario.abertura ? new Date(formulario.abertura).toISOString() : null,
      p_closes_at: formulario.encerramento ? new Date(formulario.encerramento).toISOString() : null,
      p_status: 'DRAFT',
    })
    if (error) setMensagem(error.message)
    else {
      const desafio = Array.isArray(desafioCriado) ? desafioCriado[0] : desafioCriado
      let falhou = false
      for (const arquivo of arquivos) {
        const caminho = `desafios/${desafio.id}/${arquivo.name}`
        const upload = await supabase.storage.from('desafio-arquivos').upload(caminho, arquivo)
        if (upload.error) { setMensagem(`Desafio salvo, mas o arquivo não foi enviado: ${upload.error.message}`); falhou = true; break }
        const registro = await supabase.from('challenge_files').insert({ challenge_id: desafio.id, storage_key: caminho, original_name: arquivo.name, mime_type: arquivo.type || 'application/octet-stream', size_bytes: arquivo.size })
        if (registro.error) { setMensagem(`Desafio salvo, mas o registro do arquivo falhou: ${registro.error.message}`); falhou = true; break }
      }
      if (!falhou) { setFormulario(estadoInicial); setArquivos([]); setModalAberto(false) }
      await carregar()
    }
    setSalvando(false)
  }

  async function alterarStatus(id, status) {
    const { error } = await supabase.rpc('admin_set_challenge_status', { p_id: id, p_status: status })
    if (error) setMensagem(error.message); else carregar()
  }

  return <>
    <div className="admin-banner"><div><p className="eyebrow">PAINEL DE RECRUTAMENTO</p><h2>Visão geral dos candidatos</h2><p className="texto-suave">Dados reais cadastrados no processo seletivo.</p></div><button className="botao-principal" onClick={() => setModalAberto(true)}><Plus size={17} /> Novo desafio</button></div>
    {mensagem && <div className="auth-mensagem">{mensagem}</div>}
    <div className="admin-stats"><div><span className="icone-box azul-claro"><UsersRound size={18} /></span><strong>{candidatos.length}</strong><small>Total de candidatos</small></div><div><span className="icone-box amarelo"><FileText size={18} /></span><strong>{candidatos.filter(item => item.status !== 'AGUARDANDO_ENVIO').length}</strong><small>Entregas recebidas</small></div><div><span className="icone-box roxo-claro"><Clock3 size={18} /></span><strong>{candidatos.filter(item => item.status === 'EM_ANALISE' || item.status === 'ENVIADO').length}</strong><small>Em avaliação</small></div><div><span className="icone-box verde-claro"><Check size={18} /></span><strong>{candidatos.filter(item => item.status === 'APROVADO').length}</strong><small>Aprovados</small></div></div>
    <section className="card tabela-card"><div className="tabela-topo"><div><p className="eyebrow">CANDIDATOS</p><h3>Candidatos cadastrados <span>{candidatos.length}</span></h3></div></div><div className="admin-abas" role="tablist" aria-label="Filtrar candidatos">{[['TODOS', 'Todos'], ['APROVADO', 'Aprovados'], ['EM_ANALISE', 'Em análise'], ['DESCLASSIFICADO', 'Desclassificados']].map(([valor, rotulo]) => <button key={valor} className={filtroCandidatos === valor ? 'ativa' : ''} onClick={() => setFiltroCandidatos(valor)} role="tab" aria-selected={filtroCandidatos === valor}>{rotulo}<span>{valor === 'TODOS' ? candidatos.length : candidatos.filter(item => item.status === valor).length}</span></button>)}</div>{carregando ? <div className="estado-vazio"><p>Aguarde...</p></div> : candidatosFiltrados.length === 0 ? <div className="estado-vazio"><UsersRound size={30} /><h2>Nenhum candidato nesta aba</h2><p>Os candidatos aparecerão aqui quando tiverem este status.</p></div> : <div className="tabela-scroll"><table><thead><tr><th>CANDIDATO</th><th>WILCOM</th><th>STATUS</th><th>NOTA</th><th>ATUALIZAÇÃO</th></tr></thead><tbody>{candidatosFiltrados.map(item => <tr key={item.id} onClick={() => abrirDetalhe(item.id)}><td><div className="candidato-celula"><div className="avatar avatar-laranja">{(item.nome || 'C').slice(0, 2).toUpperCase()}</div><div><strong>{item.nome}</strong><small>{item.email}</small></div></div></td><td>{item.wilcom || '—'}<small>{item.nivel || ''}</small></td><td>{item.status}</td><td>{item.nota ?? '—'}</td><td>{dataExibicao(item.atualizado_em)}</td></tr>)}</tbody></table></div>}</section>
    <section className="card tabela-card"><div className="tabela-topo"><div><p className="eyebrow">DESAFIOS</p><h3>Briefings cadastrados <span>{desafios.length}</span></h3></div></div>{desafios.length === 0 ? <div className="estado-vazio"><FileText size={30} /><h2>Nenhum desafio cadastrado</h2><p>Crie o primeiro briefing usando o botão “Novo desafio”.</p></div> : <div className="tabela-scroll"><table><thead><tr><th>TÍTULO</th><th>STATUS</th><th>ABERTURA</th><th>ENCERRAMENTO</th><th></th></tr></thead><tbody>{desafios.map(item => <tr key={item.id}><td><strong>{item.title}</strong><small>{item.description}</small></td><td><select value={item.status} onChange={event => alterarStatus(item.id, event.target.value)}><option value="DRAFT">Rascunho</option><option value="PUBLISHED">Publicado</option><option value="CLOSED">Encerrado</option><option value="ARCHIVED">Arquivado</option></select></td><td>{dataExibicao(item.opens_at)}</td><td>{dataExibicao(item.closes_at)}</td><td /></tr>)}</tbody></table></div>}</section>
    {modalAberto && <div className="modal-fundo" onClick={() => setModalAberto(false)}><form className="modal" onSubmit={criarDesafio} onClick={event => event.stopPropagation()}><button type="button" className="botao-icon modal-fechar" onClick={() => setModalAberto(false)}><X size={19} /></button><p className="eyebrow">NOVO DESAFIO</p><h2>Cadastrar briefing</h2><label>Título<input value={formulario.titulo} onChange={event => alterar('titulo', event.target.value)} required /></label><label>Descrição<textarea value={formulario.descricao} onChange={event => alterar('descricao', event.target.value)} required /></label><label>Requisitos, um por linha<textarea value={formulario.requisitos} onChange={event => alterar('requisitos', event.target.value)} /></label><label>Formatos aceitos<input value={formulario.formatos} onChange={event => alterar('formatos', event.target.value)} /></label><label>Arquivos de referência<input type="file" multiple accept=".png,.jpg,.jpeg,.pdf,.dst,.emb,.pes" onChange={event => setArquivos(Array.from(event.target.files || []))} /><small>{arquivos.length ? `${arquivos.length} arquivo(s) selecionado(s)` : 'PNG, JPG, PDF, DST, EMB ou PES'}</small></label><div className="form-grid"><label>Abertura<input type="datetime-local" value={formulario.abertura} onChange={event => alterar('abertura', event.target.value)} /></label><label>Encerramento<input type="datetime-local" value={formulario.encerramento} onChange={event => alterar('encerramento', event.target.value)} /></label></div>{mensagem && <div className="auth-mensagem">{mensagem}</div>}<button className="botao-principal largura-total" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar rascunho'} <Check size={17} /></button></form></div>}
    {detalhe && <div className="modal-fundo" onClick={() => { setDetalhe(null); setSelecionado(null) }}><div className="modal modal-candidato" onClick={event => event.stopPropagation()}><button className="botao-icon modal-fechar" onClick={() => { setDetalhe(null); setSelecionado(null) }}><X size={19} /></button><p className="eyebrow">DETALHE DO CANDIDATO</p><h2>{detalhe.nome}</h2><p className="texto-suave">{detalhe.email} · Cadastro em {dataExibicao(detalhe.criado_em)}</p><div className="modal-linha"><span>Status da candidatura</span><select value={detalhe.status} onChange={event => mudarStatus(event.target.value)}><option value="AGUARDANDO_ENVIO">Aguardando envio</option><option value="ENVIADO">Enviado</option><option value="EM_ANALISE">Em análise</option><option value="APROVADO">Aprovado</option><option value="DESCLASSIFICADO">Desclassificado</option></select></div><section className="detalhe-secao"><h3>Perfil profissional</h3><p><strong>Telefone:</strong> {detalhe.perfil?.phone || '—'}</p><p><strong>Localização:</strong> {[detalhe.perfil?.city, detalhe.perfil?.state].filter(Boolean).join(', ') || '—'}</p><p><strong>Experiência Wilcom:</strong> {detalhe.perfil?.wilcom_experience || '—'} · {detalhe.perfil?.wilcom_level || '—'}</p><p><strong>Idioma:</strong> {detalhe.perfil?.language || '—'}</p><p>{detalhe.perfil?.professional_description || 'O candidato ainda não adicionou uma descrição profissional.'}</p>{detalhe.perfil?.portfolio_url && <a href={detalhe.perfil.portfolio_url} target="_blank" rel="noreferrer">Abrir portfólio</a>}</section><section className="detalhe-secao"><h3>Entregas</h3>{detalhe.submissoes?.length ? detalhe.submissoes.map(submissao => <div className="entrega-detalhe" key={submissao.id}><strong>Versão {submissao.version_number} · {submissao.status}</strong><small>Enviada em {dataExibicao(submissao.submitted_at)}</small>{submissao.arquivos?.map(item => <button className="link-button" key={item.id} onClick={() => baixarArquivo(item)}><Download size={14} /> {item.original_name}</button>)}</div>) : <p>Nenhuma entrega enviada.</p>}</section>{detalhe.submissoes?.[0] && <form className="detalhe-secao" onSubmit={salvarAvaliacao}><h3>Avaliação</h3><div className="form-grid"><label>Nota<input name="nota" type="number" min="0" max="10" step="0.1" defaultValue={detalhe.submissoes[0].avaliacao?.average_score || ''} /></label><label>Recomendação<select name="recomendacao" defaultValue={detalhe.submissoes[0].avaliacao?.recommendation || ''}><option value="">Selecione</option><option value="APROVAR">Aprovar</option><option value="REVISAR">Revisar</option><option value="REPROVAR">Reprovar</option></select></label></div><label>Comentário interno<textarea name="comentario" defaultValue={detalhe.submissoes[0].avaliacao?.internal_comment || ''} /></label><label>Retorno ao candidato<textarea name="retorno" defaultValue={detalhe.submissoes[0].avaliacao?.candidate_comment || ''} /></label><button className="botao-principal largura-total" disabled={salvandoAvaliacao}>{salvandoAvaliacao ? 'Salvando...' : 'Salvar avaliação'} <Check size={17} /></button></form>}</div></div>}
  </>
}
