
/* ════ INGLY OS — SEED DI SVILUPPO (disattivato di default) ════

   Questo file seminava, a ogni avvio, un utente:

       owner / standalone
       plan: 'enterprise'   modules: ['*']   status: 'lifetime'
       passwordHash: 'standalone'            ← la password, in chiaro

   Cioè una credenziale scritta nel codice sorgente, con tutti i diritti e
   senza scadenza, presente in ogni copia distribuita del prodotto. Chiunque
   avesse letto il file — o il bundle, che è pubblico per costruzione — sarebbe
   entrato in qualunque installazione.

   In una versione commerciale non è un comodo: e' una porta di servizio.

   Ora il seed esiste ancora, perché serve davvero a sviluppare e a collaudare,
   ma **non parte da solo**. Occorre accenderlo esplicitamente:

       localStorage.setItem('ingly_dev_seed', '1')

   e, in quel caso, la password non e' scritta qui: viene generata a caso al
   primo avvio e mostrata una volta sola in console. Una password casuale in un
   ambiente di sviluppo e' utile; una password uguale su diecimila
   installazioni non lo e' mai stata.

   Il seed rifiuta di partire se l'archivio contiene gia' utenti veri: un
   ambiente con dati non e' piu' un ambiente di sviluppo. */
(function(){
  try{
    if(typeof localStorage === 'undefined') return;
    if(localStorage.getItem('ingly_dev_seed') !== '1') return;

    var dbKey='ingly_saas_db';
    var db;
    try{ db=JSON.parse(localStorage.getItem(dbKey)||'{}')||{}; }
    catch(e){
      /* Archivio illeggibile: non lo si sovrascrive per comodita'. */
      console.warn('[INGLY OS] seed di sviluppo: archivio illeggibile, non tocco nulla');
      return;
    }
    if(!db.users) db.users=[];

    var altri = db.users.filter(function(u){ return u && u.id !== 'dev-owner'; });
    if(altri.length){
      console.warn('[INGLY OS] seed di sviluppo ignorato: l\'archivio contiene gia\' '+altri.length+' utenti');
      return;
    }
    if(db.users.some(function(u){ return u && u.id==='dev-owner'; })) return;

    /* Una password diversa per ogni installazione, mostrata una volta sola. */
    var pwd = 'dev-';
    try{
      var buf = new Uint8Array(9);
      (window.crypto||crypto).getRandomValues(buf);
      for(var i=0;i<buf.length;i++) pwd += 'abcdefghijkmnpqrstuvwxyz23456789'[buf[i] % 32];
    }catch(e){ pwd += String(Date.now()); }

    var scrivi = function(hash){
      db.users.unshift({
        id:'dev-owner', user_id:'dev-owner',
        email:'dev@localhost', nome:'Sviluppo',
        status:'active', active:true,
        tenant_id:'dev-tenant', ruolo:'owner',
        password_hash: hash,
        created_at: new Date().toISOString(),
        _seedSviluppo: true,
      });
      localStorage.setItem(dbKey,JSON.stringify(db));
      console.warn('[INGLY OS] seed di sviluppo creato — dev@localhost / '+pwd+'\n'
        +'Questa password non verra\' mostrata di nuovo e non esiste altrove.');
    };

    if(window.InglyIdentita && typeof window.InglyIdentita.cifra==='function'){
      window.InglyIdentita.cifra(pwd).then(scrivi).catch(function(e){
        console.warn('[INGLY OS] seed di sviluppo non creato:', e && e.message);
      });
    } else {
      console.warn('[INGLY OS] seed di sviluppo non creato: modulo identita\' non caricato');
    }
  }catch(e){}
})();
