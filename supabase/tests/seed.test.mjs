import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createDb, as } from './harness.mjs';

test('demo seed applies cleanly and is idempotent', async () => {
  const db = await createDb();
  const seed = readFileSync(new URL('../seed/demo.sql', import.meta.url), 'utf8');
  await db.exec(seed);
  await db.exec(seed); // re-run must not fail or duplicate
  const [{ n }] = await as(db, null, `select count(*)::int as n from public.products p join public.stores s on s.id = p.store_id where s.slug = 'demo-market'`);
  assert.equal(n, 18);
  const uncategorized = await as(db, null, `select sku from public.products where category_id is null`);
  assert.equal(uncategorized.length, 0, 'every demo product maps to a seeded category');
});
