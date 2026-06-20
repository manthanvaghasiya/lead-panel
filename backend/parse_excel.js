const xlsx = require('xlsx');

const workbook = xlsx.readFile('d:\\webiox lead panel\\frontend\\public\\lead data.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];

const data = xlsx.utils.sheet_to_json(worksheet);
console.log("First row keys:", Object.keys(data[0]));
const arkanRow = data.find(r => JSON.stringify(r).toLowerCase().includes('arkan'));
console.log("Arkan row keys:", Object.keys(arkanRow));
