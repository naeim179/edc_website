import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';

const m = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL('../lib/auth/password-recovery.ts', import.meta.url), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module: m, exports: m.exports, URL, URLSearchParams, crypto: webcrypto, TextEncoder, Uint8Array });
const { verifyPasswordRecovery, RECOVERY_MARKER, recoveryErrorKey } = m.exports;
const root = 'https://example.test/reset-password';
function fixture(options = {}) {
  let listener, unsubscribed = false;
  const session = { access_token: 'test-only-access-token', refresh_token: 'test-only-refresh-token', user: { id: 'account-b' } };
  const memory = new Map();
  const calls = [];
  const storage = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value), removeItem: key => memory.delete(key) };
  const result = () => ({ data: { session }, error: null });
  const auth = {
    onAuthStateChange(fn) { listener = fn; return { data: { subscription: { unsubscribe() { unsubscribed = true; } } } }; },
    async exchangeCodeForSession(code) { calls.push(['code', code]); listener?.(options.event ?? 'PASSWORD_RECOVERY', session); return options.exchange ?? result(); },
    async verifyOtp(value) { calls.push(['otp', value.type]); return options.exchange ?? result(); },
    async setSession() { calls.push(['implicit']); return options.exchange ?? result(); },
    async getSession() { calls.push(['session']); return result(); },
    async getUser() { calls.push(['user']); return options.user ?? { data: { user: session.user }, error: null }; },
  };
  return { auth, storage, session, calls, memory, unsubscribed: () => unsubscribed };
}
function check(result, ok, error) { assert.equal(result.ok, ok); if (!ok) assert.equal(result.error, error); }

test('Recovery PKCE requires the recovery event and confirms the identity remotely', async () => {
  const f = fixture();
  check(await verifyPasswordRecovery(f.auth, `${root}?code=single-use`, f.storage), true);
  assert.deepEqual(f.calls, [['code', 'single-use'], ['user']]);
  assert.equal(f.unsubscribed(), true);
  const marker = f.memory.get(RECOVERY_MARKER);
  assert.match(marker, /^account-b:[a-f0-9]{64}$/);
  assert.ok(!marker.includes(f.session.access_token));
  check(await verifyPasswordRecovery(f.auth, root, f.storage), true);
});
test('A login or signup code cannot unlock the password recovery form', async () => {
  const f = fixture({ event: 'SIGNED_IN' });
  check(await verifyPasswordRecovery(f.auth, `${root}?code=signup`, f.storage), false, 'invalid');
  assert.equal(f.unsubscribed(), true);
  assert.equal(f.memory.size, 0);
});
test('Expired PKCE codes do not fall back to an unrelated logged-in account', async () => {
  const f = fixture({ exchange: { data: { session: null }, error: { status: 400, code: 'flow_state_expired' } } });
  check(await verifyPasswordRecovery(f.auth, `${root}?code=expired`, f.storage), false, 'invalid');
  assert.equal(f.unsubscribed(), true);
  assert.ok(!f.calls.some(([name]) => name === 'session'));
});
test('Recovery templates using token_hash work without a PKCE browser cookie', async () => {
  const f = fixture();
  check(await verifyPasswordRecovery(f.auth, `${root}?token_hash=single-use&type=recovery`, f.storage), true);
  assert.deepEqual(f.calls, [['otp', 'recovery'], ['user']]);
});
test('Legacy implicit recovery links explicitly establish and verify a session', async () => {
  const f = fixture();
  check(await verifyPasswordRecovery(f.auth, `${root}#access_token=a&refresh_token=b&type=recovery`, f.storage), true);
  assert.deepEqual(f.calls, [['implicit'], ['user']]);
});
for (const suffix of ['?token_hash=x&type=signup', '#access_token=a&type=recovery', '#refresh_token=b&type=recovery', '#access_token=a&refresh_token=b&type=signup']) {
  test(`Malformed or non-recovery links are rejected: ${suffix}`, async () => {
    const f = fixture();
    check(await verifyPasswordRecovery(f.auth, root + suffix, f.storage), false, 'invalid');
    assert.equal(f.calls.length, 0);
  });
}
for (const suffix of ['?error=access_denied&error_code=otp_expired', '#error=access_denied&error_code=otp_expired', '?code=ignored&error=access_denied']) {
  test(`Provider errors cannot reuse a saved recovery marker: ${suffix}`, async () => {
    const f = fixture();
    check(await verifyPasswordRecovery(f.auth, `${root}?code=valid`, f.storage), true);
    f.calls.length = 0;
    check(await verifyPasswordRecovery(f.auth, root + suffix, f.storage), false, 'invalid');
    assert.equal(f.memory.size, 0);
    assert.equal(f.calls.length, 0);
  });
}
test('A regular existing login alone is insufficient for the recovery UI', async () => {
  const f = fixture();
  check(await verifyPasswordRecovery(f.auth, root, f.storage), false, 'invalid');
});
test('Saved recovery is invalidated when the account or token changes', async () => {
  const f = fixture();
  check(await verifyPasswordRecovery(f.auth, `${root}?code=valid`, f.storage), true);
  f.session.access_token = 'another-session';
  check(await verifyPasswordRecovery(f.auth, root, f.storage), false, 'invalid');
});
test('The server identity must match the link session', async () => {
  const f = fixture({ user: { data: { user: { id: 'account-a' } }, error: null } });
  check(await verifyPasswordRecovery(f.auth, `${root}?token_hash=x&type=recovery`, f.storage), false, 'invalid');
  assert.equal(f.memory.size, 0);
});
test('Server verification is required even for a clean-URL refresh', async () => {
  const f = fixture();
  check(await verifyPasswordRecovery(f.auth, `${root}?code=valid`, f.storage), true);
  f.auth.getUser = async () => ({ data: { user: null }, error: { status: 401 } });
  check(await verifyPasswordRecovery(f.auth, root, f.storage), false, 'invalid');
});
test('Fresh valid recovery remains usable when sessionStorage is unavailable', async () => {
  const f = fixture();
  const denied = { getItem() { throw Error('disabled'); }, setItem() { throw Error('disabled'); }, removeItem() { throw Error('disabled'); } };
  check(await verifyPasswordRecovery(f.auth, `${root}?token_hash=x&type=recovery`, denied), true);
});
test('Network and provider outages are distinguished from expired links', async () => {
  for (const error of [{ status: 503 }, { status: 0 }, { name: 'AuthRetryableFetchError' }]) {
    const f = fixture({ exchange: { data: { session: null }, error } });
    check(await verifyPasswordRecovery(f.auth, `${root}?code=x`, f.storage), false, 'unavailable');
  }
  const f = fixture();
  f.auth.exchangeCodeForSession = async () => { throw { name: 'AuthRetryableFetchError' }; };
  check(await verifyPasswordRecovery(f.auth, `${root}?code=x`, f.storage), false, 'unavailable');
  assert.equal(f.unsubscribed(), true);
});
test('Auth errors map to safe localized feedback', () => {
  for (const code of ['over_email_send_rate_limit', 'over_request_rate_limit']) assert.equal(recoveryErrorKey({ code }), 'recoveryRateLimited');
  assert.equal(recoveryErrorKey({ status: 429 }), 'recoveryRateLimited');
  assert.equal(recoveryErrorKey({ code: 'same_password' }), 'passwordSame');
  assert.equal(recoveryErrorKey({ code: 'weak_password' }), 'passwordWeak');
  assert.equal(recoveryErrorKey({ message: 'secret diagnostic' }), 'recoveryUnavailable');
});
