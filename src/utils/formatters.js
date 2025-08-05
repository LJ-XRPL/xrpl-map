export const truncateAddress = (address, chars = 6) => {
  if (!address) {
    return "";
  }
  const start = address.substring(0, chars);
  const end = address.substring(address.length - chars);
  return `${start}...${end}`;
};

export const getExplorerLink = (address) => {
  return `https://livenet.xrpl.org/accounts/${address}`;
};

export const getTransactionExplorerLink = (txHash) => {
  return `https://livenet.xrpl.org/transactions/${txHash}`;
};
