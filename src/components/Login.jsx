// Tela de autenticação do portal: login, cadastro e recuperação de senha.
import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { supabase } from '../lib/supabase.js'

function Logo() {
  return <div className="marca"><img src="/logo.png" alt="Vitor Matrizes de Bordado" /><span>DESAFIO <small>2026</small></span></div>
}

export default function Login({ onLogin, portalAdmin = false }) {
  const [modo, setModo] = useState('login')
  const [mensagem, setMensagem] = useState('')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nomeCadastro, setNomeCadastro] = useState('')
  const [carregando, setCarregando] = useState(false)

  function enviar(event) {
    event.preventDefault()
    const nomeDigitado = event.currentTarget.querySelector('input[placeholder="Como podemos te chamar?"]')?.value || nomeCadastro
    const emailNormalizado = email.trim().toLowerCase()
    if (supabase) {
      autenticarComSupabase(emailNormalizado, nomeDigitado)
      return
    }
    setMensagem('Serviço de autenticação indisponível. Configure as variáveis VITE do Supabase.')
  }

  async function autenticarComSupabase(emailNormalizado, nomeDigitado) {
    setCarregando(true)
    setMensagem('')
    try {
      if (modo === 'register') {
        const { error } = await supabase.auth.signUp({ email: emailNormalizado, password: senha, options: { data: { nome: nomeDigitado.trim(), role: 'CANDIDATE' } } })
        if (error) throw error
        setMensagem('Cadastro criado. Verifique seu e-mail para confirmar a conta.')
        setModo('login')
        return
      }
      if (modo === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(emailNormalizado)
        if (error) throw error
        setMensagem('Se o e-mail existir, enviaremos as instruções de recuperação.')
        return
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email: emailNormalizado, password: senha })
      if (error) throw error
      const role = data.user.app_metadata?.role || data.user.user_metadata?.role || 'CANDIDATE'
      if (portalAdmin && role !== 'ADMIN') { await supabase.auth.signOut(); throw new Error('Esta conta não possui permissão de administrador.') }
      if (!portalAdmin && role === 'ADMIN') { await supabase.auth.signOut(); throw new Error('Use o acesso administrativo em /admin/login.') }
      onLogin({ role, admin: role === 'ADMIN', nome: data.user.user_metadata?.nome || data.user.email })
    } catch (error) {
      const mensagens = { 'Email not confirmed': 'Seu e-mail ainda não foi confirmado. Verifique a caixa de entrada e clique no link enviado pelo Supabase.', 'Invalid login credentials': 'E-mail ou senha inválidos.', 'Email rate limit exceeded': 'O limite de e-mails do Supabase foi atingido. Aguarde um pouco antes de tentar novamente.', 'over_email_send_rate_limit': 'O limite de e-mails do Supabase foi atingido. Aguarde um pouco antes de tentar novamente.' }
      setMensagem(mensagens[error.message] || error.message || 'Não foi possível concluir o acesso.')
    } finally { setCarregando(false) }
  }

  return <div className="auth-shell">
    <div className="auth-visual"><video className="auth-video" autoPlay muted loop playsInline aria-hidden="true"><source src="/login-background.mp4" type="video/mp4" /></video><div className="auth-video-overlay" /><div className="auth-visual-conteudo"><Logo />
    <div className="auth-frase"><span>Seu talento</span><strong>merece<br />ser visto.</strong><p>Participe do desafio e mostre o cuidado que existe em cada ponto.</p></div><div className="auth-rodape">Vitor Matrizes de Bordado <span>·</span> Processo seletivo 2026</div></div></div><main className="auth-form-wrap"><div className="auth-form"><div className="auth-mobile-logo"><Logo /></div><p className="eyebrow">{portalAdmin ? 'ÁREA RESTRITA' : modo === 'register' ? 'COMECE SUA JORNADA' : 'BEM-VINDO AO DESAFIO'}</p><h1>{modo === 'forgot' ? 'Recupere seu acesso' : modo === 'register' ? 'Crie seu cadastro' : portalAdmin ? 'Acesso administrativo' : 'Acesse seu portal'}</h1><p className="texto-suave">{modo === 'forgot' ? 'Informe seu e-mail para receber as instruções.' : modo === 'register' ? 'Preencha seus dados para participar do processo seletivo.' : portalAdmin ? 'Entre com as credenciais da equipe de recrutamento.' : 'Entre para acompanhar sua candidatura e seu desafio.'}</p><form onSubmit={enviar}>{modo === 'register' && <label>Nome completo<input placeholder="Como podemos te chamar?" required /></label>}<label>E-mail<input type="email" placeholder={portalAdmin ? 'admin@vitorbordados.com' : 'mariana@vitorbordados.com'} value={email} onChange={event => setEmail(event.target.value)} required /></label>{modo !== 'forgot' && <label>Senha<input type="password" placeholder="Digite sua senha" value={senha} onChange={event => setSenha(event.target.value)} required /></label>}{modo === 'register' && <label>Experiência com Wilcom<select defaultValue=""><option value="" disabled>Selecione uma opção</option><option>Menos de 1 ano</option><option>1 a 3 anos</option><option>3 a 5 anos</option><option>Mais de 5 anos</option></select></label>}{mensagem && <div className="auth-mensagem">{mensagem}</div>}<button className="botao-principal largura-total auth-submit" type="submit">{modo === 'forgot' ? 'Enviar instruções' : modo === 'register' ? 'Criar meu cadastro' : 'Entrar no portal'} <ArrowRight size={17} /></button></form>{modo === 'login' && <button className="esqueci-senha" onClick={() => { setModo('forgot'); setMensagem('') }}>Esqueci minha senha</button>}<p className="auth-troca">{modo === 'forgot' ? 'Lembrou sua senha?' : modo === 'register' ? 'Já possui uma conta?' : portalAdmin ? 'Voltar para o acesso de candidato?' : 'Ainda não possui cadastro?'} <button onClick={() => { setModo(modo === 'login' ? 'register' : 'login'); setMensagem('') }}>{modo === 'login' ? (portalAdmin ? 'Acessar candidato' : 'Criar conta') : 'Voltar para o login'}</button></p>{modo === 'login' && <div className="contas-demo"><strong>{portalAdmin ? 'Acesso administrativo' : 'Acesso de demonstração'}</strong><span>{portalAdmin ? 'admin@vitorbordados.com · admin123' : 'mariana@vitorbordados.com · 123456'}</span></div>}</div></main></div>
}
