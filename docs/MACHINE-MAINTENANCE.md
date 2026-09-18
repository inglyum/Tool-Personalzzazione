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

## Cosa NON è ancora costruito

Questo modulo è puro: nessun IDB, nessun DOM, nessuna persistenza dello
storico interventi, nessuna schermata. È il modello dati e il conto — quello
che deve esistere prima di qualunque bottone. La schermata "Manutenzione"
(registrare un intervento, vedere l'allerta in dashboard, collegare
`tariffaEffettiva` al Cost Engine quando calcola il costo di un lavoro) è il
passo successivo, non ancora fatto. Dichiararlo qui è la differenza fra un
gap onesto e un bottone senza logica dietro.

## Test

`tests/machine-maintenance.test.mjs`, 26/26: validazione, immutabilità del
record, calcolo dell'usura (incluso il caso "non calcolabile" e il caso
"nessuna preventiva registrata mai"), la tariffa effettiva che sale con
l'usura e resta ferma sotto tetto e sotto modalità manuale, l'allerta che
non inventa macchine senza intervallo dichiarato.
