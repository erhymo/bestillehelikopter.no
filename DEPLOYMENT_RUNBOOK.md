# Deployment Runbook — BestilleHelikopter.no

> Sist oppdatert: mars 2026

---

## 1. Miljøvariabler — Vercel (Next.js)

Sett i **Vercel → Project → Settings → Environment Variables**.
`NEXT_PUBLIC_*`-variabler eksponeres til klienten.

### Public (klient-side)

| Variabel | Påkrevd | Beskrivelse |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Firebase Web API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | `<project>.firebaseapp.com` |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Firebase prosjekt-ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | `<project>.appspot.com` |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Sender ID (tall) |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Firebase App ID |
| `NEXT_PUBLIC_GOOGLE_MAPS_KEY` | ✅ | Google Maps JS API-nøkkel (klient) |
| `NEXT_PUBLIC_BASE_URL` | ✅ | `https://bestillehelikopter.no` (prod) |

### Secret (server-side)

| Variabel | Påkrevd | Beskrivelse |
|---|---|---|
| `FIREBASE_PROJECT_ID` | ✅ | Samme som public, brukt av admin SDK |
| `FIREBASE_CLIENT_EMAIL` | ✅ | Service account e-post (`firebase-adminsdk-…@<project>.iam.gserviceaccount.com`) |
| `FIREBASE_PRIVATE_KEY` | ✅ | Service account private key (PEM, `\n`-escaped) |
| `GOOGLE_MAPS_SERVER_KEY` | ✅ | Google Maps API-nøkkel for Elevation + Static Maps (server) |
| `GOOGLE_MAPS_SIGNING_SECRET` | ✅ | URL Signing Secret for Static Maps (base64) |
| `SENDGRID_API_KEY` | ✅ | SendGrid API-nøkkel med Mail Send-tilgang |
| `SENDGRID_FROM_EMAIL` | ⚪ | Avsender-e-post (default: `post@bestillehelikopter.no`) |
| `FROM_EMAIL` | ⚪ | Avsender for admin-e-post (default: `noreply@bestillehelikopter.no`) |
| `ADMIN_EMAIL` | ⚪ | Reply-to for admin-e-post (default: `admin@bestillehelikopter.no`) |
| `TOKEN_SECRET` | ✅ | HMAC-SHA256 secret for signerte lenker (minst 32 tegn, tilfeldig) |
| `TOKEN_SECRET_PREVIOUS` | ⚪ | Forrige secret for nøkkelrotasjon (sett ved rotasjon) |

**Generere TOKEN_SECRET:**
```bash
openssl rand -base64 32
```

---

## 2. Miljøvariabler — Firebase Functions

Firebase Functions v2 bruker `defineString()`/`defineBoolean()` fra `firebase-functions/params`.
Sett via `.env`-fil i `functions/`-mappen eller Firebase Console.

### Oppsett via `functions/.env`

```env
SENDGRID_API_KEY=SG.xxxxxxxx
SENDGRID_FROM_EMAIL=post@bestillehelikopter.no
SENDGRID_WEBHOOK_VERIFY_KEY=MFkwEwYH...
TOKEN_SECRET=<same as Vercel>
NEXT_PUBLIC_BASE_URL=https://bestillehelikopter.no
```

### Valgfrie (boolean)

```env
AUTO_COMPLETE_DRY_RUN=false
AUTO_DELETE_DRY_RUN=false
```

> **Viktig:** `TOKEN_SECRET` og `NEXT_PUBLIC_BASE_URL` må være identiske i Vercel og Functions.

| Variabel | Påkrevd | Brukes i |
|---|---|---|
| `SENDGRID_API_KEY` | ✅ | `email.ts` — all e-postutsending |
| `SENDGRID_FROM_EMAIL` | ⚪ | `email.ts` — avsender (default: `post@bestillehelikopter.no`) |
| `SENDGRID_WEBHOOK_VERIFY_KEY` | ✅ | `sendgrid-webhook.ts` — ECDSA verifisering |
| `TOKEN_SECRET` | ✅ | `tokens.ts` — signerte lenker |
| `NEXT_PUBLIC_BASE_URL` | ✅ | `tokens.ts` — URL-bygging |
| `AUTO_COMPLETE_DRY_RUN` | ⚪ | `scheduled-auto-complete.ts` (default: `false`) |
| `AUTO_DELETE_DRY_RUN` | ⚪ | `scheduled-auto-delete.ts` (default: `false`) |

---

## 3. SendGrid — Domeneautentisering (SPF/DKIM/DMARC)

### Forutsetninger
- SendGrid-konto med API-nøkkel (Mail Send + Tracking-tilgang)
- DNS-tilgang for `bestillehelikopter.no`

### Sjekkliste

- [ ] **1. Domeneautentisering i SendGrid**
  - Gå til **Settings → Sender Authentication → Authenticate Your Domain**
  - Velg DNS-leverandør, skriv inn `bestillehelikopter.no`
  - SendGrid genererer 3 CNAME-records

- [ ] **2. Legg til DNS-records**

  | Type | Navn | Verdi |
  |---|---|---|
  | CNAME | `em1234.bestillehelikopter.no` | `u1234.wl.sendgrid.net` |
  | CNAME | `s1._domainkey.bestillehelikopter.no` | `s1.domainkey.u1234.wl.sendgrid.net` |
  | CNAME | `s2._domainkey.bestillehelikopter.no` | `s2.domainkey.u1234.wl.sendgrid.net` |

  > Verdiene er eksempler — bruk de faktiske fra SendGrid.

- [ ] **3. Verifiser i SendGrid** — Klikk «Verify» etter DNS-propagering (kan ta opptil 48t)

- [ ] **4. SPF** — Dekkes automatisk av SendGrid CNAME-autentiseringen

- [ ] **5. DKIM** — Dekkes automatisk av `s1._domainkey` og `s2._domainkey` CNAME-ene

- [ ] **6. DMARC** — Legg til TXT-record manuelt:

  | Type | Navn | Verdi |
  |---|---|---|
  | TXT | `_dmarc.bestillehelikopter.no` | `v=DMARC1; p=quarantine; rua=mailto:dmarc@bestillehelikopter.no; pct=100` |

## 4. Google API-nøkler — Begrensninger

### 4a. Klient-nøkkel (`NEXT_PUBLIC_GOOGLE_MAPS_KEY`)

Brukes i nettleseren for Maps JS API.

1. Gå til **Google Cloud Console → APIs & Services → Credentials**
2. Klikk på nøkkelen → **Application restrictions**
3. Velg **HTTP referrers (websites)**
4. Legg til:
   ```
   bestillehelikopter.no/*
   *.bestillehelikopter.no/*
   localhost:3000/*
   ```
5. Under **API restrictions** → velg **Restrict key** → aktiver kun:
   - Maps JavaScript API
   - Geocoding API (brukes klient-side til å foreslå selskaper som dekker hentestedet)
6. Lagre

### 4b. Server-nøkkel (`GOOGLE_MAPS_SERVER_KEY`)

Brukes server-side for Elevation API og Static Maps API.

1. Opprett en **separat** API-nøkkel i Cloud Console
2. **Application restrictions** → **IP addresses**
3. Legg til Vercel edge IP-ranges (se [Vercel docs](https://vercel.com/docs/security/edge-network-regions)):
   - Alternativt: bruk ingen IP-begrensning men begrens til API-er
4. Under **API restrictions** → velg **Restrict key** → aktiver kun:
   - Elevation API
   - Maps Static API
5. Lagre

### 4c. URL Signing Secret (`GOOGLE_MAPS_SIGNING_SECRET`)

1. Google Cloud Console → **Maps Static API** → **URL Signing Secret**
2. Kopier base64-verdien → sett som `GOOGLE_MAPS_SIGNING_SECRET`
3. Denne brukes kun server-side og trenger ingen ekstra begrensninger

> **Tips:** Bruk to separate nøkler (klient vs. server) for å minimere eksponeringsrisiko.

---

## 5. Deploy-steg

### 5a. Forutsetninger

```bash
npm install -g vercel firebase-tools
firebase login
vercel login
```

### 5b. Første gang — koble prosjekt

```bash
# Vercel
vercel link

# Firebase
firebase use <PROJECT_ID>
```

### 5c. Deploy Next.js til Vercel

```bash
# Preview (fra branch)
vercel

# Produksjon
vercel --prod
```

Alternativt: push til `main`-branchen → Vercel bygger automatisk via Git-integrasjon.

### 5d. Deploy Firebase

```bash
# Alt på én gang
firebase deploy

# Eller selektivt:
firebase deploy --only functions
firebase deploy --only firestore:rules
firebase deploy --only storage
firebase deploy --only firestore:indexes
```

### 5e. Deploy-rekkefølge ved førstegangsoppsett

1. Sett alle miljøvariabler i Vercel og `functions/.env`
2. `firebase deploy --only firestore:rules,storage,firestore:indexes`
3. `firebase deploy --only functions`
4. `vercel --prod`
5. Kjør smoke tests (se seksjon 6)

### 5f. Nøkkelrotasjon (TOKEN_SECRET)

1. Sett `TOKEN_SECRET_PREVIOUS` = nåværende `TOKEN_SECRET` (i Vercel)
2. Generer ny `TOKEN_SECRET` (`openssl rand -base64 32`)
3. Oppdater `TOKEN_SECRET` i Vercel **og** `functions/.env`
4. Deploy: `vercel --prod` + `firebase deploy --only functions`
5. Vent 14 dager (token-gyldighet), deretter fjern `TOKEN_SECRET_PREVIOUS`

---

## 6. Smoke Tests — Sjekkliste

Kjør etter hver produksjons-deploy.

### 6a. Grunnleggende

- [ ] `curl -s https://bestillehelikopter.no` returnerer 200
- [ ] Siden laster uten JS-feil i nettleserkonsollen
- [ ] «Slik fungerer det»-seksjonen vises
- [ ] Footer med lenker til /vilkar, /personvern, /ansvarsfraskrivelse

### 6b. Juridiske sider

- [ ] `/vilkar` returnerer 200 og viser innhold
- [ ] `/personvern` returnerer 200 og viser innhold
- [ ] `/ansvarsfraskrivelse` returnerer 200 og viser innhold

### 6c. Kart og skjema

- [ ] Google Maps laster i kartet (ingen API key-feil i konsollen)
- [ ] Kan klikke på kartet for å sette hentested
- [ ] Kan legge til leveringspunkt
- [ ] Vilkår-checkbox blokkerer innsending når den ikke er krysset av

### 6d. RFQ-innsending (krever test-data)

- [ ] Fyll ut komplett skjema → POST `/api/rfq` returnerer 200
- [ ] Firestore: ny `jobs/`-doc opprettet
- [ ] Cloud Function `onRfqCreate` trigges (sjekk Functions-logg)
- [ ] E-post med tilbuds-lenke ankommer helikopterselskapets e-post
- [ ] E-postens SPF/DKIM/DMARC passerer (sjekk e-postheaders)

### 6e. Tilbudsflyt

- [ ] Åpne tilbuds-lenken → `/c/[token]/map` viser kart med rute
- [ ] Klikk «Gi tilbud» → `/c/[token]/offer` viser skjema
- [ ] Send tilbud → kunden mottar e-post med aksept-lenke

### 6f. Aksept + vurdering

- [ ] Åpne aksept-lenke → `/a/[token]/accept` viser tilbudsdetaljer
- [ ] Klikk «Aksepter tilbud» → status endres, e-poster sendes
- [ ] Vurderingslenke fungerer → `/r/[token]/rate`
- [ ] Submit vurdering → Firestore: `ratings/`-doc opprettet

### 6g. Admin

- [ ] `/admin` → Google sign-in fungerer (krever custom claim `admin: true`)
- [ ] Jobber-oversikt viser submitted jobs
- [ ] Selskaper-liste viser registrerte selskaper
- [ ] Statistikk-side laster data

### 6h. Scheduled Functions

- [ ] `firebase functions:log --only scheduledAutoComplete` — ingen feil
- [ ] `firebase functions:log --only scheduledAutoDelete` — ingen feil
- [ ] `firebase functions:log --only scheduledAnalyticsRollup` — ingen feil

### 6i. SendGrid Webhook (hvis aktivert)

- [ ] Send test-e-post → sjekk at `events`-collection i Firestore mottar open/click-events
- [ ] `firebase functions:log --only sendgridWebhook` — ingen signature verification-feil

---

## 7. Feilsøking

| Problem | Sjekk |
|---|---|
| «Firebase Admin SDK initialization failed» | `FIREBASE_PRIVATE_KEY` mangler `\n`-escape, eller `FIREBASE_CLIENT_EMAIL` er feil |
| Google Maps viser grått | `NEXT_PUBLIC_GOOGLE_MAPS_KEY` mangler eller er begrenset til feil domene |
| E-post havner i spam | SPF/DKIM/DMARC ikke satt opp, eller `SENDGRID_FROM_EMAIL` matcher ikke autentisert domene |
| Token-lenker gir 403 | `TOKEN_SECRET` ulik mellom Vercel og Functions, eller token utløpt (14d) |
| Scheduled functions kjører ikke | Sjekk at Cloud Scheduler er aktivert i GCP Console |
| Static Maps-bilder mangler signatur | `GOOGLE_MAPS_SIGNING_SECRET` mangler eller er feil format |
