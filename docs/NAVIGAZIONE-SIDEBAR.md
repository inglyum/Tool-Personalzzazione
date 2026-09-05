# Navigazione — la barra mostra l'applicazione

Stato: applicato e verificato su browser (`tests/qa/navigazione-completa.mjs`,
31 controlli, 0 errori JavaScript).

## Il problema misurato

Sulla build precedente, ad applicazione appena aperta:

| Misura | Prima | Dopo |
|---|---:|---:|
| Gruppi chiusi all'avvio | 9 su 9 | 0 su 9 |
| Voci di menu visibili | 35 su 107 | 110 su 110 |
| Altezza della barra / finestra | 1 190 px in 593 | 4 234 px in 593, scorrevole |

Settantadue moduli esistevano, funzionavano, ed erano raggiungibili soltanto
scrivendone il nome nella ricerca. Per scrivere il nome bisogna sapere che il
modulo esiste: sezioni come «Idee & Ispirazione» o «Bank & Funds» erano di
fatto invisibili.

## Le quattro cause, tutte reali

Non era un solo difetto: erano quattro strati sovrapposti, e correggerne uno
solo non cambiava niente sullo schermo.

1. **`collapseAll()` al primo avvio** — la patch
   `093-ingly-os-v37-task-force-best-version.js` chiudeva tutti i gruppi alla
   prima esecuzione e scriveva un contrassegno (`_v37sidebar_done`) perché non
   accadesse più. Chi aveva già avviato l'applicazione si ritrovava la barra
   chiusa per sempre, senza sapere perché. Il blocco è stato rimosso, e
   `NavGroups._migraSeChiusaDaSola()` riapre **una volta sola** chi ha quel
   contrassegno.
2. **`NavGroups.DEFAULT_COLLAPSED`** elencava sei gruppi da chiudere d'ufficio
   (`ng-market`, `ng-mkt`, `ng-ops`, `ng-brand`, `ng-report`, `ng-sistema`):
   id che non esistono più da diverse versioni. L'elenco è ora vuoto — non è il
   programma a decidere che metà applicazione si apre chiusa.
3. **`<details class="nav-more">` chiuso** — le voci non primarie stavano in un
   accordion chiuso, «tanto si trovano con la ricerca». Ora è `open`.
4. **`writeSet` non scriveva niente** — vedi sotto.

## `writeSet`: la memoria che sembrava esserci

```js
localStorage.setItem(key, JSON.stringify([].slice.call(set)));   // sempre "[]"
```

`set` è un `Set`. Un `Set` non ha `length`, e `Array.prototype.slice` su un
oggetto senza `length` restituisce un array vuoto. La scrittura riusciva, il
JSON era valido, il contenuto era sempre `[]`.

Conseguenza: **nessun gruppo compresso a mano è mai sopravvissuto a un
ricaricamento**, in nessuna versione. Il difetto era invisibile perché il
sintomo («si riapre da solo») somigliava a una scelta di progetto.

```js
localStorage.setItem(key, JSON.stringify(Array.from(set)));      // ["production"]
```

Verificato in due punti: `tests/sidebar-memoria-gruppi.test.mjs` esercita le
due funzioni vere estratte dal sorgente; `§4a`/`§4` in
`tests/qa/navigazione-completa.mjs` comprimono un gruppo nel browser,
ricaricano la pagina e lo ritrovano compresso.

**Nota sul gruppo attivo.** `NavGroups.expandFor(section)` apre il gruppo che
contiene la sezione aperta, a ogni navigazione. Al ricaricamento
l'applicazione ritorna sull'ultima sezione, quindi il gruppo che la ospita si
riapre: è il comportamento voluto (si è dentro quel gruppo), non una perdita di
memoria. Per questo il collaudo misura la persistenza su un gruppo diverso da
quello attivo.

## Il pulsante «Nascondi Accesso Rapido»

`#prox-cn-showhide`, creato dalla patch `100`, nascondeva la griglia
dell'Accesso Rapido e ricordava la scelta in `prox_cn_hidden`. Un comando che
fa sparire una parte dell'interfaccia, dentro un menu che già nascondeva i
moduli in gruppi chiusi, aggiunge un modo in più di perdere qualcosa.

È stato **rimosso dalla sorgente** — non nascosto via CSS: spariscono il
pulsante, il suo CSS e la chiave.

Chi lo aveva premuto ha però `prox_cn_hidden = '1'` e `display:none` scritto
nello stile in linea: togliere solo il pulsante gli lascerebbe l'Accesso Rapido
invisibile per sempre, senza più il comando per riaprirlo. Quindi al primo
avvio lo stile si rimette a posto e la chiave si ripulisce, una volta sola.

Il collegamento al Preventivo rapido (`window._ppmOpen`) resta intatto: è
verificato da `§13`.

## Trovare una sezione col nome che si conosce

La stessa sezione ha più di un nome: quello del menu, quello che la sezione
scrive nella propria intestazione, quello con cui la ricerca la restituisce.
Il nome mostrato resta **uno solo** — lo decide `nav-map.js`. Gli altri vivono
accanto, in `aka`, e servono soltanto a farsi trovare: chi cerca «Bank» trova
«Bank & Funds», chi cerca «Ispirazione» trova «Idee & Ispirazione».

## Cosa NON è stato fatto

- Nessuna sezione inventata: le 110 voci esistevano già, erano solo nascoste.
- Nessun `display:none` usato per «togliere» qualcosa.
- Nessun nuovo sistema di navigazione: `InglySidebar` resta il proprietario
  dello stato aperto/chiuso, `NavGroups` continua a delegargli.

## Come si verifica

```bash
npm test                                                   # incluso il round-trip della memoria
node tests/qa/navigazione-completa.mjs dist/INGLY-OS.html   # 31 controlli su browser
```
