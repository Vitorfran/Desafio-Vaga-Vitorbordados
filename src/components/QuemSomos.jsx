// Tela institucional com a história e o posicionamento da Vitor Bordados.
import { Building2, HeartHandshake, MapPin, Scissors } from 'lucide-react'

export default function QuemSomos() {
  return <section className="quem-somos">
    <div className="pagina-cabecalho quem-somos-cabecalho">
      <div>
        <p className="eyebrow">SOBRE A VITOR BORDADOS</p>
        <h2>Quem somos</h2>
        <p className="texto-suave">Matrizes de bordado pensadas para transformar ideias em peças que fazem sentido.</p>
      </div>
    </div>
    <section className="card quem-somos-hero">
      <div className="quem-somos-hero-texto">
        <span className="quem-somos-kicker">DE BLUMENAU, SC</span>
        <h3 style={{color: "white"}} >Atendendo bem para atender sempre.</h3>
        <p>A Vitor Bordados é uma empresa de Blumenau especializada em fornecer matrizes de bordado para negócios que precisam de qualidade, agilidade e atenção aos detalhes.</p>
        <p>Atendemos especialmente pequenas quantidades, ajudando marcas e empreendedores a produzirem com segurança, mesmo quando cada peça conta.</p>
      </div>
      <div className="quem-somos-marca"><img src="/logo.png" alt="Vitor Matrizes de Bordado" /><strong>VITOR</strong><span>MATRIZES DE BORDADO</span></div>
    </section>
    <div className="quem-somos-valores">
      <article className="card"><span className="icone-box azul-claro"><MapPin size={20} /></span><h3>Blumenau e região</h3><p className="texto-suave">Uma empresa local, próxima dos clientes e conectada à tradição têxtil do Vale do Itajaí.</p></article>
      <article className="card"><span className="icone-box amarelo"><Scissors size={20} /></span><h3>Pequenas quantidades</h3><p className="texto-suave">Soluções para quem precisa produzir bem, mesmo em lotes menores e projetos personalizados.</p></article>
      <article className="card"><span className="icone-box verde-claro"><HeartHandshake size={20} /></span><h3>Parceria de verdade</h3><p className="texto-suave">Escutamos cada necessidade para entregar matrizes organizadas, funcionais e prontas para produção.</p></article>
    </div>
    <section className="card quem-somos-proposito"><div className="icone-box roxo-claro"><Building2 size={20} /></div><div><p className="eyebrow">NOSSO PROPÓSITO</p><h3>Fazer o bordado acontecer com mais confiança.</h3><p className="texto-suave">Do primeiro desenho à peça final, acreditamos que uma boa matriz combina técnica, criatividade e respeito pelo processo de cada cliente.</p></div></section>
  </section>
}
