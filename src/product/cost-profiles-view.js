/* ═══════════════════════════════════════════════════════════════════════════
   PROFILI ECONOMICI — il pannello dove il laboratorio si descrive
   ═══════════════════════════════════════════════════════════════════════════

   Manodopera, spese generali e imballo entrano nei preventivi da quando
   `cost-profiles.js` esiste. Fino a questo pannello ci entravano solo se
   qualcuno li scriveva a mano nell'archivio: il codice li leggeva, ma nessuna
   schermata li scriveva. Un costo che il programma sa gestire e che l'utente
   non può dichiarare vale esattamente zero, ed è il motivo per cui il caso
   dei 250 g usciva a € 15,50 invece che a € 18,15.

   Tre sezioni, tre decisioni diverse:

   · **Manodopera** — due numeri per ogni ruolo, e non sono lo stesso numero.
     Il costo interno è quello che l'ora costa a te; la tariffa cliente è
     quella che la fai pagare. Confonderli è il modo in cui si preventiva a
     margine zero credendo di guadagnare.

   · **Spese generali** — quello che si paga anche a macchine ferme. Tutte le
     voci partono da zero, e restano a zero finché non le si compila: un
     affitto plausibile è comunque un affitto inventato. Sotto, la ripartizione:
     una sola modalità alla volta, perché due sarebbero lo stesso affitto
     pagato due volte.

   · **Imballo** — «per pezzo» e «per ordine» sono due cose diverse. Una
     scatola su dieci pezzi vale un decimo a pezzo; un sacchetto vale sempre
     un sacchetto.

   Il pannello non calcola niente: scrive nell'archivio e lascia che siano
   `InglyCostProfiles` e il motore a fare i conti. È il motivo per cui i numeri
   qui dentro e quelli del preventivo non possono divergere.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var num = function (v) { var n = parseFloat(v); return isFinite(n) ? n : 0; };
  var eur = function (n) { return '€ ' + num(n).toFixed(2).replace('.', ','); };

  function P() { return global.InglyCostProfiles; }
  function S() { return global.InglyCostProfilesStore; }
  function nota(m, t) { if (typeof global.toast === 'function') global.toast(m, t || 'info'); }

  var NODO = 'ingly-profili-economici';
  var bozza = null;

  /* ── Apertura ───────────────────────────────────────────────────────────── */

  function apri(sezione) {
    var s = S(); var p = P();
    if (!s || !p) { nota('Profili economici non disponibili', 'warn'); return; }
    var n = document.getElementById(NODO);
    if (!n) { n = document.createElement('div'); n.id = NODO; document.body.appendChild(n); }
    n.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;'
      + 'justify-content:center;padding:16px;background:rgba(0,0,0,.62);backdrop-filter:blur(3px)';
    n.innerHTML = '<div style="color:var(--text-muted,#888);font-size:13px">Lettura dei profili…</div>';
    n.onclick = function (e) { if (e.target === n) chiudi(); };
    /* Esc chiude, come ogni altra finestra dell'applicazione. Il gestore si
       toglie alla chiusura: lasciarne uno per ogni apertura significherebbe
       chiudere una finestra che non c'è più. */
    document.addEventListener('keydown', onEscape);

    s.carica().then(function (c) {
      bozza = {
        sezione: sezione || 'manodopera',
        manodopera: (c.manodopera && c.manodopera.length ? c.manodopera : p.MANODOPERA_PREDEFINITA)
          .map(function (v) { return Object.assign({}, v); }),
        overhead: Object.assign({ modo: 'ora', oreProduttiveAnnue: 0, lavoriAnnui: 0, percentuale: 0 },
          c.overhead || {}, {
            voci: ((c.overhead && c.overhead.voci && c.overhead.voci.length)
              ? c.overhead.voci : p.SPESE_PREDEFINITE).map(function (v) { return Object.assign({}, v); }),
          }),
        imballo: (c.imballo && c.imballo.length ? c.imballo : p.IMBALLO_PREDEFINITO)
          .map(function (v) { return Object.assign({}, v); }),
        configurati: {
          manodopera: !!(c.manodopera && c.manodopera.length),
          overhead: !!(c.overhead && c.overhead.voci && c.overhead.voci.length),
          imballo: !!(c.imballo && c.imballo.length),
        },
      };
      disegna();
    }).catch(function () { nota('Non riesco a leggere i profili', 'error'); chiudi(); });
  }

  function onEscape(e) { if (e.key === 'Escape') chiudi(); }

  function chiudi() {
    document.removeEventListener('keydown', onEscape);
    var n = document.getElementById(NODO);
    if (n) n.remove();
    bozza = null;
  }

  /* ── Disegno ────────────────────────────────────────────────────────────── */

  function disegna() {
    var n = document.getElementById(NODO);
    if (!n || !bozza) return;
    n.innerHTML =
      '<div style="width:min(760px,100%);max-height:92vh;overflow:auto;background:var(--bg-card,#14141b);'
      + 'border:1px solid var(--border,#2a2a35);border-radius:16px;box-shadow:0 24px 64px rgba(0,0,0,.5)">'
      + intestazione()
      + '<div data-corpo="1" style="padding:0 18px 18px">' + corpo() + '</div>'
      + piede()
      + '</div>';
    lega(n);
  }

  function intestazione() {
    var t = [
      ['manodopera', '👤 Manodopera', bozza.configurati.manodopera],
      ['overhead', '🏠 Spese generali', bozza.configurati.overhead],
      ['imballo', '📦 Imballo', bozza.configurati.imballo],
    ];
    return '<div style="padding:18px 18px 0">'
      + '<div style="font-size:16px;font-weight:800;color:var(--text,#e8e8f0)">Profili economici</div>'
      + '<div style="font-size:11px;color:var(--text-muted,#888);margin-top:3px;line-height:1.5">'
      + 'Quello che il laboratorio costa anche quando le macchine sono ferme. '
      + 'Finché resta vuoto, ogni preventivo esce più basso del vero.</div>'
      + '<div style="display:flex;gap:6px;margin:14px 0 12px;flex-wrap:wrap">'
      + t.map(function (x) {
        var attiva = bozza.sezione === x[0];
        return '<button type="button" data-tab="' + x[0] + '" style="flex:1;min-width:130px;padding:8px 10px;'
          + 'border-radius:9px;font-size:12px;font-weight:700;font-family:inherit;cursor:pointer;'
          + 'border:1.5px solid ' + (attiva ? 'var(--primary,#6366f1)' : 'var(--border,#2a2a35)') + ';'
          + 'background:' + (attiva ? 'var(--primary,#6366f1)18' : 'transparent') + ';'
          + 'color:' + (attiva ? 'var(--primary,#6366f1)' : 'var(--text-muted,#888)') + '">'
          + x[1] + (x[2] ? ' ✓' : '') + '</button>';
      }).join('')
      + '</div></div>';
  }

  function corpo() {
    if (bozza.sezione === 'overhead') return sezioneOverhead();
    if (bozza.sezione === 'imballo') return sezioneImballo();
    return sezioneManodopera();
  }

  function campo(chiave, valore, passo, larghezza) {
    return '<input data-campo="' + esc(chiave) + '" type="number" step="' + (passo || '0.01')
      + '" value="' + esc(valore == null ? '' : valore) + '" style="width:' + (larghezza || '90px')
      + ';box-sizing:border-box;padding:6px 8px;background:var(--bg-card2,#18181f);'
      + 'border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);'
      + 'font-size:12px;text-align:right;outline:none">';
  }

  /* ── Manodopera ─────────────────────────────────────────────────────────── */

  function sezioneManodopera() {
    return spiega('Il costo interno è quello che un\'ora ti costa: retribuzione più oneri, '
      + 'ripartita sulle ore davvero produttive. La tariffa cliente è quella che fai pagare. '
      + 'Sono due numeri e il preventivo usa il primo — il secondo serve a sapere se ci guadagni.')
      + '<div style="display:grid;grid-template-columns:1fr 96px 96px;gap:6px 8px;align-items:center">'
      + '<div style="font-size:10px;color:var(--text-muted,#888);font-weight:700;text-transform:uppercase">Ruolo</div>'
      + '<div style="font-size:10px;color:var(--text-muted,#888);font-weight:700;text-align:right">Costo interno</div>'
      + '<div style="font-size:10px;color:var(--text-muted,#888);font-weight:700;text-align:right">Tariffa cliente</div>'
      + bozza.manodopera.map(function (v, i) {
        var perdita = num(v.tariffaCliente) > 0 && num(v.tariffaCliente) <= num(v.costoOrarioInterno);
        return '<div style="font-size:12px;color:var(--text,#e8e8f0)">' + esc(v.label || v.id)
          + (perdita ? '<div style="font-size:9px;color:#fca5a5">la tariffa non copre il costo</div>' : '')
          + '</div>'
          + campo('manodopera.' + i + '.costoOrarioInterno', v.costoOrarioInterno, '0.5')
          + campo('manodopera.' + i + '.tariffaCliente', v.tariffaCliente, '0.5');
      }).join('')
      + '</div>';
  }

  /* ── Spese generali ─────────────────────────────────────────────────────── */

  function sezioneOverhead() {
    var mensile = bozza.overhead.voci.reduce(function (a, v) { return a + num(v.mensile); }, 0);
    var annuo = mensile * 12;
    var modo = bozza.overhead.modo || 'ora';
    var ore = num(bozza.overhead.oreProduttiveAnnue);
    var lavori = num(bozza.overhead.lavoriAnnui);

    var esito;
    if (mensile === 0) {
      esito = avviso('Nessuna spesa dichiarata: affitto, utenze e software non entrano in nessun preventivo. '
        + 'Restano a zero finché non li scrivi — un valore plausibile sarebbe comunque inventato.');
    } else if (modo === 'ora') {
      esito = ore > 0
        ? bene(eur(annuo) + ' l\'anno su ' + ore + ' ore produttive fa ' + eur(annuo / ore) + ' l\'ora.')
        : avviso('Senza le ore produttive annue le spese non sono ripartibili: resterebbero fuori dal conto.');
    } else if (modo === 'lavoro') {
      esito = lavori > 0
        ? bene(eur(annuo) + ' l\'anno su ' + lavori + ' lavori fa ' + eur(annuo / lavori) + ' a lavoro.')
        : avviso('Senza il numero di lavori annui le spese non sono ripartibili.');
    } else if (modo === 'percento') {
      esito = num(bozza.overhead.percentuale) > 0
        ? bene('Ogni preventivo porta il ' + num(bozza.overhead.percentuale) + '% di spese generali.')
        : avviso('Percentuale non dichiarata.');
    } else {
      esito = avviso('Modalità «nessuna»: le spese generali non entrano nei preventivi.');
    }

    var modi = [['ora', 'A ora produttiva'], ['lavoro', 'A lavoro'],
      ['percento', 'In percentuale'], ['nessuno', 'Non ripartire']];

    return spiega('Quello che il laboratorio paga anche a macchine ferme. '
      + 'Si sceglie una sola modalità di ripartizione: sommarne due significa pagare '
      + 'lo stesso affitto due volte.')
      + '<div style="display:grid;grid-template-columns:1fr 110px;gap:6px 8px;align-items:center;margin-bottom:14px">'
      + bozza.overhead.voci.map(function (v, i) {
        return '<div style="font-size:12px;color:var(--text,#e8e8f0)">' + esc(v.label || v.id) + '</div>'
          + campo('overhead.voci.' + i + '.mensile', v.mensile, '10', '104px');
      }).join('')
      + '<div style="font-size:12px;font-weight:800;color:var(--text,#e8e8f0);padding-top:6px;'
      + 'border-top:1px solid var(--border,#2a2a35)">Totale al mese</div>'
      + '<div style="font-size:12px;font-weight:800;text-align:right;padding-top:6px;'
      + 'border-top:1px solid var(--border,#2a2a35);color:var(--text,#e8e8f0)">' + eur(mensile) + '</div>'
      + '</div>'

      + '<div style="font-size:10px;color:var(--text-muted,#888);font-weight:700;text-transform:uppercase;'
      + 'letter-spacing:.05em;margin-bottom:6px">Come ripartirle</div>'
      + '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px">'
      + modi.map(function (m) {
        var att = modo === m[0];
        return '<button type="button" data-modo="' + m[0] + '" style="padding:6px 12px;border-radius:8px;'
          + 'font-size:11px;font-weight:700;font-family:inherit;cursor:pointer;'
          + 'border:1.5px solid ' + (att ? 'var(--primary,#6366f1)' : 'var(--border,#2a2a35)') + ';'
          + 'background:' + (att ? 'var(--primary,#6366f1)18' : 'transparent') + ';'
          + 'color:' + (att ? 'var(--primary,#6366f1)' : 'var(--text-muted,#888)') + '">' + m[1] + '</button>';
      }).join('')
      + '</div>'

      + (modo === 'ora' ? riga('Ore produttive all\'anno',
        'overhead.oreProduttiveAnnue', bozza.overhead.oreProduttiveAnnue, '50',
        'Le ore in cui si produce davvero, non quelle di apertura.') : '')
      + (modo === 'lavoro' ? riga('Lavori all\'anno',
        'overhead.lavoriAnnui', bozza.overhead.lavoriAnnui, '10',
        'Quanti lavori chiudi in un anno, non quanti pezzi.') : '')
      + (modo === 'percento' ? riga('Percentuale sul costo',
        'overhead.percentuale', bozza.overhead.percentuale, '1',
        'La meno precisa delle tre: usala se non sai contare ore o lavori.') : '')
      + esito;
  }

  function riga(etichetta, chiave, valore, passo, aiuto) {
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;margin-bottom:8px">'
      + '<div><div style="font-size:12px;color:var(--text,#e8e8f0)">' + esc(etichetta) + '</div>'
      + (aiuto ? '<div style="font-size:9px;color:var(--text-muted,#888)">' + esc(aiuto) + '</div>' : '')
      + '</div>' + campo(chiave, valore, passo, '110px') + '</div>';
  }

  /* ── Imballo ────────────────────────────────────────────────────────────── */

  function sezioneImballo() {
    var perPezzo = 0;
    bozza.imballo.forEach(function (v) {
      if (v.attivo === false) return;
      perPezzo += num(v.costo);   /* per l'anteprima si guarda un pezzo solo */
    });
    return spiega('«Per pezzo» si paga a ogni pezzo; «per ordine» si paga una volta e '
      + 'si divide per la quantità. Su dieci pezzi una scatola da 60 centesimi vale sei centesimi l\'uno.')
      + '<div style="display:grid;grid-template-columns:1fr 120px 100px 40px;gap:6px 8px;align-items:center">'
      + '<div style="font-size:10px;color:var(--text-muted,#888);font-weight:700;text-transform:uppercase">Voce</div>'
      + '<div style="font-size:10px;color:var(--text-muted,#888);font-weight:700">Quando</div>'
      + '<div style="font-size:10px;color:var(--text-muted,#888);font-weight:700;text-align:right">Costo</div>'
      + '<div style="font-size:10px;color:var(--text-muted,#888);font-weight:700;text-align:center">Usa</div>'
      + bozza.imballo.map(function (v, i) {
        return '<div style="font-size:12px;color:var(--text,#e8e8f0)">' + esc(v.label || v.id) + '</div>'
          + '<select data-campo="imballo.' + i + '.per" style="padding:6px 8px;background:var(--bg-card2,#18181f);'
          + 'border:1.5px solid var(--border,#2a2a35);border-radius:7px;color:var(--text,#e8e8f0);font-size:11px">'
          + '<option value="pezzo"' + (v.per !== 'ordine' ? ' selected' : '') + '>Per pezzo</option>'
          + '<option value="ordine"' + (v.per === 'ordine' ? ' selected' : '') + '>Per ordine</option>'
          + '</select>'
          + campo('imballo.' + i + '.costo', v.costo, '0.01', '96px')
          + '<div style="text-align:center"><input type="checkbox" data-campo="imballo.' + i + '.attivo"'
          + (v.attivo === false ? '' : ' checked') + ' style="width:16px;height:16px;cursor:pointer"></div>';
      }).join('')
      + '</div>'
      + '<div style="margin-top:10px;font-size:11px;color:var(--text-muted,#888)">'
      + 'Su un pezzo solo, tutte le voci attive fanno <b style="color:var(--text,#e8e8f0)">'
      + eur(perPezzo) + '</b>. Su dieci pezzi le voci «per ordine» costano un decimo.</div>';
  }

  /* ── Pezzi comuni ───────────────────────────────────────────────────────── */

  function spiega(t) {
    return '<div style="font-size:11px;color:var(--text-muted,#888);line-height:1.55;margin-bottom:12px">'
      + esc(t) + '</div>';
  }
  function avviso(t) {
    return '<div style="margin-top:10px;padding:9px 11px;border-radius:9px;font-size:11px;line-height:1.5;'
      + 'background:#f59e0b12;border:1px solid #f59e0b30;color:#fcd34d">' + esc(t) + '</div>';
  }
  function bene(t) {
    return '<div style="margin-top:10px;padding:9px 11px;border-radius:9px;font-size:11px;line-height:1.5;'
      + 'background:#10b98112;border:1px solid #10b98130;color:#86efac">' + esc(t) + '</div>';
  }

  function piede() {
    return '<div style="display:flex;gap:8px;justify-content:flex-end;padding:14px 18px;'
      + 'border-top:1px solid var(--border,#2a2a35)">'
      + '<button type="button" data-azione="annulla" style="padding:9px 16px;border-radius:9px;font-size:12px;'
      + 'font-weight:700;font-family:inherit;cursor:pointer;background:transparent;'
      + 'border:1.5px solid var(--border,#2a2a35);color:var(--text-muted,#888)">Annulla</button>'
      + '<button type="button" data-azione="salva" style="padding:9px 18px;border-radius:9px;font-size:12px;'
      + 'font-weight:800;font-family:inherit;cursor:pointer;background:var(--primary,#6366f1);'
      + 'border:none;color:#fff">Salva i profili</button>'
      + '</div>';
  }

  /* ── Legature ───────────────────────────────────────────────────────────── */

  /** Le query restano dentro il nodo del pannello: cercare nel documento
      significherebbe raccogliere i campi di qualunque altra schermata aperta. */
  function lega(n) {
    n.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () { bozza.sezione = b.getAttribute('data-tab'); disegna(); };
    });
    n.querySelectorAll('[data-modo]').forEach(function (b) {
      b.onclick = function () { bozza.overhead.modo = b.getAttribute('data-modo'); disegna(); };
    });
    n.querySelectorAll('[data-campo]').forEach(function (e) {
      var evento = e.type === 'checkbox' ? 'onchange' : (e.tagName === 'SELECT' ? 'onchange' : 'oninput');
      e[evento] = function () {
        scrivi(e.getAttribute('data-campo'),
          e.type === 'checkbox' ? e.checked : (e.tagName === 'SELECT' ? e.value : num(e.value)));
        /* Solo le spese generali si ridisegnano a ogni battuta: sono l'unica
           sezione dove il numero in fondo cambia mentre scrivi. */
        if (bozza.sezione === 'overhead' && e.tagName !== 'SELECT') aggiornaEsito(n);
      };
    });
    n.querySelectorAll('[data-azione]').forEach(function (b) {
      b.onclick = function () {
        if (b.getAttribute('data-azione') === 'salva') salva();
        else chiudi();
      };
    });
  }

  function aggiornaEsito(n) {
    /* Si ridisegna il corpo, non il pannello: ridisegnare tutto farebbe
       perdere il cursore al primo carattere digitato. */
    var attivo = document.activeElement;
    var chiave = attivo && attivo.getAttribute ? attivo.getAttribute('data-campo') : null;
    var pos = attivo && attivo.selectionStart;
    var box = n.querySelector('[data-corpo]');
    if (!box) return;
    box.innerHTML = corpo();
    lega(n);
    if (chiave) {
      var rimesso = n.querySelector('[data-campo="' + chiave + '"]');
      if (rimesso) { rimesso.focus(); try { rimesso.selectionStart = rimesso.selectionEnd = pos; } catch (e) {} }
    }
  }

  function scrivi(chiave, valore) {
    var parti = String(chiave).split('.');
    var t = bozza;
    for (var i = 0; i < parti.length - 1; i++) {
      var k = parti[i];
      t = Array.isArray(t) ? t[parseInt(k, 10)] : t[k];
      if (!t) return;
    }
    t[parti[parti.length - 1]] = valore;
  }

  function salva() {
    var s = S();
    if (!s) return;
    Promise.all([
      s.salvaManodopera(bozza.manodopera),
      s.salvaOverhead({
        modo: bozza.overhead.modo,
        oreProduttiveAnnue: num(bozza.overhead.oreProduttiveAnnue),
        lavoriAnnui: num(bozza.overhead.lavoriAnnui),
        percentuale: num(bozza.overhead.percentuale),
        voci: bozza.overhead.voci,
      }),
      s.salvaImballo(bozza.imballo),
    ]).then(function (esiti) {
      if (esiti.every(Boolean)) {
        nota('Profili salvati: i prossimi preventivi li useranno', 'success');
        chiudi();
        /* Chi sta guardando un preventivo deve vederlo cambiare adesso, non
           alla prossima apertura della sezione. */
        try {
          if (global.Print3DQuoter && global.Print3DQuoter.calc) global.Print3DQuoter.calc();
          if (global.CalcMacchine && global.CalcMacchine.render) global.CalcMacchine.render();
        } catch (e) {}
      } else {
        nota('Qualcosa non è stato salvato: riprova', 'error');
      }
    }).catch(function () { nota('Salvataggio non riuscito', 'error'); });
  }

  global.InglyProfiliEconomici = {
    VERSIONE: VERSIONE,
    apri: apri,
    chiudi: chiudi,
    _bozza: function () { return bozza; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
