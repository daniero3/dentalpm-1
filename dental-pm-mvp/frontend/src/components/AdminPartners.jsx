import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useResponsive } from '../utils/responsive';
import { toast } from 'sonner';
import { Plus, Edit2, Trash2, Truck, RefreshCw, X, Check } from 'lucide-react';

const API = process.env.REACT_APP_BACKEND_URL
  ? `${process.env.REACT_APP_BACKEND_URL}/api`
  : typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:8001/api'
    : '/api';
const authH = () => ({ withCredentials: true });

const CATEGORIES = ['MATERIEL','MEDICAMENT','LABORATOIRE','CONSOMMABLE','EQUIPEMENT','AUTRE'];
const emptyForm = { name:'', contact_name:'', email:'', phone:'', address:'', city:'', category:'AUTRE', notes:'' };
const inp = { width:'100%', padding:'10px 12px', borderRadius:10, border:'1.5px solid #E2E8F0', fontSize:13, fontFamily:'inherit', outline:'none', boxSizing:'border-box' };

export default function AdminPartners() {
  const { isMobile } = useResponsive();
  const [partners, setPartners] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [modal,    setModal]    = useState(false);
  const [editing,  setEditing]  = useState(null);
  const [form,     setForm]     = useState(emptyForm);
  const [saving,   setSaving]   = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await axios.get(`${API}/admin/partners`, authH());
      setPartners(r.data.partners || []);
    } catch { toast.error('Erreur chargement partenaires'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openAdd  = () => { setForm(emptyForm); setEditing(null); setModal(true); };
  const openEdit = (p) => { setForm({ name:p.name||'', contact_name:p.contact_name||'', email:p.email||'', phone:p.phone||'', address:p.address||'', city:p.city||'', category:p.category||'AUTRE', notes:p.notes||'' }); setEditing(p.id); setModal(true); };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Nom requis'); return; }
    setSaving(true);
    try {
      if (editing) {
        await axios.put(`${API}/admin/partners/${editing}`, form, authH());
        toast.success('Partenaire mis à jour');
      } else {
        await axios.post(`${API}/admin/partners`, form, authH());
        toast.success('Partenaire ajouté');
      }
      setModal(false);
      load();
    } catch(e) { toast.error(e.response?.data?.error || 'Erreur'); }
    finally { setSaving(false); }
  };

  const remove = async (id, name) => {
    if (!window.confirm(`Désactiver le partenaire "${name}" ?`)) return;
    try {
      await axios.delete(`${API}/admin/partners/${id}`, authH());
      toast.success('Partenaire désactivé');
      load();
    } catch { toast.error('Erreur suppression'); }
  };

  const T = '#0D7A87';

  return (
    <div style={{ maxWidth:1000, margin:'0 auto', paddingBottom:48, fontFamily:'DM Sans,sans-serif' }}>
      <style>{`@keyframes fadeUp{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:44, height:44, borderRadius:13, background:`linear-gradient(135deg,${T},#13A3B4)`, display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', boxShadow:`0 4px 14px ${T}40` }}>
            <Truck size={22} color="#fff"/>
          </div>
          <div>
            <h1 style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:20, color:'#0F172A', margin:0 }}>Fournisseurs partenaires</h1>
            <p style={{ color:'#64748B', fontSize:13, margin:0 }}>Partenaires visibles par tous les cabinets abonnés</p>
          </div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button type="button" onClick={load} style={{ padding:'9px 14px', borderRadius:10, border:'1px solid #E2E8F0', background:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:6, fontSize:13, color:'#475569' }}>
            <RefreshCw size={14}/> Actualiser
          </button>
          <button type="button" onClick={openAdd} style={{ padding:'9px 18px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${T},#13A3B4)`, color:'#fff', cursor:'pointer', display:'flex', alignItems:'center', gap:7, fontSize:13, fontWeight:700, boxShadow:`0 4px 12px ${T}30` }}>
            <Plus size={15}/> Ajouter partenaire
          </button>
        </div>
      </div>

      {/* Liste */}
      {loading ? (
        <div style={{ textAlign:'center', padding:60, color:'#94A3B8' }}>Chargement...</div>
      ) : partners.length === 0 ? (
        <div style={{ textAlign:'center', padding:'60px 20px', background:'#fff', borderRadius:16, border:'1px solid #E2E8F0' }}>
          <div style={{ fontSize:48, marginBottom:12 }}>🤝</div>
          <p style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:16, color:'#0F172A', margin:'0 0 6px' }}>Aucun partenaire</p>
          <p style={{ color:'#64748B', fontSize:13, margin:'0 0 20px' }}>Ajoutez des fournisseurs partenaires visibles par tous les cabinets</p>
          <button type="button" onClick={openAdd} style={{ padding:'10px 22px', borderRadius:10, border:'none', background:T, color:'#fff', cursor:'pointer', fontWeight:700, fontSize:13 }}>
            <Plus size={14} style={{ marginRight:6 }}/>Ajouter le premier partenaire
          </button>
        </div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill,minmax(280px,1fr))', gap:14 }}>
          {partners.map((p, i) => (
            <div key={p.id} style={{ background:'#fff', borderRadius:16, border:'1px solid #E2E8F0', padding:'18px 20px', animation:`fadeUp .3s ease ${i*.05}s both`, boxShadow:'0 1px 4px rgba(0,0,0,.04)' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                <div>
                  <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:700, fontSize:15, color:'#0F172A' }}>{p.name}</div>
                  {p.category && <span style={{ fontSize:10, fontWeight:700, background:'#F0FDFE', color:T, border:`1px solid ${T}30`, borderRadius:99, padding:'2px 8px', marginTop:4, display:'inline-block' }}>{p.category}</span>}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <button type="button" onClick={() => openEdit(p)} style={{ width:30, height:30, borderRadius:8, border:'1px solid #E2E8F0', background:'#F8FAFC', cursor:'pointer', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center' }}>
                    <Edit2 size={13} color="#64748B"/>
                  </button>
                  <button type="button" onClick={() => remove(p.id, p.name)} style={{ width:30, height:30, borderRadius:8, border:'1px solid #FEE2E2', background:'#FEF2F2', cursor:'pointer', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center' }}>
                    <Trash2 size={13} color="#EF4444"/>
                  </button>
                </div>
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {p.contact_name && <div style={{ fontSize:12, color:'#64748B' }}>👤 {p.contact_name}</div>}
                {p.phone && <div style={{ fontSize:12, color:'#64748B' }}>📞 {p.phone}</div>}
                {p.email && <div style={{ fontSize:12, color:'#64748B' }}>✉️ {p.email}</div>}
                {p.city && <div style={{ fontSize:12, color:'#64748B' }}>📍 {p.city}</div>}
                {p.notes && <div style={{ fontSize:12, color:'#94A3B8', marginTop:6, fontStyle:'italic' }}>{p.notes}</div>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal ajout/édition */}
      {modal && (
        <div onClick={e=>e.target===e.currentTarget&&setModal(false)} style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(10,16,30,.6)', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', padding:16 }}>
          <div style={{ background:'#fff', borderRadius:20, width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 32px 80px rgba(0,0,0,.2)' }}>
            <div style={{ padding:'18px 22px', borderBottom:'1px solid #F1F5F9', display:'flex', justifyContent:'space-between', alignItems:'center', background:`linear-gradient(135deg,${T},#0A5F6A)`, borderRadius:'20px 20px 0 0' }}>
              <div style={{ fontFamily:'Plus Jakarta Sans', fontWeight:800, fontSize:16, color:'#fff' }}>{editing ? 'Modifier le partenaire' : 'Nouveau partenaire'}</div>
              <button type="button" onClick={()=>setModal(false)} style={{ width:32, height:32, borderRadius:8, background:'rgba(255,255,255,.15)', border:'none', cursor:'pointer', color:'#fff', display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center' }}><X size={15}/></button>
            </div>
            <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
              {[
                { label:'Nom du fournisseur *', key:'name',         type:'text',  ph:'Ex: MatérielDentaire SARL' },
                { label:'Personne de contact',  key:'contact_name', type:'text',  ph:'Dr. Rakoto' },
                { label:'Téléphone',            key:'phone',        type:'tel',   ph:'034 XX XXX XX' },
                { label:'Email',                key:'email',        type:'email', ph:'contact@fournisseur.mg' },
                { label:'Ville',                key:'city',         type:'text',  ph:'Antananarivo' },
                { label:'Adresse',              key:'address',      type:'text',  ph:'Rue X, Tana' },
              ].map(f => (
                <div key={f.key}>
                  <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 }}>{f.label}</label>
                  <input aria-label={f.label} type={f.type} placeholder={f.ph} value={form[f.key]}
                    onChange={e=>setForm(p=>({...p,[f.key]:e.target.value}))}
                    style={inp}
                    onFocus={e=>{e.target.style.borderColor=T;e.target.style.boxShadow=`0 0 0 3px ${T}18`;}}
                    onBlur={e=>{e.target.style.borderColor='#E2E8F0';e.target.style.boxShadow='none';}}/>
                </div>
              ))}
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 }}>Catégorie</label>
                <select aria-label="Catégorie du partenaire" value={form.category} onChange={e=>setForm(p=>({...p,category:e.target.value}))} style={{ ...inp, background:'#fff', cursor:'pointer' }}>
                  {CATEGORIES.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#475569', marginBottom:5 }}>Notes</label>
                <textarea aria-label="Notes du partenaire" value={form.notes} onChange={e=>setForm(p=>({...p,notes:e.target.value}))} rows={3} placeholder="Informations complémentaires..." style={{ ...inp, resize:'none', lineHeight:1.6 }}
                  onFocus={e=>{e.target.style.borderColor=T;}} onBlur={e=>{e.target.style.borderColor='#E2E8F0';}}/>
              </div>
              <div style={{ display:'flex', gap:8, paddingTop:8 }}>
                <button type="button" onClick={()=>setModal(false)} style={{ flex:1, padding:'11px', borderRadius:10, border:'1.5px solid #E2E8F0', background:'#fff', cursor:'pointer', fontSize:13, fontWeight:600, color:'#475569' }}>Annuler</button>
                <button type="button" onClick={save} disabled={saving} style={{ flex:2, padding:'11px', borderRadius:10, border:'none', background:`linear-gradient(135deg,${T},#13A3B4)`, color:'#fff', cursor:saving?'not-allowed':'pointer', fontSize:13, fontWeight:700, display:'flex', alignItems: isMobile ? 'flex-end' : 'center', justifyContent:'center', gap:7, opacity:saving?.7:1 }}>
                  {saving ? 'Enregistrement...' : <><Check size={14}/>{editing ? 'Mettre à jour' : 'Ajouter le partenaire'}</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
