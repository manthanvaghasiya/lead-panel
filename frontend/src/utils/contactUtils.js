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

export const defaultWhatsappMessage = `જય શ્રી કૃષ્ણ, Webiox Digital Solution માંથી મંથન. આપણી વાત થઈ હતી એ મુજબ, અમારા પ્રીમિયમ કાર ડીલર પ્રોજેક્ટ્સની ડિટેલ્સ નીચે મુજબ છે.

અમે ટોપ કાર શોરૂમ્સ માટે ડિજિટલ પ્લેટફોર્મ બનાવીએ છીએ, જેથી કસ્ટમર સીધા મોબાઈલમાં જ લાઈવ સ્ટોક જોઈ શકે. તમે અમારા લાઈવ પ્રોજેક્ટ્સ અહીં ચેક કરી શકો છો:

🚘 HARIRAM car: > https://haririamcars.vercel.app/
🚘 Sadguru Car Surat: > https://sadgurucarsurat.com/
🚘 carnest: > https://carnest.in/  etc.

સાહેબ, એકવાર શાંતિથી આ શોરૂમની સાઇટ્સ જોજો—એની સ્પીડ અને પ્રીમિયમ લુક ચેક કરજો. તમારા શોરૂમને આવો જ ડિજિટલ લુક આપવો છે. આપના રિપ્લાયની રાહ રહેશે. આભાર!`;

