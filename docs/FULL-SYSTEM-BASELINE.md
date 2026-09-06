# FULL SYSTEM BASELINE — stato misurato prima dell'audit funzionale

Data della misura: 6 settembre 2026.
Artefatto misurato: `dist/INGLY-OS.html` (10,48 MB), un solo file.
Repository: `inglyum/Tool-Personalzzazione`, ramo `claude/ingly-personalization-repo-ekvc0z`.

Questo documento non riassume il codice: riporta ciò che le tre scale di
verifica hanno **effettivamente** eseguito e restituito prima di toccare
qualsiasi cosa in questa sessione di audit.

## Le tre scale, e cosa provano davvero

| Comando | Cosa esegue | Cosa **non** prova |
| ------- | ----------- | ------------------ |
| `npm run verify` | analisi sintattica di ogni sorgente e ricomposizione | che il codice faccia qualcosa |
| `npm test` | 1313 asserzioni sui moduli puri, dentro `vm` | che l'interfaccia li chiami |
| `npm run qa` | 23 suite Playwright su Chromium, sul file consegnato | ciò che nessuna suite preme |

Solo la terza scala esegue l'applicazione. Ogni affermazione di questo audit
che non sia coperta dalla terza scala è marcata NON VERIFICATO.

## Baseline misurata

```
npm test        1313 pass · 0 fail
npm run qa       913 controlli ✔ · 0 ✘ · exit 0 · errori JavaScript: 0
```

Log integrale della corsa di baseline: eseguita il 6/9/2026, 23 suite, nessun
controllo rosso. Le suite e i loro conteggi (nell'ordine in cui girano):

| Suite | Controlli | Rossi |
| ----- | --------: | ----: |
| flussi, grafica, primo utilizzo, persistenza, storico economico | — | 0 |
| paginazione CRM · CRM-05 riga unica · preferiti | — | 0 |
| registro di magazzino · costo reale · laser B2B · finestre · template | — | 0 |
| Smart Quoter 3D (margine, costo canonico, benchmark, integrità, carico) | — | 0 |
| aspetto · integrità cliente · rubrica | — | 0 |
| ordini (record unico) | 49 | 0 |
| apparel — scaglioni e consuntivo | 33 | 0 |
| ordini — preventivato/reale/scostamento | 30 | 0 |
| campo immagine | 23 | 0 |
| magazzino — quando ricomprare | 26 | 0 |
| navigazione — la barra mostra l'applicazione | 31 | 0 |
| ordini — immagine, margine, assegnatario, filtri | 28 | 0 |
| produzione — capacità, carico, scadenze | 30 | 0 |
| catalogo — ricalcolo con anteprima | 21 | 0 |
| CRM — preventivi, clienti, ordini | 18 | 0 |
| product builder — la confezione si conta una volta | 8 | 0 |
| coerenza fra moduli | 28 | 0 |
| quoter 3D — il parco macchine vero | 14 | 0 |
| scritture — nessun salvataggio silenzioso | 13 | 0 |

## Cosa questa baseline **non** copriva

È il punto della baseline, ed è la ragione per cui l'audit funzionale ha
trovato difetti veri malgrado 913 controlli verdi:

1. **Nessuna suite premeva i pulsanti dello Smart Quoter 3D uno per uno.** Le
   suite 3D esistenti verificavano i *numeri* (il margine, il costo canonico,
   il benchmark), non i *comandi*. Un pulsante che non fa niente passava
   inosservato.
2. **Nessuna suite verificava che lo schermo dicesse la stessa cosa del
   motore.** Un campo che mostra 40% mentre il calcolo usa 80% supera ogni
   controllo sul risultato del calcolo.
3. **Nessuna suite attraversava le modalità** (rapida ↔ professionale) o le
   tecnologie (FDM ↔ resina) più di una volta.
4. **Nessuna suite ricaricava la pagina** e ripremeva un comando sullo stato
   ripristinato, tranne per il magazzino e il parco macchine.

I cinque difetti registrati in `FULL-SYSTEM-QA-REPORT.md` (BUG-3D-002 →
BUG-3D-006) vivevano tutti in questi quattro punti ciechi.

## Metodo

Ogni difetto di questo audit è passato per gli otto passi richiesti:
riprodotto nel browser, registrato con il valore osservato, ricondotto a una
causa, coperto da un controllo di regressione **scritto prima della
correzione e visto fallire**, corretto, ricontrollato, e riverificato insieme
a tutte le altre suite.

Il file misurato è sempre `dist/INGLY-OS.html`: correggere un sorgente senza
ricomporre non cambia nulla per il collaudo, ed è successo una volta in
questa sessione — la corsa che ne è uscita è stata scartata, non riportata.
