# Release — il reset dei dati non è la cancellazione dell'account

Quarta parte del mandato «FIX DEFINITIVO AUTH / ACCOUNT / LOGIN / PIANI /
BILLING / DEVICE SESSION» (parti 1-3: commit `a99b250`, `c172a1b`,
`69bce35`/`afa76c6` — vedi `docs/RELEASE-AUTH-SECURITY-2.md` e `-3.md`).
Il mandato più recente chiede un'architettura di identità cloud-autorevole
dove ACCOUNT ≠ DATI LOCALI ≠ BACKUP ≠ SESSIONE ≠ DEVICE, con il principio
esplicito: cancellare i dati locali non deve mai cancellare l'account.

Questo documento separa, con la stessa onestà delle parti precedenti, ciò
che è stato **corretto e verificato in un browser vero** da ciò che è
**architetturalmente impossibile senza un backend che non esiste in questo
ambiente** — e non lo maschera con un mock.

---

## 1. Il difetto reale, misurato

`Backup.factoryReset()` (`src/legacy/app/src/modules/settings/index.js`,
pannello «Backup & Ripristino → Cancella Tutti i Dati») cancellava le
IndexedDB business (clienti, ordini, prodotti…) e poi **anche**
`localStorage`, con un filtro `k.startsWith('ingly')`. Quel filtro cattura
`ingly_saas_db` — l'unica riga che contiene `users`, `tenants`,
`subscriptions`, `memberships`, `device_sessions`, `audit_log` (tutto
l'account vive lì: `src/product/account-service.js:48`,
`src/product/device-sessions.js:43` — stessa chiave, stesso blob,
`JSON.parse`/`JSON.stringify` indipendenti a ogni lettura/scrittura) — e
anche `ingly_device_id` (`src/product/device-sessions.js:46`).

L'avviso di conferma mostrato prima del click prometteva di cancellare
«clienti, ordini, prodotti, immagini… preventivi, vendite, idee… backup
salvati»: **mai l'account**. Chi premeva quel pulsante, pensando di
azzerare solo i dati applicativi, si ritrovava al ricaricamento sulla
schermata di primo avvio — «Crea l'account amministratore» — come se non
si fosse mai registrato. È esattamente il sintomo riportato: *«ogni volta
devo pulire i dati e rifare l'account»*.

La decisione «login o crea account» è presa da un solo punto,
`InglyPrimoAvvio.serve()` (`src/product/setup-iniziale.js:57-66`):
legge `ingly_saas_db.users.length` e basta. Nessun altro segnale. Per
questo, e solo per questo, svuotare quella singola chiave da qualunque
punto del codice produce lo stesso effetto di un account mai creato.

**Fix**: `factoryReset()` ora esclude `ingly_saas_db`, `ingly_device_id` e
`ingly_wizard_done_v2` (quest'ultimo per lo stesso motivo per cui lo segna
il login dalla 2.10.0: un account già configurato non deve rivedere il
wizard di benvenuto) dal filtro di cancellazione. L'avviso di conferma
dichiara ora esplicitamente: *«NON cancella il tuo account INGLY: dopo il
reset potrai accedere di nuovo con le stesse credenziali»*.

Nessun'altra funzione di reset/restore aveva lo stesso difetto —
verificato una per una, non per ispezione superficiale:

| Funzione | Tocca `ingly_saas_db`? |
| --- | --- |
| `Backup.onImport`/`restore` (ripristino backup) | No — struttura per costruzione: i backup contengono solo store IndexedDB (`IDB.exportAll()`), e l'account non è mai stato uno di quegli store |
| `DataReset.run()` («Azzera dati operativi») | No — solo `['clients','orders','sales','cashflow','equipment']`, IndexedDB, mai `localStorage` |
| `SaaSGate.logout()` | No, confermato: revoca solo la riga `device_sessions` della postazione corrente e il token di `sessionStorage`, mai `db.users` |
| `Backup.factoryReset()` | **Sì — era il bug, corretto qui** |

---

## 2. Il limite architetturale — dichiarato, non aggirato

Questa installazione **non ha un backend raggiungibile per default**.
L'identità vive in un solo posto: `localStorage['ingly_saas_db']`, su
quel browser, su quel dispositivo. Non esiste una seconda copia da cui
recuperarla.

Conseguenza diretta, e non negoziabile per un prodotto che è un file HTML
offline-first: **un azzeramento completo dei dati del browser** — DevTools
«Clear site data», un browser diverso, un dispositivo diverso, un profilo
diverso — cancella anche l'unica copia dell'account. Non è un bug che il
codice possa correggere: è la definizione stessa di «nessun server». Nessun
pattern architetturale locale può far sopravvivere un dato alla
cancellazione dell'unico posto in cui è scritto.

Renderlo davvero vero (l'account sopravvive *a qualunque* cancellazione
locale, da qualunque dispositivo) richiede un progetto Supabase reale come
fonte autorevole, raggiunto in lettura al boot. Questo ambiente:

- non ha credenziali per il progetto di produzione («Ingly 91») — e il
  mandato vieta esplicitamente di toccarlo;
- ha cercato, come nelle parti precedenti, il progetto di staging nominato
  esplicitamente («INGLY OS V2 STAGING», ref `uepyexyosyogyvzorata`):
  l'URL esiste, trovato in un file di esempio adiacente
  (`env.example.js`, chiaramente un template); **la anon/publishable key
  non è presente in nessun punto di questo ambiente**, solo un segnaposto
  non compilato. Stesso identico blocco già documentato in
  `docs/CLOUD-SYNC-STATUS.md` §9 e `docs/RELEASE-AUTH-SECURITY-3.md` §9 —
  non ricontrollato più a fondo qui perché nulla in questo mandato ha
  fornito quella chiave, e ripetere la stessa ricerca non l'avrebbe fatta
  apparire.

Il mandato vieta esplicitamente di sostituire una credenziale esterna
mancante con un mock, un account demo o un fallback locale che crea
utenti. Quel divieto è stato rispettato: **nessuna riga di questo rilascio
inventa uno stato cloud**. Quello che segue, in questa sezione, resta
**BLOCKED** — corretto nella struttura già esistente (§4 sotto), mai
dichiarato "PASS" perché non è stato eseguito contro un backend vero:

- login che consulta il Cloud come fonte autorevole prima di decidere
  «crea account» (oggi consulta solo `ingly_saas_db` locale — `InglyCloud`,
  patch 117, esiste già come lettura di fallback al login, ma legge un
  progetto **facoltativo** configurato da chi amministra l'installazione,
  non un progetto fisso di questo prodotto);
- RBAC/tenant isolation verificati lato RLS reale (verificati lato client
  da tempo — `tests/amministrazione.test.mjs`, `tests/audit-sicurezza.test.mjs`
  — mai lato rete);
- canale realtime Cloud Sync end-to-end, polling di ripiego contro un
  cambiamento remoto vero;
- single-device enforcement persistita lato server (oggi `InglyDispositivi`
  è corretto e verificato **localmente**, con due schede browser vere —
  `tests/qa/device-takeover-due-contesti.mjs` — ma «localmente» è tutto ciò
  che un'installazione senza backend può offrire).

Chi vuole sbloccare questi punti deve incollare l'anon/publishable key del
progetto di staging in **Impostazioni → Cloud Sync** (mai nel sorgente),
sia sul prodotto che sull'Admin. Non c'è altro lavoro software possibile
qui che sostituisca quella chiave.

---

## 3. `SingleDeviceEnforcement` — ritirata

Terza implementazione, duplicata e dormiente, dello stesso limite a una
postazione che `InglyDispositivi` (`src/product/device-sessions.js`, la
fonte canonica, verificata con due schede browser vere) già applica
correttamente. Segnalata per il ritiro fin dalla parte 3 di questo
mandato (`docs/RELEASE-AUTH-SECURITY-3.md` §3, `docs/CLOUD-SYNC-STATUS.md`
§7) — «va ritirata quando si consoliderà il Cloud Sync, non riparata per
farla sembrare una seconda opzione valida» — ma non ancora eseguita.

Rimossa ora: 287 righe (`src/legacy/patches/117-...js`, l'IIFE
`SingleDeviceEnforcement` più il banner/commento di deprecazione che la
precedeva). Verificato prima di toccarla:

- **zero punti di richiamo** nel resto del repository (grep sistematico:
  compariva solo in prosa, nei due documenti che la segnalavano come da
  ritirare, e nell'entry di `baseline/deliberate-changes.json` che
  descriveva il commento di deprecazione aggiunto in precedenza);
- la propria `init()` era **già disattivata a mano** in una release
  precedente (`// document.readyState===... ; console.log('[SDE v3.0]
  DISABLED (standalone mode)...')`) — non è mai stata eseguita, nemmeno
  standalone;
- l'unico riferimento esterno ai suoi artefatti DOM (`_sde_modal`) è un
  `MutationObserver` in `125-...js` che osserva un id che non comparirà
  mai (osservava codice morto anche prima di questa rimozione — non è un
  nuovo problema, resta un candidato di pulizia separato, non toccato
  qui);
- la sua tabella Supabase (`ingly_sessions`) è letta/scritta anche da
  pannelli Admin indipendenti (Sessioni Live, Force Logout, Delete) che
  parlano con quella tabella via `fetch` diretto, non chiamando questa
  funzione per nome — nessuno di quei pannelli si rompe con la sua
  rimozione, perché non la chiamavano.

Effetto sulla baseline: una sola chiave di `localStorage` è sparita
davvero dal codice (`_ingly_hb_`, l'heartbeat di SDE — mai scritta in
pratica, perché `init()` non girava) — `baseline/ingly-os.json`
rigenerata con `npm run baseline` per riflettere il ritiro deliberato,
come la disciplina di questo progetto richiede (`tests/baseline.test.mjs`
fallisce apposta quando qualcosa sparisce senza che la baseline lo
dichiari).

---

## 4. Admin → Utenti: una «Elimina» duplicata rimossa, una «Riattiva»
prima irraggiungibile, ora agganciata

Audit completo del pannello (`src/admin/legacy/patches/003-...js`,
`006-...js`) contro l'elenco di campi/azioni del mandato. Trovato:

- **`confirmDeleteUser`/`checkAndDelete`/`doDeleteUser`** (003) duplicavano
  — stessa responsabilità, stesso schema di conferma («scrivi ELIMINA») —
  `confirmDeleteUserFull`/`doDeleteUserFull` (006), quella davvero
  raggiunta dal pannello (agganciata nel footer del dettaglio utente e
  nella modale di sospensione). La versione in 003 non aveva **nessun**
  punto di chiamata reale: solo `renderUserActions()`, anch'essa mai
  invocata da nessuna vista (grep sistematico, zero call site). Codice
  morto che duplicava, senza eseguire mai, la stessa responsabilità —
  stessa classe di difetto di `SingleDeviceEnforcement` sopra. **Rimosso.**
- **`doReactivate(id)`** (003) esiste, ed è corretta — rimette l'account
  `active`, gli rinnova una scadenza valida, scrive l'audit log. Ma
  l'unico bottone che la chiamava era proprio dentro `renderUserActions()`
  — mai disegnata. Un account sospeso non aveva, nel pannello dettaglio,
  **nessuna via diretta** per tornare attivo: solo il menu a tendina Stato
  dentro «Modifica», un percorso indiretto per un'azione che il mandato
  elenca esplicitamente come ATTIVA, allo stesso livello di SOSPENDI ed
  ELIMINA. **Agganciata**: un bottone «✔ Riattiva Account» iniettato nel
  footer del dettaglio utente (`006-...js`, stesso pattern già in uso lì
  per «🗑 Elimina Account»), visibile solo quando lo stato è
  `suspended`/`banned`.

Verificato con un account vero, non per ispezione del codice
(`tests/qa/admin-riattiva-account.mjs`, 7/7): si crea un utente attivo →
sul suo dettaglio **non** compare «Riattiva» → si sospende per davvero
(`doSuspend`, la stessa funzione già live) → ora sul dettaglio compare →
click vero → l'utente torna `active`, con una scadenza rinnovata, non
nulla.

### Quello che resta, esplicitamente — non fatto qui

L'audit ha trovato altri gap reali nel pannello Admin → Utenti, elencati
per trasparenza, **non chiusi in questo rilascio** perché più grandi di
una correzione di bug e fuori dallo scopo stretto di questa parte
(«il reset non cancella l'account»):

| Gap | Perché non qui |
| --- | --- |
| Campi **ID** e **data modifica** non mostrati nel dettaglio utente | Aggiunta di UI, non un difetto — nessun dato viene perso, solo non esposto |
| **tenant** e **ruolo** esistono nel modello dati (scritti alla creazione) ma non sono mai mostrati né modificabili nel pannello | Stesso: esposizione UI mancante, non un bug di comportamento |
| **FORCE LOGOUT** ha tre percorsi paralleli (`doForceLogout` nel pannello Anti-Sharing, un bottone inline senza conferma nel dettaglio utente, `adminForceLogout` nella pagina «Sessioni Live») | A differenza di `renderUserActions`/il delete duplicato, questi **sono tutti e tre effettivamente in uso** da viste diverse — consolidarli è un refactor con superficie più ampia, non una rimozione di codice morto; rischierebbe di rompere un percorso live per "pulirne" un altro. Il bottone inline senza conferma (`003:1262`) resta il punto più debole: un click, senza dialogo, disconnette una sessione reale — segnalato, non corretto qui |
| Catalogo piani Admin (4 piani, elenco moduli proprio) non unificato con `InglyPiani` (3 piani, entitlement dall'abbonamento) | Già segnalato in `docs/RELEASE-AUTH-SECURITY-2.md` §4 — tocca pricing e demo, intervento a parte |

Dirlo qui è il punto, come nel resto di questo progetto: una funzione che
manca e si sa che manca è un pezzo di strada; una che sembra esserci e non
funziona è un difetto. I quattro di questa sezione sono del primo tipo.

---

## 5. Verifica

| Cosa | Esito |
| --- | --- |
| `npm run verify` | 267 file, 0 errori |
| `npm test` | 2203/2203 |
| `npm run baseline` | rigenerata, `_ingly_hb_` (heartbeat mai scritto di SDE) l'unica chiave deliberatamente sparita |
| `tests/roundtrip.test.mjs` | verde — `006-...js` dichiarato in `baseline/deliberate-changes.json` |
| `tests/qa/reset-non-cancella-account.mjs` **(nuova)** | 10/10 — account vero creato, dato applicativo vero scritto, click vero sul bottone vero di reset, l'account sopravvive, il dato no, login successivo con le stesse credenziali riesce |
| `tests/qa/admin-riattiva-account.mjs` **(nuova)** | 7/7 — utente vero creato attivo, sospeso per davvero, «Riattiva» compare solo da sospeso, click vero, torna attivo con scadenza rinnovata |
| `tests/qa/admin-console-accesso.mjs` (rieseguita) | 41/41 |
| `tests/qa/ciclo-account.mjs` (rieseguita) | 76/76 |
| `npm run qa` (regressione completa, ~103 suite) | vedi in fondo a questo documento / CHANGELOG per l'esito integrale della corsa di rilascio |

## 6. File modificati

| File | Perché |
| --- | --- |
| `src/legacy/app/src/modules/settings/index.js` | `factoryReset()`: esclude `ingly_saas_db`/`ingly_device_id`/`ingly_wizard_done_v2` dal filtro di cancellazione; avviso di conferma riscritto |
| `src/legacy/patches/117-ingly-smart-search-engine-v33.js` | Ritirata `SingleDeviceEnforcement` (287 righe) |
| `src/admin/legacy/patches/003-engine-enterprise-database-demo-data.js` | Rimossa la «Elimina» duplicata e `renderUserActions()` (mai invocata) |
| `src/admin/legacy/patches/006-admin-delete-suspend-enhancement-v1-0.js` | Bottone «Riattiva Account» agganciato nel dettaglio utente |
| `tests/qa/reset-non-cancella-account.mjs` | nuova |
| `tests/qa/admin-riattiva-account.mjs` | nuova |
| `baseline/ingly-os.json`, `baseline/ingly-cloud-admin.json` | rigenerate (`npm run baseline`) dopo il ritiro deliberato di SDE |
| `baseline/deliberate-changes.json` | nuova voce per `006-...js` |
| `package.json` | versione, `qa` con le due suite nuove in coda |

## 7. Criterio "done" di questo mandato — a che punto siamo

Rileggendo l'elenco del mandato punto per punto:

- ✅ *«Un account creato dall'Admin rimane esistente anche dopo cancellazione
  completa dei dati locali»* — vero per l'unico percorso che questa
  installazione può offrire senza backend: il reset **dall'interno
  dell'app** (TEST 3/4/5 del mandato, nella loro forma raggiungibile —
  vedi §2). Non vero, e non può esserlo senza un progetto Supabase reale
  con quella chiave, per un azzeramento fatto da **fuori** l'app (DevTools,
  altro dispositivo).
- ✅ *«Il reset locale non provoca mai un nuovo signup»* — per lo stesso
  percorso, corretto e testato.
- ✅ *«Solo Admin può creare/eliminare account»* — già vero da prima di
  questo rilascio (nessun signup pubblico lato prodotto oltre al primo
  avvio locale, che crea l'unico owner della propria installazione — non
  un secondo tenant su un account esistente).
- ✅ *«Backup/reset funziona senza distruggere l'identità»* — corretto qui,
  è il cuore di questo rilascio.
- ✅ *«Force logout, RBAC, tenant isolation, password reset»* — verificati
  lato client dalle parti precedenti di questo mandato, invariati qui.
- ⛔ *«Il Cloud è la fonte autorevole dell'identità»*, *«trial/subscription
  dal Cloud»*, *«single-device persistito lato server»*, *«nuovo
  browser/device → login con lo stesso account»* — **BLOCKED**, per la
  ragione dichiarata al §2: nessuna credenziale reale, nessun mock.

Questo rilascio chiude il difetto locale reale e rimuove due duplicazioni
segnalate da tempo. Non dichiara "LIVE" un'architettura cloud che non è
collegata a niente.
