// icons.jsx — 高级感图标集（线性 + 选中态 duotone）。挂 window.Icon。
// <Icon name size stroke filled /> ; filled=true 时 tab 图标变实心 duotone。
const DUO = {
  // ── Tab Bar（line + filled 两态）──
  home: {
    line:(<path d="M3.6 10.4 12 3.8l8.4 6.6M5.6 9v9.4a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6V9" strokeLinejoin="round"/>),
    fill:(<g><path d="M3.6 10.4 12 3.8l8.4 6.6M5.6 9v9.4a1.6 1.6 0 0 0 1.6 1.6h9.6a1.6 1.6 0 0 0 1.6-1.6V9" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeLinejoin="round"/><rect x="10" y="13.5" width="4" height="6" rx="1.2" fill="currentColor" stroke="none"/></g>),
  },
  discover: {
    line:(<g><circle cx="12" cy="12" r="8.4"/><path d="M14.8 9.2 13.1 13 9.2 14.8 10.9 11z" fill="none" strokeLinejoin="round"/></g>),
    fill:(<g><circle cx="12" cy="12" r="8.4" fill="currentColor" fillOpacity=".16"/><circle cx="12" cy="12" r="8.4"/><path d="M14.8 9.2 13.1 13 9.2 14.8 10.9 11z" fill="currentColor" stroke="none"/></g>),
  },
  memory: {
    line:(<g><circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3.2 1.9" strokeLinecap="round"/></g>),
    fill:(<g><circle cx="12" cy="12" r="8.4" fill="currentColor" fillOpacity=".18"/><circle cx="12" cy="12" r="8.4"/><path d="M12 7.4V12l3.2 1.9" strokeLinecap="round"/></g>),
  },
  message: {
    line:(<path d="M4 11.2c0-3.5 3.4-6.2 8-6.2s8 2.7 8 6.2-3.4 6.2-8 6.2c-.9 0-1.8-.1-2.6-.3L5 19l1-3.1C4.8 14.7 4 13 4 11.2z" strokeLinejoin="round"/>),
    fill:(<g><path d="M4 11.2c0-3.5 3.4-6.2 8-6.2s8 2.7 8 6.2-3.4 6.2-8 6.2c-.9 0-1.8-.1-2.6-.3L5 19l1-3.1C4.8 14.7 4 13 4 11.2z" fill="currentColor" fillOpacity=".18" stroke="currentColor" strokeLinejoin="round"/><path d="M9 11h6M9.5 13.6h3.5" stroke="currentColor" strokeLinecap="round"/></g>),
  },
  person: {
    line:(<g><circle cx="12" cy="8.4" r="3.5"/><path d="M5.5 19.2c0-3.4 2.9-5.6 6.5-5.6s6.5 2.2 6.5 5.6" strokeLinecap="round"/></g>),
    fill:(<g><circle cx="12" cy="8.4" r="3.6" fill="currentColor" fillOpacity=".2" stroke="currentColor"/><path d="M5.5 19.4c0-3.6 2.9-5.8 6.5-5.8s6.5 2.2 6.5 5.8" fill="currentColor" fillOpacity=".2" stroke="currentColor" strokeLinecap="round"/></g>),
  },
};

const ICON_PATHS = {
  // 通用
  back:   <path d="M15 5l-7 7 7 7" />,
  more:   <g><circle cx="5" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.6" fill="currentColor" stroke="none"/></g>,
  close:  <path d="M6 6l12 12M18 6L6 18" />,
  check:  <path d="M5 12.5l4.5 4.5L19 7" />,
  plus:   <path d="M12 5v14M5 12h14" />,
  chevR:  <path d="M9 6l6 6-6 6" />,
  refresh:<path d="M4 12a8 8 0 0 1 13.7-5.6L20 8M20 4v4h-4M20 12a8 8 0 0 1-13.7 5.6L4 16M4 20v-4h4" />,
  send:   <path d="M5 12l15-7-7 15-2.5-5.5L5 12z" />,
  search: <g><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></g>,
  play:   <path d="M8 5.5v13l11-6.5-11-6.5z" fill="currentColor" stroke="none" strokeLinejoin="round"/>,
  expand: <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5"/>,
  globeLang: <g><circle cx="12" cy="12" r="8.4"/><path d="M3.6 12h16.8M12 3.6c2.4 2.4 2.4 14.4 0 16.8M12 3.6c-2.4 2.4-2.4 14.4 0 16.8"/></g>,
  // 对话页
  mic:    <g><rect x="9" y="3" width="6" height="12" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3" strokeLinecap="round"/></g>,
  micOff: <g><path d="M15 9V6a3 3 0 0 0-6 0v1m0 4a3 3 0 0 0 4.5 2.6" /><path d="M5 11a7 7 0 0 0 11 5.3M12 18v3M4 4l16 16" strokeLinecap="round"/></g>,
  hangup: <path d="M4.5 14.5c4-4 11-4 15 0l1-3c-5-4.5-12-4.5-17 0l1 3z" fill="currentColor" stroke="none" transform="rotate(135 12 12)" />,
  gear:   <g><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M22 12h-3M5 12H2M19 5l-2 2M7 17l-2 2M19 19l-2-2M7 7L5 5"/></g>,
  speaker:<g><path d="M5 9v6h3l5 4V5L8 9H5z"/><path d="M16 9.5a3.5 3.5 0 0 1 0 5M18.5 7a7 7 0 0 1 0 10" strokeLinecap="round"/></g>,
  swap:   <path d="M7 4 4 7l3 3M4 7h11M17 20l3-3-3-3M20 17H9" strokeLinejoin="round"/>,
  keyboard:<g><rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8" strokeLinecap="round"/></g>,
  // 状态 / 杂项
  lock:   <g><rect x="5" y="11" width="14" height="9" rx="2.5"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></g>,
  star:   <path d="M12 3.5l2.5 5.5 6 .6-4.5 4 1.3 5.9L12 16.6 6.7 19.5 8 13.6l-4.5-4 6-.6L12 3.5z" strokeLinejoin="round"/>,
  starFill:<path d="M12 3.5l2.5 5.5 6 .6-4.5 4 1.3 5.9L12 16.6 6.7 19.5 8 13.6l-4.5-4 6-.6L12 3.5z" fill="currentColor" stroke="none" strokeLinejoin="round"/>,
  sparkle:<path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7z" strokeLinejoin="round"/>,
  sparkleFill:<path d="M12 3.5l1.7 4.8 4.8 1.7-4.8 1.7L12 16.5l-1.7-4.8L5.5 10l4.8-1.7z" fill="currentColor" stroke="none" strokeLinejoin="round"/>,
  trash:  <g><path d="M5 7h14M10 7V5a1.5 1.5 0 0 1 3 0v2M6.5 7l.8 12a2 2 0 0 0 2 1.8h5.4a2 2 0 0 0 2-1.8l.8-12"/></g>,
  heart:  <path d="M12 20s-7-4.6-9.2-9C1.3 8 3 4.5 6.2 4.5c2 0 3.2 1.2 3.8 2.2C10.6 5.7 11.8 4.5 13.8 4.5 17 4.5 18.7 8 17.2 11 15 15.4 12 20 12 20z" />,
  heartFill: <path d="M12 20s-7-4.6-9.2-9C1.3 8 3 4.5 6.2 4.5c2 0 3.2 1.2 3.8 2.2C10.6 5.7 11.8 4.5 13.8 4.5 17 4.5 18.7 8 17.2 11 15 15.4 12 20 12 20z" fill="currentColor" stroke="none" />,
  // 记忆事实
  cat:    <path d="M5 9V5l3 2.5h8L19 5v4a7 7 0 0 1-14 0zM9 12h.01M15 12h.01M12 14l-1 1.5h2L12 14z" strokeLinejoin="round"/>,
  coffee: <g><path d="M5 9h12v4a5 5 0 0 1-5 5H10a5 5 0 0 1-5-5V9z"/><path d="M17 10h2a2 2 0 0 1 0 4h-2M8 4v2M11 4v2M14 4v2" strokeLinecap="round"/></g>,
  globe:  <g><circle cx="12" cy="12" r="8.5"/><path d="M3.5 12h17M12 3.5c2.5 2.5 2.5 14 0 17M12 3.5c-2.5 2.5-2.5 14 0 17"/></g>,
  pin:    <g><path d="M12 21c4-5 7-8 7-11a7 7 0 0 0-14 0c0 3 3 6 7 11z"/><circle cx="12" cy="10" r="2.5"/></g>,
  music:  <g><path d="M9 18V6l10-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="16.5" cy="16" r="2.5"/></g>,
  game:   <g><rect x="3" y="8" width="18" height="9" rx="4.5"/><path d="M8 11v3M6.5 12.5h3M15.5 12h.01M17.5 13.5h.01" strokeLinecap="round"/></g>,
  // ── Explore by vibe（实心 · 等视觉重量）──
  vibeCity: <g fill="currentColor" stroke="none"><rect x="3" y="9.5" width="5.4" height="10.5" rx="1.4"/><rect x="9.3" y="4" width="5.4" height="16" rx="1.4"/><rect x="15.6" y="11.5" width="5.4" height="8.5" rx="1.4"/><g fill="#0B0A16" opacity=".5"><circle cx="12" cy="7.6" r=".7"/><circle cx="12" cy="10.6" r=".7"/><circle cx="12" cy="13.6" r=".7"/></g></g>,
  vibeHeart:<path d="M12 20.8C5.4 16.2 3 12.5 3 9.2 3 6.5 5.1 4.4 7.7 4.4c1.6 0 3.1.8 4.3 2.2C13.2 5.2 14.7 4.4 16.3 4.4 18.9 4.4 21 6.5 21 9.2c0 3.3-2.4 7-9 11.6z" fill="currentColor" stroke="none"/>,
  vibeRun:  <path d="M13.2 2.4 5.4 12.2c-.5.6-.1 1.5.7 1.5H10l-1.4 7.4c-.1.7.8 1.1 1.3.5l7.9-9.9c.5-.6.1-1.5-.7-1.5H13l1.5-7.2c.1-.7-.8-1.1-1.3-.5z" fill="currentColor" stroke="none"/>,
  vibeWork: <g fill="currentColor" stroke="none"><path d="M9 6.8C9 5.5 10 4.5 11.3 4.5h1.4C14 4.5 15 5.5 15 6.8V8h-2v-1.2c0-.2-.1-.3-.3-.3h-1.4c-.2 0-.3.1-.3.3V8H9z"/><rect x="3" y="7.8" width="18" height="11.7" rx="2.8"/><rect x="10" y="12" width="4" height="2.6" rx="1" fill="#0B0A16" opacity=".45"/></g>,
  vibeChat: <g fill="currentColor" stroke="none"><path d="M4 10.8C4 7.4 7.6 4.8 12 4.8s8 2.6 8 6-3.6 6-8 6c-.8 0-1.6-.1-2.3-.3L5 19.6l1.2-3.4C4.8 15 4 13 4 10.8z"/><g fill="#0B0A16" opacity=".5"><circle cx="8.6" cy="10.8" r="1"/><circle cx="12" cy="10.8" r="1"/><circle cx="15.4" cy="10.8" r="1"/></g></g>,
  vibePlane:<g fill="currentColor" stroke="none"><path d="M20.6 3.5 3.3 10.7c-.7.3-.7 1.3.1 1.5l4.7 1.4 9-6.2-7 6.9 6.1 4.8c.5.4 1.2.1 1.4-.5L21.6 4.6c.2-.7-.4-1.3-1-1.1z"/></g>,
};

function Icon({ name, size = 24, stroke = 2, filled = false, style = {}, ...rest }) {
  let inner;
  if (DUO[name]) inner = filled ? DUO[name].fill : DUO[name].line;
  else inner = ICON_PATHS[name] || null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinecap="round"
      strokeLinejoin="round" style={style} {...rest}>
      {inner}
    </svg>
  );
}
window.Icon = Icon;
