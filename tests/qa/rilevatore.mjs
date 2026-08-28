/**
 * rilevatore.mjs — l'unica definizione di «sovrapposizione» del progetto.
 *
 * Vive come stringa perché il codice gira dentro la pagina, iniettato con
 * `page.addScriptTag`. Ogni cautela che contiene è nata da un falso positivo
 * misurato, non da prudenza teorica: prima contava 53 sovrapposizioni dove la
 * geometria era perfettamente impilata, poi 14 confrontando le voci con i
 * contenitori dei gruppi, poi 16 misurando rettangoli che un contenitore che
 * scorre ritagliava via.
 *
 * Chi lo usa deve tenere un controllo negativo: un rilevatore che non si vede
 * mai diventare rosso non dimostra nulla.
 */
export const RILEVATORE = `
function sovrapposizioni(radice) {
  /* Il rettangolo che conta è quello davvero dipinto: un contenitore che
     scorre ritaglia i propri figli, quindi si interseca la posizione
     dell'elemento con l'area visibile di ogni antenato che scorre. Senza
     questo passaggio una voce che sporge di 2px dal bordo del menu risulta
     sovrapposta al blocco di ricerca, dove invece è tagliata via. */
  const ritaglio = (e) => {
    const cs = getComputedStyle(e);
    if (cs.display === 'none' || cs.visibility === 'hidden' || +cs.opacity === 0) return null;
    if (!e.textContent.trim()) return null;
    let r = e.getBoundingClientRect();
    let box = { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
    for (let a = e.parentElement; a; a = a.parentElement) {
      const ac = getComputedStyle(a);
      if (ac.maxHeight === '0px' || +ac.opacity === 0 || ac.display === 'none') return null;
      if (/auto|scroll|hidden/.test(ac.overflowY) || /auto|scroll|hidden/.test(ac.overflowX) || /auto|scroll|hidden/.test(ac.overflow)) {
        const ar = a.getBoundingClientRect();
        if (!/visible/.test(ac.overflowY) && !/visible/.test(ac.overflow)) {
          box.top = Math.max(box.top, ar.top); box.bottom = Math.min(box.bottom, ar.bottom);
        }
        if (!/visible/.test(ac.overflowX) && !/visible/.test(ac.overflow)) {
          box.left = Math.max(box.left, ar.left); box.right = Math.min(box.right, ar.right);
        }
      }
      if (a === radice) break;
    }
    box.top = Math.max(box.top, 0); box.left = Math.max(box.left, 0);
    box.bottom = Math.min(box.bottom, innerHeight); box.right = Math.min(box.right, innerWidth);
    if (box.right - box.left < 20 || box.bottom - box.top < 8) return null;
    return box;
  };

  const visti = new Map();
  for (const e of radice.querySelectorAll('*')) {
    const b = ritaglio(e);
    if (b) visti.set(e, b);
  }
  /* Solo le foglie: un contenitore di gruppo è alto quanto tutte le sue voci,
     e confrontarlo con la voce di un altro gruppo produce sovrapposizioni che
     sullo schermo non esistono. */
  const foglie = [...visti.keys()].filter((e) => ![...visti.keys()].some((x) => x !== e && e.contains(x)));

  const coppie = [];
  for (let i = 0; i < foglie.length; i++) {
    for (let j = i + 1; j < foglie.length; j++) {
      const A = foglie[i], B = foglie[j], a = visti.get(A), c = visti.get(B);
      /* Almeno 10px per lato, per non contare bordi e arrotondamenti. */
      if (Math.min(a.right, c.right) - Math.max(a.left, c.left) > 10 &&
          Math.min(a.bottom, c.bottom) - Math.max(a.top, c.top) > 10) {
        coppie.push(A.textContent.trim().slice(0, 24) + ' x ' + B.textContent.trim().slice(0, 24));
      }
    }
  }
  return coppie;
}
`;
