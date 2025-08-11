import React from 'react';
import { getTransactionExplorerLink } from '../utils/formatters.js';

const TransactionFeed = ({ transactions, activeFilters = [] }) => {
  // Filter transactions based on active filters
  const filteredTransactions = activeFilters.length > 0 
    ? transactions.filter(tx => activeFilters.includes(tx.type))
    : transactions;

  return (
    <div className="transaction-feed">
      <div className="transaction-stream">
        {filteredTransactions.map((tx, index) => (
          <a 
            key={`${tx.id}-${tx.timestamp}-${index}`} 
            href={getTransactionExplorerLink(tx.hash)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="transaction-item transaction-link"
          >
            <div className="tx-type" style={{ color: tx.color }}>
              {tx.type.toUpperCase()}
            </div>
            <div className="tx-issuer">{tx.issuerName}</div>
            <div className="tx-details">
              <div className="tx-amount">
                {typeof tx.amount === 'number' ? tx.amount.toLocaleString() : tx.amount} {tx.currency}
              </div>
              <div className="tx-location">{tx.city}</div>
            </div>
          </a>
        ))}
        {/* Duplicate for seamless scroll */}
        {filteredTransactions.map((tx, index) => (
          <a 
            key={`${tx.id}-${tx.timestamp}-${index}-duplicate`} 
            href={getTransactionExplorerLink(tx.hash)} 
            target="_blank" 
            rel="noopener noreferrer"
            className="transaction-item transaction-link"
          >
            <div className="tx-type" style={{ color: tx.color }}>
              {tx.type.toUpperCase()}
            </div>
            <div className="tx-issuer">{tx.issuerName}</div>
            <div className="tx-details">
              <div className="tx-amount">
                {typeof tx.amount === 'number' ? tx.amount.toLocaleString() : tx.amount} {tx.currency}
              </div>
              <div className="tx-location">{tx.city}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

export default TransactionFeed;