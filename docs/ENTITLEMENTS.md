# I diritti

```
can(funzione)      → { ok, motivo, pianoRichiesto, stato }
require(funzione)  → come can, più `bloccato:true` — da mettere davanti all'azione
limit(chiave)      → { limite, usato, rimanente, illimitato, entro, pct }
getPlan()          → il piano in vigore adesso, o null
getSubscription()  → lo stato calcolato
tutte()            → ogni funzione con il suo esito
```

## Tre proprietà che i test difendono

**Un diritto non si memorizza.** Il contesto (`usaContesto`) porta
l'abbonamento, non i diritti. Questi si ricalcolano a ogni `can()`.

**Una funzione ignota non si concede.** `can('funzione_inventata')` è `false`.
Meglio negare per una battitura che concedere per una battitura.

**Al limite non ci si sta.** 100 ordini su 100 significa che il 101° non passa:
`entro` è `usato < limite`, non `<=`.

## Che cosa resta a abbonamento scaduto

`dashboard`, `backup`, `documents`. Senza dashboard non si può nemmeno
riabbonarsi, e senza backup i propri dati diventano ostaggio. Chiudere fuori un
cliente dai suoi dati non è una leva commerciale: è un danno.

## Il blocco si spiega, non si nasconde

`InglyLancio.blocco(funzione)` produce una scheda che dice che cosa si
otterrebbe e con quale piano. Nascondere lascia l'utente a chiedersi dove sia
finita una cosa; spiegare gli dice che cosa manca.

**Il blocco visivo non è la protezione.** `require()` va chiamato anche
dall'azione, perché togliere il pulsante non impedisce di chiamare la
funzione — e un test lo verifica chiamandola direttamente.
