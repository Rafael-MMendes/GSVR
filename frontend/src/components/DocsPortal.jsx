import React, { useState } from 'react';
import {
  BookOpen, Search, Shield, Users, CalendarCheck, FileText, CheckCircle2,
  AlertTriangle, ExternalLink, Printer, Database, Terminal, ChevronRight,
  Layers, DollarSign, Activity, FileSpreadsheet, Lock
} from 'lucide-react';

export function DocsPortal() {
  const [activeTab, setActiveTab] = useState('manual'); // 'manual' | 'tecnica'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeProfile, setActiveProfile] = useState('militar'); // 'militar' | 'p3' | 'gestor' | 'admin'

  const openStandalone = () => {
    window.open('/manual-e-documentacao.html', '_blank');
  };

  return (
    <div className="docs-portal-container" style={{
      maxWidth: '1440px',
      margin: '0 auto',
      padding: '1.5rem 2rem 4rem',
      color: '#f8fafc'
    }}>
      {/* Header Bar */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(30, 41, 59, 0.8) 100%)',
        border: '1px solid rgba(56, 189, 248, 0.25)',
        borderRadius: '16px',
        padding: '1.75rem 2rem',
        marginBottom: '2rem',
        boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.4)',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1.5rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.4rem' }}>
            <span style={{
              background: 'rgba(56, 189, 248, 0.15)',
              color: '#38bdf8',
              padding: '0.35rem 0.65rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem'
            }}>
              <BookOpen size={16} /> 9º BPM / PMAL
            </span>
            <span style={{
              background: 'rgba(234, 179, 8, 0.15)',
              color: '#eab308',
              padding: '0.35rem 0.65rem',
              borderRadius: '8px',
              fontWeight: 700,
              fontSize: '0.8rem'
            }}>
              Versão v1.37.0
            </span>
          </div>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.02em', margin: 0 }}>
            Central de Ajuda, Manual do Usuário e Documentação Técnica
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: '0.35rem 0 0' }}>
            Instruções passo a passo de operação do SVR, regras de negócio e especificações de engenharia.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
          <button
            onClick={openStandalone}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: '#0284c7',
              color: '#ffffff',
              border: 'none',
              padding: '0.65rem 1.25rem',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(2, 132, 199, 0.35)',
              transition: 'all 0.2s'
            }}
          >
            <ExternalLink size={17} /> Abrir Portal Dedicado
          </button>
          <button
            onClick={() => window.print()}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: 'rgba(255, 255, 255, 0.08)',
              color: '#f1f5f9',
              border: '1px solid rgba(255, 255, 255, 0.15)',
              padding: '0.65rem 1.15rem',
              borderRadius: '10px',
              fontWeight: 600,
              fontSize: '0.9rem',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
          >
            <Printer size={17} /> Imprimir / PDF
          </button>
        </div>
      </div>

      {/* Mode Switcher & Search Bar */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem',
        marginBottom: '2rem'
      }}>
        {/* Tab Selection */}
        <div style={{
          display: 'flex',
          background: 'rgba(15, 23, 42, 0.8)',
          padding: '4px',
          borderRadius: '12px',
          border: '1px solid rgba(255, 255, 255, 0.08)'
        }}>
          <button
            onClick={() => setActiveTab('manual')}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'manual' ? '#0284c7' : 'transparent',
              color: activeTab === 'manual' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: '0.2s'
            }}
          >
            <BookOpen size={18} /> Manual do Usuário (Operacional)
          </button>
          <button
            onClick={() => setActiveTab('tecnica')}
            style={{
              padding: '0.6rem 1.4rem',
              borderRadius: '8px',
              border: 'none',
              background: activeTab === 'tecnica' ? '#0284c7' : 'transparent',
              color: activeTab === 'tecnica' ? '#ffffff' : '#94a3b8',
              fontWeight: 700,
              fontSize: '0.92rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              transition: '0.2s'
            }}
          >
            <Terminal size={18} /> Documentação Técnica & Arquitetura
          </button>
        </div>

        {/* Real-time search */}
        <div style={{ position: 'relative', width: '340px' }}>
          <Search size={18} style={{
            position: 'absolute',
            left: '1rem',
            top: '50%',
            transform: 'translateY(-50%)',
            color: '#64748b'
          }} />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filtrar por tópico, termo ou tela..."
            style={{
              width: '100%',
              background: 'rgba(15, 23, 42, 0.8)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '9999px',
              padding: '0.65rem 1rem 0.65rem 2.6rem',
              color: '#ffffff',
              fontSize: '0.9rem',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
      </div>

      {/* TAB CONTENT: MANUAL DO USUÁRIO */}
      {activeTab === 'manual' && (
        <div>
          {/* Profile Selector Pills */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '1rem',
            marginBottom: '2rem'
          }}>
            <div
              onClick={() => setActiveProfile('militar')}
              style={{
                background: activeProfile === 'militar' ? 'rgba(56, 189, 248, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                border: activeProfile === 'militar' ? '2px solid #38bdf8' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Users size={24} color="#38bdf8" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: 700 }}>1. Policial Voluntário</h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.83rem', color: '#94a3b8' }}>
                Primeiro acesso por CPF, Minhas Escalas, cota de 8 serviços e requerimentos.
              </p>
            </div>

            <div
              onClick={() => setActiveProfile('p3')}
              style={{
                background: activeProfile === 'p3' ? 'rgba(234, 179, 8, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                border: activeProfile === 'p3' ? '2px solid #eab308' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <CalendarCheck size={24} color="#eab308" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: 700 }}>2. Operador P/3</h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.83rem', color: '#94a3b8' }}>
                Painel Drag-and-Drop, montagem de patrulhas, persistência e Memorando A4/PDF.
              </p>
            </div>

            <div
              onClick={() => setActiveProfile('gestor')}
              style={{
                background: activeProfile === 'gestor' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                border: activeProfile === 'gestor' ? '2px solid #10b981' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <DollarSign size={24} color="#10b981" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: 700 }}>3. Gestor & Finanças</h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.83rem', color: '#94a3b8' }}>
                Ciclos (16 a 15), orçamento, cenários A/B, metas e conferência de presença.
              </p>
            </div>

            <div
              onClick={() => setActiveProfile('admin')}
              style={{
                background: activeProfile === 'admin' ? 'rgba(139, 92, 246, 0.15)' : 'rgba(15, 23, 42, 0.6)',
                border: activeProfile === 'admin' ? '2px solid #8b5cf6' : '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '12px',
                padding: '1.25rem',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
                <Shield size={24} color="#8b5cf6" />
                <h3 style={{ margin: 0, fontSize: '1.05rem', color: '#ffffff', fontWeight: 700 }}>4. Administrador & TI</h3>
              </div>
              <p style={{ margin: 0, fontSize: '0.83rem', color: '#94a3b8' }}>
                Desbloqueio de contas, reset de primeiro acesso, RBAC e superusuários.
              </p>
            </div>
          </div>

          {/* ACTIVE PROFILE DETAILED CONTENT */}
          {activeProfile === 'militar' && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '2rem'
            }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#38bdf8', marginBottom: '1.25rem' }}>
                👨‍✈️ Guia Prático do Policial Militar Voluntário
              </h2>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Lock size={18} color="#38bdf8" /> 1º Acesso Seguro (Anti-Sequestro)
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    Para definir sua senha pela primeira vez, clique em <strong>"Primeiro Acesso?"</strong> na tela de login.
                    Você precisará fornecer seu <strong>CPF</strong> e confirmar sua <strong>Matrícula Funcional</strong>.
                    Essa conferência em duas vias impede que terceiros cadastrem senhas em seu nome.
                  </p>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1.5rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                  <h4 style={{ color: '#fff', fontSize: '1rem', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <CalendarCheck size={18} color="#eab308" /> Limite Legal de 8 Serviços
                  </h4>
                  <p style={{ fontSize: '0.85rem', color: '#94a3b8', lineHeight: 1.5 }}>
                    No painel <strong>Minhas Escalas</strong>, acompanhe o contador de cotas (ex: <em>4/8 serviços utilizados</em>).
                    Atingido o teto de 8 serviços no ciclo operacional, o sistema bloqueia automaticamente novas alocações para resguardar seu repouso regulamentar.
                  </p>
                </div>
              </div>

              <div style={{ background: 'rgba(2, 132, 199, 0.1)', border: '1px solid rgba(56, 189, 248, 0.3)', borderRadius: '12px', padding: '1.25rem' }}>
                <h4 style={{ color: '#38bdf8', margin: '0 0 0.5rem' }}>Dica Operacional: Atualização de Contato</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: '#cbd5e1' }}>
                  Mantenha seu telefone/WhatsApp sempre atualizado na aba <strong>"Meu Perfil"</strong>.
                  Caso a P/3 necessite realizar acionamentos de urgência para substituições ou reforço operacional, o número informado no perfil será utilizado.
                </p>
              </div>
            </div>
          )}

          {activeProfile === 'p3' && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '2rem'
            }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#eab308', marginBottom: '1.25rem' }}>
                📋 Guia do Operador e Planejador da P/3
              </h2>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1.25rem', borderRadius: '12px', display: 'flex', gap: '1rem' }}>
                  <div style={{ width: 32, height: 32, background: '#eab308', color: '#000', borderRadius: '50%', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>1</div>
                  <div>
                    <h4 style={{ color: '#fff', margin: '0 0 0.3rem' }}>Seleção de Ciclo e Turno</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                      Selecione o ciclo vigente no topo do <code>AdminDashboardV2</code> e o turno operacional desejado (T1 a T4).
                    </p>
                  </div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1.25rem', borderRadius: '12px', display: 'flex', gap: '1rem' }}>
                  <div style={{ width: 32, height: 32, background: '#eab308', color: '#000', borderRadius: '50%', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>2</div>
                  <div>
                    <h4 style={{ color: '#fff', margin: '0 0 0.3rem' }}>Alocação Drag-and-Drop das Guarnições</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                      Arraste os voluntários aptos da coluna lateral para os slots da viatura (Comandante, Motorista, Patrulheiro). O sistema previne que um mesmo militar seja escalado em duas viaturas simultaneamente.
                    </p>
                  </div>
                </div>

                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1.25rem', borderRadius: '12px', display: 'flex', gap: '1rem' }}>
                  <div style={{ width: 32, height: 32, background: '#eab308', color: '#000', borderRadius: '50%', fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>3</div>
                  <div>
                    <h4 style={{ color: '#fff', margin: '0 0 0.3rem' }}>Salvamento Manual e Publicação do Memorando SVR</h4>
                    <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                      Clique sempre em <strong>"Salvar Escala"</strong> para persistir as alterações. Em seguida, clique em <strong>"Publicar Memorando SVR"</strong> para abrir a pré-visualização A4 e baixar o PDF oficial pronto para assinatura.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeProfile === 'gestor' && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '2rem'
            }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#10b981', marginBottom: '1.25rem' }}>
                💼 Guia do Gestor Operacional e Financeiro
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Diretrizes de abertura de ciclos de 16 a 15, controle orçamentário e conferência de presença para faturamento.
              </p>

              <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1.5rem', borderRadius: '12px', marginBottom: '1.5rem' }}>
                <h4 style={{ color: '#10b981', margin: '0 0 0.5rem' }}>Motor de Otimização e Recálculo Orçamentário</h4>
                <p style={{ fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.6 }}>
                  Ao cadastrar o ciclo, o sistema distribui o orçamento entre dias ordinários (Cenário A - R$ 576,09/equipe) e dias críticos (Cenário B - R$ 750,00/equipe).
                  Se houver cancelamentos ou sobras orçamentárias, o botão <strong>"Recalcular Metas"</strong> reequilibra as viaturas para os dias restantes do ciclo de forma automática.
                </p>
              </div>
            </div>
          )}

          {activeProfile === 'admin' && (
            <div style={{
              background: 'rgba(15, 23, 42, 0.7)',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              borderRadius: '16px',
              padding: '2rem'
            }}>
              <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#8b5cf6', marginBottom: '1.25rem' }}>
                🛡️ Guia do Administrador do Sistema e Suporte Técnico
              </h2>
              <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
                Procedimentos de suporte a usuários, controle de bloqueios de força bruta e governança RBAC.
              </p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1.25rem', borderRadius: '12px' }}>
                  <h4 style={{ color: '#8b5cf6', margin: '0 0 0.5rem' }}>Desbloqueio de Contas</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                    Em <em>Configurações → Gestão de Usuários</em>, localize a conta com status <code>BLOQUEADO</code> (travada após 5 erros) e clique em "Desbloquear" para reativar o acesso imediato.
                  </p>
                </div>
                <div style={{ background: 'rgba(30, 41, 59, 0.5)', padding: '1.25rem', borderRadius: '12px' }}>
                  <h4 style={{ color: '#8b5cf6', margin: '0 0 0.5rem' }}>Trilha de Auditoria (audit_logs)</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8' }}>
                    Superusuários podem acompanhar em tempo real todas as autenticações, IPs de origem e tentativas com falha através do <em>Painel Técnico</em>.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: DOCUMENTAÇÃO TÉCNICA */}
      {activeTab === 'tecnica' && (
        <div>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
            gap: '1.25rem'
          }}>
            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>Volume 01</span>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0.35rem 0 0.6rem' }}>Visão Geral e Negócio</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Contextualização do 9º BPM, SVR, cotas de 8 serviços, ciclos operacionais do dia 16 a 15 e motor <code>CycleEngine</code>.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>Volume 02</span>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0.35rem 0 0.6rem' }}>Arquitetura e Stack</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Arquitetura 3-Tier desacoplada (React 18 + Express 5 + PostgreSQL 16), decisões ADRs e rede Docker isolada.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>Volume 03</span>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0.35rem 0 0.6rem' }}>Modelagem de Dados (3NF)</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Diagrama ERD em Mermaid, DDL completo, integridade referencial e triggers de validação <code>trg_valida_escala_insert</code>.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>Volume 04</span>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0.35rem 0 0.6rem' }}>Segurança & Autenticação</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Login exclusivo por CPF, algoritmo Receita Federal, bcrypt salt 12, perfil SUPERUSER com 2FA TOTP e auditoria imutável.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>Volume 06</span>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0.35rem 0 0.6rem' }}>Catálogo de APIs REST</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Documentação exaustiva de todos os endpoints REST, formato de payload, códigos de retorno e autenticação Bearer JWT.
              </p>
            </div>

            <div style={{ background: 'rgba(15, 23, 42, 0.7)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '1.5rem' }}>
              <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#38bdf8', textTransform: 'uppercase' }}>Volume 07</span>
              <h3 style={{ color: '#fff', fontSize: '1.1rem', margin: '0.35rem 0 0.6rem' }}>Implantação e Operação</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0, lineHeight: 1.5 }}>
                Guia de subida de containers Docker Compose, scripts batch Windows, rotinas de backup PostgreSQL e migrações.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DocsPortal;
