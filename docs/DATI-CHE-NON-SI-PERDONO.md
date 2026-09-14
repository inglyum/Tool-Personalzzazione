# Due modi silenziosi di perdere il lavoro di qualcuno

> `src/legacy/patches/108-…` (archivio preventivi 3D) · `src/legacy/app/src/modules/items/index.js` (magazzino)
> Suite: `tests/qa/quoter3d-archivio.mjs` (7) · `tests/qa/materiali-predefiniti.mjs` (7)

Due difetti trovati partendo da due cadute **intermittenti** della regressione.
Nessuno dei due si riproduceva a comando, ed è esattamente il motivo per cui
meritavano di essere cercati invece che riavviati: un guasto che appare una
volta su cinque in laboratorio appare comunque, prima o poi, sul lavoro vero —
e questi due non lasciano un messaggio d'errore, lasciano un archivio più corto.

## Come sono stati trovati

| | |
| --- | --- |
| **Sintomo 1** | `quoter3d-calcoli` FASE 16b: «dopo il ricaricamento l'archivio c'è ancora (0)». Il salvataggio era confermato; dopo il riavvio non c'era più niente. |
| **Sintomo 2** | `import-export` FASE B3: «materials: 175 record importati (attesi 3)». Sempre 175, cioè 172 + 3. |
| **Riproducibilità** | Nessuna. Sintomo 1: 1 caduta, poi verde da solo, sotto CPU satura e in catena. Sintomo 2: 2 cadute su 9 esecuzioni. |

Su questa base **non** si può dire quale riga ha rotto: una corsa verde dopo
una modifica non dimostra niente, se il guasto è intermittente. L'ho scritto
qui perché a metà strada avevo concluso il contrario, sulla base di una
singola esecuzione, e la conclusione era infondata.

Quello che si può fare è leggere la **forma** del guasto e cercare quale
percorso del programma la produce. Tutti e due i percorsi esistevano.

## 1 · Salvare poteva cancellare

```js
function persist(){ localStorage.setItem(SK, JSON.stringify({mats:MATS, saved:SAVED})); }
```

Il modulo nasce con `SAVED=[]` e si riempie **solo dentro `render()`**.
Qualunque percorso che chiamasse `persist()` prima dell'idratazione riscriveva
l'archivio dei preventivi vuoto, e in silenzio: il `catch` è vuoto e nessuno se
ne accorgeva fino al riavvio dopo. È la forma esatta del sintomo 1 —
salvataggio confermato in memoria, archivio sparito dopo il ricaricamento.

**Ora** l'archivio si unisce a quello su disco invece di sostituirlo. Solo le
cancellazioni dichiarate — `delSaved`, `clearSaved`, che passano
`{cancella:true}` — possono accorciarlo. La suite verifica anche il difetto
opposto: svuotare l'archivio deve continuare a funzionare, altrimenti si è
solo scambiato un danno con un altro.

## 2 · I predefiniti tornavano sopra il tuo magazzino

`Materials.seed()` tiene memoria di quali predefiniti ha già proposto, in
`ingly_materiali_proposti_v1`. La regola dichiarata nel modulo è giusta: se un
materiale è stato proposto e adesso non c'è, non c'è **perché qualcuno l'ha
tolto**, e non si rimette.

Il buco era il caso in cui la memoria **manca del tutto** mentre il magazzino
è pieno. Lì `seed()` trattava ogni predefinito come «mai proposto» e ne
riversava 172 sopra i materiali di chi lavora. Succede in due casi veri:

- un'installazione più vecchia della memoria stessa;
- un **ripristino da backup** in cui la marcatura non è arrivata — e 172 + 3 è
  precisamente il numero del sintomo 2.

**Ora** lo decide il contenuto, non la memoria:

| Cosa c'è in archivio | Cosa fa |
| --- | --- |
| Niente | Corredo completo: è un'installazione nuova |
| Solo predefiniti | Completa il corredo: il magazzino è ancora quello di fabbrica |
| Qualcosa che i predefiniti non conoscono | **Non propone niente** e prende atto: quel magazzino è di qualcuno |

Il primo tentativo di questa correzione era più grezzo — «nessuna memoria +
archivio non vuoto → non proporre niente» — e l'ha bocciata la suite alla
prima esecuzione: all'avvio il corredo di base scrive già quattro materiali,
quindi l'archivio non è **mai** davvero vuoto quando `seed()` arriva, e ogni
installazione nuova sarebbe rimasta con quei quattro. La FASE D esiste per
quello.

## Cosa resta onestamente aperto

Le due cadute intermittenti **non sono state riprodotte**, quindi non c'è la
prova che fossero questi due percorsi. Quello che c'è: i percorsi esistono,
producono esattamente quelle due forme, ed erano entrambi silenziosi. Sono
chiusi e coperti da due suite che costruiscono la condizione a mano invece di
aspettare che si ripresenti — che è l'unico modo di tenere chiuso un difetto
che non si fa trovare.
