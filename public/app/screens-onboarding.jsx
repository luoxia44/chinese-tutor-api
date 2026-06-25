// screens-onboarding.jsx — 引导流程：欢迎 → 语言 → 中文水平 → 兴趣。挂 window.Onboarding。
const { useState: useStateO } = React;

function Onboarding({ comps, onDone, initialLang = 'en', __step = 0 }) {
  const T = window.I18N.t;
  const LANGS = window.I18N.LANGS;
  const VIBES = window.VIBES || [];
  const [step, setStep] = useStateO(__step);          // 0 welcome,1 lang,2 level,3 interests
  const [lang, setLang] = useStateO(initialLang);
  const [level, setLevel] = useStateO(null);
  const [picks, setPicks] = useStateO(()=>new Set());

  const next = () => setStep(s => Math.min(3, s+1));
  const back = () => setStep(s => Math.max(0, s-1));
  const finish = () => onDone({ lang, level: level||'lvl_a', interests:[...picks] });

  const togglePick = (k) => setPicks(s => { const n = new Set(s); n.has(k)?n.delete(k):n.add(k); return n; });

  const LEVELS = [
    { key:'lvl_zero', band:'A', c:'#A855F7' },
    { key:'lvl_a',    band:'A', c:'#6366F1' },
    { key:'lvl_b',    band:'B', c:'#3B82F6' },
    { key:'lvl_c',    band:'C', c:'#F59E0B' },
    { key:'lvl_unsure', band:'?', c:'#94A3B8' },
  ];

  return (
    <div style={{ position:'absolute', inset:0, background:'var(--bg-base)', color:'var(--t1)', overflow:'hidden' }}>
      {/* 氛围光 */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-100, left:-70, width:300, height:300, borderRadius:'50%', background:'radial-gradient(circle,var(--neon-1),transparent 70%)', opacity:0.26, filter:'blur(20px)' }} />
        <div style={{ position:'absolute', bottom:-40, right:-80, width:320, height:320, borderRadius:'50%', background:'radial-gradient(circle,var(--neon-2),transparent 70%)', opacity:0.2, filter:'blur(20px)' }} />
      </div>

      {/* 顶栏：返回 + 进度点 + 跳过 */}
      {step > 0 && (
        <div style={{ position:'absolute', top:56, left:18, right:18, zIndex:5, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <button onClick={back} className="glass glass-edge" style={{ width:40, height:40, borderRadius:'50%', display:'grid', placeItems:'center', color:'var(--t1)', cursor:'pointer', border:'none' }}><Icon name="back" size={20} /></button>
          <div style={{ display:'flex', gap:7 }}>
            {[1,2,3].map(i=>(
              <span key={i} style={{ width: i===step?22:7, height:7, borderRadius:9999, transition:'.3s',
                background: i===step?'linear-gradient(90deg,var(--neon-1),var(--neon-2))':'rgba(255,255,255,0.18)' }} />
            ))}
          </div>
          <button onClick={step<3?next:finish} className="ui" style={{ background:'none', border:'none', color:'var(--t2)', fontSize:14, fontWeight:600, cursor:'pointer', width:40, textAlign:'right' }}>{T(lang,'onb_skip')}</button>
        </div>
      )}

      {/* —— Step 0 欢迎 —— */}
      {step === 0 && (
        <div style={{ position:'absolute', inset:0, display:'flex', flexDirection:'column' }}>
          {/* 角色头像云 */}
          <div style={{ position:'relative', flex:1, minHeight:0 }}>
            {[[ '12%','16%',64,0],['66%','12%',54,1],['38%','30%',76,2],['78%','40%',60,8],['8%','44%',58,12],['52%','8%',46,17]].map(([l,tp,sz,ci],i)=>(
              <div key={i} style={{ position:'absolute', left:l, top:tp, animation:`floaty ${3+i*0.5}s ease-in-out ${i*0.3}s infinite` }}>
                <Avatar comp={comps[ci]} size={sz} />
              </div>
            ))}
            <div style={{ position:'absolute', inset:0, background:'linear-gradient(180deg, transparent 40%, var(--bg-base) 92%)' }} />
          </div>
          <div style={{ padding:'0 28px 40px', position:'relative' }}>
            <div className="disp" style={{ fontSize:13, fontWeight:700, color:'var(--neon-1)', letterSpacing:'0.16em', textTransform:'uppercase', marginBottom:12 }}>语 · YǓ</div>
            <div className="disp" style={{ fontSize:34, fontWeight:800, color:'#fff', lineHeight:1.12, letterSpacing:'-0.02em' }}>{T(lang,'app_tagline')}</div>
            <div className="cn" style={{ fontSize:16, color:'var(--t2)', marginTop:12, lineHeight:1.5 }}>和真实的人，练地道的中文口语</div>
            <div className="ui" style={{ fontSize:14, color:'var(--t3)', marginTop:6, lineHeight:1.5 }}>{T(lang,'onb_welcome_sub')}</div>
            <div style={{ marginTop:26 }}><GradientButton icon="sparkle" onClick={next}>{T(lang,'onb_start')}</GradientButton></div>
          </div>
        </div>
      )}

      {/* —— Step 1 语言 —— */}
      {step === 1 && (
        <OnbBody title={T(lang,'onb_lang_title')} sub={T(lang,'onb_lang_sub')}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {LANGS.map(L=>{
              const on = L.code===lang;
              return (
                <button key={L.code} onClick={()=>setLang(L.code)} className="glass glass-edge" style={{ display:'flex', alignItems:'center', gap:13, padding:'15px 15px', borderRadius:18, cursor:'pointer', textAlign:'left',
                  border:`1.5px solid ${on?'var(--neon-1)':'var(--hairline)'}`, boxShadow:on?'0 0 22px rgba(168,85,247,0.35)':'none', background:on?'rgba(168,85,247,0.14)':undefined }}>
                  <span className="disp" style={{ width:42, height:42, borderRadius:12, flexShrink:0, display:'grid', placeItems:'center', fontSize:20, fontWeight:800, color:'#fff',
                    background: on?'linear-gradient(135deg,var(--neon-1),var(--neon-2))':'rgba(255,255,255,0.06)' }}>{L.mono}</span>
                  <div style={{ minWidth:0 }}>
                    <div className="ui" style={{ fontSize:15, fontWeight:700, color:'#fff', whiteSpace:'nowrap' }}>{L.native}</div>
                    <div className="ui" style={{ fontSize:11.5, color:'var(--t3)' }}>{L.label}</div>
                  </div>
                  {on && <span style={{ marginLeft:'auto', color:'var(--neon-1)' }}><Icon name="check" size={18} /></span>}
                </button>
              );
            })}
          </div>
        </OnbBody>
      )}

      {/* —— Step 2 水平 —— */}
      {step === 2 && (
        <OnbBody title={T(lang,'onb_level_title')} sub={T(lang,'onb_level_sub')}>
          <div style={{ display:'flex', flexDirection:'column', gap:11 }}>
            {LEVELS.map(L=>{
              const on = L.key===level;
              return (
                <button key={L.key} onClick={()=>setLevel(L.key)} className="glass glass-edge" style={{ display:'flex', alignItems:'center', gap:14, padding:'15px 16px', borderRadius:16, cursor:'pointer', textAlign:'left',
                  border:`1.5px solid ${on?L.c:'var(--hairline)'}`, boxShadow:on?`0 0 22px ${L.c}44`:'none', background:on?`${L.c}1c`:undefined }}>
                  <span className="disp" style={{ width:44, height:44, borderRadius:13, flexShrink:0, display:'grid', placeItems:'center', fontSize:17, fontWeight:800, color:'#fff',
                    background:`${L.c}2a`, border:`1px solid ${L.c}`, boxShadow:`0 0 14px ${L.c}55` }}>{L.band}</span>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div className="ui" style={{ fontSize:15.5, fontWeight:700, color:'#fff' }}>{T(lang,L.key)}</div>
                    <div className="ui" style={{ fontSize:12.5, color:'var(--t3)', marginTop:2 }}>{T(lang,L.key+'_d')}</div>
                  </div>
                  <span style={{ width:22, height:22, borderRadius:'50%', flexShrink:0, display:'grid', placeItems:'center', border:`2px solid ${on?L.c:'var(--hairline)'}`, background:on?L.c:'transparent' }}>{on && <Icon name="check" size={13} style={{ color:'#fff' }} />}</span>
                </button>
              );
            })}
          </div>
        </OnbBody>
      )}

      {/* —— Step 3 兴趣 —— */}
      {step === 3 && (
        <OnbBody title={T(lang,'onb_interest_title')} sub={T(lang,'onb_interest_sub')}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:11 }}>
            {VIBES.map(v=>{
              const on = picks.has(v.key);
              return (
                <button key={v.key} onClick={()=>togglePick(v.key)} className="glass glass-edge" style={{ display:'flex', flexDirection:'column', gap:9, padding:'15px 15px', borderRadius:17, cursor:'pointer', textAlign:'left',
                  border:`1.5px solid ${on?v.color:'var(--hairline)'}`, boxShadow:on?`0 0 20px ${v.color}40`:'none', background:on?`${v.color}1a`:undefined }}>
                  <span style={{ width:40, height:40, borderRadius:12, display:'grid', placeItems:'center', background:`${v.color}24`, color:v.color, border:`1px solid ${v.color}44` }}><Icon name={v.icon} size={22} /></span>
                  <div>
                    <div className="ui" style={{ fontSize:14, fontWeight:700, color:'#fff' }}>{v.labelEn}</div>
                    <div className="cn" style={{ fontSize:11.5, color:'var(--t3)', marginTop:1 }}>{v.label}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </OnbBody>
      )}

      {/* 底部主按钮（step 1-3） */}
      {step > 0 && (
        <div style={{ position:'absolute', left:0, right:0, bottom:0, padding:'14px 24px 34px', background:'linear-gradient(180deg, transparent, var(--bg-base) 36%)' }}>
          <GradientButton
            onClick={step<3 ? next : finish}
            style={{ opacity: (step===1 && !lang) || (step===2 && !level) ? 0.55 : 1 }}>
            {step<3 ? T(lang,'onb_continue') : T(lang,'onb_start')}
          </GradientButton>
        </div>
      )}
    </div>
  );
}

function OnbBody({ title, sub, children }) {
  return (
    <div className="noscroll" style={{ position:'absolute', inset:0, paddingTop:108, paddingBottom:120, overflowY:'auto' }}>
      <div style={{ padding:'0 24px 18px' }}>
        <div className="disp" style={{ fontSize:27, fontWeight:800, color:'#fff', lineHeight:1.2, letterSpacing:'-0.02em' }}>{title}</div>
        <div className="ui" style={{ fontSize:14.5, color:'var(--t2)', marginTop:8, lineHeight:1.45 }}>{sub}</div>
      </div>
      <div style={{ padding:'0 24px' }}>{children}</div>
    </div>
  );
}
window.Onboarding = Onboarding;
