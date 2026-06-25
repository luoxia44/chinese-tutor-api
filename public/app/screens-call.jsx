// screens-call.jsx — 打电话式对话页（接真实后端 + 连续语音）。挂 window.CallScreen。
// 视觉沿用设计稿（呼吸立绘 / 霓虹光弧 / 波形 / 字幕气泡 / 专属状态条 / 控件），
// 引擎换成真实：startSession → 连续监听 → MiniMax 对话 + 真音色 → 循环，可打断。
const { useEffect: useEffectC, useRef: useRefC, useState: useStateC } = React;

const CALL_STATES = {
  connecting:{ expr:'smile',     color:'var(--neon-1)', wf:'idle',   statusKey:'call_connecting' },
  listening: { expr:'listening', color:'var(--green)',  wf:'listen', statusKey:'call_listening' },
  thinking:  { expr:'thinking',  color:'var(--orange)', wf:'think',  statusKey:'call_thinking' },
  speaking:  { expr:'happy',     color:'var(--neon-1)', wf:'speak',  statusKey:'call_speaking' },
  idle:      { expr:'smile',     color:'var(--neon-1)', wf:'idle',   statusKey:'call_listening' },
  muted:     { expr:'smile',     color:'var(--t3)',     wf:'idle',   statusKey:'call_muted' },
};
const STRIP = [
  { key:'speaking', expr:'happy',     k:'st_speaking' },
  { key:'thinking', expr:'thinking',  k:'st_thinking' },
  { key:'listening',expr:'listening', k:'st_attentive' },
  { key:'attentive',expr:'attentive', k:'st_cheer' },
];

function HaloArc({ color }) {
  const tint = color==='var(--green)' ? '#34D399' : '#EC4899';
  const arc = 'M 8 80 Q 160 8 312 80';
  return (
    <div style={{ position:'absolute', left:0, right:0, top:'53%', height:120, pointerEvents:'none', display:'grid', placeItems:'center' }}>
      <div style={{ position:'absolute', width:320, height:104, borderRadius:'50%',
        background:`radial-gradient(ellipse at center 24%, ${tint}66, rgba(168,85,247,.32) 46%, transparent 72%)`, filter:'blur(12px)' }} />
      <svg width="320" height="110" viewBox="0 0 320 110" fill="none" style={{ position:'absolute', overflow:'visible' }}>
        <defs>
          <linearGradient id="haloG" x1="0" y1="0" x2="320" y2="0">
            <stop offset="0" stopColor="#6366F1" stopOpacity="0"/>
            <stop offset="0.18" stopColor="#6366F1"/>
            <stop offset="0.5" stopColor="#A855F7"/>
            <stop offset="0.82" stopColor="#EC4899"/>
            <stop offset="1" stopColor="#EC4899" stopOpacity="0"/>
          </linearGradient>
          <filter id="haloBlur" x="-20%" y="-60%" width="140%" height="220%"><feGaussianBlur stdDeviation="4"/></filter>
        </defs>
        <path d={arc} stroke="url(#haloG)" strokeWidth="11" strokeLinecap="round" filter="url(#haloBlur)" opacity="0.8"/>
        <path d={arc} stroke="url(#haloG)" strokeWidth="3" strokeLinecap="round"/>
        <circle r="4.5" fill="#fff">
          <animateMotion dur="3.2s" repeatCount="indefinite" keyPoints="0;1;0" keyTimes="0;0.5;1" calcMode="spline" keySplines="0.4 0 0.6 1;0.4 0 0.6 1" path={arc}/>
        </circle>
      </svg>
    </div>
  );
}

function CallScreen({ comp, onBack, subLang = { pinyin:true, en:true }, lang='en' }) {
  const T = window.I18N.t;
  const [phase, setPhase] = useStateC('connecting');
  const [muted, setMuted] = useStateC(false);
  const [showInput, setShowInput] = useStateC(false);
  const [sub, setSub] = useStateC({ zh: comp.line, py: comp.linePy, en: comp.lineEn });
  const [hint, setHint] = useStateC('');

  const hist = useRefC([]);
  const sess = useRefC(null);
  const started = useRefC(Date.now());
  const active = useRefC(true);
  const mutedR = useRefC(false);
  const ended = useRefC(false);
  const pend = useRefC('');
  const errs = useRefC(0);
  const inputRef = useRefC(null);
  const engineRef = useRefC('mock');
  const abortRef = useRefC(null);

  useEffectC(() => {
    active.current = true;
    window.API.config().then(c => { engineRef.current = c.engine; }).catch(()=>{});
    begin();
    return () => {
      active.current = false;
      if (abortRef.current) { try { abortRef.current.abort(); } catch (e) {} }
      window.Voice.clearQueue(); window.Voice.stopSpeaking(); window.Voice.stopListening();
    };
  }, []);

  async function begin() {
    try {
      const s = await window.API.startSession(comp.id);
      sess.current = s.sessionId;
      hist.current = [{ role:'assistant', content: s.opening.zh }];
      setSub({ zh: s.opening.zh, py: s.opening.pinyin, en: s.opening.en });
      setPhase('speaking');
      await window.Voice.speak(s.opening.zh, s.audio, { rate: 1 });
    } catch (e) { setPhase('idle'); }
    if (!active.current) return;
    listen();
  }

  function listen() {
    if (!active.current || mutedR.current) return;
    if (!window.Voice.recognitionSupported) { setShowInput(true); setPhase('idle'); setHint(T(lang,'type_hint')); return; }
    setPhase('listening'); pend.current = '';
    window.Voice.startListening({
      onResult: (t) => { pend.current = t; errs.current = 0; },
      onEnd: () => {
        if (!active.current || mutedR.current) return;
        if (pend.current.trim()) { const t = pend.current; pend.current = ''; handleUser(t); }
        else setTimeout(listen, 350);
      },
      onError: (e) => {
        const er = (e && e.error) || '';
        if (er === 'not-allowed' || er === 'service-not-allowed') { mutedR.current = true; setMuted(true); setShowInput(true); setPhase('idle'); setHint(T(lang,'type_hint')); return; }
        if (++errs.current >= 4) { setShowInput(true); setPhase('idle'); setHint(T(lang,'type_hint')); return; }
        if (active.current && !mutedR.current) setTimeout(listen, 700);
      },
    });
  }

  async function handleUser(text) {
    text = (text || '').trim(); if (!text) return;
    window.Voice.stopListening();
    hist.current.push({ role:'user', content: text });
    setPhase('thinking');
    setSub({ zh: '「' + text + '」', py:'', en:'' });
    setHint('');

    if (engineRef.current === 'minimax') {
      // 流式：逐句生成 → 逐句合成 → 排队播放（首音快、边说边出、可打断）
      const ac = new AbortController(); abortRef.current = ac;
      let full = '', firstAudio = true;
      await window.API.chatStream(comp.id, hist.current, {
        signal: ac.signal,
        onSentence: ({ text: st, audio, mime }) => {
          full += st; setSub({ zh: full, py:'', en:'' });
          if (audio) { if (firstAudio) { firstAudio = false; setPhase('speaking'); } window.Voice.enqueue(audio, mime); }
        },
        onDone: (reply) => { if (reply) { full = reply; setSub({ zh: reply, py:'', en:'' }); } },
        onError: () => { setHint('网络出错，请重试'); },
      });
      abortRef.current = null;
      if (full) hist.current.push({ role:'assistant', content: full });
      await window.Voice.whenDrained();
    } else {
      // mock 兜底：整段 + 浏览器 TTS
      try {
        const { reply, audio, error } = await window.API.chat(comp.id, hist.current);
        if (error) { setPhase('idle'); setHint('出错了，请重试'); }
        else { hist.current.push({ role:'assistant', content: reply }); setSub({ zh: reply, py:'', en:'' }); setPhase('speaking'); await window.Voice.speak(reply, audio, { rate: 1 }); }
      } catch (e) { setPhase('idle'); }
    }
    if (active.current && !mutedR.current) listen();
    else if (!mutedR.current) setPhase('idle');
  }

  function toggleMic() {
    if (phase === 'speaking' || phase === 'thinking') { // 打断（中止流式 + 清空音频队列）
      if (abortRef.current) { try { abortRef.current.abort(); } catch (e) {} abortRef.current = null; }
      window.Voice.clearQueue(); window.Voice.stopSpeaking(); listen(); return;
    }
    const m = !mutedR.current; mutedR.current = m; setMuted(m);
    if (m) { window.Voice.stopListening(); window.Voice.stopSpeaking(); window.Voice.clearQueue(); setPhase('idle'); }
    else listen();
  }

  function sendTyped() {
    const v = inputRef.current && inputRef.current.value;
    if (v && v.trim()) { inputRef.current.value=''; setShowInput(false); handleUser(v); }
  }

  async function endCall() {
    if (ended.current) { onBack(); return; }
    ended.current = true; active.current = false;
    if (abortRef.current) { try { abortRef.current.abort(); } catch (e) {} }
    window.Voice.clearQueue(); window.Voice.stopSpeaking(); window.Voice.stopListening();
    setPhase('idle');
    const durationSec = Math.round((Date.now() - started.current) / 1000);
    try { await window.API.endSession({ sessionId: sess.current, companionId: comp.id, transcript: hist.current, durationSec }); } catch (e) {}
    onBack();
  }

  const cur = muted ? CALL_STATES.muted : (CALL_STATES[phase] || CALL_STATES.connecting);
  const speaking = phase === 'speaking' && !muted;

  return (
    <div style={{ height:'100%', position:'relative', overflow:'hidden', background:'var(--bg-deepest)' }}>
      <div style={{ position:'absolute', inset:0, animation: speaking ? 'breathe 4s ease-in-out infinite' : 'none' }}>
        <Portrait comp={comp} variant="full" expression={cur.expr} mask focus="center 16%" />
      </div>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:220, pointerEvents:'none',
        background:`radial-gradient(80% 100% at 50% 0%, ${cur.color}30, transparent 70%)`, transition:'background .6s' }} />

      {/* 顶栏 */}
      <div style={{ position:'absolute', top:54, left:16, right:16, display:'flex', alignItems:'center', justifyContent:'space-between', zIndex:6 }}>
        <GhostButton icon="back" size={42} onClick={endCall} />
        <div style={{ textAlign:'center' }}>
          <div className="cn" style={{ fontSize:17, fontWeight:700, color:'#fff' }}>{comp.name}</div>
          <div style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:2 }}><OnlineDot online size={6} /><span className="ui" style={{ fontSize:11.5, color:'var(--green)', fontWeight:600 }}>{T(lang,'online')}</span></div>
        </div>
        <GhostButton icon="gear" size={42} />
      </div>

      {/* 字幕气泡 */}
      <div style={{ position:'absolute', left:24, right:24, top:'33%', zIndex:5, opacity: phase==='connecting'?0:1, transition:'opacity .4s' }}>
        <div className="glass glass-edge" style={{ borderRadius:20, padding:'15px 18px', boxShadow:`0 0 36px ${cur.color}2e` }}>
          <div className="cn" style={{ fontSize:21, fontWeight:700, color:'#fff', lineHeight:1.4 }}>{sub.zh}</div>
          {subLang.pinyin && sub.py && <div className="ui" style={{ fontSize:13, color:'var(--neon-1)', marginTop:6, fontWeight:500 }}>{sub.py}</div>}
          {subLang.en && sub.en && <div className="ui" style={{ fontSize:13, color:'var(--t2)', marginTop:5, lineHeight:1.4 }}>{sub.en}</div>}
          {phase==='thinking' && <div style={{ marginTop:10 }}><span className="tdots"><i></i><i></i><i></i></span></div>}
        </div>
      </div>

      {phase!=='connecting' && <HaloArc color={cur.color} />}

      {/* 状态文字 + 波形 */}
      <div style={{ position:'absolute', left:0, right:0, bottom:262, zIndex:5, textAlign:'center' }}>
        <div style={{ display:'inline-flex', alignItems:'center', gap:9, marginBottom:8 }}>
          <Icon name="sparkle" size={14} style={{ color:cur.color }} />
          <span className="ui" style={{ fontSize:13.5, fontWeight:600, color:'#fff', textShadow:`0 0 12px ${cur.color}` }}>{hint || T(lang, cur.statusKey, { name: comp.name })}</span>
        </div>
        <div style={{ padding:'0 36px' }}><Waveform state={cur.wf} bars={36} height={34} /></div>
      </div>

      {/* 专属状态条 */}
      <div style={{ position:'absolute', left:0, right:0, bottom:158, zIndex:5 }}>
        <div className="ui" style={{ fontSize:11.5, fontWeight:700, color:'var(--neon-2)', padding:'0 22px 8px' }}>{T(lang,'call_live',{ name: comp.name })}</div>
        <div className="noscroll" style={{ display:'flex', gap:9, padding:'0 22px', overflowX:'auto' }}>
          {STRIP.map(s=>{
            const on = (s.key===phase) || (s.key==='speaking'&&speaking) || (muted&&s.key==='attentive');
            return (
              <div key={s.key} style={{ flexShrink:0, width:96, borderRadius:12, overflow:'hidden', position:'relative', height:62,
                border:`1.5px solid ${on?cur.color:'var(--hairline)'}`, boxShadow:on?`0 0 16px ${cur.color}77`:'none', opacity:on?1:0.62, transition:'.3s' }}>
                <Portrait comp={comp} variant="thumb" mask expression={s.expr} focus="center 20%" />
                <div className="ui" style={{ position:'absolute', left:0, right:0, bottom:0, padding:'4px 6px', fontSize:9, fontWeight:600, color:'#fff', textAlign:'center', lineHeight:1.2 }}>{T(lang, s.k)}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 底部控制 */}
      <div style={{ position:'absolute', left:0, right:0, bottom:30, zIndex:6, display:'flex', alignItems:'flex-start', justifyContent:'center', gap:34, padding:'0 26px' }}>
        <CtrlBtn icon="keyboard" label={T(lang,'call_topic')} onClick={()=>{ setShowInput(true); setTimeout(()=>inputRef.current&&inputRef.current.focus(),50); }} />
        <div style={{ textAlign:'center' }}>
          <div style={{ position:'relative', width:80, height:80, margin:'0 auto' }}>
            {!muted && phase==='listening' && <Ripple color="var(--green)" />}
            <button onClick={toggleMic} style={{ position:'absolute', inset:0, borderRadius:'50%', border:'none', cursor:'pointer',
              background: muted ? 'rgba(117,111,140,0.4)' : 'linear-gradient(135deg,var(--neon-1),var(--neon-2))', color:'#fff', display:'grid', placeItems:'center',
              boxShadow: muted ? 'none' : '0 0 34px rgba(168,85,247,0.6), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
              <Icon name={muted?'micOff':'mic'} size={32} />
            </button>
          </div>
          <div className="ui" style={{ fontSize:11, color:'var(--t3)', marginTop:7 }}>{muted ? T(lang,'call_muted') : ''}</div>
        </div>
        <CtrlBtn icon="hangup" label={T(lang,'call_end')} danger onClick={endCall} />
      </div>

      {/* 兜底打字 */}
      {showInput && (
        <div style={{ position:'absolute', inset:0, zIndex:20, background:'rgba(7,5,13,0.6)', display:'flex', alignItems:'flex-end' }} onClick={()=>setShowInput(false)}>
          <div className="glass glass-edge" style={{ margin:16, marginBottom:30, width:'100%', borderRadius:20, padding:14, display:'flex', gap:10 }} onClick={e=>e.stopPropagation()}>
            <input ref={inputRef} placeholder={T(lang,'type_hint')} className="ui" onKeyDown={(e)=>{if(e.key==='Enter')sendTyped();}}
              style={{ flex:1, background:'rgba(0,0,0,0.3)', border:'1px solid var(--hairline)', borderRadius:14, padding:'12px 14px', color:'#fff', fontSize:15, outline:'none' }} />
            <button onClick={sendTyped} style={{ width:46, height:46, borderRadius:14, border:'none', background:'var(--grad)', color:'#fff', display:'grid', placeItems:'center', cursor:'pointer' }}><Icon name="send" size={20} /></button>
          </div>
        </div>
      )}
    </div>
  );
}

function CtrlBtn({ icon, label, danger, onClick }) {
  return (
    <button onClick={onClick} className="ui" style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:7, border:'none', background:'none', cursor:'pointer', paddingTop:18 }}>
      <span className="glass glass-edge" style={{ width:52, height:52, borderRadius:'50%', display:'grid', placeItems:'center',
        color: danger?'#fff':'var(--t1)', background: danger?'rgba(244,63,94,0.9)':undefined, borderColor: danger?'rgba(255,120,120,0.5)':undefined,
        boxShadow: danger?'0 6px 20px rgba(244,63,94,0.45)':undefined }}><Icon name={icon} size={22} /></span>
      <span style={{ fontSize:11.5, color:'var(--t2)', fontWeight:600 }}>{label}</span>
    </button>
  );
}

window.CallScreen = CallScreen;
