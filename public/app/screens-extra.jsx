// screens-extra.jsx — 消息 + 我的（双语，补全 5-tab）。挂 window.MessagesScreen, window.MeScreen。
function MessagesScreen({ comps, onOpen, onChat, lang='en' }) {
  const T = window.I18N.t;
  const en = lang!=='zh';
  const base = (window.RECENTS||[]).map(r=>({ ...r, comp: comps.find(c=>c.id===r.id) }));
  const more = comps.slice(2,7).map((c,i)=>({ id:c.id, comp:c, summary:'“'+c.line+'”', summaryEn:'“'+c.lineEn+'”', when:['12分钟前','1小时前','今天','昨天','3天前'][i], whenEn:['12 min ago','1 h ago','Today','Yesterday','3d ago'][i] }));
  const seen = new Set(); const list = base.concat(more).filter(r=>r.comp && !seen.has(r.id) && seen.add(r.id));
  return (
    <div className="noscroll" style={{ height:'100%', overflowY:'auto', paddingBottom:96 }}>
      <div style={{ padding:'58px 22px 6px' }}>
        <div className="ui" style={{ fontSize:30, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.02em' }}>{T(lang,'msg_title')}</div>
        <div className="ui" style={{ fontSize:13.5, color:'var(--t2)', marginTop:5 }}>{T(lang,'msg_sub')}</div>
      </div>
      <div style={{ padding:'10px 16px 0' }}>
        {list.map((r,i)=>(
          <div key={r.id} onClick={()=>onOpen(r.comp)} style={{ display:'flex', alignItems:'center', gap:13, padding:'12px 8px', cursor:'pointer',
            borderBottom: i<list.length-1?'1px solid var(--hairline)':'none' }}>
            <Avatar comp={r.comp} size={52} />
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span className="cn" style={{ fontSize:15.5, fontWeight:700, color:'#fff' }}>{r.comp.name}</span>
                <span className="ui" style={{ fontSize:11, color:'var(--t3)' }}>{r.comp.pinyin}</span>
                <LevelBadge comp={r.comp} size="sm" />
                <span className="ui" style={{ fontSize:11, color:'var(--t3)', marginLeft:'auto' }}>{en?r.whenEn:r.when}</span>
              </div>
              <div className="ui" style={{ fontSize:12.5, color:'var(--t2)', marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{T(lang,'msg_last')} {en?(r.summaryEn||r.summary):r.summary}</div>
            </div>
            <button onClick={(e)=>{e.stopPropagation();onChat(r.comp);}} style={{ width:40, height:40, borderRadius:'50%', border:'none', flexShrink:0, cursor:'pointer', background:'linear-gradient(135deg,var(--neon-1),var(--neon-2))', color:'#fff', display:'grid', placeItems:'center', boxShadow:'0 4px 14px rgba(168,85,247,0.45)' }}><Icon name="mic" size={18} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function MeScreen({ comps, lang='en', onFav }) {
  const T = window.I18N.t;
  const stats = [
    { v:'14', l:T(lang,'me_streak'), a:'var(--neon-1)' },
    { v:'8.6', l:T(lang,'me_hours'), a:'var(--cyan)' },
    { v:'12', l:T(lang,'me_chars'), a:'var(--orange)' },
  ];
  const rows = [['heart',T(lang,'me_fav')],['globeLang',T(lang,'me_lang',{x:(window.I18N.LANGS.find(L=>L.code===lang)||{}).native||'English'})],['speaker',T(lang,'me_voice')],['gear',T(lang,'me_settings')],['sparkle',T(lang,'me_pro')]];
  return (
    <div className="noscroll" style={{ height:'100%', overflowY:'auto', paddingBottom:96 }}>
      <div style={{ padding:'58px 22px 6px' }}>
        <div className="ui" style={{ fontSize:30, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.02em' }}>{T(lang,'me_title')}</div>
      </div>
      <div style={{ padding:'14px 22px 0' }}>
        <div className="glass glass-edge" style={{ display:'flex', alignItems:'center', gap:14, borderRadius:'var(--r-panel)', padding:16 }}>
          <div style={{ width:60, height:60, borderRadius:'50%', flexShrink:0, display:'grid', placeItems:'center', color:'#fff', fontWeight:800, fontSize:24,
            background:'linear-gradient(135deg,var(--neon-1),var(--neon-2))', boxShadow:'0 0 24px rgba(168,85,247,0.4)' }} className="disp">L</div>
          <div style={{ flex:1 }}>
            <div className="ui" style={{ fontSize:19, fontWeight:800, color:'#fff' }}>Leo</div>
            <div className="ui" style={{ fontSize:13, color:'var(--t2)', marginTop:3 }}>HSK3 · {T(lang,'me_learning',{n:96})}</div>
          </div>
          <span className="disp" style={{ padding:'5px 11px', borderRadius:9999, fontSize:11.5, fontWeight:700, color:'#1A1206', background:'linear-gradient(135deg,#FCD34D,#FB923C)' }}>Lv.8</span>
        </div>
      </div>
      <div style={{ display:'flex', gap:10, padding:'14px 22px 0' }}>
        {stats.map((s,i)=>(<StatCard key={i} value={s.v} label={s.l} accent={s.a} />))}
      </div>
      <div style={{ padding:'18px 22px 0' }}>
        <div className="glass glass-edge" style={{ borderRadius:'var(--r-panel)', overflow:'hidden' }}>
          {rows.map((r,i,a)=>(
            <div key={i} onClick={i===0?onFav:undefined} style={{ display:'flex', alignItems:'center', gap:13, padding:'15px 16px', borderBottom: i<a.length-1?'1px solid var(--hairline)':'none', cursor:'pointer' }}>
              <span style={{ color:'var(--neon-1)' }}><Icon name={r[0]} size={20} /></span>
              <span className="ui" style={{ flex:1, fontSize:15, color:'var(--t1)' }}>{r[1]}</span>
              <Icon name="chevR" size={16} style={{ color:'var(--t3)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
// 收藏页（左滑"留着"的角色）
function FavoritesScreen({ comps, liked, onOpen, onChat, onToggleLike, onBack, lang='en' }) {
  const T = window.I18N.t;
  const list = comps.filter((c) => liked && liked.has(c.id));
  return (
    <div className="noscroll" style={{ height:'100%', overflowY:'auto', paddingBottom:40 }}>
      <div style={{ display:'flex', alignItems:'center', gap:12, padding:'56px 18px 8px' }}>
        <GhostButton icon="back" size={40} onClick={onBack} />
        <div className="ui" style={{ fontSize:24, fontWeight:800, color:'var(--t1)' }}>{T(lang,'me_fav')}</div>
        <span className="ui" style={{ marginLeft:'auto', fontSize:13, color:'var(--t3)' }}>{list.length}</span>
      </div>
      {list.length ? (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:13, padding:'10px 18px' }}>
          {list.map((c)=>(
            <div key={c.id} onClick={()=>onOpen(c)} style={{ position:'relative', borderRadius:18, overflow:'hidden', cursor:'pointer', aspectRatio:'1 / 1.25', border:'1px solid var(--hairline)', boxShadow:'0 12px 26px rgba(0,0,0,0.5)' }}>
              <Portrait comp={c} variant="card" expression="smile" mask focus="center 20%" />
              <button onClick={(e)=>{ e.stopPropagation(); onToggleLike(c); }} title="取消收藏" style={{ position:'absolute', top:8, right:8, width:32, height:32, borderRadius:'50%', border:'none', cursor:'pointer', background:'rgba(0,0,0,.45)', color:'var(--neon-2)', display:'grid', placeItems:'center' }}><Icon name="heartFill" size={16} /></button>
              <div style={{ position:'absolute', left:10, right:10, bottom:10 }}>
                <div className="cn" style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{c.name}</div>
                <div className="ui" style={{ fontSize:10.5, color:'var(--t2)', marginTop:1 }}>{c.jobEn} · {c.city}</div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="ui" style={{ textAlign:'center', color:'var(--t3)', fontSize:14, padding:'60px 30px', lineHeight:1.7 }}>
          还没有收藏的角色。<br/>在首页把卡片<b style={{color:'var(--neon-1)'}}>向左滑</b>就能「留着」喜欢的人。
        </div>
      )}
    </div>
  );
}

Object.assign(window, { MessagesScreen, MeScreen, FavoritesScreen });
