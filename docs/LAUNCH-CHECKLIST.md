# Checklist di lancio

Stato al commit di release. Verde = verificato da un test o da una misura;
dove non lo è, il documento lo dice.

## Sicurezza — nessun blocker aperto

- [x] Nessuna credenziale scritta nel prodotto (verificato a runtime: 0 utenti seminati)
- [x] Nessuna password in chiaro in archivio né trasmessa al cloud
- [x] PBKDF2-SHA256, 210 000 iterazioni, sale per utente, confronto a tempo costante
- [x] La sessione non contiene diritti; una che li contiene viene rifiutata
- [x] Nessun fail-open: un dato mancante chiude
- [x] Un solo percorso di verifica della password (erano due)
- [x] Nessun ramo che assegna un piano in base allo username
- [x] Una funzione bloccata non parte nemmeno chiamandola direttamente

## Prodotto

- [x] Tre piani, sei prezzi, 28 funzioni dichiarative
- [x] «Risparmi 2 mesi» calcolato dai prezzi veri
- [x] Prova di 14 giorni, Premium completo, senza carta
- [x] Sei stati di abbonamento, calcolati dalle date
- [x] Limiti d'uso centralizzati (ordini/mese, utenti)
- [x] Blocco che spiega invece di nascondere
- [x] Listino, centro abbonamento, schermata di accesso
- [x] Responsive desktop/tablet/mobile, senza sbordamenti
- [x] Etichette sui campi, focus visibile, `aria-live` sugli errori, `prefers-reduced-motion`
- [x] Nessuna emoji come elemento strutturale

## ERP/MES — nessuna regressione

- [x] Ordini, preventivi, vendite, CRM, Smart Quoter, 3D, laser, UV, DTF, tessile, misti
- [x] Produzione, operazioni, macchine, materiali, fabbisogno, magazzino
- [x] Costi reali, scostamenti, marginalità, pagamenti, audit

## Account, postazioni, abbonamento — il ciclo completo

Il dettaglio sta in `ACCOUNT-LIFECYCLE.md`; qui c'è solo che cosa è verificato.

- [x] Registrazione atomica: si costruisce tutto in memoria e si scrive **una
      volta sola**, quindi un errore non lascia account a metà
- [x] Il pulsante «Crea account» arriva sempre a uno stato stabile — il difetto
      per cui restava su «Creazione in corso…» per sempre è chiuso e coperto da
      un test in browser
- [x] Doppio clic: non crea due account
- [x] Tre percorsi di creazione (primo avvio, registrazione, collega aggiunto
      dall'amministratore), **una sola** funzione che li esegue
- [x] Chi viene aggiunto entra nel workspace che esiste: niente secondo
      laboratorio, niente secondo abbonamento
- [x] Una guardia sola risponde a «questa persona può stare qui?», con tre
      esiti: entra, esci, blocco
- [x] Chi ha l'abbonamento scaduto viene bloccato ma **non** buttato fuori:
      deve poter rinnovare
- [x] Un abbonamento, una postazione. Il secondo dispositivo sceglie se
      subentrare invece di essere respinto
- [x] Una postazione senza notizie da 30 minuti non occupa più il posto
- [x] Uscita, cambio password, reimpostazione e sospensione chiudono le
      postazioni aperte
- [x] La password la cambia chi la possiede, dalla sezione Sicurezza
- [x] Ogni mutazione lascia una traccia in audit, senza segreti dentro
- [x] I diritti del piano sono applicati davvero su voci di menu e rotte
      (prima `session.modules` era `undefined` e non si bloccava niente)
- [x] Il piano mostrato sullo schermo è quello dell'abbonamento, in ogni punto
- [x] Nessun pagamento finto: due sole strade verso «attivo», e la seconda
      pretende un riferimento del fornitore
- [x] Gli eventi di fatturazione sono idempotenti: un rinnovo applicato due
      volte non regala un mese

## Da fare prima di incassare davvero (POST-LAUNCH)

- [ ] **Supabase Auth come autorità.** Oggi la verifica è locale: protegge
      l'archivio, non il confronto. È il prossimo passo, non un dettaglio.
- [ ] **RLS su ogni tabella**, con `tenant_id`. Oggi l'isolamento fra workspace
      è strutturale (ogni record porta il suo `tenant_id`) ma non c'è un server
      che lo imponga.
- [ ] **Webhook del provider di pagamento.** `InglyFatturazione.applica()`
      esiste, è idempotente ed è l'unico punto che può attivare un
      abbonamento; manca il backend che riceva le chiamate del fornitore.
      Finché non c'è, l'attivazione dopo il pagamento è un'operazione che
      qualcuno compie con i dati del fornitore in mano — va bene per un
      lancio, non per la scala.
- [ ] **Recupero password via email.** Oggi rimanda a un indirizzo di
      assistenza, e lo dice invece di fingere che una mail sia partita.
- [ ] **Verifica dell'indirizzo email.** Lo stato `pending_verification` esiste
      e blocca l'accesso; manca chi lo imposta.
- [ ] Termini di servizio e informativa privacy: i punti di aggancio ci sono,
      i testi legali no e non vanno inventati.
- [ ] **Applicazione vera della policy a una postazione.** L'identificativo del
      dispositivo nasce nel browser: chi vuole può cambiarlo. Tiene onesta la
      stragrande maggioranza degli utilizzi e rende visibile l'abuso, ma non è
      un DRM e non pretende di esserlo.
- [ ] **KPI di piattaforma** (account totali, prove attive, conversioni, MRR).
      Non sono stati costruiti perché non c'è niente da cui aggregarli: ogni
      installazione conosce solo se stessa. Vivranno nella console Cloud
      quando i dati saranno su un server.
