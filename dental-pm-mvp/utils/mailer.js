/**
 * DentalPM — Utilitaire email (nodemailer)
 * Variables d'env requises :
 *   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS
 *   ou SMTP_FROM (expéditeur)
 */
const nodemailer = require('nodemailer');

function getTransporter() {
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    // Mode console (développement / pas de config SMTP)
    return null;
  }

  return nodemailer.createTransport({
    host,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user, pass },
  });
}

const FROM = process.env.SMTP_FROM || 'DentalPM Madagascar <noreply@dentalpm.mg>';
const FRONT = process.env.FRONTEND_URL || 'https://gracious-serenity-production-e854.up.railway.app';

/**
 * Envoyer un email — fail silencieux si pas de config SMTP
 */
async function sendMail({ to, subject, html }) {
  const transport = getTransporter();
  if (!transport) {
    console.log(`[Mailer] (no SMTP) → ${to} | ${subject}`);
    return;
  }
  try {
    await transport.sendMail({ from: FROM, to, subject, html });
    console.log(`[Mailer] ✅ Email envoyé → ${to} | ${subject}`);
  } catch (err) {
    console.error(`[Mailer] ❌ Erreur email → ${to}: ${err.message}`);
  }
}

// ── Templates ────────────────────────────────────────────────────────────────

function tplBase(content) {
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"/>
<style>
  body{font-family:'Segoe UI',Arial,sans-serif;background:#F0FDFE;margin:0;padding:0}
  .wrap{max-width:520px;margin:32px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,.08)}
  .header{background:linear-gradient(135deg,#0D7A87,#0A5F6A);padding:28px 32px;text-align:center}
  .header img{width:56px;height:56px;border-radius:50%;object-fit:cover}
  .header h1{color:#fff;font-size:20px;margin:12px 0 0;font-weight:800}
  .body{padding:28px 32px}
  .btn{display:inline-block;padding:13px 28px;background:linear-gradient(135deg,#0D7A87,#13A3B4);color:#fff;text-decoration:none;border-radius:10px;font-weight:700;font-size:15px;margin:18px 0}
  .footer{background:#F8FAFC;padding:16px 32px;text-align:center;font-size:12px;color:#94A3B8;border-top:1px solid #E2E8F0}
  .badge{display:inline-block;background:#F0FDFE;color:#0D7A87;border:1.5px solid #7DD3DA;border-radius:99px;padding:4px 14px;font-weight:700;font-size:13px}
  p{color:#475569;font-size:14px;line-height:1.75;margin:8px 0}
</style></head><body>
<div class="wrap">
  <div class="header">
    <h1>🦷 DentalPM Madagascar</h1>
  </div>
  <div class="body">${content}</div>
  <div class="footer">© ${new Date().getFullYear()} DentalPM Madagascar — Ne pas répondre à cet email.</div>
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
      ${urgent ? '⚠️ Votre essai expire aujourd\'hui !' : `Votre essai expire dans ${daysLeft} jour${daysLeft > 1 ? 's' : ''}`}
    </h2>
    <p>Bonjour <strong>${clinicName}</strong>,</p>
    <p>
      ${urgent
        ? "C'est le dernier jour de votre essai gratuit DentalPM. Après minuit, l'accès à votre cabinet sera suspendu."
        : `Votre essai gratuit de 7 jours se termine dans <strong>${daysLeft} jour${daysLeft > 1 ? 's' : ''}</strong>. Continuez à gérer votre cabinet sans interruption.`
      }
    </p>
    <div style="background:#F0FDFE;border:1.5px solid #7DD3DA;border-radius:12px;padding:14px 18px;margin:16px 0">
      <div style="display:flex;justify-content:space-between;align-items:center">
        <div>
          <div style="font-weight:700;color:#0D7A87;font-size:15px">Plan ${plan || 'PRO'} actuel</div>
          <div style="font-size:12px;color:#64748B;margin-top:3px">Activez votre abonnement pour continuer</div>
        </div>
      </div>
    </div>
    <a href="${STRIPE[plan] || STRIPE.PRO}" class="btn">💳 Activer mon abonnement avec Stripe</a>
    <p style="font-size:12px;color:#94A3B8;margin-top:8px">
      Ou connectez-vous sur <a href="${FRONT}" style="color:#0D7A87">${FRONT}</a> → Mon Abonnement
    </p>
  `);

  await sendMail({ to: email, subject, html });
}

async function sendWelcomeTrial(email, clinicName, plan, trialEndDate) {
  const endStr = new Date(trialEndDate).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
  const html = tplBase(`
    <h2 style="color:#0F172A;font-size:18px;font-weight:800;margin:0 0 16px">🎉 Bienvenue sur DentalPM, ${clinicName} !</h2>
    <p>Votre essai gratuit de <strong>7 jours</strong> est maintenant actif.</p>
    <div style="background:#F0FDFE;border:1.5px solid #7DD3DA;border-radius:12px;padding:14px 18px;margin:16px 0">
      <div style="font-weight:700;color:#0D7A87;margin-bottom:4px">Plan ${plan || 'PRO'} — Essai gratuit</div>
      <div style="font-size:13px;color:#475569">Expire le <strong>${endStr}</strong></div>
    </div>
    <p>Pendant votre essai, vous avez accès à toutes les fonctionnalités :</p>
    <ul style="color:#475569;font-size:14px;line-height:2;padding-left:20px">
      <li>Gestion des patients & rendez-vous</li>
      <li>Facturation & devis PDF</li>
      <li>Ordonnances & odontogramme</li>
      <li>Rapports financiers</li>
    </ul>
    <a href="${FRONT}/login" class="btn">→ Accéder à mon espace</a>
    <p style="font-size:12px;color:#94A3B8">À la fin de l'essai, activez votre abonnement pour continuer sans interruption.</p>
  `);

  await sendMail({ to: email, subject: '🦷 Bienvenue sur DentalPM — Essai gratuit activé', html });
}

async function sendSubscriptionActivated(email, clinicName, plan, endDate) {
  const endStr = new Date(endDate).toLocaleDateString('fr-FR', { day:'numeric', month:'long', year:'numeric' });
  const html = tplBase(`
    <h2 style="color:#0F172A;font-size:18px;font-weight:800;margin:0 0 16px">✅ Abonnement activé !</h2>
    <p>Bonjour <strong>${clinicName}</strong>,</p>
    <p>Votre abonnement <strong>Plan ${plan}</strong> est maintenant actif jusqu'au <strong>${endStr}</strong>.</p>
    <div style="background:#DCFCE7;border:1.5px solid #86EFAC;border-radius:12px;padding:14px 18px;margin:16px 0;text-align:center">
      <div style="font-size:28px">🎉</div>
      <div style="font-weight:700;color:#166534;font-size:15px;margin-top:6px">Accès complet activé</div>
    </div>
    <a href="${FRONT}" class="btn">→ Accéder à DentalPM</a>
  `);

  await sendMail({ to: email, subject: `✅ Abonnement DentalPM Plan ${plan} activé`, html });
}

module.exports = { sendMail, sendTrialReminder, sendWelcomeTrial, sendSubscriptionActivated };
