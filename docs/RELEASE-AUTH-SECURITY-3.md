# Release — SEC-009: i comandi dell'Admin arrivavano e non facevano niente

Terza parte del mandato «FIX DEFINITIVO AUTH / ACCOUNT / LOGIN / PIANI /
BILLING / DEVICE SESSION». Le prime due parti (commit `a99b250`, `c172a1b`)
avevano chiuso i segreti nel client e il percorso rotto di «Nuovo Utente
Enterprise». Questa parte nasce dalla richiesta esplicita di continuare a
cercare — non di fermarsi al primo pulsante corretto — nello stesso gruppo di
comandi Admin→Prodotto in cui Force Logout era stato appena trovato rotto.

---

## 1. SEC-009 — un mismatch di nome di campo, sistematico

`handleCmd` (patch 117) è il **solo** punto che riceve i comandi
dell'amministratore (`force_logout`, `suspend`, `ban`, `password_reset`,
`license_renewal`, `plan_change`) via `BroadcastChannel` +
`localStorage` come ripiego. Decideva se un comando fosse per la sessione
corrente così:

```js
var mine = !cmd.userId || s.userId === cmd.userId || s.id === cmd.userId;
```

La sessione reale (`InglyIdentita.creaSessione`) ha **solo** `user_id`. Non
ha mai avuto `userId` né `id`. Il controllo era quindi sempre falso, e ogni
comando veniva ricevuto (visibile in `ingly_pending_commands`) e scartato in
silenzio — verificato inviando un `force_logout` reale a una sessione reale
e osservando che restava aperta 8 secondi dopo.

**Force Logout è il caso più grave**: a differenza di una sospensione, che
la guardia rilegge comunque dal database condiviso al prossimo controllo
periodico, un logout forzato senza notifica non succede *affatto* — non ha
un percorso di ripiego. Gli altri cinque comandi restano comunque rotti come
canale di notifica istantanea, ma il loro effetto (stato, piano, scadenza)
è scritto direttamente sull'utente condiviso e viene comunque letto al
prossimo controllo della guardia.

**Fix**: `s.user_id === cmd.userId`.

## 2. La stessa classe di bug, nel Cloud Sync opzionale

Cercando sistematicamente ogni lettura di `s.userId`/`session.userId` nel
resto del file (richiesto esplicitamente, non solo sul primo risultato), ne
sono emerse altre due — dormienti come `handleCmd` era attivo, perché vivono
in `InglySaaSPlatform`, che richiede Cloud Sync configurato (mai per
default, da SEC-005):

- `applyCloudUpdate` confrontava un nuovo hash con `s.passwordHash` — campo
  che la sessione non ha mai avuto **per costruzione**, non per errore («la
  sessione non contiene: la password, il suo hash…», docs/ACCOUNT-LIFECYCLE.md
  §2.3). Il ramo «password cambiata da remoto → logout» non scattava mai.
  Corretto a confrontare con l'hash letto in locale via
  `InglyAccount.perId(s.user_id)`.
- `startPollingFallback` cercava l'utente aggiornato con `session.username`
  — campo assente sulla sessione, che ha solo `.email`. Cercava sempre
  l'utente letterale `"undefined"`. Corretto a `session.email`.

## 3. Un terzo sistema di device-enforcement, duplicato e già rotto

Lo stesso `grep` ha trovato anche `SingleDeviceEnforcement` (`117-...js`,
righe ~3607-4020): una **terza** implementazione del limite a una
postazione, parallela a `InglyDispositivi` (quella canonica, verificata in
questa release con due schede vere) e a `InglySaaSPlatform`. Usa una propria
tabella Supabase (`ingly_sessions` con `user_id/username/token/device_fp`),
è anch'essa dormiente senza Cloud Sync, ed è **anche lei** rotta dalla
stessa classe di bug: `registerSession(s.userId, s.username, ...)` con
`s` = sessione canonica, quindi sempre `undefined, undefined`.

**Non l'ho corretta.** Ripararla vorrebbe dire far rivivere una seconda
verità sul device — esattamente ciò che il mandato vieta («impedire che
esistano contemporaneamente due verità... device») — invece di eliminare la
duplicazione. Resta dormiente (richiede lo stesso Cloud Sync mai attivo per
default) e va ritirata, non riparata, quando si deciderà di consolidare il
Cloud Sync su un solo sistema: intervento a parte, non una correzione di
bug.

---

## 4. Verifica

| Cosa | Esito |
| --- | --- |
| `npm run verify` | 257 file, 0 errori |
| `npm test` | 2052 PASS / 0 FAIL |
| `tests/roundtrip.test.mjs` | 9/9 |
| `tests/qa/admin-force-logout.mjs` **(nuova)** | 5/5 — click vero sul pulsante «Force Logout», sessione chiusa davvero, postazione liberata |
| `tests/qa/device-takeover-due-contesti.mjs` | 11/11 (rieseguita) |
| `tests/qa/admin-crea-utente-poi-login.mjs` | 9/9 (rieseguita) |
| `tests/qa/admin-console-accesso.mjs` | 41/41 (rieseguita) |
| `tests/qa/ciclo-account.mjs` | 76/76 (rieseguita) |
| `npm run qa` (~80 suite, con le 3 nuove in coda) | vedi report finale del mandato |

`admin-force-logout.mjs` non chiama `AdminCommandBus.send` direttamente: fa
un click vero su un bottone vero (`openUserDetail` → «Force Logout»),
esattamente come chiesto — l'API diretta resta solo un ripiego se il
pulsante non si trova nel markup di una build futura.

## 5. File modificati in questa parte

| File | Perché |
| --- | --- |
| `src/legacy/patches/117-ingly-smart-search-engine-v33.js` | SEC-009 (`handleCmd`), stessa classe in `applyCloudUpdate` e `startPollingFallback` |
| `tests/qa/admin-force-logout.mjs` | nuova |
| `package.json` | `npm run qa` ora include anche le tre suite nuove di questo mandato |

## 6. Che cosa resta, esplicitamente

- `SingleDeviceEnforcement` (§3): duplicato, dormiente, rotto — da ritirare
  quando si consoliderà il Cloud Sync, non riparato qui.
- Tutto ciò già elencato in `docs/RELEASE-AUTH-SECURITY-2.md` §4 (catalogo
  piani Admin non unificato con `InglyPiani`, Stripe/RLS reali bloccati da
  configurazione esterna) resta valido e non è stato toccato da questa
  parte.
