/* ═══════════════════════════════════════════════════════════════════════════
   RELEASE INFO · versione, commit e stato dei test, nella console Admin
   ═══════════════════════════════════════════════════════════════════════════

   La console amministrativa non mostrava mai quale versione di INGLY OS
   stesse gestendo: nessun punto del codice leggeva `package.json`, perché il
   bundle finale è un file HTML statico, non un'app Node. I dati di release
   (versione, commit, branch, data di build, stato di test e QA) vengono
   incorporati qui **a tempo di build** da `scripts/compose.mjs`, che li legge
   da `package.json` e da git — non inventati, non aggiornati a mano.

   Una sola sorgente di verità: `window.INGLY_RELEASE_INFO` è scritto da
   `compose.mjs` leggendo `package.json` (version) + git (commit/branch) +
   `RELEASES.json` (stato test/QA/blocker dell'ultima release registrata per
   quella versione). Nessun secondo posto dichiara una versione diversa.

   Quello che il backend non fornisce (sottoscrizione live, utenti su un
   server, dispositivi remoti) resta dove già viveva — questo modulo non
   duplica niente, aggiunge solo l'informazione di release che mancava.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (global) {
  'use strict';

  function mount() {
    if (document.getElementById('_release-info-badge')) return;
    var info = global.INGLY_RELEASE_INFO || {};

    var badge = document.createElement('button');
    badge.id = '_release-info-badge';
    badge.type = 'button';
    badge.textContent = 'INGLY OS v' + (info.version || '?');
    badge.title = 'Informazioni di release';
    badge.style.cssText = 'position:fixed;bottom:10px;right:12px;z-index:9999;'
      + 'font-size:10px;font-family:monospace;color:var(--text-dim,#8b93a1);'
      + 'background:var(--bg-card,#1a1f29);border:1px solid var(--border,#2a3140);'
      + 'border-radius:6px;padding:3px 8px;cursor:pointer;opacity:.75';
    badge.onmouseenter = function () { badge.style.opacity = '1'; };
    badge.onmouseleave = function () { badge.style.opacity = '.75'; };
    badge.onclick = function () { apri(info); };
    document.body.appendChild(badge);
  }

  function riga(label, valore) {
    return '<div style="display:flex;justify-content:space-between;gap:12px;padding:5px 0;border-bottom:1px solid var(--border,#2a3140);font-size:12px">'
      + '<span style="color:var(--text-dim,#8b93a1)">' + label + '</span>'
      + '<span style="font-weight:700;font-family:monospace">' + (valore == null || valore === '' ? 'N/D' : String(valore)) + '</span>'
      + '</div>';
  }

  /** Un modale minimo, senza dipendere dal sistema di modali della console:
      questo widget deve funzionare anche se quel sistema cambia.

      Il badge resta sotto l'overlay una volta aperto: un secondo click sul
      badge non può mai raggiungerlo (l'overlay copre l'intera pagina), quindi
      la chiusura passa da un pulsante esplicito nel box o dal click fuori
      dal box — mai da un secondo click sul badge, che nessun utente reale
      potrebbe fare. */
  function apri(info) {
    var esistente = document.getElementById('_release-info-modal');
    if (esistente) { esistente.remove(); return; }

    var ov = document.createElement('div');
    ov.id = '_release-info-modal';
    ov.style.cssText = 'position:fixed;inset:0;z-index:10000;background:rgba(0,0,0,.5);'
      + 'display:flex;align-items:center;justify-content:center';
    ov.onclick = function (e) { if (e.target === ov) ov.remove(); };

    var box = document.createElement('div');
    box.style.cssText = 'position:relative;background:var(--bg-card,#1a1f29);border:1px solid var(--border,#2a3140);'
      + 'border-radius:12px;padding:18px 20px;width:340px;max-width:90vw;color:var(--text,#e7ebf3)';
    box.innerHTML = '<button id="_release-info-close" type="button" aria-label="Chiudi" '
      + 'style="position:absolute;top:10px;right:10px;background:none;border:none;color:var(--text-dim,#8b93a1);'
      + 'font-size:16px;cursor:pointer;line-height:1;padding:2px 6px">✕</button>'
      + '<div style="font-size:14px;font-weight:800;margin-bottom:10px">📦 Release INGLY OS</div>'
      + riga('Versione', info.version)
      + riga('Commit', info.commit ? String(info.commit).slice(0, 10) : null)
      + riga('Branch', info.branch)
      + riga('Build', info.buildDate ? String(info.buildDate).replace('T', ' ').slice(0, 16) : null)
      + '<div style="font-size:11px;font-weight:700;margin-top:10px;margin-bottom:2px;color:var(--text-dim,#8b93a1);text-transform:uppercase">Artefatti</div>'
      + riga('Product', info.productArtifact)
      + riga('Admin', info.adminArtifact)
      + '<div style="font-size:11px;font-weight:700;margin-top:10px;margin-bottom:2px;color:var(--text-dim,#8b93a1);text-transform:uppercase">Verifica</div>'
      + riga('Unit test', info.tests)
      + riga('Browser QA', info.browserQA)
      + riga('Blocker noti', info.knownBlockers || 'nessuno')
      + '<div style="font-size:10px;color:var(--text-dim,#8b93a1);margin-top:10px">'
      + 'Sottoscrizione, licenza e utenti live richiedono un backend non ancora collegato — vedi le sezioni Account e Sicurezza per lo stato locale.'
      + '</div>';
    ov.appendChild(box);
    document.body.appendChild(ov);
    box.querySelector('#_release-info-close').onclick = function () { ov.remove(); };
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount);
  else mount();
})(typeof window !== 'undefined' ? window : globalThis);
