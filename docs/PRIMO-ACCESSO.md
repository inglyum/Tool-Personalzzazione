# Come si entra la prima volta

Nel prodotto **non esiste nessuna password preimpostata**, e questo è
deliberato: una credenziale scritta nel codice è uguale in ogni copia
distribuita, e chiunque legga il file entra in qualunque installazione.

## INGLY OS — l'applicazione

1. Apri `dist/INGLY-OS.html`.
2. Alla prima apertura, con l'archivio vuoto, la schermata **non chiede di
   accedere: chiede di creare l'account amministratore.**
3. Compili nome del laboratorio, il tuo nome, email e password (almeno 8
   caratteri con un numero; l'indicatore ti dice che cosa manca).
4. Premi «Crea l'account e entra». Entri subito.

Quello che succede dietro: nasce il tuo utente con ruolo **proprietario**, il
tuo workspace, e un abbonamento **completo** — non una prova di 14 giorni,
perché chi installa il prodotto sulla propria macchina non è un cliente in
valutazione. La password viene cifrata con PBKDF2-SHA256 e non è leggibile
nemmeno aprendo l'archivio del browser.

Dalla seconda volta in poi si accede con quella email e quella password.

**La schermata compare una volta sola.** Appena esiste un utente non si
ripresenta — altrimenti sarebbe la porta di servizio di prima, con un
passaggio in più.

### Se dimentichi la password

Oggi non c'è un servizio di posta collegato, quindi non c'è un recupero
automatico e la schermata lo dice invece di fingere che una mail sia partita.
Se perdi l'accesso a un'installazione locale, l'unico modo è azzerare
l'archivio del browser per quel file (`localStorage`), e ricominciare dal
primo avvio — **i dati di lavoro restano**, perché stanno in IndexedDB, non lì.

## La sezione Amministrazione

Compare nel menu solo a chi è **proprietario** o **amministratore**. Da lì:

- vedi le persone del workspace, con ruolo e stato;
- aggiungi una persona (nome, email, password iniziale, ruolo);
- cambi il ruolo di chi c'è già;
- sospendi e riattivi;
- vedi il piano, lo stato dell'abbonamento e quante persone stanno nel limite.

Cinque ruoli, con i permessi che il dominio già conosce:

| Ruolo | Che cosa può fare |
| --- | --- |
| Proprietario | tutto, compresi amministrazione e abbonamento |
| Amministratore | tutto, tranne la proprietà del workspace |
| Operatore | ordini, preventivi, clienti, produzione |
| Contabile | fatture, pagamenti, incassi, report |
| Sola lettura | vede, non modifica |

Tre cose che la sezione **non** permette, e non per dimenticanza:

- creare un secondo proprietario (il workspace ne ha uno);
- sospendere il proprietario, o sé stessi;
- toccare utenti di un altro workspace.

E il controllo non è nel fatto che la voce di menu sia nascosta:
`render()` rifiuta comunque e lo dice. Nascondere un pulsante è una cortesia,
non una misura di sicurezza.

## INGLY CLOUD ADMIN — il pannello separato

`dist/INGLY-CLOUD-ADMIN.html` è lo strumento di amministrazione delle licenze,
separato dall'applicazione. Anche lì non c'è una password preimpostata: esiste
un solo `superadmin` **senza password**, e al primo accesso la scegli tu. Da
quel momento è cifrata come le altre.

## Ambiente di sviluppo

Per lavorare sul codice serve talvolta un account già pronto. Si accende così,
dalla console del browser:

    localStorage.setItem('ingly_dev_seed', '1')

e si ricarica. Viene creato `dev@localhost` con una password **casuale,
generata in quel momento e mostrata una volta sola** nella console. Il seed si
rifiuta di partire se l'archivio contiene già utenti veri.
