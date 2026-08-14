/**
 * Converts a string to Proper Case (Title Case).
 * Handles multi-word strings and hyphens.
 * Example: "software engineer" -> "Software Engineer", "tcs" -> "Tcs"
 */
const toProperCase = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.replace(/\b\w+/g, (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase());
};

/**
 * Capitalizes the entire string (e.g., for PAN cards or IDs).
 */
const toUpperCase = (str) => {
  if (!str || typeof str !== 'string') return str;
  return str.toUpperCase();
};

/**
 * Formats an array of strings to Proper Case.
 */
const toProperCaseArray = (arr) => {
  if (!Array.isArray(arr)) return arr;
  return arr.map(toProperCase);
};

module.exports = {
  toProperCase,
  toUpperCase,
  toProperCaseArray
};
