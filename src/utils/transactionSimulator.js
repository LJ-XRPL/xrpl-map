// Transaction simulation utilities
export const generateTransactionId = () => {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
};

export const generateTransactionAmount = (baseAmount) => {
  // Generate amounts between 1% and 10% of the base amount
  const min = baseAmount * 0.01;
  const max = baseAmount * 0.1;
  return Math.floor(Math.random() * (max - min) + min);
};

export const getRandomTransactionType = () => {
  const types = ['payment', 'offer', 'trust', 'escrow'];
  return types[Math.floor(Math.random() * types.length)];
};

export const getTransactionColor = (type) => {
  const colors = {
    payment: '#00ff88',  // Green for payments
    offer: '#ff6b6b',    // Red for offers
    trust: '#4ecdc4',    // Teal for trust lines
    escrow: '#ffe66d'    // Yellow for escrow
  };
  return colors[type] || '#ffffff';
};

export const simulateTransaction = (issuer) => {
  const txType = getRandomTransactionType();
  return {
    id: generateTransactionId(),
    from: issuer.issuer,
    to: `r${Math.random().toString(36).substring(2, 15)}...`,
    amount: generateTransactionAmount(issuer.amount),
    currency: issuer.currency,
    type: txType,
    timestamp: Date.now(),
    lat: issuer.lat,
    lng: issuer.lng,
    city: issuer.city,
    issuerName: issuer.name,
    color: getTransactionColor(txType)
  };
}; 