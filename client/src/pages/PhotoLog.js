import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Camera, Check, ChevronDown, CircleHelp, ImagePlus, ScanLine, Trash2, Utensils } from 'lucide-react';
import MealCamera, { readMealPhoto } from '../components/MealCamera';
import StoredMealPhoto from '../components/StoredMealPhoto';
import examplePhoto from '../assets/meal-bowl.webp';
import api from '../utils/api';
import { exampleMeal } from '../utils/exampleMeal';
import { dateKey, mealTime, timeKey } from '../utils/mealDate';

const portions = [
  [0.5, 'Half'], [0.75, '¾ portion'], [1, 'Estimated'], [1.25, '1¼ portions'], [1.5, '1½ portions'], [2, 'Double'],
];
const nutrients = ['calories', 'protein', 'carbs', 'fat', 'fiber', 'sugar', 'sodium'];
const summary = [['calories', 'Calories', 'kcal'], ['protein', 'Protein', 'g'], ['carbs', 'Carbs', 'g'], ['fat', 'Fat', 'g']];
const moreNutrition = [['fiber', 'Fiber', 'g'], ['sugar', 'Sugar', 'g'], ['sodium', 'Sodium', 'mg']];
const acceptedPhotos = 'image/jpeg,image/png,image/webp,image/heic,image/heif';
const maxPhotoMb = Number(process.env.REACT_APP_MAX_MEAL_PHOTO_MB) || 10;

function selectedItems(scan, answers, sizes, excluded) {
  return scan.foods.flatMap((food, index) => {
    if (excluded.includes(index)) return [];
    const { name, grams, ...values } = food.options[answers[index] ?? 0];
    const size = sizes[index] || 1;
    const scale = Math.min(size, 5000 / grams);
    return [{ name, grams: Math.max(1, Math.round(grams * scale)),
      ...Object.fromEntries(nutrients.map(key => [key, Math.round(values[key] * scale * 10) / 10])),
    }];
  });
}

function mealTitle(scan, items, answers, excluded) {
  const changedFood = scan.foods.some(({ options }, index) => options[answers[index] ?? 0].name !== options[0].name);
  if (!items.length || (!changedFood && !excluded.length)) return scan.title;
  const names = [...new Set(items.map(item => item.name))];
  const title = names.slice(0, 2).join(' & ');
  return title.length <= 100 ? title : names[0];
}

export default function PhotoLog() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const savedId = params.get('saved');
  const uploadInput = useRef(null);
  const captureInput = useRef(null);
  const heading = useRef(null);
  const request = useRef(null);
  const saveIdentity = useRef(null);
  const originalPhoto = useRef(null);
  const uploadedPhoto = useRef(null);
  const [stage, setStage] = useState(savedId ? 'library-loading' : 'start');
  const [photo, setPhoto] = useState('');
  const [scan, setScan] = useState(null);
  const [savedFood, setSavedFood] = useState(null);
  const [answers, setAnswers] = useState({});
  const [sizes, setSizes] = useState({});
  const [excluded, setExcluded] = useState([]);
  const [example, setExample] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveChoice, setSaveChoice] = useState(null);
  const [history, setHistory] = useState(null);
  const [historyError, setHistoryError] = useState(false);
  const [removing, setRemoving] = useState('');
  const [historyAttempt, setHistoryAttempt] = useState(0);

  useEffect(() => () => request.current?.abort(), []);
  useEffect(() => {
    if (!savedId) return;
    const controller = new AbortController();
    setStage('library-loading');
    setError('');
    setSavedFood(null);
    setExample(false);
    setAnswers({});
    setSizes({});
    setExcluded([]);
    setSaveChoice(null);
    saveIdentity.current = null;
    api.get('/saved-foods/' + encodeURIComponent(savedId), { signal: controller.signal })
      .then(({ data }) => {
        setSavedFood(data);
        setScan({ title: data.title, foods: data.items.map(item => ({ options: [item] })) });
        setStage('review');
      })
      .catch(() => {
        if (controller.signal.aborted) return;
        setError('This saved food could not be opened.');
        setStage('library-error');
      });
    return () => controller.abort();
  }, [savedId]);
  useEffect(() => {
    const controller = new AbortController();
    api.get('/consumption', { signal: controller.signal, params: { limit: 20 } })
      .then(({ data }) => setHistory(data))
      .catch(() => { if (!controller.signal.aborted) setHistoryError(true); });
    return () => controller.abort();
  }, [historyAttempt]);

  const questionIndex = stage === 'question' ? scan.foods.findIndex((food, index) => food.question && answers[index] === undefined) : -1;
  useEffect(() => { heading.current?.focus(); }, [stage, questionIndex]);

  function startCamera() {
    setError('');
    if (window.matchMedia('(pointer: coarse)').matches || !navigator.mediaDevices?.getUserMedia) {
      captureInput.current.click();
    } else {
      setStage('camera');
    }
  }

  function prepareReview(result) {
    setScan(result);
    setAnswers({});
    setSizes({});
    setExcluded([]);
    setStage(result.foods.some(food => food.question) ? 'question' : 'review');
  }

  async function analyze(image) {
    request.current?.abort();
    setExample(false);
    setError('');
    setPhoto(image);
    setStage('analyzing');
    saveIdentity.current = null;
    setSaveChoice(null);
    const controller = new AbortController();
    request.current = controller;
    try {
      const { data } = await api.post('/meal-scan', { photo: image }, { signal: controller.signal });
      if (data.status === 'retake') { setScan(data); setStage('retake'); }
      else prepareReview(data);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err.response?.data?.message || 'Photo analysis didn’t finish. Try again.');
      setStage(err.response?.data?.code === 'VISION_SETUP_REQUIRED' ? 'setup' : 'failed');
    }
  }

  async function scanFile(file) {
    if (!file) return;
    setError('');
    if (file.size > maxPhotoMb * 1024 * 1024) {
      setStage('start');
      setError(`Choose a photo that is ${maxPhotoMb} MB or smaller.`);
      return;
    }
    setStage('preparing');
    try {
      const preview = await readMealPhoto(file);
      originalPhoto.current = file;
      uploadedPhoto.current = null;
      setSavedFood(null);
      await analyze(preview);
    }
    catch {
      setError('This photo couldn’t be opened. Try a JPEG, PNG, or WebP.');
      setStage('start');
    }
  }

  function chooseFile(event) {
    const file = event.target.files[0];
    event.target.value = '';
    scanFile(file);
  }

  function showExample() {
    request.current?.abort();
    setPhoto(examplePhoto);
    setError('');
    setExample(true);
    prepareReview(exampleMeal);
  }

  function chooseAnswer(index, option) {
    setAnswers({ ...answers, [index]: option });
    if (!scan.foods.some((food, i) => i !== index && food.question && answers[i] === undefined)) setStage('review');
  }

  function reset() {
    request.current?.abort();
    setStage('start');
    setPhoto('');
    setError('');
    setExample(false);
    setSavedFood(null);
    originalPhoto.current = null;
    uploadedPhoto.current = null;
    saveIdentity.current = null;
    setSaveChoice(null);
    if (savedId) navigate('/log-food', { replace: true });
  }

  async function save(items, saveToLibrary = false) {
    setSaving(true);
    setError('');
    setSaveChoice(saveToLibrary);
    if (!saveIdentity.current) {
      const bytes = crypto.getRandomValues(new Uint8Array(16));
      const id = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('').replace(/^(........)(....)(....)(....)/, '$1-$2-$3-$4-');
      const now = new Date();
      saveIdentity.current = { id, date: dateKey(now), time: timeKey(now) };
    }
    try {
      const title = mealTitle(scan, items, answers, excluded);
      if (!savedFood && !uploadedPhoto.current) {
        const { data } = await api.post('/meal-photos', originalPhoto.current, {
          headers: { 'Content-Type': 'application/octet-stream' },
        });
        uploadedPhoto.current = data.id;
      }
      await api.post('/consumption/meal', {
        ...saveIdentity.current, title, items, saveToLibrary,
        ...(savedFood ? { savedFoodId: savedFood._id } : { photoId: uploadedPhoto.current }),
      });
      navigate('/dashboard', { state: { loggedDate: saveIdentity.current.date, savedToLibrary: saveToLibrary } });
    } catch (err) {
      setError(err.response?.data?.message || 'Your meal couldn’t be saved. Try again.');
    } finally { setSaving(false); }
  }

  async function removeMeal(recordId) {
    if (!window.confirm('Remove this meal from your food log?')) return;
    setRemoving(recordId);
    setHistoryError(false);
    try {
      await api.delete('/consumption/' + recordId);
      setHistory(items => items.filter(item => item.record_id !== recordId));
    } catch {
      setHistoryError(true);
    } finally { setRemoving(''); }
  }

  const hasReview = stage === 'review' || stage === 'library-choice';
  const items = hasReview ? selectedItems(scan, answers, sizes, excluded) : [];
  const title = hasReview ? mealTitle(scan, items, answers, excluded) : '';
  const totals = Object.fromEntries(nutrients.map(key => [key, Math.round(items.reduce((sum, item) => sum + item[key], 0))]));
  const foodQuestion = questionIndex >= 0 ? scan.foods[questionIndex] : null;
  const photoActions = <>
    <button type="button" className="btn btn-primary" onClick={startCamera}><Camera size={18} /> Take a photo</button>
    <button type="button" className="btn btn-outline" onClick={() => uploadInput.current.click()}><ImagePlus size={18} /> Upload a photo</button>
  </>;

  return (
    <div className="page photo-page">
      <Link className="inline-link back-link" to="/dashboard"><ArrowLeft size={16} /> Overview</Link>
      <header className="overview-intro"><div><h1>Food log</h1><p>Estimate and log a meal from a single photo.</p></div></header>
      <input ref={uploadInput} type="file" accept={acceptedPhotos} onChange={chooseFile} hidden />
      <input ref={captureInput} type="file" accept="image/*" capture="environment" onChange={chooseFile} hidden />
      <div className="food-log-grid">
        <section className="card photo-card" aria-label="Log a meal">
          {stage === 'start' && <div className="upload-panel">
            <span className="camera-glyph"><ScanLine size={34} aria-hidden="true" /></span>
            <h2 tabIndex={-1} ref={heading}>Snap your meal</h2>
            <p>Get the whole plate in good light for a better estimate.</p>
            {error && <p className="alert-box alert-error" role="alert">{error}</p>}
            <div className="scan-actions">{photoActions}</div>
            <Link className="inline-link" to="/food-products">Choose from Food Library <ArrowRight size={16} /></Link>
            <p className="photo-note">Meal photos are sent to the configured AI provider for analysis.</p>
            <button type="button" className="text-button" onClick={showExample}>Try an example scan <ArrowRight size={14} /></button>
          </div>}

          {stage === 'camera' && <MealCamera onCapture={scanFile} onClose={reset} onFallback={() => uploadInput.current.click()} />}
          {stage === 'library-loading' && <div className="upload-panel" role="status">Loading saved food…</div>}
          {stage === 'library-error' && <div className="upload-panel">
            <p role="alert">{error}</p><Link className="btn btn-outline" to="/food-products">Back to Food Library</Link>
          </div>}
          {stage === 'library-choice' && <div className="upload-panel">
            <h2 tabIndex={-1} ref={heading}>Save this food to your library?</h2>
            <p>Keep the photo and these nutrition estimates so you can log it again.</p>
            {error && <p className="alert-box alert-error" role="alert">{error}</p>}
            <div className="scan-actions">
              {saveChoice !== false && <button type="button" className="btn btn-primary" disabled={saving} onClick={() => save(items, true)}>
                {saving ? 'Saving…' : 'Log & save to library'}
              </button>}
              {saveChoice !== true && <button type="button" className="btn btn-outline" disabled={saving} onClick={() => save(items)}>
                {saving ? 'Saving…' : 'Log meal only'}
              </button>}
            </div>
            {saveChoice === null && <button type="button" className="text-button" onClick={() => { setError(''); setStage('review'); }}>Back to review</button>}
          </div>}
          {(stage === 'preparing' || stage === 'analyzing') && <div className="upload-panel" role="status">
            {photo && stage === 'analyzing' && <img className="meal-photo" src={photo} alt="Meal awaiting analysis" />}
            <div className="spinner" aria-hidden="true" />
            <h2 tabIndex={-1} ref={heading}>{stage === 'preparing' ? 'Opening your photo…' : 'Scanning your meal…'}</h2>
            {stage === 'analyzing' && <button type="button" className="text-button" onClick={reset}>Cancel scan</button>}
          </div>}

          {(stage === 'failed' || stage === 'retake' || stage === 'setup') && <div className="upload-panel">
            <span className="camera-glyph"><CircleHelp size={30} /></span>
            <h2 tabIndex={-1} ref={heading}>{stage === 'retake' ? 'Want to try another photo?' : stage === 'setup' ? 'Photo analysis needs setup' : 'Scan unavailable'}</h2>
            <p role="alert">{stage === 'retake' ? scan.reason || 'A brighter, closer photo may help.' : error}</p>
            {stage !== 'setup' && <div className="scan-actions">{photoActions}</div>}
            {stage !== 'retake' && <div className="scan-actions">
              <button type="button" className="text-button" onClick={() => analyze(photo)}>Retry scan</button>
              <button type="button" className="text-button" onClick={showExample}>Try an example scan</button>
            </div>}
          </div>}

          {foodQuestion && <div className="photo-review">
            <img className="meal-photo" src={photo} alt={example ? 'Example chicken and quinoa bowl' : 'Your selected meal'} />
            <div className="review-label">{example ? 'Example scan' : 'Quick check'} · {scan.foods.slice(0, questionIndex + 1).filter(food => food.question).length} of {scan.foods.filter(food => food.question).length}</div>
            <h2 tabIndex={-1} ref={heading}>{foodQuestion.question}</h2>
            <div className="answer-options">
              {foodQuestion.options.map((option, index) => <button type="button" key={index} onClick={() => chooseAnswer(questionIndex, index)}>{option.label} <ArrowRight size={16} /></button>)}
            </div>
            <button type="button" className="text-button" onClick={() => chooseAnswer(questionIndex, 0)}>Use the estimate</button>
          </div>}

          {stage === 'review' && <div className="photo-review">
            {savedFood ? <StoredMealPhoto id={savedFood.photo_id} className="meal-photo" alt={savedFood.title} />
              : <img className="meal-photo" src={photo} alt={example ? 'Example chicken and quinoa bowl' : 'Your selected meal'} />}
            <div className="review-label">{example ? 'Example scan' : savedFood ? 'From your Food Library' : 'Review your scan'}</div>
            <h2 tabIndex={-1} ref={heading}>{title}</h2>
            <p>Estimated nutrition. Tap a food to change its portion or remove it.</p>
            <div className="review-totals">
              {summary.map(([key, label, unit]) => <div key={key}><span>{label}</span><strong>{totals[key]}<small> {unit}</small></strong></div>)}
            </div>
            <details className="review-food">
              <summary><span>More nutrition details</span><ChevronDown size={17} /></summary>
              {moreNutrition.map(([key, label, unit]) => <div className="nutrient-row" key={key}><span>{label}</span><strong>{totals[key]} {unit}</strong></div>)}
            </details>
            <div className="review-foods">
              {scan.foods.map((food, index) => {
                const selected = food.options[answers[index] ?? 0];
                const isExcluded = excluded.includes(index);
                return <details className="review-food" key={index}>
                  <summary><span>{selected.name}</span><small>{isExcluded ? 'Removed' : `${Math.min(5000, Math.max(1, Math.round(selected.grams * (sizes[index] || 1))))} g`}</small><ChevronDown size={17} /></summary>
                  {food.options.length > 1 && <label>Food estimate
                    <select className="form-input" value={answers[index] ?? 0} disabled={saving || isExcluded} onChange={event => {
                      setAnswers({ ...answers, [index]: Number(event.target.value) });
                      setSizes({ ...sizes, [index]: 1 });
                    }}>{food.options.map((option, key) => <option key={key} value={key}>{option.label}</option>)}</select>
                  </label>}
                  <label>Portion
                    <select className="form-input" value={sizes[index] || 1} disabled={saving || isExcluded} onChange={event => setSizes({ ...sizes, [index]: Number(event.target.value) })}>
                      {portions.map(([size, name]) => <option key={size} value={size}>{name}</option>)}
                    </select>
                  </label>
                  <button type="button" className="text-button" disabled={saving} onClick={() => setExcluded(isExcluded ? excluded.filter(item => item !== index) : [...excluded, index])}>{isExcluded ? 'Restore food' : 'Remove food'}</button>
                </details>;
              })}
            </div>
            {error && <p className="alert-box alert-error" role="alert">{error}</p>}
            <div className="scan-actions">
              {example ? <button type="button" className="btn btn-primary" onClick={reset}><Check size={16} /> Finish example</button> :
                <button type="button" className="btn btn-primary" disabled={saving || !items.length} onClick={() => {
                  if (savedFood) save(items);
                  else setStage('library-choice');
                }}><Check size={16} /> {saving ? 'Saving…' : 'Add to dashboard'}</button>}
              {!example && <button type="button" className="btn btn-outline" disabled={saving} onClick={reset}>Start over</button>}
            </div>
          </div>}
        </section>

        <aside className="photo-sidebar">
          <section className="card">
            <div className="section-heading"><div><h2>Meal history</h2><p>Your latest food entries</p></div><Utensils size={18} /></div>
            {historyError && <p className="alert-box alert-error" role="alert">Couldn’t update meal history. <button type="button" className="text-button" onClick={() => { setHistoryError(false); setHistoryAttempt(historyAttempt + 1); }}>Refresh</button></p>}
            {history?.length ? <ul className="meal-list history-list">
              {history.map(meal => <li key={meal.record_id}>
                <StoredMealPhoto id={meal.photo_id} alt={meal.photo_id ? `Photo of ${meal.display_name}` : ''} />
                <div className="meal-entry-name"><strong>{meal.display_name}</strong><small>{new Date(meal.date + 'T12:00').toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} · {mealTime(meal.date, meal.time)}</small></div>
                <span className="meal-cal">{Math.round(meal.nutrients.calories)} <small>kcal</small></span>
                <button type="button" className="icon-button" disabled={!!removing} aria-label={`Remove ${meal.display_name}`} onClick={() => removeMeal(meal.record_id)}><Trash2 size={16} /></button>
              </li>)}
            </ul> : <div className="dashboard-empty"><span className="empty-glyph"><Utensils size={22} /></span><strong>{history ? 'No meals logged yet' : historyError ? 'History unavailable' : 'Loading meals…'}</strong></div>}
          </section>
          <Link className="inline-link" to="/log-food/manual">Log from food library <ArrowRight size={16} /></Link>
        </aside>
      </div>
    </div>
  );
}
