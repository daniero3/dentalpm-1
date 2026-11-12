import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { Search, X } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' &&
      window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';

const authH = () => ({ withCredentials: true });

export default function PatientSearchPicker({
  value = '',
  selectedPatient = null,
  onChange,
  inputId = 'patient-search-picker'
}) {
  const [query, setQuery] = useState('');
  const [chosen, setChosen] = useState(null);
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [active, setActive] = useState(0);
  const rootRef = useRef(null);

  // Afficher un patient déjà associé au formulaire.
  useEffect(() => {
    if (!value) {
      setChosen(null);
      return;
    }

    if (selectedPatient?.id === value) {
      setChosen(selectedPatient);
      return;
    }

    if (chosen?.id === value) return;

    let cancelled = false;

    axios.get(`${API}/patients/${value}`, authH())
      .then(response => {
        if (!cancelled) setChosen(response.data);
      })
      .catch(() => {
        if (!cancelled) setChosen(null);
      });

    return () => {
      cancelled = true;
    };
  }, [value, selectedPatient, chosen]);

  useEffect(() => {
    const closeOutside = event => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', closeOutside);

    return () => {
      document.removeEventListener('pointerdown', closeOutside);
    };
  }, []);

  // Recherche côté serveur, après 300 ms.
  useEffect(() => {
    const term = query.trim();

    if (!open || value || term.length < 2) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }

    const controller = new AbortController();

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(false);

      try {
        const response = await axios.get(`${API}/patients`, {
          ...authH(),
          params: {
            search: term,
            page: 1,
            limit: 8,
            fields: 'lookup',
            includeTotal: false
          },
          signal: controller.signal
        });

        if (!controller.signal.aborted) {
          setResults(response.data.patients || []);
          setActive(0);
        }
      } catch {
        if (!controller.signal.aborted) {
          setError(true);
          setResults([]);
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 300);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open, value]);

  const selected = value
    ? (chosen?.id === value
        ? chosen
        : selectedPatient?.id === value
          ? selectedPatient
          : null)
    : null;

  const selectPatient = patient => {
    setChosen(patient);
    setQuery(
      `${patient.first_name || ''} ${patient.last_name || ''}`.trim()
    );
    setResults([]);
    setOpen(false);
    onChange(patient);
  };

  const clearPatient = () => {
    setChosen(null);
    setQuery('');
    setResults([]);
    setOpen(false);
    onChange(null);
  };

  const showResults =
    open && !value && query.trim().length >= 2;

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <div style={{ position: 'relative' }}>
        <Search
          size={17}
          style={{
            position: 'absolute',
            top: '50%',
            left: 14,
            transform: 'translateY(-50%)',
            color: '#0D7A87',
            pointerEvents: 'none'
          }}
        />

        <input
          id={inputId}
          type="text"
          role="combobox"
          aria-label="Rechercher un patient"
          aria-autocomplete="list"
          aria-expanded={showResults}
          aria-controls={
            showResults ? `${inputId}-results` : undefined
          }
          aria-activedescendant={
            showResults && results[active]
              ? `${inputId}-${results[active].id}`
              : undefined
          }
          autoComplete="off"
          readOnly={Boolean(selected)}
          value={selected
            ? `${selected.first_name || ''} ${selected.last_name || ''}`.trim()
            : value ? '' : query}
          placeholder={
            value ? 'Chargement du patient...' : 'Rechercher un patient...'
          }
          onFocus={() => setOpen(true)}
          onChange={event => {
            setQuery(event.target.value);
            setResults([]);
            setActive(0);
            setOpen(true);

            if (value) clearPatient();
          }}
          onKeyDown={event => {
            if (event.key === 'Escape') {
              setOpen(false);
              return;
            }

            if (!showResults || !results.length) return;

            if (event.key === 'ArrowDown') {
              event.preventDefault();
              setActive(i => Math.min(i + 1, results.length - 1));
            }

            if (event.key === 'ArrowUp') {
              event.preventDefault();
              setActive(i => Math.max(i - 1, 0));
            }

            if (event.key === 'Enter') {
              event.preventDefault();
              selectPatient(results[active] || results[0]);
            }
          }}
          style={{
            width: '100%',
            height: 46,
            boxSizing: 'border-box',
            padding: '10px 42px',
            borderRadius: 12,
            border: '1.5px solid #0D7A87',
            background: '#FFFFFF',
            color: '#0F172A',
            fontSize: 14,
            fontFamily: 'inherit',
            outline: 'none'
          }}
        />

        {value && (
          <button
            type="button"
            aria-label="Effacer le patient sélectionné"
            onClick={clearPatient}
            style={{
              position: 'absolute',
              right: 12,
              top: '50%',
              transform: 'translateY(-50%)',
              border: 0,
              background: 'transparent',
              color: '#64748B',
              cursor: 'pointer'
            }}
          >
            <X size={16} />
          </button>
        )}
      </div>

      <div style={{
        fontSize: 11,
        marginTop: 5,
        color: value ? '#0D7A87' : '#64748B'
      }}>
        {value
          ? 'Patient sélectionné'
          : 'Rechercher par nom, prénom, téléphone ou numéro de dossier'}
      </div>

      {showResults && (
        <div
          id={`${inputId}-results`}
          role="listbox"
          aria-label="Résultats de recherche des patients"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            zIndex: 6000,
            marginTop: 6,
            maxHeight: 260,
            overflowY: 'auto',
            padding: 6,
            background: '#FFFFFF',
            border: '1px solid #DCE5EC',
            borderRadius: 12,
            boxShadow: '0 12px 30px rgba(15,23,42,.15)'
          }}
        >
          {loading && (
            <div style={{ padding: 12, color: '#64748B', fontSize: 13 }}>
              Recherche en cours...
            </div>
          )}

          {error && (
            <div style={{ padding: 12, color: '#DC2626', fontSize: 13 }}>
              Erreur de recherche. Réessayez.
            </div>
          )}

          {!loading && !error && results.length === 0 && (
            <div style={{ padding: 12, color: '#64748B', fontSize: 13 }}>
              Aucun patient trouvé
            </div>
          )}

          {!loading && !error && results.map((patient, index) => (
            <button
              key={patient.id}
              id={`${inputId}-${patient.id}`}
              type="button"
              role="option"
              aria-selected={index === active}
              onMouseEnter={() => setActive(index)}
              onMouseDown={event => event.preventDefault()}
              onClick={() => selectPatient(patient)}
              style={{
                width: '100%',
                display: 'block',
                padding: '10px 12px',
                border: 0,
                borderRadius: 8,
                background: index === active
                  ? '#E6F7F7'
                  : '#FFFFFF',
                textAlign: 'left',
                cursor: 'pointer'
              }}
            >
              <div style={{
                fontSize: 13,
                fontWeight: 700,
                color: '#0F172A'
              }}>
                {patient.first_name} {patient.last_name}
              </div>

              <div style={{
                fontSize: 11,
                color: '#64748B',
                marginTop: 3
              }}>
                {[
                  patient.patient_number,
                  patient.phone_primary
                ].filter(Boolean).join(' · ')}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
