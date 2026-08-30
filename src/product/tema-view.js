/* ═══════════════════════════════════════════════════════════════════════════
   ASPETTO — il pannello che sceglie tema, colore e carattere
   ═══════════════════════════════════════════════════════════════════════════

   Un pannello solo per una decisione sola. Prima ce n'erano due — «White Label
   Engine» e «Personalizza brand» — che cambiavano lo stesso colore scrivendo
   in due posti diversi, e nessuno dei due sapeva fare il tema o il carattere.

   L'anteprima è la parte che conta: un colore si sceglie guardando un
   quadratino, e un quadratino non dice se quel colore resterà leggibile
   scritto in undici pixel. Qui si vede subito, e il contrasto è misurato.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };

  function T() { return global.InglyTema; }

  /* La bozza: si modifica e si vede, ma non si salva finché non lo si dice.
     Chiudere senza salvare deve riportare tutto com'era — altrimenti provare
     un colore diventa un impegno. */
  var bozza = null;
  var partenza = null;

  function apri() {
    var M = T();
    if (!M) return;
    partenza = Object.assign({}, M.stato().corrente);
    bozza = Object.assign({}, partenza);

    var n = document.getElementById('ingly-aspetto');
    if (!n) {
      n = document.createElement('div');
      n.id = 'ingly-aspetto';
      document.body.appendChild(n);
    }
    n.innerHTML = corpo();
    n.style.cssText = 'position:fixed;inset:0;z-index:100000;display:flex;align-items:center;'
      + 'justify-content:center;padding:20px;background:rgba(0,0,0,.62);backdrop-filter:blur(3px)';
    n.onclick = function (e) { if (e.target === n) chiudi(true); };
  }

  function chiudi(annulla) {
    var M = T();
    if (annulla && M && partenza) M.applica(partenza);
    var n = document.getElementById('ingly-aspetto');
    if (n) n.remove();
    bozza = null;
  }

  function aggiorna(campo, valore) {
    var M = T();
    if (!M || !bozza) return;
    bozza[campo] = valore;
    M.applica(bozza);          // si vede subito, non si salva
    var n = document.getElementById('ingly-aspetto');
    if (n) n.innerHTML = corpo();
  }

  function salva() {
    var M = T();
    if (M && bozza) M.salva(bozza);
    chiudi(false);
    if (typeof global.toast === 'function') global.toast('Aspetto aggiornato', 'success');
  }

  function ripristina() {
    var M = T();
    if (!M) return;
    bozza = Object.assign({}, M.PREDEFINITO);
    M.ripristina();
    var n = document.getElementById('ingly-aspetto');
    if (n) n.innerHTML = corpo();
    if (typeof global.toast === 'function') global.toast('Aspetto ripristinato', 'info');
  }

  /* ── Il disegno ───────────────────────────────────────────────────────── */

  function scelta(attivo, onclick, titolo, sotto, extra) {
    return '<button onclick="' + onclick + '" style="flex:1;min-width:96px;padding:10px 8px;border-radius:10px;cursor:pointer;'
      + 'text-align:left;transition:.15s;border:1.5px solid ' + (attivo ? 'var(--primary)' : 'var(--border2,#2a2a35)') + ';'
      + 'background:' + (attivo ? 'var(--primary-dim,rgba(0,230,210,.14))' : 'transparent') + ';'
      + 'color:' + (attivo ? 'var(--primary)' : 'var(--text-muted,#94a3b8)') + '">'
      + (extra || '')
      + '<div style="font-size:12px;font-weight:800">' + esc(titolo) + '</div>'
      + (sotto ? '<div style="font-size:9px;opacity:.75;font-weight:400;line-height:1.35;margin-top:2px">' + esc(sotto) + '</div>' : '')
      + '</button>';
  }

  function sezione(titolo, contenuto) {
    return '<div style="margin-bottom:16px">'
      + '<div style="font-size:10px;text-transform:uppercase;letter-spacing:.7px;color:var(--text-dim,#64748b);font-weight:800;margin-bottom:7px">' + esc(titolo) + '</div>'
      + contenuto + '</div>';
  }

  function corpo() {
    var M = T();
    var c = bozza || (M ? M.stato().corrente : {});
    var v = M ? M.verifica(c) : { ok: true, avvisi: [] };
    var car = (M ? M.CARATTERI : []).filter(function (f) { return f.id === c.carattere; })[0]
      || (M ? M.CARATTERI[0] : { stack: 'sans-serif' });

    return '<div style="width:100%;max-width:620px;max-height:90vh;overflow-y:auto;background:var(--bg-card,#16161c);'
      + 'border:1px solid var(--border,#26262e);border-radius:16px;padding:22px">'

      + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:18px">'
        + '<div><div style="font-size:16px;font-weight:900;color:var(--text,#e8e8ee)">🎨 Aspetto</div>'
        + '<div style="font-size:11px;color:var(--text-muted,#94a3b8)">Tema, colore e carattere — si vedono mentre li scegli</div></div>'
        + '<button onclick="InglyAspetto.chiudi(true)" style="background:none;border:none;color:var(--text-dim,#64748b);font-size:18px;cursor:pointer;padding:4px 8px">✕</button>'
      + '</div>'

      + sezione('Tema', '<div style="display:flex;gap:7px;flex-wrap:wrap">'
        + (M ? M.TEMI : []).map(function (t) {
          return scelta(c.tema === t.id, "InglyAspetto.aggiorna('tema','" + t.id + "')", t.label, t.nota);
        }).join('') + '</div>')

      + sezione('Colore d\'accento', '<div style="display:flex;gap:7px;flex-wrap:wrap;margin-bottom:8px">'
        + (M ? M.ACCENTI : []).map(function (a) {
          var attivo = String(c.accento).toLowerCase() === a.hex.toLowerCase();
          return '<button onclick="InglyAspetto.aggiorna(\'accento\',\'' + a.hex + '\')" title="' + esc(a.label) + '" '
            + 'style="width:38px;height:38px;border-radius:10px;cursor:pointer;background:' + a.hex + ';'
            + 'border:2.5px solid ' + (attivo ? 'var(--text,#e8e8ee)' : 'transparent') + '"></button>';
        }).join('')
        + '<label style="display:flex;align-items:center;gap:6px;padding:0 10px;border-radius:10px;border:1.5px dashed var(--border2,#2a2a35);cursor:pointer">'
          + '<input type="color" value="' + esc(c.accento) + '" oninput="InglyAspetto.aggiorna(\'accento\',this.value)" '
          + 'style="width:24px;height:24px;border:none;background:none;cursor:pointer;padding:0">'
          + '<span style="font-size:10px;color:var(--text-muted,#94a3b8)">libero</span></label>'
        + '</div>'
        + avvisi(v))

      + sezione('Carattere', '<div style="display:flex;gap:7px;flex-wrap:wrap">'
        + (M ? M.CARATTERI : []).map(function (f) {
          return scelta(c.carattere === f.id, "InglyAspetto.aggiorna('carattere','" + f.id + "')", f.label, f.nota,
            '<div style="font-family:' + f.stack + ';font-size:15px;font-weight:700;margin-bottom:3px">Ag 0123</div>');
        }).join('') + '</div>')

      + sezione('Dimensione', '<div style="display:flex;gap:7px;flex-wrap:wrap">'
        + (M ? M.SCALE : []).map(function (s) {
          return scelta(c.scala === s.id, "InglyAspetto.aggiorna('scala','" + s.id + "')", s.label,
            Math.round(s.fattore * 100) + '%');
        }).join('') + '</div>')

      + anteprima(c, car)

      + '<div style="display:flex;gap:8px;margin-top:18px;flex-wrap:wrap">'
        + '<button onclick="InglyAspetto.ripristina()" style="padding:9px 14px;border-radius:9px;cursor:pointer;'
          + 'background:transparent;border:1px solid var(--border2,#2a2a35);color:var(--text-muted,#94a3b8);font-size:12px;font-weight:700">Ripristina</button>'
        + '<button onclick="InglyAspetto.chiudi(true)" style="padding:9px 14px;border-radius:9px;cursor:pointer;margin-left:auto;'
          + 'background:transparent;border:1px solid var(--border2,#2a2a35);color:var(--text-muted,#94a3b8);font-size:12px;font-weight:700">Annulla</button>'
        + '<button onclick="InglyAspetto.salva()" style="padding:9px 18px;border-radius:9px;cursor:pointer;'
          + 'background:var(--primary);border:none;color:#000;font-size:12px;font-weight:800">Salva</button>'
      + '</div>'
      + '</div>';
  }

  function avvisi(v) {
    if (!v || !v.avvisi || !v.avvisi.length) {
      return '<div style="font-size:10px;color:var(--green,#22c55e)">✓ Contrasto sufficiente su ogni tema.</div>';
    }
    return v.avvisi.map(function (a) {
      var errore = a.livello === 'errore';
      return '<div style="font-size:10px;line-height:1.5;padding:7px 9px;border-radius:8px;margin-top:4px;'
        + 'background:var(--bg-card2,#1c1c24);border-left:3px solid ' + (errore ? 'var(--red,#ef4444)' : 'var(--orange,#f59e0b)') + ';'
        + 'color:var(--text-muted,#94a3b8)">' + (errore ? '⛔ ' : '⚠️ ') + esc(a.testo) + '</div>';
    }).join('');
  }

  /* L'anteprima mostra le cose su cui il colore si vede davvero: un bottone,
     un valore importante, un testo piccolo. Un quadratino non basta. */
  function anteprima(c, car) {
    return '<div style="margin-top:4px;padding:14px;border-radius:12px;background:var(--bg-card2,#1c1c24);'
      + 'border:1px solid var(--border,#26262e);font-family:' + car.stack + '">'
      + '<div style="font-size:9px;text-transform:uppercase;letter-spacing:.7px;color:var(--text-dim,#64748b);font-weight:800;margin-bottom:9px">Anteprima</div>'
      + '<div style="display:flex;align-items:flex-end;gap:14px;flex-wrap:wrap">'
        + '<div><div style="font-size:9px;color:var(--text-dim,#64748b);text-transform:uppercase;letter-spacing:.5px">Totale preventivo</div>'
          + '<div style="font-size:26px;font-weight:900;color:' + esc(c.accento) + ';line-height:1.1">€ 1.284,50</div></div>'
        + '<button style="padding:8px 16px;border-radius:9px;border:none;cursor:default;'
          + 'background:' + esc(c.accento) + ';color:#000;font-size:12px;font-weight:800">Aggiungi voce</button>'
        + '<span style="font-size:11px;padding:3px 10px;border-radius:99px;border:1px solid ' + esc(c.accento) + ';color:' + esc(c.accento) + '">margine 42%</span>'
      + '</div>'
      + '<div style="font-size:11px;color:var(--text-muted,#94a3b8);margin-top:10px;line-height:1.55">'
        + 'Testo normale di una scheda. <span style="color:' + esc(c.accento) + ';font-weight:700">Un valore evidenziato</span> '
        + 'e una nota piccola come quelle sotto i campi.</div>'
      + '</div>';
  }

  global.InglyAspetto = {
    apri: apri, chiudi: chiudi, aggiorna: aggiorna, salva: salva, ripristina: ripristina,
    /* Letto dal collaudo. */
    _bozza: function () { return bozza; },
  };
})(typeof window !== 'undefined' ? window : globalThis);
