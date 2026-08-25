# MIGRATION

> Da dove viene questo repository, cosa è stato portato, cosa no e perché, e
> come si continua il lavoro senza perdere niente.

---

## 1. Provenienza

| Sorgente | Commit / versione |
|----------|-------------------|
| `inglyum/Ingly-standalone-html` · branch `claude/ingly-os-dev-system-ddgv1f` | toolchain, test, moduli TypeScript |
| `INGLY OS v96 STANDALONE.html` | `d30a1278e4c399ba8cc29044d1ed183b0be11f9aeadfaad657b296d75e836399` |
| `INGLY OS Enterprise Admin v1.2.html` | `7f43ee9eff4a393df2041d125676dd3efd34a1b544e24a792c66b1f2782c796b` |
| `ui-ux-pro-max-skill` (ZIP) | metodo: architettura a token, specifiche componenti, validator |

---

## 2. Cosa è stato portato

- **INGLY OS v96**, decomposto in `src/legacy/`: 7 librerie vendorizzate, il
  sorgente modulare originale (`app/src/**`), 129 patch storiche in ordine, 20
  blocchi CSS, il markup delle viste.
- **Enterprise Admin v1.2**, decomposto in `src/admin/legacy/`.
- Il **manifest** che registra l'ordine di caricamento e l'impronta di ogni
  blocco: è ciò che rende verificabile ogni modifica successiva.

## 3. Cosa non è stato portato, e dove trovarlo

| Elemento | Motivo | Dove resta |
|----------|--------|------------|
| 61 file `INGLY-OS-v*-STANDALONE.html` (~490 MB) | versioni storiche superate dal v96 | `Ingly-standalone-html`, cronologia git |
| `app-v2/` (secondo applicativo su Supabase) | traccia parallela, non parte del prodotto standalone | idem |
| `supabase/`, `db/` (schema multi-tenant, RLS, migrazioni) | infrastruttura non ancora attiva; serviranno quando esisterà il backend | idem |

Nessuno di questi è stato cancellato. Sono decisioni reversibili: quando il
backend diventerà reale, `supabase/` e `db/` vanno riportati qui in un commit
dedicato.

Il repository di partenza pesava 492 MB. Questo ne pesa circa 22.

---

## 4. Come è avvenuta la decomposizione

Il monolite non è stato tagliato a mano: `scripts/extract.mjs` segue i confini
che il file già dichiara — i marcatori `// === /src/... ===` lasciati dal build
originale e le intestazioni di ogni patch — e registra l'ordine in
`manifest.json`.

**L'ordine è portante.** Nel v96 le patch tarde sovrascrivono le precedenti:
riordinarle cambia il comportamento. `scripts/build.mjs` legge il manifest e
concatena, senza mai riordinare.

La prova che il taglio è corretto è stata il round-trip: al primo commit,
`build.mjs` senza modifiche produceva un file con lo **stesso SHA-256** del
monolite di partenza.

---

## 5. Come si modifica il codice storico

`src/legacy/` non è congelato: si può correggere. Ma ogni modifica deve essere
**dichiarata**.

1. Modifica il file in `src/legacy/` (o `src/admin/legacy/`).
2. Aggiungi il file a `baseline/deliberate-changes.json` con la ragione: cosa
   c'era, perché era sbagliato, cosa c'è adesso.
3. `npm test`.

`tests/roundtrip.test.mjs` confronta l'impronta di ogni blocco con quella
registrata nel manifest e fallisce su qualsiasi differenza non dichiarata. È il
modo per accorgersi di una modifica accidentale dentro 9 MB di codice: un diff
di quelle dimensioni non si rivede a occhio.

Il test verifica anche il contrario: una modifica dichiarata ma non più
presente (una ragione rimasta lì dopo un revert) fa fallire la suite.

### Cosa **non** si fa in `src/legacy/`

- Non ci si aggiunge codice nuovo. Il codice nuovo nasce in `src/`.
- Non si aggiunge un layer CSS in fondo. È come è nato il problema.
- Non si cancella una patch perché non la si è capita. Si capisce, poi si
  decide.

---

## 6. Le modifiche fatte finora

Sono nove file di codice storico, tutte in `baseline/deliberate-changes.json`
con la ragione per esteso. In sintesi:

**INGLY OS**

| File | Cosa |
|------|------|
| `patches/111` (NavBus) | `App.navigate` era `writable:false`: ogni override tardivo lanciava un TypeError non gestito. Accessor con setter vuoto: stessa semantica, niente eccezioni. |
| `patches/099` (PRO X) | Assegnava `App.navigate` e l'eccezione impediva la registrazione dell'evidenziazione sezioni. Ora usa NavBus. |
| `patches/117` (Smart Search) | Tema predefinito chiaro; `ingly_theme` scritta da due sistemi con valori incompatibili. Chiave e attributo separati, con migrazione. |
| `patches/083` (v28) | Il router risolveva sempre `view-dashboard`: la voce "KPI Live" apriva la dashboard. |
| `patches/103` · `patches/091` | Tredici `!important` con ambra e indaco scritti a mano sulle voci di menu. |
| `patches/161` · `patches/163` (v88/v90) | Nascondevano voci con `display:none !important` e osservavano la sidebar. Conservata la barra "Viste" nelle sezioni hub. |
| `app/src/modules/settings/index.js` | Due modali con lo stesso id sovrapposte al primo avvio. |
| `app/src/modules/ai/index.js` | `AILayer.analyze()` si interrompeva se un contatore della chrome mancava. |

**INGLY Cloud Admin**

| File | Cosa |
|------|------|
| `patches/002` | `eid()` usato in sei punti e mai definito. |
| `patches/003` | Credenziali master nel sorgente, password in chiaro, seed già accessibile. Vedi `docs/SECURITY.md`. |

---

## 7. Migrazioni dei dati

**Regola non negoziabile: le chiavi di storage non si rinominano senza una
migrazione.** Un laboratorio che perde gli ordini di sei mesi è un danno
peggiore di quasi ogni bug.

### Fatte

| Da | A | Come |
|----|----|------|
| `ingly_theme` (usata da due sistemi con valori incompatibili: `dark`/`light` e gli id delle palette) | `ingly_color_scheme` per la modalità chiaro/scuro; `ingly_theme` resta alle palette | Alla lettura, se `ingly_color_scheme` manca e `ingly_theme` contiene `dark` o `light`, il valore viene adottato e riscritto. Nessuna perdita. |
| `passwordHash` in chiaro (console) | record `pbkdf2$…` | Al primo accesso riuscito la password viene riscritta come hash. Nessun intervento manuale. |

### Da fare, con attenzione

Tre famiglie mostrano schema drift: il codice legge la versione più recente ma
le precedenti restano nel browser dell'utente.

```
lb2b_catalog_v1   lb2b_catalog_v23   lb2b_catalog_v33
lb2b_machines_v1  lb2b_machines_v32
ingly_settings    ingly_settings_main
```

Vanno consolidate con una migrazione che legge tutte le versioni, unisce e
scrive una chiave sola — **dopo** aver creato un checkpoint. Non prima di aver
stabilizzato la UI: è un cambiamento di persistenza, non va mescolato a un
refactor visivo.

### Il tetto di `localStorage`

113 chiavi, un solo object store IndexedDB (`pipeline`). `localStorage` ha un
limite pratico di 5–10 MB e fallisce **in silenzio** quando si satura: un
laboratorio con qualche migliaio di ordini ci arriva.

La migrazione a IndexedDB è il prossimo lavoro strutturale importante. Va fatta
per aggregato (ordini, poi vendite, poi magazzino), ciascuno con la propria
migrazione, il proprio test e la possibilità di tornare indietro.

---

## 8. Rigenerare tutto da zero

```bash
# 1. estrarre di nuovo dai monoliti originali (serve il file di partenza)
node scripts/extract.mjs INGLY-OS-v96-STANDALONE.html src/legacy
node scripts/extract.mjs INGLY-OS-Enterprise-Admin-v1.2.html src/admin/legacy

# 2. fotografia funzionale
npm run baseline

# 3. font incorporati
node scripts/vendor-fonts.mjs

# 4. build e verifica
npm run check
```

Attenzione: il punto 1 **sovrascrive** le correzioni fatte a
`src/legacy/`. Serve solo per ripartire da un monolite diverso, non nel lavoro
quotidiano.
