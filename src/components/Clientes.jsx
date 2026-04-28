import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const CORES = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#F97316','#EC4899']

export default function Clientes({ user, onClientesChange }) {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [novo, setNovo] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState(null)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('clientes').select('*').eq('user_id',user.id).order('nome')
    const lista = data||[]
    setClientes(lista)
    onClientesChange?.(lista)
    setLoading(false)
  }

  async function salvar() {
    if (!novo?.nome?.trim()) { setErro('Nome obrigatório'); return }
    setSalvando(true); setErro(null)
    const { data, error } = await supabase.from('clientes').insert([{
      user_id:user.id, nome:novo.nome, empresa:novo.empresa||null,
      telefone:novo.telefone||null, email:novo.email||null, cor:novo.cor||CORES[0]
    }]).select().single()
    if (error) { setErro(error.message); setSalvando(false); return }
    const lista=[...clientes,data]
    setClientes(lista); onClientesChange?.(lista)
    setNovo(null); setSalvando(false)
  }

  async function excluir(id) {
    if (!confirm('Excluir este cliente?')) return
    await supabase.from('clientes').delete().eq('id',id)
    const lista=clientes.filter(c=>c.id!==id)
    setClientes(lista); onClientesChange?.(lista)
  }

  if (novo !== null) {
    return (
      <div style={s.scroll} className="fade-in">
        <button style={s.back} onClick={()=>{setNovo(null);setErro(null)}}>← Cancelar</button>
        <h2 style={s.titulo}>Novo Cliente</h2>
        {erro && <div style={s.err}>{erro}</div>}
        <Fld label="Nome *"><input style={s.inp} value={novo.nome||''} onChange={e=>setNovo(p=>({...p,nome:e.target.value}))} placeholder="Nome ou empresa"/></Fld>
        <Fld label="Empresa"><input style={s.inp} value={novo.empresa||''} onChange={e=>setNovo(p=>({...p,empresa:e.target.value}))} placeholder="Razão social (opcional)"/></Fld>
        <Fld label="WhatsApp"><input style={s.inp} value={novo.telefone||''} onChange={e=>setNovo(p=>({...p,telefone:e.target.value}))} placeholder="(11) 99999-0000"/></Fld>
        <Fld label="Email"><input style={s.inp} type="email" value={novo.email||''} onChange={e=>setNovo(p=>({...p,email:e.target.value}))} placeholder="email@cliente.com"/></Fld>
        <Fld label="Cor">
          <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
            {CORES.map(c=>(
              <button key={c} onClick={()=>setNovo(p=>({...p,cor:c}))}
                style={{width:28,height:28,borderRadius:'50%',background:c,border:`3px solid ${novo.cor===c?'#fff':'transparent'}`,cursor:'pointer'}}/>
            ))}
          </div>
        </Fld>
        <button style={s.btnPri} onClick={salvar} disabled={salvando}>{salvando?'Salvando...':'Salvar Cliente'}</button>
      </div>
    )
  }

  return (
    <div style={s.scroll}>
      <div style={s.header}>
        <h2 style={s.titulo}>Clientes</h2>
        <button style={s.addBtn} onClick={()=>setNovo({cor:CORES[0]})}>+ Novo</button>
      </div>
      {loading && <div style={{color:'#334155',fontSize:12,padding:'20px 0'}} className="pulse">Carregando...</div>}
      {!loading&&clientes.length===0 && (
        <div style={s.vazio}>
          <div style={{fontSize:32,marginBottom:12}}>👥</div>
          <p>Nenhum cliente cadastrado.</p>
          <button style={{...s.btnPri,marginTop:14}} onClick={()=>setNovo({cor:CORES[0]})}>Adicionar primeiro cliente</button>
        </div>
      )}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {clientes.map(c=>(
          <div key={c.id} style={s.card}>
            <div style={{width:4,background:c.cor,alignSelf:'stretch',flexShrink:0}}/>
            <div style={{flex:1,padding:'12px 14px'}}>
              <div style={{fontSize:14,fontWeight:700,color:'#F1F5F9'}}>{c.nome}</div>
              {c.empresa&&<div style={{fontSize:11,color:'#475569',marginTop:2}}>{c.empresa}</div>}
              <div style={{display:'flex',gap:12,marginTop:4}}>
                {c.telefone&&<span style={{fontSize:11,color:'#475569'}}>📱 {c.telefone}</span>}
                {c.email&&<span style={{fontSize:11,color:'#475569'}}>✉️ {c.email}</span>}
              </div>
            </div>
            <button style={{background:'none',border:'none',color:'#334155',padding:'0 14px',fontSize:14,alignSelf:'stretch',display:'flex',alignItems:'center'}} onClick={()=>excluir(c.id)}>✕</button>
          </div>
        ))}
      </div>
    </div>
  )
}

function Fld({label,children}) {
  return <div style={{marginBottom:14}}>
    <div style={{fontSize:10,color:'#475569',textTransform:'uppercase',letterSpacing:1,marginBottom:5}}>{label}</div>
    {children}
  </div>
}

const s = {
  scroll:{padding:'16px',overflowY:'auto',height:'100%'},
  header:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16},
  titulo:{fontSize:18,fontWeight:700,color:'#F1F5F9',fontFamily:'Syne,sans-serif',margin:0},
  addBtn:{background:'#1D4ED8',border:'none',color:'#fff',padding:'7px 14px',borderRadius:7,fontSize:12,fontWeight:700},
  back:{background:'none',border:'none',color:'#64748B',fontSize:13,marginBottom:16,padding:0},
  card:{background:'#0C1220',border:'1px solid #1E293B',borderRadius:10,display:'flex',overflow:'hidden',alignItems:'center'},
  vazio:{textAlign:'center',padding:'40px 0',color:'#334155',fontSize:13},
  err:{background:'rgba(239,68,68,0.1)',border:'1px solid rgba(239,68,68,0.3)',color:'#EF4444',borderRadius:7,padding:'8px 12px',fontSize:12,marginBottom:14},
  inp:{width:'100%',background:'#0F172A',border:'1px solid #1E293B',color:'#E2E8F0',borderRadius:7,padding:'9px 12px',fontSize:13,outline:'none',fontFamily:'inherit'},
  btnPri:{width:'100%',background:'#1D4ED8',border:'none',color:'#fff',padding:'11px',borderRadius:8,fontSize:13,fontWeight:700},
}
