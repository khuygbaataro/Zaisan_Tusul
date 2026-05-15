// Firebase Admin SDK initialization. Picks credentials in this order:
//   1. FIREBASE_SERVICE_ACCOUNT (base64-encoded JSON) — for Render / containers without ADC
//   2. GOOGLE_APPLICATION_CREDENTIALS (file path) — local dev
//   3. Application Default Credentials — Cloud Run / GCP environments
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

function loadCredentials(): Parameters<typeof initializeApp>[0] | undefined {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (raw) {
    // Accept either raw JSON or base64-encoded JSON. Raw is easier to paste; base64
    // is convenient for single-line env stores like Cloud Run / Render.
    const trimmed = raw.trim();
    const candidate = trimmed.startsWith("{")
      ? trimmed
      : Buffer.from(trimmed, "base64").toString("utf8");
    try {
      const sa = JSON.parse(candidate);
      return { credential: cert(sa) };
    } catch (err) {
      console.error("[firebaseAdmin] FIREBASE_SERVICE_ACCOUNT parse failed", err);
    }
  }
  // Falls back to GOOGLE_APPLICATION_CREDENTIALS or ADC
  return undefined;
}

if (!getApps().length) {
  initializeApp(loadCredentials());
}

export const db = getFirestore();
