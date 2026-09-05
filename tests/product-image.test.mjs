/**
 * product-image.test.mjs — un campo immagine che non rovina l'immagine.
 *
 * Il pannello che esisteva non era riusabile per tre motivi: id fissi (due
 * campi nella stessa pagina si sovrascrivono), un archivio deciso da lui, e
 * l'immagine mescolata a misure che valgono solo per il laser.
 *
 * Le domande di questi test sono due: **un file valido viene rifiutato?** e
 * **un'immagine buona viene peggiorata?**
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const sorgente = fs.readFileSync('src/product/product-image.js', 'utf8');

/** Un ambiente minimo: niente DOM, solo quel che serve alle funzioni pure. */
function ambiente({ immagineCarica = true, larghezza = 100, altezza = 80, canvasRende = true } = {}) {
  const contesto = {
    Math, JSON, Object, Array, Date, Number, String, parseFloat, isFinite, isNaN, Promise, Error,
  };
  contesto.window = contesto;
  contesto.Image = class {
    set src(v) {
      this._src = v;
      queueMicrotask(() => {
        if (immagineCarica) { this.naturalWidth = larghezza; this.naturalHeight = altezza; this.onload && this.onload(); }
        else this.onerror && this.onerror();
      });
    }
  };
  contesto.document = {
    createElement: () => ({
      width: 0, height: 0,
      getContext: () => (canvasRende ? { drawImage() {} } : null),
      toDataURL: () => 'data:image/png;base64,PICCOLA',
    }),
  };
  contesto.FileReader = class {
    readAsDataURL(file) {
      queueMicrotask(() => {
        if (file._illeggibile) this.onerror && this.onerror();
        else this.onload && this.onload({ target: { result: file._dataUrl || 'data:image/png;base64,' + 'x'.repeat(200) } });
      });
    }
  };
  const ctx = vm.createContext(contesto);
  vm.runInContext(sorgente, ctx);
  return ctx.InglyProductImage;
}

const file = (extra = {}) => ({ name: 'foto.png', type: 'image/png', size: 1000, ...extra });

/* ── Formati ────────────────────────────────────────────────────────────── */

test('accetta i formati che un browser sa davvero disegnare', async () => {
  const P = ambiente();
  for (const tipo of ['image/jpeg', 'image/png', 'image/webp', 'image/gif']) {
    const r = await P.daFile(file({ type: tipo }));
    assert.equal(r.ok, true, tipo + ' rifiutato');
  }
});

test('rifiuta un formato che il canvas non legge, e dice quale', async () => {
  const P = ambiente();
  const r = await P.daFile(file({ type: 'image/tiff' }));
  assert.equal(r.ok, false);
  assert.match(r.motivo, /image\/tiff/);
  assert.ok(r.cosaFare, 'un rifiuto senza rimedio è solo un no');
});

test('un file senza tipo non passa per errore', async () => {
  const P = ambiente();
  const r = await P.daFile(file({ type: '' }));
  assert.equal(r.ok, false);
});

test('nessun file non è un errore da gridare', async () => {
  const P = ambiente();
  const r = await P.daFile(null);
  assert.equal(r.ok, false);
  assert.match(r.motivo, /nessun file/);
});

/* ── Peso ───────────────────────────────────────────────────────────────── */

test('un file enorme viene rifiutato prima di leggerlo', async () => {
  const P = ambiente();
  const r = await P.daFile(file({ size: 50 * 1024 * 1024 }));
  assert.equal(r.ok, false);
  assert.match(r.motivo, /troppo grande/);
});

test('il limite di peso è configurabile da chi monta il campo', async () => {
  const P = ambiente();
  assert.equal((await P.daFile(file({ size: 2000 }), { pesoMax: 1000 })).ok, false);
  assert.equal((await P.daFile(file({ size: 500 }), { pesoMax: 1000 })).ok, true);
});

test('un file illeggibile viene detto, non fatto passare', async () => {
  const P = ambiente();
  const r = await P.daFile(file({ _illeggibile: true }));
  assert.equal(r.ok, false);
});

/* ── Il formato si conserva ─────────────────────────────────────────────── */

test('un immagine piccola non viene ricompressa: peggiorarla non serve', async () => {
  const P = ambiente({ larghezza: 200, altezza: 150 });
  const originale = 'data:image/png;base64,' + 'y'.repeat(500);
  const r = await P.daFile(file({ _dataUrl: originale }));
  assert.equal(r.ok, true);
  assert.equal(r.immagine.dataUrl, originale);
  assert.equal(r.immagine.ridotta, false);
});

test('un immagine grande viene ridotta, e lo dichiara', async () => {
  const P = ambiente({ larghezza: 4000, altezza: 3000 });
  const r = await P.daFile(file({ _dataUrl: 'data:image/png;base64,' + 'y'.repeat(5000) }));
  assert.equal(r.ok, true);
  assert.equal(r.immagine.ridotta, true);
  assert.ok(r.immagine.larghezza <= P.LATO_MAX);
  assert.ok(r.immagine.altezza <= P.LATO_MAX);
});

test('ridimensionando si mantengono le proporzioni', async () => {
  const P = ambiente({ larghezza: 4000, altezza: 2000 });
  const r = await P.daFile(file({ _dataUrl: 'data:image/png;base64,' + 'y'.repeat(5000) }));
  const rapporto = r.immagine.larghezza / r.immagine.altezza;
  assert.ok(Math.abs(rapporto - 2) < 0.02, 'proporzioni cambiate: ' + rapporto);
});

test('un GIF non viene ridisegnato: perderebbe l animazione', async () => {
  const P = ambiente({ larghezza: 4000, altezza: 3000 });
  const originale = 'data:image/gif;base64,' + 'y'.repeat(5000);
  const r = await P.daFile(file({ type: 'image/gif', _dataUrl: originale }));
  assert.equal(r.immagine.dataUrl, originale);
  assert.equal(r.immagine.ridotta, false);
});

test('se il ridimensionamento non guadagna spazio si tiene l originale', async () => {
  /* Succede con le immagini già molto compresse: il canvas ne produce una più
     pesante, e sostituirla sarebbe un peggioramento silenzioso. */
  const P = ambiente({ larghezza: 4000, altezza: 3000 });
  const originale = 'data:image/png;base64,z';   // più corta di quel che rende il canvas finto
  const r = await P.daFile(file({ _dataUrl: originale }));
  assert.equal(r.immagine.dataUrl, originale);
  assert.equal(r.immagine.ridotta, false);
});

test('senza canvas si tiene l originale invece di perdere l immagine', async () => {
  const P = ambiente({ larghezza: 4000, altezza: 3000, canvasRende: false });
  const originale = 'data:image/png;base64,' + 'y'.repeat(5000);
  const r = await P.daFile(file({ _dataUrl: originale }));
  assert.equal(r.ok, true);
  assert.equal(r.immagine.dataUrl, originale);
});

test('un immagine che il browser non carica si salva lo stesso, senza dimensioni', async () => {
  /* Le dimensioni sono un dato in più, non una condizione per salvare. */
  const P = ambiente({ immagineCarica: false });
  const r = await P.daFile(file());
  assert.equal(r.ok, true);
  assert.equal(r.immagine.larghezza, 0);
});

/* ── I metadati ─────────────────────────────────────────────────────────── */

test('l immagine porta con sé nome, tipo, peso e data', async () => {
  const P = ambiente();
  const r = await P.daFile(file({ name: 'targa.png', type: 'image/png', size: 1234 }));
  assert.equal(r.immagine.nome, 'targa.png');
  assert.equal(r.immagine.tipo, 'image/png');
  assert.equal(r.immagine.byteOriginali, 1234);
  assert.ok(r.immagine.byte > 0);
  assert.ok(!isNaN(new Date(r.immagine.quando).getTime()));
});

test('il peso si legge in modo comprensibile', () => {
  const P = ambiente();
  assert.equal(P.leggibile(512), '512 B');
  assert.equal(P.leggibile(2048), '2 kB');
  assert.equal(P.leggibile(3 * 1024 * 1024), '3 MB');
  assert.equal(P.leggibile(null), '0 B');
});

/* ── Il campo non decide dove si salva ──────────────────────────────────── */

test('il modulo non scrive in nessun archivio', () => {
  /* È la ragione per cui è riusabile: sei moduli hanno sei archivi diversi.
     Se scegliesse lui, potrebbe vivere in un posto solo. */
  assert.ok(!/localStorage|IDB\.|AppStore/.test(sorgente),
    'il campo immagine non deve conoscere nessun archivio');
});

test('non usa id fissi: due campi nella stessa pagina non si pestano i piedi', () => {
  assert.ok(/\+\+contatore/.test(sorgente), 'ogni istanza deve avere il suo prefisso');
});

test('monta senza nodo non lancia', () => {
  const P = ambiente();
  assert.equal(P.monta(null, {}), null);
});
