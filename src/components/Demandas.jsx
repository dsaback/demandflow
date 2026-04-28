import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const urgCfg = {
  critica:{ label:'Crítica', color:'#EF4444', bg:'rgba(239,68,68,0.12)' },
  alta:   { label:'Alta',    color:'#F59E0B', bg:'rgba(245,158,11,0.12)' },
  media:  { label:'Média',   color:'#3B82F6', bg:'rgba(59,130,246,0.12)' },
  baixa:  { label:'Baixa',   color:'#10B981', bg:'rgba(16,185,129,0.12)' },
}
const stCfg = {
  pendente:      { label:'Pendente',     color:'#64748B' },
  'em-andamento':{ label:'Em Andamento', color:'#3B82F6' },
  concluido:     { label:'Concluído',    color:'#10B981' },
}

function timeAgo(ts) {
  const m = Math.floor((Date.now() - new Date(ts).getTime()) / 60000)
  if (m < 60) return `${m}min atrás`
  const h = Math.floor(m/60)
  if (h < 24) return `${h}h atrás`
  return `${Math.floor(h/24)}d atrás`
}

async function analisarIA(demanda) {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      messages: [{
        role: 'user',
        content: `Analise esta demanda e retorne APENAS JSON válido sem markdown:
{"resumo":"resumo em 1 linha","urgencia":"critica|alta|media|baixa","tempoEstimado":número_horas,"tags":["tag1"],"solucoes":[{"titulo":"título","descricao":"descrição detalhada","prazo":"imediato|curto|médio"}]}
Cliente: ${demanda.cliente_nome}
Mensagem: ${demanda.mensagem}`
      }]
    })
  })
  const data = await res.json()
  const text = data.content?.map(i=>i.text||'').join('') || ''
  return JSON.parse(text.replace(/```json|```/g,'').trim())
}

export default function Demandas({ user, clientes }) {
  const [demandas, setDemandas] = useState([])
  const [loading, setLoading] = useState(true)
  const [selecionada, setSelecionada] = useState(null)
  const [filtro, setFiltro] = useState('todas')
  const [nova, setNova] = useState(null)
  const [analisando, setAnalisando] = useState(null)
  const [iaErro, setIaErro] = useState(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => { carregar() }, [])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('demandas').select('*').eq('user_id',user.id).order('criado_em',{ascending:false})
    setDemandas(data||[])
    setLoading(false)
  }

  const filtradas = demandas.filter(d => {
    if (filtro==='todas') return true
    if (['critica','alta','media','baixa'].includes(filtro)) return d.urgencia===filtro
    return d.status===filtro
  })

  async function handleSalvar() {
    if (!nova?.mensagem?.trim()||!nova?.cliente_nome?.trim()) return
    setSalvando(true)
    const { data, error } = await supabase.from('demandas').insert([{
      user_id:user.id, cliente_nome:nova.cliente_nome, mensagem:nova.mensagem,
      canal:'Manual', urgencia:'media', status:'pendente', tempo_estimado:1, tags:[], solucoes:[]
    }]).select().single()
    if (!error&&data) {
      setDemandas(prev=>[data,...prev])
      setNova(null)
      setSalvando(false)
      handleAnalisar(data)
    } else setSalvando(false)
  }

  async function handleAnalisar(demanda) {
    setAnalisando(demanda.id); setIaErro(null)
    try {
      const a = await analisarIA(demanda)
      const up = { urgencia:a.urgencia||demanda.urgencia, tempo_estimado:a.tempoEstimado||demanda.tempo_estimado,
        tags:a.tags||[], resumo_ia:a.resumo||null, solucoes:a.solucoes||[] }
      await supabase.from('demandas').update(up).eq('id',demanda.id)
      const updated = {...demanda,...up}
      setDemandas(prev=>prev.map(d=>d.id===demanda.id?updated:d))
      if (selecionada?.id===demanda.id) setSelecionada(updated)
    } catch(e) { setIaErro('Erro: '+e.message) }
    setAnalisando(null)
  }

  async function handleStatus(id, status) {
    await supabase.from('demandas').update({status}).eq('id',id)
    setDemandas(prev=>prev.map(d=>d.id===id?{...d,status}:d))
    if (selecionada?.id===id) setSelecionada(p=>({...p,status}))
  }

  const prazoColor = { imediato:'#EF4444', curto:'#F59E0B', 'médio':'#10B981' }

  // ── DETALHE ────────────────────────────────────────────────────
  if (selecionada) {
    const d = demandas.find(x=>x.id===selecionada.id)||selecionada
    const urg = urgCfg[d.urgencia]
    return (
      <div style={s.scroll} className="fade-in">
        <button style={s.back} onClick={()=>setSelecionada(null)}>← Voltar</button>
        <div style={s.detCliente}>{d.cliente_nome}</div>
        <div style={s.detMeta}>
          <span style={{...s.urgBadge,background:urg.bg,color:urg.color}}>{urg.label}</span>
          <span style={s.meta}>📱 {d.canal}</span>
          <span style={s.meta}>{timeAgo(d.criado_em)}</span>
          <span style={s.meta}>⏱ {d.tempo_estimado}h</span>
        </div>
        <div style={s.statusRow}>
          {Object.entries(stCfg).map(([k,v])=>(
            <button key={k} onClick={()=>handleStatus(d.id,k)}
              style={{...s.stBtn,...(d.status===k?{background:'#1E293B',color:v.color,borderColor:v.color}:{})}}>
              {v.label}
            </button>
          ))}
        </div>
        <div style={s.msgBox}>
          <div style={s.msgLbl}>💬 MENSAGEM</div>
          <p style={s.msgTxt}>{d.mensagem}</p>
        </div>
        {d.resumo_ia && (
          <div style={s.iaBox}>
            <span style={s.iaBadge}>🤖 IA</span>
            <p style={s.iaTxt}>{d.resumo_ia}</p>
          </div>
        )}
        {d.tags?.length>0 && <div style={s.tags}>{d.tags.map(t=><span key={t} style={s.tag}>{t}</span>)}</div>}
        <div style={s.iaSection}>
          <div style={s.iaSectionHead}>
            <span style={s.iaSectionTitle}>✨ Soluções sugeridas</span>
            <button onClick={()=>handleAnalisar(d)} disabled={!!analisando} style={s.anBtn}>
              {analisando===d.id?'⏳ Analisando...':d.solucoes?.length?'Re-analisar':'Analisar com IA'}
            </button>
          </div>
          {iaErro && <p style={{color:'#EF4444',fontSize:12,margin:'8px 0'}}>{iaErro}</p>}
          {analisando===d.id && <div style={s.loadRow}><Spin/> Analisando a demanda...</div>}
          {!analisando && d.solucoes?.length>0 && d.solucoes.map((sol,i)=>(
            <div key={i} style={s.solCard}>
              <div style={s.solHead}>
                <span style={s.solN}>{i+1}</span>
                <span style={s.solTit}>{sol.titulo}</span>
                <span style={{...s.prazoBadge,background:`${prazoColor[sol.prazo]||'#888'}22`,color:prazoColor[sol.prazo]||'#888'}}>{sol.prazo}</span>
              </div>
              <p style={s.solDesc}>{sol.descricao}</p>
            </div>
          ))}
          {!analisando && !d.solucoes?.length && <p style={{color:'#334155',fontSize:12,paddingTop:8}}>Clique em "Analisar com IA" para obter sugestões.</p>}
        </div>
      </div>
    )
  }

  // ── NOVA DEMANDA ───────────────────────────────────────────────
  if (nova !== null) {
    return (
      <div style={s.scroll} className="fade-in">
        <button style={s.back} onClick={()=>setNova(null)}>← Cancelar</button>
        <h2 style={s.titulo}>Nova Demanda</h2>
        <p style={{color:'#475569',fontSize:12,marginBottom:20}}>Cole a mensagem do WhatsApp — a IA classifica automaticamente.</p>
        <Fld label="Cliente">
          {clientes.length>0
            ? <select style={s.inp} value={nova.cliente_nome||''} onChange={e=>setNova(p=>({...p,cliente_nome:e.target.value}))}>
                <option value="">Selecione...</option>
                {clientes.map(c=><option key={c.id} value={c.nome}>{c.nome}</option>)}
              </select>
            : <input style={s.inp} placeholder="Nome do cliente" value={nova.cliente_nome||''} onChange={e=>setNova(p=>({...p,cliente_nome:e.target.value}))}/>
          }
        </Fld>
        <Fld label="Mensagem / Demanda">
          <textarea style={{...s.inp,minHeight:120,resize:'vertical'}}
            placeholder="Cole aqui a mensagem do WhatsApp..."
            value={nova.mensagem||''} onChange={e=>setNova(p=>({...p,mensagem:e.target.value}))}/>
        </Fld>
        <button style={s.btnPri} onClick={handleSalvar} disabled={salvando}>
          {salvando?'⏳ Salvando...':'✨ Adicionar e Analisar com IA'}
        </button>
      </div>
    )
  }

  // ── LISTA ──────────────────────────────────────────────────────
  const stats = {
    total:demandas.length,
    criticas:demandas.filter(d=>d.urgencia==='critica').length,
    pendentes:demandas.filter(d=>d.status==='pendente').length,
  }

  return (
    <div style={s.scroll}>
      <div style={s.statsRow}>
        {[{l:'Total',v:stats.total,c:'#E2E8F0'},{l:'Críticas',v:stats.criticas,c:'#EF4444'},{l:'Pendentes',v:stats.pendentes,c:'#F59E0B'}].map(st=>(
          <div key={st.l} style={s.statCard}>
            <span style={{...s.statVal,color:st.c}}>{st.v}</span>
            <span style={s.statLbl}>{st.l}</span>
          </div>
        ))}
      </div>
      <div style={s.filtros}>
        {['todas','critica','alta','pendente','em-andamento','concluido'].map(f=>(
          <button key={f} onClick={()=>setFiltro(f)} style={{...s.fBtn,...(filtro===f?s.fBtnA:{})}}>
            {f==='todas'?'Todas':f==='em-andamento'?'Andamento':f.charAt(0).toUpperCase()+f.slice(1)}
          </button>
        ))}
      </div>
      <button style={s.addBtn} onClick={()=>setNova({})}>+ Nova Demanda</button>
      {loading && <div style={s.loadRow} className="pulse"><Spin/> Carregando...</div>}
      <div style={{display:'flex',flexDirection:'column',gap:8}}>
        {filtradas.length===0&&!loading && <div style={s.vazio}>Nenhuma demanda encontrada.</div>}
        {filtradas.map(d=>{
          const urg=urgCfg[d.urgencia]; const st=stCfg[d.status]
          return (
            <div key={d.id} style={s.card} className="fade-in" onClick={()=>setSelecionada(d)}>
              <div style={{...s.cardBarra,background:urg.color}}/>
              <div style={s.cardBody}>
                <div style={s.cardTop}>
                  <span style={s.cardCliente}>{d.cliente_nome}</span>
                  <span style={{...s.urgBadge,background:urg.bg,color:urg.color,fontSize:10}}>{urg.label}</span>
                </div>
                <p style={s.cardMsg}>{d.mensagem}</p>
                {d.resumo_ia && <p style={s.cardResIA}>🤖 {d.resumo_ia}</p>}
                <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                  <span style={{color:st.color,fontSize:11,fontWeight:600}}>● {st.label}</span>
                  <span style={s.meta}>⏱ {d.tempo_estimado}h</span>
                  <span style={s.meta}>{timeAgo(d.criado_em)}</span>
                  {analisando===d.id && <span style={{color:'#3B82F6',fontSize:11}} className="pulse">⚡ Analisando...</span>}
                </div>
                {d.tags?.length>0 && <div style={s.tags}>{d.tags.map(t=><span key={t} style={s.tag}>{t}</span>)}</div>}
              </div>
            </div>
          )
        })}
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

function Spin() {
  return <span style={{width:14,height:14,border:'2px solid #1E293B',borderTop:'2px solid #3B82F6',
    borderRadius:'50%',display:'inline-block',flexShrink:0}}/>
}

const s = {
  scroll:{padding:'16px',overflowY:'auto',height:'100%'},
  back:{background:'none',border:'none',color:'#64748B',fontSize:13,marginBottom:16,padding:0},
  titulo:{fontSize:18,fontWeight:700,color:'#F1F5F9',fontFamily:'Syne,sans-serif',marginBottom:6},
  statsRow:{display:'flex',gap:10,marginBottom:16},
  statCard:{flex:1,background:'#0F172A',border:'1px solid #1E293B',borderRadius:8,padding:'10px 12px',display:'flex',flexDirection:'column',gap:2},
  statVal:{fontSize:20,fontWeight:700,lineHeight:1},
  statLbl:{fontSize:9,color:'#334155',textTransform:'uppercase',letterSpacing:1},
  filtros:{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12},
  fBtn:{background:'#0F172A',border:'1px solid #1E293B',color:'#64748B',padding:'5px 10px',borderRadius:6,fontSize:11,fontWeight:600},
  fBtnA:{background:'#1E293B',color:'#E2E8F0',borderColor:'#334155'},
  addBtn:{width:'100%',background:'#1D4ED8',border:'none',color:'#fff',padding:'10px',borderRadius:8,fontSize:12,fontWeight:700,marginBottom:14},
  loadRow:{display:'flex',gap:10,alignItems:'center',color:'#475569',fontSize:12,padding:'12px 0'},
  card:{background:'#0C1220',border:'1px solid #1E293B',borderRadius:10,display:'flex',overflow:'hidden',cursor:'pointer'},
  cardBarra:{width:3,flexShrink:0},
  cardBody:{flex:1,padding:'12px 14px'},
  cardTop:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:5},
  cardCliente:{fontSize:13,fontWeight:700,color:'#F1F5F9'},
  urgBadge:{fontSize:10,fontWeight:700,padding:'2px 8px',borderRadius:20,textTransform:'uppercase',letterSpacing:0.5},
  cardMsg:{fontSize:12,color:'#64748B',marginBottom:6,overflow:'hidden',textOverflow:'ellipsis',display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical'},
  cardResIA:{fontSize:11,color:'#334155',marginBottom:5,fontStyle:'italic'},
  tags:{display:'flex',gap:5,flexWrap:'wrap',marginTop:6},
  tag:{background:'#1E293B',color:'#64748B',fontSize:10,padding:'1px 7px',borderRadius:3},
  vazio:{color:'#334155',textAlign:'center',padding:'40px 0',fontSize:13},
  // detalhe
  detCliente:{fontSize:20,fontWeight:700,color:'#F1F5F9',fontFamily:'Syne,sans-serif',marginBottom:8},
  detMeta:{display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',marginBottom:12},
  meta:{fontSize:11,color:'#334155'},
  statusRow:{display:'flex',gap:6,flexWrap:'wrap',marginBottom:16},
  stBtn:{background:'#0F172A',border:'1px solid #1E293B',color:'#475569',padding:'5px 10px',borderRadius:6,fontSize:11,fontFamily:'inherit'},
  msgBox:{background:'#0F172A',border:'1px solid #1E293B',borderRadius:8,padding:'14px',marginBottom:12},
  msgLbl:{fontSize:9,color:'#334155',letterSpacing:1.5,textTransform:'uppercase',marginBottom:6},
  msgTxt:{fontSize:13,color:'#94A3B8',lineHeight:1.6},
  iaBox:{background:'#0D1F15',border:'1px solid rgba(16,185,129,0.3)',borderRadius:8,padding:'10px 14px',display:'flex',gap:8,alignItems:'flex-start',marginBottom:12},
  iaBadge:{fontSize:9,fontWeight:700,background:'#10B981',color:'#fff',padding:'2px 6px',borderRadius:3,flexShrink:0},
  iaTxt:{fontSize:12,color:'#10B981',margin:0,lineHeight:1.5},
  iaSection:{background:'#0F172A',border:'1px solid #1E293B',borderRadius:10,padding:'16px',marginTop:16},
  iaSectionHead:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14},
  iaSectionTitle:{fontSize:13,fontWeight:700,color:'#F1F5F9'},
  anBtn:{background:'#1D4ED8',border:'none',color:'#fff',padding:'6px 14px',borderRadius:7,fontSize:11,fontWeight:700},
  solCard:{background:'#080C14',border:'1px solid #0F172A',borderRadius:8,padding:'12px',marginBottom:10},
  solHead:{display:'flex',gap:8,alignItems:'center',marginBottom:6},
  solN:{width:20,height:20,background:'#1D4ED8',borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:700,color:'#fff',flexShrink:0},
  solTit:{fontWeight:700,fontSize:12,color:'#E2E8F0',flex:1},
  prazoBadge:{fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:3,textTransform:'uppercase',letterSpacing:0.5},
  solDesc:{fontSize:12,color:'#64748B',lineHeight:1.5,margin:0},
  // form
  inp:{width:'100%',background:'#0F172A',border:'1px solid #1E293B',color:'#E2E8F0',borderRadius:7,padding:'9px 12px',fontSize:13,outline:'none',fontFamily:'inherit'},
  btnPri:{width:'100%',background:'#1D4ED8',border:'none',color:'#fff',padding:'12px',borderRadius:8,fontSize:13,fontWeight:700},
}
