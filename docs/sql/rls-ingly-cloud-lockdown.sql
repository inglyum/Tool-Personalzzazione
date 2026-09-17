-- ═══════════════════════════════════════════════════════════════════════
-- RLS LOCKDOWN — ingly_users / ingly_sessions / ingly_commands
-- ═══════════════════════════════════════════════════════════════════════
--
-- Perché questo file esiste
-- --------------------------------------------------------------------------
-- Il codice sorgente (src/legacy/patches/117-ingly-smart-search-engine-v33.js
-- e src/admin/legacy/patches/003-engine-enterprise-database-demo-data.js)
-- aveva un progetto Supabase e una anon key scritti come DEFAULT — quindi
-- presenti in ogni copia distribuita di INGLY-OS.html e INGLY-CLOUD-ADMIN.html
-- — usati da login, registrazione e amministrazione senza che nessuna
-- installazione li avesse configurati. Il commento che accompagnava la
-- registrazione diceva letteralmente «RLS aperta».
--
-- Un anon key è pubblico per definizione: quello che lo rende sicuro è la
-- Row Level Security sulle tabelle, non la segretezza della chiave. Se RLS
-- è davvero aperta (o assente) su queste tre tabelle, chiunque abbia mai
-- aperto una copia di questi file può leggere e scrivere in chiaro le righe
-- di TUTTI i laboratori: email, hash password, piano, stato, scadenza — e
-- scrivere direttamente uno stato "pagato" o un piano più alto, esattamente
-- il bypass del pagamento che questo intervento doveva impedire, ma lato
-- cloud invece che nel solo browser.
--
-- Che cosa fa questo script
-- --------------------------------------------------------------------------
-- Chiude l'accesso anonimo diretto a queste tre tabelle. Non prova a scrivere
-- una policy "ognuno vede solo le proprie righe": con la sola anon key,
-- senza una vera sessione Supabase Auth, il database non ha modo di sapere
-- CHI stia chiedendo — auth.uid() è NULL per ogni richiesta anonima. Una
-- policy che sembra restringere l'accesso ma si basa su un valore che il
-- client stesso fornisce (per esempio un id nella query) non protegge
-- niente: il client può mettere qualsiasi id.
--
-- La sola postura onesta con il solo anon key è: NESSUN accesso diretto.
-- Le operazioni privilegiate (creare un utente, verificare una password,
-- aggiornare un piano, forzare un logout) devono passare da una Supabase
-- Edge Function che usa la service-role key SUL SERVER e applica lì i
-- controlli — mai dal browser con l'anon key. Finché quella Edge Function
-- non esiste, il Cloud Sync di INGLY OS resta correttamente disattivato
-- (opt-in, senza default) lato client: questo script chiude il lato server.
--
-- Come si esegue
-- --------------------------------------------------------------------------
-- Supabase Dashboard → SQL Editor → incolla questo file → Run.
-- Va eseguito su OGNI progetto Supabase che sia mai stato usato come
-- default in una copia di questi file (vedi i due URL nel commento
-- SEC-005 nei file sorgente sopra citati).
--
-- Prima di eseguirlo, se si sospetta che i dati siano già stati letti o
-- alterati da terzi: ruotare/rigenerare l'anon key del progetto da
-- Project Settings → API, e verificare `ingly_users`/`ingly_sessions` per
-- righe non riconosciute o campi modificati rispetto all'ultimo controllo
-- noto.
-- ═══════════════════════════════════════════════════════════════════════

begin;

alter table if exists public.ingly_users     enable row level security;
alter table if exists public.ingly_sessions  enable row level security;
alter table if exists public.ingly_commands  enable row level security;

-- Toglie qualunque policy permissiva pre-esistente (nome variabile secondo
-- come è stato configurato il progetto: questa riga elenca, non assume).
do $$
declare
  pol record;
begin
  for pol in
    select schemaname, tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and tablename in ('ingly_users', 'ingly_sessions', 'ingly_commands')
  loop
    execute format('drop policy if exists %I on %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  end loop;
end $$;

-- Nessuna policy per anon/authenticated = nessun accesso, con RLS abilitata.
-- (revoca esplicita, in caso i grant di default di Supabase permettano
-- ancora qualcosa a livello di ruolo prima che RLS venga valutata)
revoke all on public.ingly_users    from anon, authenticated;
revoke all on public.ingly_sessions from anon, authenticated;
revoke all on public.ingly_commands from anon, authenticated;

-- Il service_role bypassa RLS per definizione in Supabase: resta l'unico
-- modo di leggere/scrivere queste tabelle, e vive solo in una Edge Function
-- o in un backend server-side — mai nel browser.

commit;

-- Verifica dopo l'esecuzione (deve restituire 0 righe per ognuna, dal
-- client con anon key):
--   select count(*) from ingly_users;
--   select count(*) from ingly_sessions;
--   select count(*) from ingly_commands;
-- Un 401/403 o un array vuoto è il risultato corretto. Righe restituite
-- significa che la lockdown non ha preso — verificare che RLS sia
-- effettivamente "Enabled" nella tab Authentication → Policies per ognuna
-- delle tre tabelle.
