/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · UNA SOLA PORTA D'INGRESSO
   ═══════════════════════════════════════════════════════════════════════════

   Aprendo il file per la prima volta si spalancavano sette sovrapposizioni una
   sull'altra: tre benvenuti diversi (un wizard da 5 passi, un onboarding da 4,
   un tour da 7), il briefing del mattino su un laboratorio senza dati, il
   cancello delle licenze e due indicatori di salvataggio. Ognuno scritto in un
   momento diverso della storia del prodotto, ognuno convinto di essere il primo
   a parlare.

   Un artigiano che apre il gestionale non deve chiudere sei finestre per
   arrivare al lavoro.

   Qui non se ne elimina nessuno: se ne sceglie **uno** che parli per primo, e
   gli altri restano richiamabili quando servono davvero. La scelta non è di
   gusto — parla il wizard di configurazione, perché è l'unico che raccoglie
   dati che al prodotto servono: nome del laboratorio, identità, tariffe. Gli
   altri due raccontano cosa fa il prodotto, e si possono guardare dopo.

       InglyFirstRun.tour()          il tour guidato, quando lo si vuole
       InglyFirstRun.onboarding()    la presentazione in 4 passi
       InglyFirstRun.configura()     riapre il wizard di configurazione

   Sono anche comandi della palette: si trovano scrivendo «tour».
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';

  var FATTO = 'ingly_first_run_v1';

  /* I contrassegni con cui ciascun sistema ricorda di aver già parlato.
     Metterli qui è il modo per non doverli inseguire in quattro file. */
  var VOCI = {
    onboarding: '_wizard_done_v37',
    tour: 'ingly_tour_done_v1',
    briefing: 'ingly_briefing_shown',
  };

  function leggi(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function scrivi(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* spazio esaurito: già segnalato altrove */ } }

  /* Il briefing ricorda la data dell'ultima volta: scrivendoci oggi si tace
     per oggi, e domani parla di nuovo — che è il suo scopo. */
  function oggi() { return new Date().toISOString().split('T')[0]; }

  var primaVolta = !leggi(FATTO);

  if (primaVolta) {
    scrivi(VOCI.onboarding, '1');
    scrivi(VOCI.tour, '1');
    scrivi(VOCI.briefing, oggi());
    scrivi(FATTO, new Date().toISOString());

    /* I contrassegni bastano solo se nessuno ha già programmato la propria
       comparsa. Alcuni lo fanno con un `setTimeout` deciso all'avvio, quindi
       si silenzia anche il metodo — per questa sessione soltanto. */
    setTimeout(function () {
      if (global.OnboardingWizard && typeof global.OnboardingWizard.show === 'function') {
        global.OnboardingWizard._showOriginale = global.OnboardingWizard.show;
        global.OnboardingWizard.show = function () { /* zitto al primo avvio */ };
      }
      if (global.MorningBriefing && typeof global.MorningBriefing.maybeShow === 'function') {
        global.MorningBriefing._maybeShowOriginale = global.MorningBriefing.maybeShow;
        global.MorningBriefing.maybeShow = function () { /* niente da riassumere su un archivio vuoto */ };
      }
    }, 0);
  }

  function ripristina(oggetto, nome, originale) {
    if (oggetto && oggetto[originale]) { oggetto[nome] = oggetto[originale]; delete oggetto[originale]; }
  }

  global.InglyFirstRun = {
    primaVolta: primaVolta,

    /** Il tour guidato in 7 passi. */
    tour: function () {
      try { localStorage.removeItem(VOCI.tour); } catch (e) {}
      if (global.InglyTour && global.InglyTour.start) return global.InglyTour.start();
      if (global.startTour) return global.startTour();
      if (global.InglyUI) global.InglyUI.toast('Il tour non è disponibile in questa versione', 'warning');
    },

    /** La presentazione in 4 passi. */
    onboarding: function () {
      ripristina(global.OnboardingWizard, 'show', '_showOriginale');
      try { localStorage.removeItem(VOCI.onboarding); } catch (e) {}
      if (global.OnboardingWizard && global.OnboardingWizard.show) return global.OnboardingWizard.show();
      if (global.InglyUI) global.InglyUI.toast('La presentazione non è disponibile', 'warning');
    },

    /** Il wizard che raccoglie la configurazione del laboratorio. */
    configura: function () {
      try { localStorage.removeItem('ingly_wizard_done_v2'); } catch (e) {}
      if (global.SetupWizard && global.SetupWizard.show) return global.SetupWizard.show();
      if (global.App && global.App.navigate) global.App.navigate('settings');
    },

    /** Il riassunto della giornata, su richiesta. */
    briefing: function () {
      ripristina(global.MorningBriefing, 'maybeShow', '_maybeShowOriginale');
      if (global.MorningBriefing && global.MorningBriefing.show) return global.MorningBriefing.show();
    },
  };

  /* I tre percorsi entrano nella palette: nascosti al primo avvio, ma non
     perduti. Si trovano scrivendo «tour», «guida» o «configurazione». */
  setTimeout(function () {
    if (!global.InglyPalette || !global.InglyPalette.COMMANDS) return;
    global.InglyPalette.COMMANDS.push(
      { label: 'Configurazione del laboratorio', hint: 'Nome, identità, tariffe', icon: 'fa-sliders', run: global.InglyFirstRun.configura },
      { label: 'Tour guidato', hint: 'Come si usa INGLY OS, in 7 passi', icon: 'fa-route', run: global.InglyFirstRun.tour },
      { label: 'Presentazione', hint: 'Cosa sa fare il prodotto, in 4 passi', icon: 'fa-circle-play', run: global.InglyFirstRun.onboarding },
      { label: 'Riassunto della giornata', hint: 'Scadenze, urgenze, incassi', icon: 'fa-mug-hot', run: global.InglyFirstRun.briefing },
      /* L'aspetto si cambia da qui e dai due pannelli di branding: tre porte,
         una stanza sola. */
      { label: 'Aspetto', hint: 'Tema, colore d\'accento, carattere', icon: 'fa-palette',
        run: function () { if (global.InglyAspetto) global.InglyAspetto.apri(); } }
    );
  }, 1500);
})(window);
