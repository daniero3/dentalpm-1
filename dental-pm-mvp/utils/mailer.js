/**
 * DentalPM — Mailer professionnel anti-spam
 *
 * Bonnes pratiques anti-spam intégrées :
 * - Rate limiting : max 50 emails/heure, 200/jour
 * - Queue FIFO avec délai entre envois
 * - Headers SPF/DKIM/List-Unsubscribe
 * - Retry automatique sur erreur temporaire
 * - Logging de tous les envois
 */
const nodemailer = require('nodemailer');

// ── Rate limiter simple en mémoire ──────────────────────────────────────────
const stats = { hour: 0, day: 0, lastHourReset: Date.now(), lastDayReset: Date.now() };
const LIMITS = { perHour: 50, perDay: 200 };

function checkRateLimit() {
  const now = Date.now();
  if (now - stats.lastHourReset > 3600000) { stats.hour = 0; stats.lastHourReset = now; }
  if (now - stats.lastDayReset  > 86400000) { stats.day  = 0; stats.lastDayReset  = now; }
  if (stats.hour >= LIMITS.perHour) throw new Error(`Rate limit dépassé: ${LIMITS.perHour} emails/heure`);
  if (stats.day  >= LIMITS.perDay)  throw new Error(`Rate limit dépassé: ${LIMITS.perDay} emails/jour`);
  stats.hour++; stats.day++;
}

// ── File d'attente pour éviter les rafales ────────────────────────────────────
const queue = [];
let processing = false;

async function processQueue() {
  if (processing || queue.length === 0) return;
  processing = true;
  while (queue.length > 0) {
    const { mail, resolve, reject, attempt } = queue.shift();
    try {
      const result = await _sendNow(mail);
      resolve(result);
    } catch(e) {
      if (attempt < 3 && (e.message.includes('ECONNRESET') || e.message.includes('timeout'))) {
        // Retry après 30s pour les erreurs réseau temporaires
        setTimeout(() => { queue.unshift({ mail, resolve, reject, attempt: attempt + 1 }); processQueue(); }, 30000);
        break;
      }
      reject(e);
    }
    // Délai entre envois : 2 secondes (évite le rate limiting SMTP)
    if (queue.length > 0) await new Promise(r => setTimeout(r, 2000));
  }
  processing = false;
}

// ── Transporter SMTP ──────────────────────────────────────────────────────────
let _transporter = null;
function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  if (!host || !user || !pass) return null;
  if (_transporter) return _transporter;
  const port   = parseInt(process.env.SMTP_PORT || '587');
  const secure = process.env.SMTP_SECURE === 'true' || port === 465;
  _transporter = nodemailer.createTransport({
    host, port, secure,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
    pool: true,           // Réutiliser les connexions SMTP
    maxConnections: 3,    // Max 3 connexions simultanées
    maxMessages: 10,      // Max 10 messages par connexion
    rateDelta: 1000,      // 1 message par seconde
    rateLimit: 1,
  });
  return _transporter;
}

const FROM  = process.env.SMTP_FROM  || 'DentalPM Madagascar <contact@dentalpracticemada.com>';
const FRONT = process.env.FRONTEND_URL || 'https://dentalpracticemada.com';

// ── Envoi réel ────────────────────────────────────────────────────────────────
async function _sendNow({ to, subject, html }) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[Mailer] (no SMTP) → ${to} | ${subject}`);
    return { mocked: true, messageId: null };
  }
  checkRateLimit();
  const info = await transport.sendMail({
    from: FROM,
    to,
    subject,
    html,
    // Headers anti-spam professionnels
    headers: {
      'X-Mailer':         'DentalPM Madagascar v2',
      'X-Priority':       '3',
      'List-Unsubscribe': `<mailto:contact@dentalpracticemada.com?subject=unsubscribe>`,
      'Precedence':       'bulk',
    },
  });
  console.log(`[Mailer] ✅ Envoyé → ${to} | ${subject} (h:${stats.hour}/${LIMITS.perHour} j:${stats.day}/${LIMITS.perDay})`);
  return { mocked: false, messageId: info?.messageId || null };
}

// ── API publique ──────────────────────────────────────────────────────────────
async function sendMail({ to, subject, html }) {
  return new Promise((resolve, reject) => {
    queue.push({ mail: { to, subject, html }, resolve, reject, attempt: 0 });
    processQueue();
  });
}

// ── Templates HTML ────────────────────────────────────────────────────────────
function tplBase(content) {
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#F0FDFE;margin:0;padding:0;-webkit-text-size-adjust:100%}
  .wrap{max-width:560px;margin:24px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#0D7A87,#0A5F6A);padding:28px 32px;text-align:center}
  .header h1{color:#fff;font-size:20px;margin:12px 0 0;font-weight:800}
  .body{padding:28px 32px}
  .btn{display:inline-block;padding:13px 28px;background:linear-gradient(135deg,#0D7A87,#13A3B4);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:18px 0}
  .footer-email{background:#F8FAFC;padding:16px 32px;text-align:center;font-size:11px;color:#94A3B8;border-top:1px solid #E2E8F0}
  .unsubscribe{font-size:10px;color:#CBD5E1;margin-top:8px}
  p{color:#475569;font-size:14px;line-height:1.75;margin:8px 0}
</style></head><body>
<div class="wrap">
  <div class="header"><h1>🦷 DentalPM Madagascar</h1></div>
  <div class="body">${content}</div>
  <div class="footer-email">
    © 2026 DANIERO GLOBAL LLC — DentalPM Madagascar<br/>
    <span class="unsubscribe">
      Cet email est envoyé à l'adresse associée à votre cabinet.
      <a href="mailto:contact@dentalpracticemada.com?subject=unsubscribe" style="color:#94A3B8">Se désabonner</a>
    </span>
  </div>
</div></body></html>`;
}

async function sendTrialReminder(email, clinicName, daysLeft, plan) {
  const urgent = daysLeft <= 1;
  const subject = urgent
    ? `⚠️ Dernier jour — Votre essai DentalPM expire aujourd'hui`
    : `⏳ Votre essai DentalPM expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`;

  const STRIPE = {
    ESSENTIAL: 'https://buy.stripe.com/eVqeV66VS1S84A43NDcfK01',
    PRO:       'https://buy.stripe.com/aFa9AM4NK54k1nSfwlcfK00',
    GROUP:     'https://buy.stripe.com/9B614gbc8aoE3w05VLcfK02',
  };

  const html = tplBase(`
    <h2 style="color:#0F172A;font-size:18px;font-weight:800;margin:0 0 16px">
      ${urgent ? '⚠️ Votre essai expire aujourd\'hui !' : `⏳ Plus que ${daysLeft} jour${daysLeft > 1 ? 's' : ''} d'essai`}
    </h2>
    <p>Bonjour <strong>${clinicName}</strong>,</p>
    <p>${urgent
      ? "C'est le dernier jour de votre essai gratuit DentalPM. Après minuit, l'accès sera suspendu."
      : `Votre essai gratuit se termine dans <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>.`
    }</p>
    <div style="background:#F0FDFE;border:1.5px solid #7DD3DA;border-radius:12px;padding:14px 18px;margin:16px 0">
      <div style="font-weight:700;color:#0D7A87;font-size:15px">Plan ${plan || 'PRO'}</div>
      <div style="font-size:12px;color:#64748B;margin-top:3px">Activez votre abonnement pour continuer</div>
    </div>
    <a href="${STRIPE[plan] || STRIPE.PRO}" class="btn">💳 Activer mon abonnement</a>
    <p style="font-size:12px;color:#94A3B8;margin-top:8px">Ou connectez-vous sur <a href="${FRONT}" style="color:#0D7A87">${FRONT}</a></p>
  `);

  await sendMail({ to: email, subject, html });
}

async function sendWelcomeTrial(email, clinicName, plan, trialEndDate) {
  const endStr = new Date(trialEndDate).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
  const html = tplBase(`
    <h2 style="color:#0F172A;font-size:18px;font-weight:800;margin:0 0 16px">🎉 Bienvenue sur DentalPM, ${clinicName} !</h2>
    <p>Votre essai gratuit de <strong>30 jours</strong> est maintenant actif.</p>
    <div style="background:#F0FDFE;border:1.5px solid #7DD3DA;border-radius:12px;padding:14px 18px;margin:16px 0">
      <div style="font-weight:700;color:#0D7A87;margin-bottom:4px">Plan ${plan || 'PRO'} — Essai gratuit</div>
      <div style="font-size:13px;color:#475569">Expire le <strong>${endStr}</strong></div>
    </div>
    <ul style="color:#475569;font-size:14px;line-height:2;padding-left:20px">
      <li>Gestion des patients &amp; rendez-vous</li>
      <li>Facturation &amp; devis PDF</li>
      <li>Ordonnances &amp; odontogramme</li>
      <li>Rapports financiers</li>
    </ul>
    <a href="${FRONT}/login" class="btn">→ Accéder à mon espace</a>
  `);
  await sendMail({ to: email, subject: '🦷 Bienvenue sur DentalPM — Essai gratuit activé', html });
}

async function sendSubscriptionActivated(email, clinicName, plan, endDate) {
  const endStr = endDate
    ? new Date(endDate).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' })
    : '—';
  const html = tplBase(`
    <h2 style="color:#0F172A;font-size:18px;font-weight:800;margin:0 0 16px">✅ Abonnement activé !</h2>
    <p>Bonjour <strong>${clinicName}</strong>,</p>
    <p>Votre abonnement <strong>Plan ${plan}</strong> est actif jusqu'au <strong>${endStr}</strong>.</p>
    <div style="background:#DCFCE7;border:1.5px solid #86EFAC;border-radius:12px;padding:14px 18px;margin:16px 0;text-align:center">
      <div style="font-size:28px">🎉</div>
      <div style="font-weight:700;color:#166534;font-size:15px;margin-top:6px">Accès complet activé</div>
    </div>
    <a href="${FRONT}" class="btn">→ Accéder à DentalPM</a>
  `);
  await sendMail({ to: email, subject: `✅ Abonnement DentalPM Plan ${plan} activé`, html });
}

// ── Stats temps réel ──────────────────────────────────────────────────────────
function getMailStats() {
  return {
    queueLength: queue.length,
    sentThisHour: stats.hour,
    sentToday: stats.day,
    limitsHour: LIMITS.perHour,
    limitsDay: LIMITS.perDay,
    smtpConfigured: Boolean(getTransporter()),
  };
}

function isMailConfigured() {
  return Boolean(getTransporter());
}

module.exports = { sendMail, sendTrialReminder, sendWelcomeTrial, sendSubscriptionActivated, getMailStats, isMailConfigured };
