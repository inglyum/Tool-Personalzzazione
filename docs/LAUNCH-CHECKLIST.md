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

## Da fare prima di incassare davvero (POST-LAUNCH)

- [ ] **Supabase Auth come autorità.** Oggi la verifica è locale: protegge
      l'archivio, non il confronto. È il prossimo passo, non un dettaglio.
- [ ] **RLS su ogni tabella**, con `tenant_id`. Oggi l'isolamento fra workspace
      è strutturale (ogni record porta il suo `tenant_id`) ma non c'è un server
      che lo imponga.
- [ ] **Webhook del provider di pagamento.** Senza, l'attivazione dopo il
      pagamento resta manuale — e va bene per un lancio, non per la scala.
- [ ] **Recupero password via email.** Oggi rimanda a un indirizzo di
      assistenza, e lo dice invece di fingere che una mail sia partita.
- [ ] **Verifica dell'indirizzo email.** Lo stato `pending_verification` esiste
      e blocca l'accesso; manca chi lo imposta.
- [ ] Termini di servizio e informativa privacy: i punti di aggancio ci sono,
      i testi legali no e non vanno inventati.
