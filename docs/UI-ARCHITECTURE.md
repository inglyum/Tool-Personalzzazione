# UI-ARCHITECTURE — come si evita che due moduli disegnino la stessa cosa

> Il difetto più costoso di questo prodotto non è stato un calcolo sbagliato:
> è stato **due moduli che facevano la stessa cosa senza sapersi**.

---

## 1. Il caso che ha insegnato la regola

Ogni voce del menu portava **due stelle**. Non era un errore di CSS: erano due
sistemi completi e indipendenti.

| | `Favs` | `NavPrefs` |
|---|---|---|
| Memoria | `localStorage.ingly_favs3` | `IndexedDB settings/nav_prefs` |
| Controllo | `<span class="nav-pin">☆</span>` | `<div class="nav-ctrl"><button>☆</button><button>👁</button></div>` |
| API | `Favs.togglePin()` | `NavPrefs.toggleFavorite()` / `toggleHide()` |
| Lingua | italiano | inglese |

Presi uno per uno erano **entrambi corretti**: entrambi idempotenti
(`if (!pin)`, `if (el.querySelector('.nav-ctrl')) return`), entrambi stabili
sotto stress. Il difetto nasceva solo dalla loro coesistenza — ed è per questo
che nessun controllo sul singolo modulo lo avrebbe mai trovato.

Peggio dell'estetica: aggiungere ai preferiti da una stella non si vedeva
nell'altra lista, perché scrivevano in due archivi diversi.

**Regola.** Un concetto, una sorgente di verità, una funzione che lo disegna.

---

## 2. Le sorgenti uniche, oggi

| Concetto | Sorgente | Funzione che disegna |
|---|---|---|
| Preferiti e sezioni nascoste | `NavPrefs._prefs` (IndexedDB `nav_prefs`) | `NavPrefs.renderSectionActions(el)` |
| Tassonomia del menu | `src/app-shell/nav-map.js` (dati, non codice) | `InglySidebar.render()` |
| Ricerca e comandi | `InglyData.search()` | `InglyPalette` |
| Costo di una stampa 3D | `InglyPrint3D.cost()` — funzione pura | patch 108 (solo disegno) |
| Lettura dei dati di dominio | `InglyData` (sola lettura) | i componenti di `src/product/` |

Quando un concetto ne acquisisce una seconda, il difetto è già nato: si nota
mesi dopo, in una schermata, e sembra un problema grafico.

---

## 3. Render idempotente, e non distruttivo

Un render deve poter girare mille volte e lasciare lo stesso risultato. Sono
**due** requisiti, e il secondo si dimentica sempre.

**Non duplicare.** Cercare l'istanza prima di crearla:

```js
renderSectionActions(el) {
  const esistente = el.querySelector('.nav-ctrl');
  if (esistente) { /* aggiorna */ return; }
  this._buildNavControls(el, el.dataset.section);
}
```

**Non distruggere.** `InglySidebar.render()` faceva `container.innerHTML = …` e
con quella riga cancellava sette voci di menu aggiunte dalle patch storiche e
la barra dei preferiti. Nessuna duplicazione — una **sparizione**, che il conteggio
dei duplicati non vede.

Ora i nodi che il render non ha creato vengono messi da parte e rimessi: le
barre in cima, le voci estranee in un gruppo «Estensioni» che dice da dove
vengono.

```js
var conservati = ospiti(container);   // ciò che non mi appartiene
container.innerHTML = html;
// … e torna al suo posto
```

---

## 4. Adottare invece di ricostruire

Nove patch aggiungono il proprio pulsante alla topbar **secondi dopo** che è
stata ricostruita. La topbar non li ricrea — sposta i nodi originali, con i
gestori che ci sono attaccati, dentro il menu «Altri strumenti». Un
`MutationObserver` limitato applica la stessa regola ai ritardatari.

Ricostruire un pulsante è il modo più rapido per perdere una funzione che
nessuno ricorda di avere.

---

## 5. Quando invece si rimuove

Si rimuove solo ciò che è stato **verificato morto**, e la verifica va scritta.

`#prox-nav-group` era una seconda navigazione con nove voci. Prima di toglierla:

- nessuna delle nove sezioni aveva una vista nel documento
- `navigateProx` non esisteva
- il gruppo spariva comunque al primo re-render della sidebar

Nove pulsanti che non portavano da nessuna parte. Non è una funzione tolta: è
una funzione che non c'era.

---

## 6. Cosa presidia tutto questo

`tests/qa/duplicati.mjs` misura in tre momenti — all'avvio, dopo tre render
ripetuti, dopo cinque cicli di navigazione con ricerca e preferiti — e fallisce
se un componente esiste in due esemplari, se una voce ha due stelle o due
«nascondi», o se una sezione compare due volte nel menu.

`tests/qa/responsive.mjs` conta le sovrapposizioni reali dentro la sidebar a
cinque larghezze. Vedi `docs/QA-GRAPHICS.md`.
