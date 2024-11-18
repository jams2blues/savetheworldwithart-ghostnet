// src/utils/ecologiApi.js
import axios from 'axios';

const API_BASE_URL = 'https://public.ecologi.com/users';

/**
 * Fetches the total number of trees planted by the user.
 * @param {string} username - Ecologi username.
 * @returns {Promise<number>} - Total trees planted.
 */
export const getTotalTrees = async (username) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${username}/trees`, {
      headers: { 'Accept': 'application/json' },
    });
    return response.data.total;
  } catch (error) {
    console.error('Error fetching total trees:', error);
    return 0;
  }
};

/**
 * Fetches the total carbon offset in metric tons by the user.
 * @param {string} username - Ecologi username.
 * @returns {Promise<number>} - Total carbon offset.
 */
export const getTotalCarbonOffset = async (username) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${username}/carbon-offset`, {
      headers: { 'Accept': 'application/json' },
    });
    return response.data.total;
  } catch (error) {
    console.error('Error fetching total carbon offset:', error);
    return 0;
  }
};

/**
 * Fetches the total impact (trees planted and carbon offset) by the user.
 * @param {string} username - Ecologi username.
 * @returns {Promise<{trees: number, carbonOffset: number}>} - Total impact data.
 */
export const getTotalImpact = async (username) => {
  try {
    const response = await axios.get(`${API_BASE_URL}/${username}/impact`, {
      headers: { 'Accept': 'application/json' },
    });
    // Ensure the response has the expected fields
    const { trees, carbonOffset } = response.data;
    return {
      trees: typeof trees === 'number' ? trees : 0,
      carbonOffset: typeof carbonOffset === 'number' ? carbonOffset : 0,
    };
  } catch (error) {
    console.error('Error fetching total impact:', error);
    return { trees: 0, carbonOffset: 0 };
  }
};
