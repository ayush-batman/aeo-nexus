import assert from 'node:assert/strict';
import test from 'node:test';
import { splitSourceGap } from '../../lib/measurement/source-gaps';

test('source gap copy keeps commas inside a source name', () => {
  assert.deepEqual(
    splitSourceGap('Review Sites (G2, Capterra), Get listed on review platforms'),
    ['Review Sites (G2, Capterra)', 'Get listed on review platforms'],
  );
  assert.deepEqual(
    splitSourceGap('YouTube, Create video content for niche topics'),
    ['YouTube', 'Create video content for niche topics'],
  );
});

