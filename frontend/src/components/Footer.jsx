import React from 'react';
import { Shield, Code, Heart } from 'lucide-react';

export function Footer({ isPdf = false }) {
  const year = new Date().getFullYear();

  const footerStyle = {
    padding: isPdf ? '20px 0' : '2.5rem 2rem',
    background: isPdf ? 'transparent' : '#f8fafc',
    borderTop: isPdf ? '1px solid #e2e8f0' : '1px solid #e2e8f0',
    marginTop: isPdf ? '30px' : 'auto',
    textAlign: 'center',
    color: '#64748b',
    fontSize: isPdf ? '10pt' : '0.9rem',
    width: '100%',
    fontFamily: "'Inter', sans-serif"
  };

  const devContainerStyle = {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    gap: '1.5rem',
    marginTop: '0.75rem',
    flexWrap: 'wrap'
  };

  const devItemStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontWeight: 600,
    color: '#1e3a8a'
  };

  return (
    <footer style={footerStyle} className={isPdf ? 'pdf-footer' : 'system-footer'}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', marginBottom: '0.5rem' }}>
          <Shield size={isPdf ? 14 : 18} color="#1e3a8a" />
          <span style={{ fontWeight: 700, color: '#0f172a' }}>GSVR</span>
          <span style={{ opacity: 0.8 }}>© {year} - Todos os direitos reservados</span>
        </div>

        <div style={devContainerStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Code size={isPdf ? 12 : 16} />
            <span>Desenvolvido por:</span>
          </div>
          <div style={devItemStyle}>2º Sgt Rafael Monteiro Mendes - </div>
          {!isPdf && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }} />}
          <div style={devItemStyle}>3º Sgt Alan Kleber de Menezes Soares</div>
        </div>

        {!isPdf && (
          <div style={{ marginTop: '1rem', fontSize: '0.75rem', opacity: 0.7, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px' }}>
            Feito com dedicação pela equipe da P3 do 9º BPM
          </div>
        )}
      </div>
    </footer>
  );
}
