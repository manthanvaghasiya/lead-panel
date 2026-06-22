export const extractMobileNumbers = (mobileStr) => {
  if (!mobileStr) return [];
  // Split by comma, slash, ampersand, pipe, or the word "and"
  const parts = mobileStr.split(/[,/&|]+|\s+and\s+/i);
  // Extract digits only and keep those with at least 10 digits
  const numbers = parts
    .map(p => p.replace(/\D/g, ''))
    .filter(n => n.length >= 10);
  
  // Return unique numbers
  return [...new Set(numbers)];
};
