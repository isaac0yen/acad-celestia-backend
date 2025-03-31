/**
 * Generate a random token ID for JWT validation
 * @param {number} length - Length of the token ID (default: 10)
 * @returns {string} Random token ID
 */
function generateTokenId(length = 10) {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length);
    result += characters.charAt(randomIndex);
  }
  
  return result;
}

module.exports = {
  generateTokenId
};
