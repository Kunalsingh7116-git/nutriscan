export function dateKey(date = new Date()) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

export function timeKey(date = new Date()) {
  return date.toTimeString().slice(0, 5);
}

export function mealTime(date, time) {
  return new Date(`${date}T${time}`).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}
