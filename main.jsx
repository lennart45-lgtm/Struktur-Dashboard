// Ersetzt die Claude window.storage API durch localStorage
// Daten werden im Browser gespeichert und bleiben dauerhaft erhalten

const PREFIX = 'machbau_';

export const storage = {
  async get(key) {
    try {
      const val = localStorage.getItem(PREFIX + key);
      if (val === null) throw new Error('not found');
      return { key, value: val };
    } catch (e) {
      throw e;
    }
  },
  async set(key, value) {
    try {
      localStorage.setItem(PREFIX + key, value);
      return { key, value };
    } catch (e) {
      throw e;
    }
  },
  async delete(key) {
    localStorage.removeItem(PREFIX + key);
    return { key, deleted: true };
  },
  async list(prefix) {
    const keys = Object.keys(localStorage)
      .filter(k => k.startsWith(PREFIX + (prefix || '')))
      .map(k => k.slice(PREFIX.length));
    return { keys };
  }
};
