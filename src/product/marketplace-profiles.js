/* ═══════════════════════════════════════════════════════════════════════════
   INGLY OS · PROFILI MARKETPLACE
   ═══════════════════════════════════════════════════════════════════════════

   `InglyCostEngine.prezzo()` sa già separare tre commissioni diverse —
   `commissioneMarketplacePct` (il canale), `commissionePagamentoPct` +
   `commissionePagamentoFissa` (chi incassa la carta) — e sa già separare il
   costo reale di spedizione da quanto viene addebitato al cliente
   (`spedizioneCosto`/`spedizioneAddebitata`). Nessuna di queste voci esisteva
   però nella schermata dello Smart Quoter 3D: chi vendeva su Etsy vedeva lo
   stesso prezzo di chi vende dal proprio sito, perché nessun campo chiedeva
   «dove lo vendi». Il motore era pronto, mancava solo il collegamento.

   Questo file non calcola niente: elenca, per ogni canale, le aliquote che
   quel canale dichiara pubblicamente, così chi apre il preventivatore non
   deve andare a cercarle ogni volta. Sono punti di partenza, non un dato
   immutabile — le piattaforme le cambiano, spesso per categoria o mercato, e
   la sola fonte affidabile resta il sito ufficiale del canale nel giorno in
   cui si fa il preventivo. Per questo ogni profilo porta la propria `nota` e
   nessuno di questi numeri è marcato come "verificato": lo stato onesto è
   `dichiarata` finché chi lo usa non lo conferma con la piattaforma vera.

   Restano fuori dal calcolo (e restano scritti solo nella nota) i costi che
   non sono una percentuale sull'incasso di una vendita: il canone fisso di un
   piano Shopify, il costo di un singolo annuncio Etsy (0,20 USD, per
   inserzione, indipendente dalla vendita). Metterli dentro
   `commissionePagamentoFissa` — che il motore addebita per vendita — li
   conterebbe una volta per ordine invece che una volta per inserzione: un
   errore diverso da quello che si sta correggendo, non una sua variante. */

(function (global) {
  'use strict';

  /* ── I profili ──────────────────────────────────────────────────────────
     `commissioneMarketplacePct` e `commissionePagamentoPct` si applicano al
     lordo (netto + IVA): è la piattaforma che le calcola così, sull'incasso
     reale, non sul netto dichiarato. `commissionePagamentoFissa` è per
     transazione, in euro. */
  var PROFILI = {
    diretto: {
      id: 'diretto', label: 'Vendita diretta', icona: '🧾',
      commissioneMarketplacePct: 0,
      commissionePagamentoPct: 2.9, commissionePagamentoFissa: 0.30,
      fonte: 'dichiarata', valuta: 'EUR',
      nota: 'Nessun canale: solo il gateway di pagamento (Stripe/PayPal — aliquota EU tipica). Se usi un altro gateway, correggi qui.',
    },
    etsy: {
      id: 'etsy', label: 'Etsy', icona: '🧡',
      commissioneMarketplacePct: 6.5,
      commissionePagamentoPct: 4, commissionePagamentoFissa: 0.30,
      fonte: 'dichiarata', valuta: 'EUR',
      nota: '6,5% di transaction fee su prezzo + spedizione, più Etsy Payments (~4% + 0,30 € nell\'area euro). '
        + 'Non conta l\'inserzione (0,20 USD, per annuncio, non per vendita) né l\'eventuale Offsite Ads (12–15% sulle vendite che arrivano da lì). Verifica su etsy.com/it/legal/fees.',
    },
    amazon: {
      id: 'amazon', label: 'Amazon Handmade/Marketplace', icona: '📦',
      commissioneMarketplacePct: 15,
      commissionePagamentoPct: 0, commissionePagamentoFissa: 0,
      fonte: 'dichiarata', valuta: 'EUR',
      nota: 'Referral fee: varia per categoria, 8–45%. 15% è la media più comune per artigianato e gadget personalizzati — controlla la tua categoria su venditore.amazon.it. Il pagamento è già incluso nella referral fee, nessuna commissione separata.',
    },
    shopify: {
      id: 'shopify', label: 'Sito proprio (Shopify Payments)', icona: '🛍️',
      commissioneMarketplacePct: 0,
      commissionePagamentoPct: 2.9, commissionePagamentoFissa: 0.30,
      fonte: 'dichiarata', valuta: 'EUR',
      nota: 'Nessuna commissione di canale: è il tuo negozio. Shopify Payments nell\'area euro è tipicamente 2,9% + 0,30 € per carta online — dipende dal piano. Il canone mensile del piano non è una commissione per vendita e non è contato qui.',
    },
    ebay: {
      id: 'ebay', label: 'eBay', icona: '🔷',
      commissioneMarketplacePct: 13.25,
      commissionePagamentoPct: 0, commissionePagamentoFissa: 0,
      fonte: 'dichiarata', valuta: 'EUR',
      nota: 'Final value fee ~13,25% su prezzo + spedizione (categoria-dipendente, con tetto massimo). Con i pagamenti gestiti da eBay non c\'è una commissione di incasso separata. Verifica su ebay.it/help/selling/fees-credits-invoices.',
    },
    tiktok: {
      id: 'tiktok', label: 'TikTok Shop', icona: '🎵',
      commissioneMarketplacePct: 5,
      commissionePagamentoPct: 0, commissionePagamentoFissa: 0,
      fonte: 'dichiarata', valuta: 'EUR',
      nota: 'Commissione di categoria, tipicamente intorno al 5% in fase di lancio — TikTok Shop la rivede spesso mercato per mercato: è il profilo con l\'aliquota meno stabile di questa lista, controllala prima di ogni preventivo importante.',
    },
  };

  var ORDINE = ['diretto', 'etsy', 'amazon', 'shopify', 'ebay', 'tiktok'];

  function elenco() {
    return ORDINE.map(function (id) { return PROFILI[id]; });
  }

  function profilo(id) {
    return PROFILI[id] || PROFILI.diretto;
  }

  /** Le tre chiavi che `InglyCostEngine.prezzo()` si aspetta, pronte da
      passare o da fondere con un override manuale. `extra` vince sempre:
      chi ha negoziato un'aliquota diversa dalla piattaforma non deve
      combattere contro il profilo per correggerla. */
  function opzioniPrezzo(id, extra) {
    var p = profilo(id);
    var e = extra || {};
    return {
      commissioneMarketplacePct: e.commissioneMarketplacePct != null ? e.commissioneMarketplacePct : p.commissioneMarketplacePct,
      commissionePagamentoPct: e.commissionePagamentoPct != null ? e.commissionePagamentoPct : p.commissionePagamentoPct,
      commissionePagamentoFissa: e.commissionePagamentoFissa != null ? e.commissionePagamentoFissa : p.commissionePagamentoFissa,
    };
  }

  global.InglyMarketplaces = {
    PROFILI: PROFILI,
    ORDINE: ORDINE,
    elenco: elenco,
    profilo: profilo,
    opzioniPrezzo: opzioniPrezzo,
  };
})(typeof window !== 'undefined' ? window : globalThis);
