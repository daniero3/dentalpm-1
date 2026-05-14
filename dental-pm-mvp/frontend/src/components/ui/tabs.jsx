// frontend/src/components/ui/tabs.jsx
// Remplacement des Tabs Radix/shadcn par des onglets CSS purs — zéro Portal
import React, { useState, createContext, useContext } from 'react';

const TabsContext = createContext({ value: '', onChange: () => {} });

const Tabs = ({ defaultValue, value, onValueChange, children, className = '' }) => {
  const [internal, setInternal] = useState(defaultValue || '');
  const current  = value !== undefined ? value : internal;
  const onChange = (v) => { setInternal(v); onValueChange?.(v); };
  return (
    <TabsContext.Provider value={{ value: current, onChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
};

const TabsList = ({ children, className = '' }) => (
  <div style={{ display:'flex', gap:4, background:'#F1F5F9', borderRadius:10, padding:4 }} className={className}>
    {children}
  </div>
);

const TabsTrigger = ({ value, children, className = '', ...props }) => {
  const { value: current, onChange } = useContext(TabsContext);
  const active = current === value;
  return (
    <button
      onClick={() => onChange(value)}
      style={{
        flex:1, padding:'7px 14px', borderRadius:7, border:'none', cursor:'pointer',
        fontFamily:'Plus Jakarta Sans, sans-serif', fontSize:13, fontWeight: active ? 700 : 500,
        background: active ? '#fff' : 'transparent',
        color: active ? '#0F172A' : '#64748B',
        boxShadow: active ? '0 1px 4px rgba(15,23,42,0.1)' : 'none',
        transition:'all 0.18s ease', display:'flex', alignItems:'center', justifyContent:'center', gap:6,
      }}
      className={className}
      {...props}
    >
      {children}
    </button>
  );
};

const TabsContent = ({ value, children, className = '' }) => {
  const { value: current } = useContext(TabsContext);
  if (current !== value) return null;
  return <div className={className}>{children}</div>;
};

export { Tabs, TabsList, TabsTrigger, TabsContent };
