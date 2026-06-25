// screens-memory.jsx — 记忆页（接真实后端 /api/memory）。挂 window.MemoryScreen。
// 角色 pill tabs + “TA 记得关于你的事”（真实事实）+ “你们聊过的”（真实会话摘要）。
const { useState: useStateM, useEffect: useEffectM } = React;

function factIcon(t) {
  if (/猫|cat|miumiu/i.test(t)) return 'cat';
  if (/咖啡|coffee|美式|拿铁|奶茶/i.test(t)) return 'coffee';
  if (/旅|日本|tokyo|京都|travel|出国/i.test(t)) return 'globe';
  if (/喜欢|爱好|爱|like|interest/i.test(t)) return 'heartFill';
  if (/游戏|game|原神/i.test(t)) return 'game';
  return 'pin';
}

function MemoryScreen({ comps, sel, setSel, lang='en' }) {
  const T = window.I18N.t;
  const [data, setData] = useStateM(null);            // { profile, relationships }
  const [active, setActive] = useStateM(sel || null); // 选中角色 id
  const byId = (id) => comps.find(c => c.id === id);

  const load = () => window.API.memory().then(d => {
    setData(d);
    setActive(a => a || (d.relationships[0] && d.relationships[0].companionId) || null);
  }).catch(()=>setData({ profile:{ facts:[], interests:[] }, relationships:[] }));

  useEffectM(() => { load(); }, []);

  if (!data) return <div className="ui" style={{ paddingTop:120, textAlign:'center', color:'var(--t3)' }}>读取记忆中…</div>;

  const rels = data.relationships || [];
  const profile = data.profile || {};
  const facts = profile.facts || [];
  const activeRel = rels.find(r => r.companionId === active) || rels[0];
  const activeComp = activeRel ? byId(activeRel.companionId) : null;

  const header = (
    <div style={{ padding:'58px 22px 8px' }}>
      <div className="ui" style={{ fontSize:30, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.02em' }}>{T(lang,'mem_title')}</div>
      <div className="ui" style={{ fontSize:13.5, color:'var(--t2)', marginTop:5 }}>{T(lang,'mem_sub')}</div>
    </div>
  );

  if (!rels.length && !facts.length) {
    return (
      <div className="noscroll" style={{ height:'100%', overflowY:'auto', paddingBottom:96 }}>
        {header}
        <div className="ui" style={{ textAlign:'center', color:'var(--t3)', fontSize:14, padding:'50px 30px', lineHeight:1.6 }}>
          还没有任何记忆。<br/>去和一个角色聊一次，它就会记住你聊过的事。
        </div>
      </div>
    );
  }

  return (
    <div className="noscroll" style={{ height:'100%', overflowY:'auto', paddingBottom:96 }}>
      {header}

      {/* 角色 pill tabs（有记忆的角色） */}
      {rels.length > 0 && (
        <div className="noscroll" style={{ display:'flex', gap:9, overflowX:'auto', padding:'12px 22px 6px' }}>
          {rels.map(r => {
            const c = byId(r.companionId); if (!c) return null;
            const on = r.companionId === (activeRel && activeRel.companionId);
            return (
              <button key={r.companionId} onClick={()=>{ setActive(r.companionId); setSel && setSel(r.companionId); }} className="cn" style={{ flexShrink:0, display:'inline-flex', alignItems:'center', gap:8, padding:'7px 14px 7px 8px', borderRadius:9999, cursor:'pointer',
                border:`1px solid ${on?'transparent':'var(--hairline)'}`,
                background: on?'linear-gradient(135deg,rgba(168,85,247,.28),rgba(236,72,153,.22))':'rgba(255,255,255,0.04)',
                boxShadow: on?'0 0 16px rgba(168,85,247,0.3)':'none' }}>
                <Avatar comp={c} size={26} ring={false} />
                <span style={{ fontSize:14, fontWeight:on?700:600, color:on?'#fff':'var(--t2)' }}>{c.name}</span>
              </button>
            );
          })}
        </div>
      )}

      <div style={{ padding:'14px 22px 0', display:'flex', flexDirection:'column', gap:22 }}>
        {/* TA 记得关于你的事（用户级事实，所有角色共享） */}
        <section>
          <SecTitle>{T(lang,'mem_remembers',{ name: activeComp ? activeComp.name : '' })}</SecTitle>
          {profile.preferredName && (
            <div className="ui" style={{ fontSize:13, color:'var(--t2)', marginBottom:10 }}>称呼你：<b style={{color:'#fff'}}>{profile.preferredName}</b>{profile.interests && profile.interests.length ? '　·　兴趣：'+profile.interests.join('、') : ''}</div>
          )}
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {facts.length ? facts.map((f,i)=>{
              const tint = activeComp ? activeComp.tint : ['#A855F7','#EC4899'];
              return (
                <div key={i} className="glass glass-edge" style={{ display:'flex', alignItems:'center', gap:13, borderRadius:16, padding:'13px 15px' }}>
                  <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, display:'grid', placeItems:'center',
                    background:`${tint[0]}24`, color:tint[0], border:`1px solid ${tint[0]}44` }}>
                    <Icon name={factIcon(f.text)} size={20} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="cn" style={{ fontSize:14.5, color:'#fff', fontWeight:600, lineHeight:1.4 }}>{f.text}</div>
                  </div>
                  <button onClick={()=>window.API.deleteFact(f.text).then(load)} style={{ border:'none', background:'none', color:'var(--t3)', cursor:'pointer', padding:4, flexShrink:0 }}><Icon name="close" size={16} /></button>
                </div>
              );
            }) : <div className="ui" style={{ color:'var(--t3)', fontSize:13, padding:'4px 2px' }}>还没记住具体事实，多聊几句它就记住了。</div>}
          </div>
        </section>

        {/* 你们聊过的（真实会话摘要） */}
        {activeRel && (
          <section>
            <SecTitle>{T(lang,'mem_talked')}（{activeRel.sessionSummaries.length}）</SecTitle>
            <div style={{ display:'flex', flexDirection:'column' }}>
              {activeRel.sessionSummaries.slice().reverse().map((it,i,arr)=>{
                const tint = activeComp ? activeComp.tint : ['#A855F7','#EC4899'];
                return (
                  <div key={i} style={{ display:'flex', gap:14 }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                      <div style={{ width:11, height:11, borderRadius:'50%', marginTop:5, background:tint[0], boxShadow:`0 0 10px ${tint[0]}` }} />
                      {i<arr.length-1 && <div style={{ width:2, flex:1, background:'var(--hairline)', marginTop:3 }} />}
                    </div>
                    <div style={{ paddingBottom:16, flex:1 }}>
                      <div className="ui" style={{ fontSize:11.5, color:'var(--t3)', marginBottom:3 }}>{(it.date||'').slice(0,10)}</div>
                      <div className="cn" style={{ fontSize:14, color:'var(--t1)', lineHeight:1.5 }}>{it.oneLineSummary || '一次对话'}</div>
                    </div>
                  </div>
                );
              })}
              {!activeRel.sessionSummaries.length && <div className="ui" style={{ color:'var(--t3)', fontSize:13 }}>还没有聊天记录</div>}
            </div>
          </section>
        )}

        <button onClick={()=>{ if(confirm('确定清除全部记忆？此操作不可恢复。')) window.API.forgetAll().then(load); }} className="ui" style={{ alignSelf:'center', display:'inline-flex', alignItems:'center', gap:7, padding:'10px 18px', borderRadius:9999, marginBottom:8,
          background:'rgba(244,63,94,0.1)', border:'1px solid rgba(244,63,94,0.32)', color:'#FB7185', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          <Icon name="trash" size={16} /> {T(lang,'mem_clear')}
        </button>
      </div>
    </div>
  );
}
window.MemoryScreen = MemoryScreen;
