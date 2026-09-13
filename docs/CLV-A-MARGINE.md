# Il valore del cliente, a margine

## Cosa c'era

Tre schermate calcolavano il «valore cliente» — `clientintel`, `clv`, `ai-clv` —
e tutte e tre sommavano il **fatturato**.

La CLV Dashboard, la più esplicita, faceva così:

```
clv = avgTicket × ordPerYear × 3
ordPerYear = ordini / giorniDalPrimoAcquisto × 365
```

Tre cose storte in tre righe.

**1. Il fatturato non è il valore.** Un cliente da 8 000 € di lavori laser
complessi — materiale caro, otto ore di setup, scarti — può rendere meno di uno
da 3 000 € di portachiavi ripetuti. Chi guarda la classifica per fatturato
coltiva il primo e trascura il secondo, e non ha modo di accorgersene.

**2. La frequenza era gonfiata.** `ordini / giorni` conta gli **acquisti**;
quello che serve è il numero di **intervalli fra acquisti**, che è `ordini − 1`.
Su due acquisti la differenza è del doppio. Su tre, del 50%.

**3. Il `× 3` era un orizzonte di tre anni che nessuno aveva dichiarato**, e
moltiplicava per tre un errore già presente.

## Cosa c'è adesso

`src/product/clv.js` — un modulo puro, e l'unico posto dove questo conto si fa.

Il punto di tutto: **INGLY OS sa il costo di ogni lavoro.** Da quando l'ordine
porta `economic`, il costo di produzione è dichiarato voce per voce. È il dato
che un CRM generico non ha e che un gestionale da laboratorio deve avere. Il
valore del cliente si misura su quello.

### Due numeri, tenuti separati

- **Valore storico** — quanto quel cliente ha già lasciato. È un fatto: si somma.
- **Valore previsto** — quanto lascerà nei prossimi dodici mesi se continua come
  ha fatto. È una proiezione, e l'orizzonte è dichiarato in intestazione.

### Quello che non si sa, non si inventa

| Situazione | Cosa mostra |
| ---------- | ----------- |
| Costo dichiarato su tutti gli ordini | margine, storico e previsto |
| Costo dichiarato su alcuni | margine storico parziale, **percentuale no** — una percentuale su dati parziali sarebbe falsa |
| Nessun costo dichiarato | fatturato proiettato, **marcato come tale** in colonna |
| Un acquisto solo | nessuna proiezione, e il motivo: non c'è ancora un intervallo da misurare |
| Acquisti tutti nello stesso giorno | nessuna proiezione: l'intervallo non è misurabile |
| Cliente in anagrafica senza acquisti | compare a zero — nasconderlo farebbe credere che non esista |

I totali dicono anche **su quanti clienti il costo è noto**: è il numero che
dice quanto fidarsi di tutti gli altri.

### La classifica è in due gruppi, non uno

Prima chi ha un margine noto, ordinato per margine. Poi chi non ce l'ha,
ordinato per fatturato proiettato e marcato in colonna.

Il motivo è aritmetico: il fatturato è **sempre** più grande del margine. Una
classifica sola metterebbe in cima chi ha il costo **non dichiarato** — cioè
premierebbe la mancanza di dati. Il test in browser l'ha scoperto: nella prima
versione «Collaudo Ignoto» stava primo davanti a chi rendeva il doppio.

## Il caso che lo dimostra

Due clienti, misurati a schermo:

| Cliente | Fattura | Rende | In classifica |
| ------- | ------: | ----: | ------------- |
| Buono | 600 € | **360 €** | **primo** |
| Ricco | 1 800 € | 100 € | secondo |

Ricco fattura tre volte tanto e rende un terzo. Prima di questo lavoro stava in
cima.

## Cosa lo verifica

- `tests/clv.test.mjs` — 21 asserzioni sul modulo puro, fra cui la frequenza sugli
  intervalli, il rifiuto di proiettare su un acquisto solo, e la purezza (la data
  si passa: lo stesso insieme di vendite dà lo stesso risultato domani).
- `tests/qa/clv-a-margine.mjs` — 19 controlli in un browser vero: scrive vendite
  in archivio, apre la schermata, e controlla che la classifica metta sopra chi
  rende. Il caso è costruito apposta perché il cliente che fattura di più renda
  di meno.
