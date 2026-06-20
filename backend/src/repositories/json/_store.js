import fs from 'node:fs';
import path from 'node:path';
import { env } from '../../config/env.js';

fs.mkdirSync(env.dataDir, { recursive: true });

const cache = new Map();

function filePath(collection) {
  return path.join(env.dataDir, `${collection}.json`);
}

function load(collection) {
  if (cache.has(collection)) return cache.get(collection);
  const p = filePath(collection);
  let data = [];
  if (fs.existsSync(p)) {
    try {
      data = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (!Array.isArray(data)) data = [];
    } catch {
      data = [];
    }
  }
  cache.set(collection, data);
  return data;
}

function persist(collection) {
  const data = cache.get(collection) || [];
  const p = filePath(collection);
  const tmp = `${p}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, p);
}

export const store = {
  all(collection) {
    return [...load(collection)];
  },
  find(collection, predicate) {
    return load(collection).find(predicate);
  },
  filter(collection, predicate) {
    return load(collection).filter(predicate);
  },
  insert(collection, item) {
    const data = load(collection);
    data.push(item);
    persist(collection);
    return item;
  },
  update(collection, id, patch) {
    const data = load(collection);
    const idx = data.findIndex((row) => row.id === id);
    if (idx === -1) return null;
    data[idx] = { ...data[idx], ...patch, id };
    persist(collection);
    return data[idx];
  },
  remove(collection, id) {
    const data = load(collection);
    const idx = data.findIndex((row) => row.id === id);
    if (idx === -1) return false;
    data.splice(idx, 1);
    persist(collection);
    return true;
  },
};
