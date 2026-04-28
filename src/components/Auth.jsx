import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Auth() {
  const [modo, setModo] = useState('login')
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [nome, setNome] = useState('')
  const [loading, setLoading] = useState(false)
  const [msg, setMsg] = useState(null)
  const [erro, setErro] = useState(null)

  async function handleLogin(e) {
    e.preventDefault(); setLoading(true); setErro(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) setErro('Email ou senha incorretos.')
    setLoading(false)
  }

  async function handleCadastro(e) {
    e.preventDefault()
    if (senha.length < 6) { setErro('Senha deve ter ao menos 6 caracteres.'); return }
    setLoading(true); setErro(null)
    const { error } = await supabase.auth.signUp({ email, password: senha, options: { data: { nome } } })
    if (error) setErro(error.message)
    else setMsg('Conta criada! Verifique seu email para confirmar.')
    setLoading(false)
  }

  async function handleReset(e) {
    e.preventDefault(); setLoading(true); setErro(null)
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: window.location.origin })
    if (error) setErro(error.message)
    else setMsg('Email de recuperação enviado!')
    setLoading(false)
  }

  return (
    <div style={s.root}>
      <div style={s.glow1}/><div style={s.glow2}/>
      <div style={s.card} className="fade-in">
        <div style={s.logo}>
          <span style={s.logoIcon}>◈</span>
          <div>
            <div style={s.logoName}>DemandFlow</div>
            <div style={s.logoSub}>Gestão inteligente de demandas</div>
          </div>
        </div>

        {modo !== 'reset' && (
          <div style={s.tabs}>
            {['login','cadastro'].map(m => (
              <button key={m} onClick={()=>{setModo(m);setErro(null);setMsg(null)}}
                style={{...s.tab,...(modo===m?s.tabAtivo:{})}}>
                {m==='login'?'Entrar':'Criar conta'}
              </button>
            ))}
          </div>
        )}

        {msg  && <div style={s.ok}>{msg}</div>}
        {erro && <div style={s.err}>{erro}</div>}

        {modo === 'login' && (
          <form onSubmit={handleLogin} style={s.form}>
            <Fld label="Email"><input style={s.inp} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required/></Fld>
            <Fld label="Senha"><input style={s.inp} type="password" placeholder="••••••••" value={senha} onChange={e=>setSenha(e.target.value)} required/></Fld>
            <button type="submit" style={s.btn} disabled={loading}>{loading?<Spin/>:'Entrar'}</button>
            <button type="button" style={s.link} onClick={()=>{setModo('reset');setErro(null);setMsg(null)}}>Esqueci minha senha</button>
          </form>
        )}

        {modo === 'cadastro' && (
          <form onSubmit={handleCadastro} style={s.form}>
            <Fld label="Seu nome"><input style={s.inp} placeholder="João Silva" value={nome} onChange={e=>setNome(e.target.value)} required/></Fld>
            <Fld label="Email"><input style={s.inp} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required/></Fld>
            <Fld label="Senha"><input style={s.inp} type="password" placeholder="mínimo 6 caracteres" value={senha} onChange={e=>setSenha(e.target.value)} required/></Fld>
            <button type="submit" style={s.btn} disabled={loading}>{loading?<Spin/>:'Criar conta grátis'}</button>
          </form>
        )}

        {modo === 'reset' && (
          <form onSubmit={handleReset} style={s.form}>
            <p style={{fontSize:13,color:'#64748B',lineHeight:1.6,marginBottom:16}}>Informe seu email para receber o link de recuperação.</p>
            <Fld label="Email"><input style={s.inp} type="email" placeholder="seu@email.com" value={email} onChange={e=>setEmail(e.target.value)} required/></Fld>
            <button type="submit" style={s.btn} disabled={loading}>{loading?<Spin/>:'Enviar link'}</button>
            <button type="button" style={s.link} onClick={()=>{setModo('login');setErro(null);setMsg(null)}}>← Voltar ao login</button>
          </form>
        )}
      </div>
    </div>
  )
}

function Fld({label,children}) {
  return <div style={{marginBottom:14}}>
    <label style={{display:'block',fontSize:10,color:'#475569',textTransform:'uppercase',letterSpacing:1,marginBottom:5}}>{label}</label>
    {children}
  </div>
}

function Spin() {
  return <span style={{width:16,height:16,border:'2px solid rgba(255,255,255,0.3)',borderTop:'2px solid #fff',
    borderRadius:'50%',display:'inline-block',animation:'spin 0.8s linear infinite'}}/>
}

const s = {
  root:{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
    background:'#080C14',position:'relative',overflow:'hidden',padding:16},
  glow1:{position:'absolute',top:'-20%',left:'-10%',width:500,height:500,
    background:'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)',pointerEvents:'none'},
  glow2:{position:'absolute',bottom:'-20%',right:'-10%',width:400,height:400,
    background:'radial-gradient(circle, rgba(16,185,129,0.06) 0%, transparent 70%)',pointerEvents:'none'},
  card:{background:'#0C1220',border:'1px solid #1E293B',borderRadius:18,padding:'32px 28px',
    width:'100%',maxWidth:400,position:'relative',zIndex:1},
  logo:{display:'flex',alignItems:'center',gap:12,marginBottom:28},
  logoIcon:{fontSize:28,color:'#3B82F6'},
  logoName:{fontSize:18,fontWeight:800,color:'#F1F5F9',fontFamily:'Syne,sans-serif',letterSpacing:'-0.5px'},
  logoSub:{fontSize:11,color:'#334155',marginTop:2},
  tabs:{display:'flex',background:'#0F172A',borderRadius:8,padding:3,marginBottom:22,gap:3},
  tab:{flex:1,padding:'8px 0',background:'transparent',border:'none',color:'#475569',fontSize:12,fontWeight:600,borderRadius:6},
  tabAtivo:{background:'#1E293B',color:'#E2E8F0'},
  form:{display:'flex',flexDirection:'column'},
  inp:{width:'100%',background:'#0F172A',border:'1px solid #1E293B',color:'#E2E8F0',
    borderRadius:8,padding:'10px 14px',fontSize:13,outline:'none'},
  btn:{background:'#1D4ED8',border:'none',color:'#fff',padding:'12px',borderRadius:9,fontSize:13,
    fontWeight:700,marginTop:6,display:'flex',alignItems:'center',justifyContent:'center',gap:8,height:44},
  link:{background:'none',border:'none',color:'#475569',fontSize:12,marginTop:12,textDecoration:'underline',textUnderlineOffset:3},
  ok:{background:'rgba(16,185,129,0.1)',border:'1px solid rgba(16,185,129,0.3)',color:'#10B981',
    borderRadius:8,padding:'10px 14px',fontSize:12,marginBottom:16,lineHeight:1.5},
  err:{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#EF4444',
    borderRadius:8,padding:'10px 14px',fontSize:12,marginBottom:16,lineHeight:1.5},
}
