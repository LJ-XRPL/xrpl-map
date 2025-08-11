import React, { useState } from 'react';
import '../styles/TransactionTypeSelector.css';

const TransactionTypeSelector = ({ onFilterChange, activeFilters }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const transactionTypes = [
    { id: 'Payment', label: 'Payment', icon: '💸', color: '#00ff88' },
    { id: 'OfferCreate', label: 'Offer Create', icon: '📈', color: '#ff6b6b' },
    { id: 'OfferCancel', label: 'Offer Cancel', icon: '❌', color: '#ff9500' },
    { id: 'TrustSet', label: 'Trust Set', icon: '🤝', color: '#4ecdc4' },
    { id: 'EscrowCreate', label: 'Escrow Create', icon: '🔒', color: '#ffe66d' },
    { id: 'EscrowFinish', label: 'Escrow Finish', icon: '✅', color: '#90EE90' },
    { id: 'NFTokenMint', label: 'NFT Mint', icon: '🎨', color: '#9d4edd' },
    { id: 'CheckCreate', label: 'Check Create', icon: '💰', color: '#ffd23f' },
    { id: 'CheckCash', label: 'Check Cash', icon: '💳', color: '#06ffa5' }
  ];

  const handleFilterToggle = (typeId) => {
    const newFilters = activeFilters.includes(typeId)
      ? activeFilters.filter(id => id !== typeId)
      : [...activeFilters, typeId];
    
    onFilterChange(newFilters);
  };

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  const activeCount = activeFilters.length;
  const totalCount = transactionTypes.length;
  const hasActiveFilters = activeCount > 0 && activeCount < totalCount;

  return (
    <div className={`transaction-type-selector ${isExpanded ? 'expanded' : ''}`}>
      <div className="selector-header" onClick={toggleExpanded}>
        <div className="header-content">
          <span className="header-icon">🎛️</span>
          <span className="header-text">Transaction Types</span>
          <span className="filter-count">{activeCount}/{totalCount}</span>
          {hasActiveFilters && <span className="mobile-filter-indicator">●</span>}
        </div>
        <div className={`expand-arrow ${isExpanded ? 'expanded' : ''}`}>▼</div>
      </div>
      
      {isExpanded && (
        <div className="selector-content">
          <div className="filter-actions">
            <button 
              className="filter-btn select-all"
              onClick={() => onFilterChange(transactionTypes.map(t => t.id))}
            >
              Select All
            </button>
            <button 
              className="filter-btn clear-all"
              onClick={() => onFilterChange([])}
            >
              Clear All
            </button>
          </div>
          
          <div className="type-filters">
            {transactionTypes.map(type => (
              <div 
                key={type.id}
                className={`type-filter ${activeFilters.includes(type.id) ? 'active' : ''}`}
                onClick={() => handleFilterToggle(type.id)}
              >
                <div 
                  className="type-color-indicator"
                  style={{ backgroundColor: type.color }}
                ></div>
                <span className="type-icon">{type.icon}</span>
                <span className="type-label">{type.label}</span>
                <div className="type-checkbox">
                  {activeFilters.includes(type.id) && <span>✓</span>}
                </div>
              </div>
            ))}
          </div>
          
          <div className="filter-status">
            {activeCount === 0 && (
              <span className="status-message warning">⚠️ No transaction types selected</span>
            )}
            {activeCount === totalCount && (
              <span className="status-message success">✅ All transaction types active</span>
            )}
            {activeCount > 0 && activeCount < totalCount && (
              <span className="status-message info">📊 {activeCount} of {totalCount} types active</span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionTypeSelector; 