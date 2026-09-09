# PROFILI ECONOMICI — la fonte di verità

Documento operativo. Il ragionamento dietro le scelte sta in
`docs/cost-engine/PROFILI-ECONOMICI.md`; qui c'è la mappa.

## Una fonte sola

```
                    labor_profiles · overhead_profiles · packaging_items
                                        (IndexedDB v32)
                                             │
                                    InglyCostProfilesStore
                                             │
                                     InglyCostProfiles          ← puro
                                             │
        ┌────────────┬───────────────┬───────┴────────┬──────────────────┐
   Quoter 3D    Calcolatore      Product Builder    Catalogo        Preventivo
                 Macchine                                            (B2B)
```

Nessun modulo tiene una copia. Chi vuole un valore lo chiede al modulo; chi
vuole cambiarlo lo cambia nel pannello, e vale per tutti.

## La precedenza

Per ogni voce, in quest'ordine:

| # | Fonte | Quando |
| - | ----- | ------ |
| 1 | `preventivo` | l'utente ha scritto un valore in **questo** preventivo |
| 2 | `profilo` | il laboratorio ha compilato il pannello |
| 3 | `predefinito` | i profili rispondono con il loro valore dichiarato |
| 4 | `ripiego` | il modulo dei profili non è raggiungibile |

Le ultime due sono lo stesso numero e non sono la stessa cosa: «il laboratorio
ha deciso 18» e «nessuno ha deciso, e 18 è quello che il programma propone»
portano allo stesso costo oggi e a due discussioni diverse fra sei mesi.

**L'override locale non tocca mai il profilo globale.** Un preventivo a 35 €/h
lascia il laboratorio a 22 €/h, e il preventivo successivo riparte da 22.

## Le unità, e non si mescolano

| Voce | Unità | Note |
| ---- | ----- | ---- |
| Manodopera | **€/h** | costo interno e tariffa cliente, due campi distinti |
| Spese generali | **€/h** *oppure* **€/lavoro** *oppure* **%** | una modalità alla volta, mai due |
| Imballo | **€/pezzo** *oppure* **€/ordine** | quello per ordine si divide per la quantità |

I minuti di lavoro si convertono in ore dividendo per 60, sempre nel motore,
mai nell'interfaccia.

## Che cosa finisce nello snapshot

Un preventivo salvato congela, oltre ai totali:

```
laborSnapshot: {
  rate:         quanto è stato usato
  source:       preventivo | profilo | predefinito | ripiego
  override:     vero se scritto per questo preventivo
  profileRate:  quanto diceva il profilo in quel momento
}
```

Serve a rispondere alla domanda che arriva mesi dopo: «perché questo lavoro
aveva quella tariffa?». Senza `source` e `profileRate`, un 18 scritto a mano
mentre il profilo diceva 25 è indistinguibile da un 18 che era il profilo.

Cambiare il profilo globale **non modifica gli snapshot storici**: quelli sono
congelati con la versione del motore che li ha prodotti.

## Il pannello

Si apre da tre porte, tutte sulla stessa stanza: la palette comandi («Profili
economici»), il pulsante sotto la tariffa oraria nel preventivatore 3D, e
quello nel Calcolatore Macchine.

Per ogni voce il pannello mostra il valore, la fonte, e se è configurata (✓
sulla scheda). Le spese generali partono da **zero** su tutte e nove le voci e
ci restano finché non le si compila.

## Comandi

```bash
npm test                                       # 26 casi sul modulo puro, 35 sulle 4 tecnologie
node tests/qa/cost-profiles-quoter.mjs         # il caso 250 g, prima e dopo
node tests/qa/profili-economici-pannello.mjs   # il giro completo dal pannello
node tests/qa/quoter3d-tariffa-override.mjs    # i quattro livelli e l'override
```
