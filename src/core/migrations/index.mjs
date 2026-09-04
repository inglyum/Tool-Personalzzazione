import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

/* Le migrazioni si compongono dopo il core storico — hanno bisogno di `IDB`,
   che il core definisce — e prima dei moduli che leggono gli ordini. */
export const MIGRAZIONI_HOST = 'app/src/core/idb.js';

export function migrazioniJs(originalBlock) {
  const avvio = `
/* Avvio della migrazione: una volta sola, dopo che IDB è pronto. Non blocca
   l'apertura dell'app — se fallisce, il contrassegno non viene scritto e si
   riprova alla prossima apertura invece di dare per riuscito ciò che non lo è. */
(function () {
  if (typeof window === 'undefined') return;
  var avviata = false;
  function esegui(nome, migrazione) {
    if (!migrazione || typeof migrazione.esegui !== 'function') return Promise.resolve();
    return migrazione.esegui(window.IDB).then(function (r) {
      if (r && r.ok && r.scritti) {
        console.info('[INGLY] Migrazione ' + nome + ': ' + r.scritti + ' record recuperati');
      } else if (r && !r.ok) {
        console.error('[INGLY] Migrazione ' + nome + ' non riuscita: ' + (r.motivo || (r.verifica && r.verifica.problemi.join(' · '))));
      }
    }).catch(function (e) {
      if (window.Ingly && window.Ingly.Errors) window.Ingly.Errors.log('migrazione ' + nome, e);
    });
  }
  function parti() {
    if (avviata) return;
    avviata = true;
    try {
      /* Le due migrazioni sono in sequenza, non in parallelo: entrambe
         scrivono nello store orders e calcolano il primo id libero
         leggendolo. In parallelo leggerebbero lo stesso massimo e
         sceglierebbero lo stesso id, sovrascrivendosi a vicenda. */
      esegui('pipeline → ordini', window.InglyMigrazionePipeline)
        .then(function () { return esegui('Avanzamento ordini → ordini', window.InglyMigrazioneOrderTracker); });
    } catch (e) {
      if (window.Ingly && window.Ingly.Errors) window.Ingly.Errors.log('avvio migrazione', e);
    }
  }
  if (document.readyState === 'complete') setTimeout(parti, 1200);
  else window.addEventListener('load', function () { setTimeout(parti, 1200); });
})();
`;
  return originalBlock + '\n' +
    fs.readFileSync(path.join(HERE, 'pipeline-to-orders.js'), 'utf8') + '\n' +
    fs.readFileSync(path.join(HERE, 'orders-pro-to-orders.js'), 'utf8') + '\n' + avvio;
}
