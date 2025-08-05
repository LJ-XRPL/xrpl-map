import React from 'react';
import { getTransactionExplorerLink } from '../utils/formatters.js';

const TransactionFeed = ({ transactions }) => {
  return (
    <div className="transaction-feed">
      <div className="transaction-stream">
        {transactions.map(tx => (
          <a 
            key={`${tx.id}-1`} 
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
        {transactions.map(tx => (
          <a 
            key={`${tx.id}-2`} 
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