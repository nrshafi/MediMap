import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { LandingView } from '../LandingView';

const sampleData = {
  popularServices: [
    {
      id: 'complete-blood-count',
      name: 'Complete Blood Count',
      category: 'Hematology',
      listingCount: 2,
    },
    {
      id: 'lipid-profile',
      name: 'Lipid Profile',
      category: 'Biochemistry',
      listingCount: 2,
    },
  ],
  hospitals: [
    {
      id: 'addin-medical-college-hospital',
      name: 'Ad-din Medical College Hospital',
      branchCount: 1,
      branches: [{ id: 'addin-moghbazar', name: 'Moghbazar' }],
    },
    {
      id: 'holy-family-red-crescent-hospital',
      name: 'Holy Family Red Crescent Medical College Hospital',
      branchCount: 1,
      branches: [{ id: 'holy-family-eskatan', name: 'Eskatan Garden Road' }],
    },
  ],
};

test('LandingView renders hero, search form, and 3 steps of How it works', () => {
  const html = renderToStaticMarkup(<LandingView data={sampleData} />);
  assert.match(html, /Find the test\.<br\/>Know the published price\./);
  assert.match(html, /role="search"/);
  assert.match(html, /name="q"/);
  assert.match(html, /Search services/);
  assert.match(html, /How it works/);
  assert.match(html, /Search a test/);
  assert.match(html, /Choose your area/);
  assert.match(html, /Compare verified prices/);
});

test('LandingView renders popular services as clickable cards to /find?service=<id> without prices', () => {
  const html = renderToStaticMarkup(<LandingView data={sampleData} />);
  assert.match(html, /Popular services/);
  assert.match(html, /Complete Blood Count/);
  assert.match(html, /Lipid Profile/);
  assert.match(html, /href="\/find\?service=complete-blood-count"/);
  assert.match(html, /aria-label="Find Complete Blood Count"/);
  assert.match(html, /href="\/find\?service=lipid-profile"/);
  assert.match(html, /aria-label="Find Lipid Profile"/);
  assert.doesNotMatch(html, /BDT/);
  assert.doesNotMatch(html, /Price unknown/);
});

test('LandingView renders trust section with report link, accurate copy, and coverage notice', () => {
  const html = renderToStaticMarkup(<LandingView data={sampleData} />);
  assert.match(html, /Why you can trust the prices/);
  assert.match(
    html,
    /Each price shows its status \(verified, unverified, or disputed\), its official source, and its review date\./,
  );
  assert.match(
    html,
    /Each listing shows when an administrator verified the tariff row\. Old prices keep their real review date\./,
  );
  assert.match(
    html,
    /If a hospital revises a price, users can report incorrect information\. An administrator reviews each report against the official source\./,
  );
  assert.match(html, /href="\/report"/);
  assert.match(html, /Coverage is partial\./);
});

test('LandingView renders covered hospitals with links to branch pages', () => {
  const html = renderToStaticMarkup(<LandingView data={sampleData} />);
  assert.match(html, /Hospitals covered/);
  assert.match(html, /Hospitals with published prices in MediMap/);
  assert.match(html, /Ad-din Medical College Hospital/);
  assert.match(html, /Holy Family Red Crescent Medical College Hospital/);
  assert.match(html, /1 branch/);
  assert.match(html, /href="\/branches\/addin-moghbazar"/);
  assert.match(html, /Moghbazar/);
  assert.match(html, /href="\/branches\/holy-family-eskatan"/);
  assert.match(html, /Eskatan Garden Road/);
});

test('LandingView renders final call to action to /find', () => {
  const html = renderToStaticMarkup(<LandingView data={sampleData} />);
  assert.match(html, /Ready to find diagnostic services\?/);
  assert.match(html, /href="\/find"/);
});
