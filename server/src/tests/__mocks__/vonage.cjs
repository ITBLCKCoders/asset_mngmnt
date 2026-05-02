// Jest mock for @vonage/server-sdk.
//
// The real SDK pulls in `node-fetch@3` which is ESM-only and trips Jest's
// default `transformIgnorePatterns`. Tests don't exercise the SDK in integration
// — they only need the import to resolve, so we expose a minimal shape:
//
//   const { Vonage } = require('@vonage/server-sdk');
//   const v = new Vonage({ apiKey, apiSecret });
//   await v.sms.send({ to, from, text });
//
// matches what `server/src/auth/sms.ts` uses.
class Vonage {
  constructor(_config) {
    this.sms = {
      send: async () => ({ messages: [{ status: '0' }] }),
    };
  }
}

module.exports = { Vonage };
