
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v70 — PREMIUM SHELL (salto di qualità UI, fascia ERP top)
   Layer CSS ADDITIVO che eleva l'intera app senza toccare token/logica.
   Leve applicate (dalla skill ui-design, rischio ~0):
   1) Tipografia & numeri: scala coerente, tabular-nums su KPI/tabelle/valute,
      titoli bilanciati, letter-spacing su label maiuscole.
   2) Elevazione & profondità: ombre multi-livello, gerarchia superfici, bordi.
   3) Movimento: micro-interazioni su card/kpi con easing, reduced-motion.
   Solo transform/box-shadow/opacity/filter/font/color. Theme-aware (usa i token).
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  if(document.getElementById('v70-premium-css')) return;
  var css=`
  /* ─ 1. TIPOGRAFIA & NUMERI ─────────────────────────────────────────── */
  .kpi-value, .ds-table td, .ds-table th, table td, table th,
  #erp-intel-panel .val, #erp-intel-panel [class*="kpi"],
  .kpi-card *, [class*="amount"], [class*="price"], [class*="total"], [class*="euro"]{
    font-variant-numeric: tabular-nums; font-feature-settings:"tnum" 1,"cv01" 1; }
  .module-title, .module-header h1, .module-header h2, .module-header h3{
    text-wrap: balance; letter-spacing:-.01em; }
  .kpi-label, .nav-group-title, .ds-label, [class*="uppercase"]{
    letter-spacing:.04em; }
  .module-title{ font-weight:800; }

  /* ─ 2. ELEVAZIONE & PROFONDITÀ ─────────────────────────────────────── */
  .kpi-card, .card{
    box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,.18)),
                0 1px 0 rgba(255,255,255,.02) inset;
    transition: transform .16s var(--ease-out, cubic-bezier(.16,1,.3,1)),
                box-shadow .18s ease, border-color .18s ease; }
  .kpi-card{ position:relative; overflow:hidden; }
  /* sottile accento superiore sulle KPI card, dal colore brand */
  .kpi-card::before{ content:""; position:absolute; top:0; left:0; right:0; height:2px;
    background: linear-gradient(90deg, transparent, color-mix(in srgb, var(--primary,#fbbf24) 55%, transparent), transparent);
    opacity:.5; }

  /* ─ 3. MOVIMENTO & MICRO-INTERAZIONI ───────────────────────────────── */
  @media (prefers-reduced-motion: no-preference){
    .kpi-card:hover, .card:hover{
      transform: translateY(-2px);
      box-shadow: var(--shadow-md, 0 8px 24px rgba(0,0,0,.28)); }
    .kpi-card:hover::before{ opacity:1; }
    /* entrata morbida delle sezioni */
    .section-view.active{ animation: v70In .28s var(--ease-out, cubic-bezier(.16,1,.3,1)); }
    @keyframes v70In{ from{ opacity:0; transform: translateY(6px); } to{ opacity:1; transform:none; } }
  }

  /* ─ Rifiniture di ritmo (safe: solo su contenitori premium) ─────────── */
  .module-header{ padding-bottom:2px; }
  .ds-table-wrap{ box-shadow: var(--shadow-sm, 0 1px 2px rgba(0,0,0,.16)); }
  /* focus ring coerente ovunque (WCAG) */
  button:focus-visible, a:focus-visible, [role="button"]:focus-visible, .tab-btn:focus-visible{
    outline: 2px solid var(--primary,#fbbf24); outline-offset: 2px; }

  /* scrollbar discreta, coerente col tema (webkit) */
  ::-webkit-scrollbar{ width:10px; height:10px; }
  ::-webkit-scrollbar-thumb{ background: color-mix(in srgb, var(--text-dim,#6b7280) 35%, transparent);
    border-radius:8px; border:2px solid transparent; background-clip:padding-box; }
  ::-webkit-scrollbar-thumb:hover{ background: color-mix(in srgb, var(--text-muted,#9ca3af) 45%, transparent); background-clip:padding-box; }
  ::-webkit-scrollbar-track{ background: transparent; }
  `;
  var st=document.createElement('style'); st.id='v70-premium-css'; st.textContent=css;
  (document.head||document.documentElement).appendChild(st);
})();
