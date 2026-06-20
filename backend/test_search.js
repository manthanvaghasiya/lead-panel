require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
  model: "gemini-2.5-flash",
  tools: [{ googleSearch: {} }]
});

async function run() {
  try {
    const result = await model.generateContent("What are the google reviews for Shree Krishna Auto in Jamnagar?");
    console.log(result.response.text());
  } catch (err) {
    console.error(err);
  }
}
run();
