import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Shield, Code, Heart } from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

export function Footer({ isPdf = false }) {
  const year = new Date().getFullYear();
  const [devs, setDevs] = useState({
    rafael: '2º Sgt Rafael Monteiro Mendes',
    alan: '2º Sgt Alan Kleber de Menezes Soares'
  });

  useEffect(() => {
    let isMounted = true;
    axios.get(`${API_URL}/efetivo/desenvolvedores`)
      .then(res => {
        if (!isMounted || !Array.isArray(res.data) || res.data.length === 0) return;
        
        const mRafael = res.data.find(m => 
          m.nome_completo && m.nome_completo.toUpperCase().includes('RAFAEL MONTEIRO MENDES')
        );
        const mAlan = res.data.find(m => 
          m.nome_completo && m.nome_completo.toUpperCase().includes('ALAN KLEBER DE MENEZES SOARES')
        );

        setDevs({
          rafael: mRafael ? `${mRafael.posto_graduacao} ${mRafael.nome_completo}`.trim() : '2º Sgt Rafael Monteiro Mendes',
          alan: mAlan ? `${mAlan.posto_graduacao} ${mAlan.nome_completo}`.trim() : '2º Sgt Alan Kleber de Menezes Soares'
        });
      })
      .catch(err => {
        console.warn('[Footer] Erro ao buscar desenvolvedores:', err.message);
      });

    return () => { isMounted = false; };
  }, []);

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
          <div style={devItemStyle}>{devs.rafael}</div>
          {!isPdf && <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }} />}
          <div style={devItemStyle}>{devs.alan}</div>
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
