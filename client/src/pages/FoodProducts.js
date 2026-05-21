import React, { useState, useEffect } from 'react';
import api from '../utils/api';

function AddProductModal({ onClose, onAdded }) {
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
    <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <div className="modal-header">
          <span className="modal-title">Add Food Product</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>
        {error && <div className="alert-box alert-error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[['product_name', 'Product Name', 'Maggi Noodles'], ['brand', 'Brand', 'Nestle'], ['category', 'Category', 'Snacks'], ['barcode', 'Barcode', '12345'], ['serving_size', 'Serving Size', '70g']].map(([k, l, ph]) => (
              <div className="form-group" key={k} style={k === 'product_name' ? { gridColumn: '1/-1' } : {}}>
                <label className="form-label">{l}</label>
                <input className="form-input" value={form[k]} onChange={e => f(k, e.target.value)} placeholder={ph} required={k !== 'barcode'} />
              </div>
            ))}
          </div>
          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, marginTop: 4 }}>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12, fontFamily: 'Space Mono', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Nutrition Facts (per serving)</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
              {[['calories', 'Cal (kcal)'], ['sugar', 'Sugar (g)'], ['sodium', 'Sodium (mg)'], ['fat', 'Fat (g)'], ['protein', 'Protein (g)']].map(([k, l]) => (
                <div className="form-group" key={k}>
                  <label className="form-label">{l}</label>
                  <input className="form-input" type="number" min="0" value={form[k]} onChange={e => f(k, e.target.value)} placeholder="0" required />
                </div>
              ))}
            </div>
          </div>
          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }} disabled={loading}>
            {loading ? 'Adding...' : 'Add Product'}
          </button>
        </form>
      </div>
    </div>
  );
}

function ProductCard({ product }) {
  const n = product.nutrition;
  return (
    <div className="card" style={{ position: 'relative' }}>
      <div className="flex-between" style={{ marginBottom: 8 }}>
        <span className="tag tag-blue">{product.category}</span>
        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'Space Mono' }}>{product.product_id}</span>
      </div>
      <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: 2 }}>{product.product_name}</h3>
      <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: 12 }}>{product.brand} · {product.serving_size}</p>
      {n && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          {[['🔥', n.calories, 'kcal'], ['🍬', n.sugar, 'g sugar'], ['🧂', n.sodium, 'mg Na'], ['🧈', n.fat, 'g fat'], ['💪', n.protein, 'g prot']].map(([icon, val, lbl]) => (
            <div key={lbl} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{icon}</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 800, fontFamily: 'Space Mono', color: 'var(--accent)' }}>{val}</div>
              <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', fontFamily: 'Space Mono' }}>{lbl}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function FoodProducts() {
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchProducts();
    api.get('/food-products/meta/categories').then(r => setCategories(r.data)).catch(() => {});
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const r = await api.get('/food-products');
      setProducts(r.data);
      setFiltered(r.data);
    } finally { setLoading(false); }
  };

  useEffect(() => {
    let f = products;
    if (search) f = f.filter(p => p.product_name.toLowerCase().includes(search.toLowerCase()) || p.brand.toLowerCase().includes(search.toLowerCase()));
    if (category) f = f.filter(p => p.category === category);
    setFiltered(f);
  }, [search, category, products]);

  return (
    <div className="page">
      <div className="page-header flex-between">
        <div>
          <h2>Food Products</h2>
          <p>{products.length} products in database</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowModal(true)}>+ Add Product</button>
      </div>

      <div className="card mb-16" style={{ display: 'flex', gap: 12, alignItems: 'center', padding: '14px 16px' }}>
        <input className="form-input" style={{ flex: 1, margin: 0 }} placeholder="Search products or brands..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="form-input" style={{ width: 'auto', margin: 0 }} value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        {(search || category) && <button className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setCategory(''); }}>Clear</button>}
      </div>

      {loading ? <div className="loading"><div className="spinner" />Loading products...</div> : filtered.length === 0 ? (
        <div className="empty-state"><div className="empty-icon">🍱</div><p>No products found. Add one!</p></div>
      ) : (
        <div className="card-grid card-grid-3">
          {filtered.map(p => <ProductCard key={p._id} product={p} />)}
        </div>
      )}

      {showModal && <AddProductModal onClose={() => setShowModal(false)} onAdded={p => setProducts(prev => [p, ...prev])} />}
    </div>
  );
}
