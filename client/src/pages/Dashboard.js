import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { CalendarDays, Camera, ChevronLeft, ChevronRight, CircleCheck, Droplet, Flame, Leaf, Utensils, Wheat, Zap } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { dateKey, mealTime } from '../utils/mealDate';
import api from '../utils/api';
import { getAll } from '../utils/paginatedApi';
import StoredMealPhoto from '../components/StoredMealPhoto';
import NumberTicker from '../components/ui/NumberTicker';
import ShimmerSkeleton from '../components/ui/ShimmerSkeleton';
const WeeklyChart = lazy(() => import('../components/WeeklyChart'));

const metrics = [
  { key: 'calories', name: 'Calories', unit: 'kcal', goal: 2000, Icon: Flame, tint: 'tangerine' },
  { key: 'protein', name: 'Protein', unit: 'g', goal: 50, Icon: Zap, tint: 'mint' },
  { key: 'carbs', name: 'Carbs', unit: 'g', goal: 275, Icon: Wheat, tint: 'lilac' },
  { key: 'fat', name: 'Fat', unit: 'g', goal: 65, Icon: Droplet, tint: 'gold' },
];
const number = new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 });

function daysEnding(date) {
  return Array.from({ length: 7 }, (_, index) => {
    const day = new Date(`${date}T12:00`);
    day.setDate(day.getDate() + index - 6);
    return { date: dateKey(day), label: day.toLocaleDateString(undefined, { weekday: 'short' }) };
  });
}

export default function Dashboard() {
  const { user, workspaceCache } = useAuth();
  const { state } = useLocation();
  const today = dateKey();
  const [date, setDate] = useState(state?.loggedDate || today);
  const [data, setData] = useState(() => {
    const cached = workspaceCache.current.get(date);
    return cached && Date.now() - cached.time < 60000 ? cached.data : null;
  });
  const [refreshing, setRefreshing] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    const cached = workspaceCache.current.get(date);
    if (cached && Date.now() - cached.time < 60000) setData(cached.data);
    setRefreshing(true);
    setError(false);
    const config = { signal: controller.signal };
    Promise.all([api.get('/daily-intake', { ...config, params: { from: daysEnding(date)[0].date, to: date } }), getAll('/consumption', { ...config, params: { date } })])
      .then(([intake, meals]) => {
        if (controller.signal.aborted) return;
        const next = { date, intake: intake.data, meals: meals.data };
        workspaceCache.current.set(date, { data: next, time: Date.now() });
        if (workspaceCache.current.size > 8) workspaceCache.current.delete(workspaceCache.current.keys().next().value);
        setData(next);
      })
      .catch(() => { if (!controller.signal.aborted) setError(true); })
      .finally(() => { if (!controller.signal.aborted) setRefreshing(false); });
    return () => controller.abort();
  }, [date, attempt, workspaceCache]);

  const selected = new Date(`${date}T12:00`);
  const dateLabel = date === today ? 'Today' : selected.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  const activeData = data?.date === date ? data : null;
  const intake = activeData?.intake.find(item => item.date === date);
  const meals = activeData?.meals || [];
  const week = daysEnding(date).map(day => {
    const match = activeData?.intake.find(item => item.date === day.date);
    return { ...day, calories: Math.round(match?.total_calories || 0) };
  });
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user?.name?.first?.trim();

  function moveDate(step) {
    const next = new Date(selected);
    next.setDate(next.getDate() + step);
    setError(false);
    setDate(dateKey(next));
  }

  return (
    <div className="page dashboard">
      <header className="overview-intro">
        <div>
          <span className="page-eyebrow">YOUR DAILY OVERVIEW</span>
          <h1>{greeting}{firstName ? `, ${firstName}` : ''}.</h1>
          <p>Here’s your nutrition at a glance.{activeData && refreshing && <span role="status"> Refreshing…</span>}</p>
        </div>
        <div className="day-picker" aria-label="Nutrition date">
          <button className="icon-button" type="button" onClick={() => moveDate(-1)} aria-label="Previous day"><ChevronLeft size={17} /></button>
          <span><CalendarDays size={15} aria-hidden="true" />{dateLabel}</span>
          <button className="icon-button" type="button" onClick={() => moveDate(1)} disabled={date >= today} aria-label="Next day"><ChevronRight size={17} /></button>
        </div>
      </header>

      {state?.loggedDate && <div className="save-notice" role="status"><CircleCheck size={18} />
        {state.savedToLibrary ? 'Meal logged and saved to your Food Library.' : 'Meal added to your food log.'}
      </div>}
      <div className="overview-feature-grid"><section className="scan-hero" aria-labelledby="scan-hero-title">
        <div className="scan-hero-copy">
          <div className="scan-kicker"><Camera size={15} aria-hidden="true" /> A PHOTO IS ALL IT TAKES</div>
          <h2 id="scan-hero-title">Good food.<br />A clearer picture.</h2>
          <p>Turn your next meal into a little more insight.</p>
          <Link className="scan-cta" to="/log-food"><Camera size={18} aria-hidden="true" /> Scan a meal</Link>
        </div>
        <div className="scan-hero-art" aria-hidden="true">
          <div className="scan-frame"><i /><i /><i /><i /><span /></div>
        </div>
      </section>
      <section className="daily-balance" aria-labelledby="daily-balance-title">
        <div className="section-heading"><h2 id="daily-balance-title">Daily energy</h2><Flame size={19} aria-hidden="true" /></div>
        <div className="energy-ring" style={{ '--energy-progress': `${Math.min(100, (intake?.total_calories || 0) / 2000 * 100)}%` }}>
          <div>{activeData ? <strong><NumberTicker value={intake?.total_calories || 0} /></strong> : <ShimmerSkeleton className="energy-skeleton" label="Loading daily calories" />}<span>kcal logged</span></div>
        </div><p>Daily reference <strong>2,000 kcal</strong></p>
        <span className="energy-caption">{meals.length ? `${meals.length} ${meals.length === 1 ? 'meal' : 'meals'} in your food log` : 'Every meal adds to the picture'}</span>
      </section></div>

      <section className="nutrition-section" aria-labelledby="nutrition-title" aria-busy={!activeData && !error}>
        <div className="section-heading">
          <div><h2 id="nutrition-title">Daily nutrition</h2><p>Progress toward your daily reference values</p></div>
          <Leaf size={20} aria-hidden="true" />
        </div>
        {error && <div className="alert-box alert-error" role="alert">Nutrition data couldn’t load. <button className="text-button" onClick={() => { setError(false); setAttempt(attempt + 1); }}>Try again</button></div>}
        <div className="metric-grid">
          {metrics.map(({ key, name, unit, goal, Icon, tint }) => {
            const value = intake?.['total_' + key] || 0;
            const progress = Math.min(100, Math.round(value / goal * 100));
            return (
              <article className={`metric-card ${tint}`} key={key}>
                <div className="metric-label"><span className="metric-icon"><Icon size={18} aria-hidden="true" /></span><h3>{name}</h3></div>
                <div className="metric-value">{activeData ? <NumberTicker value={value} /> : <ShimmerSkeleton className="metric-skeleton" label={`Loading ${name.toLowerCase()}`} />} <span>{unit}</span></div>
                <span className="metric-goal">of {number.format(goal)} {unit}</span>
                <div className="metric-track" role="progressbar" aria-label={name + ' reference progress'} aria-valuenow={activeData ? progress : undefined}>
                  <div style={{ transform: `scaleX(${progress / 100})` }} />
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <div className="insights-grid">
        <section className="card insights-card">
          <div className="section-heading">
            <div><h2>{date === today ? 'Today’s meals' : 'Meals'}</h2><p>{activeData ? `${meals.length} ${meals.length === 1 ? 'entry' : 'entries'} logged` : 'Recent entries'}</p></div>
            <Link className="inline-link" to="/log-food">View food log</Link>
          </div>
          {meals.length ? <ul className="meal-list">
            {meals.slice(0, 5).map(meal => (
              <li key={meal.record_id}>
                <StoredMealPhoto id={meal.photo_id} alt={meal.photo_id ? `Photo of ${meal.display_name}` : ''} />
                <div className="meal-entry-name"><strong>{meal.display_name}</strong><small>{mealTime(meal.date, meal.time)}{meal.meal_items?.length ? ` · ${meal.meal_items.length} ${meal.meal_items.length === 1 ? 'food' : 'foods'}` : ''}</small></div>
                <span className="meal-cal">{number.format(meal.nutrients.calories)} <small>kcal</small></span>
              </li>
            ))}
          </ul> : <div className="dashboard-empty">
            <span className="empty-glyph"><Utensils size={23} aria-hidden="true" /></span>
            <strong>{activeData ? 'No meals logged yet' : error ? 'Meals unavailable' : 'Loading meals…'}</strong>
            {activeData && <p>Your meals will show up here after you log them.</p>}
          </div>}
        </section>
        <section className="card insights-card">
          <div className="section-heading"><div><h2>Calorie trend</h2><p>Daily intake over 7 days</p></div></div>
          <div className="weekly-chart" role="img" aria-label={activeData ? week.map(day => `${day.label} ${day.calories} kcal`).join(', ') : 'Calorie trend unavailable'}>
<Suspense fallback={<ShimmerSkeleton className="weekly-chart" label="Loading calorie chart" />}><WeeklyChart week={week} date={date} /></Suspense>
          </div>
        </section>
      </div>
    </div>
  );
}
