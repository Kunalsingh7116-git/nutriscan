import { useEffect, useRef, useState } from 'react';
import { Activity, Check, ChevronDown, HeartPulse, Pencil, Ruler, Shield, UserRound, Weight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';
import './Profile.css';
import { useMotionPreference } from '../hooks/useReducedMotion';

const lifestyles = [
  { value: 'Sedentary', label: 'Light' },
  { value: 'Moderate', label: 'Moderate' },
  { value: 'Active', label: 'Active' },
];
const references = [
  ['Calories', '2,000 kcal'], ['Protein', '50 g'], ['Carbs', '275 g'],
  ['Fat', '65 g'], ['Sugar', '50 g'], ['Sodium', '2,300 mg'],
];
const measurements = [
  { name: 'Weight', field: 'weight', unit: 'kg', Icon: Weight },
  { name: 'Height', field: 'height', unit: 'cm', Icon: Ruler },
  { name: 'BMI', field: 'bmi', Icon: Activity },
];
const healthFields = [
  ['allergies', 'Allergies'],
  ['medical_conditions', 'Health conditions'],
];

function toForm(profile) {
  return {
    weight: profile?.weight ?? '',
    height: profile?.height ?? '',
    lifestyle_type: profile?.lifestyle_type ?? '',
    allergies: profile?.allergies?.join(', ') ?? '',
    medical_conditions: profile?.medical_conditions?.join(', ') ?? '',
  };
}

export default function Profile() {
  const { preference, changePreference } = useMotionPreference();
  const { user, logout } = useAuth();
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState('');
  const [password, setPassword] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const cancelDelete = () => {
    setDeleteOpen(false);
    setConfirmation('');
    setPassword('');
    setDeleteError('');
  };
  async function deleteAccount(event) {
    event.preventDefault();
    if (deleting || confirmation !== 'DELETE') return;
    setDeleting(true);
    setDeleteError('');
    try {
      await api.delete('/users/me', { data: { confirmation, password } });
      await logout({ revoke: false });
    } catch (failure) {
      setDeleteError(failure.response?.data?.message || 'Couldn’t delete your account. Try again.');
      setDeleting(false);
    }
  }
  const [profile, setProfile] = useState(null);
  const [form, setForm] = useState(() => toForm());
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const editTitle = useRef(null);
  const editButton = useRef(null);
  const restoreFocus = useRef(false);

  useEffect(() => {
    const controller = new AbortController();
    api.get('/health-profiles', { signal: controller.signal })
      .then(({ data }) => setProfile(data))
      .catch(() => { if (!controller.signal.aborted) setLoadError(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [attempt]);

  useEffect(() => {
    if (editing) editTitle.current?.focus();
    else if (restoreFocus.current) {
      restoreFocus.current = false;
      editButton.current?.focus();
    }
  }, [editing]);

  function beginEdit() {
    setForm(toForm(profile));
    setSaved(false);
    setError('');
    setEditing(true);
  }

  function closeEditor() {
    restoreFocus.current = true;
    setEditing(false);
  }

  async function save(event) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setError('');
    const split = value => [...new Set(value.split(/[,\n]/).map(entry => entry.trim()).filter(Boolean))];
    try {
      const { data } = await api.put('/health-profiles', {
        weight: Number(form.weight),
        height: Number(form.height),
        lifestyle_type: form.lifestyle_type,
        allergies: split(form.allergies),
        medical_conditions: split(form.medical_conditions),
      });
      setProfile(data);
      setSaved(true);
      closeEditor();
    } catch (err) {
      setError(err.response?.data?.message || 'Couldn’t save your profile. Try again.');
    } finally {
      setSaving(false);
    }
  }

  const nameParts = [user?.name?.first?.trim(), user?.name?.last?.trim()].filter(Boolean);
  const name = nameParts.join(' ') || 'My account';
  const activity = lifestyles.find(item => item.value === profile?.lifestyle_type);
  const set = (field, value) => setForm(previous => ({ ...previous, [field]: value }));

  return (
    <div className="page profile-page">
      <header className="profile-heading"><span className="page-eyebrow">MADE FOR YOU</span><h1>Your profile</h1><p>Manage your measurements and health details.</p></header>
      <section className="profile-identity" aria-label="Your account">
        <span className="profile-avatar" aria-hidden="true">
          {nameParts.length ? nameParts.map(part => part[0]).join('').toUpperCase() : <UserRound size={26} />}
        </span>
        <div><h2>{name}</h2>{user?.email && <p>{user.email}</p>}</div>
      </section>

      {loading ? <p role="status" className="loading"><span className="spinner" aria-hidden="true" />Loading profile…</p>
        : loadError ? <section className="card profile-load-error" aria-label="Health profile">
          <p role="alert">Your health profile couldn’t load.</p>
          <button className="btn btn-outline" type="button" onClick={() => {
            setLoadError(false);
            setLoading(true);
            setAttempt(previous => previous + 1);
          }}>Try again</button>
        </section> : <>
          <div className="profile-status" role="status">{saved && <p><Check size={17} aria-hidden="true" /> Profile saved</p>}</div>
          {editing ? <form className="card profile-editor" onSubmit={save} aria-labelledby="profile-edit-title">
            <h2 id="profile-edit-title" tabIndex={-1} ref={editTitle}>{profile ? 'Edit health profile' : 'Set up health profile'}</h2>
            <fieldset disabled={saving}>
              <div className="profile-measure-fields">
                {measurements.slice(0, 2).map(({ name, field, unit }) => <label key={field}>
                  <span>{name}</span>
                  <span className="profile-unit-input"><input className="form-input" type="number" step="any" min="0.1" inputMode="decimal"
                    aria-label={`${name} in ${unit === 'kg' ? 'kilograms' : 'centimeters'}`} value={form[field]} required
                    onChange={event => set(field, event.target.value)} /><span aria-hidden="true">{unit}</span></span>
                </label>)}
              </div>
              <fieldset className="profile-activity">
                <legend>Activity level</legend>
                <div className="profile-options">
                  {lifestyles.map(({ value, label }) => <label key={value}>
                    <input type="radio" name="activity" value={value} checked={form.lifestyle_type === value} required onChange={() => set('lifestyle_type', value)} />
                    <span>{label}</span>
                  </label>)}
                </div>
              </fieldset>
              <div className="profile-health-fields">
                {healthFields.map(([field, label]) => <label key={field}>
                  <span>{label} <small>Optional</small></span>
                  <textarea className="form-input" rows={2} placeholder="Separate entries with commas"
                    value={form[field]} onChange={event => set(field, event.target.value)} />
                </label>)}
              </div>
            </fieldset>
            {error && <p className="alert-box alert-error" role="alert">{error}</p>}
            <div className="profile-form-actions">
              <button className="btn btn-outline" type="button" disabled={saving} onClick={closeEditor}>Cancel</button>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            </div>
          </form> : <div className="profile-sections">
            <section className="card profile-card" aria-labelledby="measurements-title">
              <div className="profile-card-heading">
                <span className="profile-icon"><HeartPulse size={20} aria-hidden="true" /></span>
                <div><h2 id="measurements-title">Health overview</h2>{activity && <p>{activity.label} activity</p>}</div>
                {profile && <button type="button" className="btn btn-outline" ref={editButton} onClick={beginEdit}><Pencil size={15} aria-hidden="true" /> Edit</button>}
              </div>
              {profile ? <dl className="profile-measurements">
                {measurements.map(({ name, field, unit, Icon }) => <div key={field}>
                  <dt><Icon size={15} aria-hidden="true" />{name}</dt>
                  <dd>{Number(profile[field]) > 0 ? profile[field] : '—'}{unit && Number(profile[field]) > 0 && <small> {unit}</small>}</dd>
                </div>)}
              </dl> : <div className="profile-empty">
                <p>Add your height, weight, and activity level to see them here.</p>
                <button type="button" className="btn btn-primary" ref={editButton} onClick={beginEdit}>Set up health profile</button>
              </div>}
            </section>
            <section className="card profile-card" aria-labelledby="health-details-title">
              <div className="profile-card-heading">
                <span className="profile-icon secondary"><Shield size={20} aria-hidden="true" /></span>
                <div><h2 id="health-details-title">Health details</h2></div>
              </div>
              <dl className="profile-details">
                {healthFields.map(([field, label]) => <div key={field}>
                  <dt>{label}</dt>
                  <dd>{profile?.[field]?.length ? <ul>{profile[field].map((entry, index) => <li key={index}>{entry}</li>)}</ul> : 'None added'}</dd>
                </div>)}
              </dl>
            </section>
          </div>}
        </>}

      <section className="card motion-preference" aria-labelledby="appearance-title">
        <div><h2 id="appearance-title">Appearance</h2><p>Choose how NutriScan moves on this device.</p></div>
        <label><span>Motion</span>
          <select className="form-input" value={preference} onChange={event => changePreference(event.target.value)}>
            <option value="system">Follow device setting</option>
            <option value="full">Full motion</option>
            <option value="reduced">Reduced motion</option>
          </select>
        </label>
      </section>

      <section className="card profile-card" aria-labelledby="delete-account-title">
        <h2 id="delete-account-title">Delete account</h2>
        {!deleteOpen ? <button className="btn btn-outline" type="button" onClick={() => setDeleteOpen(true)}>
          Delete my NutriScan account
        </button> : <form onSubmit={deleteAccount}>
          <p>This permanently deletes your account, health profile, photos and personal meal history.</p>
          <fieldset disabled={deleting}>
            <label className="form-label" htmlFor="confirm-delete">Type DELETE to confirm</label>
            <input id="confirm-delete" className="form-input" value={confirmation} required
              onChange={event => setConfirmation(event.target.value)} />
            {user?.requires_password && <>
              <label className="form-label" htmlFor="delete-password">Current password</label>
              <input id="delete-password" className="form-input" type="password" autoComplete="current-password"
                value={password} required onChange={event => setPassword(event.target.value)} />
            </>}
          </fieldset>
          {deleteError && <p className="alert-box alert-error" role="alert">{deleteError}</p>}
          <div className="profile-form-actions">
            <button className="btn btn-outline" type="button" disabled={deleting} onClick={cancelDelete}>Cancel</button>
            <button className="btn btn-primary" type="submit" disabled={deleting || confirmation !== 'DELETE'}>
              {deleting ? 'Deleting…' : 'Permanently delete account'}
            </button>
          </div>
        </form>}
      </section>

      <details className="card profile-references">
        <summary>Daily nutrition reference values <ChevronDown size={19} aria-hidden="true" /></summary>
        <dl>{references.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>
      </details>
    </div>
  );
}
