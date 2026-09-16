# Autenticazione — che cos'era, che cos'è

## Che cos'era, misurato

| | |
| --- | --- |
| `owner / standalone` | scritto nel sorgente, `modules:['*']`, `plan:'enterprise'`, `status:'lifetime'`, riscritto a **ogni avvio** |
| `user.passwordHash !== password` | il campo si chiamava hash e conteneva la password, in chiaro |
| `sbUpsert(u)` in registrazione | la password in chiaro finiva anche sul cloud |
| sessione | conteneva `plan`, `modules`, `expiresAt` e `passwordHash` |
| `isExpired(session)` | senza `expiresAt` restituiva `false`: non scadeva mai |
| `userCanAccess()` | senza `modules` restituiva `true`: poteva tutto |
| due `login()` | due percorsi, entrambi col confronto in chiaro |

Sette problemi, non uno.

## Che cos'è

**PBKDF2-SHA256, 210 000 iterazioni, sale di 16 byte per utente, confronto a
tempo costante.** Il formato porta con sé i propri parametri
(`pbkdf2$<iter>$<sale>$<chiave>`), così il giorno in cui le iterazioni
saliranno le password vecchie continueranno a verificarsi.

Una password in chiaro rimasta da prima **non viene accettata**: accettarla
terrebbe in vita il difetto. L'utente la reimposta.

La risposta a «utente inesistente» e a «password sbagliata» è la stessa, e nel
primo caso si verifica comunque un hash finto: rispondere subito direbbe la
stessa cosa attraverso il tempo di risposta.

## Che cosa non è

**Non è autenticazione sicura, e non può esserlo.** Chi controlla il browser
controlla il confronto. Questo strato serve a due cose oneste:

1. che l'archivio locale non contenga password leggibili;
2. che il codice sia già nella forma giusta quando Supabase Auth diventerà
   l'autorità — allora `verifica()` chiamerà il server e il resto
   dell'applicazione non cambierà.

## Il seed di sviluppo

Esiste ancora, perché sviluppare e collaudare senza account è scomodo. Ma:

- parte solo con `localStorage.setItem('ingly_dev_seed','1')`;
- la password è **generata a caso** alla prima esecuzione e mostrata una volta;
- rifiuta di partire se l'archivio contiene già utenti veri.

## La sessione

Porta `user_id`, `email`, `nome`, `tenant_id`, `ruolo`, `emessa`, `scade`,
`modalita`. Non porta il piano, i moduli, la password né il suo hash. Una
sessione che contenga un diritto viene **rifiutata come manomessa**.

Durata 12 ore, 30 giorni con «resta connesso». Sempre una fine.

## Stati dell'account

`active` · `pending_verification` · `suspended` · `banned` · `deleted`.
Ognuno con un messaggio per l'utente, senza dettagli tecnici.

---

# Aggiornamento — la guardia e le postazioni

`InglyGuardia` (`src/product/auth-guard.js`) è adesso l'unico posto in cui si
risponde a «questa persona può stare qui?». Prima quella domanda si faceva in
punti diversi con risposte diverse; tre di quei punti erano rotti e non se ne
era accorto nessuno:

- il **monitor di sessione** leggeva `session.userId` — campo che non esiste
  più — quindi non trovava mai l'utente e non controllava niente; e quando
  trovava qualcosa scriveva `plan` e `modules` **dentro** la sessione, che con
  la validazione nuova è una sessione manomessa: il monitor avrebbe fatto
  uscire l'utente da solo;
- i comandi `plan_change` e `license_renewal` dell'amministratore facevano la
  stessa cosa;
- `checkExport` leggeva `s.status` e `s.expiresAt`, campi che la sessione non
  porta più: rispondeva sempre di sì. Un guardiano che dice sempre di sì non è
  un guardiano.

Tutti e tre passano ora da `InglyGuardia`. Il dettaglio completo del ciclo di
vita, delle tre azioni (`entra` / `esci` / `blocco`) e della policy a una
postazione sta in `ACCOUNT-LIFECYCLE.md`.
