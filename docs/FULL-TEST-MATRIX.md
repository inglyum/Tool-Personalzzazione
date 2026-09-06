# FULL TEST MATRIX — cosa è stato provato, e come

Data: 6 settembre 2026 · artefatto `dist/INGLY-OS.html` (10,49 MB).

Tre livelli di prova, e solo il terzo esegue davvero l'applicazione:

| Livello | Comando | Che cosa dimostra |
| ------- | ------- | ----------------- |
| **A · sintassi** | `npm run verify` | 224 file JS si analizzano e si ricompongono |
| **B · moduli** | `npm test` | 1313 asserzioni sui moduli puri, dentro `vm` |
| **C · browser** | `npm run qa` | 26 suite Playwright su Chromium, sul file consegnato |

Le tre colonne di stato hanno significati diversi e non vanno confusi:

- **VERIFICATO NEL BROWSER** — un comando è stato premuto e il numero che ne è
  uscito è stato confrontato con quello atteso.
- **VERIFICATO AUTOMATICAMENTE** — provato al livello A o B: il codice fa la
  cosa giusta quando lo si chiama, ma nessuno ha premuto il pulsante.
- **NON VERIFICATO** — nessuna prova. Il motivo è scritto ogni volta.

---

## La matrice

| MODULO | FUNZIONI TESTATE | PASS | FAIL | NOT VERIFIED |
| ------ | ---------------- | ---: | ---: | ------------ |
| **Smart Quoter 3D — comandi** | 62 pulsanti scoperti dal DOM, premuti uno per uno; reset; PDF; WhatsApp; magazzino materiali; 20 ridisegni | 19 | 0 | il verso «conferma» dei comandi distruttivi (il collaudo risponde «annulla») |
| **Smart Quoter 3D — calcoli** | IVA, strategie, margine (cursore e campo), sconti in matrice 2×4, modalità rapida/professionale, energia (4 modi), FDM↔resina, 96 input assurdi, salvataggio e ricaricamento, PDF, WhatsApp | 52 | 0 | il PDF non viene aperto in un lettore: se ne verificano testo e totali |
| **Smart Quoter 3D — macchina, materiale, slicer** | 12 modelli di macchina, 16 materiali, tre sorgenti di peso (`MODEL_ONLY`, `COMPLETE_SLICER_TOTAL`, `MANUAL_BREAKDOWN`), guardiano sui supporti, consegna «→ Quoter» | 25 | 0 | l'importazione di un file .gcode reale (il collaudo scrive nei campi dello slicer, non apre un file) |
| **Smart Quoter 3D — parco macchine** | macchine registrate in `equipment`, macchina incompleta, costo orario, persistenza | 14 | 0 | — |
| **Tutte le rotte** | 101 rotte dichiarate aperte una per una; alias; rotte senza schermata | 5 | 0 | — |
| **Tutti i pulsanti** | 1641 gestori in linea risolti nell'ambito globale su tutta l'applicazione | 2 | 0 | i gestori legati all'elemento (`this.parentElement.remove()`): non valutabili fuori dal clic |
| **Moduli principali — clic reale** | 811 pulsanti premuti su dashboard, ordini, catalogo, clienti, magazzino, preventivi, 3D, laser, attrezzature, impostazioni | 30 | 0 | il verso «conferma» (dichiarato: `confirm` risponde no) |
| **Magazzino dei dati** | 11 domini: scrivi, rileggi, modifica, rileggi, ricarica, cancella; scrittura in blocco | 36 | 0 | — |
| **Cinque larghezze** | 390, 430, 768, 1366, 1920 px × 10 moduli: sbordo orizzontale e contenuto | 10 | 0 | il tocco su schermo reale: si emula la larghezza, non il dito |
| **Prestazioni** | tempo di apparizione di 10 moduli, nodi del documento, DOM pronto | 3 | 0 | la macchina di collaudo non è un telefono: i tempi sono un limite superiore ottimista |
| **Ordini** | record unico, immagine, margine, assegnatario, tre filtri, preventivato/reale/scostamento | 107 | 0 | — |
| **Produzione** | capacità macchina, carico, scadenze, calendario di laboratorio | 30 | 0 | — |
| **Catalogo** | ricalcolo con anteprima annullabile, categorie, CSV | 21 | 0 | l'importazione CSV con un file vero (il selettore di file non è pilotabile) |
| **CRM** | preventivi, collegamenti cliente↔preventivo↔ordine, paginazione, riga unica, integrità | 18+ | 0 | — |
| **Magazzino** | registro dei movimenti, costo reale, quando ricomprare | 26+ | 0 | — |
| **Laser B2B** | il calcolatore passa dal motore unico, un solo conto, prezzo dal margine | — | 0 | — |
| **Product Builder** | la confezione si conta una volta sola | 8 | 0 | — |
| **Coerenza fra moduli** | stesso dato, stessa risposta in moduli diversi | 28 | 0 | — |
| **Scritture** | nessun salvataggio fallisce in silenzio (localStorage, IDB, IDB in blocco) | 13 | 0 | — |
| **Finestre** | tutte le finestre del prodotto aperte una per una | — | 0 | — |
| **Navigazione** | la barra mostra tutti i moduli; sovrapposizioni a più larghezze | 31 | 0 | — |

Totale della corsa finale: **26 suite, 1101 controlli, 0 rossi, exit 0**.

---

## Le scelte di collaudo, dichiarate

Tre decisioni cambiano il significato dei numeri qui sopra. Stanno scritte
perché si possano discutere.

**1. `confirm` risponde «annulla».** Nella campagna sui 811 pulsanti dei moduli
principali, `window.confirm` restituisce `false` e `prompt` restituisce `null`.
Un collaudo che accetta ogni conferma cancella i dati a metà del giro, e i
comandi successivi falliscono per una ragione che non è loro. Conseguenza: i
comandi distruttivi sono verificati nel verso «annulla» e restano NON VERIFICATI
nel verso «conferma».

**2. I gestori legati all'elemento non si risolvono staticamente.** Un
`onclick="this.parentElement.remove()"` non si può valutare senza il clic. Sono
esclusi dal censimento dei 1641 e dichiarati tali dalla suite.

**3. I tempi sono a caldo.** I 4-46 ms della FASE 31 sono il passaggio da un
modulo all'altro **dopo** che l'applicazione è caricata. Il caricamento a
freddo è la misura separata: DOM pronto in 1139 ms.

---

## Quello che nessuna suite prova

Elencato per non lasciarlo implicito:

- **La stampa vera.** Nessun file .gcode viene importato, nessun PDF viene
  aperto in un lettore, nessuno ZIP viene scompattato. Si verifica il testo e i
  numeri che il prodotto genera, non il file che ne esce.
- **I selettori di file.** `<input type="file">` non è pilotabile da un
  collaudo: importazione Excel, CSV e immagini sono verificate fino al punto in
  cui il file entrerebbe.
- **La rete.** L'applicazione è un file solo e funziona senza rete. L'unica
  dipendenza esterna misurata è JSZip per «ZIP+Foto», che ora dichiara
  l'indisponibilità invece di tacere.
- **I 188 `catch` vuoti «altro».** Vedi la sezione dedicata nel report: sono
  censiti e classificati, non corretti uno per uno.
