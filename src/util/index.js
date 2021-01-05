/**
 *
 * @param {string} key Key to save to
 * @param {any} content Raw content
 */
export const cacheToLocalStorage = (key, content) => {
  return window.localStorage.setItem(key, JSON.stringify(content));
};

/**
 *
 * @param {string} key Key to fetch from
 */
export const hydrateFromLocalStorage = (key) => {
  return JSON.parse(window.localStorage.getItem(key));
};
