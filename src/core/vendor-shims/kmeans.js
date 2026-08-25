/* ═══════════════════════════════════════════════════════════════════════════
   ml-kmeans → simple-statistics
   ═══════════════════════════════════════════════════════════════════════════

   Il v96 caricava `ml-kmeans` da un CDN per una sola funzione: raggruppare i
   clienti in cluster RFM. Era l'unico script esterno rimasto in un prodotto
   offline-first, e senza rete la segmentazione restituiva un elenco vuoto —
   in silenzio, perché il chiamante ha una guardia `|| !KMeans` che nasconde
   l'assenza della libreria.

   `simple-statistics`, già vendorizzata inline nel monolite, contiene
   `kMeansCluster` con lo stesso algoritmo. Qui viene adattata all'interfaccia
   che il codice esistente si aspetta, così il chiamante non cambia.
   ═══════════════════════════════════════════════════════════════════════════ */

(function (global) {
  'use strict';
  if (global.ml_kmeans) return;

  function KMeans(options) {
    var opts = options || {};
    this.k = opts.k || 3;
    this.maxIterations = opts.maxIterations || 100;
  }

  /** @returns {number[]} l'indice di cluster per ogni punto, nello stesso ordine. */
  KMeans.prototype.predict = function (data) {
    if (!global.ss || typeof global.ss.kMeansCluster !== 'function') return data.map(function () { return 0; });
    if (!data.length) return [];
    // Meno punti che cluster: kMeansCluster solleverebbe "Centroid has no friends".
    var k = Math.min(this.k, data.length);
    try {
      return global.ss.kMeansCluster(data, k).labels;
    } catch (e) {
      return data.map(function () { return 0; });
    }
  };

  global.ml_kmeans = { KMeans: KMeans };
})(window);
