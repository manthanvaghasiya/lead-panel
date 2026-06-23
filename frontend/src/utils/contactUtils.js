export const extractMobileNumbers = (mobileStr) => {
  if (!mobileStr) return [];
  
  // Split by explicit delimiters: , / & | -
  const partsByDelimiter = mobileStr.split(/[,/&|-]+|\s+and\s+/i);
  
  let numbers = [];
  
  partsByDelimiter.forEach(part => {
    // Remove all non-digits
    const digitsOnly = part.replace(/\D/g, '');
    
    // If we have a lot of digits, it might be multiple numbers without delimiters
    if (digitsOnly.length >= 20) {
      // Split into chunks of 10 digits
      const chunks = digitsOnly.match(/.{1,10}/g) || [];
      chunks.forEach(c => {
        if (c.length >= 10) numbers.push(c);
      });
    } else if (digitsOnly.length >= 10) {
      numbers.push(digitsOnly);
    }
  });

  return [...new Set(numbers)];
};
