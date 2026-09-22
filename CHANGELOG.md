# Changelog

Versionamento semantico. Ogni voce riflette il codice realmente presente al
commit indicato — non una roadmap, un resoconto.

## 2.17.0 — Design System 2.0, quarto milestone: la prima delle patch storiche migrata

Fase 3 del mandato «NEXT-GENERATION ERP UI/UX & VISUAL TRANSFORMATION»
(componenti condivisi). `docs/DESIGN-SYSTEM.md` §8 dichiara 26 patch
storiche che iniettano CSS a runtime con un `<style>` in `<head>`, non
stratificato. Prima di toccarne una sola: mappate tutte e 24 quelle
elencabili (non 26 — 4 di quelle nominate nel documento, 147/156/158/159,
risultano già escluse dal build tramite `RETIRED_SIDEBAR_PATCHES` in
`src/app-shell/index.mjs`, sostituite dall'app-shell generato; la 117 è
già in gran parte migrata nelle due release precedenti). Delle 20 che
restano davvero, quelle che toccano `#sidebar`/`#topbar` dipendono
dall'ordine di caricamento reciproco per sapere chi vince in cascata —
migrarne una sola avrebbe rischiato di cambiare silenziosamente quale
regola vince per un selettore condiviso. Si comincia da quella con zero
sovrapposizioni: patch 160 (v86, «Consolidatore Strumenti»).

**Cosa faceva**: raggruppa in un menu «Strumenti» i pulsanti-azione di
una sezione quando sono ≥2, per ridurre l'affollamento. La sua CSS
(`.ingly-tools*`) viveva in un `document.createElement('style')` iniettato
a ogni caricamento, con colori letterali (incluso l'ambra `#fbbf24`,
il vecchio accento che questo stesso documento racconta di aver
sostituito) e `!important` ovunque nella regola che ripuliva lo stile
in linea dei pulsanti spostati.

**Migrata** in `src/design-system/components/overlays.css`, accanto al
componente `.ds-menu` già esistente che le somiglia: stessi selettori,
stesso comportamento (posizione, apertura/chiusura, animazione),
soli token — nessun colore letterale, nessun `!important` (il design
system non è in un `@layer`, vince già di suo). Il trigger «🧰 Strumenti»
era anche un'emoji come icona-azione: sostituita con
`<i class="fas fa-toolbox">` e la freccetta con `fa-chevron-down`, stessa
correzione della regola 5 già applicata al resto della chrome.

**Verificato**: `npm test` conferma la logica di raggruppamento invariata
(nessun test dedicato esisteva prima per questo widget — non introdotto
qui). La resa visiva è stata confrontata a comportamento parità:
uno stesso scenario sintetico riprodotto identico sul codice prima e dopo
la migrazione (via `git stash`) mostra lo stesso risultato — la CSS
migrata è equivalente, non solo per lettura del diff ma per prova A/B.

npm test: 2210/2210 · npm run verify: 267 file · npm run qa: tutte le
suite verdi.

## 2.16.0 — Design System 2.0, terzo milestone: chiuso il debito dichiarato nella barra d'identità

Continuazione diretta del 2.15.0, che aveva dichiarato esplicitamente
cosa restava fuori dalla tokenizzazione della barra enterprise
(`#saas-session-bar`, `src/legacy/patches/117-...js`): l'avatar, il
pulsante «Applica» del modulo White Label e l'intero modulo White Label
stesso. Chiuso qui, stesso file, stesso giro:

**Avatar dell'utente**: gradiente `#6366f1 → #a855f7` (indigo/viola)
scritto a mano, indipendente da qualunque accento il laboratorio avesse
scelto — con l'accento «Rosso» (2.11.0) attivo, l'avatar restava comunque
indigo. Ora deriva da `var(--color-primary)`/`var(--color-primary-active)`:
segue davvero il colore scelto.

**Modulo White Label**: l'intero modale (sfondo, bordo, titolo, etichette,
campi, pulsanti) usava una dozzina di colori letterali indipendenti dal
resto del prodotto — compreso il pulsante «Applica», ancora `#6366f1`,
lo stesso indigo sbagliato dell'avatar. Tokenizzato sui component token
già usati da ogni altro modale del prodotto (`--modal-bg`, `--modal-
border`, `--modal-backdrop`) e sui token semantici di superficie/testo
(`--color-surface`, `--color-text`, `--color-text-muted`,
`--color-border`); «Applica» ora usa `var(--color-primary)` con
`--color-text-on-primary`, la stessa coppia di token di ogni bottone
primario dell'app.

Verificato con screenshot reali, non solo letti nel codice: il modale
apre con lo sfondo e i bordi coerenti col resto del prodotto, «Applica»
è ciano (o l'accento scelto) invece di un indigo residuo.

npm test: 2210/2210 · npm run verify: 267 file · npm run qa: tutte le
suite verdi.

## 2.15.0 — Design System 2.0, secondo milestone: la barra d'identità non è un pannello

Fase 2 del mandato «NEXT-GENERATION ERP UI/UX & VISUAL TRANSFORMATION»
(navigazione/shell/topbar). `docs/DESIGN-SYSTEM.md` §8 lasciava aperta,
dal 2.7.0, una domanda di layout: se la topbar principale e la «barra
enterprise» (`#saas-session-bar`, identità laboratorio/piano/White
Label/uscita) dovessero diventare una barra sola o restare due.

**Decisione**: restano due — è una striscia d'identità sopra la topbar
operativa, non una topbar duplicata (la duplicazione funzionale era già
stata chiusa nel 2.7.0/2.9.0). Fonderle avrebbe richiesto una riscrittura
di layout ben oltre il difetto reale trovato, contro il mandato di non
riscrivere.

**Trovato con uno screenshot vero**, non solo leggendo il codice: la
barra enterprise usa `--eh-brand` come sfondo INTERO, e
`src/product/tema.js` lo impostava identico all'accento
(`'--eh-brand': a`). Risultato: ogni installazione, anche senza White
Label configurato, apriva con un pannello ciano a piena saturazione
largo tutto lo schermo — esattamente ciò che questo stesso documento
vieta al §3 («il ciano è un accento… non è un colore di riempimento»).
Non era una scelta di design: era la stessa variabile d'accento riusata
per colorare un bottone E per riempire un pannello, due usi che a piena
saturazione si comportano in modo opposto.

Corretto: `--eh-brand` deriva ancora dall'accento (segue un White Label
brand color vero) ma stemperato nell'antracite del marchio invece di
sostituirlo (nuovo helper `mescola()` in `tema.js`). Nello stesso giro,
tokenizzati anche gli stati della barra rimasti colori letterali —
pallino di stato, badge notifiche, pulsante uscita, avviso di scadenza,
pulsante «Ripristina» del modulo White Label — sui token
`--color-success/-warning/-danger` già in uso nel resto del prodotto.

Debito non chiuso qui, dichiarato: la barra resta un `<style>` iniettato
a runtime con diversi `!important` e altri letterali (badge di piano per
livello, avatar, modale White Label) — si migra con il resto del debito
già in tracciamento al §8. Dettaglio completo in
`docs/DESIGN-SYSTEM.md`.

npm test: 2210/2210 (un'asserzione in `tests/tema.test.mjs` e un
controllo in `tests/qa/aspetto.mjs` aggiornati per riflettere il nuovo
comportamento corretto, non il vecchio) · npm run verify: 267 file ·
npm run qa: tutte le suite verdi, incluso un run pulito di
`quoter3d-calcoli.mjs` senza il flake della release precedente.

## 2.14.0 — Design System 2.0, primo milestone: le icone sono icone

Primo passo del mandato «INGLY OS — NEXT-GENERATION ERP UI/UX & VISUAL
TRANSFORMATION». Prima di scrivere una riga di codice, verificato che cosa
esiste già: `docs/DESIGN-SYSTEM.md` documenta un sistema di token a tre
livelli (primitive/semantic/component) già completo, un motore White
Label con tema chiaro/scuro vero e verifica di contrasto WCAG, Font
Awesome incorporato come unico sistema di icone per la chrome, una
command palette funzionante (Ctrl/Cmd+K), e componenti JS condivisi
(`ui.js`). Non è una tela bianca: è un sistema reale, con le sue regole
già scritte al §9 dello stesso documento. Questo rilascio non lo
riscrive — estende la sua regola 5 («le icone sono icone, le emoji
restano nei contenuti, non nella chrome») e la sua regola 1 («un colore
letterale può stare solo in `primitive.css`») ai punti dove il codice
corrente (non legacy) le violava ancora, per un vero verificabile, non
per «più bello a occhio».

**Trovato e corretto**: la riga cliente del CRM (`cliente-riga.js`, il
renderer unico di CRM-05) disegnava i pulsanti WhatsApp/Modifica/Elimina
con emoji (`💬 ✏️ 🗑`) e un rosso scritto a mano per Elimina; la card
«Economia ordine» (`order-economics-view.js`) aveva lo stesso difetto sui
suoi due pulsanti riga, più quattro celle (profitto e margine, sia nel
riepilogo sia nel dettaglio preventivato) colorate con verde/rosso/ambra
letterali leggermente diversi dai token `--color-success`/`--color-
warning`/`--color-danger` già in uso nel resto del prodotto. Sostituite
le emoji-azione con `<i class="fas fa-whatsapp/fa-pen/fa-trash">`
(rilanciato `scripts/vendor-fonts.mjs` per incorporare il glifo
`fa-pen`, mancante) e i colori letterali con i token esistenti. Il verde
WhatsApp, identità di un servizio terzo e non uno stato applicativo, ha
ricevuto il proprio primitivo dedicato (`--brand-whatsapp`) invece di
diventare impropriamente `--color-success`.

**Deliberatamente non toccato**: le icone tecnologia di
`quote-templates.js` restano emoji perché la stessa stringa finisce anche
dentro un `<option>` di un `<select>` nativo, che non può renderizzare
markup — lì l'emoji è un vincolo tecnico del controllo, non un difetto,
e sono comunque icone di categoria/contenuto, non di un'azione. Dettaglio
completo in `docs/DESIGN-SYSTEM.md` §8.

npm test: 2210/2210 · npm run verify: 267 file · npm run qa: tutte le
suite verdi tranne un flake già documentato e non causato da questa
modifica — `quoter3d-calcoli.mjs` FASE 16b-e (scrittura-poi-ricarica),
riprodotto isolato 2 volte su 3 esattamente come nelle release
precedenti che lo hanno già registrato.

## 2.13.0 — Account, piani e fatturazione: numeri veri, non stimati

Seguito del mandato «COMPLETE ACCOUNT, SAAS BILLING & ACCESS CONTROL» sulla
base di `docs/RELEASE-AUTH-SECURITY-4.md` (2.12.0). Dettaglio completo,
inclusa la mappa dei cinque cataloghi piano non ancora unificati e il
limite architetturale sul backend, in
`docs/RELEASE-SAAS-BILLING-ACCESS-CONTROL.md`. In sintesi, sei difetti
reali trovati e corretti in questo giro:

**1. Il periodo di prova non si poteva estendere.** Non esisteva nessuna
funzione per prolungare un trial: `InglyAbbonamento.estendiTrial(sub,
giorni, opzioni)` sposta `trial_end`/`current_period_end`, rifiuta un
abbonamento già scaduto o già pagante, e traccia `trial_extension_count`,
`trial_extended_by`, `trial_extended_at`. 5 test nuovi in
`tests/saas-piani.test.mjs`.

**2. Il limite di postazioni era sempre 1, per ogni piano.**
`InglyDispositivi.limiteDi()` leggeva già `PIANI[piano].limiti.dispositivi`,
ma quella chiave non esisteva in nessun piano: ogni tenant, anche
Business, restava fermo a una sola postazione. Aggiunti `dispositivi` e
`storage_gb` a ciascun piano in `src/product/plan-catalog.js` (standard 1,
premium 3, business 10 — deliberatamente finito anche per Business, non
illimitato, per rispettare la politica «un abbonamento, un dispositivo»).
2 test nuovi in `tests/dispositivi.test.mjs`.

**3. Cambiare piano da Admin non aggiornava l'abbonamento vero.**
`doSaveUser()` e il cambio piano in massa (`_bulk.act('plan:...')`)
scrivevano solo `u.plan` — mai `db.subscriptions[].plan_id`, il campo che
`InglyEntitlements` legge davvero. Il pannello mostrava un piano, il
prodotto ne applicava un altro. Corretto in entrambi i punti con lo stesso
ponte `MAPPA_PIANO_CANONICO`.

**4. La dashboard Admin escludeva gli utenti autoregistrati.** MRR, utenti
attivi, «Scadono 7gg», scaduti e nuovi del mese leggevano solo
`u.plan`/`u.expires_at`/`u.created_at` — campi che un account creato dalla
console admin porta, ma che un utente registrato da sé (il vero
abbonamento vive solo in `db.subscriptions`) non ha mai avuto. Spariva
silenziosamente da ogni conteggio. Corretto con funzioni di risoluzione
che risalgono al vero abbonamento quando i campi diretti mancano.

**5. Lo storico pagamenti era generato con `Math.random()`.** Il pannello
«Pagamenti» inventava transazioni finte con un bottone «Retry» che
marcava «pagato» un pagamento mai avvenuto. Sostituito con la lettura
reale di `db.billing_events` (scritti da `InglyFatturazione`), incluso
uno stato vuoto onesto quando non ci sono eventi.

**6. L'Audit Trail del dettaglio utente ignorava gli eventi di prodotto,
e andava in errore sugli utenti autoregistrati.** `openUserDetail()`
leggeva solo `db.auditLog` (gli eventi della console); ora unisce anche
`db.audit_log` (gli eventi veri di account/billing/dispositivi). La
scheda «Utilizzo» lanciava un `TypeError` su `u.aiUsage.toLocaleString()`
per qualsiasi account senza quei campi di bookkeeping — un crash reale,
non solo un artefatto di test, scoperto scrivendo la suite di collaudo.

**Il caso critico del mandato (§34)** — stessa identità (stesso utente,
tenant, ruolo, abbonamento, piano, stato) dopo un ciclo reset-locale →
ricreazione → login — ha ora collaudo permanente esteso a 17 controlli in
`tests/qa/reset-non-cancella-account.mjs`. Nuova suite dedicata,
`tests/qa/admin-kpi-e-fatturazione-reali.mjs` (12 controlli), copre i
punti 3-6 con un browser vero.

**Non toccato in questo giro, per scelta esplicita e documentata**: la
duplicazione fra i cinque cataloghi piano esistenti (`InglyPiani`,
`PLANS_CFG`, `MAPPA_PIANO_CANONICO`, `InglyLicensing`, `PLAN_MODULES`) non
è stata unificata — troppo estesa per questo giro, vietata dal mandato
stesso («non fare una riscrittura distruttiva»); qualunque integrazione
reale con un fornitore di pagamento resta strutturalmente impossibile,
perché questo repository non ha alcun server in grado di ricevere un
webhook (verificato: nessuna cartella `server/`, `functions/`, `api/`);
la chiave anon Supabase di staging resta assente da questo ambiente,
stesso blocco già documentato in tre release precedenti, non
riverificato qui perché nulla lo sblocca.

## 2.12.0 — Il reset dei dati non è la cancellazione dell'account

Continuazione del mandato «FIX DEFINITIVO AUTH / ACCOUNT / LOGIN / PIANI /
BILLING / DEVICE SESSION» (parti 1-3: commit `a99b250`, `c172a1b`,
`69bce35`/`afa76c6` — vedi `docs/RELEASE-AUTH-SECURITY-2.md` e `-3.md`).
Dettaglio completo, incluso ciò che resta bloccato e perché, in
`docs/RELEASE-AUTH-SECURITY-4.md`. In sintesi:

**1. Il difetto reale.** «Backup & Ripristino → Reset di fabbrica» cancellava
`localStorage` con un filtro `startsWith('ingly')`, che catturava anche
`ingly_saas_db` — l'unica riga che contiene utenti, tenant, abbonamento,
postazioni e registro. L'avviso mostrato prima del click prometteva di
cancellare «clienti, ordini, prodotti…»: mai l'account. Chi confermava si
ritrovava, al ricaricamento, alla schermata di primo avvio come se non si
fosse mai registrato — l'esatto sintomo segnalato: «ogni volta devo pulire
i dati e rifare l'account». Corretto escludendo `ingly_saas_db` e
`ingly_device_id` dal filtro; l'avviso ora dichiara esplicitamente che
l'account non viene toccato. Verificato con un account vero, un dato
applicativo vero, un click vero sul bottone vero: l'account sopravvive, il
dato applicativo no, e le stesse credenziali riaprono una sessione dopo il
reset (`tests/qa/reset-non-cancella-account.mjs`, 10/10).

**2. Il limite architetturale, dichiarato e non aggirato.** Questa
installazione non ha un backend raggiungibile: l'identità vive solo in
`localStorage`, sullo stesso dispositivo. Un azzeramento completo dei dati
del browser (DevTools «Clear site data», un altro browser, un altro
dispositivo) cancella anche l'unica copia dell'account — non è un bug
risolvibile lato client, è la definizione stessa di «nessun server».
Renderlo davvero cloud-autorevole richiede un progetto Supabase reale;
questo ambiente non ha una anon key valida per nessuno dei due progetti
nominati (produzione «Ingly 91», esclusa per mandato; staging «INGLY OS V2
STAGING», trovato l'URL, mai la chiave — stesso blocco già documentato in
`docs/CLOUD-SYNC-STATUS.md` §9 e `docs/RELEASE-AUTH-SECURITY-3.md` §9, non
riverificato qui perché non è cambiato nulla che lo sblocchi).

**3. `SingleDeviceEnforcement` — ritirata.** Terza implementazione,
duplicata e dormiente, dello stesso limite a una postazione che
`InglyDispositivi` già applica correttamente. Segnalata per il ritiro fin
da `docs/RELEASE-AUTH-SECURITY-3.md` §3, mai eseguita: rimossa ora (287
righe, `src/legacy/patches/117-...js`), zero punti di richiamo nel resto
del repository (verificato), sua stessa `init()` già disattivata a mano
in una release precedente.

**4. Admin → Utenti: un'implementazione duplicata di «Elimina», rimossa;
«Riattiva», prima irraggiungibile, ora agganciata.** `confirmDeleteUser`/
`checkAndDelete`/`doDeleteUser` duplicavano, senza essere mai chiamate da
nessuna vista, lo stesso «elimina account» già coperto da
`confirmDeleteUserFull`/`doDeleteUserFull` (006) — quella vera, dietro
conferma scritta «ELIMINA». `doReactivate` esisteva ed era corretta, ma il
solo bottone che la chiamava (`renderUserActions()`) non era mai disegnato
da nessuna vista: un account sospeso non aveva, nel pannello dettaglio,
nessuna via diretta per tornare attivo. Aggiunto un bottone «Riattiva
Account» nello stesso pannello dove già vive «Elimina Account», stesso
pattern di iniezione. Verificato con un account vero: creato attivo →
sospeso davvero (`doSuspend`) → «Riattiva» compare solo ora → click vero →
account di nuovo attivo, scadenza rinnovata (`tests/qa/
admin-riattiva-account.mjs`, 7/7).

Verifica: 267 file sintassi, 2203/2203 unit, suite QA browser verde
(vedi `docs/RELEASE-AUTH-SECURITY-4.md` per il dettaglio completo, inclusi
i test già esistenti rieseguiti per escludere regressioni su device
takeover, force logout, cambio account, admin console).

## 2.11.0 — Un accento in più: Rosso

Richiesta diretta dell'utente. Il motore Aspetto (`src/product/tema.js`)
proponeva sette accenti — ciano, ambra, indaco, verde, corallo, magenta,
viola — ma nessuno era un rosso vero: corallo è arancione, magenta è
rosa/porpora. Aggiunto `{ id: 'rosso', label: 'Rosso', hex: '#ef4444' }`
all'elenco `ACCENTI`; il pannello Aspetto lo elenca da solo, non serve
nessuna modifica alla vista. Verificato il contrasto WCAG prima di
proporlo: 5.1:1 su fondo scuro (nessun avviso), 3.8:1 su fondo chiaro
(fascia di avviso, non di errore — meglio di `corallo`, che sul chiaro è
sotto la soglia di leggibilità a 2.8:1). Test `tests/tema.test.mjs`
aggiornato (il titolo diceva «sette accenti», ora sono otto).

Verifica: 267 file sintassi, 2203/2203 unit, suite browser QA verde
(due corse complete su tre; la terza ha rotto in `quoter3d-calcoli.mjs`
FASE 16b-e, il flake noto di scrittura-poi-ricaricamento IndexedDB già
documentato nelle release precedenti — riprodotto 3/3 pulito in
isolamento, confermato non regressione).

## 2.10.0 — Login: il wizard che si ripeteva e il cambio password che ti chiudeva fuori

Segnalazione diretta dell'utente: «devo pulire cache e rifarmi l'account
ogni volta», «il cambio password non funziona», «non mi lascia entrare se
non faccio il restore». Riprodotto dal vero (profilo browser persistente,
signup → chiudi → riapri → login), tre cause reali:

**1. Il wizard di benvenuto si ripresentava ad ogni accesso.**
`InglyPrimoAvvio.invia()` (il vero primo avvio — chiede laboratorio,
referente, email, password) non segnava mai `ingly_wizard_done_v2`, il
contrassegno del *secondo* onboarding (`Wizard`, settings/index.js — «2
minuti per configurare tutto»). Un account già configurato si vedeva
riproporre lo stesso modulo di benvenuto ad ogni login: sembrava che
l'account non fosse mai stato creato davvero. Corretto in due punti: il
primo avvio segna ora da solo il contrassegno; una migrazione una-tantum
in `_successo()` (login, patch 117) lo segna anche per chi aveva già un
account configurato prima di questa correzione, così chi lo sperimenta
oggi non deve rifare nulla.

**2. Il cambio password non era raggiungibile da nessuna parte.**
`InglySicurezza` (src/product/sicurezza-view.js — cambio password,
postazioni aperte, storico account) esisteva da tempo, completo e
funzionante, ma `grep -rn "InglySicurezza" src/legacy` non dava nessun
risultato fuori dal file che lo dichiara: nessun pulsante, nessuna rotta
lo chiamava mai. La rotta `sicurezza` era già presa da un'altra sezione
(Sicurezza & Ordine, lista acquisti) e non si poteva riusare. Aggiunto un
pulsante vero («🔒 Sicurezza account») nella barra enterprise, con lo
stesso pattern a modulo già in uso per White Label.

**3. Cambiare la password chiudeva anche la postazione che la stava
cambiando.** `cambiaPassword()` → `_revocaDispositivi()` revocava TUTTI i
`device_sessions` dell'account, compresa la postazione corrente —
nonostante il messaggio mostrato dopo il cambio dicesse esplicitamente
«le altre postazioni sono state chiuse». La guardia (InglyGuardia), al
giro di controllo successivo, buttava fuori anche chi aveva appena
cambiato la propria password con successo — verificato dal vero: la
sessione cadeva circa 6 secondi dopo un cambio riuscito. Corretto
aggiungendo un parametro `escludiDeviceId` a `_revocaDispositivi()`,
passato da `cambiaPassword(userId, attuale, nuova, { deviceCorrente })`:
ora chiude solo le *altre* postazioni, come promesso. `device.revoked` su
un vero cambio di dispositivo (subentro) e il logout forzato
dall'amministratore restano invariati — solo il cambio password
self-service esclude ora la propria postazione.

**Test**: `tests/qa/login-persistenza-cambio-password.mjs` (11, browser
reale) — primo avvio → logout → login reale senza rivedere il wizard;
click vero sul pulsante Sicurezza account; cambio password che sopravvive
al giro della guardia; vecchia password rifiutata, nuova password
accettata; nessuna regressione sul primo avvio di un'installazione vuota.

**Verificato**: 267 file sintassi, 2203/2203 unit, 101/101 suite browser
QA, 0 errori JS, nessuna regressione (verificato in particolare
`ciclo-account`, `device-takeover-due-contesti`, `admin-force-logout`,
`cambio-account`: la revoca resta corretta per subentro di dispositivo e
logout forzato dall'amministratore — solo il cambio password self-service
è cambiato).

## 2.9.0 — Notifiche Admin→utente: ripristinato l'unico canale reale

Regressione trovata rileggendo il proprio lavoro: il 2.7.0 ha tolto dalla
barra enterprise il secondo pannello notifiche (`_ehOpenNotifications`),
corretto perché duplicava quello vero della topbar — stesso campanello, due
letture mai sincronizzate. Ma quel secondo pannello era anche l'**unico**
punto che leggeva `ingly_saas_db.notifications`, scritto da
`InglyCloudAdmin.sendNotifInApp()` quando il superadmin manda un messaggio
in-app a un utente (es. «Licenza in scadenza tra 5 giorni»). Tolto il
pulsante, quel messaggio non arrivava più da nessuna parte: un canale reale
dell'Admin, invisibile nel prodotto.

**Corretto**: `Notifications.getAll()` — il motore dell'unico pannello
notifiche reale (`#notif-btn`/`#notif-panel`) — include ora anche questi
messaggi, filtrati per l'utente della sessione corrente con l'accessor
canonico `InglyIdentita.idUtente()` (non `session.userId`, campo mai
esistito — stessa classe SEC-009 già corretta altrove; il codice tolto
usava proprio quel campo sbagliato, quindi non avrebbe mai funzionato
nemmeno restando). Rimossi anche `_ehOpenNotifications` e `_ehOpenSettings`
(quest'ultima duplicato morto di `_ehOpenProfile`): zero riferimenti in
tutto `src/`, verificato con grep prima di toccarli.

**Test**: `tests/qa/notifiche-admin-utente.mjs` (8, browser reale) — crea
un account, simula un messaggio dell'Admin per quell'utente e uno per un
altro, verifica dal click vero che solo il proprio compaia nel pannello
reale, con badge e corpo del messaggio corretti.

**Verificato**: 267 file sintassi, 2203/2203 unit, 100/100 suite browser
QA, 0 errori JS, nessuna regressione (il giro completo ha incontrato
`quoter3d-calcoli.mjs` FASE 16b-e, il flake «scrivi poi ricarica» già
documentato in `docs/RELEASE-ACCOUNT-SUBSCRIPTION.md`; riprodotto tre
volte in isolamento, sempre verde — non è la mia modifica, non tocca
`quoter3d-calcoli.mjs` né il percorso di salvataggio preventivi).

## 2.8.0 — CRM: le KPI usano il design system, non otto colori a caso

Secondo giro di audit visivo per la trasformazione premium: la vista CRM
Clienti (patch 081) disegnava le sue schede KPI con colori esadecimali
letterali e diversi da scheda a scheda — `#6366f1`, `#10b981`, `#f59e0b`,
`#ec4899` nella riga in alto (Totale/Con Telefono/Importati/Aggiunti
oggi), poi `#6366f1`, `#3b82f6`, `#22c55e`, `#16a34a`, `#78716c` nel
riquadro preventivi — otto tinte senza alcun significato di stato,
semplice decorazione. La Dashboard (Operating Center) risolve lo stesso
problema da tempo con `.kpi-card`/`.kpi-label`/`.kpi-value`, componenti
già pronti in `src/design-system/components/surfaces.css` («il valore è
il contenuto […] niente sfondi colorati»).

**Corretto**: entrambe le righe KPI di `CRMSmart` (`_buildHTML` e
`_kpiPreventivi`, in
`src/legacy/patches/081-ingly-os-v26-crm-selezione-multipla-elimina-expo.js`)
ora usano `.kpi-grid`/`.kpi-card`/`.kpi-label`/`.kpi-value` del design
system al posto degli otto stili inline con colore letterale. Nessun
cambiamento di dato o di comportamento: le stesse quattro più (fino a)
cinque voci, con lo stesso `title` esplicativo sul riquadro preventivi.

**Test**: `tests/qa/crm-kpi-design-system.mjs` (11, browser reale) —
verifica dal DOM reale che entrambe le righe usino le classi del design
system, che nessuna scheda porti più un colore inline, che i numeri
mostrati restino corretti con dati seminati (totale, con telefono), e che
la Dashboard resti sullo stesso stile (nessuna doppia convenzione
nell'app).

**Verificato**: 267 file sintassi, 2203/2203 unit, 99/99 suite browser QA,
0 errori JS, nessuna regressione (CRM: `crm-riga-unica`,
`crm-paginazione`, `clienti-unici`, `crm-export-selezione`,
`crm-preventivi`, `crm-customer-360` tutti verdi).

## 2.7.0 — Visual QA: due barre in alto diventano una, versione vera nella status bar

Primo giro di audit visivo reale del prodotto (aprire l'app, guardare lo
schermo — non solo il codice) per la trasformazione premium. Due difetti
concreti trovati e chiusi, entrambi visibili su ogni schermata:

**La barra enterprise duplicava la topbar principale**. Ogni account
nuovo nasce con un abbonamento attivo (mai una prova), quindi la barra
`#saas-session-bar` (piano, brand, uscita) è sempre visibile — impilata
sopra la topbar principale, con un secondo campo di ricerca (delegava a
`GlobalSearch.open()`, la stessa della prima), un secondo pulsante
notifiche (leggeva un archivio diverso, mai sincronizzato con quello
vero) e un secondo pulsante impostazioni identico al primo. Il suo
breadcrumb, in più, non si è mai aggiornato — la funzione che lo doveva
agganciare a `App.navigate` non viene chiamata da nessuna parte. Rimossi
i tre duplicati e il breadcrumb rotto; restano solo identità del
laboratorio, piano/scadenza, White Label e uscita — le uniche funzioni
che quella barra offre e la topbar principale no.

**La status bar mostrava «Ingly OS v37»**, una versione scritta a mano
anni fa, molte versioni indietro rispetto a quella davvero installata.
`compose.mjs` incorpora ora `window.INGLY_APP_VERSION` (da
`package.json`, la stessa fonte già usata per l'Admin) anche nel bundle
Product; la status bar e il toast di benvenuto lo leggono invece di un
numero congelato nel codice.

**Test**: `tests/qa/topbar-enterprise-non-duplicato.mjs` (11, browser
reale) — verifica dal click vero che White Label e Uscita funzionino
ancora, che i duplicati non ci siano più, e che la topbar principale non
abbia perso nulla.

**Verificato**: 267 file sintassi, 2203/2203 unit, 98/98 suite browser QA,
0 errori JS, nessuna regressione (incluso `aspetto.mjs` — White Label —
e `ciclo-account.mjs`/`cambio-account.mjs` — sessione/logout). Login
admin verificato esplicitamente prima del rilascio.

## 2.6.0 — Qualità in dashboard: le non conformità aperte diventano visibili

Chiude un gap dichiarato in `docs/QUALITY.md`: `InglyQualityNCR.riepilogo()`
esisteva ed era pronto, ma non aveva mai avuto un consumatore fuori dal
pannello Produzione del singolo ordine — la dashboard non segnalava mai
nessun problema di qualità aperto.

**Nuove funzionalità**
- `InglyData.attention()` (la sezione «Richiede attenzione» dell'Operating
  Center) guadagna un gruppo `quality`: conta le non conformità **aperte**
  con lo stesso motore che il pannello Produzione già usa, e nomina motivo
  e ordine delle più recenti.
- Il renderer della card era già generico su qualunque gruppo — nessuna
  modifica al disegno, solo il nuovo dato in `data.js`.

**Test**: `tests/qa/dashboard-qualita-attenzione.mjs` (8, browser reale) —
card assente senza non conformità aperte, presente con la giusta e con il
cliente giusto, una chiusa non si somma, persistenza dopo un ricaricamento
vero.

**Verificato**: 267 file sintassi, 2203/2203 unit, 97/97 suite browser QA
(`quoter3d-calcoli.mjs` FASE 16b-e è caduto tre volte nella catena
completa — il flake «scrivi poi ricarica» già documentato in
`docs/RELEASE-ACCOUNT-SUBSCRIPTION.md` — e ha passato pulito in isolamento
ogni volta; il codice di questo rilascio non tocca Quoter 3D), 0 errori
JS, nessuna regressione reale. Login admin verificato esplicitamente
prima del rilascio.

## 2.5.0 — CRM-18: l'esportazione rispetta davvero la selezione

Il motore e i pulsanti di esportazione selettiva (`CRMSmart._exportSelected`/
`._exportAll`, patch 081) esistevano già — ma senza mai essere stati
verificati da un click vero: zero occorrenze in `tests/`, verificato con
`grep`, la stessa classe di difetto («dichiarato ma mai controllato dal
click vero») già trovata più volte in questo progetto.

**Verificato dal click vero, per la prima volta**: selezione di due contatti
su tre, esportazione CSV e VCF che contengono solo quei due, «Esporta
tutto» che ignora la selezione e prende tutti i contatti, la barra di
esportazione selezione che sparisce quando la selezione si svuota.

**Bug reale trovato scrivendo il test, non dalla lettura del codice**:
`_getExportData(onlySelected)` con `onlySelected=true` ma **zero** contatti
selezionati cadeva nel ramo «restituisci tutta la rubrica» invece di un
elenco vuoto — la guardia era `onlySelected && size>0`, non solo
`onlySelected`. Nella UI questo caso non è raggiungibile davvero (la barra
con «Esporta CSV/VCF selezionati» sparisce quando la selezione è vuota),
ma il ramo esisteva nel codice ed era la stessa classe di difetto che
questa voce della roadmap CRM doveva chiudere. Corretto: una selezione
vuota ora restituisce sempre un elenco vuoto.

**Test**: `tests/qa/crm-export-selezione.mjs` (11, browser reale).

**Verificato**: 267 file sintassi, 2203/2203 unit, 96/96 suite browser QA,
0 errori JS, nessuna regressione. Login admin verificato esplicitamente
prima del rilascio.

## 2.4.0 — Procurement: ricevimento parziale riga per riga

Il motore (`InglyPurchaseOrder.ricevi`) e lo store hanno sempre supportato
un ricevimento parziale per singola riga, testato a unità dal primo giorno
— mancava solo la UI: «✅ Segna ricevuto» chiamava `ricevi()` passando
sempre l'intero residuo di ogni riga, quindi chi riceveva tre casse su
cinque ordinate doveva forzare un «tutto ricevuto» falso o aspettare
l'arrivo completo.

**Nuove funzionalità**
- Nuovo pulsante «✏️ Parziale» nel registro ordini fornitore, accanto a
  «✅ Segna ricevuto» (che resta, per il caso comune di ricevere tutto in
  un click). Apre un modulo con una quantità per riga, precompilata al
  **residuo di quella riga** e con un tetto che non lascia scrivere più di
  quanto manca.
- «Conferma ricevimento» costruisce l'elenco righe dai soli campi con una
  quantità maggiore di zero e lo passa a `InglyPurchaseOrderStore.ricevi`
  — la stessa funzione di sempre, nessun secondo motore di ricevimento.
- Un ordine ricevuto in due volte genera due movimenti di magazzino
  distinti per riga, mai un doppio conteggio: la seconda apertura del
  modulo precompila il residuo rimasto, non il totale originale.

**Test**: `tests/qa/ordine-fornitore-parziale.mjs` (12, browser reale).

**Verificato**: 267 file sintassi, 2203/2203 unit, 95/95 suite browser QA,
0 errori JS, nessuna regressione (incluso il test di ricevimento totale
preesistente). Login admin verificato esplicitamente prima del rilascio.

## 2.3.0 — Multi-Tech BOM, rilascio 8: fabbisogno netto sugli ordini aperti

Chiude il gap che il rilascio 6 (2.0.0) rimandava esplicitamente nella sua
stessa documentazione: `fabbisognoDaOrdine` diceva solo «quanto c'è oggi
sullo scaffale», non «quanto ne impegnano già gli altri ordini aperti» —
due ordini per lo stesso materiale potevano risultare **entrambi**
disponibili, verificati ciascuno da solo.

**Nuove funzionalità**
- `InglyProductBOMStore._impegnatoAltriOrdini(ordine, IDB)`: somma, per
  articolo, il fabbisogno di tutti gli ALTRI ordini aperti (stessa
  definizione di aperto/chiuso di `InglyFabbisogno.impegnato` — non una
  seconda regola). Un ordine aperto con distinta contribuisce dalla sua
  distinta; un ordine aperto senza distinta ma con un preventivo collegato
  contribuisce da `InglyFabbisogno.daOrdine` — il motore esistente dalla
  Fase 31/32, che non aveva mai avuto un consumatore reale prima d'ora.
  Ogni ordine impegna per una sola via, mai per entrambe.
- `fabbisognoDaOrdine` guadagna tre campi per riga, puramente additivi,
  stesso contratto di prima: `impegnatoAltri`, `disponibileNetto`
  (giacenza meno l'impegno altrui), `sufficienteNetto`. Il pannello
  Produzione mostra la riga netta solo quando c'è un impegno da mostrare —
  un ordine da solo sul suo materiale non vede niente di nuovo.

**Non impegna, non scrive**: come il rilascio 6, resta una lettura. Nessuna
prenotazione persistita: il numero si ricalcola dagli ordini aperti
correnti, quindi non può disallinearsi da loro.

**Non ancora fatto, apposta**: nessun ordinamento per priorità fra ordini
concorrenti sullo stesso materiale scarso — il pannello dice che non basta
per tutti, non decide chi vince; è una scelta commerciale, non di
magazzino.

**Test**: `tests/qa/multitech-material-net-availability.mjs` (9, browser
reale) — copertura di entrambe le direzioni (A vede B e viceversa),
esclusione di un ordine consegnato, e del percorso via preventivo per un
ordine senza distinta.

**Verificato**: 267 file sintassi, 2203/2203 unit, 94/94 suite browser QA,
0 errori JS, nessuna regressione. Login admin verificato esplicitamente
prima del rilascio (`admin-primo-avvio.mjs`, `admin-console-accesso.mjs`).

## 2.2.0 — Multi-Tech BOM, rilascio 7: consumo materiale reale (ORDER → OPERAZIONE COMPLETATA → LEDGER → COSTO REALE)

Chiude il gap più importante rimasto nel core produttivo: un'operazione
completata ora consuma davvero il materiale dal magazzino, non solo
dichiara buoni/scarti/rifacimenti.

**Nuove funzionalità**
- `InglyProductBOMStore.consumaDaOperazione(ordine, operazione, quantitaProcessataTotale)`:
  registra il consumo reale — solo la **differenza** rispetto a quanto già
  consumato per quell'operazione (tracciata su `ordine.production.
  materialConsumption`, mai sull'operazione stessa) — tramite `InglyInventory.
  registra`, l'unico scrittore di giacenza già esistente: nessun secondo
  sistema di scrittura creato. Un pezzo scartato ha comunque consumato il
  materiale del tentativo: buoni + scarti + rifacimenti, mai solo i buoni.
  Accumula anche il costo reale (materiale dal resolver di magazzino +
  lavorazione dalla tariffa macchina/manodopera) su `operazione.actualCost`/
  `actualTime`.
- Chiamata dalla stessa registrazione qualità (`_registraQualita`, patch
  052) che già scrive buoni/scarti/rifacimenti dal rilascio Quality
  (1.4.0): non un secondo punto d'ingresso, un secondo passo dello stesso.
- `InglyProductBOMStore.consumoRealeDaOrdine(ordine)`: rilegge dal registro
  vero (non da un totale calcolato altrove) quanto è stato consumato e
  quanto costato finora. Il pannello Preventivato·Reale·Scostamento mostra
  ora «🏭 Consumo reale registrato» — un quarto numero, misurato, distinto
  dal preventivato (congelato), dal costo tecnico della distinta (una
  stima) e dal consuntivo a mano.

**Idempotenza senza un identificativo esterno**: registrare due volte lo
stesso totale processato dà una differenza di zero — nessun movimento
scritto, nessun costo raddoppiato. Verificato sia dal click reale ripetuto
sia da una chiamata diretta alla funzione con lo stesso input.

**Completamento parziale**: 4 pezzi oggi (un movimento), 6 domani (un
secondo movimento, per la sola differenza) — mai il totale ricalcolato da
capo, che avrebbe consumato due volte i primi 4.

**Difetto trovato e corretto scrivendo il test**: una riga materiale della
distinta non porta sempre `itemStore`/`itemId` separati (dipende da come è
stata creata) — solo `itemKey`. Il primo tentativo chiamava la scorciatoia
`InglyInventory.consuma(store, id, ...)`, che li richiede: con `itemKey`
soltanto, scriveva zero movimenti in silenzio. Corretto a chiamare
`InglyInventory.registra` direttamente con `itemKey` (che lo accetta), e a
derivare `store`/`itemId` dalla stessa chiave quando non dichiarati, per
tenere allineata anche la giacenza materializzata sull'archivio giusto.

**Non ancora fatto, apposta**: nessuna scrittura automatica nei campi
manuali del consuntivo (`cost_entries`) — restano una misura a mano,
distinta da questa misura automatica.

**Test**: `tests/qa/multitech-actual-consumption.mjs` (24, browser reale).

**Verificato**: 267 file sintassi, 2203/2203 unit, 93/93 suite browser QA,
0 errori JS, nessuna regressione.

## 2.1.0 — Release management: versione tracciabile in Admin, artefatti versionati

**Trovato verificando l'architettura reale prima di scrivere codice**:
nessun punto della console Admin, né del prodotto, leggeva mai la versione
di INGLY OS — il bundle finale è un file HTML statico, non un'app Node con
accesso a `package.json`. Chi amministrava l'installazione non aveva modo
di sapere quale release stesse gestendo. Nessun meccanismo equivalente
esisteva già (verificato con `grep` su "release"/"version"/"build metadata"
nell'intero `src/`): questo non sostituisce né duplica niente.

**Una sola source of truth**, non un sistema parallelo:
- `RELEASES.json` (tracciato in git, alla radice del repository) è l'unico
  registro di versione/commit/branch/build/artefatti/stato test/QA/blocker
  per ogni release. `scripts/snapshot-release.mjs` (`npm run
  release-artifacts`) lo scrive dopo che una release è verificata verde,
  senza mai cancellare le voci delle altre versioni.
- `scripts/compose.mjs` legge **la stessa** `RELEASES.json` (più
  `package.json` e git direttamente, per commit/branch/data sempre
  aggiornati anche fra due snapshot) e incorpora il risultato come
  `window.INGLY_RELEASE_INFO` nel bundle Admin al momento della build — mai
  un secondo posto che dichiara una versione diversa.

**Nuove funzionalità**
- Un badge «INGLY OS vX.Y.Z» in basso a destra nella console Admin
  (`src/admin/release-info.js`): un click mostra versione, commit, branch,
  build, quali file sono l'artefatto Product e l'artefatto Admin, stato
  test/QA e blocker noti — e dichiara esplicitamente che sottoscrizione,
  licenza e utenti live richiedono un backend non ancora collegato, mai
  dati finti al loro posto.
- `scripts/snapshot-release.mjs`: copia `dist/INGLY-OS.html` e
  `dist/INGLY-CLOUD-ADMIN.html` correnti sotto `dist/releases/<versione>/`
  come `INGLY-OS-<versione>.html` / `INGLY-CLOUD-ADMIN-<versione>.html`, e
  scrive/aggiorna `RELEASES.json`. Le copie HTML versionate restano locali
  (`dist/` non è tracciato: sono 10+ MB, riproducibili da `npm run build`
  su qualunque commit); `RELEASES.json` è la fonte di verità storica,
  apposta piccola e testuale.

**Non ancora fatto, apposta**: nessuna sezione Admin dedicata a utenti/
dispositivi/sicurezza live per-release — quelle superfici esistono già
(Postazioni aperte, Attività recente, gestione utenti, force logout,
audit di sicurezza, dal mandato Account/Abbonamento) e restano invariate;
questo rilascio aggiunge solo l'informazione di versione che mancava, senza
duplicare o spostare ciò che già c'era.

**Difetto trovato e corretto scrivendo il test**: il primo modale copriva
l'intera pagina (`position:fixed;inset:0`) sopra il badge che lo apre — un
secondo click sul badge, con il modale già aperto, non può mai raggiungerlo
davvero (l'overlay lo intercetta), esattamente come Playwright ha rilevato
per hit-testing reale. Aggiunto un pulsante di chiusura esplicito nel box;
il click fuori dal box chiude comunque.

**Secondo difetto, trovato eseguendo `npm run release-artifacts` una prima
volta**: `productArtifact`/`adminArtifact` ripiegavano su `RELEASES.json`
quando presente — ma quei campi, scritti da `snapshot-release.mjs`,
descrivono la copia **versionata** (`dist/releases/<versione>/...`), non il
bundle che il build corrente sta scrivendo. Il badge di un `dist/INGLY-OS.html`
appena generato dichiarava se stesso con il percorso della release
precedente. Corretto a dichiarare sempre i percorsi vivi
(`dist/INGLY-OS.html`/`dist/INGLY-CLOUD-ADMIN.html`), mai letti da
`RELEASES.json`.

**Test**: `tests/qa/admin-release-info.mjs` (16, browser reale) — il badge
esiste, la versione incorporata coincide con `package.json`, commit/branch/
build non sono vuoti, entrambi gli artefatti sono nominati esplicitamente,
lo stato test/QA è mostrato (mai un falso PASS), dichiara il limite del
backend, il pulsante di chiusura chiude davvero, il badge riapre dopo una
chiusura.

**Verificato**: 267 file sintassi (aggiunto `src/admin/release-info.js`),
2203/2203 unit, 92/92 suite browser QA, 0 errori JS, nessuna regressione.

## 2.0.0 — Multi-Tech BOM, rilascio 6: fabbisogno materiali reale (Material Reservation)

Downstream del percorso BOM→Routing→Cost→Order appena chiuso (1.9.0):
verificato con `grep` che `InglyFabbisogno` (`material-requirement.js`,
Fase 31/32) non ha mai avuto un consumatore in tutto il codice, e che
comunque leggerebbe solo dal preventivo (`costBreakdown.voci`), mai da una
distinta di prodotto.

**Nuove funzionalità**
- `InglyProductBOMStore.fabbisognoDaOrdine(ordine)`: il fabbisogno
  materiali di un ordine dalla distinta del suo prodotto — righe espanse
  sulla quantità ordinata, scarto già compreso — con la giacenza attuale
  letta dal registro di magazzino (`InglyInventoryLedger.ricostruisci`,
  lo stesso registro che il resolver di costo già usa). Stessa applicabilità
  di `routingDaOrdine`/`costoDaOrdine` (`_bomApplicabile`, condivisa):
  un ordine per cui viene il routing dalla distinta è lo stesso per cui
  viene anche il fabbisogno.
- Il Pannello Produzione mostra ora «🧱 Materiali necessari»: quanto serve
  e se lo scaffale ne ha abbastanza, con il numero esatto che manca quando
  non basta. Un ordine senza distinta applicabile non vede la sezione.

**Non ancora fatto, apposta**: questo è il fabbisogno di **un** ordine
contro la giacenza fisica, non al netto di quanto già impegnato dagli altri
ordini aperti (quel conto, `InglyFabbisogno.impegnato`, esiste ma sul
vecchio percorso preventivo — incrociarlo con la distinta è un rilascio a
sé, più rischioso da mescolare qui).

**Test**: `tests/qa/multitech-material-reservation.mjs` (8, browser reale).

**Verificato**: 266 file sintassi, 2203/2203 unit, 91/91 suite browser QA,
0 errori JS, nessuna regressione.

## 1.9.0 — Multi-Tech BOM, rilascio 5: l'orchestratore reale (distinta → routing → costo → ordine)

**Nuove funzionalità**
- `InglyProductBOMStore.costoDaOrdine(ordine)`: il primo punto di questo
  verticale che collega i motori puri (`InglyProductBOM`, `InglyBOMCost`)
  a IndexedDB per davvero — non tariffe passate a mano come nei rilasci
  precedenti. Risolve l'oraria macchina da `equipment` via
  `InglyMachineCost`, l'oraria manodopera di ripiego dai profili economici
  del laboratorio (`InglyCostProfilesStore`, la stessa fonte del
  preventivatore) e il costo materiale dal registro di magazzino
  (`InglyInventoryCostResolver`, lo stesso resolver che valorizza un
  preventivo). La domanda «questa distinta è applicabile a questo ordine?»
  — già isolata in una funzione sola nel rilascio 3 (`routingDaOrdine`) —
  è ora condivisa da entrambe le funzioni (`_bomApplicabile`): mai due
  risposte diverse alla stessa domanda per lo stesso ordine.
- Il pannello «Preventivato · Reale · Scostamento» di un ordine mostra ora,
  quando applicabile, una riga «📐 Secondo la distinta» col costo per pezzo
  e le tecnologie — un terzo numero, diverso dal preventivato (congelato al
  cliente) e dal reale (misurato a mano): puramente informativo, non scrive
  mai nei campi di consuntivo. Un ordine senza distinta collegata non lo
  vede: nessuna regressione sul pannello esistente.

**Protezione doppio conteggio**, verificata con test dedicati (unit e
browser): richiamare l'orchestratore più volte non accumula nulla; una
distinta con N righe genera esattamente N voci di costo; due lavorazioni
sulla stessa macchina applicano ciascuna il proprio tempo, mai una tariffa
già conteggiata una seconda volta.

**Non ancora fatto, apposta**: nessuna scrittura automatica nel consuntivo
misurato (`cost_entries`) — quei campi restano una misura fatta a mano, non
una stima; un pulsante che li pre-compili lasciando la conferma
all'operatore resta un'estensione naturale, fuori dallo scopo di questo
rilascio. Nessun collegamento al fabbisogno materiali reale
(`InglyFabbisogno`, ancora senza alcun consumatore nel codice).

**Test**: `tests/bom-cost.test.mjs` esteso a 12 unit (tre nuovi, dedicati
alla protezione doppio conteggio). `tests/qa/multitech-bom-e2e.mjs` — 18
controlli in browser reale, il percorso completo a tre tecnologie
(stampa 3D + laser con macchina, assemblaggio a mano senza) dal prodotto
all'ordine al pannello, con ricaricamento e verifica di non-regressione su
un ordine senza distinta.

**Verificato**: 266 file sintassi, 2203/2203 unit, 90/90 suite browser QA,
0 errori JS, nessuna regressione.

## 1.8.0 — Multi-Tech BOM, rilascio 4: costo aggregato multi-tecnologia

**Nuove funzionalità**
- `src/product/bom-cost.js` (`InglyBOMCost`): il costo di una distinta con
  più tecnologie, aggregando — non ricalcolando — quello che la distinta
  dichiara. Il tempo di ogni operazione (avviamento in una tantum, tempo per
  pezzo in per-pezzo, mai l'uno moltiplicato come l'altro) va alla tariffa
  oraria della sua macchina o, in mancanza, a una tariffa di manodopera di
  ripiego; i materiali vanno al loro costo unitario. Overhead, imballo e
  spedizione restano fuori: sono costi dell'ordine, non della lavorazione —
  sommarli qui li avrebbe sommati una volta per tecnologia invece che una
  volta sola sull'ordine.

**Decisione esplicita**: `InglyCostEngine` non viene toccato. Farlo leggere
una distinta multi-tecnologia avrebbe richiesto un profilo combinato
inventato dentro il file con la storia di difetti critici sui totali più
lunga di questo codice; l'aggregazione vive invece in un modulo nuovo e
puro, che riusa `InglyProductBOM` senza duplicarne i conti.

**N/D esplicito**: una voce (operazione o materiale) senza tariffa/costo
noto non entra nel totale — il risultato dichiara `completo:false`, elenca
che cosa manca e perché, mai un numero indovinato.

**Non ancora fatto, apposta**: nessun collegamento a un ordine reale.
Risolvere le tariffe (macchina/manodopera/materiale) per un ordine vero
richiede IDB — un orchestratore asincrono come `routingDaOrdine` del
rilascio 3, insieme al percorso end-to-end in browser, è il rilascio 5.

**Test**: `tests/bom-cost.test.mjs` (9 unit).

**Verificato**: 266 file sintassi, 2200/2200 unit, nessuna regressione
(nessun modulo esistente toccato).

## 1.7.0 — Multi-Tech BOM, rilascio 3: un ordine espande la distinta in routing reale

**Nuove funzionalità**
- `InglyProductBOMStore.routingDaOrdine(ordine)`: se un ordine ha una sola
  riga collegata (`catalogId`) a un prodotto con una distinta base corrente,
  il routing di produzione viene da `InglyProductBOM.espandiOperazioni`
  (una operazione per lavorazione dichiarata nella distinta, avviamento e
  tempo per pezzo espansi sulla quantità realmente ordinata) invece che
  dedotto dalla singola tecnologia dell'ordine. Senza distinta applicabile
  il comportamento non cambia.

**Trovato verificando l'architettura reale prima di scrivere codice**: il
routing di un ordine si genera lazy in **due** punti, non uno — la
transizione automatica a produzione (`WorkflowSync.transition`, patch 042)
e l'apertura a mano del Pannello Produzione (`GestioneOrdini.openProductionPanel`,
patch 052), entrambi verificati con `grep` sull'unica chiamata precedente a
`InglyOperazioni.costruisciDaOrdine`. Le due patch ora chiamano la stessa
`routingDaOrdine` invece di duplicare la logica ciascuna per conto proprio —
la stessa classe di difetto di CRM-05b (due letture della stessa cosa che
divergono alla prima modifica fatta su una sola), evitata mettendo la
decisione in un solo posto (`product-bom-store.js`).

**Non ancora fatto, apposta**: il fabbisogno materiali reale
(`espandiMateriali` → `material-requirement.js`) e l'aggregazione di costo
multi-tecnologia restano per il rilascio successivo — un cambio al routing
(nessun numero economico) è un rischio diverso da uno al costo, su un
motore con una storia documentata di difetti critici sui totali.

**Test**: `tests/qa/bom-routing-ordine.mjs` (12, browser reale) — routing
multi-tecnologia da distinta su transizione di stato, non ricostruito su una
transizione successiva, nessuna regressione su un ordine senza distinta,
stesso routing dal Pannello Produzione aperto a mano, persistenza dopo un
ricaricamento vero.

**Verificato**: 265 file sintassi, 2191/2191 unit, 89/89 suite browser QA,
0 errori JS, nessuna regressione.

## 1.6.0 — Multi-Tech BOM, rilascio 2: UI dal catalogo

**Nuove funzionalità**
- Pulsante «🧬 Distinta base» sulla card prodotto del Catalogo
  (`Catalog.openBOM`): pannello a parte (non nel modale di modifica
  prodotto, già grande e delicato) per dichiarare materiali — collegati a
  un vero articolo di magazzino, mai testo libero — e operazioni
  multi-tecnologia con avviamento e tempo per pezzo separati. Salvare crea
  sempre una nuova versione; le versioni precedenti restano nel registro.

**Difetto trovato e corretto scrivendo il pannello**: le righe bozza usano
il nome di campo che `InglyProductBOM.valida`/`crea` si aspettano
(`quantity`), le righe già salvate portano quello che `crea()` congela
(`quantityPerPiece`) — senza riallinearli al caricamento di una distinta
esistente, ogni salvataggio dopo il primo falliva la validazione in
silenzio (l'utente vedeva un errore, ma non capiva perché una distinta già
salvata non si potesse più modificare). Riallineato in un solo punto.

**Test**: `tests/qa/distinta-base-prodotto.mjs` (15, browser reale).

**Verificato**: 265 file sintassi, 2191/2191 unit, 88/88 suite browser QA,
0 errori JS, nessuna regressione.

## 1.5.0 — Multi-Tech BOM, rilascio 1: dominio e persistenza

Primo rilascio del verticale Multi-Tech (Product → BOM → Routing → Cost
Engine), scomposto in blocchi utilizzabili — vedi `docs/MULTI-TECH-BOM.md`.

**Nuove funzionalità**
- `src/product/product-bom.js` (`InglyProductBOM`) + `product-bom-store.js`:
  distinta base di prodotto (materiali + operazioni), riusabile da un ordine
  all'altro — oggi il catalogo dichiara una tecnologia e un materiale soli
  per prodotto. Espande le proprie righe nella forma che
  `material-requirement.js` e `InglyOperazioni` sanno già leggere, senza
  ricalcolare né duplicare i loro conti. L'anatomia avviamento/tempo-per-
  pezzo sulle operazioni impedisce di moltiplicare un avviamento per la
  quantità dell'ordine (verificato a 100 pezzi contro 1 nei test).
- Store IDB `product_bom` (v34, migrazione additiva).

**Non ancora fatto, apposta**: nessuna UI, nessun collegamento a un ordine
reale — dominio e persistenza prima del pulsante, come per Manutenzione.

**Test**: `tests/product-bom.test.mjs` (24 unit).

**Verificato**: 265 file sintassi, 2191/2191 unit, nessuna regressione.

## 1.4.0 — Qualità: uno scarto diventa una decisione

**Nuove funzionalità**
- `src/product/quality-ncr.js` (`InglyQualityNCR`) + `quality-ncr-store.js`:
  registro delle non conformità (rilavorazione/scarto/accettato con
  deroga/reso al fornitore), collegato al routing di produzione
  (`InglyOperazioni`, già esistente e testato) senza ricalcolarne i numeri.
  Una non conformità nasce sempre aperta e non si propone mai senza uno
  scarto o un rifacimento **con un motivo dichiarato**.
- Il Pannello Produzione di un ordine (⚙️ in Gestione Ordini) mostra ora il
  routing dell'ordine — prima invisibile ovunque tranne un badge «2/3» in
  lista — con un modulo per registrare buoni/scarti/rifacimenti per
  operazione, e le non conformità aperte con chiusura per disposizione.

**Trovato**: `InglyOperazioni` (buoni/scarti/rifacimenti, stato routing,
resa/coerenza) esisteva completo e testato dalla Fase precedente ma non
aveva **nessuna** superficie di inserimento dati — solo tre consumatori
in lettura (redditività macchina, fabbisogno materiali, repository) e un
badge di avanzamento. Verificato sull'architettura reale prima di
concludere alcunché, come richiesto: non un modulo mancante, un modulo
senza UI.

**Verificato**: 263 file sintassi, 2167/2167 unit, 87/87 suite browser QA,
0 errori JS, nessuna regressione.

## 1.3.1 — CRM: un'altra superficie della classe CRM-05b

Continuando la ricerca sistematica di "identità cliente risolta per nome"
avviata con CRM-04/05b, iniziata durante l'indagine sul verticale
Procurement (vedi 1.3.0, `AutoInvoicePDF`).

**Difetti corretti**
- `Clients.openModal` (pannello «📊 Statistiche Cliente» nella scheda di
  modifica): filtrava le vendite con `s.clientId===id||(cl&&s.clientName===cl.name)`
  — il ripiego sul nome si sommava al filtro per id invece di sostituirlo
  solo quando l'id manca. Una vendita di un cliente **omonimo** (clientId
  diverso, stesso nome) entrava comunque nel conteggio di acquisti, spesa
  totale e scontrino medio. Corretto a sommare il nome solo quando
  `clientId` è assente. `tests/qa/statistiche-cliente-omonimi.mjs` (rosso
  confermato prima del fix).

**Trovato, documentato, non corretto in questo giro**
- Il modulo «CRM Pro» del pacchetto Prox (`healthScore`/`buildCRMPro`,
  `App.navigate('prox-crm')`) ha lo stesso schema di filtro, ma la causa è
  più profonda: il modulo «Nuovo Ordine» del Prox non cattura mai un
  `clientId` reale (scrive lo stesso testo libero sia in `client` sia in
  `clientName`) — un fix onesto richiede un vero selettore cliente su quel
  form, non solo correggere la lettura. Tracciato in `docs/CRM-ROADMAP.md`.

**Verificato**: 261 file sintassi, 2143/2143 unit, 86/86 suite browser QA,
0 errori JS, nessuna regressione.

## 1.3.0 — Procurement: ordine d'acquisto reale

**Nuove funzionalità**
- `src/product/purchase-order.js` (`InglyPurchaseOrder`) + `purchase-order-store.js`:
  ordine d'acquisto, dal suggerimento di riordino (`InglyRiordino`) al
  ricevimento. Il ricevimento passa i movimenti a `InglyInventory.registra`
  (mai una seconda scrittura di giacenza) e ricalcola le statistiche del
  fornitore dagli ordini realmente ricevuti.
- `SuppliersManager` (Gestione Fornitori): barra di tab reale
  («Lista mia»/«Scopri fornitori»/«Confronta»), modulo «🛒 Ordine» che crea un
  ordine vero sul fornitore IDB mostrato in lista, registro ordini
  («📦 Ordini», prima uno stub) con ricevimento e annullamento, tab
  «📊 Confronta» con punteggio fornitore da ordini ricevuti — mai un prezzo
  di mercato inventato.

**Difetti corretti**
- Le KPI «Ordini in Attesa» / «⚠️ In Ritardo» leggevano lo store IDB
  `supplier_orders`, dichiarato dalla v18 e mai scritto da nessuna funzione:
  sempre a zero, su ogni installazione. Ora scritte da un ordine vero.
- `SuppliersManager._renderConfronta` era chiamata (`this._tab==='confronta'`)
  ma mai definita — un crash reale, mai osservato perché nessun pulsante
  impostava mai quel tab (l'header non aveva una barra di schede). La stessa
  assenza rendeva irraggiungibile anche «Scopri Fornitori», una vista
  completa e funzionante.
- `SuppliersManager.openOrders()` era un `toast('...in arrivo')` dichiarato.
- Il pulsante «🛒 Ordine» chiamava `SupplierIntelligence`, che tiene i
  fornitori in un `localStorage` diverso da quello che la lista mostra (IDB
  `suppliers`) — stessa classe di CRM-05b su un'entità diversa: un id
  coincidente per caso poteva registrare l'ordine sul fornitore sbagliato, o
  aprire silenziosamente «nuovo fornitore» e creare un record fantasma con
  lo stesso id in un'altra memoria.

**Trovato, documentato, non corretto in questo giro**
- Unificare `SupplierIntelligence` (localStorage) e IDB `suppliers` in
  un'unica identità fornitore — lo stesso lavoro che CRM-04 ha fatto per i
  clienti, su un'altra entità. Tracciato in `docs/PROCUREMENT.md`.

**Test**
- `tests/purchase-order.test.mjs` (33 unit)
- `tests/qa/ordine-fornitore.mjs` (22, browser reale)

**Verificato**: 261 file sintassi, 2143/2143 unit, 85/85 suite browser QA,
0 errori JS, nessuna regressione.

## 1.2.0 — CRM Customer 360 (CRM-15 storico economico + CRM-17 timeline)

**Nuove funzionalità**
- `src/product/customer-360.js` (`InglyCustomer360`): storico economico per
  cliente su quattro finestre (30gg/90gg/anno/tutto) e timeline unificata
  (creazione cliente, preventivi con stato derivato, ordini, legame
  preventivo→ordine). Consuma `InglyOrderEconomics`/`InglyQuoteStatus`/
  `InglyCLV` — non ricalcola ricavo, costo, margine o valore cliente.
- Il pannello «Profilo cliente completo» mostra i nuovi KPI (fatturato,
  margine, tasso di conversione, valore medio ordine, storico economico,
  CLV, timeline), con N/D e motivo quando un dato non è calcolabile — mai
  un numero inventato.

**Sicurezza**
- Aggiunto `esc()` al pannello «Profilo cliente completo»: componeva l'HTML
  del popup interpolando nome/azienda/note/prodotto senza escaping —
  eseguibile da un cliente con markup nel nome (import CSV/VCF).

**Trovato, documentato, non corretto in questo giro**
- `CommHistory` (`lb2b_comm_hist_v1`, storico comunicazioni del CRM) è
  indicizzato per nome cliente, non per `clientId` — stessa classe di CRM-05b,
  su una superficie scritta dal calcolatore Laser B2B che non ha quasi mai un
  `clientId` risolto. Tracciato in `docs/CRM-ROADMAP.md`.

**Test**
- `tests/customer-360.test.mjs` (27 unit, incluso l'isolamento per clientId
  fra due clienti omonimi)
- `tests/qa/crm-customer-360.mjs` (10, browser reale)

**Verificato**: 259 file sintassi, 2110/2110 unit, 84/84 suite browser QA,
0 errori JS, nessuna regressione (un fallimento intermittente in
`apparel-scaglioni-consuntivo.mjs` root-causato come lo stesso flake
pre-esistente di `quoter3d-calcoli.mjs`, non una regressione — vedi
`docs/RELEASE-ACCOUNT-SUBSCRIPTION.md`).

## 1.1.0 → 1.2.0 (intermedio, stesso giorno) — Maintenance (§17)

- `src/product/machine-maintenance.js` (`InglyMachineMaintenance`): storico
  interventi (preventiva/correttiva/ispezione), calcolo usura/scadenza con
  confidence esplicita, tariffa macchina effettiva collegata a
  `InglyMachineRate` senza contaminare l'ammortamento.
- Integrato nella scheda macchina esistente (`MachineCard`, tab
  «Manutenzione»): card di stato, form di inserimento, allerta anche
  nell'elenco macchine.
- `tests/machine-maintenance.test.mjs` (26 unit), `tests/qa/manutenzione-macchina.mjs`
  (10, browser reale).

## 1.1.0 — CRM-05b + seguito SEC-009

- `ClientProfile.open` risolveva il cliente per nome e mostrava fatturato/
  ordini/preventivi di un altro cliente con lo stesso nome. Corretto a
  risoluzione per `clientId`.
- `InglyBilling.subscribe` e la barra di stato «INGLY v35» leggevano campi
  di sessione mai esistiti (`s.username`, `session.plan`, `.expiresAt`) —
  stessa classe SEC-009, fuori dal Cloud Sync. Corretti con gli accessor
  canonici (`InglyIdentita.idUtente`/`emailSessione`).
- Chiuso il cambio account (A→B→A, stesso browser, dati non mischiati),
  gap lasciato esplicitamente aperto nella release precedente.

Release precedenti a questa non hanno un changelog strutturato: la storia
di quel lavoro è nei documenti `docs/RELEASE-*.md` e `docs/SEC-*.md`.
