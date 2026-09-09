# CALCOLATORE MACCHINE — il prezzo passa dal motore

Fase 3 del piano in `COST-ENGINE-V2-AUDIT.md`, punto **P-3** dell'audit.
Route `lasercalc`, file `src/legacy/patches/120-ingly-os-calcolatore-macchine-v4-0.js`.

## Il difetto

Il Calcolatore Macchine decideva il prezzo da solo:

```js
prezzo = costoUnitario × ricarico × (1 − sconto/100)
```

Tre moltiplicazioni. Il motore dei costi, le politiche di prezzo e il pavimento
di margine — che il resto dell'applicazione usa da tre fasi — non venivano mai
chiamati. Con ricarico `2,2` e sconto `60%` il prezzo usciva **sotto il costo**:
la riga mostrava il margine negativo e lo vendeva lo stesso.

Il §22 del comando lo vieta; il §61 lo chiama per nome: «non confondere markup e
margin».

## La correzione

I tre livelli — Campione, Kit, Stock — **restano**. Il ricarico è come ragiona
chi fa un preventivo al banco, e toglierlo sarebbe stato riscrivere una
funzionalità che serve. Cambia da dove esce il numero:

```js
InglyCostEngine.prezzo(costo, {
  strategia: 'ricarico',        // dichiarato, non implicito
  ricarico: mk,
  scontoPct: sconto,
  ivaPct: iva,
  marginePavimentoPct: politica.floorMargin,
})
```

Quattro conseguenze:

1. **Il pavimento non si scavalca.** Nessuno sconto può portare il prezzo sotto
   il margine minimo della politica scelta. Quando scatta, la riga lo dice
   (`⚑ pavimento 20%`) invece di applicarlo in silenzio.
2. **Lo sconto è limitato, non ignorato.** Chiedere il 60% con una politica che
   ne consente 15 applica 15 e scrive *«sconto ridotto da 60% a 15%: la politica
   «Standard» non consente di più»*.
3. **Ricarico e margine sono due parole diverse.** Il campo dice «ricarico ×2,8»,
   accanto al prezzo c'è «margine 64%», e sotto i tre campi una riga spiega che
   ×2 non è il 100% di margine ma il 50%.
4. **Il prezzo che va al preventivo è quello mostrato.** Il passaggio al Quoter
   ricalcolava `unitCost × mk2` per conto suo: due numeri diversi per la stessa
   riga sono un errore di fatturato.

Senza il motore **non si calcola un prezzo di ripiego**: si dichiara che manca.
Un secondo conto, anche identico oggi, è il modo in cui due prezzi diversi per
la stessa riga nascono domani. `tests/architecture-cost-engine.test.mjs` presidia
questo con un cricchetto sui motori di prezzo duplicati, e ha bocciato la prima
versione di questa correzione — che il fallback ce l'aveva.

## Le tre altre cose che non funzionavano

Trovate misurando lo stesso file, non cercate:

- **La tariffa oraria era un `18` scritto a mano**, in tre punti con tre valori
  diversi (18, 15, 18). Ora arriva dai profili economici, con un collegamento al
  pannello sotto il campo.
- **I due `select` non erano legati a nulla.** Si poteva cambiare l'IVA e vedere
  i prezzi di prima: nessuno chiedeva un ricalcolo. Ora sì — e con essi il nuovo
  selettore di politica.
- **`getMaterials()` leggeva `ingly_saas_db.items`**, che è il database di
  licenze e utenti. Il magazzino sta in IndexedDB. Risultato: la tendina dei
  materiali mostrava sempre e solo i quindici articoli di esempio, e chi caricava
  il proprio magazzino non lo ritrovava qui.

## Il parco contro il listino

`BUILT_IN` è un **listino**: novanta modelli commerciali con il prezzo di
catalogo. `equipment` è il **parco**: le macchine che INGLY possiede davvero, con
il prezzo pagato, le ore di vita dichiarate e la manutenzione di quella macchina
— ed è quello che il preventivatore 3D legge già.

Due registri per la stessa macchina, e qui vinceva sempre il listino.

Non si sostituiscono: sono due cose diverse e servono entrambe. Il parco si mette
davanti, marcato **«Le tue macchine»**. Una macchina registrata a metà si mostra
lo stesso, dichiarata `· da completare`: nasconderla nasconderebbe una macchina
che esiste, e completarla con un valore di listino direbbe una cosa falsa sul suo
costo orario. I campi che il record non ha restano vuoti, e il calcolatore usa i
suoi predefiniti — che almeno sono dichiarati tali.

## Cosa resta aperto

- **Il prezzo dell'energia** (`€/kWh`) è un campo per preventivatore, con
  predefinito `0,28` ripetuto in più file. È una duplicazione vera, ma unificarla
  tocca ogni quoter: è una fase sua.
- **I novanta modelli del listino non hanno una fonte né una data.** Restano un
  ripiego dichiarato finché la fase 2 del piano (ricerca di mercato con URL e
  data) non li sostituisce. Il §43 vieta di inventarli, e vale anche qui.

## Prove

`tests/qa/calcolatore-macchine-prezzo.mjs` — il giro completo nel browser:
prezzo senza sconto, sconto oltre il massimo, ricarico sotto il pavimento,
cambio di politica, materiali dal magazzino vero, macchine del parco.
