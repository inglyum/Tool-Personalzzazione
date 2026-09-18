/* ═══════════════════════════════════════════════════════════════════════════
   MANUTENZIONE MACCHINE · una macchina più usurata costa di più, e si dice
   ═══════════════════════════════════════════════════════════════════════════

   Oggi `InglyMachineRate` (in modalità «ibrido») conosce un solo numero di
   manutenzione: un budget annuo dichiarato, diviso per le ore lavorate
   attese. È corretto come **preventivo** — quanto costa mantenere questa
   macchina in un anno normale — ma non sa niente della macchina **reale**:
   se l'ultimo intervento è di sei mesi fa o di sei ore fa, il conto esce
   identico.

   Questo modulo aggiunge quello che mancava: uno storico di interventi reali,
   e la domanda che quello storico permette di fare — «questa macchina è
   scaduta di manutenzione?» — con una risposta che non si inventa quando il
   dato per rispondere non c'è.

   Due principi, gli stessi del registro di magazzino (Fase 31):

   1. **Un intervento non si modifica mai.** Si registra un altro intervento,
      non si corregge quello vecchio — è la sola storia verificabile.
   2. **Nessun numero inventato.** Senza un intervallo di manutenzione
      dichiarato per la macchina, questo modulo non stima una scadenza: dice
      che non è calcolabile, con lo stesso linguaggio di confidenza che il
      Cost Engine già usa (`missing`/`estimated`/`declared`).

   Puro: non conosce IndexedDB, non disegna niente. La persistenza e la
   schermata sono il passo successivo — questo è il modello dati e il conto,
   che devono esistere prima di qualunque bottone (vedi il principio del
   mandato: verificare il modello prima della UI).
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var VERSIONE = '1.0.0';

  var num = function (v, d) { var n = parseFloat(v); return isFinite(n) ? n : (d || 0); };
  var pos = function (v, d) { return Math.max(0, num(v, d)); };
  function ora() { try { return new Date().toISOString(); } catch (e) { return ''; } }

  function congela(o) {
    if (!o || typeof o !== 'object') return o;
    Object.keys(o).forEach(function (k) { congela(o[k]); });
    return Object.freeze(o);
  }

  /* ── I tipi di intervento ─────────────────────────────────────────────────
     Tre, non di più. La preventiva è quella che azzera l'usura — è la sola
     che sposta la prossima scadenza. Una correttiva (un guasto) o
     un'ispezione non lo fanno: hanno riparato o verificato, non rinnovato il
     piano di manutenzione. */
  var TIPI = {
    PREVENTIVA: { label: 'Manutenzione preventiva', azzeraUsura: true },
    CORRETTIVA: { label: 'Intervento correttivo (guasto)', azzeraUsura: false },
    ISPEZIONE:  { label: 'Ispezione', azzeraUsura: false },
  };

  function valida(intervento, contesto) {
    var c = contesto || {};
    var m = intervento || {};
    var errori = [];

    if (!TIPI[m.type]) errori.push('tipo di intervento sconosciuto: ' + m.type);
    if (m.machineId == null || m.machineId === '') errori.push('intervento senza macchina');
    if (c.macchineNote && m.machineId != null && c.macchineNote.indexOf(String(m.machineId)) < 0) {
      errori.push('macchina inesistente: ' + m.machineId);
    }
    var h = parseFloat(m.hoursAtService);
    if (m.hoursAtService == null || m.hoursAtService === '' || !isFinite(h)) {
      errori.push('intervento senza ore macchina al momento del servizio');
    } else if (h < 0) {
      errori.push('ore macchina negative');
    }
    if (c.idEsistenti && m.id != null && c.idEsistenti.indexOf(String(m.id)) >= 0) {
      errori.push('id già presente nello storico: ' + m.id);
    }

    return { valido: errori.length === 0, errori: errori };
  }

  /** Un intervento, congelato alla nascita — vedi la nota d'apertura sul
      perché non si corregge mai all'indietro. */
  function crea(intervento) {
    var m = intervento || {};
    if (!TIPI[m.type]) return null;

    var ricambi = Array.isArray(m.parts) ? m.parts.map(function (p) {
      return { name: p && p.name || 'ricambio', cost: pos(p && p.cost) };
    }) : [];
    var costoRicambi = ricambi.reduce(function (a, p) { return a + p.cost; }, 0);

    return congela({
      id: m.id != null ? String(m.id) : ('mnt' + Date.now().toString(36) + Math.floor(Math.random() * 1e9).toString(36)),
      timestamp: m.timestamp || ora(),
      machineId: String(m.machineId),
      machineName: m.machineName || null,
      type: m.type,
      typeLabel: TIPI[m.type].label,
      hoursAtService: pos(m.hoursAtService),
      laborCost: pos(m.laborCost),
      parts: ricambi,
      partsCost: costoRicambi,
      totalCost: pos(m.laborCost) + costoRicambi,
      note: m.note || null,
      userId: m.userId != null ? String(m.userId) : null,
    });
  }

  function ordina(interventi) {
    return (interventi || []).slice().sort(function (a, b) {
      var ta = String(a.timestamp || ''), tb = String(b.timestamp || '');
      if (ta !== tb) return ta < tb ? -1 : 1;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
  }

  function perMacchina(interventi, machineId) {
    return (interventi || []).filter(function (m) { return String(m.machineId) === String(machineId); });
  }

  /** L'ultima manutenzione che ha azzerato l'usura — non l'ultimo intervento
      in assoluto: un'ispezione dopo una preventiva non sposta la scadenza. */
  function ultimaPreventiva(interventi, machineId) {
    var lista = ordina(perMacchina(interventi, machineId))
      .filter(function (m) { return TIPI[m.type] && TIPI[m.type].azzeraUsura; });
    return lista.length ? lista[lista.length - 1] : null;
  }

  /**
   * L'intervallo dichiarato per la macchina, in ore. Legge i nomi di campo
   * che la scheda macchina già usa (`maintenanceIntervalHours`) con un
   * ripiego sul nome più corto, senza inventare un default: una macchina
   * senza intervallo dichiarato non ha una scadenza calcolabile, e dirlo è
   * meglio che inventare un numero che nessuno ha scritto.
   */
  function intervalloDi(macchina) {
    var m = macchina || {};
    var v = pos(m.maintenanceIntervalHours != null ? m.maintenanceIntervalHours : m.maintIntervalHours);
    return v > 0 ? v : null;
  }

  /**
   * Ore trascorse dall'ultima manutenzione preventiva, e usura come frazione
   * dell'intervallo dichiarato. `oreCorrenti` sono le ore macchina di oggi
   * (lo stesso `hoursWorked` che la scheda macchina già tiene) — questo
   * modulo non le misura, le riceve.
   */
  function stato(macchina, interventi, oreCorrenti) {
    var intervallo = intervalloDi(macchina);
    var ultima = ultimaPreventiva(interventi, macchina && macchina.id);
    var oreOggi = pos(oreCorrenti != null ? oreCorrenti : (macchina && macchina.hoursWorked));
    var oreAlServizio = ultima ? pos(ultima.hoursAtService) : 0;
    var oreTrascorse = Math.max(0, oreOggi - oreAlServizio);

    if (!intervallo) {
      return {
        calcolabile: false, motivo: 'nessun intervallo di manutenzione dichiarato per la macchina',
        confidence: 'missing', usura: null, oreTrascorse: oreTrascorse, oreAlProssimoServizio: null,
        ultimaPreventiva: ultima, stato: 'non_configurato',
      };
    }

    var usura = oreTrascorse / intervallo;
    var esito = usura >= 1 ? 'scaduta' : (usura >= 0.8 ? 'vicina' : 'ok');

    return {
      calcolabile: true,
      confidence: ultima ? 'declared' : 'estimated',
      usura: usura,
      oreTrascorse: oreTrascorse,
      intervalloOre: intervallo,
      oreAlProssimoServizio: Math.max(0, intervallo - oreTrascorse),
      ultimaPreventiva: ultima,
      stato: esito,
      motivo: ultima ? null : 'nessuna manutenzione preventiva registrata: l\'usura è stimata dalle ore totali della macchina, non da un servizio reale',
    };
  }

  /**
   * La tariffa oraria effettiva: parte da `InglyMachineRate.tariffa()` (la
   * tariffa **preventivata**) e, solo quando l'usura è calcolabile, applica
   * un sovrapprezzo sulla sola componente di manutenzione — mai
   * sull'ammortamento, che non ha a che fare con quanto la macchina è
   * scaduta di servizio.
   *
   * L'assunzione è dichiarata, non nascosta: una macchina scaduta del
   * doppio del suo intervallo (usura = 2) costa il doppio della sua
   * manutenzione preventivata, con un tetto a ×3 perché oltre quella soglia
   * il dato dice «va fermata e riparata», non «costa di più» — è lo stesso
   * principio del tetto di ragionevolezza che `InglyMachineRate` già applica
   * all'ammortamento.
   */
  var MOLTIPLICATORE_MASSIMO = 3;

  function tariffaEffettiva(macchina, interventi, oreCorrenti) {
    var M = global.InglyMachineRate;
    var base = M && typeof M.tariffa === 'function' ? M.tariffa(macchina || {})
      : { euroOra: 0, componenti: { ammortamento: 0, manutenzione: 0, dichiarata: 0 }, avvisi: [], confidence: 'missing' };
    var s = stato(macchina, interventi, oreCorrenti);

    if (!s.calcolabile || base.modo === 'manuale') {
      return Object.assign({}, base, {
        usura: s, sovrapprezzoManutenzione: 0,
        assunzione: base.modo === 'manuale'
          ? 'tariffa dichiarata a mano: l\'usura non la modifica'
          : 'usura non calcolabile: la tariffa resta quella preventivata, senza sovrapprezzo',
      });
    }

    var moltiplicatore = 1 + Math.min(MOLTIPLICATORE_MASSIMO - 1, Math.max(0, s.usura - 1));
    var manutenzioneBase = pos(base.componenti && base.componenti.manutenzione);
    var manutenzioneEffettiva = manutenzioneBase * moltiplicatore;
    var sovrapprezzo = manutenzioneEffettiva - manutenzioneBase;
    var euroOraEffettiva = pos(base.euroOra) + sovrapprezzo;

    return Object.assign({}, base, {
      euroOra: Math.round(euroOraEffettiva * 100) / 100,
      euroOraPreventivata: base.euroOra,
      usura: s,
      sovrapprezzoManutenzione: Math.round(sovrapprezzo * 100) / 100,
      assunzione: sovrapprezzo > 0
        ? 'manutenzione scaduta di ' + Math.round((s.usura - 1) * 100) + '%: componente di manutenzione moltiplicata ×' + (Math.round(moltiplicatore * 100) / 100) + ' (tetto ×' + MOLTIPLICATORE_MASSIMO + ')'
        : 'entro l\'intervallo di manutenzione: nessun sovrapprezzo',
    });
  }

  /** Le macchine da guardare oggi: scadute o vicine alla scadenza. Non
      inventa una lista se manca l'intervallo — quelle restano fuori con la
      loro ragione, leggibile da chi deve completare la scheda macchina. */
  function allerta(macchine, interventi, oreCorrentiPer) {
    var oc = oreCorrentiPer || {};
    return (macchine || []).map(function (m) {
      var oreCorrenti = oc[m.id] != null ? oc[m.id] : m.hoursWorked;
      return { machineId: m.id, machineName: m.name || m.label || null, stato: stato(m, interventi, oreCorrenti) };
    }).filter(function (r) { return r.stato.calcolabile && (r.stato.stato === 'scaduta' || r.stato.stato === 'vicina'); })
      .sort(function (a, b) { return (b.stato.usura || 0) - (a.stato.usura || 0); });
  }

  global.InglyMachineMaintenance = {
    VERSIONE: VERSIONE,
    TIPI: TIPI,
    MOLTIPLICATORE_MASSIMO: MOLTIPLICATORE_MASSIMO,
    valida: valida,
    crea: crea,
    ordina: ordina,
    perMacchina: perMacchina,
    ultimaPreventiva: ultimaPreventiva,
    intervalloDi: intervalloDi,
    stato: stato,
    tariffaEffettiva: tariffaEffettiva,
    allerta: allerta,
  };
})(typeof window !== 'undefined' ? window : globalThis);
