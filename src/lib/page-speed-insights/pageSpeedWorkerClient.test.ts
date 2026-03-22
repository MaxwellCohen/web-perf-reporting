import { describe, expect, it } from 'vitest';
import {
  getCompletedPayloadFromEnvelope,
  type WorkerJobEnvelope,
} from '@/lib/page-speed-insights/pageSpeedWorkerClient';

describe('getCompletedPayloadFromEnvelope', () => {
  it('returns payload when completed with data', () => {
    const env: WorkerJobEnvelope = { status: 'completed', data: '{"x":1}' };
    expect(getCompletedPayloadFromEnvelope(env)).toEqual({
      ok: true,
      payload: '{"x":1}',
    });
  });

  it('treats missing data as empty', () => {
    expect(getCompletedPayloadFromEnvelope({ status: 'completed' })).toEqual({
      ok: false,
      reason: 'empty',
    });
  });

  it('maps failed status', () => {
    expect(getCompletedPayloadFromEnvelope({ status: 'failed' })).toEqual({
      ok: false,
      reason: 'failed',
    });
  });

  it('maps non-completed as not_ready', () => {
    expect(getCompletedPayloadFromEnvelope({ status: 'pending' })).toEqual({
      ok: false,
      reason: 'not_ready',
    });
  });
});
