// api.js — 把设计 UI 接到真实后端（会话/对话/真音色/记忆）+ 浏览器语音控制器。
// 挂 window.API 和 window.Voice。纯 JS（先于 babel 脚本执行）。
(function () {
  const USER = 'demo-user';
  const j = (r) => r.json();
  const post = (url, body) =>
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(j);

  window.API = {
    userId: USER,
    config: () => fetch('/api/config').then(j),
    startSession: (companionId) => post('/api/session/start', { userId: USER, companionId }),
    chat: (companionId, history) => post('/api/chat', { userId: USER, companionId, history }),
    // 流式对话：onSentence({text,audio,mime}) 每句，onDone(reply) 结束
    chatStream: async (companionId, history, { onSentence, onDone, onError, signal } = {}) => {
      let res;
      try { res = await fetch('/api/chat-stream', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: USER, companionId, history }), signal }); }
      catch (e) { onError && onError(e); return; }
      if (!res.ok || !res.body) { onError && onError(new Error('stream ' + res.status)); return; }
      const reader = res.body.getReader(); const dec = new TextDecoder(); let buf = '';
      while (true) {
        let r; try { r = await reader.read(); } catch (e) { break; }
        if (r.done) break;
        buf += dec.decode(r.value, { stream: true });
        let i;
        while ((i = buf.indexOf('\n\n')) >= 0) {
          const line = buf.slice(0, i).trim(); buf = buf.slice(i + 2);
          if (!line.startsWith('data:')) continue;
          const d = line.slice(5).trim(); if (!d) continue;
          let j; try { j = JSON.parse(d); } catch { continue; }
          if (j.type === 'sentence') onSentence && onSentence(j);
          else if (j.type === 'done') onDone && onDone(j.reply);
          else if (j.type === 'error') onError && onError(new Error(j.detail));
        }
      }
    },
    endSession: (payload) => post('/api/session/end', { userId: USER, ...payload }),
    memory: () => fetch('/api/memory?userId=' + USER).then(j),
    deleteFact: (factText) => post('/api/memory/delete-fact', { userId: USER, factText }),
    forgetCompanion: (companionId) => post('/api/memory/forget-companion', { userId: USER, companionId }),
    forgetAll: () => post('/api/memory/forget-all', { userId: USER }),
  };

  // —— 语音控制器（连续通话用）——
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  let rec = null, audioEl = null;

  window.Voice = {
    recognitionSupported: !!SR,
    ttsSupported: 'speechSynthesis' in window,

    startListening({ onResult, onEnd, onError } = {}) {
      if (!SR) { onError && onError({ error: 'unsupported' }); return; }
      this.stopSpeaking();
      const r = new SR();
      r.lang = 'zh-CN'; r.interimResults = false; r.maxAlternatives = 1;
      r.onresult = (e) => onResult && onResult(e.results[0][0].transcript);
      r.onerror = (e) => onError && onError(e);
      r.onend = () => { rec = null; onEnd && onEnd(); };
      rec = r;
      try { r.start(); } catch (e) { onError && onError({ error: 'start-failed' }); }
    },
    stopListening() { try { rec && rec.stop(); } catch (e) {} rec = null; },
    get isListening() { return !!rec; },

    // 播放后端返回的真音色（base64），否则浏览器 zh-CN 合成兜底
    speak(text, audio, { onStart, onEnd, rate = 1 } = {}) {
      onStart && onStart();
      if (audio && audio.audioBase64) {
        return new Promise((res) => {
          const a = new Audio('data:' + (audio.mime || 'audio/mpeg') + ';base64,' + audio.audioBase64);
          audioEl = a;
          a.onended = () => { onEnd && onEnd(); res(); };
          a.onerror = () => { onEnd && onEnd(); res(); };
          a.play().catch(() => { onEnd && onEnd(); res(); });
        });
      }
      if (!this.ttsSupported) { onEnd && onEnd(); return Promise.resolve(); }
      return new Promise((res) => {
        let done = false; const fin = () => { if (done) return; done = true; onEnd && onEnd(); res(); };
        const u = new SpeechSynthesisUtterance(text);
        u.lang = 'zh-CN'; u.rate = rate;
        const zh = speechSynthesis.getVoices().find((v) => /zh|Chinese/i.test(v.lang));
        if (zh) u.voice = zh;
        u.onend = fin; u.onerror = fin;
        setTimeout(fin, Math.min(15000, 1200 + (text.length / rate) * 220)); // watchdog
        speechSynthesis.speak(u);
      });
    },
    stopSpeaking() {
      if (this.ttsSupported) speechSynthesis.cancel();
      if (audioEl) { try { audioEl.pause(); } catch (e) {} audioEl = null; }
    },

    // —— 流式音频队列（逐句依次播放）——
    _q: [], _playing: false, _drainCbs: [],
    enqueue(b64, mime) { if (!b64) return; this._q.push({ b64, mime }); this._kick(); },
    async _kick() {
      if (this._playing) return; this._playing = true;
      while (this._q.length) { const { b64, mime } = this._q.shift(); await this._playB64(b64, mime); }
      this._playing = false; const cbs = this._drainCbs; this._drainCbs = []; cbs.forEach((f) => f());
    },
    clearQueue() { this._q = []; this.stopSpeaking(); this._playing = false; const cbs = this._drainCbs; this._drainCbs = []; cbs.forEach((f) => f()); },
    whenDrained() { return (!this._playing && !this._q.length) ? Promise.resolve() : new Promise((r) => this._drainCbs.push(r)); },
    _playB64(b64, mime) {
      return new Promise((res) => {
        const a = new Audio('data:' + (mime || 'audio/mpeg') + ';base64,' + b64);
        audioEl = a; a.onended = res; a.onerror = res; a.play().catch(res);
      });
    },
  };
})();
