# Il prezzo dell'energia ha una fonte sola

## Com'era

Il prezzo del kilowattora era scritto a mano in sette posti:

| Dove | Cosa c'era |
| ---- | ---------- |
| `markup/004.html` — Calcolatore Laser | `value="0.28"` |
| `markup/005.html` — Catalogo macchine | `value="0.28"` |
| `patches/108` — Smart Quoter 3D | tre copie: markup del campo e due ripieghi |
| `patches/119` — Calcolatore macchina laser | tre copie |
| `patches/120` — Calcolatore macchine v4 | quattro copie |
| `patches/121` — Laser Quoter B2B | cinque copie |
| `patches/069` — Smart Quote Apparel | due copie |

Cambiare la bolletta significava trovarle tutte. Chi ne trovava sei otteneva
sei preventivi coerenti e uno sbagliato, senza che niente lo segnalasse.

**Una correzione a una misura precedente.** Un `grep` per `0.28` trovava tredici
file, e quel numero è finito in un rapporto. Era sbagliato: contava anche
`kw: 0.280` (i kilowatt di targa di una macchina, che stanno giustamente accanto
al modello), i prezzi di listino dei fornitori che valgono 0,28 € per caso, e
`hourly: 0.28` (€/h di ammortamento). I file che tenevano davvero una copia del
prezzo dell'energia erano sette.

## Com'è adesso

Il prezzo vive in `cost-profiles.js`, accanto alla manodopera e alle spese
generali, e per la stessa ragione: **è un costo del laboratorio, non della
macchina**. La macchina dichiara quanti watt assorbe; il laboratorio dichiara
quanto paga la corrente.

```
InglyCostProfilesStore.ingressoSincrono().kwhPrice
```

Sta nel record `overhead_profiles`, insieme alle ore produttive annue — non è
una nuova tabella e non serve una migrazione dello schema. `salvaEnergia()` e
`salvaOverhead()` si rileggono a vicenda prima di scrivere: salvare la corrente
non deve poter cancellare l'affitto.

### Il valore di partenza si dichiara

0,28 €/kWh resta come punto di partenza, con `confidence: 'estimated'` e un
avviso esplicito. Non è un dato di INGLY, ed è la stessa disciplina che il
modulo applica già alla manodopera: rispondere zero sarebbe peggio, perché zero
sembra un conto finito.

### Chi scrive a mano comanda sul suo preventivo

Ogni schermata resta modificabile: un preventivo può avere un prezzo suo.
La regola è che **quello che coincide col profilo non si salva**. Senza questa
regola il primo ricalcolo scriverebbe in archivio il valore del profilo, e da
quel momento cambiare i profili non cambierebbe più niente — il collegamento
sarebbe esistito solo il giorno in cui è stato scritto. Il Quoter 3D usa la
stessa disciplina della tariffa oraria, con la bandiera `ENERGIA_TOCCATA`.

## Una schermata morta, trovata misurando

Il collegamento del **Calcolatore Laser** (`LaserCalcPage`, in `markup/004.html`
e in `modules/catalog/index.js`) è stato scritto e non serve a niente: la rotta
`lasercalc` la disegna **patch 120**, il Calcolatore Macchine v4, che sostituisce
il contenuto di `#view-lasercalc` agganciandosi a `App.renderSection`.

Tre moduli scrivono in quella rotta e vince l'ultimo che si aggancia:

| Modulo | Origine | Esito misurato |
| ------ | ------- | -------------- |
| Calcolatore Macchine v4 | `patches/120` | **disegna la rotta** |
| Calcolatore macchina laser v2 | `patches/119` | mai visibile |
| LaserCalcPage | `markup/004` + `catalog/index.js` | mai visibile |

Misurato aprendo la sezione in un browser: dopo la navigazione i campi presenti
sono `_f_kwh`, `_f_labor`, `_f_price`… — quelli di patch 120. `lcp-kwh` e
`lc-kwh` non esistono nel documento.

Il collegamento ai profili di `LaserCalcPage` è stato lasciato in piedi: è
corretto e costa nulla, e se un giorno quella schermata tornerà viva tornerà già
collegata. Ma **non è una schermata da sistemare: è una schermata da ritirare**,
e il ritiro appartiene al lavoro sui motori di prezzo duplicati, non a questo.

## Cosa lo verifica

- `tests/energia-fonte-unica.test.mjs` — 32 asserzioni. Fra queste, un controllo
  che conta le copie del prezzo rimaste in ognuno dei cinque preventivatori,
  escludendo i `kw:` di targa e i listini fornitore. È quello che ha trovato tre
  copie che una lettura a occhio aveva mancato in `patches/121`.
- `tests/qa/energia-fonte-unica.mjs` — 22 controlli in un browser vero: si
  dichiara 0,99 €/kWh — un numero che nessun predefinito potrebbe produrre per
  caso — e si controlla che arrivi nello Smart Quoter 3D, nel Calcolatore e nel
  Catalogo macchine, che non venga congelato in `localStorage`, e che un valore
  scritto a mano sopravviva.
