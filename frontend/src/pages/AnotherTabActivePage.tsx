import React from 'react';

/**
 * Component shown when another tab is active
 * Displays when user opens multiple tabs with the same session
 */
export const AnotherTabActive: React.FC = () => {
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
        ⚠️
      </div>
      
      <h1 style={{
        fontSize: '32px',
        fontWeight: '600',
        marginBottom: '16px',
        maxWidth: '600px',
        margin: '0 auto 16px'
      }}>
        Another Tab is Active
      </h1>
      
      <p style={{
        fontSize: '18px',
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: '24px',
        maxWidth: '600px',
        lineHeight: '1.6'
      }}>
        You already have this application open in another tab.
        Please use that tab, or close it to continue here.
      </p>
      
      <div style={{
        fontSize: '14px',
        color: 'rgba(255, 255, 255, 0.6)',
        maxWidth: '500px',
        lineHeight: '1.6',
        marginBottom: '32px'
      }}>
        This security measure prevents using multiple tabs simultaneously
        to protect against account sharing.
      </div>

      <button
        onClick={() => window.location.reload()}
        style={{
          padding: '12px 32px',
          fontSize: '16px',
          fontWeight: '500',
          backgroundColor: '#4a9eff',
          color: 'white',
          border: 'none',
          borderRadius: '8px',
          cursor: 'pointer',
          transition: 'background-color 0.2s'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = '#3a8eef';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = '#4a9eff';
        }}
      >
        Refresh Page
      </button>
      
      <div style={{
        marginTop: '48px',
        fontSize: '12px',
        color: 'rgba(255, 255, 255, 0.4)'
      }}>
        Close the other tab to activate this one
      </div>
    </div>
  );
};

export default AnotherTabActive;
