// utils/pdfParser.js
const pdfParse = require('pdf-parse');

const extractTextFromPDF = async (buffer) => {
  try {
    const data = await pdfParse(buffer);
    return data.text;
  } catch (err) {
    console.error('❌ PDF parsing error:', err);
    return null;
  }
};

module.exports = extractTextFromPDF;
