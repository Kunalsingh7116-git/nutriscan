import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Camera, ChevronRight, Search, X } from 'lucide-react';
import StoredMealPhoto from './StoredMealPhoto';
import api from '../utils/api';
import ShimmerSkeleton from './ui/ShimmerSkeleton';
import './SavedFoods.css';

export default function SavedFoods() {
  const [foods, setFoods] = useState(null);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/saved-foods', { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setFoods(data); })
      .catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);

  const search = query.trim().toLowerCase();
  const filtered = foods?.filter(food => [food.title, ...food.items.map(item => item.name)]
    .some(name => name.toLowerCase().includes(search)));

  return <section className="card saved-foods" aria-labelledby="saved-foods-title">
    <header className="saved-foods-header">
      <div><div className="saved-foods-heading"><h2 id="saved-foods-title">Saved from photos</h2>
        {!!foods?.length && <span className="saved-food-count" aria-label={`${foods.length} saved meals`}>{foods.length}</span>}</div>
        <p>Your meals, ready to enjoy again. Select one to review and log.</p></div>
      {!!foods?.length && <div className="saved-food-search">
        <Search size={17} aria-hidden="true" />
        <input aria-label="Search saved foods" placeholder="Search your saved meals…" type="search" value={query} onChange={event => setQuery(event.target.value)} />
        {query && <button className="saved-search-clear" type="button" aria-label="Clear saved food search" onClick={() => setQuery('')}><X size={15} /></button>}
      </div>}
    </header>
    {error ? <p role="alert" className="saved-food-note">Couldn’t load saved foods. <button type="button" className="text-button" onClick={() => {
      setError(false);
      setAttempt(previous => previous + 1);
    }}>Try again</button></p>
      : !foods ? <div className="saved-food-loading" role="status" aria-label="Loading saved meals"><div className="saved-food-list" aria-hidden="true">
        {[0, 1].map(key => <ShimmerSkeleton key={key} className="saved-food-skeleton" />)}</div></div>
        : !foods.length ? <div className="saved-food-empty"><Camera size={25} aria-hidden="true" /><div><h3>Keep your favourites close</h3><p>Save a meal after a photo scan to find it here next time.</p></div><Link className="btn btn-outline" to="/log-food">Scan a meal</Link></div>
          : !filtered.length ? <div className="saved-food-no-results" role="status"><Search size={22} aria-hidden="true" /><h3>No matching meals</h3><p>Try another food name or ingredient.</p><button type="button" className="text-button" onClick={() => setQuery('')}>Clear search</button></div>
            : <ul className="saved-food-list">{filtered.map(food => <li key={food._id}>
              <Link className="saved-food-link" to={`/log-food?saved=${encodeURIComponent(food._id)}`}>
                <StoredMealPhoto id={food.photo_id} />
                <span className="saved-food-details"><strong>{food.title}</strong><span className="saved-food-meta"><span><b>{Math.round(food.items.reduce((sum, item) => sum + item.calories, 0))}</b> kcal</span><span>{food.items.length} {food.items.length === 1 ? 'food' : 'foods'}</span></span></span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            </li>)}</ul>}
  </section>;
}
