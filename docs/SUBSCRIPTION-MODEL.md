# L'abbonamento

    trial → active → past_due → expired
      ↓        ↓         ↓
    cancelled ←──────────┘        suspended (da qualunque stato)

| Stato | Accesso | Come nasce |
| --- | :-: | --- |
| `trial` | sì | alla creazione del workspace, 14 giorni sul piano Premium |
| `active` | sì | sottoscrizione di un piano |
| `past_due` | sì, 7 giorni | pagamento non riuscito |
| `cancelled` | fino a fine periodo | disdetta |
| `expired` | no | prova finita, tolleranza esaurita, periodo concluso |
| `suspended` | no | decisione amministrativa |

## Quello che non si memorizza

`trial`, `expired` e la fine di `cancelled` **si calcolano dalle date**. Uno
stato scritto in archivio diventa falso da solo col passare dei giorni, e il
giorno in cui diventa falso nessuno è lì a correggerlo.

## Le tre decisioni che meritano di essere dette

**Disdire non toglie l'accesso.** Lo fa finire alla scadenza del periodo già
pagato. Toglierlo il giorno della disdetta sarebbe far pagare un mese e darne
venti giorni.

**Una prova disdetta finisce quando finiva la prova**, non un mese dopo.

**Un periodo concluso senza rinnovo registrato non si presume pagato.** Diventa
`expired`. Presumere il contrario significherebbe regalare mesi a ogni
pagamento non arrivato.

## La prova

14 giorni, piano Premium completo, **nessuna carta richiesta**. Avviso dal
terzo giorno prima. Testato ai giorni 0, 13, 14 e 15.
