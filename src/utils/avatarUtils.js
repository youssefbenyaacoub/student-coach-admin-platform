/**
 * Generates a deterministic DiceBear avatar URL based on a seed (e.g., user name or email).
 * @param {string} seed - The seed string for deterministic generation.
 * @returns {string} The URL of the generated avatar.
 */
export const getAvatarUrl = (seed) => {
    const safeSeed = seed || 'incubator-default-seed';
    return `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(safeSeed)}&backgroundColor=b6e3f4,c0aede,d1d4f9`;
};
