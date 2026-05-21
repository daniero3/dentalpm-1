require('dotenv').config();

const { sendMail, isMailConfigured } = require('../utils/mailer');

const requiredKeys = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS', 'SMTP_SECURE', 'SMTP_FROM'];
const missing = requiredKeys.filter(key => !process.env[key]);
const recipient = process.env.TEST_EMAIL || process.env.SMTP_USER;
const placeholderValues = ['REMPLACER_PAR_LE_MOT_DE_PASSE_SMTP', 'CHANGE_ME', 'change-me'];

async function main() {
  if (missing.length > 0) {
    console.error(`Configuration SMTP incomplete. Variables manquantes: ${missing.join(', ')}`);
    console.error('Ajoutez-les dans dental-pm-mvp/.env puis relancez: npm run mail:test');
    process.exitCode = 1;
    return;
  }

  if (placeholderValues.includes(process.env.SMTP_PASS)) {
    console.error('SMTP_PASS contient encore une valeur placeholder. Remplacez-la par le mot de passe SMTP Hostinger.');
    process.exitCode = 1;
    return;
  }

  if (!recipient) {
    console.error('TEST_EMAIL est manquant. Ajoutez TEST_EMAIL=votre_email@example.com dans .env.');
    process.exitCode = 1;
    return;
  }

  if (!isMailConfigured()) {
    console.error('SMTP non configure. Verification annulee.');
    process.exitCode = 1;
    return;
  }

  const result = await sendMail({
    to: recipient,
    subject: 'Test SMTP DentalPM',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6">
        <h2>Test SMTP DentalPM</h2>
        <p>Si vous recevez cet email, la configuration SMTP locale fonctionne.</p>
        <p>Date du test: ${new Date().toLocaleString('fr-FR')}</p>
      </div>
    `,
  });

  if (result.mocked) {
    console.error('Le test est reste en simulation. SMTP non actif.');
    process.exitCode = 1;
    return;
  }

  console.log(`Email test envoye a ${recipient}. Message ID: ${result.messageId || 'non fourni'}`);
}

main().catch(error => {
  console.error(`Echec envoi email test: ${error.message}`);
  process.exitCode = 1;
});
