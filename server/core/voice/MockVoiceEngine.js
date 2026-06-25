// MockVoiceEngine — returns no server audio; signals the client to speak via the browser's
// SpeechSynthesis (zh-CN). Lets the voice loop run with zero keys/cost.
export class MockVoiceEngine {
  constructor() {
    this.name = 'mock(browser-tts)';
    this.streams = false;
  }
  async synthesize(_text, _voiceId, _opts = {}) {
    return null; // null → frontend falls back to window.speechSynthesis
  }
}
