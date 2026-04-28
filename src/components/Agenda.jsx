import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

const pad = n => String(n).padStart(2,'0')
const fmtH = d => `${pad(d.getHours())}:${pad(d.getMinutes())}`
const fmtD = d => `${pad(d.getDate())}/${pad(d.getMonth()+1)}`
const DIAS = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const CORES = ['#3B82F6','#10B981','#F59E0B','#8B5CF6','#EF4444','#06B6D4','#F97316']
const urgCor = { critica:'#EF4444', alta:'#F59E0B', media:'#3B82F6', baixa:'#10B981' }

function isMD(a,b){ return a.getFullYear()===b.getFullYear()&&a.getMonth()===b.getMonth()&&a.getDate()===b.getDate() }

function getSemana(ref) {
  const s = new Date(ref); s.setDate(ref.getDate()-ref.getDay())
  return Array.from({length:7},(_,i)=>{ const d=new Date(s); d.setDate(s.getDate()+i); return d })
}

function getDiasMes(ano,mes) {
  const p=new Date(ano,mes,1), u=new Date(ano,mes+1,0), dias=[]
  for(let i=0;i<p.getDay();i++){ const d=new Date(ano,mes,-i); dias.unshift({data:d,fora:true}) }
  for(let i=1;i<=u.getDate();i++) dias.push({data:new Date(ano,mes,i),fora:false})
  const r=42-dias.length
  for(let i=1;i<=r;i++) dias.push({data:new Date(ano,mes+1,i),fora:true})
  return dias
}

function clienteCor(nome, clientes) {
  const c = clientes.find(x=>x.nome===nome)
  if (c?.cor) return c.cor
  return CORES[Math.abs((nome||'').split('').reduce((a,c)=>a+c.charCodeAt(0),0))%CORES.length]
}

export default function Agenda({ user, clientes, eventoPreAgendado, onEventoPreAgendadoConsumed }) {
  const [eventos, setEventos] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('semana')
  const [ref, setRef] = useState(new Date())
  const [diaSel, setDiaSel] = useState(new Date())
  const [sel, setSel] = useState(null)
  const [modal, setModal] = useState(false)
  const [form, setForm] = useState(null)
  const [salvando, setSalvando] = useState(false)
  const hoje = new Date()

  useEffect(()=>{ carregar() },[])

  // Abre modal automaticamente quando vier da tela de Demandas
  useEffect(()=>{
    if (eventoPreAgendado) {
      const base = new Date(); base.setHours(9,0,0,0)
      setForm({
        titulo: eventoPreAgendado.titulo || '',
        cliente_nome: eventoPreAgendado.cliente_nome || clientes[0]?.nome || '',
        data: base,
        hora: '09:00',
        duracao: eventoPreAgendado.duracao || 60,
        urgencia: eventoPreAgendado.urgencia || 'media',
        descricao: eventoPreAgendado.descricao || '',
        status: 'pendente',
      })
      setModal(true)
      onEventoPreAgendadoConsumed?.()
    }
  }, [eventoPreAgendado])

  async function carregar() {
    setLoading(true)
    const { data } = await supabase.from('eventos').select('*').eq('user_id',user.id).order('data_inicio')
    setEventos((data||[]).map(e=>({...e,data:new Date(e.data_inicio)})))
    setLoading(false)
  }

  const evsDia = dia => eventos.filter(e=>isMD(e.data,dia)).sort((a,b)=>a.data-b.data)

  function navegar(dir) {
    const n=new Date(ref)
    if(view==='semana') n.setDate(n.getDate()+dir*7)
    else if(view==='mes') n.setMonth(n.getMonth()+dir)
    else n.setDate(n.getDate()+dir)
    setRef(n)
  }

  function abrirNovo(dia) {
    const b=new Date(dia); b.setHours(9,0,0,0)
    setForm({titulo:'',cliente_nome:clientes[0]?.nome||'',data:b,hora:'09:00',duracao:60,urgencia:'media',descricao:'',status:'pendente'})
    setModal(true)
  }

  async function salvar() {
    if(!form.titulo.trim()) return
    setSalvando(true)
    const [h,min]=form.hora.split(':').map(Number)
    const df=new Date(form.data); df.setHours(h,min,0,0)
    const { data,error } = await supabase.from('eventos').insert([{
      user_id:user.id, titulo:form.titulo, cliente_nome:form.cliente_nome||'',
      data_inicio:df.toISOString(), duracao:form.duracao, urgencia:form.urgencia,
      descricao:form.descricao, status:form.status
    }]).select().single()
    if(!error&&data) setEventos(prev=>[...prev,{...data,data:new Date(data.data_inicio)}])
    setSalvando(false); setModal(false); setForm(null)
  }

  async function atualizarStatus(id,status) {
    await supabase.from('eventos').update({status}).eq('id',id)
    setEventos(prev=>prev.map(e=>e.id===id?{...e,status}:e))
    if(sel?.id===id) setSel(p=>({...p,status}))
  }

  const dias = getSemana(ref)
  const diasMes = getDiasMes(ref.getFullYear(),ref.getMonth())

  return (
    <div style={s.root}>
      {/* Topbar */}
      <div style={s.top}>
        <div style={s.topL}>
          <button style={s.navBtn} onClick={()=>navegar(-1)}>‹</button>
          <button style={s.navBtn} onClick={()=>navegar(1)}>›</button>
          <button style={s.hojeBtn} onClick={()=>{setRef(new Date());setDiaSel(new Date())}}>Hoje</button>
          <span style={s.periodo}>
            {view==='mes'&&`${MESES[ref.getMonth()]} ${ref.getFullYear()}`}
            {view==='semana'&&`${fmtD(dias[0])} – ${fmtD(dias[6])}`}
            {view==='dia'&&`${DIAS[diaSel.getDay()]}, ${diaSel.getDate()} ${MESES[diaSel.getMonth()].slice(0,3)}`}
          </span>
        </div>
        <div style={s.viewTabs}>
          {['dia','semana','mes'].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{...s.vTab,...(view===v?s.vTabA:{})}}>{v.charAt(0).toUpperCase()+v.slice(1)}</button>
          ))}
        </div>
      </div>

      <div style={s.grid}>
        {/* ── SEMANA ── */}
        {view==='semana' && (
          <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={s.semHead}>
              <div style={{width:44,flexShrink:0}}/>
              {dias.map((dia,i)=>{
                const eH=isMD(dia,hoje), qtd=evsDia(dia).length
                return (
                  <div key={i} style={s.diaHead} onClick={()=>{setDiaSel(dia);setView('dia')}}>
                    <span style={{fontSize:9,letterSpacing:1,textTransform:'uppercase',color:eH?'#60A5FA':'#475569'}}>{DIAS[dia.getDay()]}</span>
                    <span style={{...s.diaNum,background:eH?'#3B82F6':'transparent',color:eH?'#fff':'#64748B'}}>{dia.getDate()}</span>
                    {qtd>0&&<span style={s.diaQtd}>{qtd}</span>}
                  </div>
                )
              })}
            </div>
            <div style={s.semGrade}>
              <div style={{width:44,flexShrink:0}}>
                {Array.from({length:13},(_,i)=>i+7).map(h=>(
                  <div key={h} style={s.hLbl}>{pad(h)}:00</div>
                ))}
              </div>
              {dias.map((dia,di)=>{
                const evs=evsDia(dia)
                return (
                  <div key={di} style={{...s.diaCol,background:isMD(dia,hoje)?'rgba(59,130,246,0.02)':'transparent'}}
                    onClick={()=>abrirNovo(dia)}>
                    {Array.from({length:13}).map((_,i)=><div key={i} style={s.celH}/>)}
                    {evs.map(ev=>{
                      const top=(ev.data.getHours()-7+ev.data.getMinutes()/60)*52
                      const height=Math.max((ev.duracao/60)*52,22)
                      const cor=clienteCor(ev.cliente_nome,clientes)
                      return (
                        <div key={ev.id} style={{...s.evBloco,top,height,background:`${cor}20`,borderLeft:`3px solid ${cor}`}}
                          onClick={e=>{e.stopPropagation();setSel(ev)}}>
                          <div style={{fontSize:9,color:cor,fontWeight:700}}>{fmtH(ev.data)}</div>
                          <div style={{fontSize:10,fontWeight:600,color:'#E2E8F0',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{ev.titulo}</div>
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── MÊS ── */}
        {view==='mes' && (
          <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={s.mesHead}>{DIAS.map(d=><div key={d} style={s.mesDN}>{d}</div>)}</div>
            <div style={s.mesGrid}>
              {diasMes.map(({data,fora},i)=>{
                const evs=evsDia(data).slice(0,2), eH=isMD(data,hoje)
                return (
                  <div key={i} style={{...s.mesCel,opacity:fora?0.3:1}} onClick={()=>{setDiaSel(data);setView('dia')}}>
                    <span style={{...s.mesNum,background:eH?'#3B82F6':'transparent',color:eH?'#fff':fora?'#334155':'#94A3B8'}}>{data.getDate()}</span>
                    {evs.map(ev=>{
                      const cor=clienteCor(ev.cliente_nome,clientes)
                      return <div key={ev.id} style={{...s.mesEv,background:`${cor}25`,color:cor}}
                        onClick={e=>{e.stopPropagation();setSel(ev)}}>{ev.titulo}</div>
                    })}
                    {evsDia(data).length>2&&<div style={{fontSize:9,color:'#334155'}}>+{evsDia(data).length-2}</div>}
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── DIA ── */}
        {view==='dia' && (
          <div style={{display:'flex',flexDirection:'column',height:'100%'}}>
            <div style={s.diaInfo}>
              <span style={{fontSize:11,color:'#334155'}}>{evsDia(diaSel).length} evento(s)</span>
              <button style={s.addEvBtn} onClick={()=>abrirNovo(diaSel)}>+ Evento</button>
            </div>
            <div style={{flex:1,display:'flex',overflowY:'auto',position:'relative'}}>
              <div style={{width:52,flexShrink:0}}>
                {Array.from({length:14},(_,i)=>i+7).map(h=>(
                  <div key={h} style={s.diaH}>{pad(h)}:00</div>
                ))}
              </div>
              <div style={{flex:1,position:'relative',cursor:'pointer'}} onClick={()=>abrirNovo(diaSel)}>
                {Array.from({length:14}).map((_,i)=><div key={i} style={{height:64,borderTop:'1px solid #0F172A'}}/>)}
                {evsDia(diaSel).map(ev=>{
                  const top=(ev.data.getHours()-7+ev.data.getMinutes()/60)*64
                  const height=Math.max((ev.duracao/60)*64,32)
                  const cor=clienteCor(ev.cliente_nome,clientes)
                  const fim=new Date(ev.data); fim.setMinutes(fim.getMinutes()+ev.duracao)
                  return (
                    <div key={ev.id} style={{...s.diaEv,top,height,background:`${cor}18`,borderLeft:`4px solid ${cor}`}}
                      onClick={e=>{e.stopPropagation();setSel(ev)}}>
                      <div style={{fontSize:10,color:cor,fontWeight:700}}>{fmtH(ev.data)} – {fmtH(fim)}</div>
                      <div style={{fontSize:13,fontWeight:700,color:'#E2E8F0'}}>{ev.titulo}</div>
                      <div style={{fontSize:11,color:'#475569'}}>{ev.cliente_nome}</div>
                    </div>
                  )
                })}
                {isMD(diaSel,hoje)&&(()=>{
                  const top=(new Date().getHours()-7+new Date().getMinutes()/60)*64
                  return top>=0&&<div style={{position:'absolute',left:0,right:0,height:2,background:'#EF4444',top,zIndex:10}}/>
                })()}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Painel detalhe evento */}
      {sel && (() => {
        const ev=sel, cor=clienteCor(ev.cliente_nome,clientes)
        const fim=new Date(ev.data); fim.setMinutes(fim.getMinutes()+ev.duracao)
        const stOpts=['pendente','confirmado','em-andamento','concluido','urgente']
        const stCor={pendente:'#64748B',confirmado:'#10B981','em-andamento':'#3B82F6',concluido:'#22C55E',urgente:'#EF4444'}
        return (
          <div style={s.painel} className="slide-right">
            <div style={{height:3,background:cor}}/>
            <button style={{position:'absolute',top:10,right:10,background:'none',border:'none',color:'#334155',fontSize:14}} onClick={()=>setSel(null)}>✕</button>
            <div style={{padding:'16px'}}>
              <div style={{fontSize:10,color:'#475569',textTransform:'uppercase',letterSpacing:1.5,marginBottom:4}}>{ev.cliente_nome}</div>
              <h3 style={{fontSize:15,fontWeight:700,color:'#F1F5F9',fontFamily:'Syne,sans-serif',marginBottom:10,lineHeight:1.3}}>{ev.titulo}</h3>
              <div style={{display:'flex',flexDirection:'column',gap:3,marginBottom:12}}>
                <span style={{fontSize:12,color:'#64748B'}}>📅 {fmtD(ev.data)}</span>
                <span style={{fontSize:12,color:'#64748B'}}>🕐 {fmtH(ev.data)} – {fmtH(fim)}</span>
                <span style={{fontSize:12,color:'#64748B'}}>⏱ {ev.duracao} min</span>
              </div>
              <div style={{display:'inline-flex',alignItems:'center',gap:6,background:`${urgCor[ev.urgencia]}22`,
                color:urgCor[ev.urgencia],padding:'3px 10px',borderRadius:20,fontSize:11,fontWeight:700,marginBottom:12}}>
                {ev.urgencia.charAt(0).toUpperCase()+ev.urgencia.slice(1)}
              </div>
              {ev.descricao&&<p style={{fontSize:12,color:'#64748B',lineHeight:1.6,marginBottom:12}}>{ev.descricao}</p>}
              <div style={{fontSize:9,color:'#334155',textTransform:'uppercase',letterSpacing:1.5,marginBottom:8}}>STATUS</div>
              <div style={{display:'flex',flexWrap:'wrap',gap:5}}>
                {stOpts.map(st=>(
                  <button key={st} onClick={()=>atualizarStatus(ev.id,st)}
                    style={{fontSize:10,padding:'4px 8px',borderRadius:5,cursor:'pointer',fontFamily:'inherit',fontWeight:600,
                      background:ev.status===st?`${stCor[st]}22`:'#0F172A',
                      color:ev.status===st?stCor[st]:'#334155',
                      border:`1px solid ${ev.status===st?stCor[st]:'#1E293B'}`}}>{st}</button>
                ))}
              </div>
            </div>
          </div>
        )
      })()}

      {/* Modal novo evento */}
      {modal&&form&&(
        <div style={s.overlay} onClick={()=>setModal(false)}>
          <div style={s.mCard} className="slide-up" onClick={e=>e.stopPropagation()}>
            <div style={s.mHead}>
              <h3 style={{fontSize:15,fontWeight:700,color:'#F1F5F9',margin:0,fontFamily:'Syne,sans-serif'}}>Novo Evento</h3>
              <button style={{background:'none',border:'none',color:'#475569',fontSize:16}} onClick={()=>setModal(false)}>✕</button>
            </div>
            <div style={{padding:'14px 16px',overflowY:'auto',flex:1}}>
              <Fld label="Título"><input style={s.inp} value={form.titulo} onChange={e=>setForm(p=>({...p,titulo:e.target.value}))} placeholder="Reunião, call, entrega..."/></Fld>
              <div style={{display:'flex',gap:10}}>
                <Fld label="Cliente" style={{flex:1}}>
                  <select style={s.inp} value={form.cliente_nome} onChange={e=>setForm(p=>({...p,cliente_nome:e.target.value}))}>
                    <option value="">Sem cliente</option>
                    {clientes.map(c=><option key={c.id} value={c.nome}>{c.nome}</option>)}
                  </select>
                </Fld>
                <Fld label="Urgência" style={{flex:1}}>
                  <select style={s.inp} value={form.urgencia} onChange={e=>setForm(p=>({...p,urgencia:e.target.value}))}>
                    <option value="critica">Crítica</option>
                    <option value="alta">Alta</option>
                    <option value="media">Média</option>
                    <option value="baixa">Baixa</option>
                  </select>
                </Fld>
              </div>
              <div style={{display:'flex',gap:10}}>
                <Fld label="Data" style={{flex:2}}>
                  <input style={s.inp} type="date"
                    value={`${form.data.getFullYear()}-${pad(form.data.getMonth()+1)}-${pad(form.data.getDate())}`}
                    onChange={e=>{const[y,m,d]=e.target.value.split('-').map(Number);setForm(p=>({...p,data:new Date(y,m-1,d)}))}}/>
                </Fld>
                <Fld label="Hora" style={{flex:1}}>
                  <input style={s.inp} type="time" value={form.hora} onChange={e=>setForm(p=>({...p,hora:e.target.value}))}/>
                </Fld>
                <Fld label="Min" style={{flex:1}}>
                  <input style={s.inp} type="number" min="15" step="15" value={form.duracao} onChange={e=>setForm(p=>({...p,duracao:+e.target.value}))}/>
                </Fld>
              </div>
              <Fld label="Descrição">
                <textarea style={{...s.inp,resize:'vertical',minHeight:60}} value={form.descricao} onChange={e=>setForm(p=>({...p,descricao:e.target.value}))} placeholder="Contexto, pauta..."/>
              </Fld>
            </div>
            <div style={s.mFoot}>
              <button style={s.btnSec} onClick={()=>setModal(false)}>Cancelar</button>
              <button style={s.btnPri} onClick={salvar} disabled={salvando}>{salvando?'Salvando...':'Salvar'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Fld({label,children,style}) {
  return <div style={{marginBottom:12,...style}}>
    <div style={{fontSize:10,color:'#475569',textTransform:'uppercase',letterSpacing:1,marginBottom:5}}>{label}</div>
    {children}
  </div>
}

const s = {
  root:{display:'flex',flexDirection:'column',height:'100%',overflow:'hidden',position:'relative'},
  top:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 14px',borderBottom:'1px solid #1E293B',flexShrink:0},
  topL:{display:'flex',alignItems:'center',gap:8},
  navBtn:{background:'#1E293B',border:'none',color:'#94A3B8',width:28,height:28,borderRadius:5,fontSize:16,display:'flex',alignItems:'center',justifyContent:'center'},
  hojeBtn:{background:'none',border:'1px solid #1E293B',color:'#64748B',padding:'4px 10px',borderRadius:5,fontSize:11},
  periodo:{fontSize:13,fontWeight:700,color:'#E2E8F0'},
  viewTabs:{display:'flex',gap:2,background:'#0F172A',padding:3,borderRadius:7},
  vTab:{background:'transparent',border:'none',color:'#475569',padding:'4px 10px',borderRadius:5,fontSize:11},
  vTabA:{background:'#1E293B',color:'#E2E8F0',fontWeight:600},
  grid:{flex:1,overflow:'hidden'},
  // semana
  semHead:{display:'flex',borderBottom:'1px solid #1E293B',flexShrink:0},
  diaHead:{flex:1,display:'flex',flexDirection:'column',alignItems:'center',padding:'8px 2px',cursor:'pointer',gap:2},
  diaNum:{width:24,height:24,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:700},
  diaQtd:{width:14,height:14,borderRadius:'50%',background:'#1D4ED8',color:'#fff',fontSize:8,display:'flex',alignItems:'center',justifyContent:'center',fontWeight:700},
  semGrade:{flex:1,display:'flex',overflowY:'auto'},
  hLbl:{height:52,display:'flex',alignItems:'flex-start',justifyContent:'flex-end',paddingRight:6,fontSize:9,color:'#1E293B',paddingTop:2,borderTop:'1px solid #1E293B'},
  diaCol:{flex:1,position:'relative',borderLeft:'1px solid #0F172A',cursor:'pointer'},
  celH:{height:52,borderTop:'1px solid #0F172A'},
  evBloco:{position:'absolute',left:2,right:2,borderRadius:4,padding:'2px 5px',cursor:'pointer',overflow:'hidden',zIndex:2},
  // mes
  mesHead:{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid #1E293B',flexShrink:0},
  mesDN:{fontSize:9,color:'#334155',textAlign:'center',padding:'6px 0',textTransform:'uppercase',letterSpacing:1},
  mesGrid:{flex:1,display:'grid',gridTemplateColumns:'repeat(7,1fr)',gridTemplateRows:'repeat(6,1fr)',overflow:'auto'},
  mesCel:{border:'1px solid #0F172A',padding:'4px',cursor:'pointer',minHeight:70,display:'flex',flexDirection:'column',gap:2},
  mesNum:{width:20,height:20,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:10,fontWeight:600},
  mesEv:{fontSize:9,padding:'1px 4px',borderRadius:2,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',fontWeight:600},
  // dia
  diaInfo:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 14px',borderBottom:'1px solid #1E293B',flexShrink:0},
  addEvBtn:{background:'#1D4ED8',border:'none',color:'#fff',padding:'5px 12px',borderRadius:6,fontSize:11,fontWeight:700},
  diaH:{height:64,display:'flex',alignItems:'flex-start',justifyContent:'flex-end',paddingRight:8,fontSize:9,color:'#1E293B',paddingTop:2,borderTop:'1px solid #0F172A'},
  diaEv:{position:'absolute',left:8,right:12,borderRadius:7,padding:'6px 10px',cursor:'pointer',zIndex:2,overflow:'hidden'},
  // painel
  painel:{position:'absolute',top:0,right:0,bottom:0,width:250,background:'#0C1220',borderLeft:'1px solid #1E293B',overflowY:'auto',zIndex:20},
  // modal
  overlay:{position:'fixed',inset:0,background:'rgba(0,0,0,0.75)',display:'flex',alignItems:'flex-end',justifyContent:'center',zIndex:100},
  mCard:{background:'#0C1220',border:'1px solid #1E293B',borderRadius:'14px 14px 0 0',width:'100%',maxWidth:480,maxHeight:'90vh',display:'flex',flexDirection:'column'},
  mHead:{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'16px 16px 12px',borderBottom:'1px solid #1E293B'},
  mFoot:{padding:'12px 16px',borderTop:'1px solid #1E293B',display:'flex',gap:8,justifyContent:'flex-end'},
  inp:{width:'100%',background:'#0F172A',border:'1px solid #1E293B',color:'#E2E8F0',borderRadius:6,padding:'8px 10px',fontSize:12,outline:'none',fontFamily:'inherit'},
  btnSec:{background:'#1E293B',border:'none',color:'#64748B',padding:'8px 14px',borderRadius:7,fontSize:12,fontFamily:'inherit'},
  btnPri:{background:'#1D4ED8',border:'none',color:'#fff',padding:'8px 16px',borderRadius:7,fontSize:12,fontFamily:'inherit',fontWeight:700},
}
