// primitives.jsx — 共享基础组件。挂 window.*
// LevelBadge / OnlineDot / GradientButton / GhostButton / Chip / GlassCard / Waveform / Ripple / StatCard / PremiumTag

// 等级徽章（A 紫 / B 蓝青 / C 橙粉），可带 HSK
function LevelBadge({ comp, hsk = false, size = 'md' }) {
  const sm = size === 'sm';
  return (
    <span className="en" style={{ display:'inline-flex', alignItems:'center', gap:5,
      padding: sm ? '3px 8px' : '4px 10px', borderRadius:9999, lineHeight:1,
      fontSize: sm ? 11 : 12.5, fontWeight:800, letterSpacing:'0.02em',
      color:'#fff', background:`${comp.levelColor}26`,
      border:`1px solid ${comp.levelColor}`, boxShadow:`0 0 14px ${comp.levelColor}55`,
      textShadow:`0 0 10px ${comp.levelColor}` }}>
      {comp.level}{hsk && <span style={{ opacity:.7, fontWeight:600, fontSize:sm?9.5:10.5 }}>{comp.hsk}</span>}
    </span>
  );
}

function PremiumTag({ size = 'md' }) {
  const sm = size === 'sm';
  return (
    <span className="en" style={{ display:'inline-flex', alignItems:'center', gap:4,
      padding: sm?'3px 7px':'4px 9px', borderRadius:9999, fontSize:sm?10.5:11.5, fontWeight:800,
      color:'#1A1206', background:'linear-gradient(135deg,#FCD34D,#FB923C)',
      boxShadow:'0 0 16px rgba(251,146,60,0.6)' }}>
      <Icon name="starFill" size={sm?11:12} /> PRO
    </span>
  );
}

function OnlineDot({ online = true, size = 9 }) {
  return (
    <span style={{ width:size, height:size, borderRadius:'50%', display:'inline-block',
      background: online ? 'var(--green)' : 'var(--t3)',
      boxShadow: online ? '0 0 10px var(--green), 0 0 0 3px rgba(52,211,153,0.18)' : 'none' }} />
  );
}

// 主按钮：渐变药丸 + 辉光
function GradientButton({ children, icon, onClick, full = true, style = {} }) {
  return (
    <button onClick={onClick} className="cn" style={{
      display:'inline-flex', alignItems:'center', justifyContent:'center', gap:9,
      width: full ? '100%' : 'auto', padding:'15px 26px', border:'none', cursor:'pointer',
      borderRadius:9999, fontSize:17, fontWeight:700, color:'#fff',
      background:'linear-gradient(135deg,var(--neon-1),var(--neon-2))', backgroundSize:'150% 150%',
      boxShadow:'0 8px 28px rgba(168,85,247,0.45), inset 0 1px 0 rgba(255,255,255,0.25)',
      ...style }}>
      {icon && <Icon name={icon} size={20} />}{children}
    </button>
  );
}

// 次级玻璃按钮（圆形或药丸）
function GhostButton({ icon, label, onClick, size = 48, danger = false, active = false, style = {} }) {
  return (
    <button onClick={onClick} className="glass glass-edge cn" style={{
      display:'inline-flex', flexDirection: label?'column':'row', alignItems:'center', justifyContent:'center', gap:5,
      width: label ? 'auto' : size, height:size, minWidth:size, padding: label?'0 16px':0, cursor:'pointer',
      borderRadius: label?9999:'50%', color: danger?'#fff':(active?'var(--neon-1)':'var(--t1)'),
      background: danger?'rgba(244,63,94,0.92)':(active?'rgba(168,85,247,0.22)':undefined),
      borderColor: danger?'rgba(255,120,120,0.5)':undefined,
      boxShadow: danger?'0 6px 22px rgba(244,63,94,0.45)':undefined, ...style }}>
      {icon && <Icon name={icon} size={22} />}
      {label && <span style={{ fontSize:12, fontWeight:600 }}>{label}</span>}
    </button>
  );
}

// 标签 / 场景筛选 chip
function Chip({ children, active = false, onClick, glow, style = {} }) {
  return (
    <button onClick={onClick} className="cn" style={{
      padding:'8px 14px', borderRadius:'var(--r-chip)', cursor: onClick?'pointer':'default',
      fontSize:13.5, fontWeight:600, whiteSpace:'nowrap', flexShrink:0,
      color: active?'#fff':'var(--t2)',
      background: active?'linear-gradient(135deg,var(--neon-1),var(--neon-2))':'rgba(255,255,255,0.05)',
      border:`1px solid ${active?'transparent':'var(--hairline)'}`,
      boxShadow: active?'0 4px 16px rgba(168,85,247,0.4)':'none', ...style }}>
      {children}
    </button>
  );
}

function GlassCard({ children, style = {}, className = '', onClick }) {
  return (
    <div onClick={onClick} className={`glass glass-edge ${className}`} style={{
      borderRadius:'var(--r-panel)', ...style }}>{children}</div>
  );
}

// 语音波形：连续霓虹流光条。state: 'listen'(绿) | 'think'(橙) | 'speak'(紫) | 'idle'
function Waveform({ state = 'speak', bars = 38, height = 46 }) {
  const color = state==='listen' ? 'var(--green)' : state==='think' ? 'var(--orange)' : 'var(--neon-1)';
  const active = state !== 'idle';
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:3, height }}>
      {Array.from({ length:bars }).map((_, i) => {
        const mid = Math.abs(i - bars/2) / (bars/2);
        const base = (1 - mid*0.7);
        return (
          <span key={i} style={{ width:3, height:'100%', borderRadius:9999, transformOrigin:'center',
            background:`linear-gradient(180deg, ${color}, ${state==='speak'?'var(--neon-2)':color})`,
            opacity: active ? 0.9 : 0.25,
            boxShadow: active ? `0 0 8px ${color}` : 'none',
            transform:`scaleY(${active? base*0.5+0.2 : 0.16})`,
            animation: active ? `wf ${state==='think'?1.6:0.9}s ease-in-out ${i*0.045}s infinite` : 'none' }} />
        );
      })}
    </div>
  );
}

// 麦克风涟漪（录音态多层涟漪）
function Ripple({ color = 'var(--neon-1)', on = true }) {
  return (
    <>
      {on && [0,0.6,1.2].map((d,i)=>(
        <span key={i} style={{ position:'absolute', inset:0, borderRadius:'50%',
          border:`2px solid ${color}`, animation:`ripple 1.8s ease-out ${d}s infinite` }} />
      ))}
    </>
  );
}

function StatCard({ value, label, unit, accent = 'var(--neon-1)' }) {
  return (
    <div className="glass glass-edge" style={{ flex:1, borderRadius:'var(--r-panel)', padding:'16px 12px', textAlign:'center' }}>
      <div className="en" style={{ fontSize:28, fontWeight:800, letterSpacing:'-0.02em', color:'#fff',
        textShadow:`0 0 18px ${accent}88`, lineHeight:1 }}>{value}<span style={{ fontSize:13, color:'var(--t2)', fontWeight:600, marginLeft:2 }}>{unit}</span></div>
      <div className="cn" style={{ fontSize:12, color:'var(--t2)', marginTop:6 }}>{label}</div>
    </div>
  );
}

Object.assign(window, { LevelBadge, PremiumTag, OnlineDot, GradientButton, GhostButton, Chip, GlassCard, Waveform, Ripple, StatCard });
