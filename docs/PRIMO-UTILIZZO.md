# PRIMO UTILIZZO

> Come si passa da «ho scaricato un file» a «ci gestisco il laboratorio».

---

## 1. Cosa serve

Un browser. Nient'altro: niente installazione, niente account da attivare,
niente rete. `INGLY-OS.html` si apre con un doppio clic e i dati restano sul tuo
computer.

Conseguenza da tenere a mente fin dal primo giorno: **i dati vivono nel browser
di quel computer**. Cambiare browser, o svuotare i dati del sito, significa
ripartire da zero. Il backup non è una funzione avanzata da guardare più avanti,
è la seconda cosa da imparare — §5.

---

## 2. I tre passi per entrare

1. **Crea l'account.** Alla prima apertura compare il cancello INGLY. Non c'è
   nessun account preesistente: si preme «Prova gratis 14 giorni →», si
   compilano laboratorio, username, email e password. Resta tutto in locale.
2. **Configura il laboratorio** — 5 passi, due minuti. Nome, città, anno,
   identità, tariffe. Si può saltare, ma è la configurazione da cui il
   preventivatore prende i costi: saltarla significa lavorare con le tariffe
   generiche.
3. **Sei dentro.** La dashboard è vuota, ed è corretto che lo sia: INGLY OS non
   inventa ordini per riempire i riquadri.

Il tour guidato e la presentazione **non** compaiono al primo avvio, per non
mettere tre benvenuti uno sull'altro. Restano richiamabili con `⌘K` / `Ctrl+K`
cercando «tour», «presentazione» o «configurazione».

---

## 3. L'ordine in cui conviene inserire le cose

Ogni passo usa il precedente. Farli in disordine funziona, ma costringe a
tornare indietro.

| # | Cosa | Dove | Perché prima di così |
|---|------|------|----------------------|
| 1 | **Le tue macchine** | Macchine | Il costo orario di ogni lavorazione viene da qui |
| 2 | **I materiali** | Magazzino → Items | Il costo del materiale entra nel prezzo |
| 3 | **I prodotti** | Product Builder | Otto passi da un'idea a un prodotto con un prezzo |
| 4 | **I clienti** | Clienti | Servono per intestare preventivi e ordini |
| 5 | **Il primo preventivo** | Preventivatore | Usa prodotti, materiali e tariffe già inseriti |
| 6 | **L'ordine** | Ordini | Nasce dal preventivo accettato |
| 7 | **La vendita** | Vendite | Chiude il ciclo e alimenta margine e fatturato |

Dopo il punto 7 la dashboard smette di essere vuota, e i numeri che mostra sono
i tuoi.

---

## 4. Le due cose da imparare subito

**`Ctrl+K` (o `⌘K`).** Apre ricerca e comandi insieme. Cerca dentro prodotti,
ordini, clienti, macchine, materiali e fornitori — si scrive il nome di un
cliente e ci si arriva. È più veloce di qualunque menu.

**Il Product Builder.** È il pezzo che distingue INGLY OS da un foglio di
calcolo: otto passi — prodotto, tecnologia, macchina, materiale, produzione,
costi, prezzo, varianti — e alla fine c'è un prodotto con un costo reale e un
margine calcolato, non stimato a occhio.

---

## 5. Il backup, prima di averne bisogno

**Impostazioni → Backup → Esporta.** Scarica un file con tutto dentro.

Va fatto **il primo giorno**, e poi con una regolarità che si decide una volta:
se non ci lavori tutti i giorni, una volta a settimana basta. Il file va tenuto
da qualche altra parte — un backup sullo stesso computer non è un backup.

Quando lo spazio del browser si esaurisce, INGLY OS lo dice con un avviso
esplicito e ti indica cosa occupa spazio. Prima non lo diceva: il salvataggio
falliva in silenzio.

---

## 6. Cosa funziona, e cosa no

**Funziona, verificato end-to-end:** registrazione, configurazione, macchine,
materiali, prodotti, preventivi, ordini, vendite, e la dashboard che li legge.
Il motore dei prezzi calcola su dati veri — costo 5,55 €, netto 7,77 €, margine
28,6 % su un caso di prova.

**Da sapere:**

- **I dati sono su questo computer.** Nessun server, nessuna sincronizzazione
  automatica fra due postazioni. Si sposta il file di backup.
- **Il controllo delle licenze è lato client.** Vale come esperienza d'uso, non
  come protezione: chi modifica il file abilita qualsiasi piano. Serve un
  backend per renderlo reale — vedi `docs/SECURITY.md` A1.
- **Le password dei clienti sono in chiaro.** L'intera catena le tratta come
  testo, e cifrarne solo un pezzo chiuderebbe fuori i clienti. Si chiude
  insieme al backend — `docs/SECURITY.md` A4.
- **Alcune schermate usano ancora le finestre del browser** per conferme e
  richieste. Il comportamento è corretto, l'aspetto no: la migrazione è fatta su
  catalogo, magazzino e ordini, ne restano 165 altrove.
- **Il cambio valuta richiede rete.** Offline fallisce, ed è l'unico errore che
  resta in console.

---

## 7. Se qualcosa non torna

`Ctrl+K` → «Riassunto della giornata» mostra scadenze e urgenze.
Impostazioni → Backup consente di esportare prima di qualunque tentativo.

Per verificare la console di amministrazione c'è `COLLAUDO-ADMIN.html`: si apre,
si preme un pulsante e dieci prove girano da sole.
