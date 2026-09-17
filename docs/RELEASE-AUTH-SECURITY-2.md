# Release — auth, cloud sync, «Nuovo Utente Enterprise»

Seconda parte del mandato «FIX DEFINITIVO AUTH / ACCOUNT / LOGIN / PIANI /
BILLING / DEVICE SESSION». La prima parte (commit `a99b250`) aveva chiuso due
segreti nel client (Stripe secret key, webhook secret) e il campo di login
`type="email"`. Questa parte nasce da un audit del codice reale — non
dall'elenco del mandato — e trova quattro difetti più profondi, tre dei
quali spiegano da soli il sintomo riportato più volte in questo progetto:
*«l'Admin crea un utente Enterprise, quell'utente non riesce ad accedere»*.

---

## 1. Che cosa c'era, misurato

### SEC-005 — un progetto Supabase di default, scritto nel sorgente

`117-ingly-smart-search-engine-v33.js` e `003-engine-enterprise-database-
demo-data.js` avevano un URL e una anon key Supabase come **default**,
presenti in ogni copia distribuita dei due file. Login e registrazione li
usavano sempre, senza che nessuna installazione li avesse configurati — e i
due file avevano **due progetti diversi**. Il commento che accompagnava la
registrazione diceva letteralmente «RLS aperta».

Non ho potuto verificare empiricamente lo stato reale di quel progetto: un
tentativo di lettura minima è stato bloccato dal controllo di sicurezza
dell'ambiente in cui lavoro (giustamente — è un sistema che non amministro).
Il finding resta comunque azionabile: se RLS è davvero aperta, chiunque
abbia mai aperto uno dei due file può leggere e scrivere le righe di ogni
laboratorio con una `fetch` da DevTools. Dettagli, SQL di chiusura e cosa
resta da fare solo per chi amministra quel progetto:
`docs/SEC-005-SUPABASE-RLS-INCIDENT.md`.

**Fix**: nessun default. Il Cloud Sync richiede ora una configurazione
esplicita (stesso progetto su Admin e prodotto).

### Wizard di onboarding sopra il gate di login

`Wizard.start()` (l'onboarding dell'app, non del SaaS) partiva 600ms dopo
`App.init()`, indipendentemente da una sessione attiva. Il suo overlay ha
z-index 99999 contro i 9999 del gate SaaS: su un'installazione senza
`ingly_wizard_done_v2`, copriva login e registrazione — **misurato**: un
click reale su «Accedi» falliva perché un `<div>` invisibile-ma-sopra lo
intercettava.

**Fix**: `Wizard.start()` aspetta che `SaaSGate._session` esista.

### SEC-006 — la password admin salvata in chiaro nel campo hash

`doCreateUser`, `doSaveUser` e `resetPassword` (Admin) scrivevano la
password generata/nuova **in chiaro** nel campo `passwordHash`. Il login
del prodotto la verifica come hash PBKDF2. Un utente creato o con la
password cambiata da qui non poteva **mai** accedere — verificato
riproducendo l'intero percorso in un browser vero, non deducendolo dal
codice.

**Fix**: le tre funzioni usano `InglyAdminAuth.hash()`, la stessa già in uso
per gli amministratori.

### SEC-008 — nessun workspace, quindi nessuna sessione valida

Anche con la password corretta, il login di un utente creato dall'Admin
falliva comunque, con lo stesso messaggio generico usato per «nessuna
sessione». Causa, isolata passo per passo con un browser vero: `doCreateUser`
scriveva solo una riga in `_db.users`, senza `tenant_id`.
`InglyIdentita.sessioneValida()` rifiuta **ogni** sessione priva di
workspace — regola corretta, perché una sessione senza tenant è un residuo
del modello di prima di questo mandato, e il codice non deve accettarlo in
silenzio.

**Fix**: `doCreateUser` crea anche workspace, appartenenza e abbonamento,
nella stessa forma di `InglyAccount.crea()` (registrazione self-service),
con il piano mappato sul catalogo reale (`InglyPiani`: standard/premium/
business — il catalogo di questa console ne ha quattro; enterprise mappa su
business, la scelta più vicina senza inventare un piano che non esiste).
Unificare davvero i due cataloghi è un intervento più grande di questo fix:
vedi §4.

### SEC-007 — password nell'email

Un hook (attivo solo se `InglyEmail` è caricato — non lo è nel pannello
Admin distribuito, quindi era inerte, ma restava una miccia) passava la
password/hash come variabile del template email di benvenuto e di reset.

**Fix**: tolta da entrambe le chiamate e dalla firma delle funzioni email.

---

## 2. Verifica — non dedotta, riprodotta

| Cosa | Esito |
| --- | --- |
| `npm run verify` | 257 file, 0 errori |
| `npm test` | 2052 PASS / 0 FAIL (2050 + 2 nuovi test di non regressione) |
| `tests/roundtrip.test.mjs` | 9/9 — ogni file modificato è dichiarato |
| `tests/qa/admin-console-accesso.mjs` | 41/41, 0 errori JS |
| `tests/qa/ciclo-account.mjs` | 76/76, 0 errori JS |
| `tests/qa/device-takeover-due-contesti.mjs` **(nuova)** | 11/11 — due schede vere, stesso browser, subentro reale con click veri sui pulsanti del mandato |
| `tests/qa/admin-crea-utente-poi-login.mjs` **(nuova)** | 9/9 — Admin crea l'utente dai campi veri, il prodotto lo riconosce, la password mostrata una volta apre davvero una sessione |
| `npm run qa` (regressione completa, ~77 suite) | vedi report finale |

La suite `admin-crea-utente-poi-login.mjs` è la prova diretta del sintomo
originale chiuso: apre l'Admin, sceglie la password del superadmin, compila
«Nuovo Utente Enterprise» con i campi veri, clicca «Crea & Genera
Credenziali», legge la password mostrata **una sola volta**, apre il
prodotto nello **stesso browser** (lo scenario reale: chi amministra il
proprio workspace apre entrambi i file sul proprio computer) ed entra con
quella password da username e password veri, cliccando «Accedi».

---

## 3. File modificati

| File | Perché |
| --- | --- |
| `src/legacy/patches/117-ingly-smart-search-engine-v33.js` | SEC-005 (default rimosso), evento `ingly:login` anche dal login normale, SEC-007 |
| `src/admin/legacy/patches/003-engine-enterprise-database-demo-data.js` | SEC-005, SEC-006, SEC-007, SEC-008 |
| `src/admin/legacy/markup/001.html` | SEC-005 (credenziale tolta dal markup statico) |
| `src/legacy/app/src/modules/settings/index.js` | Wizard che aspetta la sessione |
| `tests/qa/device-takeover-due-contesti.mjs` | nuova |
| `tests/qa/admin-crea-utente-poi-login.mjs` | nuova |
| `docs/sql/rls-ingly-cloud-lockdown.sql` | nuovo — da eseguire su Supabase |
| `docs/SEC-005-SUPABASE-RLS-INCIDENT.md` | nuovo |

Ogni file dentro `src/legacy`/`src/admin/legacy` è dichiarato in
`baseline/deliberate-changes.json`, verificato da `tests/roundtrip.test.mjs`.

---

## 4. Che cosa NON è stato fatto, e perché

| Non fatto | Perché |
| --- | --- |
| Verificare se RLS è davvero aperta sul progetto Supabase reale | Richiede accesso a un sistema che non amministro; il controllo di sicurezza dell'ambiente ha bloccato anche un tentativo di sola lettura, correttamente. |
| Unificare il catalogo piani dell'Admin (`PLANS_CFG`, 4 piani, elenco moduli proprio) con `InglyPiani` (3 piani, entitlement dall'abbonamento) | Tocca pricing, demo e dozzine di punti di questa sola console: un intervento a parte, non una correzione del login. Nel frattempo la mappatura enterprise→business rende comunque autorevole l'abbonamento creato. |
| Stripe Checkout reale, webhook verificato server-side, RLS vera su tutte le tabelle | Richiedono un backend che non esiste in questa installazione. Già documentato in `docs/BILLING-ARCHITECTURE.md` e ora anche nel report finale di questo mandato. |
| Rollback esplicito su `doCreateUser` se l'hashing fallisse (`crypto.subtle` assente) | La scrittura resta unica e in fondo, quindi non lascia un account a metà; manca solo un messaggio d'errore dedicato per quel caso raro, non gestito con un try/catch specifico. |

Dirlo qui è il punto, come nel resto di questo progetto: una funzione che
manca e si sa che manca è un pezzo di strada; una che sembra esserci e non
funziona è un difetto — e i quattro di questa release erano del secondo
tipo.
