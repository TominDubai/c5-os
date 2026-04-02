#!/usr/bin/env node

const { getEnvelopeStatus } = require('../src/lib/docusign/client.ts');

const envelopeId = process.argv[2];

if (!envelopeId) {
  console.error('Usage: node check_envelope.js <envelope-id>');
  process.exit(1);
}

getEnvelopeStatus(envelopeId)
  .then(status => {
    console.log(JSON.stringify(status, null, 2));
  })
  .catch(err => {
    console.error('Error:', err.message);
    process.exit(1);
  });
