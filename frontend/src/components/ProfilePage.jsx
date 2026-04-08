import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  User, Mail, Phone, Lock, Camera, CheckCircle, AlertCircle,
  Shield, Star, Eye, EyeOff, RefreshCw, Trash2, Edit3, Save, X
} from 'lucide-react';

const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3001') + '/api';

function Alert({ type, message, onClose }) {
  const color = type === 'success' ? { bg: '#f0fdf4', border: '#86efac', text: '#166534' }
    : { bg: '#fef2f2', border: '#fecaca', text: '#dc2626' };
  const Icon = type === 'success' ? CheckCircle : AlertCircle;
  return (
    <div style={{
      background: color.bg, border: `1px solid ${color.border}`,
      color: color.text, padding: '0.75rem 1rem', borderRadius: 10,
      display: 'flex', alignItems: 'center', gap: '0.5rem',
      marginBottom: '1rem', fontSize: '0.875rem'
    }}>
      <Icon size={16} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{message}</span>
      {onClose && <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit' }}><X size={14} /></button>}
    </div>
  );
}

function Card({ title, icon: Icon, iconColor = '#1e3a5f', children }) {
  return (
    <div style={{
      background: 'white', borderRadius: 16, padding: '1.5rem',
      boxShadow: '0 2px 12px rgba(0,0,0,0.07)', marginBottom: '1.25rem',
      border: '1px solid #f1f5f9'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.25rem', paddingBottom: '0.85rem', borderBottom: '1px solid #f1f5f9' }}>
        <div style={{ background: `${iconColor}15`, padding: '0.45rem', borderRadius: '8px' }}>
          <Icon size={18} color={iconColor} />
        </div>
        <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#1e293b' }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, placeholder, disabled, rightElement, id }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', marginBottom: '0.4rem', color: '#374151', fontWeight: 600, fontSize: '0.85rem' }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          style={{
            width: '100%', padding: '0.75rem', boxSizing: 'border-box',
            border: `1.5px solid ${focused ? '#1e3a5f' : '#e2e8f0'}`,
            borderRadius: 10, fontSize: '0.9rem',
            background: disabled ? '#f8fafc' : 'white',
            color: disabled ? '#64748b' : '#1e293b',
            outline: 'none', transition: 'border-color 0.2s',
            paddingRight: rightElement ? '2.5rem' : '0.75rem'
          }}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
        {rightElement && (
          <div style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
            {rightElement}
          </div>
        )}
      </div>
    </div>
  );
}

export function ProfilePage({ user }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [alert, setAlert] = useState(null);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ email: '', telefone: '' });
  const [passwordForm, setPasswordForm] = useState({ current_password: '', new_password: '', confirm_password: '' });
  const [showCurrentPass, setShowCurrentPass] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef(null);

  const showAlert = (type, message) => {
    setAlert({ type, message });
    if (type === 'success') setTimeout(() => setAlert(null), 4000);
  };

  const loadProfile = async () => {
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/me`);
      const data = res.data.data;
      setProfile(data);
      setProfileForm({ email: data.email || '', telefone: data.telefone || '' });
    } catch {
      showAlert('error', 'Não foi possível carregar os dados do perfil.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      await axios.put(`${API_URL}/me/profile`, profileForm);
      showAlert('success', 'Perfil atualizado com sucesso!');
      setEditingProfile(false);
      loadProfile();
    } catch (err) {
      showAlert('error', err.response?.data?.error?.message || 'Erro ao salvar.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      showAlert('error', 'A nova senha e a confirmação não coincidem.');
      return;
    }
    if (passwordForm.new_password.length < 6) {
      showAlert('error', 'A nova senha deve ter no mínimo 6 caracteres.');
      return;
    }
    setSavingPassword(true);
    try {
      await axios.post(`${API_URL}/auth/password/change`, {
        current_password: passwordForm.current_password,
        new_password: passwordForm.new_password
      });
      showAlert('success', 'Senha alterada com sucesso! Você precisará fazer login novamente.');
      setPasswordForm({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      showAlert('error', err.response?.data?.error?.message || 'Erro ao alterar senha.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      await axios.post(`${API_URL}/me/avatar`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      showAlert('success', 'Foto de perfil atualizada!');
      loadProfile();
    } catch (err) {
      showAlert('error', err.response?.data?.error?.message || 'Erro ao enviar foto.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleRemoveAvatar = async () => {
    if (!confirm('Remover foto de perfil?')) return;
    try {
      await axios.delete(`${API_URL}/me/avatar`);
      showAlert('success', 'Foto removida.');
      loadProfile();
    } catch {
      showAlert('error', 'Erro ao remover foto.');
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
      <div style={{ width: 40, height: 40, border: '3px solid #e2e8f0', borderTopColor: '#1e3a5f', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );

  const initials = (profile?.nome_guerra || profile?.nome_completo || user?.nome_guerra || 'US').substring(0, 2).toUpperCase();
  const avatarSrc = profile?.avatar_url ? `${import.meta.env.VITE_API_URL || 'http://localhost:3001'}${profile.avatar_url}` : null;

  const roleColors = { ADMIN: '#dc2626', GERENTE: '#d97706', MILITAR: '#1e3a5f' };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 760, margin: '0 auto' }}>
      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg, #1e3a5f, #0f2744)', borderRadius: 20,
        padding: '2rem', marginBottom: '1.5rem', color: 'white',
        display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap'
      }}>
        {/* Avatar */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <div style={{
            width: 88, height: 88, borderRadius: '50%',
            border: '3px solid rgba(255,255,255,0.4)',
            overflow: 'hidden', background: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.8rem', fontWeight: 700, color: 'white', position: 'relative'
          }}>
            {avatarSrc ? <img src={avatarSrc} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : initials}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingAvatar}
            style={{
              position: 'absolute', bottom: 0, right: 0,
              background: 'white', color: '#1e3a5f', border: 'none',
              borderRadius: '50%', width: 28, height: 28,
              cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
            }}
            title="Alterar foto"
          >
            <Camera size={14} />
          </button>
          <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarUpload} />
        </div>

        <div style={{ flex: 1 }}>
          <h2 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700 }}>
            {profile?.nome_guerra || profile?.nome_completo || user?.nome_guerra}
          </h2>
          <p style={{ margin: '0.3rem 0 0.6rem', opacity: 0.8, fontSize: '0.9rem' }}>
            {profile?.posto_graduacao || user?.rank} — Matrícula: {profile?.numero_ordem || user?.numero_ordem}
          </p>
          {/* Badges de Roles */}
          <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
            {(profile?.roles || user?.roles || []).map(r => (
              <span key={r} style={{
                background: `${roleColors[r] || '#475569'}33`,
                color: 'white', border: `1px solid ${roleColors[r] || '#475569'}66`,
                padding: '0.2rem 0.65rem', borderRadius: 20, fontSize: '0.75rem', fontWeight: 600
              }}>
                {r === 'ADMIN' ? '★ ' : ''}{r}
              </span>
            ))}
          </div>
        </div>

        {profile?.avatar_url && (
          <button onClick={handleRemoveAvatar} style={{
            background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
            color: 'white', padding: '0.4rem 0.75rem', borderRadius: 8,
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.8rem'
          }}>
            <Trash2 size={13} /> Remover foto
          </button>
        )}
      </div>

      {alert && <Alert type={alert.type} message={alert.message} onClose={() => setAlert(null)} />}

      {/* Dados Pessoais */}
      <Card title="Dados Pessoais" icon={User}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '0 1rem' }}>
          <Input label="Nome de Guerra" value={profile?.nome_guerra || ''} disabled />
          <Input label="Posto/Graduação" value={profile?.posto_graduacao || ''} disabled />
          <Input label="OPM" value={profile?.opm || ''} disabled />
          <Input label="Matrícula" value={profile?.numero_ordem || ''} disabled />
          <Input
            id="profile-email"
            label="E-mail"
            type="email"
            value={profileForm.email}
            onChange={e => setProfileForm(f => ({ ...f, email: e.target.value }))}
            placeholder="seu@email.com"
            disabled={!editingProfile}
            rightElement={!editingProfile && <Mail size={14} color="#94a3b8" />}
          />
          <Input
            id="profile-phone"
            label="Telefone"
            value={profileForm.telefone}
            onChange={e => setProfileForm(f => ({ ...f, telefone: e.target.value }))}
            placeholder="(82) 99999-9999"
            disabled={!editingProfile}
            rightElement={!editingProfile && <Phone size={14} color="#94a3b8" />}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '0.5rem' }}>
          {editingProfile ? (
            <>
              <button onClick={() => setEditingProfile(false)} style={{
                padding: '0.6rem 1.2rem', background: '#f1f5f9', border: 'none',
                borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem',
                color: '#64748b', fontWeight: 600, fontSize: '0.875rem'
              }}>
                <X size={15} /> Cancelar
              </button>
              <button onClick={handleSaveProfile} disabled={savingProfile} style={{
                padding: '0.6rem 1.2rem',
                background: 'linear-gradient(135deg, #1e3a5f, #0f2744)',
                color: 'white', border: 'none', borderRadius: 8,
                cursor: savingProfile ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '0.4rem',
                fontWeight: 600, fontSize: '0.875rem', opacity: savingProfile ? 0.7 : 1
              }}>
                <Save size={15} /> {savingProfile ? 'Salvando...' : 'Salvar'}
              </button>
            </>
          ) : (
            <button onClick={() => setEditingProfile(true)} style={{
              padding: '0.6rem 1.2rem',
              background: 'linear-gradient(135deg, #1e3a5f, #0f2744)',
              color: 'white', border: 'none', borderRadius: 8, cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              fontWeight: 600, fontSize: '0.875rem'
            }}>
              <Edit3 size={15} /> Editar
            </button>
          )}
        </div>
      </Card>

      {/* Alterar Senha */}
      <Card title="Alterar Senha" icon={Lock} iconColor="#dc2626">
        <form onSubmit={handleChangePassword}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0 1rem' }}>
            <Input
              id="current-password"
              label="Senha Atual"
              type={showCurrentPass ? 'text' : 'password'}
              value={passwordForm.current_password}
              onChange={e => setPasswordForm(f => ({ ...f, current_password: e.target.value }))}
              placeholder="Senha atual (CPF)"
              rightElement={
                <button type="button" onClick={() => setShowCurrentPass(!showCurrentPass)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                  {showCurrentPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
            <Input
              id="new-password"
              label="Nova Senha"
              type={showNewPass ? 'text' : 'password'}
              value={passwordForm.new_password}
              onChange={e => setPasswordForm(f => ({ ...f, new_password: e.target.value }))}
              placeholder="Mínimo 6 caracteres"
              rightElement={
                <button type="button" onClick={() => setShowNewPass(!showNewPass)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', padding: 0 }}>
                  {showNewPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              }
            />
            <Input
              id="confirm-password"
              label="Confirmar Nova Senha"
              type="password"
              value={passwordForm.confirm_password}
              onChange={e => setPasswordForm(f => ({ ...f, confirm_password: e.target.value }))}
              placeholder="Repita a nova senha"
            />
          </div>

          {/* Barra de força da senha */}
          {passwordForm.new_password && (
            <div style={{ marginBottom: '1rem' }}>
              <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                {[...Array(4)].map((_, i) => {
                  const strength = passwordForm.new_password.length >= 12 ? 4
                    : passwordForm.new_password.length >= 8 ? 3
                    : passwordForm.new_password.length >= 6 ? 2 : 1;
                  const colors = ['#ef4444', '#f97316', '#eab308', '#22c55e'];
                  return (
                    <div key={i} style={{
                      height: 4, flex: 1, borderRadius: 2,
                      background: i < strength ? colors[strength - 1] : '#e2e8f0',
                      transition: 'background 0.3s'
                    }} />
                  );
                })}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {passwordForm.new_password.length < 6 ? 'Muito curta' : passwordForm.new_password.length < 8 ? 'Fraca' : passwordForm.new_password.length < 12 ? 'Moderada' : 'Forte'}
              </span>
            </div>
          )}

          <button type="submit" disabled={savingPassword || !passwordForm.current_password || !passwordForm.new_password} style={{
            padding: '0.7rem 1.5rem',
            background: 'linear-gradient(135deg, #dc2626, #b91c1c)',
            color: 'white', border: 'none', borderRadius: 8,
            cursor: (savingPassword || !passwordForm.current_password || !passwordForm.new_password) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', gap: '0.4rem',
            fontWeight: 600, fontSize: '0.875rem',
            opacity: (savingPassword || !passwordForm.current_password) ? 0.65 : 1
          }}>
            <RefreshCw size={15} /> {savingPassword ? 'Alterando...' : 'Alterar Senha'}
          </button>
        </form>
      </Card>

      {/* Permissões do usuário */}
      {(profile?.permissions || user?.permissions) && (
        <Card title="Suas Permissões" icon={Shield} iconColor="#7c3aed">
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {(profile?.permissions || user?.permissions || []).map(p => (
              <span key={p} style={{
                background: '#f3f4f6', color: '#374151',
                padding: '0.25rem 0.65rem', borderRadius: 20,
                fontSize: '0.75rem', fontFamily: 'monospace'
              }}>
                {p}
              </span>
            ))}
          </div>
        </Card>
      )}

      <style>{'@keyframes spin { to { transform: rotate(360deg); } }'}</style>
    </div>
  );
}
