// app.jsx — 主壳 v3：Onboarding + 5-tab + i18n + 丰富 Tweaks。挂 window.CompanionApp。
const { useState: useStateA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "neon": ["#A855F7", "#EC4899"],
  "font": "jakarta",
  "bg": "deep",
  "radius": 26,
  "glassBlur": 20,
  "amb": 0.5,
  "depth": 0.88,
  "lang": "en",
  "pinyin": true,
  "english": true
}/*EDITMODE-END*/;

const FONT_MAP = {
  jakarta: { ui:'"Plus Jakarta Sans"', disp:'"Sora"' },
  sora:    { ui:'"Sora"', disp:'"Sora"' },
  space:   { ui:'"Space Grotesk"', disp:'"Space Grotesk"' },
  outfit:  { ui:'"Outfit"', disp:'"Outfit"' },
  system:  { ui:'-apple-system, system-ui, sans-serif', disp:'-apple-system, system-ui, sans-serif' },
};
const BG_MAP = {
  deep: {},
  soft: { '--bg-deepest':'#0E0B1C', '--bg-base':'#120F22', '--panel':'#1C1830', '--panel2':'#241F3A' },
  oled: { '--bg-deepest':'#000000', '--bg-base':'#050409', '--panel':'#0E0C16', '--panel2':'#15121F' },
};

// 把引导选择（水平/兴趣）转成角色排序：匹配的排前面（首页卡堆就会随选择变化）
const prefVibeScene = (key) => { const v = (window.VIBES || []).find(x => x.key === key); return v && v.scene; };
const PREF_BAND = { lvl_zero:'A', lvl_a:'A', lvl_b:'B', lvl_c:'C', lvl_unsure:null };
function orderByPrefs(comps, prefs) {
  if (!prefs || (!prefs.level && !(prefs.interests && prefs.interests.length))) return comps;
  const band = PREF_BAND[prefs.level] || null;
  const scenes = new Set((prefs.interests || []).map(prefVibeScene).filter(Boolean));
  return comps.map((c, i) => {
    let s = 0; if (band && c.band === band) s += 2; if (scenes.has(c.scene)) s += 3;
    return { c, s, i };
  }).sort((a, b) => (b.s - a.s) || (a.i - b.i)).map(x => x.c);
}

function CompanionApp() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const comps = window.COMPANIONS;
  const T = window.I18N.t;

  const [onboarded, setOnboarded] = useStateA(() => { try { return localStorage.getItem('yu_onboarded') === '1'; } catch { return false; } });
  const [tab, setTab] = useStateA('home');
  const [view, setView] = useStateA('home');
  const [sel, setSel] = useStateA(null);
  const [hIndex, setHIndex] = useStateA(0);
  const [liked, setLiked] = useStateA(()=>{ try{ return new Set(JSON.parse(localStorage.getItem('yu_liked'))||[]); }catch{ return new Set(); } });
  const [memSel, setMemSel] = useStateA('barista-xiaomin');
  const [prefs, setPrefs] = useStateA(() => { try { return JSON.parse(localStorage.getItem('yu_prefs')) || { level:null, interests:[] }; } catch { return { level:null, interests:[] }; } });   // 引导选择（持久化）
  const [exploreScene, setExploreScene] = useStateA(null);             // vibe → 探索筛选

  const lang = t.lang || 'en';
  const go = (v, comp) => { if (comp) setSel(comp); setView(v); };
  const goTab = (k) => { setTab(k); setView(k); };
  const toggleLike = (c) => setLiked(s => { const n = new Set(s); n.has(c.id)?n.delete(c.id):n.add(c.id); try{ localStorage.setItem('yu_liked', JSON.stringify([...n])); }catch{} return n; });

  const fonts = FONT_MAP[t.font] || FONT_MAP.jakarta;
  const rootVars = {
    '--glass-blur': t.glassBlur + 'px',
    '--neon-1': t.neon[0], '--neon-2': t.neon[1],
    '--r-card': t.radius + 'px', '--r-panel': Math.max(14, t.radius-6) + 'px',
    '--font-ui': fonts.ui + ', system-ui, sans-serif',
    '--font-display': fonts.disp + ', system-ui, sans-serif',
    '--amb': t.amb,
    ...(BG_MAP[t.bg] || {}),
  };
  const subLang = { pinyin: t.pinyin, en: t.english };
  const showTab = ['home','explore','memory','messages','me'].includes(view);

  const tweaksPanel = (
    <TweaksPanel>
      <TweakSection label="Appearance" />
      <TweakColor label="Neon color" value={t.neon}
        options={[['#A855F7','#EC4899'], ['#6366F1','#38BDF8'], ['#FB923C','#EC4899'], ['#22D3EE','#34D399'], ['#F472B6','#A855F7']]}
        onChange={(v)=>setTweak('neon', v)} />
      <TweakSelect label="Font" value={t.font}
        options={[{value:'jakarta',label:'Plus Jakarta'},{value:'sora',label:'Sora'},{value:'space',label:'Space Grotesk'},{value:'outfit',label:'Outfit'},{value:'system',label:'System'}]}
        onChange={(v)=>setTweak('font', v)} />
      <TweakRadio label="Background" value={t.bg} options={['deep','soft','oled']} onChange={(v)=>setTweak('bg', v)} />
      <TweakSlider label="Card radius" value={t.radius} min={14} max={32} unit="px" onChange={(v)=>setTweak('radius', v)} />
      <TweakSection label="Glass & glow" />
      <TweakSlider label="Glass blur" value={t.glassBlur} min={6} max={36} unit="px" onChange={(v)=>setTweak('glassBlur', v)} />
      <TweakSlider label="Ambient glow" value={Math.round(t.amb*100)} min={0} max={100} unit="%" onChange={(v)=>setTweak('amb', v/100)} />
      <TweakSlider label="Card depth" value={Math.round(t.depth*100)} min={70} max={96} unit="%" onChange={(v)=>setTweak('depth', v/100)} />
      <TweakSection label="Language & subtitles" />
      <TweakSelect label="UI language" value={t.lang}
        options={window.I18N.LANGS.map(L=>({ value:L.code, label:L.native }))}
        onChange={(v)=>setTweak('lang', v)} />
      <TweakToggle label="Show pinyin" value={t.pinyin} onChange={(v)=>setTweak('pinyin', v)} />
      <TweakToggle label="Show translation" value={t.english} onChange={(v)=>setTweak('english', v)} />
    </TweaksPanel>
  );

  // —— Onboarding ——
  if (!onboarded) {
    return (
      <div style={{ position:'absolute', inset:0, ...rootVars }}>
        <Onboarding comps={comps} initialLang={lang}
          onDone={({ lang:l, level, interests })=>{ setTweak('lang', l); const pf={ level, interests: interests||[] }; setPrefs(pf); setOnboarded(true); try{ localStorage.setItem('yu_onboarded','1'); localStorage.setItem('yu_prefs', JSON.stringify(pf)); }catch{} }} />
        {tweaksPanel}
      </div>
    );
  }

  return (
    <div style={{ position:'absolute', inset:0, background:'var(--bg-base)', color:'var(--t1)', ...rootVars }}>
      {/* 氛围光（受 Ambient glow 调节） */}
      <div style={{ position:'absolute', inset:0, pointerEvents:'none', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-90, left:-60, width:280, height:280, borderRadius:'50%',
          background:'radial-gradient(circle, var(--neon-1), transparent 70%)', opacity:`calc(var(--amb) * 0.4)`, filter:'blur(22px)' }} />
        <div style={{ position:'absolute', bottom:40, right:-80, width:300, height:300, borderRadius:'50%',
          background:'radial-gradient(circle, var(--neon-2), transparent 70%)', opacity:`calc(var(--amb) * 0.32)`, filter:'blur(22px)' }} />
      </div>

      <div key={view} style={{ position:'absolute', inset:0 }}>
        {view === 'home' && (
          <HomeScreen comps={orderByPrefs(comps, prefs)} index={hIndex} setIndex={setHIndex} lang={lang}
            onChat={(c)=>go('call', c)} onOpen={(c)=>go('detail', c)} onLike={toggleLike}
            onVibe={(v)=>{ setExploreScene(v && v.scene ? v.scene : null); goTab('explore'); }} onResume={(c)=>go('call', c)} />
        )}
        {view === 'explore' && (
          <ExploreScreen comps={comps} onOpen={(c)=>go('detail', c)} lang={lang} scene={exploreScene} />
        )}
        {view === 'memory' && (
          <MemoryScreen comps={comps} sel={memSel} setSel={setMemSel} lang={lang} />
        )}
        {view === 'messages' && (
          <MessagesScreen comps={comps} onOpen={(c)=>go('detail', c)} onChat={(c)=>go('call', c)} lang={lang} />
        )}
        {view === 'me' && (
          <MeScreen comps={comps} lang={lang} onFav={()=>go('favorites')} />
        )}
        {view === 'favorites' && (
          <FavoritesScreen comps={comps} liked={liked} lang={lang}
            onOpen={(c)=>go('detail', c)} onChat={(c)=>go('call', c)} onToggleLike={toggleLike} onBack={()=>goTab('me')} />
        )}
        {view === 'detail' && sel && (
          <DetailScreen comp={sel} liked={liked.has(sel.id)} onToggleLike={()=>toggleLike(sel)} lang={lang}
            onBack={()=>go(tab)} onChat={(c)=>go('call', c)} />
        )}
        {view === 'call' && sel && (
          <CallScreen comp={sel} subLang={subLang} onBack={()=>go(tab)} lang={lang} />
        )}
      </div>

      {showTab && <TabBar active={tab} onChange={goTab} lang={lang} />}
      {tweaksPanel}
    </div>
  );
}
window.CompanionApp = CompanionApp;
