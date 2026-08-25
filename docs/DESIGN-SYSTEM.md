# INGLY DESIGN SYSTEM

> Un solo layer. Prima erano sette, e uno di essi dichiarava apertamente nel
> proprio commento: *"carica per ultimo, vince la cascata"*. Vincere la cascata
> era diventato il criterio di progettazione.

---

## 1. Il problema che risolve

| Prima | Adesso |
|-------|--------|
| 7 layer CSS sovrapposti (v54, v55, v56, v57, v58, v92, BLOCCO B) | 1 |
| 2 sistemi di variabili in conflitto (`--primary` e `--ds-accent`), 72 nomi senza gerarchia | 3 livelli, una gerarchia |
| 199 `!important` | 0 nel design system |
| 8.210 colori esadecimali letterali nei sorgenti | i token sono l'unico posto in cui un colore nasce |
| 5 librerie di icone caricate, 1 usata | 1, incorporata |
| 9.158 emoji usate come icone | icone vere nella navigazione |
| Nessuna scala tipografica | una, con numeri tabulari dove contano |

---

## 2. Architettura

```
┌──────────────────────────────────────────────────────────────┐
│  COMPONENTI          .btn  .card  .kpi-card  .nav-item  …    │
│                      leggono solo dal livello sotto           │
├──────────────────────────────────────────────────────────────┤
│  COMPONENT TOKENS    --button-bg  --card-padding             │
│                      --nav-item-fg-active  --table-row-hover  │
├──────────────────────────────────────────────────────────────┤
│  SEMANTIC TOKENS     --color-primary  --color-surface        │
│                      --color-danger   --shell-topbar-height   │
│                      ← è qui che cambia il tema               │
├──────────────────────────────────────────────────────────────┤
│  PRIMITIVE TOKENS    --ingly-cyan  --neutral-800  --space-4  │
│                      ← l'unico file con colori letterali      │
└──────────────────────────────────────────────────────────────┘
```

L'architettura viene dalla skill `design-system` dello ZIP UI/UX Pro Max, che
la descrive come `Primitive → Semantic → Component`. È il contributo concreto
di quel materiale a questo progetto.

### File

```
src/design-system/
├── assets/fonts.css          Inter + Font Awesome incorporati (generato)
├── tokens/primitive.css      identità, rampe, spazi, raggi, ombre, tipografia
├── tokens/semantic.css       superfici, testo, stati, focus, shell, tema chiaro
├── tokens/component.css      un blocco per componente
├── tokens/legacy-bridge.css  i 72 nomi storici → token semantici
├── tokens/admin-bridge.css   i nomi della console → token semantici
├── base/base.css             reset, tipografia, focus, scrollbar, motion
└── components/
    ├── controls.css          bottoni, campi, select, switch, tab
    ├── surfaces.css          card, KPI, tabelle, badge, alert, progress
    ├── overlays.css          modale, drawer, toast, tooltip, menu, palette,
    │                         stati vuoti, skeleton
    └── shell.css             sidebar, topbar, contenuto, breadcrumb,
                              work center, responsive
```

---

## 3. Identità

### Colori

```
--ingly-black        #0D1014   fondo
--ingly-anthracite   #1F2328   superfici elevate
--ingly-dark         #2E3238   superfici sovrapposte
--ingly-graphite     #4A5058   testo disattivato, bordi forti
--ingly-titanium     #C7CCD1   testo secondario chiaro
--ingly-white        #FFFFFF
--ingly-cyan         #00E6D2   accento a schermo
--ingly-cyan-print   #00CFC0   variante stampabile (PDF, export, tema chiaro)
--ingly-gold         #C9A227   premium: licenze, piani, evidenze rare
```

**Il ciano è un accento.** Si usa per testo, bordi, stati attivi e superfici
piccole. Non è un colore di riempimento: su fondo scuro il contrasto è 9,8:1,
il che lo rende ottimo per un'etichetta e insopportabile per un pannello.

**L'oro è l'eccezione.** Segnala il piano, la licenza, il livello. Se compare
due volte nella stessa schermata, una delle due è di troppo.

Prima l'accento era l'ambra `#fbbf24`, ereditata da un template: dava
all'applicazione l'aria di un pannello di amministrazione generico. Cambiarla
ha significato modificare una riga in `legacy-bridge.css`, perché tutto il
codice storico usa `var(--primary)`.

### Stati

Volutamente meno saturi delle tinte precedenti: in una dashboard di produzione
i colori di stato devono distinguersi fra loro, non gridare.

| Token | Uso |
|-------|-----|
| `--color-success` | completato, disponibile, in regola |
| `--color-warning` | scorta bassa, in scadenza, attenzione |
| `--color-danger` | errore, scaduto, esaurito |
| `--color-info` | neutro informativo |
| `--color-premium` | piano, licenza, funzione superiore |

### Tecnologie di produzione

Ogni tecnologia ha un colore stabile in tutto il prodotto: la stessa macchina
si riconosce nel work center, nel grafico e nella tabella.

```
--color-tech-laser        ciano
--color-tech-print3d      blu
--color-tech-uv           viola
--color-tech-dtf          ambra
--color-tech-sublimation  verde
```

---

## 4. Tipografia

Inter, incorporata. Scala unica, dal corpo di 14px (denso ma leggibile su uno
schermo di laboratorio) fino al display.

| Ruolo | Token | Dimensione |
|-------|-------|-----------:|
| Display | `--text-3xl` | 36px |
| H1 / titolo pagina | `--text-2xl` | 28px |
| H2 / titolo modulo | `--text-xl` | 22px |
| H3 / titolo card | `--text-md` | 16px |
| Corpo | `--text-base` | 14px |
| Corpo piccolo | `--text-sm` | 13px |
| Etichetta maiuscola | `--text-2xs` | 10px |
| KPI | `--kpi-value-size` | 28px |

**Numeri tabulari** (`font-variant-numeric: tabular-nums`) su prezzi, KPI,
quantità, percentuali, margini e ogni cella di tabella. È la differenza fra una
colonna di importi che si legge e una che va riletta.

---

## 5. Spazio, forma, movimento

- **Spaziatura**: base 4px. Non esistono valori intermedi. Se serve 13px, è il
  layout a essere sbagliato, non la scala.
- **Raggi**: cinque valori (4, 6, 8, 12, 16, pieno). Un raggio scelto caso per
  caso è la firma di una UI senza sistema.
- **Elevazione**: cinque livelli. Su fondo scuro l'ombra da sola non stacca:
  ogni livello somma un bordo appena percettibile.
- **Movimento**: 80–320 ms. Sopra i 240 ms un gestionale sembra lento, non
  elegante. Serve a spiegare un cambiamento di stato, mai a decorare.
  `prefers-reduced-motion` è rispettato.

---

## 6. Componenti e stati

Ogni componente definisce, quando ha senso: `default`, `hover`, `active`,
`focus-visible`, `disabled`, `loading`, `error`, `success`.

Le classi sono **quelle che il codice storico già usa** — `.btn`,
`.btn-primary`, `.form-control`, `.card`, `.module-header`, `.nav-item`,
`.modal` — non un vocabolario nuovo. È così che 105 sezioni cambiano aspetto
senza essere toccate.

I componenti nuovi che il codice storico non aveva usano il prefisso `ds-`:
`.ds-toast`, `.ds-empty`, `.ds-skeleton`, `.ds-workcenter`, `.ds-switch`,
`.ds-breadcrumb`, `.ds-progress`, `.ds-palette`, `.ds-menu`.

Le superfici della fase 2 vivono in `components/operating-center.css` con
prefissi propri — `.oc` (operating center), `.kpi-card`, `.wc` (work center),
`.pb` (product builder), `.tb` (topbar), `.cp` (command palette) — e i loro
blocchi responsive stanno **accanto alla regola che modificano**, non in una
coda di media query in fondo al foglio. Il motivo è pratico: chi cambia una
scheda KPI deve vedere lì che cosa succede a 1024 px, altrimenti non lo vede
affatto. Il perché di ogni superficie sta in `docs/PHASE-2.md`.

### Il bottone in caricamento non cambia larghezza

`.btn.is-loading` mantiene la propria dimensione e sostituisce il testo con uno
spinner. Un pulsante che si restringe mentre salva fa saltare il layout sotto
il cursore.

### Gli stati vuoti spiegano

`.ds-empty` ha titolo, spiegazione e azione. Uno stato vuoto non è un errore e
non è uno spazio bianco: dice perché è vuoto e cosa fare.

---

## 7. I due ponti

Il pezzo che rende praticabile tutto il resto.

`legacy-bridge.css` ridefinisce i 72 nomi storici come alias dei token
semantici:

```css
--primary:  var(--color-primary);   /* era #fbbf24 */
--bg-card:  var(--color-surface);
--ds-accent: var(--color-primary);  /* il secondo sistema converge qui */
```

I 16.292 stili inline e le 129 patch continuano a funzionare senza essere
toccati, e cambiare la palette del prodotto significa modificare
`semantic.css`, non rincorrere 8.210 letterali.

`admin-bridge.css` fa lo stesso per INGLY Cloud Admin, che aveva una scala
propria (`--bg`…`--bg5`, `--text`…`--text4`, `--accent`, `--r`/`--r2`).

**È un ponte, non una destinazione.** Man mano che un modulo viene migrato, i
suoi riferimenti passano ai token semantici e le righe corrispondenti spariscono
dal ponte. Non si aggiungono mai nomi nuovi a questi due file.

---

## 8. Come il design system vince senza `!important`

Il CSS storico rimasto viene racchiuso in `@layer legacy` al momento del build.
In cascata un layer perde sempre contro il CSS non stratificato: il design
system, che non è in un layer, vince per ogni selettore che ridefinisce, e dove
non dice nulla il CSS storico continua a valere.

`tests/hygiene.test.mjs` verifica che il design system non usi `!important`.
Sono ammesse due eccezioni, entrambe dichiarate nel foglio stesso e nessuna
delle due generica:

1. **Il reset di `prefers-reduced-motion`**, che per annullare animazioni
   dichiarate altrove deve vincere sulla loro specificità qualunque essa sia.
2. **I nodi con lo stile in linea.** Alcune patch costruiscono i propri
   elementi con `style.cssText`, quindi quei nodi portano `display:flex`
   nell'attributo `style`. Un attributo in linea batte qualunque foglio: non
   esiste un selettore, per quanto specifico, che possa nasconderli. L'unica
   alternativa sarebbe rimuovere attributi altrui da JavaScript, che è più
   invasivo, non meno.

La seconda eccezione non è un permesso aperto: ogni occorrenza va marcata con
`/* !important-ok: <ragione> */` immediatamente prima della regola. Il test
ignora solo il blocco così marcato e continua a bloccare ogni altro `!important`
del design system — è più severo di prima, non più permissivo, perché prima
escludeva un intero blocco senza chiedere una motivazione.

Oggi le occorrenze marcate sono due, entrambe in `components/shell.css` e
entrambe per la sidebar in modalità barra a 1024 px: i riquadri di solo testo
creati da JavaScript e le stelline di aggancio. Vedi `docs/PHASE-2.md` §5.

### Debito residuo, misurato

26 patch storiche iniettano CSS a runtime creando un `<style>` in `<head>`.
Quel CSS non è stratificato, quindi per i selettori che tocca vince ancora sul
design system. Tredici dichiarazioni fra le più dannose — quelle che
ridefinivano le voci di menu con l'ambra e l'indaco scritti a mano — sono già
state rimosse. Le altre si migrano insieme ai rispettivi moduli.

---

## 9. Regole

1. **Un colore letterale può stare solo in `primitive.css`.** Verificato dai
   test.
2. **Un componente legge solo dai component token.** Se serve un valore
   semantico, manca una riga in `component.css`.
3. **Non si aggiunge un layer.** Se una regola serve, va nel design system, al
   suo posto. Un `<style>` in fondo al file è come è nato il problema.
4. **Non si aggiungono nomi ai ponti.** I ponti si svuotano, non si riempiono.
5. **Le icone sono icone.** Le emoji restano nei contenuti, non nella chrome.
6. **Il tema si cambia in `semantic.css`.** Se serve toccare altro, la modifica
   è nel livello sbagliato.

---

## 10. Rigenerare i font

`src/design-system/assets/fonts.css` è generato e versionato: il build non ha
mai bisogno di rete.

```bash
npm install          # scarica i pacchetti dei font
node scripts/vendor-fonts.mjs
```

Lo script incorpora Inter (400/500/600/700, sottoinsieme latino) e i soli glifi
Font Awesome effettivamente usati nel codice — 306 su oltre 2.000 — come data
URI. Se aggiungi un'icona nuova, rilancialo.

Licenze: Inter — SIL OFL 1.1 · Font Awesome Free — CC BY 4.0 (icone),
SIL OFL 1.1 (font), MIT (CSS).
