import React from 'react';

interface AlreadyLoggedInProps {
  ownerLabel?: string;
  onReturnToActive?: () => void;
}

/**
 * Component shown when user tries to access the app but is already logged in elsewhere
 * or when a cooldown is active
 */
export const AlreadyLoggedIn: React.FC<AlreadyLoggedInProps> = ({ 
  ownerLabel,
  onReturnToActive 
}) => {
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.95)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      color: 'white',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", "Oxygen", "Ubuntu", "Cantarell", "Fira Sans", "Droid Sans", "Helvetica Neue", sans-serif',
      zIndex: 999999,
      padding: '20px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '72px', marginBottom: '24px' }}>
        🔐
      </div>
      
      <h1 style={{
        fontSize: '32px',
        fontWeight: '600',
        marginBottom: '16px',
        maxWidth: '600px'
      }}>
        Session Active Elsewhere
      </h1>
      
      {ownerLabel && (
        <div style={{
          fontSize: '18px',
          color: 'rgba(255, 255, 255, 0.8)',
          marginBottom: '32px',
          maxWidth: '600px',
          lineHeight: '1.6'
        }}>
          <p style={{ marginBottom: '16px' }}>
            Your account is currently active on:
          </p>
          <p style={{
            fontSize: '20px',
            fontWeight: '500',
            color: '#4a9eff',
            padding: '12px 20px',
            backgroundColor: 'rgba(74, 158, 255, 0.1)',
            borderRadius: '8px',
            display: 'inline-block'
          }}>
            {ownerLabel}
          </p>
        </div>
      )}
      
      <div style={{
        fontSize: '16px',
        color: 'rgba(255, 255, 255, 0.7)',
        maxWidth: '500px',
        lineHeight: '1.6',
        marginBottom: '32px'
      }}>
        <p style={{ marginBottom: '12px' }}>
          To continue on this device, please:
        </p>
        <ul style={{
          listStyle: 'none',
          padding: 0,
          textAlign: 'left',
          display: 'inline-block'
        }}>
          <li style={{ marginBottom: '8px' }}>
            • Log out from your active session
          </li>
          <li style={{ marginBottom: '8px' }}>
            • Or wait for your current session to expire
          </li>
          <li>
            • Then refresh this page to log in again
          </li>
        </ul>
      </div>
      
      {onReturnToActive && (
        <button
          onClick={onReturnToActive}
          style={{
            padding: '12px 32px',
            fontSize: '16px',
            fontWeight: '500',
            backgroundColor: '#4a9eff',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
            marginBottom: '16px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#3a8eef';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = '#4a9eff';
          }}
        >
          Return to Active Session
        </button>
      )}
      
      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 32px',
          fontSize: '16px',
          fontWeight: '500',
          backgroundColor: 'rgba(255, 255, 255, 0.1)',
          color: 'white',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.15)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
        }}
      >
        Refresh Page
      </button>
      
      <div style={{
        marginTop: '48px',
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.5)'
      }}>
        This security measure prevents account sharing
      </div>
    </div>
  );
};

export default AlreadyLoggedIn;
