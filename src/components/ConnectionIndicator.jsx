import React from 'react';
import '../styles/ConnectionIndicator.css';

const ConnectionIndicator = ({ isConnected, isConnecting, connectionError }) => {
  if (isConnected && !isConnecting && !connectionError) {
    return null; // Don't show indicator when fully connected
  }

  return (
    <div className={`connection-indicator ${isConnecting ? 'connecting' : connectionError ? 'error' : 'disconnected'}`}>
      <div className="indicator-dot"></div>
      <span className="indicator-text">
        {isConnecting && 'Connecting...'}
        {connectionError && 'Connection Error'}
        {!isConnected && !isConnecting && !connectionError && 'Disconnected'}
      </span>
    </div>
  );
};

export default ConnectionIndicator; 