// tabbar.jsx — 底部 5-Tab 导航（玻璃模糊 + 霓虹高亮）。挂 window.TabBar。
function TabBar({ active, onChange, lang='en' }) {
  const T = window.I18N.t;
  const tabs = [
    { key:'home',     icon:'home',     label:T(lang,'tab_home') },
    { key:'explore',  icon:'discover', label:T(lang,'tab_explore') },
    { key:'memory',   icon:'memory',   label:T(lang,'tab_memory') },
    { key:'messages', icon:'message',  label:T(lang,'tab_messages') },
    { key:'me',       icon:'person',   label:T(lang,'tab_me') },
  ];
  return (
    <div className="glass" style={{ position:'absolute', left:0, right:0, bottom:0, zIndex:40,
      paddingBottom:24, paddingTop:9, borderTop:'1px solid var(--hairline)',
      background:'rgba(11,10,22,0.72)' }}>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)' }}>
        {tabs.map(t=>{
          const on = t.key===active;
          return (
            <button key={t.key} onClick={()=>onChange(t.key)} style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:4, border:'none', background:'none', cursor:'pointer', padding:'4px 0', position:'relative' }}>
              {on && <span style={{ position:'absolute', top:-9, width:26, height:3, borderRadius:9999, background:'linear-gradient(90deg,var(--neon-1),var(--neon-2))', boxShadow:'0 0 10px var(--neon-1)' }} />}
              <span style={{ color: on?'#fff':'var(--t3)', filter: on?'drop-shadow(0 0 8px var(--neon-1))':'none', transition:'.25s' }}>
                <Icon name={t.icon} size={23} stroke={on?2:1.9} filled={on} />
              </span>
              <span className="ui" style={{ fontSize:10, fontWeight:on?700:500, color: on?'#fff':'var(--t3)', letterSpacing:'0.01em' }}>{t.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
window.TabBar = TabBar;
