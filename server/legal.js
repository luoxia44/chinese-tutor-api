// legal.js — Privacy Policy & Terms of Service pages served at /privacy and /terms.
// Required for App Store review (the app links here). Plain, standard policies for an
// AI voice language-learning app. Review with counsel before relying on them legally.

const APP = 'AI Chinese Tutor';
const CONTACT = 'leo449210@gmail.com';
const UPDATED = 'June 2026';

const shell = (title, body) => `<!doctype html>
<html lang="en"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title} · ${APP}</title>
<style>
  :root { color-scheme: dark; }
  body { margin:0; background:#0C0916; color:#E7E3F2; font:16px/1.65 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif; }
  .wrap { max-width:720px; margin:0 auto; padding:48px 22px 80px; }
  h1 { font-size:28px; letter-spacing:-.4px; margin:0 0 6px; }
  .upd { color:#8A82A6; font-size:13px; margin-bottom:32px; }
  h2 { font-size:18px; margin:30px 0 8px; color:#C9C2E0; }
  p, li { color:#B7B0CC; }
  a { color:#C084FC; }
  .brand { display:inline-block; background:linear-gradient(135deg,#A855F7,#EC4899); -webkit-background-clip:text; background-clip:text; color:transparent; font-weight:800; }
</style></head>
<body><div class="wrap">
<p class="brand">${APP}</p>
<h1>${title}</h1>
<p class="upd">Last updated: ${UPDATED}</p>
${body}
<h2>Contact</h2>
<p>Questions? Email <a href="mailto:${CONTACT}">${CONTACT}</a>.</p>
</div></body></html>`;

export const privacyHtml = () => shell('Privacy Policy', `
<p>${APP} ("we", "us") helps you practice spoken Chinese with AI characters. This policy explains what we collect and how we use it.</p>

<h2>Information we collect</h2>
<ul>
<li><b>Voice and conversation content.</b> When you make a call, your microphone audio and the resulting text are processed in real time to generate the character's spoken replies.</li>
<li><b>Learning data.</b> Your chosen display name (optional), self-reported level, interests, and short conversation summaries used to personalize future chats ("memory").</li>
<li><b>Usage data.</b> Basic app usage such as call duration and which characters you talk to, used to show your stats and enforce the free-trial limit.</li>
</ul>

<h2>How we use it</h2>
<ul>
<li>To provide the core service: real-time speech understanding and voice responses.</li>
<li>To personalize characters' memory of your past conversations.</li>
<li>To operate subscriptions and the free trial.</li>
</ul>

<h2>Third-party processing</h2>
<p>To generate speech and responses, audio and text are sent to our AI model provider (Alibaba Cloud Model Studio / DashScope) for processing. Subscriptions are handled by Apple. We do not sell your personal data.</p>

<h2>Data storage & retention</h2>
<p>Learning preferences and conversation summaries are stored to power the memory feature. You can clear all stored memories at any time in Settings → Clear learning memory. Uninstalling the app removes locally stored data on your device.</p>

<h2>Your choices</h2>
<ul>
<li>Clear your memories anytime in the app's Settings.</li>
<li>Decline microphone permission (voice features will be unavailable; you can type instead).</li>
<li>Request deletion of any server-side data by emailing us.</li>
</ul>

<h2>Children</h2>
<p>${APP} is not directed to children under 13 (or the minimum age in your region). We do not knowingly collect data from children.</p>

<h2>Changes</h2>
<p>We may update this policy; material changes will be reflected by the "Last updated" date above.</p>
`);

export const termsHtml = () => shell('Terms of Service', `
<p>By using ${APP}, you agree to these terms.</p>

<h2>The service</h2>
<p>${APP} provides AI-powered spoken-Chinese practice with fictional characters. Characters are AI and may produce imperfect or inaccurate language; the app is for language practice, not professional translation, advice, or instruction.</p>

<h2>Free trial & subscriptions</h2>
<ul>
<li>New users get a limited amount of free call time. After it is used, continued calling requires a subscription.</li>
<li>Subscriptions (weekly, monthly, or yearly) are billed through your Apple account. Payment is charged at confirmation of purchase.</li>
<li>Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. Manage or cancel anytime in your Apple ID account settings.</li>
<li>Prices are shown in the app and may vary by region.</li>
</ul>

<h2>Acceptable use</h2>
<p>Don't misuse the service, attempt to disrupt it, or use it for unlawful purposes. Conversations are for personal language practice.</p>

<h2>Disclaimer</h2>
<p>The service is provided "as is" without warranties. AI responses may be inaccurate. To the extent permitted by law, we are not liable for indirect or incidental damages arising from use of the app.</p>

<h2>Changes</h2>
<p>We may update these terms; continued use after changes constitutes acceptance.</p>
`);

// App Store 要求的技术支持页（App Information → Support URL 指向 /support）
export const supportHtml = () => shell('Support', `
<p>Need help with ${APP}? We're happy to assist.</p>

<h2>Common questions</h2>
<ul>
<li><b>Calls won't connect / no sound.</b> Check that the app has microphone permission (Settings → ${APP} → Microphone) and that you have a stable internet connection, then try again.</li>
<li><b>My free minutes ran out.</b> New users get 5 minutes of free call time. Subscribe in the app for unlimited practice.</li>
<li><b>Manage or cancel subscription.</b> Subscriptions are handled by Apple: iPhone Settings → your name → Subscriptions.</li>
<li><b>Restore purchases.</b> In the app: Me → Settings → Restore purchases.</li>
<li><b>Clear my data.</b> In the app: Me → Settings → Clear learning memory. This erases what characters remember about you.</li>
</ul>

<h2>Contact us</h2>
<p>Email <a href="mailto:${CONTACT}">${CONTACT}</a> and we'll get back to you as soon as we can. Please include your iOS version and a short description of the problem.</p>
`);
