const admin = require('firebase-admin');

admin.initializeApp({
    credential: admin.credential.cert('./firebase-admin-sdk.json')
});

const db = admin.firestore();

module.exports = { admin, db };
