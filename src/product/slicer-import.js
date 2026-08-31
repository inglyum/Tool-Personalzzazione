/* ═══════════════════════════════════════════════════════════════════════════
   SLICER-IMPORT — leggere un file di slicer senza mandarlo da nessuna parte
   ═══════════════════════════════════════════════════════════════════════════

   Il file resta sul computer di chi preventiva. Non c'è una `fetch`, non c'è
   un endpoint, non c'è un servizio: il parser gira nella pagina, e questo è
   un requisito, non un dettaglio implementativo — un G-code contiene la
   geometria di un pezzo che spesso è il lavoro di un cliente.

   Due formati, entrambi letti davvero:

   · **G-code** (PrusaSlicer, OrcaSlicer, Bambu Studio, Cura, SuperSlicer).
     I dati stanno nei commenti di testa o di coda. Ogni slicer li scrive con
     una grafia diversa, e le grafie sono dichiarate qui sotto una per una
     invece di essere indovinate con una espressione regolare generica.

   · **3MF** (Bambu Studio, OrcaSlicer, PrusaSlicer). È un archivio ZIP; il
     riassunto della stampa sta in `Metadata/slice_info.config`, XML. Si legge
     la directory centrale dello ZIP e si decomprime la sola voce che serve
     con `DecompressionStream('deflate-raw')`, che il browser ha già: nessuna
     libreria, nessun download.

   ── Che cosa NON fa ────────────────────────────────────────────────────────
   Non somma supporti e spurgo al peso totale. Gli slicer dichiarano quasi
   sempre un totale che li **comprende già**, e sommarli è il doppio conteggio
   più comune di questo mestiere. Qui si restituisce quel che il file dice, con
   l'etichetta di che cosa comprende, e la decisione resta al preventivatore.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };

  function vuoto(motivo) {
    return {
      ok: false, motivo: motivo || 'file non riconosciuto',
      grammiTotali: 0, grammiModello: 0, supporti: 0, purge: 0,
      ore: 0, materiali: [], costo: 0, comprendeTutto: true,
    };
  }

  /* ── Le grafie del G-code ─────────────────────────────────────────────────
     Ogni riga è una grafia vera vista in un file vero, non una supposizione.
     `chi` serve a dichiarare da dove viene il dato, perché quando due grafie
     dicono numeri diversi bisogna poter capire quale slicer ha ragione. */
  var GRAFIE = {
    grammiTotali: [
      { re: /^;\s*total filament used \[g\]\s*=\s*([\d.,]+)/im, chi: 'PrusaSlicer/Orca' },
      { re: /^;\s*filament used \[g\]\s*=\s*([\d.,]+)/im, chi: 'PrusaSlicer' },
      { re: /^;\s*total filament weight \[g\]\s*:\s*([\d.,]+)/im, chi: 'Bambu Studio' },
      { re: /^;\s*filament_weight_total\s*=\s*([\d.,]+)/im, chi: 'Orca' },
    ],
    supporti: [
      { re: /^;\s*support filament used \[g\]\s*=\s*([\d.,]+)/im, chi: 'PrusaSlicer' },
      { re: /^;\s*support_filament_weight\s*=\s*([\d.,]+)/im, chi: 'Orca' },
    ],
    purge: [
      { re: /^;\s*flush[_ ]?filament[_ ]?weight\s*[=:]\s*([\d.,]+)/im, chi: 'Bambu Studio' },
      { re: /^;\s*wipe tower filament used \[g\]\s*=\s*([\d.,]+)/im, chi: 'PrusaSlicer' },
      { re: /^;\s*total filament used for wipe tower \[g\]\s*=\s*([\d.,]+)/im, chi: 'PrusaSlicer' },
    ],
    costo: [
      { re: /^;\s*total filament cost\s*=\s*([\d.,]+)/im, chi: 'PrusaSlicer/Orca' },
      { re: /^;\s*filament cost\s*=\s*([\d.,]+)/im, chi: 'PrusaSlicer' },
    ],
    materiale: [
      { re: /^;\s*filament_type\s*=\s*([A-Za-z0-9+\-;, ]+)/im, chi: 'PrusaSlicer/Orca' },
      { re: /^;\s*filament_settings_id\s*=\s*"?([^"\n]+)"?/im, chi: 'PrusaSlicer' },
    ],
  };

  function primaGrafia(testo, elenco) {
    for (var i = 0; i < elenco.length; i++) {
      var m = testo.match(elenco[i].re);
      if (m) return { valore: m[1], chi: elenco[i].chi };
    }
    return null;
  }

  /* ── Il tempo ─────────────────────────────────────────────────────────────
     Tre grafie: «2h 30m 15s» dei PrusaSlicer-like, `;TIME:9000` di Cura in
     secondi, e `; model printing time: 1h 4m 27s` di Bambu. Restituire ore
     decimali qui evita che ogni chiamante rifaccia la conversione — ed è la
     conversione in cui si perdono i minuti. */
  function oreDa(testo) {
    var m = testo.match(/^;\s*(?:estimated printing time|total estimated time|model printing time)[^=:]*[=:]\s*(.+)$/im);
    if (m) {
      var t = m[1];
      var g = num((t.match(/(\d+)\s*d/i) || [0, 0])[1]);
      var h = num((t.match(/(\d+)\s*h/i) || [0, 0])[1]);
      var mi = num((t.match(/(\d+)\s*m(?!s)/i) || [0, 0])[1]);
      var sec = num((t.match(/(\d+)\s*s/i) || [0, 0])[1]);
      var ore = g * 24 + h + mi / 60 + sec / 3600;
      if (ore > 0) return { ore: ore, chi: 'testo' };
    }
    var c = testo.match(/^;TIME:\s*([\d.]+)/im);           // Cura, secondi
    if (c) return { ore: num(c[1]) / 3600, chi: 'Cura' };
    return null;
  }

  function numeroIt(v) { return num(String(v).replace(/\s/g, '').replace(',', '.')); }

  /** Legge un G-code già in memoria come testo. Puro: stessa stringa, stesso
      risultato. */
  function daGcode(testo) {
    var s = String(testo || '');
    if (!s) return vuoto('file vuoto');

    var tot = primaGrafia(s, GRAFIE.grammiTotali);
    var sup = primaGrafia(s, GRAFIE.supporti);
    var pur = primaGrafia(s, GRAFIE.purge);
    var cos = primaGrafia(s, GRAFIE.costo);
    var mat = primaGrafia(s, GRAFIE.materiale);
    var t = oreDa(s);

    if (!tot && !t) return vuoto('nessun dato di stampa riconosciuto in questo G-code');

    var grammi = tot ? numeroIt(tot.valore) : 0;
    var supporti = sup ? numeroIt(sup.valore) : 0;
    var purge = pur ? numeroIt(pur.valore) : 0;

    /* Il modello è il totale meno quel che si butta, mai la somma: il totale
       dichiarato dagli slicer comprende già supporti e spurgo. */
    var modello = Math.max(0, grammi - supporti - purge);

    return {
      ok: true,
      formato: 'gcode',
      grammiTotali: grammi,
      grammiModello: modello,
      supporti: supporti,
      purge: purge,
      ore: t ? t.ore : 0,
      costo: cos ? numeroIt(cos.valore) : 0,
      materiali: mat ? String(mat.valore).split(/[;,]/).map(function (x) { return x.trim(); }).filter(Boolean) : [],
      comprendeTutto: true,
      /* Da chi viene ogni numero: quando due grafie non concordano si deve
         poter dire quale slicer ha scritto che cosa. */
      grafie: {
        peso: tot ? tot.chi : null, supporti: sup ? sup.chi : null,
        purge: pur ? pur.chi : null, tempo: t ? t.chi : null, costo: cos ? cos.chi : null,
      },
      piatti: [],
    };
  }

  /* ══ 3MF ═══════════════════════════════════════════════════════════════════
     Un 3MF è uno ZIP. Si legge la directory centrale — l'unico posto dove i
     nomi delle voci stanno per certo — e si estrae la sola voce che serve.
     Leggere l'archivio intero per un file da 400 byte sarebbe sprecare la
     memoria di chi ha aperto un progetto da 80 MB. */

  function leggiZip(buffer) {
    var dv = new DataView(buffer);
    var n = buffer.byteLength;
    /* La firma di fine directory centrale sta negli ultimi 22 byte, più un
       commento lungo al massimo 64 KB. */
    var eocd = -1;
    var da = Math.max(0, n - 22 - 65535);
    for (var i = n - 22; i >= da; i--) {
      if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) return null;
    var voci = dv.getUint16(eocd + 10, true);
    var inizio = dv.getUint32(eocd + 16, true);

    var out = {};
    var p = inizio;
    for (var v = 0; v < voci && p + 46 <= n; v++) {
      if (dv.getUint32(p, true) !== 0x02014b50) break;
      var metodo = dv.getUint16(p + 10, true);
      var compressa = dv.getUint32(p + 20, true);
      var lunNome = dv.getUint16(p + 28, true);
      var lunExtra = dv.getUint16(p + 30, true);
      var lunComm = dv.getUint16(p + 32, true);
      var offset = dv.getUint32(p + 42, true);
      var nome = new TextDecoder().decode(new Uint8Array(buffer, p + 46, lunNome));
      out[nome] = { metodo: metodo, compressa: compressa, offset: offset };
      p += 46 + lunNome + lunExtra + lunComm;
    }
    return out;
  }

  async function estrai(buffer, voce) {
    var dv = new DataView(buffer);
    var p = voce.offset;
    if (dv.getUint32(p, true) !== 0x04034b50) return null;
    var lunNome = dv.getUint16(p + 26, true);
    var lunExtra = dv.getUint16(p + 28, true);
    var dati = new Uint8Array(buffer, p + 30 + lunNome + lunExtra, voce.compressa);

    if (voce.metodo === 0) return new TextDecoder().decode(dati);   // memorizzata
    if (voce.metodo !== 8) return null;                             // né store né deflate
    if (typeof global.DecompressionStream !== 'function') return null;

    var ds = new global.DecompressionStream('deflate-raw');
    var flusso = new Blob([dati]).stream().pipeThrough(ds);
    return await new Response(flusso).text();
  }

  function attributo(xml, tag, chiave) {
    var re = new RegExp('<' + tag + '[^>]*\\bkey="' + chiave + '"[^>]*\\bvalue="([^"]*)"', 'i');
    var m = xml.match(re);
    return m ? m[1] : null;
  }

  /** Il riassunto di un 3MF. Asincrona perché la decompressione lo è. */
  async function da3mf(buffer) {
    var indice = null;
    try { indice = leggiZip(buffer); } catch (e) { indice = null; }
    if (!indice) return vuoto('non è un archivio 3MF leggibile');

    var nome = Object.keys(indice).filter(function (k) { return /slice_info\.config$/i.test(k); })[0];
    if (!nome) return vuoto('il 3MF non contiene Metadata/slice_info.config: è un progetto non ancora affettato');

    var xml = null;
    try { xml = await estrai(buffer, indice[nome]); } catch (e) { xml = null; }
    if (!xml) return vuoto('la voce del 3MF non si è potuta decomprimere in questa pagina');

    /* Un progetto può avere più piatti, e ognuno è una stampa a sé: si
       restituiscono tutti, invece di sommarli in un numero che nasconde
       quanti avviamenti servono davvero. */
    var piatti = [];
    var blocchi = xml.split(/<plate>/i).slice(1);
    blocchi.forEach(function (b, idx) {
      var peso = num(attributo(b, 'metadata', 'weight'));
      var sec = num(attributo(b, 'metadata', 'prediction'));
      var etichetta = attributo(b, 'metadata', 'index') || String(idx + 1);
      var filamenti = [];
      var re = /<filament[^>]*>/gi, m;
      while ((m = re.exec(b))) {
        var tipo = (m[0].match(/\btype="([^"]*)"/i) || [])[1] || '';
        var usoG = num((m[0].match(/\bused_g="([^"]*)"/i) || [])[1]);
        var colore = (m[0].match(/\bcolor="([^"]*)"/i) || [])[1] || '';
        if (usoG > 0 || tipo) filamenti.push({ tipo: tipo, grammi: usoG, colore: colore });
      }
      if (peso > 0 || sec > 0 || filamenti.length) {
        piatti.push({ nome: 'Piatto ' + etichetta, grammi: peso, ore: sec / 3600, materiali: filamenti });
      }
    });

    if (!piatti.length) return vuoto('il 3MF non dichiara né peso né tempo di stampa');

    var grammi = piatti.reduce(function (a, p) { return a + p.grammi; }, 0);
    var ore = piatti.reduce(function (a, p) { return a + p.ore; }, 0);
    var materiali = [];
    piatti.forEach(function (p) {
      p.materiali.forEach(function (f) {
        var esiste = materiali.filter(function (x) { return x.tipo === f.tipo && x.colore === f.colore; })[0];
        if (esiste) esiste.grammi += f.grammi; else materiali.push({ tipo: f.tipo, colore: f.colore, grammi: f.grammi });
      });
    });

    return {
      ok: true,
      formato: '3mf',
      grammiTotali: grammi,
      /* Il 3MF non separa i supporti: il peso dichiarato li comprende, e
         dedurli sarebbe inventare. Si dice, e il campo resta a zero. */
      grammiModello: grammi,
      supporti: 0, purge: 0,
      ore: ore, costo: 0,
      materiali: materiali.map(function (m) { return m.tipo + (m.colore ? ' ' + m.colore : ''); }),
      dettaglioMateriali: materiali,
      comprendeTutto: true,
      piatti: piatti,
      grafie: { peso: '3MF slice_info', tempo: '3MF slice_info' },
      nota: piatti.length > 1
        ? piatti.length + ' piatti: ognuno è una stampa a sé, con il proprio avviamento.'
        : null,
    };
  }

  /** Riconosce il formato dal nome e legge. Il file non lascia la pagina. */
  async function analizza(file) {
    if (!file) return vuoto('nessun file');
    var nome = String(file.name || '').toLowerCase();
    try {
      if (/\.3mf$/.test(nome)) return await da3mf(await file.arrayBuffer());
      if (/\.(gcode|gco|g|nc|bgcode)$/.test(nome)) {
        /* I dati stanno nei commenti, quasi sempre in coda. Leggere 2 MB
           dalla fine e 256 KB dalla testa copre ogni slicer conosciuto senza
           caricare in memoria un file da mezzo giga. */
        var n = file.size;
        var testa = await file.slice(0, Math.min(n, 262144)).text();
        var coda = n > 262144 ? await file.slice(Math.max(0, n - 2097152)).text() : '';
        return daGcode(testa + '\n' + coda);
      }
      return vuoto('formato non riconosciuto: attesi .gcode, .gco, .g o .3mf');
    } catch (e) {
      return vuoto('lettura non riuscita: ' + (e && e.message ? e.message : 'errore sconosciuto'));
    }
  }

  global.InglySlicerImport = {
    VERSIONE: '1.0.0',
    daGcode: daGcode,
    da3mf: da3mf,
    analizza: analizza,
    oreDa: oreDa,
    _leggiZip: leggiZip,
  };
})(typeof window !== 'undefined' ? window : globalThis);
