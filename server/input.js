function text(value, max) {
  return typeof value === 'string' && Boolean(value.trim()) && value.length <= max;
}

function email(value) {
  return text(value, 254) && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) ? value.trim().toLowerCase() : null;
}

function date(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d\d-\d\d$/.test(value)) return false;
  const time = Date.parse(value);
  return Number.isFinite(time) && new Date(time).toISOString().slice(0, 10) === value;
}

function page(query, max, defaultLimit = max) {
  const { limit, offset } = query;
  if ((limit !== undefined && (!['string','number'].includes(typeof limit) || !/^\d{1,3}$/.test(limit)))
    || (offset !== undefined && (!['string','number'].includes(typeof offset) || !/^\d{1,5}$/.test(offset)))) return null;
  const count = limit === undefined ? defaultLimit : Number(limit);
  const skip = offset === undefined ? 0 : Number(offset);
  return count >= 1 && count <= max && skip <= 10000 ? { skip, count } : null;
}

function objectId(value) {
  return typeof value === 'string' && /^[0-9a-f]{24}$/i.test(value);
}

function pageResponse(res, data, pagination) {
  const { skip, count } = pagination;
  if (data.length > count && skip + count <= 10000) res.set('X-Next-Offset', String(skip + count));
  return res.json(data.slice(0, count));
}

function resourceId(value) {
  if (objectId(value)) return { _id: value };
  if (typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)) {
    return { public_id: value.toLowerCase() };
  }
  return null;
}

module.exports = { text, email, date, page, pageResponse, resourceId };
