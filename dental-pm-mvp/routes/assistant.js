const express = require('express');

const router = express.Router();

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

const SYSTEM_PROMPT = [
  'Tu es l’assistant conversationnel de DentalPM Madagascar, un logiciel SaaS de gestion de cabinet dentaire.',
  'L’utilisateur peut te parler librement comme dans ChatGPT: questions ouvertes, demandes de reformulation, brouillons de messages, explications métier, aide pas à pas ou navigation dans l’application.',
  'Réponds en français clair, naturel et pratique. Garde un ton professionnel, humain et direct.',
  'Si la demande est vague, commence par une réponse utile puis pose au maximum une question de clarification.',
  'Tu aides les utilisateurs à comprendre et utiliser les modules: patients, rendez-vous, devis, factures, odontogramme, prescriptions, documents, stock, laboratoire, mailing, rapports, abonnement et paramètres.',
  'Tu peux guider l’utilisateur étape par étape, reformuler sa demande, proposer l’écran à ouvrir, rédiger des modèles de SMS ou email, expliquer les notions métier d’un cabinet dentaire, et aider à structurer le travail administratif.',
  'Tu ne dois pas inventer de données patient, médicales, financières ou de rendez-vous. Si une information dépend du dossier réel ou d’une action dans la base de données, explique que l’utilisateur doit ouvrir le module concerné ou vérifier le dossier.',
  'Tu ne remplaces pas un avis clinique. Pour une décision médicale, invite à consulter le praticien responsable.',
  'Ne promets pas d’avoir créé, modifié, supprimé ou envoyé une donnée si l’application ne t’a pas fourni d’outil explicite pour le faire.',
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

function mapOpenAIError(error, status) {
  const code = error?.code || 'OPENAI_REQUEST_FAILED';

  if (code === 'insufficient_quota') {
    return {
      status: 402,
      code: 'OPENAI_INSUFFICIENT_QUOTA',
      error: 'Quota OpenAI insuffisant',
      message: 'Le crédit ou quota OpenAI du compte est épuisé. Ajoutez du crédit, activez la facturation ou utilisez une autre clé API.',
    };
  }

  if (status === 429 || code === 'rate_limit_exceeded') {
    return {
      status: 429,
      code: 'OPENAI_RATE_LIMITED',
      error: 'Assistant IA temporairement limité',
      message: 'OpenAI limite temporairement les requêtes. Réessayez dans quelques instants.',
    };
  }

  if (status === 401 || code === 'invalid_api_key') {
    return {
      status: 503,
      code: 'OPENAI_API_KEY_INVALID',
      error: 'Clé OpenAI invalide',
      message: 'La clé OpenAI configurée côté serveur est invalide ou révoquée.',
    };
  }

  return {
    status: 502,
    code: 'OPENAI_REQUEST_FAILED',
    error: 'Assistant IA indisponible',
    message: 'OpenAI a refusé la requête. Vérifiez la configuration du modèle et du compte.',
  };
}

router.post('/chat', async (req, res) => {
  const message = String(req.body?.message || '').trim();
  const history = Array.isArray(req.body?.history) ? req.body.history : [];
  const pathname = String(req.body?.pathname || '/');
  const contextPage = String(req.body?.context?.page || '').trim();

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
    .slice(-16)
    .map(item => ({
      role: item.role === 'user' ? 'user' : 'assistant',
      content: String(item.text).slice(0, 1500),
    }));

  const input = [
    ...recentHistory,
    {
      role: 'user',
      content: `Page actuelle: ${contextPage || pathname}\nChemin: ${pathname}\nDemande: ${message}`,
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
        max_output_tokens: 900,
      }),
    });

    const data = await apiResponse.json().catch(() => ({}));

    if (!apiResponse.ok) {
      const mappedError = mapOpenAIError(data?.error, apiResponse.status);
      console.error('[assistant.openai]', {
        status: apiResponse.status,
        code: data?.error?.code,
        message: data?.error?.message,
      });
      return res.status(mappedError.status).json({
        error: mappedError.error,
        code: mappedError.code,
        message: mappedError.message,
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
