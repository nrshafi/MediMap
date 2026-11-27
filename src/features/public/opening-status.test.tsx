import { test } from 'node:test';
import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Branch, BranchService } from '../catalog/contracts';
import type { WeeklyHours } from '../providers/hours';
import { DetailPage } from './DetailPage';

const hours: WeeklyHours = {
  timeZone: 'Asia/Dhaka',
  days: {
    sunday: [{ opens: '08:00', closes: '18:00' }],
    monday: [{ opens: '08:00', closes: '18:00' }],
    tuesday: [{ opens: '08:00', closes: '18:00' }],
    wednesday: [{ opens: '08:00', closes: '18:00' }],
    thursday: [{ opens: '08:00', closes: '18:00' }],
    friday: [],
    saturday: [{ opens: '08:00', closes: '18:00' }],
  },
};

const branch: Branch = {
  id: 'branch-a',
  name: 'Moghbazar',
  provider: { id: 'provider-a', name: 'Ad-din Hospital', phone: null, website: null },
  address: '2 Bara Maghbazar, Dhaka 1217',
  phone: null,
  alternativePhone: null,
  website: null,
  openingHours: hours,
  coordinates: { latitude: 23.7483439, longitude: 90.4053762 },
  contactSource: null,
};

const listing: BranchService = {
  id: 'listing-a',
  providerServiceName: 'CBC',
  service: { id: 'cbc', name: 'Complete Blood Count', category: { id: 'hem', name: 'Hematology' } },
  branch,
  price: null,
};

test('DetailPage computes the opening status from the server now prop', () => {
  // Sunday 2026-11-22 10:00 Asia/Dhaka = 04:00 UTC -> open
  const openNow = '2026-11-22T04:00:00.000Z';
  // Sunday 2026-11-22 20:00 Asia/Dhaka = 14:00 UTC -> closed
  const closedNow = '2026-11-22T14:00:00.000Z';

  const detailOpen = renderToStaticMarkup(
    <DetailPage
      data={{
        entity: branch,
        listings: [listing],
        kind: 'branch',
        branchRating: null,
        providerRating: null,
        listingDimensions: {},
        now: openNow,
      }}
    />,
  );
  assert.match(detailOpen, /Current opening status in Dhaka:[\s\S]*>open</);

  const detailClosed = renderToStaticMarkup(
    <DetailPage
      data={{
        entity: branch,
        listings: [listing],
        kind: 'branch',
        branchRating: null,
        providerRating: null,
        listingDimensions: {},
        now: closedNow,
      }}
    />,
  );
  assert.match(detailClosed, /Current opening status in Dhaka:[\s\S]*>closed</);
});
