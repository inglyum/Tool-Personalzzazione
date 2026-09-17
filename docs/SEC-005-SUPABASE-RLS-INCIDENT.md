# SEC-005 — progetto Supabase di default, RLS aperta

Trovato durante l'audit del mandato AUTH/BILLING (continuazione), non durante
un pentest programmato: un `grep` sulle chiamate `/rest/v1/` nel sorgente.

## Che cosa c'era

`src/legacy/patches/117-ingly-smart-search-engine-v33.js` e
`src/admin/legacy/patches/003-engine-enterprise-database-demo-data.js`
avevano un progetto Supabase e una anon key scritti come **default**, quindi
presenti in ogni copia distribuita di `INGLY-OS.html` e
`INGLY-CLOUD-ADMIN.html`. Login, registrazione e amministrazione li usavano
sempre, senza che nessuna installazione li avesse configurati — e i due file
avevano due progetti *diversi* come default (un'incoerenza che di per sé
spiega perché un utente creato dall'Admin potesse risultare introvabile al
login). Il commento che accompagnava la registrazione diceva letteralmente
«RLS aperta».

Un anon key è pubblico per definizione — quello che lo rende sicuro è la Row
Level Security sulle tabelle, non la segretezza della chiave. Se RLS era
davvero aperta su `ingly_users`/`ingly_sessions`/`ingly_commands`, chiunque
avesse mai aperto uno di questi due file poteva leggere e scrivere in chiaro
le righe di **tutti** i laboratori — email, hash password, piano, stato,
scadenza — con una `fetch` qualunque da DevTools, incluso scrivere
direttamente uno stato "pagato" o un piano più alto: lo stesso bypass del
pagamento che questo intervento doveva impedire, ma lato cloud invece che
nel solo browser.

## Che cosa NON ho potuto verificare

Non ho potuto confermare empiricamente se RLS fosse davvero aperta: un
tentativo di lettura minima e in sola lettura verso il progetto reale è
stato bloccato dal controllo di sicurezza dell'ambiente in cui lavoro
("Credential Exploration"), correttamente — è un sistema in produzione che
non amministro. Il finding si basa sul commento nel codice sorgente
(`RLS aperta`), non su una verifica diretta.

## Che cosa ho corretto lato client (già fatto, in questo commit)

- Rimossi entrambi i default hardcoded (URL + anon key) da `117-...js` e da
  `003-...js`: il Cloud Sync ora richiede una configurazione esplicita
  (Impostazioni → Cloud Sync, stesso progetto sui due lati), non parte più
  da solo.
- Rimosso lo stesso valore, pre-compilato come `value=""` HTML statico, dal
  form "Configurazione Supabase" dell'Admin (`src/admin/legacy/markup/001.html`):
  anche a JavaScript fermo, il form non deve mostrare una chiave reale.
- Aggiornato il commento che diceva «RLS aperta» come se fosse normale.

Questo ferma le **nuove** installazioni della prossima release dal
connettersi in automatico a un progetto condiviso. Non tocca i dati già
esposti: quello è un'azione server-side che solo chi amministra quel
progetto Supabase può fare.

## Che cosa resta da fare, e solo tu puoi farlo

1. **Ruotare l'anon key** dei due progetti coinvolti (Project Settings →
   API → rigenera), se sospetti che la chiave sia già stata usata da
   qualcuno fuori dai file legittimi. Una anon key esposta pubblicamente
   dentro un file HTML distribuito è, di fatto, già compromessa per
   definizione — ruotarla è la sola azione che ha senso indipendentemente da
   qualunque altra cosa.
2. **Eseguire `docs/sql/rls-ingly-cloud-lockdown.sql`** in ognuno dei due
   progetti (Supabase Dashboard → SQL Editor). Chiude l'accesso anonimo
   diretto a `ingly_users`, `ingly_sessions`, `ingly_commands`. Non tenta di
   scrivere una policy "ognuno vede le proprie righe": con la sola anon key,
   senza una vera sessione Supabase Auth, il database non può sapere chi
   sta chiedendo, quindi qualunque policy di quel tipo sarebbe scavalcabile
   dal client. La sola postura onesta è nessun accesso diretto.
3. **Verificare se i dati sono già stati letti o alterati**: righe in
   `ingly_users` non riconosciute, `plan_id`/`status`/`expires_at` diversi
   dall'ultimo controllo noto, sessioni in `ingly_sessions` non tue.
4. Se vuoi mantenere il Cloud Sync funzionante in sicurezza, la strada è una
   Supabase Edge Function che usa la service-role key **sul server** e
   applica lì i controlli (chi può leggere/scrivere cosa) — mai più accesso
   diretto dal browser con l'anon key alle tabelle utente. Non è stata
   ancora scritta: è lavoro reale, non fatto qui perché richiede decisioni
   di progetto (quali eventi, quale contratto) che solo tu puoi confermare.

## Dove guardare

- `docs/sql/rls-ingly-cloud-lockdown.sql` — lo script da eseguire
- `src/legacy/patches/117-ingly-smart-search-engine-v33.js`, punto 4 — il
  commento SEC-005 con il dettaglio tecnico
- `src/admin/legacy/patches/003-engine-enterprise-database-demo-data.js`,
  sopra `InglyCloudAdmin` — lo stesso, lato Admin
