// Deterministic tests for the Mete Business Blueprint financial engine.
// The engine lives inside app/mete-business-blueprint.html between /*ENGINE-START*/ and /*ENGINE-END*/,
// so these tests read it straight from the app — no copy to drift out of sync.
// Run: node tests/engine.test.js
'use strict';
const fs = require('fs');
const path = require('path');
const assert = require('assert');

const html = fs.readFileSync(path.join(__dirname, '..', 'app', 'mete-business-blueprint.html'), 'utf8');
const m = html.match(/\/\*ENGINE-START\*\/([\s\S]*?)\/\*ENGINE-END\*\//);
if (!m) { console.error('Engine block not found in app HTML'); process.exit(1); }
const Engine = new Function(m[1] + '\nreturn Engine;')();

const A = v => ({ v, tag: 'Assumption', note: '', src: '' });
const close = (a, b, eps = 1e-6) => assert.ok(Math.abs(a - b) <= eps, `expected ${b}, got ${a}`);

// Simple project: $10 product costing $4, 10 new customers a month, $120/month fixed.
function fixture(over = {}) {
  const p = {
    profile: { launchDate: '' },
    products: [{ name: 'Item', price: 10, unitCost: 4, mix: 100 }],
    channels: [{ name: 'Direct', share: 100, realization: 100, collectDays: 0, spend: 100 }],
    fin: {
      a: { contacts: A(1000), growth: A(0), leadRate: A(10), qualRate: A(50), closeRate: A(20), repeatRate: A(0), unitsPerOrder: A(1),
        paymentFee: A(0), payrollTax: A(0), ownerHours: A(10), hoursPerUnit: A(0) },
      fixed: [{ name: 'Insurance', amount: 20 }],
      uses: [],
      funding: [],
      season: Array(12).fill(100)
    },
    ops: { selected: 'lean', models: {
      lean: { capacity: 0, fixed: 0, staff: [], equipment: [] },
      standard: { capacity: 0, fixed: 50, staff: [], equipment: [] },
      expansion: { capacity: 0, fixed: 0, staff: [], equipment: [] } } },
    settings: { scenarios: { best: { vol: 120, price: 100, cost: 95 }, worst: { vol: 70, price: 100, cost: 110 } } }
  };
  over(p);
  return p;
}
fixture.base = () => fixture(() => {});
const mk = f => fixture(f || (() => {}));

const tests = [];
const test = (name, fn) => tests.push([name, fn]);

// ---- helpers ----
test('num parses numbers and strings, treats junk as 0', () => {
  assert.strictEqual(Engine.num(5), 5);
  assert.strictEqual(Engine.num('12.5'), 12.5);
  assert.strictEqual(Engine.num('abc'), 0);
  assert.strictEqual(Engine.num(NaN), 0);
  assert.strictEqual(Engine.num(undefined), 0);
});
test('av reads the value from an assumption object or a bare number', () => {
  assert.strictEqual(Engine.av(A(7)), 7);
  assert.strictEqual(Engine.av(3), 3);
  assert.strictEqual(Engine.av({ v: '4' }), 4);
});

// ---- loan math ----
test('amortPayment is 0 for no principal', () => close(Engine.amortPayment(0, 9, 24), 0));
test('amortPayment at 0% splits principal evenly', () => close(Engine.amortPayment(1200, 0, 12), 100));
test('amortPayment matches the standard formula ($12,000, 12%, 12 mo)', () => close(Engine.amortPayment(12000, 12, 12), 1066.1854, 1e-3));
test('amortPayment treats a 0 term as 1 month', () => close(Engine.amortPayment(500, 0, 0), 500));

// ---- unit economics ----
test('unit economics: single product price, cost and contribution', () => {
  const ue = Engine.unitEconomics(mk());
  close(ue.avgPrice, 10); close(ue.avgCost, 4); close(ue.unitContribution, 6); close(ue.contributionMargin, 0.6);
});
test('unit economics weights price and cost by product mix', () => {
  const ue = Engine.unitEconomics(mk(p => { p.products = [{ price: 10, unitCost: 4, mix: 75 }, { price: 20, unitCost: 8, mix: 25 }]; }));
  close(ue.avgPrice, 12.5); close(ue.avgCost, 5);
});
test('products with 0% mix are ignored', () => {
  const ue = Engine.unitEconomics(mk(p => { p.products.push({ price: 999, unitCost: 1, mix: 0 }); }));
  close(ue.avgPrice, 10);
});
test('channel realization lowers the realized price', () => {
  const ue = Engine.unitEconomics(mk(p => { p.channels = [{ share: 50, realization: 100, collectDays: 0, spend: 0 }, { share: 50, realization: 70, collectDays: 0, spend: 0 }]; }));
  close(ue.realization, 0.85); close(ue.realizedPrice, 8.5);
});
test('payment fee is charged on the realized price', () => {
  const ue = Engine.unitEconomics(mk(p => { p.fin.a.paymentFee = A(3); }));
  close(ue.unitVar, 4.3); close(ue.unitContribution, 5.7);
});

// ---- monthly model ----
test('funnel: 1,000 contacts × 10% × 50% × 20% = 10 new customers', () => {
  const r = Engine.run(mk());
  close(r.months[0].newCust, 10); close(r.months[0].units, 10);
});
test('monthly revenue, contribution and operating result', () => {
  const r = Engine.run(mk());
  close(r.months[0].revenue, 100); close(r.months[0].contribution, 60);
  close(r.fixedTotal, 120); close(r.months[0].opResult, -60);
});
test('fixed cost includes other fixed, model fixed, payroll and marketing', () => {
  const r = Engine.run(mk(p => { p.ops.selected = 'standard'; }));
  close(r.fixedTotal, 170);
});
test('break-even units = fixed ÷ unit contribution', () => close(Engine.run(mk()).beUnits, 20));
test('break-even is null when each unit loses money', () => {
  assert.strictEqual(Engine.run(mk(p => { p.products[0].unitCost = 12; })).beUnits, null);
});
test('annual totals add up the 12 months', () => {
  const r = Engine.run(mk());
  close(r.totals.revenue, 1200); close(r.totals.opResult, -720);
});
test('payroll = hours × rate × 4.33 weeks, plus payroll tax', () => {
  const r = Engine.run(mk(p => { p.ops.models.lean.staff = [{ hours: 10, rate: 15 }]; p.fin.a.payrollTax = A(10); }));
  close(r.payroll, 10 * 15 * 4.33 * 1.1);
});

// ---- capacity ----
test('equipment capacity caps units and records overflow', () => {
  const r = Engine.run(mk(p => { p.ops.models.lean.capacity = 6; }));
  close(r.months[0].units, 6); close(r.months[0].overflow, 4); assert.strictEqual(r.capacityShort, true);
});
test('labor capacity = (owner + staff hours) × 4.33 ÷ hours per unit', () => {
  const r = Engine.run(mk(p => { p.fin.a.hoursPerUnit = A(5); }));
  close(r.laborCap, 10 * 4.33 / 5); close(r.months[0].units, 8.66);
});
test('no capacity limit when capacity and hours per unit are 0', () => {
  const r = Engine.run(mk());
  assert.strictEqual(r.capacity, Infinity); assert.strictEqual(r.capacityShort, false);
});

// ---- growth, repeat, seasonality ----
test('contacts grow by the monthly growth rate', () => {
  const r = Engine.run(mk(p => { p.fin.a.growth = A(10); }));
  close(r.months[1].contacts, 1100); close(r.months[2].contacts, 1210);
});
test('repeat orders come from the customer base built so far', () => {
  const r = Engine.run(mk(p => { p.fin.a.repeatRate = A(50); }));
  close(r.months[0].repeatOrders, 0); close(r.months[1].repeatOrders, 5);
});
test('seasonality follows the launch month', () => {
  const r = Engine.run(mk(p => { p.profile.launchDate = '2027-03-01'; p.fin.season = [100, 100, 200, 100, 100, 100, 100, 100, 100, 100, 100, 100]; }));
  assert.strictEqual(r.startMonth, 2); close(r.months[0].contacts, 2000); close(r.months[1].contacts, 1000);
});

// ---- cash ----
test('starting cash = funding − uses − equipment', () => {
  const r = Engine.run(mk(p => { p.fin.funding = [{ type: 'Equity', amount: 5000 }]; p.fin.uses = [{ amount: 1000 }]; p.ops.models.lean.equipment = [{ cost: 500 }]; }));
  close(r.cash0, 3500);
});
test('30-day collection delays cash receipts by one month', () => {
  const r = Engine.run(mk(p => { p.channels[0].collectDays = 30; }));
  close(r.months[0].receipts, 0); close(r.months[1].receipts, 100);
});
test('loan payments split into interest and principal', () => {
  const r = Engine.run(mk(p => { p.fin.funding = [{ type: 'Loan', amount: 12000, rate: 12, term: 12 }]; }));
  close(r.months[0].interest, 120); close(r.months[0].debtService, 1066.1854, 1e-3);
  close(r.months.reduce((s, x) => s + x.principal, 0), 12000, 1e-6);
});
test('first negative cash month is found', () => {
  const r = Engine.run(mk(p => { p.fin.funding = [{ type: 'Equity', amount: 100 }]; }));
  assert.strictEqual(r.firstNegCash, 1); // 100 − 60 = 40, then −20
});
test('break-even month is the first month with operating result ≥ 0', () => {
  const r = Engine.run(mk(p => { p.fin.a.growth = A(50); }));
  // contribution 60 × 1.5^i ≥ 120 first at i = 2
  assert.strictEqual(r.beMonth, 2);
});
test('CAC = monthly marketing ÷ average new customers', () => close(Engine.run(mk()).cac, 10));

// ---- scenarios ----
test('scenarios return worst, base, best; base equals a plain run', () => {
  const p = mk(); const s = Engine.scenarios(p);
  assert.deepStrictEqual(s.map(x => x.key), ['worst', 'base', 'best']);
  close(s[1].r.totals.opResult, Engine.run(p).totals.opResult);
  assert.ok(s[0].r.totals.opResult < s[1].r.totals.opResult && s[1].r.totals.opResult < s[2].r.totals.opResult);
});
test('sensitivity grid is 5 × 5 and its center equals the base case', () => {
  const p = mk(); const g = Engine.sensitivity(p);
  assert.strictEqual(g.length, 5); g.forEach(row => assert.strictEqual(row.cells.length, 5));
  close(g[2].cells[2].op, Engine.run(p).totals.opResult);
});
test('same inputs always give the same result', () => {
  assert.deepStrictEqual(Engine.run(mk()), Engine.run(mk()));
});

// ---- runner ----
let pass = 0, fail = 0;
for (const [name, fn] of tests) {
  try { fn(); pass++; console.log('  ok   ' + name); }
  catch (e) { fail++; console.log('  FAIL ' + name + '\n       ' + e.message); }
}
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
