import React, { useEffect, useMemo, useState } from 'react';
import {
  ExternalLink, Link2, Megaphone, Newspaper, PlayCircle,
  Plus, Tag, Upload, Video, X
} from 'lucide-react';

const TYPE_META = {
  offer: { label: 'Offre', icon: Tag, bg: '#FFF7ED', color: '#C2410C' },
  article: { label: 'Article', icon: Newspaper, bg: '#EFF6FF', color: '#1D4ED8' },
  video: { label: 'Vidéo', icon: Video, bg: '#F0FDFE', color: '#0D7A87' },
};

const emptyForm = {
  title: '',
  partner: '',
  type: 'offer',
  description: '',
  videoUrl: '',
  ctaLabel: '',
  ctaUrl: '',
};

const safeLoad = (key) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : [];
  } catch {
    return [];
  }
};

const safeSave = (key, ads) => {
  try {
    localStorage.setItem(key, JSON.stringify(ads.filter(ad => !ad.localOnly)));
  } catch {
    // Ignore localStorage quota or privacy mode errors.
  }
};

const VideoFrame = ({ ad, accent }) => {
  if (ad.videoUrl) {
    return (
      <video
        aria-label={ad.title ? `Vidéo ${ad.title}` : 'Vidéo publicitaire'}
        src={ad.videoUrl}
        controls
        preload="metadata"
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          borderRadius: 13,
          background: '#0F172A',
          objectFit: 'cover',
          display: 'block',
        }}
      />
    );
  }

  return (
    <div style={{
      aspectRatio: '16 / 9',
      borderRadius: 13,
      background: `linear-gradient(135deg, ${accent}18, #0F172A)`,
      border: `1px solid ${accent}33`,
      display: 'grid',
      placeItems: 'center',
      color: '#fff',
      position: 'relative',
      overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute',
        inset: 0,
        backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(255,255,255,.18), transparent 32%), linear-gradient(120deg, rgba(255,255,255,.06), transparent 44%)',
      }}/>
      <div style={{ position: 'relative', textAlign: 'center' }}>
        <PlayCircle size={42} style={{ marginBottom: 8 }} />
        <div style={{ fontSize: 12, fontWeight: 800 }}>Vidéo exemple</div>
        <div style={{ fontSize: 11, opacity: .74 }}>Remplacez par une vidéo partenaire</div>
      </div>
    </div>
  );
};

const PartnerAdCard = ({ ad, accent }) => {
  const meta = TYPE_META[ad.type] || TYPE_META.offer;
  const Icon = meta.icon;

  return (
    <article style={{
      background: '#fff',
      border: '1px solid #E2E8F0',
      borderRadius: 18,
      padding: 14,
      boxShadow: '0 1px 4px rgba(15,23,42,.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: 12,
    }}>
      <VideoFrame ad={ad} accent={accent} />
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            background: meta.bg,
            color: meta.color,
            borderRadius: 999,
            padding: '3px 9px',
            fontSize: 11,
            fontWeight: 800,
          }}>
            <Icon size={11} />{meta.label}
          </span>
          {ad.localOnly && (
            <span style={{ fontSize: 10, color: '#92400E', background: '#FEF3C7', borderRadius: 999, padding: '3px 8px', fontWeight: 800 }}>
              Prévisualisation locale
            </span>
          )}
        </div>
        <h3 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 15, color: '#0F172A', margin: '0 0 4px' }}>{ad.title}</h3>
        <div style={{ fontSize: 12, color: accent, fontWeight: 800, marginBottom: 6 }}>{ad.partner}</div>
        <p style={{ fontSize: 12, color: '#475569', lineHeight: 1.55, margin: 0 }}>{ad.description}</p>
      </div>
      {ad.ctaUrl && (
        <a href={ad.ctaUrl} target="_blank" rel="noreferrer" style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          padding: '9px 12px',
          borderRadius: 10,
          background: accent,
          color: '#fff',
          textDecoration: 'none',
          fontSize: 12,
          fontWeight: 800,
          marginTop: 'auto',
        }}>
          {ad.ctaLabel || 'Voir l’offre'} <ExternalLink size={12} />
        </a>
      )}
    </article>
  );
};

const EMPTY_EXAMPLES = [];

export default function PartnerAds({
  title,
  description,
  storageKey,
  examples = EMPTY_EXAMPLES,
  accent = '#0D7A87',
  audienceLabel = 'partenaire',
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [customAds, setCustomAds] = useState(() => safeLoad(storageKey));
  const [filePreview, setFilePreview] = useState('');

  const ads = useMemo(() => [...examples, ...customAds], [examples, customAds]);

  useEffect(() => {
    safeSave(storageKey, customAds);
  }, [customAds, storageKey]);

  useEffect(() => () => {
    if (filePreview) URL.revokeObjectURL(filePreview);
  }, [filePreview]);

  const update = (name, value) => setForm(prev => ({ ...prev, [name]: value }));

  const onFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (filePreview) URL.revokeObjectURL(filePreview);
    const previewUrl = URL.createObjectURL(file);
    setFilePreview(previewUrl);
    update('videoUrl', previewUrl);
  };

  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.partner.trim()) return;
    const nextAd = {
      ...form,
      id: `custom-${Date.now()}`,
      title: form.title.trim(),
      partner: form.partner.trim(),
      description: form.description.trim() || 'Nouvelle publicité partenaire.',
      localOnly: Boolean(filePreview),
    };
    setCustomAds(prev => [nextAd, ...prev]);
    setForm(emptyForm);
    setFilePreview('');
    setShowForm(false);
  };

  return (
    <section style={{ marginTop: 22 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 12, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, color: '#94A3B8', fontWeight: 800, textTransform: 'uppercase', letterSpacing: 1.4, marginBottom: 5 }}>
            <Megaphone size={13} color={accent} />
            Publicités partenaires
          </div>
          <h2 style={{ fontFamily: 'Plus Jakarta Sans', fontWeight: 800, fontSize: 17, color: '#0F172A', margin: 0 }}>{title}</h2>
          <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0', maxWidth: 680, lineHeight: 1.55 }}>{description}</p>
        </div>
        <button type="button" onClick={() => setShowForm(prev => !prev)} style={{
          padding: '9px 14px',
          borderRadius: 11,
          border: 0,
          background: accent,
          color: '#fff',
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 800,
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
        }}>
          {showForm ? <X size={14} /> : <Plus size={14} />}
          {showForm ? 'Fermer' : 'Ajouter une publicité'}
        </button>
      </div>

      {showForm && (
        <form onSubmit={submit} style={{
          background: '#fff',
          border: '1px solid #E2E8F0',
          borderRadius: 16,
          padding: 16,
          marginBottom: 14,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: 12,
        }}>
          <input aria-label="Titre de la publicité" value={form.title} onChange={e => update('title', e.target.value)} placeholder="Titre de l’offre ou article *" required style={fieldStyle} />
          <input aria-label={`Nom du ${audienceLabel}`} value={form.partner} onChange={e => update('partner', e.target.value)} placeholder={`Nom du ${audienceLabel} *`} required style={fieldStyle} />
          <select aria-label="Type de publicité" value={form.type} onChange={e => update('type', e.target.value)} style={fieldStyle}>
            <option value="offer">Offre commerciale</option>
            <option value="article">Article / nouveauté</option>
            <option value="video">Vidéo promotionnelle</option>
          </select>
          <input aria-label="URL vidéo" value={form.videoUrl} onChange={e => update('videoUrl', e.target.value)} placeholder="URL vidéo https://..." style={fieldStyle} />
          <label style={{ ...fieldStyle, display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', color: '#64748B' }}>
            <Upload size={14} color={accent} />
            Prévisualiser une vidéo locale
            <input aria-label="Fichier vidéo local" type="file" accept="video/*" onChange={onFile} style={{ display: 'none' }} />
          </label>
          <input aria-label="Texte du bouton publicitaire" value={form.ctaLabel} onChange={e => update('ctaLabel', e.target.value)} placeholder="Texte bouton, ex: Commander" style={fieldStyle} />
          <input aria-label="Lien du bouton publicitaire" value={form.ctaUrl} onChange={e => update('ctaUrl', e.target.value)} placeholder="Lien bouton https://..." style={fieldStyle} />
          <textarea aria-label="Description de la publicité" value={form.description} onChange={e => update('description', e.target.value)} placeholder="Description, offre, article ou détails de la publicité" rows={3} style={{ ...fieldStyle, resize: 'vertical', gridColumn: '1 / -1' }} />
          <div style={{ gridColumn: '1 / -1', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#94A3B8' }}>
              <Link2 size={12} />
              Les vidéos par fichier sont une prévisualisation locale. Utiliser une URL pour garder la pub après rechargement.
            </span>
            <button type="submit" style={{
              padding: '9px 16px',
              borderRadius: 10,
              border: 0,
              background: accent,
              color: '#fff',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 800,
            }}>
              Publier l’exemple
            </button>
          </div>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
        {ads.map(ad => <PartnerAdCard key={ad.id} ad={ad} accent={accent} />)}
      </div>
    </section>
  );
}

const fieldStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: 10,
  border: '1.5px solid #E2E8F0',
  fontSize: 13,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  background: '#fff',
  color: '#0F172A',
};
