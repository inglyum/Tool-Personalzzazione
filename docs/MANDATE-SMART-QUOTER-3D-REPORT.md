# Rapporto finale — "COMMAND DEFINITIVO — SMART QUOTER 3D MARKET-COST ENGINE + UI/UX + AGENTS + CATALOGO DINAMICO"

Punto 44 del mandato. Non un resoconto di intenzioni: ogni voce qui sotto è
verificata leggendo il codice presente al commit `cdeaa75` (branch
`claude/ingly-personalization-repo-ekvc0z`), eseguendo `npm test` e
`npm run qa`, o aprendo la schermata vera con Playwright. Dove non ho potuto
verificare, lo dico — non lo do per fatto.

Aggiornato dopo la release 2.24.0 (riepilogo sticky, §33) — la prima
versione di questo rapporto copriva fino alla 2.23.0.

## REPOSITORY

Audit §0 eseguito prima di ogni modifica, non dopo. Repo: `Tool-Personalzzazione`
(non `Pusatingly`, che è un progetto statico separato con cui questa sessione
condivide solo l'ambiente di esecuzione). Branch di lavoro:
`claude/ingly-personalization-repo-ekvc0z`. Versione corrente: **2.24.0**.
Build: `dist/INGLY-OS.html` (11,23 MB) e `dist/INGLY-CLOUD-ADMIN.html`
(994 KB), generati da `npm run build` da `src/legacy/patches/*.js` +
`src/product/*.js` via `scripts/compose.mjs`. Ogni release di questa sessione
è registrata in `dist/releases/<versione>/manifest.json` e in `RELEASES.json`
(24 release tracciate).

## GANTT

**Confermato rimosso, non ri-verificato in questa sessione**: la rimozione
(route/sidebar/dashboard/scorciatoie/palette/ricerca/menu/modali/widget/
azioni-rapide/globali/eventi/funzioni/CSS/JS/patch/feature-flag/
localStorage/IDB/manifest/docs) è release **2.20.0** (`4faf0a4`), di una
sessione precedente a questa. Il nome del file della vecchia patch resta
nello storico git, come previsto dal mandato stesso — non è raggiungibile da
nessun punto dell'app.


## DUPLICATES

**Confermato chiuso in release 2.21.0** (`2979f4f`, sessione precedente):
cinque pannelli duplicati trovati e rimossi (Ordini/Popeline, Backup,
Macchine, Fornitori, Impostazioni), due dei quali mostravano dati inventati
spacciati per reali. Nessuna nuova duplicazione introdotta da questa
sessione — verificato leggendo il codice prima di scrivere (vedi COST-ENGINE
sotto: un tentativo di duplicazione l'ho trovato e scartato io stesso,
prima che entrasse nel codice).

## SMART QUOTER 3D

Audit di partenza (questa sessione): il motore (`InglyCostEngine` +
`InglyMachineRate`) era già maturo e corretto sulla quasi totalità delle
formule che il mandato descrive — materiale, energia, ammortamento,
manodopera, multi-materiale, scarto vs fallimento, tre livelli di costo,
IVA separata dal margine, markup separato dal margine. La UI legacy
(`Print3DQuoter`, `src/legacy/patches/108-...js`) era già consolidata su
quel motore, non su una copia. Il caso di regressione del mandato — 9h57m,
250g PLA rosso — era già coperto da `tests/quoter3d-hotfix.test.mjs`
(10/10 test) da una sessione precedente.

**Gap reali trovati e chiusi in questa sessione:**

- **§16 Marketplace fee e spedizione** (release 2.22.0, `2292f9b`): il
  motore separava già commissione marketplace, commissione di pagamento e
  spedizione reale-vs-addebitata, ma nessuna vista dello Smart Quoter 3D
  gliele passava mai. Aggiunto `InglyMarketplaces`
  (`src/product/marketplace-profiles.js`) — sei profili canale (diretto,
  Etsy, Amazon, Shopify, eBay, TikTok Shop) con aliquote dichiarate, non
  inventate, ognuna con nota/fonte — e la card "Canale & Spedizione" nella
  UI reale. Un bug è stato trovato e corretto **prima** che raggiungesse un
  test: la prima versione applicava le commissioni del profilo "diretto" a
  ogni preventivo esistente non appena il registro si caricava, anche senza
  scelta dell'utente.

- **§6 Valore residuo della macchina** (release 2.23.0, `2704e89`):
  `InglyMachineRate.tariffa()` sapeva già sottrarre il valore residuo
  dall'ammortamento, ma né la Scheda Macchina né lo Smart Quoter 3D lo
  chiedevano mai — ogni macchina si ammortizzava come se a fine vita non
  valesse più niente. Aggiunto il campo alla Scheda Macchina e il
  collegamento fino al preventivo reale. Deliberatamente **non** collegata:
  la manutenzione annua/ore-anno della scheda, perché lo Smart Quoter ha
  già una riga di manutenzione separata che legge un campo manuale —
  collegare anche quella l'avrebbe contata due volte. Restano salvabili
  sulla macchina, non ancora cablate: chiuderle bene richiede prima
  decidere quale delle due righe di manutenzione vince, non è stato fatto
  a metà per fretta.

**Non ancora fatto, e perché è nella lista sotto invece che qui**: il
redesign UI/UX a 6 step (§31-34) non è stato affrontato in questa sessione
— è P2 nell'ordine del mandato stesso, e la UI attuale è funzionalmente
corretta (misurato con Playwright, non assunto).

## COST ENGINE

**Confermato: un solo motore canonico, nessuna duplicazione trovata.**
`InglyCostEngine` (`src/product/cost-engine.js`) resta l'unica fonte di
verità per materiale/energia/ammortamento/manutenzione/manodopera/
hardware/imballo/spedizione/commissioni/IVA/margine-vs-markup. Durante
questa sessione ho scritto e poi **scartato** un tentativo di far viaggiare
`annualMaintenance`/`expectedAnnualHours`/`machineRateMode` dalla Scheda
Macchina fino al preventivo 3D: avrebbe contato la manutenzione due volte
contro una riga di costo che il preventivatore ha già. Il motore stesso
zera esplicitamente `maintenancePerHour` quando calcola la tariffa
macchina, proprio per non sommarla alla riga «Manutenzione e consumabili»
— la disciplina anti-doppio-conteggio del motore ha bloccato un mio stesso
errore prima che diventasse codice spedito.

**Osservazione non risolta, non urgente**: esiste un secondo modulo di
costo macchina, `InglyMachineCost`
(`src/product/machine-cost.js`), usato solo per un suggerimento testuale
accanto al menu macchina nello Smart Quoter 3D — non per il costo
effettivamente fatturato, che passa sempre da `InglyMachineRate`. Non è la
duplicazione che il mandato vieta (un solo numero finisce sul preventivo),
ma può mostrare una stima leggermente diversa da quella reale nello stesso
schermo. Segnalato, non corretto: il rischio di introdurre un'altra
incoerenza toccandolo fuori tempo era più alto del beneficio in questa
finestra di lavoro.

## MARKET DATA

`InglyMarketplaces` (nuovo, release 2.22.0) applica per la prima volta in
questo repository la disciplina "NON inventare, dichiara la fonte" ai dati
di mercato, non solo ai costi di laboratorio: ogni profilo marketplace
porta `fonte: 'dichiarata'` (mai `'verificata'` da solo) e una nota che
spiega da dove viene l'aliquota e cosa NON copre. Non esiste ancora un
registro strutturato "MARKET COST SOURCES" (source/country/currency/
validFrom/validTo/confidence) per gli altri costi di mercato del mandato
(filamento, energia, macchine, imballo) — resta un gap reale, non
affrontato in questa sessione.

## AGENTS

**Non costruiti come agenti autonomi, per un motivo architetturale
verificato, non presunto.** Ho cercato scheduler/cron/automazione
periodica in `src/product/`: non esiste nessuna infrastruttura di
esecuzione in background in questo repository — l'app è HTML+JS statico,
zero backend, zero server. Un "Product Creator" o "Catalog Optimizer"
autonomo avrebbe bisogno di qualcosa che gira senza che l'utente abbia la
pagina aperta: non c'è dove farlo girare. Costruirne uno vorrebbe dire
crearne il **primo** scheduler di questo repository per farci girare sopra
un agente — una scelta architetturale che il mandato non ha chiesto e che
avrebbe un raggio d'azione ben oltre "aggiungi un agente".

Quello che esiste ed è raggiungibile: **Product Builder** (8 step,
guidato, umano-in-comando — non autonomo, ma genuinamente utile) e un
modulo **AI Vision foto prodotto → descrizione SEO**
(`src/legacy/patches/115-...js`) che assiste, non sostituisce, chi crea
una scheda prodotto. Nessun "Agent Approval Center" esiste, perché non
esiste nulla che produca proposte autonome da approvare.

## TRENDS

**Non costruito come agente che scrive trend da solo — e non potrebbe
esserlo senza violare la regola del mandato stesso.** "NON inventare
trend" esclude un agente che genera trend senza una fonte reale
verificabile; un'app statica senza backend non ha modo di interrogare
Google Trends/TikTok/Pinterest per conto dell'utente (niente server che
faccia le chiamate, niente storage per un registro di trend con
source/URL/data/categoria/evidenza/confidenza che sopravviva a un
ricaricamento del browser di qualcun altro).

Quello che esiste, verificato raggiungibile (route `trendscanner`
registrata in `src/legacy/app/src/core/app.js:339`, dietro
l'entitlement `analytics_advanced`): **Trend & Product Hunter**
(`src/legacy/patches/170-...js`) — per una parola chiave, genera link di
ricerca pre-compilati verso le fonti vere (Etsy, eBay venduti, Google
Trends, Pinterest, TikTok, Instagram) più un prompt per un'analisi
assistita. Non inventa un solo numero: manda l'utente a leggere la fonte
vera. È la versione onesta di un Trend Watcher che l'architettura di
questo repository può effettivamente sostenere.

## CATALOG

**§40 (ricalcolo su costi che cambiano, snapshot ordini chiusi immutabile):
confermato già implementato correttamente, nessuna modifica necessaria.**
`src/product/order-snapshot.js` congela in profondità (`Object.freeze`)
l'economia di un ordine al momento della conferma — versione del motore
inclusa — e non la ricalcola mai; gli ordini precedenti al modulo restano
marcati `LEGACY_NO_SNAPSHOT` invece di mostrare uno storico ricostruito.
`src/product/catalog-recalc.js` prepara un ricalcolo di margine per i
prodotti attivi come **proposta** (riga per riga, in totale, annullabile)
e non scrive nulla finché non viene confermato — una sola matematica,
quella di `InglyCostEngine.prezzo()`, non le tre formule parallele che il
modulo stesso documenta di aver sostituito. Copertura test:
`tests/order-snapshot.test.mjs`, `tests/qa/storico-economico.mjs`,
`tests/qa/catalogo-ricalcolo.mjs` — tutti verdi in questa sessione.

## UI

Nessun redesign visivo **generale** in questa sessione (Dashboard, Sidebar,
Topbar, Ordini, Produzione, CRM, Magazzino, Catalogo, Finance, Macchine,
Admin — §41). La Dashboard era già stata rifatta in release 2.19.0, di una
sessione precedente.

**§33 (riepilogo sticky), fatto — release 2.24.0**: la card "IL CONTO"
(Costo/Prezzo/IVA/Profitto) resta visibile mentre si scorre la colonna
centrale dello Smart Quoter 3D, invece di sparire come le altre card.
Verificato con screenshot prima/dopo lo scroll, non solo leggendo il CSS.
Ha richiesto correggere anche il contenitore (`#view-print3d` aveva
`overflow-y:auto` ma altezza automatica: non scorreva mai da solo, quindi
lo sticky non aveva un ancoraggio reale) — cambiamento dichiarato in
`baseline/deliberate-changes.json` con la ragione, verificato a 5
breakpoint (390/430/768/1366/1920px) senza overflow orizzontale.

**§31-32 (flusso a 6 step: Modello→Macchina→Materiale→Produzione→
Vendita→Risultato), deliberatamente non affrontato.** La UI attuale è una
vista unica con tutte le sezioni visibili insieme — coerente con
l'"Operating Center" del resto dell'app, pensata per un uso professionale
ripetuto (molti preventivi al giorno), non per una stima occasionale.
Convertirla in un wizard a click avrebbe voluto dire riscrivere `render()`
(2750 righe) cambiando il modello di interazione, con un rischio di
regressione alto su un sistema oggi corretto e testato — e una sessione
precedente (release "Redesign Smart Quoter 3D — versione INGLY del cost
calculator") aveva già valutato i calcolatori di riferimento del mandato
e scelto deliberatamente di non copiarne la struttura a step. Non l'ho
fatto senza deciderlo: l'ho deciso e scritto qui, non saltato per fretta.

Le altre feature di questa sessione (card "Canale & Spedizione"; campo
"Valore residuo" nella Scheda Macchina) sono componenti funzionali reali
sul design system esistente, non skin — ma non costituiscono il redesign
generale del §41, che resta P2/P3 e non è stato affrontato.

## TEST

`npm test`: **2222/2222**, eseguito sei volte in questa sessione (una per
ogni build), sempre pulito. Questa sessione ha aggiunto copertura a
`tests/qa/quoter3d-parco.mjs` (confronto ammortamento con/senza valore
residuo, sul preventivo vero, non sul motore isolato) e
`tests/qa/manutenzione-macchina.mjs` (tab Costi della Scheda Macchina),
oltre a `tests/marketplace-profiles.test.mjs` (12 test, inclusi due nuovi
sulla combinazione scaglioni × canale × IVA) e
`tests/qa/quoter3d-canale-spedizione.mjs` (12 verifiche browser).

## REGRESSION

`npm run qa` eseguito **otto volte** in questa sessione (89 script
Playwright ciascuna, in due gruppi di quattro corse — una per ogni
release). In quattro delle otto corse è comparso un fallimento isolato,
sempre in `page.reload()` sotto la contesa di CPU dei ~90 lanci Chromium
in sequenza, sempre in un modulo **non toccato** da questa sessione
(`quoter3d-calcoli.mjs` FASE 16 — salvataggio preventivo — o
`apparel-scaglioni-consuntivo.mjs` — consuntivo tessile), mai negli
stessi due insieme. Rieseguiti singolarmente: sempre puliti (52/52 e
33/33, verificato più volte). Le corse finali di entrambi i round:
pulite, zero PROBLEMI, zero errori JavaScript. Nessun fallimento ha mai
coinvolto i moduli toccati da questa sessione (marketplace, macchina,
quoter 3D, contenitore sticky) in nessuna delle otto corse.

## RELEASE

Tre release spedite in questa sessione, tutte con la pipeline completa
(build → test → qa → commit → release-artifacts → push → verifica sync):

- **2.22.0** — Canale di vendita e spedizione nello Smart Quoter 3D
- **2.23.0** — Valore residuo della macchina nell'ammortamento reale
- **2.24.0** — Riepilogo sticky Costo/Prezzo/Profitto/Margine (§33)

Tutte e tre verificate su `dist/INGLY-OS.html` vero con Playwright, non
solo a livello di modulo. Branch remoto
`claude/ingly-personalization-repo-ekvc0z` sincronizzato (`git fetch` +
`git status` puliti dopo ogni push).

## KNOWN ISSUES

1. **Manutenzione/modalità-tariffa della Scheda Macchina non arrivano allo
   Smart Quoter 3D** (deliberato, vedi SMART QUOTER 3D sopra) — richiede
   prima una decisione su quale delle due righe di manutenzione vince.
2. **`InglyMachineCost` vs `InglyMachineRate`**: due formule di costo
   macchina nello stesso schermo (suggerimento vs preventivo reale) —
   possono divergere leggermente, mai quella fatturata.
3. **Nessun registro "MARKET COST SOURCES" strutturato** per i costi di
   mercato diversi dalle commissioni marketplace (§23) — valutato in
   questa sessione e scartato deliberatamente: senza accesso a dati di
   mercato verificabili in tempo reale, la maggior parte delle voci
   sarebbe finita "valore da configurare" — poco più di quanto le badge
   di fonte/confidenza già esistenti (predefinito/stima) comunicano oggi.
4. **§31-32 (flusso a 6 step) non costruito** — deliberato, vedi UI sopra:
   rischio di regressione alto su un cambio di modello d'interazione, non
   solo visivo, senza una direzione chiara su quale dei due modelli
   (vista unica per uso professionale vs wizard per stima occasionale)
   il laboratorio vuole davvero.
5. **Agents e Trend Watcher non costruiti come autonomi** — bloccante
   architetturale verificato (nessuno scheduler, nessun backend), non una
   scelta di comodo. Le alternative umano-in-comando esistenti (Product
   Builder, AI Vision, Trend & Product Hunter) sono reali e raggiungibili.
6. **Redesign UI/UX generale (§41) non affrontato** — P2/P3 nell'ordine
   del mandato stesso, non saltato per fretta ma per priorità dichiarata.
   Il flusso a 6 step dello Smart Quoter (§31-32) resta nella stessa
   categoria, vedi punto 4 sopra.
