// portrait.jsx — 真立绘渲染（表情分图 + 占位回退）。挂 window.Portrait, window.Avatar。
// 取图顺序: portraits/<id>-<expr>.jpg → portraits/<id>.jpg → 渐变占位。
// variant: 'card'|'full'|'avatar'|'thumb'。expression: smile|listening|thinking|attentive|happy
const PORTRAIT_DIR = '/avatars/';  // 指向后端已生成的高清立绘 avatars/<id>.jpg
const EXPR_SUFFIX = { listening:'listening', thinking:'thinking', attentive:'attentive', happy:'happy', cheer:'happy', confused:'thinking', neutral:'', smile:'' };

function srcChain(comp, expression) {
  const suf = EXPR_SUFFIX[expression] || '';
  const list = [];
  if (suf) list.push(PORTRAIT_DIR + comp.id + '-' + suf + '.jpg');
  list.push(PORTRAIT_DIR + comp.id + '.jpg');
  return list;
}

function PortraitImg({ comp, expression, pos, filter }) {
  const chain = srcChain(comp, expression);
  const [i, setI] = React.useState(0);
  React.useEffect(()=>{ setI(0); }, [comp.id, expression]);
  const dead = i >= chain.length;
  if (dead) return null;
  return (
    <img src={chain[i]} alt={comp.name} draggable="false"
      onError={()=>setI(i+1)}
      style={{ position:'absolute', inset:0, width:'100%', height:'100%',
        objectFit:'cover', objectPosition:pos, userSelect:'none', pointerEvents:'none', filter }} />
  );
}

function Portrait({ comp, variant = 'card', expression = 'smile', mask = true, glow = false, focus, style = {} }) {
  const [from, to] = comp.tint;
  const isAvatar = variant === 'avatar' || variant === 'thumb';
  const round = variant === 'avatar' ? '50%' : 'inherit';
  const exFocus = { neutral:'center 22%', smile:'center 26%', thinking:'center 20%', attentive:'center 22%', listening:'center 24%', happy:'center 30%', cheer:'center 30%', confused:'center 20%' };
  const pos = focus || exFocus[expression] || 'center 24%';
  const filter = expression==='happy'||expression==='cheer' ? 'saturate(1.08) brightness(1.04)' : expression==='thinking'||expression==='confused' ? 'brightness(0.97)' : 'none';
  return (
    <div style={{ position:'absolute', inset:0, overflow:'hidden', borderRadius:round,
      background:`linear-gradient(155deg, ${from}, ${to})`, ...style }}>
      <PortraitImg comp={comp} expression={expression} pos={pos} filter={filter} />
      {mask && (
        <div style={{ position:'absolute', left:0, right:0, bottom:0, height: variant==='full'?'58%':'66%',
          background:`linear-gradient(180deg, transparent, rgba(8,7,16,0.10) 26%, rgba(8,7,16,0.82) 80%, var(--bg-deepest))` }} />
      )}
      {glow && (
        <div style={{ position:'absolute', inset:0, borderRadius:round,
          boxShadow:`inset 0 0 70px ${from}66`, pointerEvents:'none' }} />
      )}
    </div>
  );
}

function Avatar({ comp, size = 44, ring = true, style = {} }) {
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', position:'relative',
      flexShrink:0, padding: ring ? 2 : 0, boxSizing:'border-box',
      background: ring ? `conic-gradient(from 210deg, ${comp.tint[0]}, ${comp.tint[1]}, ${comp.tint[0]})` : 'transparent',
      ...style }}>
      <div style={{ position:'relative', width:'100%', height:'100%', borderRadius:'50%', overflow:'hidden',
        boxShadow: ring ? '0 0 0 2px var(--bg-base)' : 'none' }}>
        <Portrait comp={comp} variant="avatar" mask={false} focus="center 22%" />
      </div>
    </div>
  );
}

window.Portrait = Portrait;
window.Avatar = Avatar;
