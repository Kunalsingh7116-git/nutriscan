import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import StoredMealPhoto from './StoredMealPhoto';
import api from '../utils/api';

export default function SavedFoods() {
  const [foods, setFoods] = useState(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/saved-foods', { signal: controller.signal })
      .then(({ data }) => setFoods(data))
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);

  const search = query.trim().toLowerCase();
  const filtered = foods?.filter(food => [food.title, ...food.items.map(item => item.name)]
    .some(name => name.toLowerCase().includes(search)));

  return <section className="card saved-foods" aria-labelledby="saved-foods-title">
    <div className="section-heading"><div><h2 id="saved-foods-title">Saved from photos</h2><p>Pick a saved food to review and log it again.</p></div></div>
    {foods?.length > 0 && <label className="saved-food-filter">
      Search saved foods
      <input className="form-input" type="search" value={query} onChange={event => setQuery(event.target.value)} />
    </label>}
    {error ? <p role="alert" className="saved-food-note">Couldn’t load saved foods. <button type="button" className="text-button" onClick={() => {
      setError(false);
      setAttempt(previous => previous + 1);
    }}>Try again</button></p>
      : !foods ? <p role="status" className="saved-food-note">Loading saved foods…</p>
        : !foods.length ? <p className="saved-food-note">No saved foods yet. You can save a food after reviewing a photo scan.</p>
          : !filtered.length ? <p className="saved-food-note">No saved foods match your search.</p>
            : <ul className="saved-food-list">{filtered.map(food => <li key={food._id}>
              <Link className="saved-food-link" to={`/log-food?saved=${food._id}`}>
                <StoredMealPhoto id={food.photo_id} />
                <span className="meal-entry-name"><strong>{food.title}</strong><small>{Math.round(food.items.reduce((sum, item) => sum + item.calories, 0))} kcal</small></span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            </li>)}</ul>}
  </section>;
}
