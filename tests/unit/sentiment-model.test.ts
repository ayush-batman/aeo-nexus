import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compareDrift, computeSnapshots, type DriftSnapshot } from '../../lib/analytics/sentiment-model';
const base:DriftSnapshot={workspace_id:'w',prompt:'p',platform:'gemini',week_start:'2026-08-31',avg_sentiment:-1,sample_size:4,
  provider_model:'model',measurement_region:'in',measurement_mode:'standard',scorer_version:'v2',measurement_contract_version:'v2',search_mode:'grounded',analyzer_method:'llm',analyzer_model:'analyzer',analyzer_prompt_version:'v2'};
test('drift refuses gaps, small samples and incompatible analyzer evidence',()=>{
  const current={...base,week_start:'2026-09-07',avg_sentiment:1};
  assert.equal(compareDrift(current,base)?.qualified,true);
  assert.equal(compareDrift({...current,sample_size:3},base),null);
  assert.equal(compareDrift({...current,week_start:'2026-09-14'},base),null);
  assert.equal(compareDrift({...current,analyzer_model:'changed'},base),null);
  assert.equal(compareDrift({...current,analyzer_model:null},base),null);
  assert.equal(compareDrift({...current,avg_sentiment:-0.6},base)?.qualified,false);
});
test('weekly sentiment excludes failed, out-of-period and invalid scores',()=>{
  const sample={...base,created_at:'2026-09-01T00:00:00Z',sentiment_score:0.5};
  const rows=computeSnapshots([sample,{...sample,sentiment_score:NaN},{...sample,failed:true},{...sample,sentiment_score:2},{...sample,created_at:'2026-09-07T00:00:00Z'}],new Date('2026-08-31'));
  assert.equal(rows[0].sample_size,1);assert.equal(rows[0].avg_sentiment,0.5);
});
