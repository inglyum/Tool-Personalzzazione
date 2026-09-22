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

26 patch storiche nominate iniettano (o iniettavano) CSS a runtime creando un
`<style>` in `<head>`, non stratificato — per i selettori che tocca vince
ancora sul design system. Tredici dichiarazioni fra le più dannose — quelle
che ridefinivano le voci di menu con l'ambra e l'indaco scritti a mano — sono
già state rimosse. Mappatura completa (2.17.0): di quelle 26, quattro
(147/156/158/159) sono già escluse dal build tramite
`RETIRED_SIDEBAR_PATCHES` in `src/app-shell/index.mjs`, sostituite
dall'app-shell generato — non compilano più, non è debito da migrare, solo da
disimparare dal conteggio. La 117 è in gran parte già migrata (2.15.0,
2.16.0). Delle restanti ~20, molte toccano `#sidebar`/`#topbar` e dipendono
dall'ordine di caricamento reciproco per sapere chi vince in cascata:
migrarne una senza le altre rischia di cambiare silenziosamente quale regola
vince per un selettore condiviso — si migrano una alla volta, cominciando da
quelle senza sovrapposizioni. La prima, patch 160 («Consolidatore
Strumenti», `.ingly-tools*`), è migrata nel 2.17.0. Le altre si migrano
insieme ai rispettivi moduli.

**Trovata nella stessa mappatura, non ancora corretta**: la patch 139
(«design system consolidato fase 4») definisce le proprie `.ds-toast`,
`.ds-modal`, `.ds-btn` ecc. tramite `window.DS`, iniettate a runtime — nomi
identici a componenti reali del design system (`src/product/ui.js` crea
elementi con `class="ds-toast ds-toast--…"` usando gli stessi nomi). Non è
solo debito da migrare: è una collisione di nomi attiva, la stessa classe di
difetto «due sistemi, un nome» già vista altrove in questo progetto. Dieci
altre patch (140,141,143,145,149,151,152,153,155,157) dipendono da
`window.DS`, quindi non è la prima da toccare (rischio ampio), ma è la più
urgente da programmare.

### Due barre in alto, trovato con un vero screenshot (2.7.0)

L'audit visivo — aprire davvero l'app e guardare lo schermo, non solo il
codice — ha trovato due barre impilate su ogni pagina: la topbar
principale e, sopra di essa, una «barra enterprise» (`#saas-session-bar`,
piano/brand/uscita) che ogni account nuovo vede sempre, perché ogni
account nasce con un abbonamento attivo (mai una prova). La barra
enterprise duplicava ricerca, notifiche e impostazioni della topbar
principale — due campane, due ricerche, due modi di aprire Impostazioni
— e il suo breadcrumb non si è mai aggiornato: la funzione che lo doveva
agganciare a `App.navigate` non viene chiamata da nessuna parte (un'altra
funzione con un nome quasi identico lo è, ma è un'altra funzione — la
stessa classe di difetto già vista altrove in questo progetto).

Rimossi dalla barra enterprise ricerca, notifiche e impostazioni — tre
funzioni già raggiungibili, meglio, dalla topbar principale — e il
breadcrumb rotto. Restano solo le funzioni che quella barra offre e la
topbar no: identità del laboratorio, piano e scadenza, White Label,
uscita. `tests/qa/topbar-enterprise-non-duplicato.mjs` verifica che
restino e funzionino davvero (click veri su White Label e su Esci).

**Non ancora deciso**: se le due barre debbano diventare una sola, o se
la barra enterprise debba restare una striscia d'identità sopra la
topbar (un pattern comune nei prodotti SaaS multi-tenant). Unirle
davvero è una decisione di layout, non un difetto da correggere di
corsa — la duplicazione funzionale, quella sì, era un difetto, ed è
quella che questo rilascio chiude.

### Colori a caso nelle KPI del CRM (2.8.0)

Stesso audit visivo, difetto successivo: la vista CRM Clienti disegnava
le sue schede KPI con colori esadecimali letterali, diversi scheda per
scheda — otto tinte in tutto fra la riga in alto e il riquadro
preventivi (`#6366f1`, `#10b981`, `#f59e0b`, `#ec4899`, poi `#3b82f6`,
`#22c55e`, `#16a34a`, `#78716c`). Nessuna di quelle tinte era uno stato
(successo/allerta/pericolo): erano scelte arbitrarie, la stessa
violazione di «colori casuali» già evitata altrove nel prodotto.

Il componente giusto esisteva già — `.kpi-card`/`.kpi-label`/
`.kpi-value` in `components/surfaces.css`, quello che la Dashboard usa —
apposta perché «il valore è il contenuto […] niente sfondi colorati».
Le due righe KPI del CRM (`CRMSmart._buildHTML`,
`CRMSmart._kpiPreventivi`) ora usano quel componente invece di comporre
ogni volta uno stile inline con colore letterale.

### Il secondo pannello notifiche non era solo un duplicato (2.9.0)

Il 2.7.0 aveva tolto dalla barra enterprise il pulsante che apriva un
secondo pannello notifiche, documentandolo come duplicazione visiva del
vero campanello della topbar. Vero, ma incompleto: quel pannello era
anche l'unico lettore di `ingly_saas_db.notifications`, il canale con
cui l'Admin manda messaggi in-app a un utente (es. scadenza licenza).
Tolto il pulsante senza spostare quella lettura, il canale è rimasto
scritto ma mai letto — non più una duplicazione: un buco.

Corretto migrando la lettura nell'unico pannello vero (`Notifications`
in `settings/index.js`), non resuscitando il secondo. La lezione per il
resto del debito di questa sezione (il `#topbar` da 60+ elementi, ancora
da toccare): prima di rimuovere qualunque superficie duplicata bisogna
verificare se porta anche un dato che nessun altro legge, non solo se
sembra ridondante a schermo.

### Emoji come icona di un'azione, non di un contenuto (2.14.0)

La regola 5 di questo documento dice «le icone sono icone, le emoji
restano nei contenuti, non nella chrome». La navigazione e la palette
comandi la rispettavano già. La riga cliente del CRM (`cliente-riga.js`,
il renderer unico usato da rubrica e archivio — vedi CRM-05) no: i tre
pulsanti azione — WhatsApp, Modifica, Elimina — erano emoji (`💬 ✏️ 🗑`),
e «Elimina» portava anche un rosso scritto a mano (`#ef4444`) invece del
token `--color-danger`. Stesso difetto, stesso file, nella card «Economia
ordine» (`order-economics-view.js`): i due pulsanti riga (modifica/rimuovi
voce) erano emoji, e le quattro celle che coloravano profitto/margine in
verde o rosso secondo il segno usavano `#22c55e`/`#ef4444`/`#f59e0b`
letterali — un verde e un rosso leggermente diversi da `--color-success`/
`--color-danger` già in uso ovunque nel resto del prodotto.

Corretto sostituendo le tre emoji-azione con `<i class="fas fa-*">`
(`fa-whatsapp`, `fa-pen`, `fa-trash` — il glifo `fa-pen` non era ancora
incorporato, aggiunto rilanciando `scripts/vendor-fonts.mjs`) e i colori
letterali con i token di stato già esistenti (`--color-success-text`,
`--color-warning-text`, `--color-danger-text`, `--color-danger-surface`,
`--color-danger-border`). Il verde di WhatsApp non è uno stato
dell'applicazione — è l'identità di un servizio terzo — quindi non poteva
diventare `--color-success`: gli è stato dato il suo primitivo dedicato,
`--brand-whatsapp`, con la stessa regola degli altri colori letterali
(vive solo in `primitive.css`, il resto lo referenzia).

Non toccate le icone tecnologia di `quote-templates.js`
(`⚡ 🧊 🖨️ 👕 🌈 🪧 🎁 📋`): quella stessa stringa `icona` finisce anche
dentro un `<option>` di un `<select>` nativo (`quoter/index.js`), che non
può renderizzare un tag `<i>` — comparirebbe come testo letterale. Qui
l'emoji non è un difetto della chrome, è un vincolo tecnico del controllo
che la ospita, e coincide comunque con la regola 5: sono icone di
categoria (contenuto), non di un'azione dell'interfaccia.

### Due barre in alto, la decisione presa (2.15.0)

Il rilascio 2.7.0 aveva chiuso la duplicazione funzionale fra topbar
principale e barra enterprise (`#saas-session-bar`), lasciando aperta una
domanda di layout: se diventare una barra sola o restare due, «un pattern
comune nei prodotti SaaS multi-tenant».

**Decisione**: restano due. La barra enterprise non è una topbar
duplicata — è una striscia d'identità (laboratorio, piano, scadenza,
White Label, uscita) sopra la topbar operativa (ricerca, comandi rapidi,
notifiche, tema). Fonderle in una sola avrebbe richiesto una riscrittura
di layout con un raggio d'azione molto più ampio del difetto reale
verificato qui, contro il mandato di non riscrivere.

**Trovato invece con uno screenshot vero**: la barra enterprise usa
`--eh-brand` come **sfondo intero**, e `src/product/tema.js` lo impostava
identico all'accento (`'--eh-brand': a`) — lo stesso valore di
`--color-primary`. Il risultato, su qualunque installazione anche senza
White Label configurato: un pannello ciano a piena saturazione largo
tutto lo schermo, esattamente ciò che la regola d'identità di questo
documento vieta («il ciano è un accento… non è un colore di riempimento»,
§3). Non era una scelta — era la stessa variabile riusata per due scopi
diversi (colorare un bottone, riempire un pannello) che a piena
saturazione si comportano in modo opposto.

Corretto in `tema.js`: `--eh-brand` deriva ancora dall'accento (cambia
quando l'utente lo cambia, e un White Label brand color vero lo
raggiunge) ma stemperato nell'antracite del marchio (`mescola('#1f2328',
accento, 0.22)`) invece di sostituirlo — la barra resta riconoscibile
come identità del laboratorio senza diventare un pannello acceso. Stesso
giro, tokenizzati anche gli stati della barra che erano ancora colori
letterali: pallino di stato (successo/attenzione/errore), badge
notifiche, pulsante uscita, avviso di scadenza, pulsante «Ripristina» del
modulo White Label — tutti sui token `--color-success/-warning/-danger`
già in uso nel resto del prodotto, non più `#10b981`/`#f59e0b`/`#ef4444`
scritti a mano.

**Debito misurato, non chiuso qui**: la barra resta un `<style>` iniettato
a runtime con diversi `!important` e con il badge di piano per livello
ancora su colori letterali (indigo/viola/ambra/ciano/verde per
starter/pro/business/enterprise/lifetime) — è una scala categoriale per
livello di piano, non uno stato semantico, e non ha ancora un proprio
set di token: si aggiunge insieme alla mappa dei cinque cataloghi piano
già documentata in `docs/RELEASE-SAAS-BILLING-ACCESS-CONTROL.md` §3,
non qui. L'avatar e l'intero modale White Label, dichiarati debito nel
2.15.0, sono stati tokenizzati nel 2.16.0 — vedi sotto.

### Avatar e modulo White Label: lo stesso indigo dimenticato in due posti (2.16.0)

Chiusura diretta del debito dichiarato sopra. Due colori letterali,
entrambi lo stesso vecchio indigo `#6366f1` che l'accento predefinito
aveva già smesso di essere: il gradiente dell'avatar utente
(`#6366f1 → #a855f7`, indipendente da qualunque accento il laboratorio
avesse scelto — con «Rosso» attivo l'avatar restava comunque indigo) e
il pulsante «Applica» del modulo White Label. Lo stesso modulo aveva
anche sfondo, bordo, titolo, etichette e campi su una dozzina di altri
letterali, indipendenti dal resto del prodotto.

Tokenizzati: l'avatar su `--color-primary`/`--color-primary-active` (ora
segue davvero l'accento), il modale sui component token già usati da
ogni altro modale del prodotto (`--modal-bg`, `--modal-border`,
`--modal-backdrop`) e sui token semantici di superficie/testo; «Applica»
su `--color-primary`/`--color-text-on-primary`, la stessa coppia di ogni
bottone primario dell'app. Verificato con screenshot reali.

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
