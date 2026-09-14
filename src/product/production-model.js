/* ═══════════════════════════════════════════════════════════════════════════
   MODELLO DI PRODUZIONE — con che cosa è stato fatto, davvero
   ═══════════════════════════════════════════════════════════════════════════

   L'audit ha misurato: `primaryTechnology` zero occorrenze, `technologies`
   zero. Il programma sapeva leggere **una** tecnologia per ordine
   (`InglyOrderFields.tecnologia`) e non aveva un posto dove scrivere «laser
   più UV» — che è la metà del lavoro di un laboratorio vero: si taglia al
   laser e si stampa sopra.

   E soprattutto: `category` veniva usato 576 volte, ed è un'altra cosa. La
   categoria dice **che cosa è** il prodotto (portachiavi, targa, insegna); la
   tecnologia dice **come è stato fatto**. Un portachiavi può essere laser, UV
   o stampato in 3D, e confondere i due campi vuol dire non poter più
   rispondere né a «cosa vendo» né a «cosa mi conviene produrre».

   ── Perché un modulo e non un campo ──────────────────────────────────────

   Perché la parte difficile non è il campo: è la convivenza con quello che
   c'è già. Migliaia di ordini non hanno `production` e non l'avranno mai —
   riscrivere lo storico per uniformarlo sarebbe cambiare dati che descrivono
   fatti avvenuti. Questo modulo li legge lo stesso, deducendo la tecnologia
   con il lettore che esisteva prima, e **dichiara** che è una deduzione.

   ── La regola dei misti ──────────────────────────────────────────────────

   Un ordine laser+UV da 150 € non vale 150 di laser **e** 150 di UV: vale 150
   in tutto. Finché non esiste un'attribuzione economica per singola
   lavorazione — e non esiste — quell'ordine sta nella categoria «misto», con
   il suo importo intero, una volta sola. `quotaPerTecnologia()` esiste apposta
   per rendere impossibile l'altra strada.

   Puro: niente DOM, niente archivio, niente orologio.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  /* ── Le tecnologie ───────────────────────────────────────────────────────
     `id` è quello che si scrive nei dati e non cambia mai. `label` e `colore`
     servono a chi disegna. Gli alias sono i nomi che i dati esistenti usano
     già: si leggono, non si scrivono. */
  var TECNOLOGIE = [
    { id: 'laser', label: 'Laser', emoji: '🟣', colore: '#a855f7',
      alias: ['laser', 'taglio', 'incisione', 'co2', 'fibra', 'mopa', 'diodo'] },
    { id: '3d', label: 'Stampa 3D', emoji: '🟢', colore: '#22c55e',
      alias: ['3d', 'print3d', 'stampa3d', 'fdm', 'resina', 'sla', 'stampa 3d'] },
    { id: 'uv', label: 'Stampa UV', emoji: '🔵', colore: '#3b82f6',
      alias: ['uv', 'uvprint', 'stampauv', 'stampa uv'] },
    { id: 'dtf', label: 'DTF', emoji: '🟠', colore: '#f97316',
      alias: ['dtf', 'transfer'] },
    { id: 'tessile', label: 'Tessile', emoji: '🟡', colore: '#eab308',
      alias: ['tessile', 'sublimation', 'sublimazione', 'subl', 'ricamo', 'serigrafia'] },
    { id: 'manuale', label: 'Manuale', emoji: '🤚', colore: '#94a3b8',
      alias: ['manuale', 'artigianale', 'montaggio', 'assemblaggio'] },
    { id: 'finitura', label: 'Finitura', emoji: '✨', colore: '#06b6d4',
      alias: ['finitura', 'verniciatura', 'lucidatura', 'levigatura', 'pulizia'] },
    { id: 'altro', label: 'Altro', emoji: '⚪', colore: '#6b7280', alias: ['altro', 'generico', 'generic'] },
  ];

  var PER_ID = {};
  var PER_ALIAS = {};
  TECNOLOGIE.forEach(function (t) {
    PER_ID[t.id] = t;
    t.alias.forEach(function (a) { PER_ALIAS[a] = t.id; });
  });

  /** L'etichetta di un misto: una categoria vera, non l'assenza di una. */
  var MISTO = { id: 'misto', label: 'Misto', emoji: '🔀', colore: '#8b5cf6' };
  /** E quella di chi non lo dice. */
  var IGNOTA = { id: 'sconosciuta', label: 'Non dichiarata', emoji: '❔', colore: '#6b7280' };

  function testo(v) {
    if (v == null || typeof v === 'object') return '';
    return String(v).trim();
  }

  /** Da un nome qualunque all'id canonico, o `null` se non si riconosce. */
  function normalizza(v) {
    var s = testo(v).toLowerCase().replace(/[\s_\-]/g, '');
    if (!s) return null;
    if (PER_ID[s]) return s;
    if (PER_ALIAS[s]) return PER_ALIAS[s];
    /* Gli alias con spazi, già normalizzati sopra. */
    var senzaSpazi = testo(v).toLowerCase().trim();
    if (PER_ALIAS[senzaSpazi]) return PER_ALIAS[senzaSpazi];

    /* Fin qui il riconoscimento era solo esatto, e «Laser CO2» — il modo in
       cui una macchina si chiama davvero — non veniva classificato. Si
       guardano allora le singole parole.

       Il limite delle cinque parole non è arbitrario: serve a distinguere un
       campo tecnologia da una frase. «targa in legno con finitura opaca» è una
       descrizione, e classificarla come «finitura» sarebbe peggio che non
       classificarla. Un nome di macchina o un campo di categoria stanno sempre
       sotto le cinque parole. */
    var parole = senzaSpazi.split(/[^a-z0-9]+/).filter(Boolean);
    if (!parole.length || parole.length > 5) return null;
    for (var i = 0; i < parole.length; i++) {
      var w = parole[i];
      if (PER_ID[w]) return w;
      if (PER_ALIAS[w]) return PER_ALIAS[w];
    }
    return null;
  }

  function info(id) { return PER_ID[id] || null; }
  function elenco() { return TECNOLOGIE.map(function (t) {
    return { id: t.id, label: t.label, emoji: t.emoji, colore: t.colore }; }); }

  /* ── Costruire il blocco `production` ──────────────────────────────────── */

  /**
   * Il blocco di produzione a partire da un elenco di tecnologie.
   * @param {Array<string>} tecnologie  nomi o id, in ordine di importanza
   * @param {Array} [operazioni]        il routing, se c'è
   */
  function costruisci(tecnologie, operazioni) {
    var viste = {};
    var pulite = [];
    (Array.isArray(tecnologie) ? tecnologie : [tecnologie]).forEach(function (t) {
      var id = normalizza(t);
      if (id && !viste[id]) { viste[id] = true; pulite.push(id); }
    });
    /* Se le operazioni nominano tecnologie che l'elenco non ha, entrano:
       quello che si è fatto davvero conta più di quello che si era detto. */
    (Array.isArray(operazioni) ? operazioni : []).forEach(function (op) {
      var id = normalizza(op && (op.type || op.technology || op.tecnologia));
      if (id && !viste[id]) { viste[id] = true; pulite.push(id); }
    });
    return {
      primaryTechnology: pulite.length ? pulite[0] : null,
      technologies: pulite,
      isMixed: pulite.length > 1,
      operations: Array.isArray(operazioni) ? operazioni.slice() : [],
    };
  }

  /* ── Leggere il blocco da un record ────────────────────────────────────── */

  /**
   * La produzione di un ordine (o preventivo, o vendita).
   * Restituisce sempre un oggetto leggibile, anche per i record che non hanno
   * mai avuto un blocco `production`: in quel caso `dedotta` è `true`, perché
   * chi mostra il dato deve poter distinguere «me l'ha detto» da «l'ho capito».
   */
  function leggi(record) {
    var r = record || {};
    var p = r.production;

    if (p && Array.isArray(p.technologies) && p.technologies.length) {
      var pulite = [];
      var viste = {};
      p.technologies.forEach(function (t) {
        var id = normalizza(t);
        if (id && !viste[id]) { viste[id] = true; pulite.push(id); }
      });
      if (pulite.length) {
        var primaria = normalizza(p.primaryTechnology) || pulite[0];
        return {
          primaryTechnology: primaria,
          technologies: pulite,
          isMixed: pulite.length > 1,
          operations: Array.isArray(p.operations) ? p.operations : [],
          dedotta: false,
          fonte: 'production',
        };
      }
    }

    /* ── Il ripiego per i record che il modello non ce l'hanno ────────────
       Si prova il lettore che esisteva prima — conosce i campi storici e i
       loro alias — e poi i campi diretti. Quello che esce è una deduzione da
       un solo campo, quindi mai un misto: dichiararlo misto sarebbe inventare
       una seconda lavorazione. */
    var OF = global.InglyOrderFields;
    var dedotto = null;
    if (OF && typeof OF.tecnologia === 'function') {
      var t = OF.tecnologia(r);
      if (t && t.id) dedotto = normalizza(t.id);
    }
    if (!dedotto) dedotto = normalizza(r.technology || r.tecnologia || r.tech);
    if (!dedotto) {
      var righe = Array.isArray(r.lines) ? r.lines : (Array.isArray(r.items) ? r.items : []);
      for (var i = 0; i < righe.length && !dedotto; i++) {
        dedotto = normalizza(righe[i] && (righe[i].technology || righe[i].tecnologia || righe[i].tech));
      }
    }
    if (dedotto) {
      return {
        primaryTechnology: dedotto, technologies: [dedotto], isMixed: false,
        operations: [], dedotta: true, fonte: 'campi storici',
      };
    }
    return {
      primaryTechnology: null, technologies: [], isMixed: false,
      operations: [], dedotta: false, fonte: null,
      motivo: 'nessuna tecnologia dichiarata né deducibile da questo record',
    };
  }

  /** Come si classifica questo record in un elenco per tecnologia: una voce
      sola, sempre. Un misto è «misto», non è due volte niente. */
  function classifica(record) {
    var p = leggi(record);
    if (!p.technologies.length) return { id: IGNOTA.id, label: IGNOTA.label,
      emoji: IGNOTA.emoji, colore: IGNOTA.colore, isMixed: false, dedotta: false };
    if (p.isMixed) return { id: MISTO.id, label: MISTO.label, emoji: MISTO.emoji,
      colore: MISTO.colore, isMixed: true, dedotta: p.dedotta, technologies: p.technologies };
    var t = info(p.primaryTechnology) || IGNOTA;
    return { id: t.id, label: t.label, emoji: t.emoji, colore: t.colore,
      isMixed: false, dedotta: p.dedotta, technologies: p.technologies };
  }

  /** L'etichetta da mostrare: «🟣 Laser» oppure «🟣 Laser + 🔵 Stampa UV». */
  function etichetta(record) {
    var p = leggi(record);
    if (!p.technologies.length) return IGNOTA.emoji + ' ' + IGNOTA.label;
    return p.technologies.map(function (id) {
      var t = info(id); return t ? t.emoji + ' ' + t.label : id;
    }).join(' + ');
  }

  /* ── La regola che impedisce il doppio conteggio ───────────────────────── */

  /**
   * Quanto di un importo va attribuito a ciascuna tecnologia.
   *
   * Un ordine laser+UV da 150 € **non** vale 150 di laser e 150 di UV: vale
   * 150 in tutto. Finché non esiste un'attribuzione economica per singola
   * lavorazione — e non esiste — l'importo intero va in «misto», una volta
   * sola. Questa funzione restituisce sempre righe la cui somma è l'importo
   * di partenza, mai di più.
   *
   * @returns {{righe: Array<{tecnologia:string, importo:number}>, ripartito:boolean, motivo:?string}}
   */
  function quotaPerTecnologia(record, importo) {
    var n = parseFloat(importo);
    if (!isFinite(n)) n = 0;
    var c = classifica(record);
    return {
      righe: [{ tecnologia: c.id, importo: n }],
      ripartito: false,
      motivo: c.isMixed
        ? 'ordine misto: l\'importo resta intero in «misto», perché non esiste '
          + 'ancora un\'attribuzione economica per singola lavorazione'
        : null,
    };
  }

  /** Filtra un elenco per tecnologia. `'tutti'` passa tutto; `'misto'` prende
      i misti; un id prende chi quella tecnologia ce l'ha, anche in un misto. */
  function passa(record, filtro) {
    if (!filtro || filtro === 'tutti' || filtro === 'all') return true;
    var p = leggi(record);
    if (filtro === 'misto' || filtro === 'misti') return p.isMixed;
    if (filtro === 'sconosciuta') return !p.technologies.length;
    var id = normalizza(filtro);
    if (!id) return true;
    return p.technologies.indexOf(id) >= 0;
  }

  /** Le voci del filtro, costruite dai dati presenti: un filtro che offre
      «DTF» quando nessun ordine è in DTF fa perdere tempo. */
  function filtriDisponibili(records) {
    var presenti = {};
    var misti = 0, ignoti = 0;
    (Array.isArray(records) ? records : []).forEach(function (r) {
      var p = leggi(r);
      if (!p.technologies.length) { ignoti += 1; return; }
      if (p.isMixed) misti += 1;
      p.technologies.forEach(function (id) { presenti[id] = (presenti[id] || 0) + 1; });
    });
    var voci = [{ id: 'tutti', label: 'Tutti', emoji: '', n: (records || []).length }];
    TECNOLOGIE.forEach(function (t) {
      if (presenti[t.id]) voci.push({ id: t.id, label: t.label, emoji: t.emoji, n: presenti[t.id] });
    });
    if (misti) voci.push({ id: 'misto', label: MISTO.label, emoji: MISTO.emoji, n: misti });
    if (ignoti) voci.push({ id: 'sconosciuta', label: IGNOTA.label, emoji: IGNOTA.emoji, n: ignoti });
    return voci;
  }

  global.InglyProduction = {
    VERSIONE: VERSIONE,
    TECNOLOGIE: TECNOLOGIE,
    MISTO: MISTO,
    IGNOTA: IGNOTA,
    elenco: elenco,
    info: info,
    normalizza: normalizza,
    costruisci: costruisci,
    leggi: leggi,
    classifica: classifica,
    etichetta: etichetta,
    quotaPerTecnologia: quotaPerTecnologia,
    passa: passa,
    filtriDisponibili: filtriDisponibili,
  };
})(typeof window !== 'undefined' ? window : globalThis);
