var _a;
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import dotenv from 'dotenv';
dotenv.config();
// Initialize Firebase Admin
const serviceAccount = {
    type: "service_account",
    project_id: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
    private_key: (_a = process.env.FIREBASE_PRIVATE_KEY) === null || _a === void 0 ? void 0 : _a.replace(/\\n/g, '\n'),
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    client_id: process.env.FIREBASE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
};
initializeApp({
    credential: cert(serviceAccount)
});
const db = getFirestore();
const uidsToDelete = [
    'xPAnVisStbfpi1vIxMMOg51nNBj2',
    'A9fpFVh2wyP1ddQTYedcGPo1iqp1',
    'IY8GZx8n6VS6EJf2NaVMXAjUHrc2',
    'rDV9V03sLbS80EkKGVkGygNuyBR2',
    'u0kWeJFN3pad0pbMdXviP5r4Hrz1',
    'X4k1eFQxZdXxx73KY9tusnR8HEa2',
    'AUcgYThkZ9e6rYid56yipMZ2l2h2',
    'lTSvrXviWueIF6PJUvly0QiLqgz2',
    'PKuUrKJaQrTMuBk0Wo4HDVCn9j03',
    'kS6w9aJh1GO3UqbcYDAMHgu9PPy2',
    'jvTxSXCcvJRh4O7ib7GUFUXeSa43',
    'UCM9JVA1IZMXhOxWjVHt9yAqcmM2',
    'SfvjZRqbHtVNhARPgzRTiwF9CtR2',
    'RrC525w79ngahEZ7kECoJYoL53v2',
    'Q6WgLvXGtdT3MI3zGmCGc0d4Cts1',
    '89LF5PIYJ4OnBbpporG0JbTxrTr2',
    'ourkXmvtC3QpIvTH2pcdIrWklrC2',
    'nrNGQrZKtiSBdK6ClmuJF2AIUuF3',
    'pePrWJWJVOhsZ0V5sA9gJSVlhUH2',
    '61qj40MjdbWcgurj0OAUvFwMpxC3',
    'Dr56XX5YdkX9fgXKe6Ud3Thkhq52',
    '4booYewXuVPoE5HVN6sg8Gerzgv2'
];
async function deleteUsers() {
    console.log('Starting deletion process...');
    let successCount = 0;
    let failureCount = 0;
    for (const uid of uidsToDelete) {
        try {
            await db.collection('users').doc(uid).delete();
            console.log(`✅ Successfully deleted user: ${uid}`);
            successCount++;
        }
        catch (error) {
            console.error(`❌ Failed to delete user ${uid}:`, error);
            failureCount++;
        }
    }
    console.log('\nDeletion Summary:');
    console.log(`Total users to delete: ${uidsToDelete.length}`);
    console.log(`Successfully deleted: ${successCount}`);
    console.log(`Failed to delete: ${failureCount}`);
}
deleteUsers().catch(console.error);
