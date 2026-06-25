// screens-detail.jsx — 角色详情页（“我们的故事/时间线”接真实 /api/memory）。挂 window.DetailScreen。
const { useState: useStateD, useEffect: useEffectD } = React;

function DetailScreen({ comp, onBack, onChat, liked, onToggleLike, lang='en' }) {
  const T = window.I18N.t;
  const en = lang !== 'zh';
  const [rel, setRel] = useStateD(null);

  useEffectD(() => {
    let on = true;
    window.API.memory().then((m) => { if (!on) return; setRel((m.relationships || []).find((x) => x.companionId === comp.id) || null); }).catch(() => {});
    return () => { on = false; };
  }, [comp.id]);

  const sums = (rel && rel.sessionSummaries) || [];
  const chats = sums.length;
  const minutes = sums.reduce((a, s) => a + (s.durationSec || 0), 0) / 60;
  const hours = Math.max(chats ? 1 : 0, Math.round(minutes / 60));
  const days = chats ? Math.max(1, Math.round((Date.now() - new Date(sums[0].date).getTime()) / 86400000)) : 0;
  const tl = chats
    ? sums.slice().reverse().map((s) => ({ date: (s.date || '').slice(0, 10), text: s.oneLineSummary || '一次对话' }))
    : [{ date: '', text: en ? 'Tap below to start your first chat' : '点下方按钮，开始你们的第一次对话' }];

  return (
    <div className="noscroll" style={{ height:'100%', overflowY:'auto', position:'relative' }}>
      {/* 顶部大立绘 */}
      <div style={{ position:'relative', height:430 }}>
        <Portrait comp={comp} variant="card" expression="cheer" mask focus="center 14%" />
        <div style={{ position:'absolute', top:54, left:16, right:16, display:'flex', justifyContent:'space-between' }}>
          <GhostButton icon="back" size={44} onClick={onBack} />
          <div style={{ display:'flex', gap:10 }}>
            <GhostButton icon={liked?'heartFill':'heart'} size={44} active={liked} onClick={onToggleLike} />
            <GhostButton icon="more" size={44} />
          </div>
        </div>
        <div style={{ position:'absolute', left:22, right:22, bottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
            <LevelBadge comp={comp} hsk />
            {comp.premium && <PremiumTag size="sm" />}
            <span style={{ display:'inline-flex', alignItems:'center', gap:6 }}><OnlineDot online={comp.online} size={8} /><span className="ui" style={{ fontSize:12.5, color:'var(--t2)' }}>{T(lang, comp.online?'online':'away')}</span></span>
          </div>
          <div style={{ display:'flex', alignItems:'baseline', gap:10, flexWrap:'nowrap' }}>
            <span className="cn" style={{ fontSize:34, fontWeight:800, color:'#fff', letterSpacing:'-0.02em', whiteSpace:'nowrap' }}>{comp.name}</span>
            <span className="ui" style={{ fontSize:16, color:'var(--t2)', whiteSpace:'nowrap' }}>{comp.pinyin}</span>
          </div>
        </div>
      </div>

      <div style={{ padding:'4px 22px 140px', display:'flex', flexDirection:'column', gap:22 }}>
        {/* 职业行 + 签名 + 试听 */}
        <div style={{ marginTop:14 }}>
          <div className="ui" style={{ fontSize:14, color:'var(--t2)', fontWeight:600 }}>{comp.jobEn} · {comp.age} · {comp.city}</div>
          <div style={{ display:'flex', alignItems:'center', gap:12, marginTop:12 }}>
            <div style={{ flex:1 }}>
              <div className="cn" style={{ fontSize:15.5, color:'var(--t1)', lineHeight:1.5, fontStyle:'italic' }}>“{comp.line}”</div>
              {en && <div className="ui" style={{ fontSize:12.5, color:'var(--t3)', marginTop:4, lineHeight:1.4 }}>“{comp.lineEn}”</div>}
            </div>
            <GhostButton icon="speaker" size={46} />
          </div>
        </div>

        {/* About Me 标签云 */}
        <section>
          <SecTitle>{T(lang,'d_about')}</SecTitle>
          <div style={{ display:'flex', flexWrap:'wrap', gap:9 }}>
            {comp.tags.map((t,i)=>(
              <span key={i} className="cn" style={{ padding:'8px 13px', borderRadius:'var(--r-chip)', fontSize:13.5, whiteSpace:'nowrap', flexShrink:0,
                background:'rgba(255,255,255,0.05)', border:'1px solid var(--hairline)', color:'var(--t1)' }}>{t}</span>
            ))}
          </div>
        </section>

        {/* 我们的故事（真实统计） */}
        <section>
          <SecTitle>{T(lang,'d_story')}</SecTitle>
          <div style={{ display:'flex', gap:10 }}>
            <StatCard value={days} label={T(lang,'d_knew')} accent="var(--neon-1)" />
            <StatCard value={chats} label={T(lang,'d_chats')} accent="var(--cyan)" />
            <StatCard value={hours} label={T(lang,'d_hours')} accent="var(--orange)" />
          </div>
        </section>

        {/* 时间线（真实会话摘要） */}
        <section>
          <SecTitle>{T(lang,'d_timeline')}</SecTitle>
          <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
            {tl.map((it,i)=>(
              <div key={i} style={{ display:'flex', gap:13, padding:'2px 0' }}>
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                  <Avatar comp={comp} size={36} />
                  {i < tl.length-1 && <div style={{ width:2, flex:1, background:'var(--hairline)', marginTop:4 }} />}
                </div>
                <div style={{ paddingBottom:16, flex:1 }}>
                  <div style={{ display:'flex', alignItems:'baseline', justifyContent:'space-between', gap:8 }}>
                    <div className="cn" style={{ fontSize:14, color:'#fff', fontWeight:600 }}>{it.text}</div>
                    {it.date && <div className="ui" style={{ fontSize:11.5, color:'var(--t3)', whiteSpace:'nowrap', flexShrink:0 }}>{it.date}</div>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* 底部继续聊天 */}
      <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'14px 22px 30px',
        background:'linear-gradient(180deg, transparent, var(--bg-base) 32%)' }}>
        <GradientButton icon="mic" onClick={()=>onChat(comp)}>{(chats?T(lang,'d_continue'):T(lang,'d_start'))} · {comp.name}</GradientButton>
      </div>
    </div>
  );
}

function SecTitle({ children }) {
  return <div className="ui" style={{ fontSize:13, fontWeight:700, color:'var(--t3)', textTransform:'uppercase', letterSpacing:'0.08em', marginBottom:12 }}>{children}</div>;
}

Object.assign(window, { DetailScreen, SecTitle });
