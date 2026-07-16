# Firebase Setup – BestilleHelikopter.no

## 1. Opprett Firebase-prosjekt
```bash
firebase login
firebase projects:create bestillehelikopter-prod --display-name "BestilleHelikopter"
firebase use bestillehelikopter-prod
```

## 2. Auth: Telefon (+47)
- Firebase Console → Authentication → Sign-in method
- Aktiver "Phone" provider
- Under "Phone numbers for testing" legg til et testnummer (f.eks. +47 99999999 / code 123456)
- reCAPTCHA: Sett til "Normal" (ikke invisible) for produksjon
- SMS Region Policy: Sett "Only allow" → Norway (+47)

## 3. Firestore
```bash
firebase firestore:databases:create --location=europe-west1
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```

### Nødvendige composite indexes (legg til i firestore.indexes.json ved behov):
- `jobs`: (status ASC, createdAt DESC) — admin jobb-liste
- `jobs`: (status ASC, expiresAt ASC) — auto-delete query
- `jobs`: (status ASC, acceptedAt ASC) — auto-complete query
- `jobs`: (customer.firebaseUid ASC, createdAt ASC) — rate-limit-sjekk i POST /api/rfq
- `ratings`: (companyId ASC, approved ASC, createdAt DESC) — offentlig visning
- `ratings`: (approved ASC, createdAt DESC) — admin godkjenningskø

## 4. Storage
```bash
firebase deploy --only storage:rules
# Sett CORS:
gsutil cors set storage-cors.json gs://bestillehelikopter-prod.firebasestorage.app
```

## 5. Cloud Functions
```bash
cd functions && npm install && cd ..
# Sett runtime-konfig (env vars for functions):
firebase functions:secrets:set SENDGRID_API_KEY
firebase functions:secrets:set SENDGRID_FROM_EMAIL
firebase functions:secrets:set GOOGLE_MAPS_SERVER_KEY
firebase functions:secrets:set TOKEN_SECRET
# Deploy:
firebase deploy --only functions
```
Region: `europe-west1` (Belgium) — nær Norge, lav latency, støtter alle tjenester.

## 6. Service Account for Vercel
- Firebase Console → Project Settings → Service accounts
- "Generate new private key" → last ned JSON
- I Vercel Dashboard → Settings → Environment Variables, legg til:
  - `FIREBASE_PROJECT_ID` (fra JSON: project_id)
  - `FIREBASE_CLIENT_EMAIL` (fra JSON: client_email)
  - `FIREBASE_PRIVATE_KEY` (fra JSON: private_key, med \n intakt)
  - Alle `NEXT_PUBLIC_FIREBASE_*` fra Firebase Console → Project Settings → General → Web app config

## 7. Koble til Vercel
- Vercel Dashboard → New Project → Import Git repo
- Framework: Next.js (auto-detektert)
- Environment variables: legg til alle fra .env.example
- Build command: `npm run build` (default)
- Output directory: `.next` (default)

## 8. Emulators (lokal utvikling)
```bash
firebase emulators:start
# Deretter i .env.local sett:
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=localhost:9099
# osv. — eller bruk connectAuthEmulator() i client.ts
```

