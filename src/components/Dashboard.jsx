// Dashboard do candidato baseado no status e nos registros reais do Supabase.
import { useEffect, useState } from 'react'
import { Award, ArrowRight, Check, Clock3, FileCheck2, FileText, Sparkles } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

const statusTexto = { AGUARDANDO_ENVIO: 'Aguardando envio', ENVIADO: 'Resultado enviado', EM_ANALISE: 'Em análise', APROVADO: 'Aprovado', DESCLASSIFICADO: 'Desclassificado' }

export default function Dashboard({ mudarTela }) {
  const [dados, setDados] = useState({ nome: 'Candidato', perfil: null, desafio: null, submissao: null, status: 'AGUARDANDO_ENVIO', carregando: true })
  useEffect(() => {
    let ativo = true
    async function carregar() {
      if (!supabase) return setDados(atual => ({ ...atual, carregando: false }))
      const { data: sessao } = await supabase.auth.getUser()
      if (!sessao.user) return setDados(atual => ({ ...atual, carregando: false }))
      const [perfil, desafio, submissao, status] = await Promise.all([
        supabase.from('candidate_profiles').select('*').eq('user_id', sessao.user.id).maybeSingle(),
        supabase.from('challenges').select('*').eq('status', 'PUBLISHED').order('created_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('submissions').select('*').eq('candidate_id', sessao.user.id).order('submitted_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('candidate_statuses').select('status').eq('candidate_id', sessao.user.id).maybeSingle(),
      ])
      if (ativo) setDados({ nome: sessao.user.user_metadata?.nome || sessao.user.email?.split('@')[0] || 'Candidato', perfil: perfil.data, desafio: desafio.data, submissao: submissao.data, status: status.data?.status || submissao.data?.status || 'AGUARDANDO_ENVIO', carregando: false })
    }
    carregar()
    return () => { ativo = false }
  }, [])

  if (dados.carregando) return <section className="card estado-vazio" aria-busy="true"><Clock3 size={30} /><h2>Aguarde...</h2></section>
  const perfilCompleto = Boolean(dados.perfil?.professional_description && dados.perfil?.wilcom_level && dados.perfil?.wilcom_experience)
  const status = dados.status
  const resultadoFinal = status === 'APROVADO' || status === 'DESCLASSIFICADO'
  const nome = dados.nome.split(' ')[0]
  return <><section className="boas-vindas"><div><p className="eyebrow">PROCESSO SELETIVO VITOR BORDADOS</p><h2>Olá, {nome} <span>✦</span></h2><p className="texto-suave">Acompanhe sua candidatura e o resultado do desafio.</p></div><div className="progresso"><div className="progresso-label"><span>Status atual</span><strong>{statusTexto[status] || status}</strong></div><div className="barra"><b style={{ width: resultadoFinal ? '100%' : dados.submissao ? '75%' : perfilCompleto ? '50%' : '25%' }} /></div><small>{resultadoFinal ? 'Etapa concluída' : 'Processo em andamento'}</small></div></section><div className="grid-resumo"><div className="card card-status"><div className="card-heading"><span className="icone-box azul-claro"><FileCheck2 size={19} /></span><span className="tag-neutro">STATUS</span></div><p className="label-card">Status da candidatura</p><h3>{statusTexto[status] || status}</h3><p className="texto-suave">{status === 'APROVADO' ? 'Parabéns! A equipe aprovou sua candidatura.' : status === 'DESCLASSIFICADO' ? 'Agradecemos sua participação no processo.' : dados.submissao ? 'Sua entrega está com a equipe.' : 'Você ainda não enviou o desafio.'}</p>{dados.submissao && <button className="link-button" onClick={() => mudarTela('meu-desafio')}>Ver submissão <ArrowRight size={15} /></button>}</div><div className="card"><div className="card-heading"><span className="icone-box amarelo"><Clock3 size={19} /></span><span className="tag-neutro">PRAZO</span></div><p className="label-card">Prazo do desafio</p><h3>{dados.desafio?.closes_at ? new Date(dados.desafio.closes_at).toLocaleDateString('pt-BR') : 'Não definido'}</h3><p className="texto-suave">{dados.desafio?.title || 'Nenhum desafio publicado'}</p></div><div className="card"><div className="card-heading"><span className="icone-box verde-claro"><Award size={19} /></span><span className="tag-neutro">PERFIL</span></div><p className="label-card">Perfil profissional</p><h3>{perfilCompleto ? 'Completo' : 'Incompleto'}</h3><p className="texto-suave">{perfilCompleto ? 'Dados enviados para avaliação' : 'Preencha seus dados'}</p><button className="link-button" onClick={() => mudarTela('meu-perfil')}>Revisar perfil <ArrowRight size={15} /></button></div></div><div className="grid-principal"><section className="card desafio-card"><div className="titulo-com-acao"><div><p className="eyebrow">DESAFIO ATUAL</p><h3>{dados.desafio?.title || 'Nenhum desafio publicado'}</h3></div><span className="numero-desafio">01</span></div><div className="desafio-art"><div className="mockup-bordado"><img src="/logo.png" alt="Vitor Matrizes de Bordado" /></div><div><p className="texto-suave">{dados.desafio?.description || 'A equipe ainda não publicou um desafio.'}</p>{dados.desafio && <div className="metas"><span><FileText size={15} /> Briefing disponível</span><span><Clock3 size={15} /> Prazo configurado</span></div>}</div></div>{dados.desafio && !resultadoFinal && <button className="botao-principal" onClick={() => mudarTela('meu-desafio')}>Abrir desafio <ArrowRight size={17} /></button>}</section><section className="card timeline-card"><div className="titulo-com-acao"><div><p className="eyebrow">SUA JORNADA</p><h3>Etapas do processo</h3></div><span className="icone-box azul-claro"><Sparkles size={18} /></span></div><div className="timeline"><div className="timeline-item concluido"><span><Check size={14} /></span><div><strong>Cadastro realizado</strong><small>Concluído</small></div></div><div className={`timeline-item ${perfilCompleto ? 'concluido' : 'atual'}`}><span>{perfilCompleto ? <Check size={14} /> : '2'}</span><div><strong>Perfil profissional</strong><small>{perfilCompleto ? 'Concluído' : 'Preencha seu perfil'}</small></div></div><div className={`timeline-item ${dados.submissao ? 'concluido' : 'atual'}`}><span>{dados.submissao ? <Check size={14} /> : '3'}</span><div><strong>Entrega do desafio</strong><small>{dados.submissao ? 'Enviada' : 'Aguardando envio'}</small></div></div><div className={`timeline-item ${resultadoFinal ? 'concluido' : ''}`}><span>{resultadoFinal ? <Check size={14} /> : '4'}</span><div><strong>Retorno da equipe</strong><small>{resultadoFinal ? statusTexto[status] : 'Após a análise do material'}</small></div></div></div></section></div></>
}
