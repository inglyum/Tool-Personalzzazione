# Ciclo di vita dell'account

Questo documento descrive che cosa succede a un account INGLY OS dal momento
in cui qualcuno lo crea a quello in cui smette di poter entrare — e chi,
esattamente, decide ognuno di quei passaggi.

È la fonte di verità: se il codice fa una cosa diversa da quella scritta qui,
uno dei due è sbagliato, e si aggiusta prima il documento.

---

## 1. I moduli, e che cosa risponde ciascuno

| Modulo | File | Risponde a |
| --- | --- | --- |
| `InglyIdentita` | `src/product/auth-identity.js` | «questa password è quella giusta?» |
| `InglyAccount` | `src/product/account-service.js` | «come nasce, cambia stato e cambia password un account?» |
| `InglyDispositivi` | `src/product/device-sessions.js` | «da quante postazioni è aperto questo account?» |
| `InglyAbbonamento` | `src/product/subscription.js` | «in che stato è l'abbonamento, viste le date?» |
| `InglyEntitlements` | `src/product/entitlements.js` | «questa funzione è compresa?» |
| `InglyFatturazione` | `src/product/billing.js` | «dove si paga, e che cosa dice chi ha incassato?» |
| `InglyGuardia` | `src/product/auth-guard.js` | «questa persona può stare qui, adesso?» |

La regola che tiene insieme la tabella: **ogni domanda ha un solo posto in cui
si risponde.** Il difetto ricorrente di questo codice è sempre stato lo stesso —
N implementazioni della stessa cosa, e vince l'ultima che si carica.

---

## 2. Il percorso completo

```
REGISTRAZIONE → ACCOUNT → WORKSPACE → APPARTENENZA → ABBONAMENTO → POSTAZIONE → SESSIONE
     ↓
   TRIAL 14 giorni (piano Premium)
     ↓
   ┌── paga ──→ ACTIVE ──→ rinnovo ──→ ACTIVE …
   │                └─ pagamento fallito ─→ PAST_DUE (7 giorni di tolleranza) ─→ EXPIRED
   │                └─ disdetta ──────────→ CANCELLED (accesso fino a scadenza) ─→ EXPIRED
   └── non paga ─→ EXPIRED ──→ BLOCCO (si entra per rinnovare, non per lavorare)

  In parallelo, sull'account:
   ACTIVE ⇄ SUSPENDED → BANNED → DELETED        (transizioni in `InglyAccount.TRANSIZIONI`)
```

### 2.1 Creazione

`InglyAccount.crea(dati, opzioni)` è **l'unico** modo di far nascere un account.
Ci passano tutti e tre i percorsi che ne creano uno:

| Percorso | Chiamante | `opzioni` |
| --- | --- | --- |
| Primo avvio (installazione vuota) | `InglyPrimoAvvio.invia()` | `ruolo:'owner', prova:false` |
| Registrazione self-service | `SaaSGate.register` | `ruolo:'owner', prova:true` |
| Collega aggiunto dall'amministratore | `InglyAmministrazione.creaUtente()` | `tenant_id`, `dispositivo:false` |

Dieci fasi, ognuna con esito dichiarato in `esito.fasi`:

1. moduli disponibili
2. validazione (**tutti** gli errori insieme, ognuno col suo campo)
3. unicità di email e username
4. cifratura della password (PBKDF2-SHA256, 210 000 iterazioni, sale da 16 byte)
5. profilo
6. workspace (nuovo, oppure quello indicato da `tenant_id`)
7. appartenenza e ruolo
8. abbonamento (prova o attivo; **non** un secondo abbonamento se il workspace ne ha già uno)
9. sessione di dispositivo
10. **una sola scrittura**, in fondo — poi la sessione applicativa

Il punto 10 è la proprietà che conta: fino a quella riga in archivio non è
cambiato niente, quindi un errore in qualunque fase precedente non lascia
account a metà. Non è una transazione vera — `localStorage` non ne ha — ma è
la cosa più vicina che si possa ottenere senza un server.

`_inCorso` impedisce il doppio clic e si spegne in un `finally`: è la riga per
cui un pulsante non può più restare su «Creazione in corso…» per sempre.

### 2.2 Accesso

```
email + password → InglyIdentita.verifica (hash)
                 → InglyIdentita.statoAccount (sospeso? bandito?)
                 → InglyDispositivi.registra  ─ conflitto? → schermata di subentro
                 → sessione (senza diritti)
                 → InglyGuardia.avvia()
```

Il messaggio di errore è lo stesso per «utente inesistente» e «password
sbagliata», e nel primo caso si verifica comunque un hash finto: rispondere
subito, o rispondere diversamente, direbbe a chi prova quali indirizzi
esistono.

### 2.3 La sessione

La sessione dice **chi sei**, mai **che cosa puoi fare**:

```js
{ user_id, email, nome, tenant_id, ruolo, emessa, scade, modalita, labName, device_id }
```

Nessun `plan`, nessun `modules`, nessun `expiresAt` di licenza. Una sessione
che contiene uno di quei campi è considerata **manomessa** e non apre: i
diritti si rileggono dall'abbonamento a ogni applicazione di sessione.

### 2.4 La guardia

`InglyGuardia.controlla(sessione)` è pura — non tocca il DOM, non scrive, non
fa uscire nessuno — e risponde con una delle tre:

| azione | quando | che cosa succede |
| --- | --- | --- |
| `entra` | tutto a posto | si va avanti, e si manda un battito alla postazione |
| `esci` | sessione assente, scaduta, manomessa; account inesistente; postazione revocata | si torna alla schermata di accesso, col motivo |
| `blocco` | account sospeso/bandito, oppure abbonamento scaduto | si spiega e si offre l'uscita — **non** si butta fuori |

La distinzione fra `esci` e `blocco` non è cosmetica: chi ha l'abbonamento
scaduto deve poterlo rinnovare, e non può farlo dalla schermata di accesso.

Momenti in cui la guardia chiede: avvio, dopo l'accesso, al ritorno della
scheda in primo piano, ogni due minuti.

**Chi non sa, non apre.** Archivio illeggibile, modulo assente, campo mancante:
nessuno di questi è un sì.

---

## 3. Postazioni

Un abbonamento, una postazione (`InglyDispositivi.LIMITE_PREDEFINITO = 1`; un
piano può alzarlo dichiarando un limite `dispositivi`).

- il secondo dispositivo **non** viene respinto: vede da dove è aperta l'altra
  sessione e sceglie se subentrare;
- una postazione senza notizie da 30 minuti non occupa più il posto — una
  scheda dimenticata in ufficio non deve chiudere fuori il proprietario;
- il battito aggiorna `last_seen` al massimo una volta al minuto;
- l'uscita volontaria libera la postazione;
- cambio password, reimpostazione e sospensione la revocano.

L'identificativo del dispositivo nasce nel browser: chi vuole può cambiarlo.
Non è un DRM e non pretende di esserlo. L'applicazione seria della regola può
esistere solo lato server, e quando ci sarà un server questo modulo ne
diventerà il client — stesse funzioni, stessa forma dei dati.

---

## 4. Stati dell'account

```
active ⇄ suspended → banned → deleted
   ↑         ↓          ↓
pending_verification ───┘
```

`InglyAccount.TRANSIZIONI` è la mappa completa. Da `deleted` non si torna.
Ogni cambio di stato: revoca le postazioni se si esce da `active`, e scrive in
`audit_log`.

**Non si cancella: si archivia.** Un utente cancellato porta via lo storico di
chi ha fatto cosa.

---

## 5. Password

| Operazione | Chi | Serve la password attuale | Revoca le sessioni |
| --- | --- | --- | --- |
| `InglyAccount.cambiaPassword` | l'interessato, da **Sicurezza** | sì | le *altre*, non la propria |
| `InglyAccount.reimpostaPassword` | un amministratore, da **Amministrazione** | no | tutte |

**Recupero via email: non esiste.** Questa installazione non ha un servizio di
posta, e una schermata «ti abbiamo inviato un'email» che non invia niente è
peggio di nessuna schermata, perché fa aspettare. Chi perde la password la fa
reimpostare dall'amministratore del workspace e poi la cambia da sé. Quando
esisterà un servizio di posta, il percorso a token sostituirà questa nota — e
non prima.

**«Sicurezza» è ora un pulsante vero (2.10.0).** Questa tabella descriveva
l'intento da tempo — `InglySicurezza.render()` costruiva già il modulo
completo — ma nessuna rotta o pulsante lo chiamava mai: `grep -rn
"InglySicurezza" src/legacy` non dava risultati fuori dal file stesso. Chi
apriva l'applicazione non aveva nessun modo reale di cambiare la propria
password. Aggiunto un pulsante «🔒 Sicurezza account» nella barra enterprise
(stesso pattern a modulo già in uso per White Label); la rotta di navigazione
`sicurezza` non si poteva riusare perché è già presa da un'altra sezione
(lista acquisti).

Nello stesso giro, `cambiaPassword` revocava **anche** la postazione
corrente — quella che stava eseguendo il cambio — nonostante il messaggio
mostrato dicesse «le altre postazioni sono state chiuse». La guardia
buttava fuori l'utente pochi secondi dopo un cambio riuscito. Corretto
passando `deviceCorrente` (da `InglyDispositivi.corrente()`) come eccezione
alla revoca — solo per questo percorso: il subentro di un altro dispositivo
e il logout forzato dall'amministratore continuano a revocare tutto, come
devono.

---

## 6. Audit

Ogni mutazione scrive in `db.audit_log`:

```js
{ id, at, actor, tenant_id, action, target, result, metadata }
```

Azioni registrate: `account.created`, `account.status_changed`,
`account.password_changed`, `account.password_reset`, `device.registered`,
`device.revoked`, `device.revoked_others`, `device.revoked_all`,
`billing.attiva`, `billing.rinnova`, `billing.non_pagato`, `billing.disdici`,
`subscription.cancelled`, `subscription.reactivated`,
`subscription.plan_scheduled`.

Nessuna voce contiene password, hash o segreti.

Si legge da `InglyAccount.audit(filtro)`; l'amministrazione mostra quella del
proprio workspace, la sezione Sicurezza quella del proprio account.

---

## 7. Che cosa NON c'è, e perché

| Assente | Perché |
| --- | --- |
| Verifica email | nessun servizio di posta. Lo stato `pending_verification` esiste nella macchina a stati ed è pronto, ma nessun percorso lo assegna. |
| Recupero password automatico | come sopra. |
| Pagamenti automatici | vedi `BILLING-ARCHITECTURE.md`: niente in questo prodotto può dichiarare pagato un abbonamento senza un riferimento del fornitore. |
| RLS vera | `localStorage` non ha righe né politiche. L'isolamento per `tenant_id` è applicato nel codice ed è verificato dai test; diventa reale quando i dati passano a Supabase (`SUPABASE-READINESS.md`). |
| Account che sopravvive a un azzeramento fatto da fuori l'app | Vedi §9: l'identità vive solo in `localStorage`, su quel browser. DevTools «Clear site data», un altro browser o un altro dispositivo cancellano l'unica copia — non risolvibile senza un backend reale. |

Dirlo qui è il punto: una funzione che manca e si sa che manca è un pezzo di
strada; una funzione che sembra esserci e non funziona è un difetto.

---

## 8. Dove sono i test

| File | Che cosa tiene |
| --- | --- |
| `tests/account-service.test.mjs` | creazione atomica, unicità, stati, password |
| `tests/dispositivi.test.mjs` | policy a una postazione, subentro, inattività, revoca |
| `tests/guardia.test.mjs` | le tre azioni, e ogni modo di dire «sì» per distrazione |
| `tests/amministrazione.test.mjs` | permessi, isolamento del workspace, nessuna seconda implementazione |
| `tests/fatturazione.test.mjs` | idempotenza, nessuna attivazione senza fornitore |
| `tests/auth-identita.test.mjs` | hashing, sessioni senza diritti |
| `tests/qa/ciclo-account.mjs` | il percorso completo nel file consegnato, in un browser vero |
| `tests/qa/reset-non-cancella-account.mjs` | il reset dei dati applicativi non cancella l'account (vedi §9) |
| `tests/qa/admin-riattiva-account.mjs` | ATTIVA/SOSPENDI/ELIMINA sono tre stati dello stesso interruttore |

---

## 9. Reset dei dati e cancellazione dell'account non sono la stessa cosa
(2.12.0)

`ingly_saas_db` (`localStorage`) è l'unico posto dove vivono `users`,
`tenants`, `subscriptions`, `memberships`, `device_sessions`, `audit_log` —
tutto l'account, in un solo blob JSON, distinto dalle IndexedDB business
(`orders`, `catalog`, `clients`…). `InglyPrimoAvvio.serve()` decide
«mostra login» o «mostra crea account» leggendo solo
`ingly_saas_db.users.length`: per questo svuotare quella singola chiave da
qualunque punto del codice equivale, agli occhi dell'app, a un'istallazione
mai avviata.

«Reset di fabbrica» (Backup & Ripristino) cancellava anche quella chiave
insieme ai dati applicativi che l'avviso prometteva di cancellare — un
account cancellato di nascosto da un pulsante che non lo dichiarava.
Corretto: il reset ora esclude esplicitamente `ingly_saas_db` e
`ingly_device_id` dalla cancellazione, e l'avviso lo dice.

**Questo vale solo per i reset fatti da dentro l'applicazione.** Un
azzeramento fatto da fuori — DevTools «Clear site data», un altro browser,
un altro dispositivo — cancella comunque l'unica copia dell'account, perché
non esiste una seconda copia da nessuna parte finché non c'è un backend
reale. Non è un difetto di questo modulo: è la conseguenza diretta di non
avere un server. Dettaglio completo, incluso lo stato del Cloud Sync
opzionale e perché resta bloccato, in `docs/RELEASE-AUTH-SECURITY-4.md`.
