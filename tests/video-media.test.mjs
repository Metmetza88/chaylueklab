import test from 'node:test';
import assert from 'node:assert/strict';
import { videoOutputUrl } from '../assets/video-media.js';

const api = 'https://yobymeygbfiwlngmwjcn.supabase.co/functions/v1';
test('video preview and download accept only the configured private signed output', () => {
  const value = 'https://yobymeygbfiwlngmwjcn.supabase.co/storage/v1/object/sign/video-generations/user/job.mp4?token=example';
  assert.equal(videoOutputUrl(value, api), value);
});

test('video output rejects script URLs, external hosts and unsigned paths before assigning DOM URLs', () => {
  for (const value of ['javascript:alert(1)', 'data:text/html,unsafe', 'https://other.example/job.mp4', 'https://yobymeygbfiwlngmwjcn.supabase.co/storage/v1/object/public/video-generations/job.mp4', 'https://yobymeygbfiwlngmwjcn.supabase.co/storage/v1/object/sign/video-generations/job.mp4', 'https://someone:password@yobymeygbfiwlngmwjcn.supabase.co/storage/v1/object/sign/video-generations/job.mp4?token=example']) {
    assert.throws(() => videoOutputUrl(value, api));
  }
});
