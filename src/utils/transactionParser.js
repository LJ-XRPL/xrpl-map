/**
 * Transaction Parser Utility
 * Handles parsing of XRPL transactions and extracting meaningful amounts
 */

import rwaData from '../data/rwas.js';
import stablecoinData from '../data/stablecoins.js';

/**
 * Builds a mapping of issuer addresses to currency codes from data files
 * @returns {Object} - Mapping of issuer addresses to currency codes
 */
const buildIssuerCurrencyMap = () => {
  const issuerMap = {};
  
  // Add RWA issuers
  rwaData.forEach(region => {
    region.assets.forEach(asset => {
      issuerMap[asset.issuer] = asset.currency;
    });
  });
  
  // Add stablecoin issuers
  stablecoinData.forEach(region => {
    region.coins.forEach(coin => {
      issuerMap[coin.issuer] = coin.currency;
    });
  });
  
  return issuerMap;
};

/**
 * Parses an XRPL transaction and extracts amount, currency, and other details
 * @param {Object} txData - Transaction data from XRPL
 * @param {Array} mapData - Array of issuer data for matching
 * @returns {Object|null} - Parsed transaction object or null if should be filtered
 */
export const parseTransaction = (txData, mapData) => {
  const tx = txData.transaction;
  const hash = txData.hash || tx.hash;
  
  // Find the correct issuer based on the transaction account
  const issuer = findMatchingIssuer(tx, mapData);
  
  if (!issuer) {
    // Only log for BBRL and EUROP since we silenced RLUSD logs
    if (tx.Account === 'rH5CJsqvNqZGxrMyGaqLEoMWRYcVTAPZMt') {
      console.log('🤷 No matching issuer found for BBRL transaction');
    } else if (tx.Account === 'rMkEuRii9w9uBMQDnWV5AA43gvYZR9JxVK') {
      console.log('🤷 No matching issuer found for EUROP transaction');
    }
    return null;
  }

  // Parse amount and currency
  const { amount, currency } = parseTransactionAmount(tx, issuer);
  
  // Skip transactions without meaningful amounts
  if (amount === null || (typeof amount === 'string' && amount === '0.00')) {
    return null;
  }

  return {
    id: hash,
    hash: hash,
    from: tx.Account,
    to: tx.Destination || 'Market',
    amount: amount,
    currency: currency,
    type: tx.TransactionType || 'Unknown',
    timestamp: Date.now(),
    lat: issuer.lat,
    lng: issuer.lng,
    city: issuer.city,
    issuerName: issuer.name,
  };
};

/**
 * Finds the matching issuer for a transaction
 * @param {Object} tx - Transaction object
 * @param {Array} mapData - Array of issuer data
 * @returns {Object|null} - Matching issuer or null
 */
const findMatchingIssuer = (tx, mapData) => {
  return mapData.find(item => 
    item.issuer === tx.Account || 
    item.issuer === tx.Destination ||
    // For offers, check if the currency matches our tracked issuers
    (tx.TakerPays && typeof tx.TakerPays === 'object' && tx.TakerPays.issuer === item.issuer) ||
    (tx.TakerGets && typeof tx.TakerGets === 'object' && tx.TakerGets.issuer === item.issuer)
  );
};

/**
 * Parses transaction amount based on transaction type
 * @param {Object} tx - Transaction object
 * @param {Object} issuer - Issuer information
 * @returns {Object} - Object with amount and currency
 */
const parseTransactionAmount = (tx, issuer) => {
  let amount = null;
  let currency = issuer.currency;
  
  // Only process transactions that have meaningful amounts
  if (tx.TransactionType === 'Payment' && tx.Amount) {
    const paymentResult = parsePaymentAmount(tx.Amount, issuer);
    amount = paymentResult.amount;
    currency = paymentResult.currency;
  } else if (tx.TransactionType === 'OfferCreate' && tx.TakerPays) {
    const offerResult = parseOfferAmount(tx.TakerPays, issuer);
    amount = offerResult.amount;
    currency = offerResult.currency;
  } else if (tx.TransactionType === 'OfferCancel') {
    // Show cancelled offers but with special amount
    amount = 'Cancelled';
    currency = issuer.currency;
  }
  
  return { amount, currency };
};

/**
 * Parses payment transaction amounts
 * @param {Object|string} txAmount - Transaction amount field
 * @param {Object} issuer - Issuer information
 * @returns {Object} - Object with amount and currency
 */
const parsePaymentAmount = (txAmount, issuer) => {
  let amount = null;
  let currency = issuer.currency;
  
  if (typeof txAmount === 'string') {
    // XRP payment in drops
    const xrpAmount = parseInt(txAmount) / 1000000;
    if (xrpAmount > 0) {
      amount = xrpAmount.toFixed(2);
      currency = 'XRP';
    }
  } else if (typeof txAmount === 'object' && txAmount.value) {
    // Token payment
    const amountValue = parseFloat(txAmount.value);
    if (!isNaN(amountValue) && amountValue > 0) {
      amount = amountValue.toFixed(2);
      currency = getCurrencyFromIssuer(txAmount.issuer, issuer);
    }
  }
  
  return { amount, currency };
};

/**
 * Parses offer transaction amounts
 * @param {Object|string} takerPays - TakerPays field from offer
 * @param {Object} issuer - Issuer information
 * @returns {Object} - Object with amount and currency
 */
const parseOfferAmount = (takerPays, issuer) => {
  let amount = null;
  let currency = issuer.currency;
  
  if (typeof takerPays === 'object' && takerPays.value) {
    const offerAmount = parseFloat(takerPays.value);
    if (!isNaN(offerAmount) && offerAmount > 0) {
      amount = offerAmount.toFixed(2);
      currency = issuer.currency;
    }
  } else if (typeof takerPays === 'string') {
    // XRP offer
    const xrpAmount = parseInt(takerPays) / 1000000;
    if (xrpAmount > 0) {
      amount = xrpAmount.toFixed(2);
      currency = 'XRP';
    }
  }
  
  return { amount, currency };
};

/**
 * Determines currency based on issuer address
 * @param {string} issuerAddress - XRPL issuer address
 * @param {Object} fallbackIssuer - Fallback issuer object
 * @returns {string} - Currency code
 */
const getCurrencyFromIssuer = (issuerAddress, fallbackIssuer) => {
  // Build dynamic mapping from data files
  const knownIssuers = buildIssuerCurrencyMap();
  
  return knownIssuers[issuerAddress] || fallbackIssuer.currency;
};

/**
 * Checks if a transaction should be logged (all currencies)
 * @param {Object} transaction - Parsed transaction object
 * @returns {boolean} - Whether to log the transaction
 */
export const shouldLogTransaction = (transaction) => {
  // Log all transactions including RLUSD
  return true;
};