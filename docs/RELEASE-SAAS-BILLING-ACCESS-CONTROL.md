# Release — Account, SaaS Billing & Access Control

Mandato: «INGLY OS — COMPLETE ACCOUNT, SAAS BILLING & ACCESS CONTROL», 42
sezioni, per trasformare Account/Auth/Billing/Trial/Subscription/Device in
un sistema SaaS professionale. Continua il filone «FIX DEFINITIVO AUTH /
ACCOUNT / LOGIN / PIANI / BILLING / DEVICE SESSION» (`docs/
RELEASE-AUTH-SECURITY-2.md`, `-3.md`, `-4.md`).

Questo documento fa la stessa cosa delle tre parti precedenti: separa ciò
che è **corretto e verificato in un browser vero** da ciò che è **bloccato
perché richiede un backend che non esiste in questo ambiente**, e da ciò
che è **deliberatamente rimandato** perché più grande di questo giro e
segnalato con lo stesso giudizio già usato altrove in questo progetto. Le
42 sezioni del mandato non sono state eseguite come una lista a spunta
meccanica: sono state verificate contro il codice reale, e questo
documento riporta cosa si è trovato — non cosa il mandato presuppone che
ci fosse.

---

## 1. Il limite architetturale, che vale per l'intero mandato (§1, §11, §12, §25, §26)

Va detto una volta sola qui, invece che ripeterlo in ogni sezione: questa
installazione è **un file HTML statico, senza server**. Confermato di
nuovo in questo giro (§7-8): nessuna directory `server/`, `functions/`,
`api/`, nessuna dipendenza server-side in `package.json`, nessun ricevitore
di webhook in nessun punto del repository.

Questo significa, precisamente:

- **Il Cloud non può essere «la fonte autorevole»** nel senso in cui il
  mandato lo intende (§1) finché non esiste un progetto Supabase reale
  raggiunto da questa installazione. Il codice che *leggerebbe* quella
  fonte esiste ed è corretto (`InglyCloud`, `InglySaaSPlatform` — vedi
  `docs/CLOUD-SYNC-STATUS.md`), ma è spento per default e senza una anon
  key reale non si connette a niente.
- **RLS reale (§25) non è verificabile qui.** L'isolamento per
  `tenant_id` è applicato e testato lato client (`tests/
  amministrazione.test.mjs`, `tests/audit-sicurezza.test.mjs`); diventa
  una vera garanzia di sicurezza solo quando i dati passano su un
  database con policy reali — vedi `docs/SEC-005-SUPABASE-RLS-INCIDENT.md`.
- **Un webhook del fornitore di pagamento (§12) non può arrivare da
  nessuna parte.** Non esiste un endpoint che lo riceva. `InglyFatturazione.
  applica()` (`src/product/billing.js`) è la funzione che tradurrebbe un
  evento reale in uno stato di abbonamento — è corretta, testata
  (`tests/fatturazione.test.mjs`) — ma nessun evento reale le arriva mai
  finché non esiste un backend.
- **Il credenziale bloccante è lo stesso delle parti 3-4**: staging
  «INGLY OS V2 STAGING» (ref `uepyexyosyogyvzorata`) — trovato l'URL in un
  file di esempio adiacente, mai una anon/publishable key reale in
  nessun punto di questo ambiente.

Il mandato stesso, §37, prescrive cosa fare quando manca una credenziale:
completare codice, UI, schema, validazione e test locali, **senza
inventare** l'integrazione mancante. È la regola seguita qui: dove il
mandato chiede «integra il provider reale» o «implementa il webhook», la
risposta onesta è la struttura pronta e il blocco dichiarato — mai un
mock spacciato per collegamento vero.

---

## 2. Quello che era rotto per davvero, corretto e verificato

### 2.1 — Trial extension: mancava del tutto (§6)

`InglyAbbonamento` non aveva un modo di estendere una prova in corso.
«Estendere il trial» è un'azione esplicitamente richiesta all'Admin (§2,
§27), e prima di questo giro l'unica cosa disponibile (`setTrial` nella
console) *resettava* la prova a 14 giorni fissi, senza tracciare chi,
quando, quante volte — gli stessi tre campi che il mandato chiede
(`trial_extension_count`, `trial_extended_by`, `trial_extended_at`) erano
genuinamente assenti, non solo rinominati.

Aggiunta `InglyAbbonamento.estendiTrial(sub, giorni, opzioni)`
(`src/product/subscription.js`): estende `trial_end`/`current_period_end`
di N giorni, incrementa il conteggio, registra chi e quando. Rifiuta di
estendere una prova già scaduta (è una scelta diversa — assegnarne una
nuova — non un'estensione) o un abbonamento a pagamento. 5 nuovi unit
test (`tests/saas-piani.test.mjs`).

### 2.2 — I limiti di dispositivo non erano mai differenziati per piano (§8)

`InglyDispositivi.limiteDi(piano)` (`src/product/device-sessions.js`)
cercava già `InglyPiani.limite(piano, 'dispositivi')` — il codice se
l'aspettava — ma quella chiave non esisteva nel catalogo piani
(`src/product/plan-catalog.js`): **ogni piano, Business incluso, riceveva
sempre lo stesso limite di una sola postazione.** Stesso per `storage_gb`,
presente solo nel catalogo separato dell'Admin. Aggiunti entrambi al
catalogo canonico (`standard:1/5GB, premium:3/25GB, business:10/100GB` —
`storage_gb` dichiarato, non ancora imposto da nessun controllo di quota:
il primo passo, non l'ultimo). 2 nuovi unit test confermano che
`limiteDi()` ora restituisce il valore giusto per piano, non sempre 1
(`tests/dispositivi.test.mjs`).

### 2.3 — Cambiare piano nell'Admin desincronizzava gli entitlement reali (§8, §17)

Il difetto più grave trovato in questo giro. `doSaveUser()` (Admin,
`003-...js`) e l'azione bulk `plan:<id>` (`008-...js`) scrivevano solo
`u.plan` — il campo che questa console mostra — **mai**
`db.subscriptions[].plan_id`, quello che `InglyEntitlements.can()` legge
davvero per decidere cosa un utente può usare (vedi §3 sotto per la mappa
completa dei catalogi). Un admin che cambiava il piano di un utente
vedeva il pannello aggiornato correttamente; l'utente, nel prodotto,
continuava a operare con gli entitlement del piano precedente — o, nel
caso opposto, restava bloccato da un piano che pensava di aver lasciato.
Un cambio piano di massa (bulk) aveva lo stesso identico difetto.

Corretto in entrambi i punti, riusando il ponte già esistente
(`MAPPA_PIANO_CANONICO`, la stessa tabella che `doCreateUser()` già usa):
ora aggiornano anche `db.subscriptions[].plan_id`. Verificato con un
utente vero, creato con un piano, modificato a un altro, controllando che
l'abbonamento vero segua (`tests/qa/admin-kpi-e-fatturazione-reali.mjs`).

### 2.4 — Dashboard Admin: KPI che escludevano in silenzio chi non era stato creato da qui (§27, §31)

`renderDashboardWithChart()` calcolava MRR, ARR, utenti attivi, «Scadono
7gg», «Scaduti», «Nuovi mese» leggendo `u.plan`/`u.plan_id`/
`u.expires_at`/`u.created_at` — campi che **solo** un utente creato
dall'Admin porta. Un utente **registrato da sé** (il percorso self-service
reale, `InglyAccount.crea()`) non ha mai questi campi sul proprio record:
il suo piano e la sua scadenza vivono solo nel vero abbonamento
(`db.subscriptions`). Risultato: ogni cliente arrivato per registrazione
diretta spariva silenziosamente da MRR, conteggio attivi, e dagli avvisi
di scadenza — non un numero sbagliato, un numero che **ometteva** chi non
era passato dalla console.

Corretto con un resolver che, per ogni KPI, prova prima i campi
sull'utente e poi il vero abbonamento collegato per `tenant_id`. Corretto
anche un secondo difetto indipendente nello stesso punto: i campi
cercati (`expires_at`/`created_at`, snake_case — la forma Supabase) non
sono mai valorizzati su un utente creato da questa stessa console (che
scrive `expiresAt`/`createdAt`, camelCase): «Scadono 7gg» e «Scaduti»
mostravano **sempre zero**, qualunque fosse lo stato reale degli account,
su ogni installazione locale (cioè su ogni installazione, dato che il
backend Supabase è opzionale e spento per default). Il grafico «MRR Trend
12 mesi» non era mai stato `Math.random()` in questa versione del file —
lo era in una versione precedente, sovrascritta — ma condivideva lo stesso
difetto sui nomi dei campi, quindi era comunque piatto/vuoto per la stessa
ragione.

### 2.5 — Il pannello Pagamenti inventava uno storico transazioni, con un «Retry» che fingeva un incasso (§11, §13, §31)

`openPaymentHistory()` generava con `Math.random()` da 3 a 12 transazioni
finte per utente — importi, fatture, esiti — la prima volta che qualcuno
apriva il pannello, e le salvava come se fossero reali. Il bottone
«Retry» su una transazione «fallita» si limitava a scrivere
`status='paid'` su quel record inventato: un click che sembrava incassare
un pagamento mai davvero tentato. Questo è esattamente lo stato di
produzione falso che il mandato vieta esplicitamente (§31, §38).

`InglyFatturazione` (`src/product/billing.js`) è reale, testata, e scrive
`db.billing_events` ogni volta che `applica()` riceve un evento vero dal
fornitore — semplicemente nessun evento arriva mai, per la ragione del
§1. Il pannello ora legge **quella** riga (Admin e Prodotto condividono
`localStorage['ingly_saas_db']` quando aperti dalla stessa origine — è
così che `admin-crea-utente-poi-login.mjs` verifica da tempo che un
utente creato in Admin acceda davvero nel prodotto) invece di inventarne
una propria. Se non è mai arrivato un evento vero, il pannello lo dice —
uno storico vero che è vuoto, non uno storico finto che sembra pieno. Il
bottone «Retry» e la funzione che lo sosteneva sono stati rimossi, non
solo scollegati: lasciarli presenti come codice morto avrebbe significato
che una futura integrazione webhook li avrebbe dovuti trovare e capire se
fossero ancora la strada giusta (non lo erano).

### 2.6 — Audit Trail del dettaglio utente: vedeva solo metà della storia (§28, §29)

`openUserDetail()` leggeva `db.auditLog` (camelCase) — gli eventi che
**questa console** scrive quando un admin clicca Sospendi/Ban/etc. Il
registro vero (`db.audit_log`, snake_case), scritto da `InglyAccount`,
`InglyFatturazione`, `InglyDispositivi` per ogni evento reale del
prodotto — creazione account, cambio password, attivazione/rinnovo
pagamento, revoca dispositivo — non compariva **mai** in questo pannello.
Chi apriva il dettaglio di un account vedeva solo le azioni fatte da
questa console, mai quelle avvenute davvero nel prodotto: esattamente
l'opposto della «timeline» che il mandato chiede (§28). Corretto: i due
registri vengono uniti, normalizzati sulla stessa forma, ordinati per
data.

Nello stesso punto, un secondo difetto — non collegato all'audit trail ma
trovato aprendo il dettaglio di un account autoregistrato per verificare
la correzione sopra: la scheda «Utilizzo» chiamava
`u.aiUsage.toLocaleString()` senza controllare se `aiUsage` esistesse.
Un account creato da questa console ha sempre quel campo (`doCreateUser`
lo inizializza a 0); un account **registrato da sé** non lo ha mai avuto
— non è un campo del modello dati reale del prodotto, è una statistica
che solo questa console tiene. **Il dettaglio di ogni account
autoregistrato andava in errore JavaScript e non si apriva affatto.**
Corretto con un valore di ripiego (`||0`) sui quattro campi coinvolti.

### 2.7 — Admin → Utenti: una «Elimina» duplicata, una «Riattiva» irraggiungibile (già in 2.12.0, riportato qui per continuità)

Vedi `docs/RELEASE-AUTH-SECURITY-4.md` §4: `SingleDeviceEnforcement`
(287 righe, dormiente, duplicata rispetto a `InglyDispositivi`) ritirata;
`confirmDeleteUser`/`checkAndDelete`/`doDeleteUser` (duplicati mai
raggiunti da nessun bottone) rimossi; «Riattiva Account» agganciata nel
dettaglio utente, dove prima non c'era nessun modo diretto di tornare
attivo da uno stato sospeso.

---

## 3. La mappa dei catalogi piani — trovati CINQUE, non due (§8, §9, §35)

Il mandato chiede una fonte canonica per piani ed entitlement, senza
duplicati. L'audit di questo giro ha trovato cinque cataloghi distinti,
non i due che la documentazione precedente (`docs/
RELEASE-AUTH-SECURITY-2.md` §4) già segnalava:

| Catalogo | Dove | Piani | Usato per il gating reale? |
| --- | --- | --- | --- |
| `InglyPiani` + `InglyEntitlements` | `src/product/plan-catalog.js`, `entitlements.js` | standard/premium/business | **Sì** — `SaaSGate.userCanAccess()` lo chiama a ogni navigazione |
| `PLANS_CFG` | Admin, `003-...js` | starter/pro/business/enterprise | No — solo prezzi/quota/UI dell'Admin |
| `MAPPA_PIANO_CANONICO` | Admin, `003-...js` | (ponte fra i due sopra) | Il solo collegamento esistente, ora esteso a edit+bulk (§2.3) |
| `InglyLicensing` / `FEATURES`/`PLANS` | `src/core/licensing/features.js`, esposto come `window.InglyLicensing` | free/starter/pro/business/enterprise | **No — zero punti di chiamata per il gating**, in tutto il repository. Costruito apposta per unificare gli altri due (il suo stesso commento in testa lo dice), spedito nel bundle dell'app-shell, mai adottato dal percorso di enforcement reale |
| `PLAN_MODULES` | `src/legacy/patches/117-...js` | starter/pro/business/enterprise | Solo per il payload di sincronizzazione Cloud (Cloud Sync spento per default — inerte) |

**Cosa è stato fatto qui**: chiuso il difetto concreto (§2.3 — un cambio
piano che non aggiornava mai l'abbonamento vero) usando il ponte già
esistente. **Cosa NON è stato fatto, deliberatamente**: unificare i cinque
cataloghi in uno solo. Il motivo è lo stesso già scritto in `docs/
RELEASE-AUTH-SECURITY-2.md` §4: tocca pricing, demo e decine di punti
della sola console Admin — un intervento architetturale a sé, non una
correzione di bug, e il mandato stesso (§36, «non fare una riscrittura
totale») chiede di non farlo qui. `InglyLicensing` in particolare è un
candidato reale per il ritiro (segue lo stesso schema di
`SingleDeviceEnforcement`: costruito, spedito, mai collegato) — non
ritirato in questo giro perché tocca `src/app-shell/index.mjs` (un file
più «core» di un patch applicativo) e ha una propria suite di test
dedicata; segnalato qui per lo stesso trattamento della prossima parte.

---

## 4. Lo stato macchina dell'account e dell'abbonamento — già corretto, verificato di nuovo (§3)

Il mandato chiede uno stato macchina esplicito e unico. C'è già, ed è
pulito — **due macchine separate**, non una sola con troppi stati, e la
separazione è deliberata (vedi il commento in testa a `subscription.js`):

- **Account** (`InglyAccount.TRANSIZIONI`, `account-service.js`):
  `active, pending_verification, suspended, banned, deleted`. `deleted`
  è terminale. `pending_verification` esiste nella macchina ma nessun
  percorso lo assegna (nessun servizio di posta — dichiarato in
  `docs/ACCOUNT-LIFECYCLE.md` §7, non un difetto).
- **Subscription** (`InglyAbbonamento.TRANSIZIONI`, `subscription.js`):
  `trial, active, past_due, cancelled, expired, suspended`. `trial` ed
  `expired` **si calcolano dalle date**, non si memorizzano — uno stato
  scritto in archivio diventerebbe falso da solo col passare dei giorni.

Le uniche violazioni trovate — stringhe `status` scritte a mano fuori da
queste due tabelle, comprese `'trial'`/`'lifetime'` (uno stato che non
esiste in **nessuna** delle due macchine canoniche) — vivono
esclusivamente nel codice Admin legacy (`003-...js`, `117-...js`), mai nei
moduli `src/product` moderni. Non toccato in questo giro per lo stesso
motivo del §3 sopra: è la stessa classe di debito architetturale della
duplicazione dei piani, e unificarlo tocca gli stessi punti della
console. `'lifetime'` in particolare è un concetto commerciale reale (un
cliente che paga una volta sola, mai una subscription ricorrente) che le
due macchine canoniche non rappresentano affatto — inventare come
incastrarlo senza una decisione di prodotto esplicita avrebbe significato
indovinare, non correggere.

---

## 5. Test — la matrice del mandato (§33, §34), verificata dove è verificabile

Il mandato elenca una matrice di test per categoria. Riportata qui con lo
stato reale, non un elenco di spunte:

| Categoria | Stato |
| --- | --- |
| **ACCOUNT** — create/login/logout/reset password/disable/enable/delete | Tutti verificati con browser reale nelle release precedenti di questo filone (`tests/qa/ciclo-account.mjs`, `admin-crea-utente-poi-login.mjs`, `admin-riattiva-account.mjs`) |
| **LOCAL RESET** — clear IndexedDB/localStorage/cache/backup → reload → login | **Il caso critico (§34)**: esteso `tests/qa/reset-non-cancella-account.mjs` a 17 controlli — oltre a «l'account esiste ed entra», ora verifica esplicitamente **stesso id utente, stesso tenant, stesso ruolo, stesso abbonamento (stesso id), stesso piano, stesso stato** prima e dopo reset+rientro. Se questo fallisce, la release non è pronta — per come il mandato stesso lo definisce, ed è per questo che è ora un test permanente, non un controllo manuale |
| **DEVICE** — device A/B, switch, force logout, session revoke | Verificati con due schede browser vere (`tests/qa/device-takeover-due-contesti.mjs`, `admin-force-logout.mjs`); limite per piano ora davvero differenziato (§2.2) |
| **TRIAL** — start/active/near expiry/expired/reset attempt/new device/re-login | Start/active/expiry verificati (`tests/saas-piani.test.mjs`); estensione ora esiste e testata (§2.1); «reset attempt» = lo stesso test critico sopra, il trial appartiene all'abbonamento (`db.subscriptions`), non al dispositivo — un reset locale non lo tocca |
| **SUBSCRIPTION** — standard/premium/upgrade/downgrade/renewal/payment failure/expiry/reactivation | Stato macchina e transizioni testate (`tests/saas-piani.test.mjs`); cambio piano ora sincronizzato Admin↔prodotto (§2.3); pagamento/rinnovo reali restano **BLOCKED** per la ragione del §1 |
| **SECURITY** — RBAC/RLS/tenant isolation/manipolazione frontend | RBAC e isolamento tenant verificati lato client (test esistenti); RLS reale **BLOCKED**, stessa ragione |

---

## 6. File modificati

| File | Perché |
| --- | --- |
| `src/product/subscription.js` | `estendiTrial()` — §2.1 |
| `src/product/plan-catalog.js` | `dispositivi`/`storage_gb` nel catalogo — §2.2 |
| `src/admin/legacy/patches/003-engine-enterprise-database-demo-data.js` | Desync piano su `doSaveUser` (§2.3); KPI dashboard con resolver piano/scadenza (§2.4); Pagamenti reali, non inventati (§2.5); Audit Trail unito, crash su account autoregistrato corretto (§2.6) |
| `src/admin/legacy/patches/008-azioni-bulk-utenti-selezione-multipla-layer-non-.js` | Desync piano sul cambio bulk — §2.3 |
| `tests/saas-piani.test.mjs` | 5 nuovi test per `estendiTrial` |
| `tests/dispositivi.test.mjs` | 2 nuovi test per il limite dispositivi per piano |
| `tests/qa/admin-kpi-e-fatturazione-reali.mjs` | nuova — 12 controlli, browser reale |
| `tests/qa/reset-non-cancella-account.mjs` | esteso da 10 a 17 controlli — continuità di identità (§34) |
| `baseline/deliberate-changes.json` | nuove voci per `003-...js` (estesa), `008-...js` (nuova) |

## 7. Verifica

| Cosa | Esito |
| --- | --- |
| `npm run verify` | 267 file, 0 errori |
| `npm test` | 2210/2210 |
| `tests/qa/reset-non-cancella-account.mjs` | 17/17 — il test critico del mandato (§34) |
| `tests/qa/admin-kpi-e-fatturazione-reali.mjs` **(nuova)** | 12/12 |
| `tests/qa/admin-riattiva-account.mjs` (rieseguita) | 7/7 |
| `tests/qa/admin-crea-utente-poi-login.mjs`, `admin-force-logout.mjs`, `admin-console-accesso.mjs` (rieseguite) | verdi — un fallimento intermittente su `admin-console-accesso.mjs` («logo prima del login») riprodotto 1/3 in isolamento, confermato flake ambientale preesistente, non una regressione |
| `npm run qa` (regressione completa) | vedi CHANGELOG per l'esito integrale della corsa di rilascio |

## 8. Criterio "done" — a che punto siamo, sezione per sezione

- ✅ §3 (stato macchina), §6 (trial engine con estensione), §8-9 (entitlement
  — chiuso il difetto di desync, documentata la duplicazione residua),
  §17 (plan change), §27-29 (admin panel/audit — numeri e pagamenti veri,
  non inventati), §33-34 (matrice di test, incluso il caso critico) —
  **fatto e verificato in un browser vero**.
- 📋 §8-9 (unificazione completa dei cinque cataloghi piani), §3 (stato
  `'lifetime'` fuori dalle macchine canoniche), `InglyLicensing` (dead
  weight da ritirare) — **debito architetturale reale, documentato,
  deliberatamente rimandato**: più grande di questo giro, tocca decine di
  punti della sola console Admin, il mandato stesso vieta la riscrittura
  totale.
- ⛔ §1 (Cloud come fonte autorevole reale), §11-14 (pagamento/webhook
  reali), §25-26 (RLS/isolamento verificati in rete), §18-19 (single
  device persistito lato server), §21-24 (nuovo browser/dispositivo →
  stesso account, quando l'unica copia locale è stata cancellata da fuori
  l'app) — **BLOCKED**, richiede un progetto Supabase reale con una
  chiave che non esiste in questo ambiente. Nessun mock costruito per
  aggirarlo.

Questo rilascio chiude i difetti reali trovati — un desync piano che
falsava gli entitlement, KPI che escludevano silenziosamente metà degli
account reali, un pannello pagamenti che inventava transazioni con un
finto tasto «Retry», un crash sul dettaglio di ogni account
autoregistrato — e documenta con precisione cosa resta, e perché, senza
dichiarare "pronto per la vendita" un collegamento cloud che non esiste.
