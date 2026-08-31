# Preferiti — una categoria sola, e si vede

## Il censimento

Il sistema esisteva, salvava e migrava. Quel che mancava era **vederlo**.

Contati sul file: **quattro rappresentazioni visive** e **quattro memorie**.

| # | Rappresentazione | Memoria | Stato prima | Chi la nascondeva |
| - | ---------------- | ------- | ----------- | ----------------- |
| 1 | `#nav-favs-group` — la categoria del markup, disegnata da `Favs.render()` | `NavPrefs` · IndexedDB `nav_prefs` | **corretta**, e invisibile | `patches/156`: `#nav-favs-group{display:none!important}` |
| 2 | `#nav-favorites-bar` — barra orizzontale di pastiglie, creata da `NavPrefs._renderFavBar()` | la stessa | duplicato visivo | `patches/156` + `shell.css` + `styles/009` |
| 3 | `#nav-fav-top` — gruppo della patch 156 | la stessa | **visibile, e sbagliato**: spostava i nodi veri | — |
| 4 | `#ng-favourites` — gruppo dell'app shell | `localStorage` `ingly_nav_favs_v1` | sempre vuoto | — |

## La causa

Tre cause sovrapposte, non una.

**1 · La categoria era nascosta da un `!important`.** `patches/156` (v81)
nascondeva `#nav-favs-group` per sostituirla con `#nav-fav-top`.

**2 · Il sostituto spostava le voci invece di disegnarne le scorciatoie.**
`ensureTop()` creava il contenitore e `pin()` ci **trasferiva dentro il nodo
vero** della voce, lasciando un commento come segnaposto. Due conseguenze:

- la sezione spariva dalla sua categoria d'origine;
- una sezione insieme **preferita e nascosta** veniva portata in cima e poi
  nascosta da `NavPrefs.apply()` — cioè spariva del tutto, proprio nel caso in
  cui il preferito serve di più.

**3 · Il re-render della sidebar cancellava il gruppo.** `src/app-shell/sidebar.js`
riscrive la navigazione con `innerHTML` e conserva una lista di nodi «adottati».
`#nav-favs-group` non era nella lista: al primo re-render spariva. È la causa
che sarebbe rimasta anche dopo aver tolto il `display:none`.

E una quarta, indipendente: la quarta memoria (`ingly_nav_favs_v1`) non veniva
mai scritta — `writeSet` non è mai chiamata con quella chiave in tutto il file.
Un elenco perennemente vuoto che disegnava un gruppo perennemente vuoto.

## Un difetto di dati trovato per strada

La migrazione da `ingly_favs3` girava **a ogni avvio**. Un preferito ereditato
dal vecchio sistema e poi tolto dall'utente **tornava al ricaricamento
successivo**, perché la chiave storica lo conteneva ancora e la fusione lo
rimetteva dentro. Togliere un preferito non funzionava, e sembrava un difetto
di salvataggio.

Il travaso è un'operazione, non uno stato: si fa una volta e `migratoDaFavs3`
lo registra in `nav_prefs`. `ingly_favs3` non si cancella — la compatibilità
storica resta — ma smette di essere una sorgente.

## Come è adesso

**Sorgente unica**: `NavPrefs`, IndexedDB, chiave `nav_prefs`. L'ordine **è**
l'ordine dell'array `favorites`: non c'è un secondo campo che potrebbe
divergere da lui, quindi non c'è niente da tenere allineato.

**Rappresentazione unica**: `#nav-favs-group`, in cima alla navigazione
(`order:-1`), disegnata da `Favs.render()`. La visibilità la decide il
componente — `favorites.length > 0` — non un `!important` in un foglio.

Un preferito è una **scorciatoia**: stessa `data-section`, stessa
`App.navigate`, etichetta e icona lette dalla voce originale a ogni giro. La
voce originale non si muove.

```
⭐ PREFERITI · 3
  🖨  Smart Quoter 3D        ▲ ▼ ★
  🔧  Laser · Catalogo B2B   ▲ ▼ ★
  🏭  Magazzino          👁̸ ▲ ▼ ★
─────────────────────────────
  … il resto della navigazione, con le voci ancora al loro posto
```

Il simbolo dell'occhio barrato marca una sezione nascosta dal menu che resta
raggiungibile da qui: nascondere dal menu quel che si usa di rado senza
perderne l'accesso rapido.

## Che cosa resta di ogni vecchio pezzo

| Pezzo | Adesso |
| ----- | ------ |
| `NavPrefs` | **sorgente di verità**, invariata nel formato |
| `nav_prefs` (IndexedDB) | la memoria, più il contrassegno `migratoDaFavs3` |
| `ingly_favs3` | conservato, assorbito una volta sola, non più letto |
| `Favs.getFavs/togglePin` | alias che inoltrano a `NavPrefs` (li chiamano `onclick` scritti nel markup) |
| `_renderFavBar` | disegna solo «n sezioni nascoste · Ripristina» |
| `#nav-favorites-bar` | non viene più creato; se ne resta uno in pagina, viene rimosso |
| `#nav-fav-top` | ritirato |
| `#ng-favourites` + `ingly_nav_favs_v1` | ritirati |
| `patches/156` | conserva le icone SVG e la fine del tremolio |
| `v4_cm_favs` (patch 120) | **non è un duplicato**: sono le macchine preferite del Calcolatore Macchine, un altro concetto |

## Collaudo

`tests/qa/favorites-sidebar.mjs` — 57 controlli sulla pagina vera: migrazione,
zero/uno/cinque preferiti, aggiunta e rimozione immediate, identità della
`data-section`, etichetta dalla voce originale, ordine e riordino, «metti in
cima», nascosto + preferito, ricerca, cento `apply()` di fila, staleness,
accessibilità, sidebar stretta, tema, e la persistenza provata **ricaricando
davvero la pagina**.


## Una regressione introdotta e chiusa

Il collaudo `duplicati.mjs` l'ha trovata prima che uscisse: dopo cinque cicli
completi, **5 voci con due stelle** e **5 sezioni presenti due volte**.

Due cose diverse, e solo la prima era un difetto.

**Difetto.** `NavPrefs._addNavControls()` iterava `.nav-item[data-section]`
senza ambito, quindi metteva la stella al passaggio e il «nascondi» **anche
sulle scorciatoie** — che hanno già i propri comandi. Due stelle sulla stessa
riga. Corretto: `renderSectionActions` disegna le azioni di una **voce di
menu**, e una scorciatoia non è una voce di menu.

**Assunzione da aggiornare.** «La stessa sezione due volte» era una
duplicazione finché l'unico modo di avere due nodi era un errore. Una
scorciatoia porta la stessa `data-section` per definizione. Il collaudo adesso
le conta separate — e il presidio non si allenta, si affila: le voci di menu
devono restare uniche, le scorciatoie non devono ripetersi fra loro, ognuna
deve puntare a una sezione che nel menu **esiste** (una scorciatoia verso il
nulla è un difetto quanto un doppione), e nessuna deve portare i comandi di una
voce di menu.

```
all'avvio          voci 112 · scorciatoie 0
dopo 5 cicli       voci 112 · scorciatoie 5 · ripetute 0 · orfane 0
```


## Esito

```
npm run verify   217 file JS · 0 errori
npm test        1089 test · 1089 pass · 0 fail
npm run qa        25 suite · 496 controlli · 0 fail · 0 errori JavaScript
```

Zero memorie duplicate dei preferiti, zero sezioni preferiti duplicate a
schermo.

**FAVORITES SIDEBAR — COMPLETE**
