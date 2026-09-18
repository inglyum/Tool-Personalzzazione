# Manutenzione macchine — una macchina più usurata costa di più

`src/product/machine-maintenance.js`, `global.InglyMachineMaintenance`.

## Il gap che chiude

`InglyMachineRate` (in modalità «ibrido») sapeva un solo numero di
manutenzione: un budget annuo dichiarato diviso per le ore lavorate attese —
corretto come *preventivo*, ma cieco alla macchina reale. Una macchina
manutenuta ieri e una manutenuta sei mesi fa costavano identico all'ora,
perché nessuno storico di interventi esisteva.

## Cosa fa

Uno storico di interventi **append-only** (stesso principio del registro di
magazzino, Fase 31: un intervento non si modifica, se ne registra un altro),
tre tipi:

| Tipo | Azzera l'usura |
| --- | --- |
| `PREVENTIVA` | sì |
| `CORRETTIVA` (guasto) | no |
| `ISPEZIONE` | no |

Solo una manutenzione preventiva sposta la prossima scadenza — un'ispezione
o una riparazione dicono che si è guardata o riparata la macchina, non che
si è rinnovato il piano di manutenzione.

## Il conto

`stato(macchina, interventi, oreCorrenti)` calcola l'usura come frazione
dell'intervallo dichiarato (`maintenanceIntervalHours`): ore trascorse
dall'ultima preventiva ÷ intervallo. **Senza un intervallo dichiarato non
stima nulla** — torna `calcolabile: false`, `confidence: 'missing'`, con lo
stesso linguaggio di confidenza che il Cost Engine già usa altrove. Non è un
limite del modulo: è la stessa regola di tutto il progetto — nessun numero
inventato quando il dato per calcolarlo non c'è.

`tariffaEffettiva(macchina, interventi, oreCorrenti)` parte dalla tariffa
**preventivata** di `InglyMachineRate.tariffa()` e applica un sovrapprezzo
solo sulla componente di manutenzione (mai sull'ammortamento, che non ha a
che fare con quanto la macchina è scaduta di servizio):

```
moltiplicatore = 1 + min(2, max(0, usura − 1))     // tetto ×3
manutenzioneEffettiva = manutenzioneBase × moltiplicatore
```

Una macchina scaduta del doppio del suo intervallo (usura = 2) paga il
doppio della sua componente di manutenzione. Il tetto ×3 è la stessa idea
del tetto di ragionevolezza che `InglyMachineRate` applica già
all'ammortamento: oltre quella soglia il dato dice «va fermata e riparata»,
non «costa di più» — e lo dice nel campo `assunzione`, non in silenzio.

`allerta(macchine, interventi, oreCorrentiPer)` elenca solo le macchine
scadute o vicine (≥80% dell'intervallo); una macchina senza intervallo
dichiarato **non compare** — comparirebbe come falso "a posto", che è peggio
di non comparire.

## L'integrazione reale — scheda macchina (`patches/138-...`)

Il modulo puro sopra è collegato alla tab «🔧 Manutenzione» già esistente
nella scheda macchina (`MachineCard`, patch 138), che prima di questa
correzione era un log libero — data, descrizione, costo, nessun tipo,
nessuna ora macchina, nessuna idea di scadenza.

- **Persistenza**: nello stesso record `equipment` che la scheda macchina
  già scrive (`m.maintLog`), non in uno store separato — un intervento è
  ancora un dato della macchina, non una seconda entità. Un nuovo campo
  dichiarato, `maintenanceIntervalHours`, vive nella tab «Uso» accanto a
  `hoursWorked`/`hoursLife`, che già c'erano.
- **UI**: la tab Manutenzione mostra una card di stato (🟢/🟡/🔴/⚪) con la
  tariffa macchina effettiva quando diverge dalla preventivata; il modulo di
  inserimento ha ora un campo Tipo (Preventiva/Correttiva/Ispezione) e
  registra automaticamente le ore macchina al momento del click, lette da
  `hoursWorked` — non richieste una seconda volta all'utente. Il pallino di
  stato compare anche nell'elenco macchine (`MachineCard.openPicker()`), per
  vedere le macchine scadute senza aprirle una a una.
- **Compatibilità**: gli interventi scritti prima di questa modifica (senza
  `type`/`hoursAtService`) restano visibili nella lista ma non partecipano
  al calcolo dell'usura — non c'è modo onesto di dedurre se erano preventivi
  senza inventarlo.
- **Cost Engine**: `tariffaEffettiva` legge la tariffa preventivata da
  `InglyMachineRate.tariffa()` tramite un adattatore di nomi di campo
  (`costBuy`→`purchasePrice`, `hoursLife`→`expectedLifeHours`, ecc. — la
  scheda macchina usa nomi diversi da quelli che il motore si aspetta da
  prima che questo modulo esistesse); non è una seconda matematica, è la
  sola traduzione dei nomi.

## Cosa NON è ancora costruito

Il sovrapprezzo di manutenzione calcolato da `tariffaEffettiva` **non entra
ancora automaticamente in un preventivo**: oggi è mostrato nella scheda
macchina, ma Smart Quoter/Cost Engine continuano a leggere la tariffa
dichiarata a mano o quella "ibrida" standard di `InglyMachineRate`, senza
interrogare lo storico interventi. Collegare i due — far sì che un
preventivo su una macchina scaduta di manutenzione lo sappia — è il passo
successivo, non ancora fatto.

La tab «Costi» della stessa scheda macchina calcola un ammortamento con una
propria formula (`costBuy/lifeYears/1650`), separata da
`InglyMachineRate`/`InglyMachineMaintenance`: una duplicazione preesistente,
non toccata da questa modifica perché fuori dal suo perimetro — vedi
`docs/cost-engine/CALCOLATORE-MACCHINE.md` per il precedente di questa
stessa classe di problema.

## Test

`tests/machine-maintenance.test.mjs`, 26/26 (unità, motore puro):
validazione, immutabilità del record, calcolo dell'usura (incluso il caso
"non calcolabile" e il caso "nessuna preventiva registrata mai"), la
tariffa effettiva che sale con l'usura e resta ferma sotto tetto e sotto
modalità manuale, l'allerta che non inventa macchine senza intervallo
dichiarato.

`tests/qa/manutenzione-macchina.mjs`, 10/10 (browser, integrazione reale):
apertura scheda, stato "non calcolabile" senza intervallo, dichiarazione
dell'intervallo con un click vero, registrazione di un intervento
preventivo con click reali sul modulo, avanzamento delle ore macchina fino
a scadenza, comparsa dell'allerta nell'elenco macchine, persistenza
dell'intervento e dell'intervallo dopo un ricaricamento vero della pagina.
