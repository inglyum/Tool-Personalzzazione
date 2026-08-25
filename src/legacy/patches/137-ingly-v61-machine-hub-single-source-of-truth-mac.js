
/* ═══════════════════════════════════════════════════════════════════════════
   INGLY v61 — MACHINE HUB (Single Source of Truth macchine)
   Le macchine del parco (store 'equipment') diventano disponibili nei quoter
   (LaserB2B) senza duplicare i dati: MERGE additivo in LaserB2B._MACHINES.
   Modifichi una macchina in Attrezzature → si riflette nel quoter.
   NON rimuove i preset esistenti. Valori numerici garantiti (no NaN nel calcolo).
   ═══════════════════════════════════════════════════════════════════════════ */
(function(){
  "use strict";
  var ICONS={ 'CO₂':'🔵','CO2':'🔵','Fibra/MOPA':'✨','Fibra':'✨','Diodo':'⚡','Diodo+Fibra':'⚡',
    'Stampa UV':'🌈','DTF':'🎨','DTF/DTG':'🎨','Sublimazione':'☕','CNC':'🔩','CNC/Laser/3D':'🔩','CO₂+CNC':'🔵' };
  var COLORS={ '🔵':'#3b82f6','✨':'#a855f7','⚡':'#fbbf24','🌈':'#ec4899','🎨':'#f97316','☕':'#10b981','🔩':'#64748b' };

  function num(v,d){ v=parseFloat(v); return (isFinite(v)&&v>0)?v:d; }

  // Mappa un record 'equipment' nella forma macchina del quoter (con default sicuri)
  function mapEquip(e){
    var icon=ICONS[e.tech]||'⚙️';
    // hourly/energyH sono €/ORA (come i preset del quoter): il calcolo divide /60.
    var lifeYears = num(e.lifeYears, 6);
    // Deprezzamento €/h ≈ costo acquisto / anni vita / ~1650 h/anno (come i preset).
    var hourly = num(e.costBuy,0)>0 ? (e.costBuy/lifeYears/1650) : num(e.costHour, 0.15);
    if(!(hourly>0)) hourly = 0.15;
    // Energia €/h = kW × 0.28 €/kWh.
    var energyH = num(e.powerW,0)>0 ? (e.powerW/1000*0.28) : 0.02;
    return {
      label: (e.name || ((e.brand||'')+' '+(e.model||''))).trim() || 'Macchina',
      icon: icon, color: COLORS[icon]||'#fbbf24',
      desc: (e.tech||'')+(e.workArea?(' · '+e.workArea):''),
      materials: e.materials||'',
      purchaseCost: num(e.costBuy, 0),
      lifeYears: 6,
      watts: num(e.powerW, 0),
      hourly: hourly,
      energyH: energyH,
      timePerMm2: 0.0012,          // stima di default, l'utente può calibrare
      _equipId: e.id, _fromHub: true
    };
  }

  var MachineHub = {
    _busy:false,
    // Lista unificata (preset quoter + parco macchine) — SSOT documentata
    async list(){
      var out={};
      try{ if(typeof LaserB2B!=='undefined'&&LaserB2B._MACHINES) Object.assign(out, LaserB2B._MACHINES); }catch(e){}
      try{ var eq=await IDB.getAll('equipment'); (eq||[]).forEach(function(e){ out['eq_'+e.id]=mapEquip(e); }); }catch(e){}
      return out;
    },
    // Fonde le macchine del parco dentro LaserB2B._MACHINES (additivo)
    async sync(){
      if(this._busy) return; this._busy=true;
      try{
        if(typeof LaserB2B==='undefined'||!LaserB2B._MACHINES){ this._busy=false; return; }
        var eq=await IDB.getAll('equipment').catch(function(){return [];});
        // rimuovi vecchie voci hub (per riflettere modifiche/cancellazioni) e ri-aggiungi
        Object.keys(LaserB2B._MACHINES).forEach(function(k){ if(k.indexOf('eq_')===0) delete LaserB2B._MACHINES[k]; });
        (eq||[]).forEach(function(e){
          if(e && (e.name||e.brand)) LaserB2B._MACHINES['eq_'+e.id]=mapEquip(e);
        });
      }catch(e){}
      this._busy=false;
    }
  };
  window.MachineHub = MachineHub;

  // ── Aggancio: sync dopo che LaserB2B è pronto, alla navigazione e ai cambi parco ──
  function boot(){
    if(typeof LaserB2B==='undefined'||!LaserB2B._MACHINES){ return setTimeout(boot,900); }
    MachineHub.sync();
    // Wrappa render del quoter per ri-fondere prima di disegnare il dropdown
    try{
      if(LaserB2B.render && !LaserB2B.render.__hubWrapped){
        var _r=LaserB2B.render.bind(LaserB2B);
        LaserB2B.render=function(){ try{ MachineHub.sync(); }catch(e){} return _r.apply(this, arguments); };
        LaserB2B.render.__hubWrapped=true;
      }
    }catch(e){}
    // Ri-sync su navigazione e su cambi equipment
    try{ if(typeof Bus!=='undefined'&&Bus.on){ Bus.on('nav:laser_b2b',function(){ MachineHub.sync(); });
      Bus.on('equipment:changed',function(){ MachineHub.sync(); }); } }catch(e){}
    try{ if(typeof AppStore!=='undefined'&&AppStore.on) AppStore.on('equipment',function(){ MachineHub.sync(); }); }catch(e){}
  }
  if(document.readyState!=='loading') setTimeout(boot,1500); else document.addEventListener('DOMContentLoaded',function(){ setTimeout(boot,1500); });
})();
