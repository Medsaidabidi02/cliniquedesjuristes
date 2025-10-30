import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';

/**
 * Session Active Page
 * Shown when user tries to login while already having an active session elsewhere
 */
const SessionActivePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [countdown, setCountdown] = useState<number>(0);
  
  // Get data from location state
  const state = location.state as any;
  const ownerLabel = state?.ownerLabel || 'un autre appareil';
  const remainingMinutes = state?.remainingMinutes || 0;
  const attemptCount = state?.attemptCount || 0;
  const inCooldown = state?.inCooldown || false;

  // Countdown timer
  useEffect(() => {
    if (remainingMinutes > 0) {
      setCountdown(remainingMinutes * 60); // Convert to seconds
      
      const timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
    return undefined;
  }, [remainingMinutes]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#f5f5f5' }}>
      <Header />
      
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 80px)',
        padding: '40px 20px'
      }}>
        <div style={{
          maxWidth: '600px',
          width: '100%',
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.1)',
          padding: '48px',
          textAlign: 'center'
        }}>
          {/* Icon */}
          <div style={{ fontSize: '72px', marginBottom: '24px' }}>
            {inCooldown ? '⏱️' : '🔐'}
          </div>
          
          {/* Title */}
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            color: '#1a1a1a',
            marginBottom: '16px'
          }}>
            {inCooldown ? 'Compte Temporairement Verrouillé' : 'Session Déjà Active'}
          </h1>
          
          {/* Main message */}
          <p style={{
            fontSize: '18px',
            color: '#666',
            lineHeight: '1.6',
            marginBottom: '24px'
          }}>
            {inCooldown ? (
              <>
                Vous avez effectué <strong>{attemptCount} tentatives</strong> de connexion alors que votre compte était déjà actif ailleurs.
                <br /><br />
                Pour protéger contre le partage de compte, une période de cooldown a été appliquée.
              </>
            ) : (
              <>
                Votre compte est actuellement actif sur:
                <br />
                <strong style={{ color: '#4a9eff', fontSize: '20px' }}>{ownerLabel}</strong>
              </>
            )}
          </p>

          {/* Cooldown timer */}
          {inCooldown && countdown > 0 && (
            <div style={{
              backgroundColor: '#fff3cd',
              border: '2px solid #ffc107',
              borderRadius: '12px',
              padding: '24px',
              marginBottom: '24px'
            }}>
              <div style={{ fontSize: '48px', fontWeight: '700', color: '#856404', marginBottom: '8px' }}>
                {formatTime(countdown)}
              </div>
              <div style={{ fontSize: '14px', color: '#856404' }}>
                Temps restant avant nouvelle tentative
              </div>
            </div>
          )}

          {/* Instructions */}
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '12px',
            padding: '24px',
            marginBottom: '24px',
            textAlign: 'left'
          }}>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: '#1a1a1a',
              marginBottom: '16px'
            }}>
              {inCooldown ? 'Que faire ?' : 'Pour continuer sur cet appareil:'}
            </h3>
            <ul style={{
              listStyle: 'none',
              padding: 0,
              margin: 0,
              fontSize: '16px',
              color: '#666',
              lineHeight: '1.8'
            }}>
              {inCooldown ? (
                <>
                  <li style={{ marginBottom: '12px' }}>
                    ✓ Attendez la fin du cooldown ({remainingMinutes} minutes)
                  </li>
                  <li style={{ marginBottom: '12px' }}>
                    ✓ Déconnectez-vous de votre session active
                  </li>
                  <li>
                    ✓ Évitez de vous connecter depuis plusieurs appareils simultanément
                  </li>
                </>
              ) : (
                <>
                  <li style={{ marginBottom: '12px' }}>
                    1. Déconnectez-vous de votre session active
                  </li>
                  <li style={{ marginBottom: '12px' }}>
                    2. Revenez sur cette page
                  </li>
                  <li>
                    3. Connectez-vous à nouveau
                  </li>
                  {attemptCount > 0 && (
                    <li style={{ marginTop: '16px', color: '#856404', fontStyle: 'italic' }}>
                      ⚠️ Attention: {attemptCount}/5 tentatives utilisées. Après 5 tentatives, un cooldown sera appliqué.
                    </li>
                  )}
                </>
              )}
            </ul>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => navigate('/login')}
              disabled={inCooldown && countdown > 0}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '500',
                backgroundColor: inCooldown && countdown > 0 ? '#ccc' : '#4a9eff',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: inCooldown && countdown > 0 ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                opacity: inCooldown && countdown > 0 ? 0.6 : 1
              }}
              onMouseEnter={(e) => {
                if (!inCooldown || countdown === 0) {
                  e.currentTarget.style.backgroundColor = '#3a8eef';
                }
              }}
              onMouseLeave={(e) => {
                if (!inCooldown || countdown === 0) {
                  e.currentTarget.style.backgroundColor = '#4a9eff';
                }
              }}
            >
              {inCooldown && countdown > 0 ? 'Veuillez patienter...' : 'Retour à la connexion'}
            </button>
            
            <button
              onClick={() => window.location.reload()}
              style={{
                padding: '12px 32px',
                fontSize: '16px',
                fontWeight: '500',
                backgroundColor: 'transparent',
                color: '#4a9eff',
                border: '2px solid #4a9eff',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#f0f8ff';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              Rafraîchir
            </button>
          </div>

          {/* Help text */}
          <p style={{
            marginTop: '32px',
            fontSize: '14px',
            color: '#999'
          }}>
            Cette mesure de sécurité empêche le partage de compte.
            <br />
            Vous ne pouvez être connecté que sur un seul appareil à la fois.
          </p>
        </div>
      </div>
    </div>
  );
};

export default SessionActivePage;
