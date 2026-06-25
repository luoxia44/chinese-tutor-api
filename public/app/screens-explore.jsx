// screens-explore.jsx — 探索角色：筛选 pills（含场景分类）+ 网格 + 换一批。挂 window.ExploreScreen。
const { useState: useStateE } = React;

function ExploreCard({ comp, onOpen, isNew, lang }) {
  return (
    <div onClick={()=>onOpen(comp)} style={{ position:'relative', borderRadius:18, overflow:'hidden', cursor:'pointer',
      aspectRatio:'1 / 1.2', border:'1px solid var(--hairline)', boxShadow:'0 12px 26px rgba(0,0,0,0.5)' }}>
      <Portrait comp={comp} variant="card" expression="smile" mask focus="center 22%" />
      {isNew && <span className="disp" style={{ position:'absolute', top:0, left:0, padding:'3px 9px 3px 7px', fontSize:9.5, fontWeight:800, color:'#fff',
        background:'linear-gradient(135deg,var(--neon-1),var(--neon-2))', borderBottomRightRadius:10, letterSpacing:'0.06em' }}>NEW</span>}
      <span style={{ position:'absolute', top:8, right:8 }}><OnlineDot online={comp.online} size={7} /></span>
      <div style={{ position:'absolute', left:9, right:9, bottom:9 }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', gap:4 }}>
          <div style={{ minWidth:0 }}>
            <div className="cn" style={{ fontSize:15, fontWeight:800, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', letterSpacing:'-0.01em' }}>{comp.name}</div>
            <div className="ui" style={{ fontSize:10, color:'var(--t2)', marginTop:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{comp.jobEn}</div>
          </div>
          <LevelBadge comp={comp} size="sm" />
        </div>
      </div>
    </div>
  );
}

function ExploreScreen({ comps, onOpen, lang='en', scene=null }) {
  const T = window.I18N.t;
  const scenes = (window.SCENES || []).filter(s => s !== '全部');
  const FILTERS = [
    { key:'featured', label:T(lang,'f_featured') },
    { key:'popular',  label:T(lang,'f_popular') },
    { key:'new',      label:T(lang,'f_new') },
    ...scenes.map(s => ({ key:'s:'+s, label:s })),
    { key:'A', label:'HSK 1–2' },
    { key:'B', label:'HSK 3–4' },
    { key:'C', label:'HSK 5–6' },
  ];
  const [f, setF] = useStateE(scene ? ('s:'+scene) : 'featured');
  const [batch, setBatch] = useStateE(0);

  let list = comps;
  if (f.startsWith('s:')) list = comps.filter(c => c.scene === f.slice(2));
  else if (f === 'A' || f === 'B' || f === 'C') list = comps.filter(c => c.band === f);
  else if (f === 'popular') list = [...comps].sort((a,b)=>b.story.chats-a.story.chats);
  else if (f === 'new') list = [...comps].reverse();

  const rot = list.length ? (batch*6) % list.length : 0;
  const view = [...list.slice(rot), ...list.slice(0,rot)];

  return (
    <div className="noscroll" style={{ height:'100%', overflowY:'auto', paddingTop:58, paddingBottom:96 }}>
      <div style={{ padding:'10px 22px 0' }}>
        <div className="ui" style={{ fontSize:27, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.02em' }}>{T(lang,'explore_title')}</div>
        <div className="ui" style={{ fontSize:13.5, color:'var(--t3)', marginTop:5 }}>{T(lang,'explore_sub')}</div>
      </div>

      <div className="noscroll" style={{ display:'flex', gap:9, overflowX:'auto', padding:'16px 22px 6px' }}>
        {FILTERS.map(x=>(<Chip key={x.key} active={x.key===f} onClick={()=>{setF(x.key);setBatch(0);}}>{x.label}</Chip>))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:11, padding:'10px 22px 16px' }}>
        {view.length ? view.map((c,i)=>(<ExploreCard key={c.id} comp={c} onOpen={onOpen} isNew={(i+rot)%7===0} lang={lang} />))
          : <div className="ui" style={{ gridColumn:'1/-1', textAlign:'center', color:'var(--t3)', padding:'30px 0' }}>该分类暂无角色</div>}
      </div>

      <div style={{ padding:'2px 22px 8px' }}>
        <button onClick={()=>setBatch(b=>b+1)} className="ui glass glass-edge" style={{ width:'100%', display:'inline-flex', alignItems:'center', justifyContent:'center', gap:9,
          padding:'14px', borderRadius:9999, color:'var(--t1)', fontSize:15, fontWeight:600, cursor:'pointer', border:'none' }}>
          <Icon name="refresh" size={18} /> {T(lang,'shuffle')}
        </button>
      </div>
    </div>
  );
}
window.ExploreScreen = ExploreScreen;
