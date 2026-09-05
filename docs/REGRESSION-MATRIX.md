# REGRESSION-MATRIX — cosa è stato provato, e come

Ogni riga è eseguibile. «Verificato» significa che il comando è stato lanciato
sul file consegnato — `dist/INGLY-OS.html` — non sui sorgenti.

## Motore di costo

| Modulo | Prova | Atteso | Ottenuto | Esito |
|---|---|---|---|---|
| CostEngine | 5 profili + generico presenti | 6 | 6 | ✔ |
| CostEngine | input vuoto per ogni profilo | costo 0, nessun NaN | 0 | ✔ |
| CostEngine | valori negativi | azzerati, mai costo < 0 | ok | ✔ |
| CostEngine | scala 1 → 1000 | costo unitario mai in risalita | ok | ✔ |
| CostEngine | scarto 10% | +11,1% sul perdibile | 11,1% | ✔ |
| CostEngine | margine 40% su costo 100 | 166,67 | 166,67 | ✔ |
| CostEngine | ricarico 40% su costo 100 | 140, margine 28,6% | 140 / 28,6% | ✔ |
| CostEngine | 128 combinazioni sconto × quantità | mai sotto il pavimento | 0 violazioni | ✔ |
| CostEngine | immutabilità | l'input non cambia | invariato | ✔ |
| CostEngine | determinismo | 100 chiamate identiche | identiche | ✔ |
| CostEngine | purezza del sorgente | no random/Date/storage/DOM | nessuno | ✔ |
| CostEngine | invarianti su 6 profili × 10 qty × 8 scarti | costo mai negativo/NaN/∞ | 0 rotti | ✔ |
| CostEngine | macchina più cara | costo mai inferiore | ok | ✔ |
| CostEngine | manodopera più cara | costo mai inferiore | ok | ✔ |
| CostEngine | IVA | mai dentro il profitto | assente | ✔ |
| CostEngine | spedizione | sottratta dal profitto operativo | −8 su 8 | ✔ |
| CostEngine | commissioni | pagamento % / fissa / marketplace separate | separate | ✔ |
| CostEngine | overhead | % oppure €/ora | entrambi | ✔ |

## Migrazione dei quoter

| Modulo | Prova | Atteso | Ottenuto | Esito |
|---|---|---|---|---|
| Smart Quoter 3D | 200 casi prima/dopo la migrazione | scarto 0 | 0,000e+0 | ✔ |
| Smart Quoter 3D | 30 test storici | invariati | 30/30 | ✔ |
| PricingEngine | stesso ricarico/netto/lordo/margine | identici | identici | ✔ |
| Smart Quoter | formule di prezzo nel file | 0 | 0 | ✔ |
| Apparel | 200 pezzi, margine impostato 40% | mai sotto costo | 11,8% | ✔ |
| Apparel | margine chiesto 40 | 40,0% | 40,0% | ✔ |
| Apparel | serigrafia, avviamento 40 € | si divide per la quantità | 40 → 0,20 €/pz | ✔ |
| Apparel | sconto globale 60% | ridotto dal pavimento | 11,1%, margine 10% | ✔ |
| Laser B2B | politiche estratte dalla formula | dichiarate | 4 politiche | ✔ |
| Architettura | motore composto prima di chi lo usa | sì | sì | ✔ |
| Architettura | secondo motore con altro nome | nessuno | nessuno | ✔ |

## Product Builder — interfaccia

| Modulo | Prova | Atteso | Ottenuto | Esito |
|---|---|---|---|---|
| Product Builder | tabella scaglioni | 9 righe | 9 | ✔ |
| Product Builder | evidenza «miglior valore» | 1 riga | 1 | ✔ |
| Product Builder | colonna setup/pezzo | presente | presente | ✔ |
| Product Builder | 4 posizionamenti | competitivo/standard/premium/luxury | 4, con consigliato | ✔ |
| Product Builder | «Come è stato calcolato?» | cassetto interno, non popup | 11 righe | ✔ |
| Product Builder | Audit costo | badge di provenienza | 0 → 9 badge | ✔ |
| Product Builder | tipi di provenienza | reale/configurato/manuale/default/stima/mancante | 3 presenti sul caso | ✔ |
| Product Builder | avvisi | INFO/WARNING/CRITICAL | mostrati | ✔ |

## Interfaccia e integrità

| Modulo | Prova | Atteso | Ottenuto | Esito |
|---|---|---|---|---|
| Sidebar | sovrapposizioni, 8 larghezze × 2 stati × 4 scorrimenti | 0 | 0 | ✔ |
| Sidebar | categorie che si aprono al primo clic | 8 su 8 | 8/8 | ✔ |
| Sidebar | voci con `display` in linea | 0 | 0 | ✔ |
| Sidebar | gruppi chiusi all'avvio | 0 | 0 su 9 | ✔ |
| Sidebar | voci di menu visibili | tutte | 110 su 110 | ✔ |
| Sidebar | gruppo compresso a mano, dopo ricaricamento | resta compresso | resta compresso | ✔ |
| Sidebar | `#prox-cn-showhide` e il suo testo | assenti | assenti | ✔ |
| Sidebar | barra più lunga dello schermo | scorre | 4 234 px in 593, scorre | ✔ |
| DOM | azioni offerte due volte nello stesso componente | 0 | 0 | ✔ |
| DOM | id duplicati | 0 | 0 | ✔ |
| DOM | palette dei comandi contemporanee | ≤ 1 | 0 aperte | ✔ |
| Render | 5 cicli completi di navigazione | nessuna duplicazione | nessuna | ✔ |
| Responsive | 5 viewport × 8 sezioni | nessun overflow | nessuno | ✔ |
| Console | errori JavaScript | 0 | 0 | ✔ |
| Console | errori di rete | — | 1 (BCE, preesistente) | ⚠ |

## Dati

| Modulo | Prova | Atteso | Ottenuto | Esito |
|---|---|---|---|---|
| Migrazione pipeline | 100 record misti | conteggio esatto | 40/35/25 | ✔ |
| Migrazione pipeline | seconda esecuzione | nessun duplicato | 0 | ✔ |
| Migrazione pipeline | verifica con record perso | deve fallire | fallisce | ✔ |
| SafeStorage | spazio esaurito | non dichiara salvato | ok:false | ✔ |
| SafeStorage | scrittura accettata e non conservata | smascherata | ok:false | ✔ |
| Baseline | modifiche al codice storico | tutte dichiarate | 22 dichiarate | ✔ |

## Fase Ordini · Produzione · Catalogo · CRM · Cost Engine

| Modulo | Prova | Atteso | Ottenuto | Esito |
|---|---|---|---|---|
| Ordini | margine dopo un cambio dei costi di oggi | invariato | 180 → 180 | ✔ |
| Ordini | filtro macchina / operatore / tecnologia | filtra | 1 su 4 ciascuno | ✔ |
| Ordini | assegnatario dopo il ricaricamento | resta | resta | ✔ |
| Ordini | `<img>` senza sorgente nella lista | 0 | 0 | ✔ |
| Produzione | capacità disponibile − carico | residua | 40 − 16 = 24 h | ✔ |
| Produzione | ordine senza ore dichiarate | incognita, non zero | 0 h · 1 incognita | ✔ |
| Produzione | scadenza non raggiungibile | rossa | rossa | ✔ |
| Catalogo | «Annulla» dopo l'anteprima | nessun prezzo cambiato | nessuno | ✔ |
| Catalogo | conferma parziale | scrive solo le righe scelte | 1 su 2 | ✔ |
| CRM | valore di pipeline col criterio vecchio | — | 300 su 1700 | ✘ (corretto) |
| CRM | valore di pipeline col vocabolario unico | tutti gli aperti | 1700 € | ✔ |
| CRM | preventivo con ordine collegato | convertito | CONVERTED | ✔ |
| Product Builder | 3 € di confezione | +3 € | 5,00 → 8,00 | ✔ |
| Coerenza | costo di catalogo 12 → 30 | ordine storico fermo | 12 | ✔ |
| Errori | `IDB.put` che fallisce | avviso, nessun falso successo | avviso | ✔ |
| Errori | promessa rifiutata | l'utente lo sa | avvisato | ✔ |

**Totale: 1302 test unitari, 38 collaudi su browser. 0 fallimenti.**
