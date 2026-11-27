import api from './api';

export async function getAll(path, config = {}) {
  const first = await api.get(path, config);
  const entries = [...first.data];
  let offset = Number(first.headers?.['x-next-offset']);
  while (Number.isInteger(offset) && offset > 0 && offset <= 10000) {
    const response = await api.get(path, { ...config, params: { ...config.params, offset } });
    entries.push(...response.data);
    const next = Number(response.headers?.['x-next-offset']);
    if (!(next > offset)) break;
    offset = next;
  }
  return { ...first, data: entries };
}
