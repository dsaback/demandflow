import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import Auth from './components/Auth'
import Demandas from './components/Demandas'
import Agenda from './components/Agenda'
import Clientes from './components/Clientes'

export default function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [aba, setAba] = useState('demandas')
  const [clientes, setClientes] = useState([])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return <Splash />
  if (!session) return <Auth />

  const nome = session.user.user_metadata?.nome || session.user.email?.split('@')[0] || 'Consultor'

  return (
    <div style={s.root}>
      <header style={s.header}>
        <div style={s.headerLeft}>
          <span style={s.icon}>◈</span>
          <div>
            <div style={s.brand}>DemandFlow</div>
            <div style={s.sub}>Olá, {nome}</div>
          </div>
        </div>
        <button style={s.logout} onClick={() => supabase.auth.signOut()} title="Sair">⎋ Sair</button>
      </header>

      <main style={s.main}>
        {aba === 'demandas' && <Demandas user={session.user} clientes={clientes} />}
        {aba === 'agenda'   && <Agenda   user={session.user} clientes={clientes} />}
        {aba === 'clientes' && <Clientes user={session.user} onClientesChange={setClientes} />}
      </main>

      <nav style={s.nav}>
        {[
          { key:'demandas', icon:'⚡', label:'Demandas' },
          { key:'agenda',   icon:'📅', label:'Agenda'   },
          { key:'clientes', icon:'👥', label:'Clientes'  },
        ].map(item => (
          <button key={item.key} onClick={() => setAba(item.key)}
            style={{...s.navItem, ...(aba===item.key ? s.navAtivo : {})}}>
            <span style={s.navIcon}>{item.icon}</span>
            <span style={s.navLabel}>{item.label}</span>
            {aba===item.key && <div style={s.navBar}/>}
          </button>
        ))}
      </nav>
    </div>
  )
}

function Splash() {
  return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
      background:'#080C14',flexDirection:'column',gap:16}}>
      <div style={{fontSize:36,color:'#3B82F6'}}>◈</div>
      <div style={{fontSize:18,fontWeight:800,color:'#F1F5F9',fontFamily:'Syne,sans-serif'}}>DemandFlow</div>
      <div style={{width:24,height:24,border:'2px solid #1E293B',borderTop:'2px solid #3B82F6',
        borderRadius:'50%',animation:'spin 0.8s linear infinite'}}/>
    </div>
  )
}

const s = {
  root:{display:'flex',flexDirection:'column',height:'100vh',height:'100dvh',background:'#080C14',overflow:'hidden'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 16px',
    background:'#0C1220',borderBottom:'1px solid #1E293B',flexShrink:0},
  headerLeft:{display:'flex',alignItems:'center',gap:10},
  icon:{fontSize:20,color:'#3B82F6'},
  brand:{fontSize:14,fontWeight:800,color:'#F1F5F9',fontFamily:'Syne,sans-serif',lineHeight:1.2},
  sub:{fontSize:10,color:'#334155',marginTop:1},
  logout:{background:'#0F172A',border:'1px solid #1E293B',color:'#475569',
    padding:'6px 12px',borderRadius:7,fontSize:11,fontWeight:600},
  main:{flex:1,overflow:'hidden',position:'relative'},
  nav:{display:'flex',background:'#0C1220',borderTop:'1px solid #1E293B',flexShrink:0},
  navItem:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',
    padding:'10px 0 8px',background:'none',border:'none',color:'#334155',position:'relative',gap:3},
  navAtivo:{color:'#3B82F6'},
  navIcon:{fontSize:20,lineHeight:1},
  navLabel:{fontSize:10,fontWeight:600,letterSpacing:0.3},
  navBar:{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',
    width:24,height:2,background:'#3B82F6',borderRadius:'0 0 2px 2px'},
}
