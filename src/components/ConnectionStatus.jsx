import React, { useState, useEffect } from 'react';
import './ConnectionStatus.css';

const ConnectionStatus = ({ isConnected, isConnecting, connectionError }) => {
  const [showModal, setShowModal] = useState(false);
  const [pulseAnimation, setPulseAnimation] = useState(false);

  useEffect(() => {
    // Show modal when connecting
    if (isConnecting) {
      setShowModal(true);
      setPulseAnimation(true);
    } else if (isConnected) {
      // Hide modal after successful connection with delay
      setTimeout(() => {
        setShowModal(false);
        setPulseAnimation(false);
      }, 2000);
    } else if (connectionError) {
      // Keep modal open for errors
      setPulseAnimation(false);
    }
  }, [isConnected, isConnecting, connectionError]);

  if (!showModal) return null;

  return (
    <div className="connection-status-overlay">
      <div className={`connection-status-modal ${pulseAnimation ? 'pulse' : ''}`}>
        <div className="connection-header">
          <div className="connection-icon">
            {isConnecting && (
              <div className="spinner">
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
                <div className="spinner-ring"></div>
              </div>
            )}
            {isConnected && <span className="success-icon">✅</span>}
            {connectionError && <span className="error-icon">❌</span>}
          </div>
          <h3 className="connection-title">
            {isConnecting && 'Connecting to XRPL'}
            {isConnected && 'Connected to XRPL'}
            {connectionError && 'Connection Failed'}
          </h3>
        </div>
        
        <div className="connection-body">
          {isConnecting && (
            <>
              <p className="connection-message">
                Establishing secure connection to XRP Ledger...
              </p>
              <div className="connection-progress">
                <div className="progress-bar">
                  <div className="progress-fill"></div>
                </div>
                <span className="progress-text">Initializing...</span>
              </div>
            </>
          )}
          
          {isConnected && (
            <>
              <p className="connection-message success">
                Successfully connected to XRPL network
              </p>
              <div className="connection-details">
                <div className="detail-item">
                  <span className="detail-label">Status:</span>
                  <span className="detail-value success">Live</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Network:</span>
                  <span className="detail-value">Mainnet</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Mode:</span>
                  <span className="detail-value">Real-time</span>
                </div>
              </div>
            </>
          )}
          
                     {connectionError && (
             <>
               <p className="connection-message error">
                 Failed to connect to XRPL network
               </p>
               <div className="error-details">
                 <p className="error-text">{connectionError}</p>
                 <div className="retry-options">
                   <button 
                     className="retry-button"
                     onClick={() => window.location.reload()}
                   >
                     🔄 Retry Connection
                   </button>
                   <button 
                     className="retry-button secondary"
                     onClick={() => {
                       setShowModal(false);
                       setTimeout(() => setShowModal(true), 100);
                     }}
                   >
                     🔄 Try Alternative Server
                   </button>
                 </div>
               </div>
             </>
           )}
        </div>
        
        {isConnected && (
          <div className="connection-footer">
            <button 
              className="close-button"
              onClick={() => setShowModal(false)}
            >
              Got it
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ConnectionStatus; 