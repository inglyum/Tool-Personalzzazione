
/* ════ INGLY OS v92 — SEED LICENZA OWNER (login RIATTIVATO) ════
   La modalità no-login è stata disattivata: l'app parte dalla schermata di
   accesso (SaaSGate). Qui seminiamo solo un utente owner Enterprise (lifetime)
   così puoi entrare al primo avvio e gestire le altre licenze/pacchetti.
   Credenziali di default: owner / standalone — cambiale dall'Admin tool. */
(function(){
  try{
    var dbKey='ingly_saas_db';
    var db=JSON.parse(localStorage.getItem(dbKey)||'{}');
    if(!db.users) db.users=[];
    if(!db.users.some(function(u){return u.username==='owner';})){
      db.users.unshift({
        id:'standalone-owner', userId:'standalone-owner', username:'owner',
        nome:'Lab', labName:'INGLY OS', email:'owner@ingly.io',
        plan:'enterprise', plan_id:'enterprise', modules:['*'],
        active:true, status:'lifetime', expiresAt:null,
        passwordHash:'standalone', password_hash:'standalone'
      });
      localStorage.setItem(dbKey,JSON.stringify(db));
    }
  }catch(e){}
  console.log('[INGLY OS] Login attivo — seed owner (owner/standalone) garantito');
})();
