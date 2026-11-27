import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import SavedFoods from '../components/SavedFoods';
import { PackageOpen, Plus, Search, Utensils, X } from 'lucide-react';
import ShimmerSkeleton from '../components/ui/ShimmerSkeleton';
import SmoothButton from '../components/ui/SmoothButton';

function AddProductModal({ onClose, onAdded }) {
  const dialog = useRef(null);
  useEffect(() => { dialog.current?.showModal(); }, []);
  const [form, setForm] = useState({ product_name: '', brand: '', category: '', barcode: '', serving_size: '', calories: '', sugar: '', sodium: '', fat: '', protein: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const r = await api.post('/food-products', form);
      onAdded(r.data);
      onClose();
    } catch (err) { setError(err.response?.data?.message || 'Error adding product'); }
    finally { setLoading(false); }
  };

  return (
    <dialog ref={dialog} className="modal-overlay product-dialog" onCancel={onClose} onClick={e => e.target === e.currentTarget && onClose()}>
      <section className="modal" role="dialog" aria-modal="true" aria-labelledby="product-modal-title">
        <div className="modal-header">
          <h2 id="product-modal-title" className="modal-title">Add a food product</h2>
          <button className="modal-close" type="button" aria-label="Close add product" onClick={onClose}><X size={18} /></button>
        </div>
        {error && <div className="alert-box alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['product_name', 'Product Name', 'Maggi Noodles'], ['brand', 'Brand', 'Nestle'], ['category', 'Category', 'Snacks'], ['barcode', 'Barcode', '12345'], ['serving_size', 'Serving Size', '70g']].map(([k, l, ph]) => (
              <div className="form-group" key={k} style={k === 'product_name' ? { gridColumn: '1/-1' } : {}}>
                <label className="form-label" htmlFor={`product-${k}`}>{l}</label>
                <input id={`product-${k}`} className="form-input" value={form[k]} onChange={e => f(k, e.target.value)} placeholder={ph} required={k !== 'barcode'} />
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
            <p className="page-eyebrow">NUTRITION PER SERVING</p>
            <div className="product-nutrition-fields">
              {[['calories', 'Cal (kcal)'], ['sugar', 'Sugar (g)'], ['sodium', 'Sodium (mg)'], ['fat', 'Fat (g)'], ['protein', 'Protein (g)']].map(([k, l]) => (
                <div className="form-group" key={k}>
                  <label className="form-label" htmlFor={`product-${k}`}>{l}</label>
                  <input id={`product-${k}`} className="form-input" type="number" min="0" value={form[k]} onChange={e => f(k, e.target.value)} placeholder="0" required />
                </div>
              ))}
            </div>
          </div>
          <SmoothButton type="submit" className="btn btn-primary auth-submit" loading={loading}>Add product</SmoothButton>
        </form>
      </section>
    </dialog>
  );
}

function ProductCard({ product }) {
  const n = product.nutrition;
  return <article className="card product-card">
    <div className="product-card-top"><span className="product-glyph"><Utensils size={21} aria-hidden="true" /></span><span className="tag tag-blue">{product.category}</span></div>
    <h2>{product.product_name}</h2><p>{product.brand} · {product.serving_size}</p>
    {n && <><div className="product-calories"><strong>{n.calories}</strong><span>kcal / serving</span></div>
      <dl className="product-macros">{[['Protein', n.protein, 'g'], ['Fat', n.fat, 'g'], ['Sugar', n.sugar, 'g'], ['Sodium', n.sodium, 'mg']].map(([label, value, unit]) =>
        <div key={label}><dt>{label}</dt><dd>{value} {unit}</dd></div>)}</dl></>}
  </article>;
}

export default function FoodProducts() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    fetchProducts();
    api.get('/food-products/meta/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    setLoadError(false);
    try {
      const r = await api.get('/food-products');
      setProducts(r.data);
      setFiltered(r.data);
    } catch { setLoadError(true); } finally { setLoading(false); }
  };

  useEffect(() => {
    let f = products;
    if (search) f = f.filter(p => p.product_name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()));
    if (category) f = f.filter(p => p.category === category);
    setFiltered(f);
  }, [search, category, products]);

  return (
    <div className="page library-page">
      <div className="page-header flex-between">
        <div>
          <span className="page-eyebrow">YOUR PERSONAL PANTRY</span><h1>Food library</h1><p>Good finds, saved meals, and everyday favourites.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}><Plus size={17} aria-hidden="true" />Add product</button>
      </div>

      <SavedFoods />
      <div className="section-heading"><div><h2>Food products</h2><p>{products.length} products</p></div></div>
      <div className="library-toolbar">
        <label className="library-search"><Search size={18} aria-hidden="true" /><input className="form-input" type="search" aria-label="Search products or brands" placeholder="Search products or brands…" value={search} onChange={e => setSearch(e.target.value)} /></label>
        <select className="form-input" aria-label="Product category" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All categories</option>{categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || category) && <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setCategory(''); }}>Clear</button>}
      </div>

      {loading ? <div className="card-grid card-grid-3">{[0,1,2].map(item => <ShimmerSkeleton key={item} className="product-skeleton" label="Loading food products" />)}</div> : loadError ? <div className="library-empty" role="alert"><PackageOpen size={32} /><h2>Your pantry couldn’t load</h2><button className="btn btn-outline" onClick={fetchProducts}>Try again</button></div> : filtered.length === 0 ? (
        <div className="library-empty"><PackageOpen size={34} aria-hidden="true" /><h2>{search || category ? 'No matching foods' : 'Make room for your favourites'}</h2><p>{search || category ? 'Try another search or category.' : 'Add a food product to keep its nutrition ready for your next meal.'}</p>{!search && !category && <button className="btn btn-outline" onClick={() => setShowModal(true)}><Plus size={16} />Add your first product</button>}</div>
      ) : (
        <div className="card-grid card-grid-3">
          {filtered.map(p => <ProductCard key={p._id} product={p} />)}
        </div>
      )}

      {showModal && <AddProductModal onClose={() => setShowModal(false)} onAdded={p => setProducts(prev => [p, ...prev])} />}
    </div>
  );
}
