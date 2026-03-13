/**
 * Add the 10 invoice items (Kathy Pracht, Mar 9 2026) to inventory via API.
 * Run from project root: node add-kathy-pracht-invoice.js
 * Requires: server running on localhost:3002
 */
const BASE = 'http://localhost:3002';

const NEW_PROJECTS = [
  { description: '6" Uno family w/ stand', price: 26, quantity: 1 },
  { description: '6" R/W/B floral ribbon w/ stand', price: 26, quantity: 1 },
  { description: '5" R/W/B USA w/ stand', price: 24, quantity: 1 },
  { description: '5" R/W/B US Map w/ stand', price: 25, quantity: 1 },
  { description: 'Sunflower Keychain', price: 7, quantity: 1 },
  { description: 'R/W/B Flower Keychain', price: 7, quantity: 1 },
  { description: '4" Lady Liberty w/ stand', price: 20, quantity: 1 },
  { description: 'Flag Brooch', price: 0, quantity: 1 },
  { description: 'Flower Brooch R/W/B', price: 0, quantity: 1 },
  { description: '4" Bee you-tiful w/ stand', price: 18, quantity: 1 },
];

const customer = 'Kathy Pracht';
const dateAdded = '2026-03-09T12:00:00.000Z';

async function main() {
  const res = await fetch(`${BASE}/api/inventory`);
  if (!res.ok) throw new Error('Failed to fetch inventory: ' + res.status);
  const current = await res.json();

  const newItems = NEW_PROJECTS.map((p, i) => ({
    _id: `kathy-pracht-20260309-${i}-${Date.now()}`,
    name: p.description,
    description: p.description,
    customer,
    location: '',
    price: p.price,
    quantity: p.quantity || 1,
    totalValue: (p.price || 0) * (p.quantity || 1),
    status: 'pending',
    priority: 'medium',
    dateAdded,
    dueDate: '',
    notes: '',
    category: '',
    tags: '',
    patternLink: '',
    type: 'project',
  }));

  const combined = [...current, ...newItems];
  const postRes = await fetch(`${BASE}/api/inventory`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(combined),
  });
  if (!postRes.ok) throw new Error('Failed to save inventory: ' + (await postRes.text()));
  console.log('Added', newItems.length, 'projects for', customer, '- Total inventory:', combined.length);
}

main().catch((e) => { console.error(e); process.exit(1); });
