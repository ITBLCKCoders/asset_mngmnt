/* eslint-disable no-console */
/**
 * Generates a self-signed TLS cert/key pair for **local development only**.
 *
 * Usage:
 *   npm run cert --workspace=server
 *
 * Optional env:
 *   DEV_CERT_HOST_IP   — extra IP SAN (defaults to 127.0.0.1)
 *   DEV_CERT_HOSTNAME  — extra DNS SAN (defaults to localhost)
 *   DEV_CERT_DIR       — output directory (defaults to ./certs)
 *
 * Refuses to run when NODE_ENV === 'production'. In production the application
 * is expected to sit behind a reverse proxy that terminates TLS with a real
 * cert; the previous behaviour of generating a cert at server startup made
 * the production cert story implicit and confusing.
 */
import fs from 'fs';
import path from 'path';
import forge from 'node-forge';

if (process.env.NODE_ENV === 'production') {
  console.error(
    '[CERT] Refusing to generate self-signed cert in production. Use a real cert behind a reverse proxy.'
  );
  process.exit(1);
}

const certDir = process.env.DEV_CERT_DIR ?? './certs';
const certPath = path.join(certDir, 'cert.pem');
const keyPath = path.join(certDir, 'key.pem');

const hostIp = (process.env.DEV_CERT_HOST_IP ?? '127.0.0.1').trim();
const hostname = (process.env.DEV_CERT_HOSTNAME ?? 'localhost').trim();

if (fs.existsSync(certPath) && fs.existsSync(keyPath)) {
  console.log(
    `[CERT] Existing cert already present at ${certPath}; skipping generation.`
  );
  console.log('[CERT] Delete the file first if you want to regenerate.');
  process.exit(0);
}

console.log(`[CERT] Generating dev cert for hostname=${hostname} ip=${hostIp}`);

const keys = forge.pki.rsa.generateKeyPair(2048);
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [{ name: 'commonName', value: hostname }];
cert.setSubject(attrs);
cert.setIssuer(attrs);
cert.setExtensions([
  {
    name: 'subjectAltName',
    altNames: [
      { type: 2, value: 'localhost' },
      { type: 2, value: hostname },
      { type: 7, ip: '127.0.0.1' },
      ...(hostIp && hostIp !== '127.0.0.1' ? [{ type: 7, ip: hostIp }] : []),
    ],
  },
]);
cert.sign(keys.privateKey, forge.md.sha256.create());

fs.mkdirSync(certDir, { recursive: true });
fs.writeFileSync(certPath, forge.pki.certificateToPem(cert));
fs.writeFileSync(keyPath, forge.pki.privateKeyToPem(keys.privateKey));

console.log(`[CERT] Wrote ${certPath}`);
console.log(`[CERT] Wrote ${keyPath}`);
console.log(
  '[CERT] Done. The cert is valid for 1 year and is self-signed — only use for local dev.'
);
