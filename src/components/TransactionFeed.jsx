import React from 'react';

const TransactionFeed = ({ transactions }) => {
  return (
    <div className="transaction-feed">
      <div className="transaction-stream">
        {transactions.map(tx => (
          <div key={`${tx.id}-1`} className="transaction-item">
            <div className="tx-type" style={{ color: tx.color }}>
              {tx.type.toUpperCase()}
            </div>
            <div className="tx-issuer">{tx.issuerName}</div>
            <div className="tx-details">
              <div className="tx-amount">
                {tx.amount.toLocaleString()} {tx.currency}
              </div>
              <div className="tx-location">{tx.city}</div>
            </div>
          </div>
        ))}
        {/* Duplicate for seamless scroll */}
        {transactions.map(tx => (
          <div key={`${tx.id}-2`} className="transaction-item">
            <div className="tx-type" style={{ color: tx.color }}>
              {tx.type.toUpperCase()}
            </div>
            <div className="tx-issuer">{tx.issuerName}</div>
            <div className="tx-details">
              <div className="tx-amount">
                {tx.amount.toLocaleString()} {tx.currency}
              </div>
              <div className="tx-location">{tx.city}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TransactionFeed;