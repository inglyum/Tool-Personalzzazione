/* BackupZIP — Fix: il pulsante "Backup ZIP" chiamava un oggetto inesistente.
   Produce uno ZIP con ingly_data.json (formato INGLY_FULL, ripristinabile) + cartella media/ con le immagini estratte. */
window.BackupZIP = {
  async export(){
    if(typeof JSZip==='undefined'){ (window.toast||alert)('JSZip non disponibile in questa build','error'); return; }
    if(typeof IDB==='undefined'||!IDB.exportAll){ (window.toast||alert)('Storage non pronto — riprova tra un istante','warning'); return; }
    try{
      window.toast&&toast('Creazione backup ZIP...','info',2500);
      const allData = await IDB.exportAll().catch(()=>({}));
      // Escludi store effimeri/cache che si rigenerano
      ['kpi_snap','kpi_cache','notifications','ai_log','scanner_history','backups'].forEach(s=>{ delete allData[s]; });
      const zip = new JSZip();
      const media = zip.folder('media');
      const imgFields = ['image','img','photo','thumbnail','imageData','base64','photoData'];
      const extRe = /^data:image\/(png|jpe?g|webp|gif|svg\+xml);base64,/i;
      let nImg = 0;
      for(const [store,records] of Object.entries(allData)){
        if(!Array.isArray(records)) continue;
        records.forEach(rec=>{
          if(!rec||typeof rec!=='object') return;
          imgFields.forEach(f=>{
            const v = rec[f];
            if(typeof v==='string' && v.length>100 && v.startsWith('data:image')){
              const m = extRe.exec(v);
              const ext = m ? m[1].replace('jpeg','jpg').replace('svg+xml','svg') : 'bin';
              const b64 = v.slice(v.indexOf(',')+1);
              const id = (rec.id!=null?rec.id:'x');
              const fname = (store+'_'+id+'_'+f+'.'+ext).replace(/[^A-Za-z0-9._-]/g,'_');
              try{ media.file(fname, b64, {base64:true}); nImg++; }catch(_){}
            }
          });
        });
      }
      // ingly_data.json — formato INGLY_FULL: i record contengono gia' i base64 → ripristino completo
      const payload = { _ts:new Date().toISOString(), _v:'INGLY_FULL', data:allData };
      zip.file('ingly_data.json', JSON.stringify(payload));
      const records = Object.values(allData).reduce((a,v)=>a+(Array.isArray(v)?v.length:0),0);
      const date = new Date().toISOString().slice(0,10);
      zip.file('LEGGIMI.txt',
        'INGLY OS — BACKUP ZIP\n=====================\n'+
        'Creato: '+new Date().toLocaleString('it-IT')+'\n\n'+
        'CONTENUTO:\n'+
        '- ingly_data.json  -> tutti i dati + immagini (RIPRISTINABILE)\n'+
        '- media/           -> le immagini estratte come file separati (consultazione)\n\n'+
        'RECORD: '+records+'   IMMAGINI: '+nImg+'\n\n'+
        'RIPRISTINO:\n'+
        '1. Apri INGLY OS nel browser\n'+
        '2. Vai su Backup Locale\n'+
        '3. Usa il ripristino "Backup COMPLETO" e seleziona ingly_data.json\n\n'+
        'NOTA: le chiavi API NON sono incluse per sicurezza.\n');
      const blob = await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}},
        meta=>{ if(window.toast && meta.percent%25 < 1.5) toast('ZIP: '+Math.round(meta.percent)+'%...','info',1000); });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'Ingly_Backup_'+date+'.zip';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(()=>URL.revokeObjectURL(a.href), 15000);
      window.toast&&toast('Backup ZIP scaricato: '+records+' record, '+nImg+' immagini ('+(blob.size/1048576).toFixed(1)+' MB)','success',6000);
    }catch(e){
      console.error('[BackupZIP]', e);
      window.toast&&toast('Errore backup ZIP: '+(e.message||e),'error',7000);
    }
  }
};
