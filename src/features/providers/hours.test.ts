import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  hoursFromForm,
  openingStatus,
  storedHours,
  weeklyHours,
  dayHoursLabel,
  weekDays,
} from './hours';

function closedWeek() {
  return Object.fromEntries(weekDays.map((day) => [`hours_${day}`, 'closed']));
}
test('unknown, closed, split, all-day and overnight hours stay distinct', () => {
  assert.equal(hoursFromForm({}), null);
  const hours = hoursFromForm({
    ...closedWeek(),
    hours_sunday: '08:00-12:00, 14:00-18:00',
    hours_monday: '00:00-24:00',
    hours_saturday: '22:00-02:00',
  });
  assert.ok(hours);
  assert.deepEqual(hours.days.friday, []);
  assert.equal(hours.days.sunday?.length, 2);
  assert.equal(dayHoursLabel(hours.days.saturday), '22:00 to 02:00 next day');
  assert.deepEqual(storedHours(JSON.stringify(hours)), hours);
});
test('opening status uses Dhaka time, inclusive starts and exclusive ends', () => {
  const hours = hoursFromForm({ ...closedWeek(), hours_sunday: '08:00-12:00, 14:00-18:00' });
  assert.equal(openingStatus(hours, new Date('2026-11-01T01:59:00Z')), 'closed');
  assert.equal(openingStatus(hours, new Date('2026-11-01T02:00:00Z')), 'open');
  assert.equal(openingStatus(hours, new Date('2026-11-01T06:00:00Z')), 'closed');
  assert.equal(openingStatus(hours, new Date('2026-11-01T08:00:00Z')), 'open');
  assert.equal(openingStatus(hours, new Date('2026-11-01T12:00:00Z')), 'closed');
});
test('overnight status crosses midnight and the week boundary', () => {
  const hours = hoursFromForm({ ...closedWeek(), hours_saturday: '22:00-02:00' });
  assert.equal(openingStatus(hours, new Date('2026-10-31T16:00:00Z')), 'open');
  assert.equal(openingStatus(hours, new Date('2026-10-31T19:59:00Z')), 'open');
  assert.equal(openingStatus(hours, new Date('2026-10-31T20:00:00Z')), 'closed');
});
test('unknown days never become invented closed hours', () => {
  const hours = hoursFromForm({ hours_sunday: 'closed' });
  assert.equal(openingStatus(null, new Date()), 'unknown');
  assert.equal(openingStatus(hours, new Date('2026-11-01T02:00:00Z')), 'unknown');
  const known = hoursFromForm({ hours_sunday: '08:00-10:00' });
  assert.equal(openingStatus(known, new Date('2026-11-01T02:00:00Z')), 'open');
});
test('invalid clocks, equal boundaries, overlap and cross-day overlap are rejected', () => {
  for (const text of [
    '08:00-08:00',
    '24:00-08:00',
    '08:00-25:00',
    '08:60-12:00',
    '8:00-12:00',
    '08:00',
    '08:00-12:00, 11:00-14:00',
  ]) {
    assert.throws(() => hoursFromForm({ hours_sunday: text }));
  }
  assert.throws(() =>
    hoursFromForm({ hours_saturday: '22:00-02:00', hours_sunday: '01:00-05:00' }),
  );
  assert.throws(() => hoursFromForm({ hours_sunday: '22:00-02:00', hours_monday: '01:00-05:00' }));
  assert.throws(() => storedHours('free text'));
  assert.throws(() => weeklyHours({ timeZone: 'UTC', days: {} }));
  assert.throws(() => storedHours('{"timeZone":"Asia/Dhaka","days":{}}'));
});
