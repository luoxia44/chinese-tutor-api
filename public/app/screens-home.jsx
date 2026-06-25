// screens-home.jsx — 首页：3D 景深卡堆 + 继续上次 + Explore by vibe（双语）。挂 window.HomeScreen。
const { useState: useStateH, useRef: useRefH } = React;

function HomeStackCard({ comp, center, lastLabel, lang }) {
  const T = window.I18N.t;
  return (
    <div style={{ position:'absolute', inset:0, borderRadius:24, overflow:'hidden',
      boxShadow: center ? '0 30px 70px rgba(0,0,0,0.66), 0 0 0 1px rgba(255,255,255,0.10) inset' : '0 14px 30px rgba(0,0,0,0.5)',
      border:'1px solid var(--hairline)' }}>
      <Portrait comp={comp} variant="card" expression="smile" mask />
      {/* 顶部高光（立体感） */}
      {center && <div style={{ position:'absolute', top:0, left:0, right:0, height:90, background:'linear-gradient(180deg, rgba(255,255,255,0.16), transparent)', pointerEvents:'none' }} />}
      <div style={{ position:'absolute', top:12, left:12, display:'flex', gap:7 }}>
        <LevelBadge comp={comp} hsk={center} size={center?'md':'sm'} />
        {comp.premium && center && <PremiumTag size="sm" />}
      </div>
      <div style={{ position:'absolute', left:16, right:16, bottom: center?17:13 }}>
        <div style={{ display:'flex', alignItems:'baseline', gap:8, flexWrap:'nowrap' }}>
          <span className="cn" style={{ fontSize:center?25:17, fontWeight:800, color:'#fff', whiteSpace:'nowrap', letterSpacing:'-0.01em' }}>{comp.name}</span>
          <span className="ui" style={{ fontSize:center?13:11, color:'var(--t2)', whiteSpace:'nowrap' }}>{comp.pinyin}</span>
        </div>
        <div className="ui" style={{ fontSize:center?13:10.5, color:'var(--t2)', marginTop:center?4:2, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{comp.jobEn} · {comp.city}</div>
        {center && <>
          <div className="cn" style={{ fontSize:13.5, color:'var(--t1)', opacity:.92, marginTop:8, lineHeight:1.45,
            display:'-webkit-box', WebkitLineClamp:1, WebkitBoxOrient:'vertical', overflow:'hidden' }}>“{comp.line}”</div>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:10, gap:8 }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:6, flexShrink:0 }}><OnlineDot online={comp.online} size={7} /><span className="ui" style={{ fontSize:12, color: comp.online?'var(--green)':'var(--t2)', fontWeight:600, whiteSpace:'nowrap' }}>{T(lang, comp.online?'online':'away')}</span></span>
            <span className="ui" style={{ fontSize:11, color:'var(--t3)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{lastLabel}</span>
          </div>
        </>}
      </div>
    </div>
  );
}

function HomeScreen({ comps, index, setIndex, onChat, onOpen, onLike, onVibe, onResume, lang='en' }) {
  const T = window.I18N.t;
  const [drag, setDrag] = useStateH({ x:0, active:false });
  const [fly, setFly] = useStateH(null);
  const sx = useRefH(0);
  const THRESH = 96;
  const n = comps.length;
  const at = (off) => comps[((index+off)%n+n)%n];
  const center = at(0);

  const advance = (dir) => {
    setFly(dir);
    setTimeout(()=>{ setFly(null); setDrag({x:0,active:false});
      if (dir==='left'){ onLike&&onLike(center); setIndex((index+1)%n); }
      else if (dir==='right'){ onChat&&onChat(center); }
      else setIndex((index+1)%n);
    }, dir==='right'?60:300);
  };
  const down=(e)=>{ sx.current=e.clientX; setDrag({x:0,active:true}); e.currentTarget.setPointerCapture?.(e.pointerId); };
  const move=(e)=>{ if(!drag.active)return; setDrag({x:e.clientX-sx.current,active:true}); };
  const up=()=>{ if(!drag.active)return; if(drag.x<-THRESH)advance('left'); else if(drag.x>THRESH)advance('right'); else setDrag({x:0,active:false}); };

  const rot = drag.x*0.035;
  const likeOp = Math.max(0,Math.min(1,-drag.x/THRESH));
  const chatOp = Math.max(0,Math.min(1,drag.x/THRESH));
  const flyX = fly==='left'?-580:fly==='right'?580:0;
  const recent = (window.RECENTS||[])[0];
  const rc = recent && comps.find(c=>c.id===recent.id);
  const enLang = lang!=='zh';

  return (
    <div className="noscroll" style={{ height:'100%', overflowY:'auto', paddingTop:58, paddingBottom:96 }}>
      {/* 标题（仅保留一行 + 英文译） */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', padding:'10px 22px 0' }}>
        <div style={{ flex:1, minWidth:0 }}>
          <div className="cn" style={{ fontSize:27, fontWeight:800, color:'var(--t1)', letterSpacing:'-0.02em' }}>今天想和谁聊天？</div>
          <div className="ui" style={{ fontSize:14, color:'var(--t3)', marginTop:6 }}>{T(lang,'home_title')}</div>
        </div>
        <button className="glass glass-edge" style={{ width:42, height:42, borderRadius:'50%', display:'grid', placeItems:'center', color:'var(--t1)', cursor:'pointer', marginTop:2, flexShrink:0, border:'none' }}><Icon name="search" size={20} /></button>
      </div>

      {/* 真 3D 透视卡堆（coverflow） */}
      <div style={{ position:'relative', height:402, margin:'18px 0 4px', perspective:1150, perspectiveOrigin:'50% 46%' }}>
        {/* 左卡（3D 旋入） */}
        <div style={{ position:'absolute', top:34, bottom:48, left:'50%', width:212,
          transform:'translateX(calc(-50% - 142px)) translateZ(-130px) rotateY(38deg)', transformOrigin:'center',
          filter:'brightness(0.58) saturate(0.95)', zIndex:1, pointerEvents:'none', transition:'transform .42s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <HomeStackCard comp={at(-1)} lang={lang} />
        </div>
        {/* 右卡（3D 旋入） */}
        <div style={{ position:'absolute', top:34, bottom:48, left:'50%', width:212,
          transform:'translateX(calc(-50% + 142px)) translateZ(-130px) rotateY(-38deg)', transformOrigin:'center',
          filter:'brightness(0.58) saturate(0.95)', zIndex:1, pointerEvents:'none', transition:'transform .42s cubic-bezier(0.34,1.56,0.64,1)' }}>
          <HomeStackCard comp={at(1)} lang={lang} />
        </div>
        {/* 中心卡（可拖 · 跟手轻微 3D 转动） */}
        <div onPointerDown={!fly?down:undefined} onPointerMove={move} onPointerUp={up}
          onClick={Math.abs(drag.x)<6&&!drag.active?()=>onOpen(center):undefined}
          style={{ position:'absolute', top:0, bottom:16, left:'50%', width:238,
            transform:`translateX(calc(-50% + ${drag.x+flyX}px)) translateZ(0) rotateY(${fly?(fly==='left'?26:-26):(-drag.x*0.07)}deg) rotate(${rot}deg)`,
            transition: drag.active?'none':'transform .42s cubic-bezier(0.34,1.56,0.64,1)',
            zIndex:3, cursor:'grab', touchAction:'none' }}>
          <HomeStackCard comp={center} center lang={lang} lastLabel={center.online?T(lang,'justnow'):'12 min'} />
          {/* 时尚滑动标签 */}
          <div className="disp" style={{ position:'absolute', top:22, right:14, transform:'rotate(8deg)', opacity:chatOp, padding:'7px 14px', borderRadius:13, border:'2.5px solid var(--neon-2)', color:'#fff', fontWeight:800, fontSize:15, letterSpacing:'0.08em', background:'rgba(236,72,153,0.22)', boxShadow:'0 0 22px var(--neon-2)', backdropFilter:'blur(4px)' }}>{T(lang,'swipe_chat')}</div>
          <div className="disp" style={{ position:'absolute', top:22, left:14, transform:'rotate(-8deg)', opacity:likeOp, padding:'7px 14px', borderRadius:13, border:'2.5px solid var(--neon-1)', color:'#fff', fontWeight:800, fontSize:15, letterSpacing:'0.08em', background:'rgba(168,85,247,0.22)', boxShadow:'0 0 22px var(--neon-1)', backdropFilter:'blur(4px)' }}>{T(lang,'swipe_save')}</div>
        </div>
      </div>

      {/* 滑动提示条 */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:18, padding:'2px 0 4px' }}>
        <span className="ui" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11.5, color:'var(--t3)', fontWeight:600 }}><Icon name="back" size={13} /> {T(lang,'swipe_save')}</span>
        <span style={{ width:4, height:4, borderRadius:'50%', background:'var(--t3)' }} />
        <span className="ui" style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11.5, color:'var(--neon-2)', fontWeight:600 }}>{T(lang,'swipe_chat')} <Icon name="chevR" size={13} /></span>
      </div>

      {/* 继续上次 */}
      {rc && (
        <div style={{ padding:'16px 22px 0' }}>
          <div className="ui" style={{ fontSize:15.5, fontWeight:700, color:'var(--t1)', marginBottom:11 }}>{T(lang,'home_continue')}</div>
          <div onClick={()=>onResume(rc)} className="glass glass-edge" style={{ display:'flex', alignItems:'center', gap:13, borderRadius:18, padding:12, cursor:'pointer' }}>
            <div style={{ width:54, height:54, borderRadius:14, position:'relative', overflow:'hidden', flexShrink:0 }}><Portrait comp={rc} variant="thumb" mask={false} focus="center 20%" /></div>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7 }}><span className="cn" style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{rc.name}</span><Icon name="heartFill" size={13} style={{ color:'var(--neon-2)' }} /><span className="ui" style={{ fontSize:11, color:'var(--t3)', marginLeft:'auto' }}>{enLang?recent.whenEn:recent.when}</span></div>
              <div className="ui" style={{ fontSize:12.5, color:'var(--t2)', marginTop:3, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{T(lang,'msg_last')} {enLang?recent.summaryEn:recent.summary}</div>
            </div>
            <button style={{ width:44, height:44, borderRadius:'50%', border:'none', flexShrink:0, cursor:'pointer', background:'linear-gradient(135deg,var(--neon-1),var(--neon-2))', color:'#fff', display:'grid', placeItems:'center', boxShadow:'0 6px 18px rgba(168,85,247,0.5)' }}><Icon name="play" size={20} /></button>
          </div>
        </div>
      )}

      {/* Explore by vibe */}
      <div style={{ padding:'20px 22px 0' }}>
        <div className="ui" style={{ fontSize:15.5, fontWeight:700, color:'var(--t1)', marginBottom:13 }}>{T(lang,'home_vibe')}</div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:11 }}>
          {(window.VIBES||[]).map(v=>(
            <button key={v.key} onClick={()=>onVibe(v)} className="glass glass-edge" style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 12px', borderRadius:15, border:'none', cursor:'pointer', textAlign:'left' }}>
              <span style={{ width:36, height:36, borderRadius:11, flexShrink:0, display:'grid', placeItems:'center',
                background:`${v.color}1f`, border:`1px solid ${v.color}40`, color:v.color, boxShadow:`0 3px 12px ${v.color}22` }}>
                <Icon name={v.icon} size={20} />
              </span>
              <span style={{ minWidth:0 }}>
                <span className="ui" style={{ display:'block', fontSize:12, color:'#fff', fontWeight:700, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{v.labelEn}</span>
                <span className="cn" style={{ display:'block', fontSize:10, color:'var(--t3)', whiteSpace:'nowrap' }}>{v.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
window.HomeScreen = HomeScreen;
