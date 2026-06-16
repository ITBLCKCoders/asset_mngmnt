// Jest mock for uuid (ESM-only package — Jest CJS runtime can't parse it).
// Tests don't need real UUIDs; a deterministic stub is sufficient.
module.exports = {
  v4: () => '00000000-0000-0000-0000-000000000000',
};
