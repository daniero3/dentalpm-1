const express = require('express');

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const SYSTEM_PROMPT = [
  'Tu es l’assistant conversationnel de DentalPM Madagascar, un logiciel SaaS de gestion de cabinet dentaire.',
  'Réponds en français clair, de manière concise et pratique.',
  'Tu aides les utilisateurs à comprendre et utiliser les modules: patients, rendez-vous, devis, factures, odontogramme, prescriptions, documents, stock, laboratoire, mailing, rapports, abonnement et paramètres.',
  'Tu peux guider l’utilisateur étape par étape, reformuler sa demande, proposer l’écran à ouvrir, et expliquer les notions métier d’un cabinet dentaire.',
  'Tu ne dois pas inventer de données patient, médicales, financières ou de rendez-vous. Si une information dépend du dossier réel, dis à l’utilisateur d’ouvrir le module concerné.',
  'Tu ne remplaces pas un avis clinique. Pour une décision médicale, invite à consulter le praticien responsable.',
].join('\n');

function getOutputText(response) {
  if (typeof response?.output_text === 'string' && response.output_text.trim()) {
    return response.output_text.trim();
  }

  const chunks = [];
  for (const item of response?.output || []) {
    if (item?.type !== 'message') continue;
    for (const content of item.content || []) {
      if (content?.type === 'output_text' && content.text) {
        chunks.push(content.text);
      }
    }
  }
  return chunks.join('\n').trim();
}

router.post('/chat', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const pathname = String(req.body?.pathname || '/');

  if (!message) {
    return res.status(400).json({ error: 'Message requis' });
  }

  if (!OPENAI_API_KEY) {
    return res.status(503).json({
      error: 'Assistant IA non configuré',
      code: 'OPENAI_API_KEY_MISSING',
      fallback: true,
    });
  }

  const recentHistory = history
    .filter(item => ['user', 'bot', 'assistant'].includes(item?.role) && item?.text)
    .slice(-10)
    .map(item => ({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: String(item.text).slice(0, 1500),
    }));

  const input = [
    ...recentHistory,
    {
      role: 'user',
      content: `Page actuelle: ${pathname}\nDemande: ${message}`,
    },
  ];

  try {
    const apiResponse = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        instructions: SYSTEM_PROMPT,
        input,
        max_output_tokens: 700,
      }),
    });

    const data = await apiResponse.json().catch(() => ({}));

    if (!apiResponse.ok) {
      console.error('[assistant.openai]', {
        status: apiResponse.status,
        code: data?.error?.code,
        message: data?.error?.message,
      });
      return res.status(502).json({
        error: 'Assistant IA indisponible',
        code: 'OPENAI_REQUEST_FAILED',
        fallback: true,
      });
    }

    const text = getOutputText(data);
    if (!text) {
      return res.status(502).json({
        error: 'Réponse IA vide',
        code: 'OPENAI_EMPTY_RESPONSE',
        fallback: true,
      });
    }

    return res.json({
      answer: text,
      model: data.model || OPENAI_MODEL,
      response_id: data.id,
    });
  } catch (error) {
    console.error('[assistant.chat]', error.message);
    return res.status(502).json({
      error: 'Assistant IA indisponible',
      code: 'OPENAI_NETWORK_ERROR',
      fallback: true,
    });
  }
});

module.exports = router;
