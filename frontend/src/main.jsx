import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { getProducts, getStats, createProduct, updateProduct, deleteProduct } from './api.js';
import './styles.css';

const CATEGORIES = ['Power Tools', 'Hand Tools', 'Fasteners', 'Electrical', 'Plumbing', 'Paint', 'Safety'];
const FILTERS = ['ALL', 'IN_STOCK', 'LOW_STOCK', 'OUT_OF_STOCK'];
const LABELS = { ALL: 'All', IN_STOCK: 'In stock', LOW_STOCK: 'Low stock', OUT_OF_STOCK: 'Out of stock' };
const money = (n) => `$${Number(n).toFixed(2)}`;

function App() {
  const [products, setProducts] = useState([]);
  const [stats, setStats] = useState({ total: 0, inStock: 0, lowStock: 0, outOfStock: 0 });
  const [filter, setFilter] = useState('ALL');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(null); // null = closed, {} = new, {...} = edit

  const load = async () => {
    try {
      setError('');
      const [p, s] = await Promise.all([getProducts(), getStats()]);
      setProducts(p);
      setStats(s);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return products
      .filter((p) => filter === 'ALL' || p.status === filter)
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
  }, [products, filter, query]);

  const adjust = async (p, delta) => {
    const quantity = Math.max(0, p.quantity + delta);
    if (quantity === p.quantity) return;
    await updateProduct(p.id, { quantity });
    load();
  };

  const remove = async (p) => {
    if (!window.confirm(`Delete "${p.name}"?`)) return;
    await deleteProduct(p.id);
    load();
  };

  const save = async (data) => {
    if (editing && editing.id) await updateProduct(editing.id, data);
    else await createProduct(data);
    setEditing(null);
    load();
  };

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-mark">◆</span>
          <div><b>StockDesk</b><small>Hardware Inventory</small></div>
        </div>
        <nav>
          <a className="active">▦ <span>Dashboard</span></a>
          <a>▤ <span>Inventory</span></a>
          <a>⌸ <span>Categories</span></a>
          <a>↯ <span>Reports</span></a>
        </nav>
        <div className="side-bottom">
          <div className="upgrade">
            <strong>Low on stock?</strong>
            <p>Restock before items hit zero to avoid stockouts.</p>
          </div>
          <div className="profile">
            <div className="avatar">NS</div>
            <div><b>Naren S.</b><small>Store manager</small></div>
            <span>⋮</span>
          </div>
        </div>
      </aside>

      <main className="main">
        <header>
          <div>
            <p className="eyebrow">WAREHOUSE / OVERVIEW</p>
            <h1>Hardware stock 🔧</h1>
            <p className="muted">Track every item on the shelves in one place.</p>
          </div>
          <button className="primary" onClick={() => setEditing({})}>＋ Add product</button>
        </header>

        {error && <div className="alert">⚠ {error}. Start the backend and PostgreSQL, then refresh.</div>}

        <section className="stats">
          <Stat label="Total items" value={stats.total} icon="▦" tone="neutral" />
          <Stat label="In stock" value={stats.inStock} icon="✓" tone="good" />
          <Stat label="Low stock" value={stats.lowStock} icon="◔" tone="warn" />
          <Stat label="Out of stock" value={stats.outOfStock} icon="○" tone="bad" />
        </section>

        <section className="panel">
          <div className="panel-head">
            <div>
              <h2>Inventory</h2>
              <p className="muted">{visible.length} of {products.length} items</p>
            </div>
            <div className="controls">
              <input className="search" placeholder="Search name, SKU, category…" value={query} onChange={(e) => setQuery(e.target.value)} />
              <div className="filters">
                {FILTERS.map((f) => (
                  <button key={f} className={filter === f ? 'selected' : ''} onClick={() => setFilter(f)}>{LABELS[f]}</button>
                ))}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="empty">Loading inventory…</div>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr><th>Product</th><th>Category</th><th>Price</th><th>Quantity</th><th>Status</th><th></th></tr>
                </thead>
                <tbody>
                  {visible.map((p) => (
                    <tr key={p.id}>
                      <td>
                        <div className="product-title">
                          <span className={`dot ${p.status.toLowerCase()}`}></span>
                          <div><b>{p.name}</b><small>{p.sku || '—'}</small></div>
                        </div>
                      </td>
                      <td>{p.category}</td>
                      <td>{money(p.price)}</td>
                      <td>
                        <div className="stepper">
                          <button onClick={() => adjust(p, -1)} title="Remove one" disabled={p.quantity === 0}>−</button>
                          <b>{p.quantity}</b>
                          <button onClick={() => adjust(p, +1)} title="Add one">+</button>
                        </div>
                      </td>
                      <td><span className={`status ${p.status.toLowerCase()}`}>{LABELS[p.status]}</span></td>
                      <td className="row-actions">
                        <button className="icon-btn" onClick={() => setEditing(p)} title="Edit">✎</button>
                        <button className="icon-btn danger" onClick={() => remove(p)} title="Delete">🗑</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {!visible.length && <div className="empty">No products match this view.</div>}
            </div>
          )}
        </section>
      </main>

      {editing && <ProductModal product={editing} onClose={() => setEditing(null)} onSave={save} />}
    </div>
  );
}

function Stat({ label, value, icon, tone }) {
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-icon">{icon}</div>
      <div><small>{label}</small><strong>{value}</strong></div>
    </div>
  );
}

function ProductModal({ product, onClose, onSave }) {
  const isEdit = Boolean(product.id);
  const [form, setForm] = useState({
    name: product.name || '',
    sku: product.sku || '',
    category: product.category || CATEGORIES[0],
    quantity: product.quantity ?? 0,
    price: product.price ?? 0,
  });
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = (e) => {
    e.preventDefault();
    onSave({
      name: form.name.trim(),
      sku: form.sku.trim(),
      category: form.category,
      quantity: Number(form.quantity) || 0,
      price: Number(form.price) || 0,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <form className="modal" onClick={(e) => e.stopPropagation()} onSubmit={submit}>
        <div className="modal-head">
          <div>
            <p className="eyebrow">{isEdit ? 'EDIT PRODUCT' : 'NEW PRODUCT'}</p>
            <h2>{isEdit ? form.name || 'Edit product' : 'Add a product'}</h2>
          </div>
          <button type="button" className="close" onClick={onClose}>×</button>
        </div>
        <label>Product name<input required value={form.name} onChange={set('name')} placeholder="e.g. Cordless Drill 18V" /></label>
        <div className="form-row">
          <label>SKU<input value={form.sku} onChange={set('sku')} placeholder="e.g. DRL-018" /></label>
          <label>Category
            <select value={form.category} onChange={set('category')}>
              {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
            </select>
          </label>
        </div>
        <div className="form-row">
          <label>Quantity<input type="number" min="0" value={form.quantity} onChange={set('quantity')} /></label>
          <label>Price (USD)<input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} /></label>
        </div>
        <button className="primary full">{isEdit ? 'Save changes' : 'Add product'}</button>
      </form>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
