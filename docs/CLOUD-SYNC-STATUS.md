# Cloud Sync — stato reale, non teorico

Questo documento esiste perché il mandato che ha prodotto la release 1.1.0
chiedeva esplicitamente di non dichiarare "PASS" un Cloud Sync mai verificato
contro un backend vero, e di distinguere ciò che è stato implementato e
verificato da ciò che è bloccato da una dipendenza esterna che non esiste in
questo ambiente. Questo è quel confine, tracciato con onestà.

## 1. Che cosa è Cloud Sync oggi, davvero

Non un motore di sincronizzazione bidirezionale con coda offline, retry e
risoluzione dei conflitti. È tre pezzi separati, tutti opzionali, tutti
disattivati finché qualcuno non configura esplicitamente URL e anon key di
un progetto Supabase (Impostazioni → Cloud Sync, sia sul prodotto che
sull'Admin — devono puntare allo stesso progetto):

1. **`InglyCloud`** (`117-...js`, punto 4) — letture/scritture dirette su
   `ingly_users` via REST. Usato da login (fallback cloud→locale) e da
   registrazione (upsert dopo la creazione locale, senza password).
2. **`InglySaaSPlatform`** — un canale realtime (WebSocket) sulla riga
   dell'utente corrente più un polling di ripiego ogni 30s, per accorgersi
   se piano o stato sono cambiati altrove.
3. **`SingleDeviceEnforcement`** — una **terza**, separata implementazione
   del limite a una postazione, con una propria tabella (`ingly_sessions`).
   Duplica `InglyDispositivi` (il sistema canonico, verificato in questa
   stessa release con due schede vere). **Dormiente e non riparata**: vedi
   §7.

Non esiste una coda di scrittura offline. Un `fetch` che fallisce (rete
assente) fallisce con un `.catch(function(){})` silenzioso: la modifica non
viene ritentata. Questo documento non lo nasconde né lo finge risolto.

## 2. Che cosa ho trovato e corretto in questa release — verificato

Lo stesso bug, nello stesso file, in cinque punti: un modulo leggeva un
campo di sessione con un nome che la sessione non ha mai avuto
(`InglyIdentita.creaSessione` produce solo `user_id`, `email`, `tenant_id`,
`device_id`, non `userId`, `id`, `username`, `passwordHash`).

| Punto | Leggeva | Effetto | Stato |
| --- | --- | --- | --- |
| `handleCmd` (comandi Admin→Prodotto) | `s.userId`/`s.id` | force logout, suspend, ban, rinnovo, cambio piano: ricevuti e scartati | **Corretto e verificato**: `tests/qa/admin-force-logout.mjs`, click reale, sessione chiusa davvero |
| Filtro canale realtime | `session.userId` | sottoscrizione a `id=eq.undefined`, non riceve mai l'evento giusto | Corretto, **non verificabile** senza un progetto Supabase reale (§4) |
| `applyCloudUpdate` (password cambiata da remoto) | `s.passwordHash` (che la sessione non ha mai avuto per progetto) | quel ramo non scattava mai | Corretto, **non verificabile** senza backend reale |
| `startPollingFallback` | `session.username` (la sessione ha solo `.email`) | cercava sempre l'utente letterale `"undefined"` | Corretto, **non verificabile** senza backend reale |
| `startRealtimeSync` chiamato due volte (login + «già connesso» al caricamento) senza chiudere il precedente | — | WebSocket e timer di polling duplicati, mai chiusi | Corretto (`stopSync()` idempotente prima di aprire), **non verificabile** senza backend reale |

Ho aggiunto un accessor canonico (`InglyIdentita.idUtente/emailSessione/
tenantId/deviceId`) perché il difetto non era in un punto: era il pattern
di ogni modulo che rileggeva la sessione a modo suo. 5 nuovi test unitari
in `tests/auth-identita.test.mjs` verificano gli accessor stessi — non il
comportamento di rete, che con un accessor scorretto sarebbe comunque
rotto allo stesso modo.

## 3. Perché "non verificabile" non è una scusa, è un fatto

Verificare che il canale realtime riceva davvero un evento richiede un
progetto Supabase raggiungibile, con le tabelle giuste e RLS configurata.
Questo ambiente:

- non ha credenziali per nessun progetto Supabase reale;
- ha bloccato, correttamente, anche un tentativo di lettura minima verso
  l'unico progetto che era mai stato coinvolto (l'incidente SEC-005) —
  non lo amministro, e non dovrei poterlo interrogare;
- non deve creare un progetto Supabase demo per "far vedere che funziona":
  sarebbe esattamente il mock che il mandato vieta esplicitamente.

Quindi: i cinque fix sopra sono corretti per lettura del codice — stessa
sessione, stesso campo che `creaSessione` dichiara, stessa logica già
provata nella parte attiva-per-default (`handleCmd`, verificata con un
click reale). Non ho una prova end-to-end del canale realtime perché non
esiste un canale reale a cui collegarmi. Dichiararlo "PASS" sarebbe falso.

## 4. Che cosa serve per portare questo a "verificato davvero"

1. Un progetto Supabase reale, con le policy RLS di
   `docs/sql/rls-ingly-cloud-lockdown.sql` **adattate** (quel file chiude
   l'accesso anonimo diretto — il prossimo passo, se si vuole un Cloud Sync
   sicuro, è un'Edge Function con la service-role key lato server, non
   riportare l'anon key ad avere accesso diretto alle tabelle utente).
2. URL e anon key di quel progetto, configurati da chi gestisce
   l'installazione (Impostazioni → Cloud Sync), mai scritti nel sorgente.
3. Con quello, i test in `tests/qa/` di questa release possono essere
   estesi con un vero test end-to-end del canale realtime — struttura
   pronta (`startRealtimeSync`/`stopSync`/`applyCloudUpdate` sono ora
   corrette e idempotenti), manca solo un backend reale contro cui
   lanciarli.

## 5. Sync queue, retry/backoff, conflict resolution — non esistono

Il mandato chiedeva di verificarli. La verifica onesta è: **non c'è niente
da verificare, perché non sono mai stati costruiti** per i dati di
account/sessione (esistono, con un disegno diverso, per il magazzino e il
consuntivo — vedi `docs/SUPABASE-READINESS.md`). Costruire una coda di
scrittura offline con retry, backoff e deduplicazione per l'account è
un intervento di architettura nuovo, non una correzione di bug: richiede
decidere una policy di conflitto (l'ultimo che scrive vince? un campo di
versione? un merge per-campo?) che questo mandato non specifica e che
nessun dato reale ha ancora mai esercitato. Costruirlo ora, senza un
backend contro cui provarlo, produrrebbe esattamente il codice teorico e
non verificato che il mandato vieta di dichiarare pronto.

## 6. Tenant isolation

Verificata dove è verificabile senza un backend: **nel codice locale**, ogni
lettura/scrittura di `InglyAccount`/`InglyGuardia`/`InglyDispositivi` passa
per `tenant_id`, ed è quello che `tests/amministrazione.test.mjs` e
`tests/audit-sicurezza.test.mjs` (regola "l'amministrazione non accetta un
tenant_id da fuori") bloccano da tempo. **Non verificata sulla rete**: se
RLS sul progetto Supabase reale fosse aperta (l'incidente SEC-005 lo
suggeriva), nessun filtro lato client la sostituirebbe — è esattamente il
punto di `docs/SEC-005-SUPABASE-RLS-INCIDENT.md`.

## 7. SingleDeviceEnforcement: perché resta rotto

È una terza, duplicata implementazione dello stesso limite a una postazione
che `InglyDispositivi` già applica correttamente (verificato con due schede
vere in questa release). Anche lei aveva lo stesso mismatch di campo
(`registerSession(s.userId, s.username, ...)`), quindi è altrettanto rotta.
Non l'ho riparata: farlo vorrebbe dire far rivivere una seconda verità sul
device, esattamente ciò che il mandato vieta ("impedire che esistano
contemporaneamente due verità... device"). Va **ritirata**, quando si
deciderà come consolidare il Cloud Sync su un solo sistema — non riparata
per farla sembrare una seconda opzione valida.

## 8. Sintesi onesta

| Area | Stato |
| --- | --- |
| Comandi Admin→Prodotto (force logout e gli altri cinque) | **PASS, verificato con browser reale** |
| Accessor canonici di sessione | **PASS, verificato con unit test** |
| Canale realtime (filtro, apply update, dedup subscribe) | **Corretto nel codice, non verificabile senza backend reale** |
| Polling di ripiego | **Corretto nel codice, non verificabile senza backend reale** |
| `InglyBilling.subscribe` (client_reference_id/prefilled_email verso Stripe) | **PASS, corretto — attivo per default, non dietro Cloud Sync** |
| Barra di stato `injectStatusBar` (piano/scadenza/nome) | **PASS, corretto — riusa `SaaSGate._aggiornaPiano`, non duplica logica** |
| Cambio account (A→B→A, stesso browser, dati non mischiati) | **PASS, verificato con `tests/qa/cambio-account.mjs`, 11/11** |
| Sync queue / retry / backoff / conflict resolution | **Non esistono — intervento di architettura, non un bug** |
| Tenant isolation lato client | **PASS, verificato da test esistenti** |
| Tenant isolation lato RLS reale | **BLOCKED — richiede accesso a un progetto Supabase reale** |
| SingleDeviceEnforcement (terzo sistema device) | **Duplicato, dormiente, non riparato — da ritirare** |

## 9. Staging reale — cercato, trovato l'URL, bloccato sulla chiave

Il mandato più recente nomina esplicitamente un progetto Supabase di
staging autorizzato: **«INGLY OS V2 STAGING», ref `uepyexyosyogyvzorata`**,
vietando di toccare la produzione («Ingly 91»), `Pusatingly`, o progetti
vecchi hardcoded, e vietando di inventare credenziali o costruire un mock.

L'URL `https://uepyexyosyogyvzorata.supabase.co` è stato trovato, coerente
con il ref indicato, in un file `env.example.js` di un repository adiacente
a questo — chiaramente un template d'esempio, non un file di configurazione
reale. **La anon/publishable key non è presente in nessun punto di questo
ambiente**: nello stesso file è un segnaposto non compilato
(`<INCOLLA_QUI_LA_PUBLISHABLE_ANON_KEY>`), e non esiste altrove.

Senza quella chiave, **zero richieste autenticate verso Supabase sono
possibili**: niente lettura schema, niente canale realtime, niente test RLS
reale. Il mandato vieta esplicitamente di sostituire una configurazione
esterna mancante con un mock — quindi la sezione 4 sopra resta il percorso
corretto: chi amministra il progetto di staging deve incollare quella
anon key in Impostazioni → Cloud Sync (mai nel sorgente). Fino ad allora,
ogni riga della tabella al §8 marcata «non verificabile senza backend
reale» resta esattamente in quello stato — non declassata a mock, non
promossa a PASS senza prova.
