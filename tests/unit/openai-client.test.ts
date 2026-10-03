import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertAzureResponsesApiVersion,
  DEFAULT_AZURE_OPENAI_API_VERSION,
} from '../../lib/ai/openai-client';

test('Azure Responses API default is new enough for web search', () => {
  assert.doesNotThrow(() => assertAzureResponsesApiVersion(DEFAULT_AZURE_OPENAI_API_VERSION));
  assert.doesNotThrow(() => assertAzureResponsesApiVersion('2025-04-01-preview'));
  assert.doesNotThrow(() => assertAzureResponsesApiVersion('v1'));
});

test('Azure Responses API rejects versions from before Responses support', () => {
  assert.throws(
    () => assertAzureResponsesApiVersion('2025-01-01-preview'),
    /provider_configuration_error: AZURE_OPENAI_API_VERSION must be 2025-03-01-preview or later/,
  );
  assert.throws(() => assertAzureResponsesApiVersion('not-a-version'), /provider_configuration_error/);
});
