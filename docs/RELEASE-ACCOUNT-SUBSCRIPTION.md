# Release — account, abbonamento, dispositivi

Rapporto di rilascio del mandato «ACCOUNT MANAGEMENT + SAAS SUBSCRIPTION +
AUTH HARDENING». Cinque commit, nessuna riscrittura, nessuna funzione ERP/MES
rimossa.

---

## 1. Il difetto da cui è partito tutto

La registrazione si bloccava. Non «a volte»: sempre, sul percorso di primo
avvio. Misurato in browser, non dedotto:

```
PRIMO AVVIO → { "risolto": true, "errore": null, "ms": 42,
  "btn": "Creazione in corso…", "btnDisabled": true, "err": "",
  "gateVisibile": "flex", "utenti": 1, "sessione": false }
```

La promise si risolveva in 42 ms. L'account **veniva creato**. E il pulsante
restava disabilitato per sempre, senza un messaggio.

**Causa.** `InglyPrimoAvvio.invia()`, dopo aver creato l'account, rimandava al
modulo di accesso chiamando `SaaSGate.showLogin()`. Quella funzione si limita a
cambiare `display` su `#gate-login` — il cui contenuto era stato sostituito
dalla schermata di primo avvio. `gate-user` e `gate-pass` non esistevano più,
l'`if (u) u.value = …` saltava in silenzio, `login()` usciva subito sui campi
vuoti, e nessuno riaccendeva il pulsante.

È la terza classe di difetto ricorrente di questo codice: *un `if` che salta in
silenzio, più una promise che si risolve senza aver fatto niente.* Nessuno dei
due solleva, e chi guarda resta fermo.

Misura dopo il rimedio:

```
PRIMO AVVIO → { "risolto": true, "ms": 42, "btn": "Account creato",
  "gateVisibile": "none", "utenti": 1, "sessione": true }
```

---

## 2. Che cosa è stato costruito

| Modulo | Che cosa risolve |
| --- | --- |
| `InglyAccount` | il ciclo di vita dell'account, con **una sola scrittura** in fondo |
| `InglyDispositivi` | un abbonamento, una postazione — con subentro, non con rifiuto |
| `InglyGuardia` | «questa persona può stare qui?», una domanda con tre risposte |
| `InglyFatturazione` | il confine con chi incassa, senza pagamenti finti |
| `InglySicurezza` | la password la cambia chi la possiede |

Più: la sezione **Sicurezza**, i pannelli **Postazioni aperte** e **Attività
recente** nell'amministrazione, la reimpostazione password per persona, e la
tabella che mette in corrispondenza le sezioni dell'applicazione con le
funzioni del listino.

---

## 3. I difetti trovati strada facendo

Tutti misurati, nessuno dedotto. Sono la parte che conta: erano funzioni che
sembravano esserci.

| # | Difetto | Conseguenza |
| --- | --- | --- |
| 1 | `invia()` rimandava a un modulo di accesso che non esisteva più | registrazione bloccata (sopra) |
| 2 | dopo il primo avvio, **uscire** portava alla schermata di *creazione* dell'account, senza campi per accedere | non si rientrava più, mai |
| 3 | il monitor di sessione leggeva `session.userId` — campo inesistente | non controllava niente; e quando trovava qualcosa scriveva `plan` e `modules` **dentro** la sessione, cioè la rendeva manomessa: avrebbe fatto uscire l'utente da solo |
| 4 | `plan_change` e `license_renewal` dell'amministratore facevano lo stesso | idem |
| 5 | `applyCloudUpdate` faceva lo stesso, e salvava in `sessionStorage` | chi apriva la console poteva cambiarsi il piano modificando una stringa |
| 6 | `checkExport` leggeva `s.status` e `s.expiresAt`, campi che la sessione non porta più | rispondeva sempre di sì: un guardiano che non guarda |
| 7 | `_lockNavItems` e `_hookNavigate` leggevano `session.modules`, sempre `undefined` | **nessuna** voce di menu e **nessuna** rotta era protetta: tre piani a listino, e tutti vedevano tutto |
| 8 | la barra di sessione e l'intestazione leggevano `session.plan`/`expiresAt` | mostravano «BASE» a chiunque, e non avvisavano mai che la prova stava finendo |
| 9 | due elementi con lo stesso `id` (`ssb-plan`, `ssb-exp`) | `getElementById` ne trovava uno solo: uno non si aggiornava mai, l'altro riceveva il testo sbagliato |
| 10 | `InglyAccount` e `InglyDispositivi` scrivevano due forme diverse di «sessione revocata» | una revoca scritta da uno non veniva letta dall'altro |
| 11 | `InglyAmministrazione.creaUtente` costruiva l'utente per conto suo | niente audit, validazione diversa, e rischio di un secondo workspace |
| 12 | `cambiaStato` e `reimpostaPassword` dell'amministrazione non chiudevano le postazioni | si restava connessi dopo essere stati sospesi |
| 13 | la registrazione self-service rientrava dal modulo di accesso riempiendo i campi a mano | stesso percorso del difetto #1 |
| 14 | `_defaultModules` e il modale di upgrade contenevano un **secondo listino** scritto a mano (`starter`, `pro`, `enterprise`) | piani che non esistono più, disallineati dal catalogo |

Dal 3 al 9 hanno tutti la stessa radice: la sessione è stata alleggerita dei
diritti (giustamente), e sei punti diversi continuavano a leggerli da lì.
Nessuno se n'era accorto perché **nessuno di quei sei falliva rumorosamente**:
leggevano `undefined` e proseguivano.

---

## 4. Verifica

| Livello | Esito |
| --- | --- |
| `npm run verify` (sintassi) | 257 file JS, 0 errori |
| `npm test` | **2050 PASS, 0 FAIL** |
| `npm run build` | `dist/INGLY-OS.html` 11,10 MB · `dist/INGLY-CLOUD-ADMIN.html` 0,94 MB |
| `tests/qa/ciclo-account.mjs` | **76 controlli in browser, 0 errori JavaScript** |
| Regressione QA completa | 77 suite Playwright |

Test di unità aggiunti in questo mandato: 125.

```
tests/account-service.test.mjs   22   creazione atomica, stati, password
tests/dispositivi.test.mjs       21   postazioni, subentro, inattività
tests/guardia.test.mjs           19   le tre azioni, e i modi di dire sì per sbaglio
tests/amministrazione.test.mjs   16   permessi, isolamento, nessuna seconda strada
tests/fatturazione.test.mjs      22   idempotenza, nessuna attivazione senza fornitore
tests/audit-sicurezza.test.mjs   17   l'audit come test, non come documento
tests/saas-piani.test.mjs         8   sezioni ↔ funzioni del listino
```

---

## 5. Sicurezza

`tests/audit-sicurezza.test.mjs` verifica 17 regole **sul sorgente**, a ogni
`npm test`. Un documento che le elenca invecchia; un test no.

- nessuna chiave `service_role`, nessun segreto, nessuna password nel sorgente
- nessun token in `localStorage` (l'unica voce che somigliava era una scadenza,
  cioè il numero che serve proprio a *non* tenere il token)
- nessuna credenziale predefinita, nessun bypass, nessun confronto in chiaro
- **nessun punto in cui la sessione viene riempita di diritti** — è la regola
  che ha fatto emergere i difetti 3, 4 e 5
- `billing.js` non contiene un `status: 'active'` scritto a mano, né un
  adattatore finto
- l'amministrazione non accetta un `tenant_id` da fuori, e ogni operazione
  verifica il workspace
- la guardia ha **un solo** modo di dire «entra»
- i moduli nuovi non contengono URL scritti a mano

---

## 6. Che cosa NON è stato fatto, e perché

Dirlo è il punto: una funzione che manca e si sa che manca è un pezzo di
strada; una che sembra esserci e non funziona è un difetto — e questo mandato
ne ha chiusi quattordici di quel tipo.

| Non fatto | Perché |
| --- | --- |
| Webhook di pagamento | `applica()` esiste, è idempotente ed è l'unico punto che può attivare un abbonamento. Manca il **backend** che riceva le chiamate del fornitore. Un'attivazione basata sul ritorno del browser sarebbe falsificabile da chiunque. |
| Recupero password via email | non c'è un servizio di posta. Una schermata «ti abbiamo inviato un'email» che non invia niente fa solo aspettare. Il prodotto lo dice apertamente e indica la strada vera. |
| Verifica dell'indirizzo email | come sopra. Lo stato `pending_verification` esiste ed è pronto; nessun percorso lo assegna. |
| RLS vera | `localStorage` non ha righe né politiche. L'isolamento per `tenant_id` è applicato nel codice e verificato dai test; diventa reale su Supabase. |
| Policy a una postazione «forte» | l'identificativo del dispositivo nasce nel browser. Tiene onesta la stragrande maggioranza degli utilizzi e rende visibile l'abuso; non è un DRM. Solo un server può imporla. |
| KPI di piattaforma (account, prove, MRR) | non c'è niente da cui aggregarli: ogni installazione conosce solo se stessa. Vivranno nella console Cloud quando i dati saranno su un server. |
| Deployment in produzione | escluso dal mandato. |

---

## 7. Dove guardare

- `docs/ACCOUNT-LIFECYCLE.md` — il percorso completo e chi risponde a che cosa
- `docs/BILLING-ARCHITECTURE.md` — il confine con chi incassa
- `docs/AUTH-ARCHITECTURE.md` — la guardia e le postazioni
- `docs/LAUNCH-CHECKLIST.md` — che cosa è verde, e che cosa resta
