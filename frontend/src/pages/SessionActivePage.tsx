import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { api } from '../lib/api';
import Header from '../components/Header';
import { useTranslation } from 'react-i18next';
import '../styles/SessionActivePage.css';

const SessionActivePage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(0);
  const [attemptsRemaining, setAttemptsRemaining] = useState<number>(5);
  const [checking, setChecking] = useState<boolean>(true);

  // Get state from navigation
  const state = location.state as any;

  useEffect(() => {
    // Set initial state from navigation
    if (state) {
      setCooldownMinutes(state.cooldownMinutes || 0);
      setAttemptsRemaining(state.attemptsRemaining || 0);
    }
    setChecking(false);

    // Define check function
    const checkStatus = async () => {
      try {
        const response = await api.get('/auth/session-status');
        
        if (response.sessionValid) {
          // Session is valid again, redirect to login
          console.log('✅ Session is now free, redirecting to login');
          navigate('/login', { 
            state: { message: 'Vous pouvez maintenant vous reconnecter.' }
          });
        } else if (response.cooldownMinutes !== undefined) {
          setCooldownMinutes(response.cooldownMinutes);
        }
      } catch (error) {
        console.log('⚠️ Could not check session status:', error);
      }
    };

    // Poll session status every 30 seconds
    const interval = setInterval(() => {
      checkStatus();
    }, 30000);

    // Initial check
    checkStatus();

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleReturnToLogin = () => {
    navigate('/login');
  };

  return (
    <div className="session-active-page">
      <Header />
      
      <div className="session-active-content">
        <div className="container">
          <div className="session-active-card">
            <div className="session-active-icon">
              <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" fill="currentColor"/>
              </svg>
            </div>
            
            <h1 className="session-active-title">
              {t('session.active.title', 'Session Already Active')}
            </h1>
            
            <p className="session-active-message">
              {t('session.active.message', 'Your account is already active in another session. Please log out from the other device first.')}
            </p>

            {cooldownMinutes > 0 && (
              <div className="cooldown-info">
                <div className="cooldown-timer">
                  <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
                    <path d="M12 6v6l4 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                  <span>{cooldownMinutes} {t('session.active.minutes', 'minute(s)')}</span>
                </div>
                <p className="cooldown-message">
                  {t('session.active.cooldown', 'Too many login attempts. Please wait before trying again.')}
                </p>
              </div>
            )}

            {attemptsRemaining > 0 && cooldownMinutes === 0 && (
              <div className="attempts-info">
                <p>
                  {t('session.active.attempts_remaining', 'Attempts remaining: {{count}}', { count: attemptsRemaining })}
                </p>
              </div>
            )}

            <div className="session-active-actions">
              <button 
                className="btn-primary"
                onClick={handleReturnToLogin}
                disabled={checking}
              >
                {checking ? (
                  <>
                    <div className="loading-spinner" />
                    {t('session.active.checking', 'Checking...')}
                  </>
                ) : (
                  t('session.active.return_to_login', 'Return to Login')
                )}
              </button>
            </div>

            <div className="session-active-info">
              <p>
                {t('session.active.auto_refresh', 'This page will automatically check if the session is available every 30 seconds.')}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SessionActivePage;
