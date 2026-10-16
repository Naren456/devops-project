const API = '/api';

async function request(path, options) {
  const res = await fetch(`${API}${path}`, options);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.status === 204 ? null : res.json();
}

const json = (method, body) => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

export const getProducts = () => request('/products');
export const getStats = () => request('/products/stats');
export const createProduct = (data) => request('/products', json('POST', data));
export const updateProduct = (id, data) => request(`/products/${id}`, json('PUT', data));
export const deleteProduct = (id) => request(`/products/${id}`, { method: 'DELETE' });
