
// === /src/modules/items/index.js ===
// Items Module - INGLY OS v88
const Inventory={
  editId:null,
  filterVal:'',
  async render(){
    try {

    const items=await IDB.getAll('inventory');
    const filtered=items.filter(i=>!this.filterVal||i.name.toLowerCase().includes(this.filterVal)||i.sku.toLowerCase().includes(this.filterVal)||(i.category||'').toLowerCase().includes(this.filterVal));
    const el=eid('inventory-tbody');if(!el)return;
    const low=items.filter(i=>(+i.stock||0)<=(+i.minStock||0));
    const alertEl=eid('inventory-alerts');
    if(alertEl&&low.length)alertEl.innerHTML=`<div class="alert alert-danger"><i class="fas fa-exclamation-triangle"></i> <strong>${low.length} articoli</strong> sotto scorta minima: ${low.map(i=>sanitize(i.name)).join(', ')}</div>`;
    else if(alertEl)alertEl.innerHTML='';
    el.innerHTML=filtered.map(i=>{
      const pct=i.minStock>0?Math.min(100,Math.round(i.stock/i.minStock*100)):100;
      const statusClass=i.stock<=0?'badge-red':i.stock<=i.minStock?'badge-yellow':'badge-green';
      const statusTxt=i.stock<=0?'⛔ Esaurito':i.stock<=i.minStock?'⚠️ Bassa':'✅ OK';
      return`<tr>
        <td><code style="color:var(--primary);font-size:11px">${i.sku}</code></td>
        <td><strong>${i.name}</strong><br><small class="text-muted">${i.supplier||''}</small></td>
        <td><span class="badge badge-gray" style="font-size:10px">${i.category}</span></td>
        <td>
          <div style="display:flex;align-items:center;gap:6px">
            <button class="act-btn" style="background:#ef444418;color:#f87171;border-color:#ef444430;padding:3px 8px;font-size:12px" onclick="Inventory.adjust(${i.id},-1)">−</button>
            <strong style="min-width:40px;text-align:center">${i.stock} <small class="text-muted">${i.unit||'pz'}</small></strong>
            <button class="act-btn" style="background:#22c55e18;color:#4ade80;border-color:#22c55e30;padding:3px 8px;font-size:12px" onclick="Inventory.adjust(${i.id},1)">+</button>
          </div>
          <div class="progress mt-8" style="height:3px"><div class="progress-bar ${pct<50?'red':pct<80?'':'green'}" style="width:${pct}%"></div></div>
        </td>
        <td style="color:var(--text-muted)">${i.minStock}</td>
        <td style="color:var(--primary)">${fmtCur(i.costPrice)}</td>
        <td><strong>${fmtCur((+i.stock||0)*(+i.costPrice||0))}</strong></td>
        <td><span class="badge ${statusClass}" style="white-space:nowrap">${statusTxt}</span></td>
        <td>
          <div class="act-group">
            <button class="act-btn act-edit" onclick="Inventory.openModal(${i.id})"><i class="fas fa-edit"></i> Modifica</button>
            <button class="act-btn act-del" onclick="Inventory.del(${i.id})"><i class="</div>
        </td>
      </tr>`;
    }).join('');
    } catch(e){ console.error('[Quoter.render]', e.message||e); }
  },
  filter(v){this.filterVal=v.toLowerCase();this.render();},
  async adjust(id,delta){
    const item=await IDB.get('inventory',id);if(!item)return;
    const Inv = typeof window !== 'undefined' && window.InglyInventory;
    if (Inv) {
      const esito = await Inv[delta >= 0 ? 'acquista' : 'consuma']('inventory', id, Math.abs(delta), {
        itemName: item.name || null, unit: item.unit || null,
        unitCost: item.costPrice != null ? +item.costPrice : null,
        referenceType: 'MANUAL', note: 'rettifica manuale dall\'elenco articoli',
      });
      if (esito && esito.ok) { await this.render(); return; }
    }
    item.stock=Math.max(0,(+item.stock||0)+delta);
    await IDB.put('inventory',item);
    await logAction('inventory',id,'stock_adjusted',{delta,stock:item.stock});
    await this.render();
  },
  async openModal(id=null){
    this.editId=id;
    eid('modal-inv-title').textContent=id?'Modifica Articolo':'Aggiungi Articolo';
    if(id){const i=await IDB.get('inventory',id);if(i){eid('inv-sku').value=i.sku;eid('inv-name').value=i.name;eid('inv-cat').value=i.category;eid('inv-unit').value=i.unit||'pz';eid('inv-stock').value=i.stock;eid('inv-min').value=i.minStock;eid('inv-cost').value=i.costPrice;eid('inv-supplier').value=i.supplier||'';}}
    openModal('inventory');
  },
  async save(){
    const item={sku:eid('inv-sku').value,name:eid('inv-name').value,category:eid('inv-cat').value,unit:eid('inv-unit').value,stock:+eid('inv-stock').value||0,minStock:+eid('inv-min').value||0,costPrice:+eid('inv-cost').value||0,supplier:eid('inv-supplier').value};
    if(this.editId)item.id=this.editId; else { item.id = Date.now(); }
    const id=await IDB.put('inventory',item).catch(e=>{toast('Errore salvataggio','error');console.error('[Inventory.save]',e);});
    await logAction('inventory',id,this.editId?'updated':'created');
    AppStore.invalidate('inventory');
    AppStore.invalidate('items');
    toast('Articolo salvato!');closeModal('inventory');this.editId=null;await this.render();
  },
  async del(id){
    if(!await askConfirm('Eliminare articolo?'))return;
    await IDB.del('inventory',id).catch(e=>console.warn('[IDB.del]',e));await logAction('inventory',id,'deleted');
    toast('Articolo eliminato','warning');AppStore.invalidate('inventory');
    await this.render();
  }
};

// ===== MATERIALS =====
const Materials={
  editId:null,editType:null,activeTab:'all',
  DEFAULTS:[
    // ═══ LEGNI NATURALI ═══
    {id:1,  name:'Plywood Betulla 3mm',type:'material',cat:'legno',cost:14.50,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com/collections/materials',machine:'xTool P3',notes:'Legno chiaro, venatura fine. Perfetto per incisione dettagliata. Taglio a 80% potenza. Fornitori alternativi: Sculpfun EU €13/mq, Lightburn Store €15/mq'},
    {id:2,  name:'Plywood Betulla 6mm',type:'material',cat:'legno',cost:22.00,unit:'€/mq',thickness:'6mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3',notes:'Per oggetti strutturali, puzzle layered, targhe spesse.'},
    {id:3,  name:'Plywood Tiglio 3mm',type:'material',cat:'legno',cost:13.20,unit:'€/mq',thickness:'3mm',supplier:'LegnoBrianza IT',supplierUrl:'https://www.legnobrianza.it',machine:'xTool P3',notes:'Legno morbido chiaro. Incisione ultra-dettagliata. Ottimo per Natale.'},
    {id:4,  name:'Plywood Tiglio 12mm',type:'material',cat:'legno',cost:38.00,unit:'€/mq',thickness:'12mm',supplier:'LegnoBrianza IT',supplierUrl:'https://www.legnobrianza.it',machine:'CO2 / xTool P3',notes:'Spessore elevato per oggettistica premium, sculture, taglieri.'},
    {id:5,  name:'Plywood Tiglio 15mm',type:'material',cat:'legno',cost:46.00,unit:'€/mq',thickness:'15mm',supplier:'ForestItalia IT',supplierUrl:'',machine:'CO2 100W',notes:'Solo taglio CO2. Per corpi 3D, scatole, incastri.'},
    {id:6,  name:'Plywood Pioppo 3mm',type:'material',cat:'legno',cost:11.00,unit:'€/mq',thickness:'3mm',supplier:'ForestItalia IT',supplierUrl:'',machine:'xTool P3',notes:'Economico, leggero. Ottimo per bomboniere e articoli di grande serie.'},
    {id:7,  name:'Plywood Pioppo 6mm',type:'material',cat:'legno',cost:16.50,unit:'€/mq',thickness:'6mm',supplier:'ForestItalia IT',supplierUrl:'',machine:'xTool P3',notes:'Buon compromesso prezzo/qualità per oggetti medi.'},
    {id:8,  name:'Plywood Pioppo 8mm',type:'material',cat:'legno',cost:22.00,unit:'€/mq',thickness:'8mm',supplier:'ForestItalia IT',supplierUrl:'',machine:'CO2 / P3',notes:'Per basi robuste, casse, strutture.'},
    {id:9,  name:'Bambù 3mm (1/8")',type:'material',cat:'legno',cost:16.80,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:'Sostenibile, duro. Venatura esotica. Ottimo per cucchiai, taglieri, decorazioni orientali.'},
    {id:10, name:'Bambù Plywood 3mm',type:'material',cat:'legno',cost:18.00,unit:'€/mq',thickness:'3mm',supplier:'Banggood EU',supplierUrl:'https://www.banggood.com',machine:'xTool P3',notes:'Pannello strutturato in bambù laminato. Più uniforme del bambù grezzo.'},
    {id:11, name:'Noce 3mm',type:'material',cat:'legno',cost:48.00,unit:'€/mq',thickness:'3mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3',notes:'Legno premium scuro. Per portachiavi, targhette, oggetti di lusso. Valore percepito altissimo.'},
    {id:12, name:'Compensato Noce 6mm',type:'material',cat:'legno',cost:58.00,unit:'€/mq',thickness:'6mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3',notes:'Premium. Ottimo per targhe professionali e regali aziendali.'},
    {id:13, name:'Compensato Noce Nero 12mm',type:'material',cat:'legno',cost:85.00,unit:'€/mq',thickness:'12mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'CO2',notes:'Legno scuro di alto pregio. Supporto sculture e oggetti 3D premium.'},
    {id:14, name:'Ciliegio 3mm',type:'material',cat:'legno',cost:42.00,unit:'€/mq',thickness:'3mm',supplier:'Sculpteo EU',supplierUrl:'https://sculpteo.com',machine:'xTool P3',notes:'Colore caldo arancio-rosato. Molto apprezzato per regali personalizzati.'},
    {id:15, name:'Ciliegio 6mm',type:'material',cat:'legno',cost:55.00,unit:'€/mq',thickness:'6mm',supplier:'Sculpteo EU',supplierUrl:'https://sculpteo.com',machine:'xTool P3 / CO2',notes:''},
    {id:16, name:'Ciliegio 12mm',type:'material',cat:'legno',cost:80.00,unit:'€/mq',thickness:'12mm',supplier:'LegnoBrianza IT',supplierUrl:'',machine:'CO2',notes:'Spessore premium per oggettistica lusso.'},
    {id:17, name:'Acero 3mm',type:'material',cat:'legno',cost:36.00,unit:'€/mq',thickness:'3mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3',notes:'Legno chiaro duro. Contrasto incisione eccellente. Ideale per targhe e segnalibri.'},
    {id:18, name:'Acero 6mm',type:'material',cat:'legno',cost:48.00,unit:'€/mq',thickness:'6mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3',notes:''},
    {id:19, name:'Frassino 3mm',type:'material',cat:'legno',cost:32.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:'Venatura chiara elegante. Leggero e resistente.'},
    {id:20, name:'Frassino 6mm',type:'material',cat:'legno',cost:44.00,unit:'€/mq',thickness:'6mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:''},
    {id:21, name:'Rovere Bianco 3mm',type:'material',cat:'legno',cost:38.00,unit:'€/mq',thickness:'3mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3',notes:'Look artigianale rustico. Molto richiesto per temi country/farmhouse.'},
    {id:22, name:'Rovere Bianco 6mm',type:'material',cat:'legno',cost:52.00,unit:'€/mq',thickness:'6mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'CO2 / xTool P3',notes:''},
    {id:23, name:'Quercia Rossa 3mm',type:'material',cat:'legno',cost:36.00,unit:'€/mq',thickness:'3mm',supplier:'Banggood EU',supplierUrl:'https://www.banggood.com',machine:'xTool P3',notes:''},
    {id:24, name:'Pino 6mm',type:'material',cat:'legno',cost:14.00,unit:'€/mq',thickness:'6mm',supplier:'Leroy Merlin IT',supplierUrl:'https://www.leroymerlin.it',machine:'xTool P3',notes:'Economico, reperibile localmente. Knots visibili, effetto rustico.'},
    {id:25, name:'Pino 12mm',type:'material',cat:'legno',cost:20.00,unit:'€/mq',thickness:'12mm',supplier:'Leroy Merlin IT',supplierUrl:'https://www.leroymerlin.it',machine:'CO2',notes:'Per strutture, basi, contenitori.'},
    {id:26, name:'Sapele 3mm',type:'material',cat:'legno',cost:44.00,unit:'€/mq',thickness:'3mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3',notes:'Legno africano rosso-mogano. Aspetto esotico premium.'},
    {id:27, name:'Okoume 3mm',type:'material',cat:'legno',cost:18.00,unit:'€/mq',thickness:'3mm',supplier:'ForestItalia IT',supplierUrl:'',machine:'xTool P3',notes:'Compensato marino. Economico, stabile, facile da lavorare.'},
    {id:28, name:'Ebano 3mm Plywood',type:'material',cat:'legno',cost:62.00,unit:'€/mq',thickness:'3mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3',notes:'Scuro intenso. Effetto luxury massimo. Per gioielli, portachiavi premium.'},
    {id:29, name:'Faggio Carbonizzato',type:'material',cat:'legno',cost:28.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:'Effetto bruciato estetico. Molto trendy per prodotti naturali e rustic chic.'},
    {id:30, name:'Legno di Paulownia',type:'material',cat:'legno',cost:20.00,unit:'€/mq',thickness:'4mm',supplier:'Amazon IT / Banggood',supplierUrl:'',machine:'xTool P3',notes:'Leggerissimo, incisione netta. Ottimo per articoli spediti per posta.'},
    {id:31, name:'Sughero 5mm (sottobicchieri)',type:'material',cat:'sughero',cost:12.00,unit:'€/mq',thickness:'5mm',supplier:'Cork House IT',supplierUrl:'https://www.corkhouse.it',machine:'xTool P3',notes:'Perfetto per sottobicchieri rotondi personalizzati. Incisione nitida.'},
    {id:32, name:'Sughero 0.5mm (foglio)',type:'material',cat:'sughero',cost:8.00,unit:'€/mq',thickness:'0.5mm',supplier:'Cork House IT',supplierUrl:'https://www.corkhouse.it',machine:'xTool P3',notes:'Flessibile. Per bacheche, etichette, fondi.'},
    // ═══ MDF ═══
    {id:40, name:'MDF Grezzo 3mm',type:'material',cat:'mdf',cost:7.50,unit:'€/mq',thickness:'3mm',supplier:'MDFItalia IT',supplierUrl:'',machine:'xTool P3',notes:'Standard per incisione laser. Alta densità uniforme.'},
    {id:41, name:'MDF Grezzo 6mm',type:'material',cat:'mdf',cost:10.50,unit:'€/mq',thickness:'6mm',supplier:'MDFItalia IT',supplierUrl:'',machine:'xTool P3',notes:''},
    {id:42, name:'MDF Grezzo 12mm',type:'material',cat:'mdf',cost:16.00,unit:'€/mq',thickness:'12mm',supplier:'MDFItalia IT',supplierUrl:'',machine:'CO2',notes:'Per oggetti spessi, basi, supporti.'},
    {id:43, name:'MDF Bianco Laccato 3mm',type:'material',cat:'mdf',cost:12.80,unit:'€/mq',thickness:'3mm',supplier:'PannelliLux IT',supplierUrl:'',machine:'xTool P3',notes:'Finitura bianca opaca. No verniciatura necessaria. Ottimo per insegne.'},
    {id:44, name:'MDF Nero 3mm (1/8")',type:'material',cat:'mdf',cost:13.60,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:'Dark luxury. Incisione chiara su nero. Per packaging premium e targhe.'},
    {id:45, name:'MDF Rosso 3mm',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:'Colore acceso per decorazioni vivaci.'},
    {id:46, name:'MDF Verde Chiaro 3mm',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'Banggood EU',supplierUrl:'https://www.banggood.com',machine:'xTool P3',notes:''},
    {id:47, name:'MDF Verde Scuro 3mm',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'Banggood EU',supplierUrl:'https://www.banggood.com',machine:'xTool P3',notes:''},
    {id:48, name:'MDF Giallo 3mm',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:''},
    {id:49, name:'MDF Grigio 3mm',type:'material',cat:'mdf',cost:13.80,unit:'€/mq',thickness:'3mm',supplier:'Banggood EU',supplierUrl:'https://www.banggood.com',machine:'xTool P3',notes:''},
    {id:50, name:'MDF Rosa Chiaro 3mm',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:'Molto richiesto per battesimi e compleanni bambine.'},
    {id:51, name:'MDF Viola Chiaro 3mm',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:''},
    {id:52, name:'MDF Blu Chiaro 3mm',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:''},
    {id:53, name:'MDF Blu Profondo 3mm',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:''},
    {id:54, name:'MDF Effetto Noce 3mm',type:'material',cat:'mdf',cost:15.20,unit:'€/mq',thickness:'3mm',supplier:'PannelliLux IT',supplierUrl:'',machine:'xTool P3',notes:'Look legno pregiato a costo contenuto.'},
    {id:55, name:'MDF Effetto Acero 3mm',type:'material',cat:'mdf',cost:15.20,unit:'€/mq',thickness:'3mm',supplier:'PannelliLux IT',supplierUrl:'',machine:'xTool P3',notes:''},
    {id:56, name:'MDF Effetto Ebano 3mm',type:'material',cat:'mdf',cost:15.50,unit:'€/mq',thickness:'3mm',supplier:'PannelliLux IT',supplierUrl:'',machine:'xTool P3',notes:''},
    {id:57, name:'MDF Effetto Marmo 3mm',type:'material',cat:'mdf',cost:16.00,unit:'€/mq',thickness:'3mm',supplier:'Banggood EU',supplierUrl:'https://www.banggood.com',machine:'xTool P3',notes:'Finto marmo stampato. Molto richiesto per oggettistica luxury.'},
    {id:58, name:'MDF Effetto Rosa 3mm',type:'material',cat:'mdf',cost:15.50,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:''},
    // ═══ ACRILICO / PLEXIGLASS ═══
    {id:60, name:'Acrilico Trasparente 3mm',type:'material',cat:'plexy',cost:18.50,unit:'€/mq',thickness:'3mm',supplier:'Plastimarket IT',supplierUrl:'https://www.plastimarket.it',machine:'xTool P3 / CO2',notes:'Crystal clear. Per portachiavi, spille, segnalibri. Top 3 fornitori IT: Plastimarket €18.50, PlexiShop €19, ePlastic €17.80'},
    {id:61, name:'Acrilico Nero 3mm',type:'material',cat:'plexy',cost:21.00,unit:'€/mq',thickness:'3mm',supplier:'Plastimarket IT',supplierUrl:'https://www.plastimarket.it',machine:'xTool P3 / CO2',notes:'Dark premium. Incisione laser evidenziata su nero opaco.'},
    {id:62, name:'Acrilico Nero Satinato 3mm',type:'material',cat:'plexy',cost:23.00,unit:'€/mq',thickness:'3mm',supplier:'ePlastic EU',supplierUrl:'https://www.eplastics.com',machine:'xTool P3',notes:'Finitura opaca anti-riflesso. Aspetto premium.'},
    {id:63, name:'Acrilico Nero Glitter 3mm',type:'material',cat:'plexy',cost:25.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:'Effetto brillantinato. Molto richiesto per accessori moda.'},
    {id:64, name:'Acrilico Nero 8mm',type:'material',cat:'plexy',cost:48.00,unit:'€/mq',thickness:'8mm',supplier:'Plastimarket IT',supplierUrl:'https://www.plastimarket.it',machine:'CO2 / xTool P3',notes:''},
    {id:65, name:'Acrilico Nero 12mm',type:'material',cat:'plexy',cost:68.00,unit:'€/mq',thickness:'12mm',supplier:'Plastimarket IT',supplierUrl:'https://www.plastimarket.it',machine:'CO2',notes:''},
    {id:66, name:'Acrilico Bianco 3mm',type:'material',cat:'plexy',cost:19.80,unit:'€/mq',thickness:'3mm',supplier:'Plastimarket IT',supplierUrl:'https://www.plastimarket.it',machine:'xTool P3',notes:'Opalino. Effetto diffusore LED. Per cornici luminose.'},
    {id:67, name:'Acrilico Bianco Perla 3mm',type:'material',cat:'plexy',cost:22.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:'Effetto madreperlato. Nozze, battesimi, eventi eleganti.'},
    {id:68, name:'Acrilico Rosso 3mm',type:'material',cat:'plexy',cost:22.50,unit:'€/mq',thickness:'3mm',supplier:'Plastimarket IT',supplierUrl:'https://www.plastimarket.it',machine:'xTool P3',notes:''},
    {id:69, name:'Acrilico Rosso Scuro 3mm',type:'material',cat:'plexy',cost:24.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:''},
    {id:70, name:'Acrilico Rosso Traslucido 3mm',type:'material',cat:'plexy',cost:23.50,unit:'€/mq',thickness:'3mm',supplier:'Banggood EU',supplierUrl:'https://www.banggood.com',machine:'xTool P3',notes:'Traslucido. Effetto lampada colorata.'},
    {id:71, name:'Acrilico Rosso Ignifugo 3mm',type:'material',cat:'plexy',cost:28.00,unit:'€/mq',thickness:'3mm',supplier:'ePlastic EU',supplierUrl:'https://www.eplastics.com',machine:'xTool P3',notes:'Certificato FR. Per insegne in luoghi pubblici.'},
    {id:72, name:'Acrilico Nero Ignifugo 3mm',type:'material',cat:'plexy',cost:30.00,unit:'€/mq',thickness:'3mm',supplier:'ePlastic EU',supplierUrl:'https://www.eplastics.com',machine:'xTool P3',notes:'Certificato FR. Obbligatorio per insegnistica commerciale.'},
    {id:73, name:'Acrilico Verde 3mm',type:'material',cat:'plexy',cost:22.50,unit:'€/mq',thickness:'3mm',supplier:'Plastimarket IT',supplierUrl:'https://www.plastimarket.it',machine:'xTool P3',notes:''},
    {id:74, name:'Acrilico Verde Pastello 3mm',type:'material',cat:'plexy',cost:23.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:''},
    {id:75, name:'Acrilico Arancione 3mm',type:'material',cat:'plexy',cost:23.00,unit:'€/mq',thickness:'3mm',supplier:'Plastimarket IT',supplierUrl:'https://www.plastimarket.it',machine:'xTool P3',notes:''},
    {id:76, name:'Acrilico Giallo Fluorescente Traslucido 3mm',type:'material',cat:'plexy',cost:24.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:'Fluorescente UV. Ottimo per segnaletica e articoli da discoteca.'},
    {id:77, name:'Acrilico Rosso Rubino Traslucido 3mm',type:'material',cat:'plexy',cost:24.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:''},
    {id:78, name:'Acrilico Nero Traslucido 1mm',type:'material',cat:'plexy',cost:16.00,unit:'€/mq',thickness:'1mm',supplier:'Plastimarket IT',supplierUrl:'https://www.plastimarket.it',machine:'xTool P3',notes:'Sottile, flessibile. Per etichette, segnalibri, bookmark premium.'},
    {id:79, name:'Acrilico Nero Traslucido 3mm',type:'material',cat:'plexy',cost:22.00,unit:'€/mq',thickness:'3mm',supplier:'Plastimarket IT',supplierUrl:'https://www.plastimarket.it',machine:'xTool P3',notes:''},
    {id:80, name:'Acrilico Bianco 1mm',type:'material',cat:'plexy',cost:15.50,unit:'€/mq',thickness:'1mm',supplier:'Plastimarket IT',supplierUrl:'https://www.plastimarket.it',machine:'xTool P3',notes:''},
    {id:81, name:'Acrilico Nero 5mm',type:'material',cat:'plexy',cost:34.00,unit:'€/mq',thickness:'5mm',supplier:'Plastimarket IT',supplierUrl:'https://www.plastimarket.it',machine:'CO2 / xTool P3',notes:''},
    // BICOLORE ACRILICO
    {id:85, name:'Acrilico Bicolore Oro su Nero 3mm',type:'material',cat:'plexy',cost:32.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:'Incisione rivela strato oro su fondo nero. Effetto lusso massimo. Ottimo per targhe aziendali.'},
    {id:86, name:'Acrilico Bicolore Iridescente Oro Nero 3mm',type:'material',cat:'plexy',cost:38.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:'Effetto cangiante premium.'},
    {id:87, name:'Acrilico Bicolore Iridescente Rosa Bianco 3mm',type:'material',cat:'plexy',cost:36.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:''},
    {id:88, name:'Acrilico Bicolore Nero-Bianco Perla 3mm',type:'material',cat:'plexy',cost:34.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:''},
    // PLASTICA / LASER ENGRAVING SHEETS
    {id:90, name:'Foglio Plastica Bicolore Rosso-Verde 1.3mm',type:'material',cat:'plastica',cost:22.00,unit:'€/mq',thickness:'1.3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:'Incisione laser rimuove strato superiore e rivela colore opposto. Per targhe colorate dettagliate.'},
    {id:91, name:'Foglio Plastica Bicolore Nero-Verde 1.3mm',type:'material',cat:'plastica',cost:22.00,unit:'€/mq',thickness:'1.3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com',machine:'xTool P3',notes:''},
    // ═══ PLA / PETG / TPU ═══
    {id:100,name:'PLA Bianco 1mm (foglio)',type:'material',cat:'plastica',cost:18.00,unit:'€/kg',thickness:'1mm',supplier:'Bambu Lab EU',supplierUrl:'https://store.bambulab.com',machine:'Stampante 3D / xTool P3',notes:''},
    {id:101,name:'PLA Bianco 2mm',type:'material',cat:'plastica',cost:18.00,unit:'€/kg',thickness:'2mm',supplier:'Bambu Lab EU',supplierUrl:'https://store.bambulab.com',machine:'Stampante 3D',notes:''},
    {id:102,name:'PLA Bianco 3mm',type:'material',cat:'plastica',cost:18.00,unit:'€/kg',thickness:'3mm',supplier:'Bambu Lab EU',supplierUrl:'https://store.bambulab.com',machine:'Stampante 3D',notes:''},
    {id:103,name:'PLA Nero 1mm',type:'material',cat:'plastica',cost:18.00,unit:'€/kg',thickness:'1mm',supplier:'Bambu Lab EU',supplierUrl:'https://store.bambulab.com',machine:'Stampante 3D',notes:''},
    {id:104,name:'PLA Nero 2mm',type:'material',cat:'plastica',cost:18.00,unit:'€/kg',thickness:'2mm',supplier:'Bambu Lab EU',supplierUrl:'https://store.bambulab.com',machine:'Stampante 3D',notes:''},
    {id:105,name:'PLA Nero 3mm',type:'material',cat:'plastica',cost:18.00,unit:'€/kg',thickness:'3mm',supplier:'Bambu Lab EU',supplierUrl:'https://store.bambulab.com',machine:'Stampante 3D',notes:''},
    {id:106,name:'PETG Nero',type:'material',cat:'plastica',cost:22.00,unit:'€/kg',thickness:'—',supplier:'Bambu Lab EU',supplierUrl:'https://store.bambulab.com',machine:'Stampante 3D',notes:'Più resistente del PLA. Per parti funzionali, contenitori.'},
    {id:107,name:'PETG Bianco',type:'material',cat:'plastica',cost:22.00,unit:'€/kg',thickness:'—',supplier:'Bambu Lab EU',supplierUrl:'https://store.bambulab.com',machine:'Stampante 3D',notes:''},
    {id:108,name:'TPU-95A Nero (flessibile)',type:'material',cat:'plastica',cost:28.00,unit:'€/kg',thickness:'—',supplier:'Bambu Lab EU',supplierUrl:'https://store.bambulab.com',machine:'Stampante 3D',notes:'Materiale flessibile gommoso. Per custodie, guarnizioni, gadget tattili.'},
    {id:109,name:'TPU-95A Bianco',type:'material',cat:'plastica',cost:28.00,unit:'€/kg',thickness:'—',supplier:'Bambu Lab EU',supplierUrl:'https://store.bambulab.com',machine:'Stampante 3D',notes:''},
    {id:110,name:'ABS Bianco 3D',type:'material',cat:'plastica',cost:20.00,unit:'€/kg',thickness:'—',supplier:'Elegoo EU',supplierUrl:'https://www.elegoo.com',machine:'Stampante 3D',notes:'Resistente al calore. Per stampe tecniche e parti funzionali.'},
    {id:111,name:'ABS Nero 3D',type:'material',cat:'plastica',cost:20.00,unit:'€/kg',thickness:'—',supplier:'Elegoo EU',supplierUrl:'https://www.elegoo.com',machine:'Stampante 3D',notes:''},
    // ═══ TESSUTI E ALTRI ═══
    {id:120,name:'Olio per Legno Noce Chiaro',type:'material',cat:'altro',cost:12.00,unit:'€/lt',thickness:'—',supplier:'Bostik IT',supplierUrl:'',machine:'—',notes:'Finitura naturale per legni lavorati laser. Protegge e valorizza le venature.'},
    {id:121,name:'Olio Paraffina Commestibile',type:'material',cat:'altro',cost:8.00,unit:'€/lt',thickness:'—',supplier:'Amazon IT',supplierUrl:'',machine:'—',notes:'Per taglieri e utensili da cucina in legno. Certificato food safe.'},
    {id:122,name:'Tulle decorativo rigido',type:'material',cat:'tessuto',cost:3.50,unit:'€/mt',thickness:'—',supplier:'TessutiFair IT',supplierUrl:'',machine:'xTool P3',notes:'Per decorazioni e sagome tessuto laser.'},
    // ═══ MACCHINE ═══
    {id:200,name:'xTool P3 40W',type:'machine',cat:'machine',cost:0.38,unit:'€/min',thickness:'—',supplier:'xTool',notes:'Diodo 40W. Area 430×390mm. Incide legno, acrilico, pelle, carta. Velocità fino a 600mm/s.'},
    {id:201,name:'Laser CO2 100W',type:'machine',cat:'machine',cost:0.52,unit:'€/min',thickness:'—',supplier:'OMTech',notes:'CO2 100W. Area 50×70cm. Taglia materiali spessi fino a 15mm. Include ammortamento e energia.'},
    {id:202,name:'xTool S1 40W (Enclosed)',type:'machine',cat:'machine',cost:0.42,unit:'€/min',thickness:'—',supplier:'xTool',notes:'Closed frame, filtro aria integrato. Ideale per lavoro indoor continuo.'},
    {id:203,name:'Stampante 3D Bambu Lab X1C',type:'machine',cat:'machine',cost:0.28,unit:'€/ora',thickness:'—',supplier:'Bambu Lab',notes:'FDM ad alta velocità 600mm/s. 4 colori. Include filamento e ammortamento.'},
    {id:204,name:'Stampante 3D Elegoo Saturn 4 Ultra',type:'machine',cat:'machine',cost:0.38,unit:'€/ora',thickness:'—',supplier:'Elegoo',notes:'Resina MSLA 12K. Area 218×123×220mm. Include resina e IPA.'},
    {id:205,name:'CNC Router 3 assi 3018',type:'machine',cat:'machine',cost:0.45,unit:'€/min',thickness:'—',supplier:'Genmitsu',notes:'Per intaglio profondo, rilievi 3D su legno. Include consumo frese.'},
  {id:206,name:'Carta fotografica lucida A4',type:'material',cat:'altro',cost:0.15,unit:'€/pz',thickness:'—',supplier:'Amazon IT',notes:'Stampa inkjet. Effetto foto. Per packaging, cartoline, listini.'},
  {id:207,name:'Feltro 3mm colorato',type:'material',cat:'tessuto',cost:4.80,unit:'€/mq',thickness:'3mm',supplier:'TessutiFair IT',notes:'Feltro sintetico colorato. Adatto a taglio laser CO2. No fumi tossici.'},
  {id:208,name:'Forex PVC 3mm bianco',type:'material',cat:'plexy',cost:8.50,unit:'€/mq',thickness:'3mm',supplier:'Plastimarket IT',notes:'PVC espanso leggero. Segnali, targhe, display. Taglio laser CO2 solo con ventilazione.'},
  {id:209,name:'Alluminio anodizzato 1mm',type:'material',cat:'altro',cost:22.00,unit:'€/mq',thickness:'1mm',supplier:'MetalliOnline IT',notes:'Incisione laser rimuove strato anodizzato. Effetto premium per targhe e gadget.'},
  {id:210,name:'Carta da parati vinilica',type:'material',cat:'tessuto',cost:6.20,unit:'€/mq',thickness:'—',supplier:'CartaDecoro IT',notes:'Taglio di sagome decorative. Laser CO2 adatto per vinile standard.'},
  {id:211,name:'Polipropilene ondulato 4mm',type:'material',cat:'plexy',cost:5.80,unit:'€/mq',thickness:'4mm',supplier:'PlasticaFlex IT',notes:'Leggero e resistente. Cartelloni, scatole, supporti temporanei.'},
    // ═══ xTOOL P3 — MATERIALI UFFICIALI (atomm.com) + ANALISI PREZZI ═══
    // Legenda fornitori: IT=Italia EU=Europa CN=Cina/Asia
    {id:212,name:'Bambù 3mm xP3',type:'material',cat:'legno',cost:18.00,unit:'€/mq',thickness:'3mm',supplier:'AliExpress',supplierUrl:'https://www.aliexpress.com/w/wholesale-bamboo-sheet-3mm-laser.html',machine:'xTool P3',notes:'Eco-friendly. 5 fornitori: AliExpress €18 · Temu €16 · Lasertale.eu €22 · regnodellegno.com €24 · xtool.com €28 (€/mq)'},
    {id:213,name:'Bambù Plywood 3mm xP3',type:'material',cat:'legno',cost:20.00,unit:'€/mq',thickness:'3mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3',notes:'Multistrato bambù. 5 fornitori: AliExpress €18 · Temu €16 · Lasertale.eu €22 · apaholz.it €25 · vectorealism.com €28 (€/mq)'},
    {id:214,name:'Faggio Carbonizzato xP3',type:'material',cat:'legno',cost:28.00,unit:'€/mq',thickness:'3-5mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com/collections/materials',machine:'xTool P3',notes:'Superficie carbonizzata, alto contrasto. 5 fornitori: xTool.com €28 · AliExpress €20 · Temu €18 · Lasertale.eu €26 · regnodellegno.com €30 (€/mq)'},
    {id:215,name:'Noce Light Cera xP3',type:'material',cat:'legno',cost:32.00,unit:'€/mq',thickness:'4mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com/collections/materials',machine:'xTool P3',notes:'Noce chiaro pretrattato cera. Premium. 5 fornitori: xTool.com €32 · AliExpress €24 · Temu €22 · Lasertale.eu €30 · apaholz.it €35 (€/mq)'},
    {id:216,name:'Sapele Plywood 3mm xP3',type:'material',cat:'legno',cost:26.00,unit:'€/mq',thickness:'3mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3',notes:'Mogano africano venatura intrecciata. 5 fornitori: Lasertale.eu €26 · AliExpress €19 · Temu €17 · apaholz.it €28 · xTool.com €30 (€/mq)'},
    {id:217,name:'Tiglio (Basswood) 3mm xP3',type:'material',cat:'legno',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'regnodellegno.com',supplierUrl:'https://regnodellegno.com/it/33-compensato-di-betulla',machine:'xTool P3',notes:'Il più usato per laser. Taglio netto. 5 fornitori: regnodellegno.com €14 · AliExpress €10 · Temu €9 · apaholz.it €13 · vectorealism.com €16 (€/mq)'},
    {id:218,name:'Tiglio (Basswood) 6mm xP3',type:'material',cat:'legno',cost:20.00,unit:'€/mq',thickness:'6mm',supplier:'apaholz.it',supplierUrl:'https://apaholz.it',machine:'xTool P3',notes:'Spessore medio. Scatole, oggettistica. 5 fornitori: apaholz.it €20 · AliExpress €14 · Temu €12 · Lasertale.eu €22 · xTool.com €25 (€/mq)'},
    {id:219,name:'Tiglio (Basswood) 8mm xP3',type:'material',cat:'legno',cost:26.00,unit:'€/mq',thickness:'8mm',supplier:'apaholz.it',supplierUrl:'https://apaholz.it',machine:'xTool P3',notes:'Puzzle 3D, sculture. 5 fornitori: apaholz.it €26 · AliExpress €18 · Temu €16 · Lasertale.eu €28 · vectorealism.com €30 (€/mq)'},
    {id:220,name:'Tiglio (Basswood) 12mm xP3',type:'material',cat:'legno',cost:38.00,unit:'€/mq',thickness:'12mm',supplier:'apaholz.it',supplierUrl:'https://apaholz.it',machine:'xTool P3',notes:'Taglieri, oggetti strutturali. 5 fornitori: apaholz.it €38 · AliExpress €25 · Temu €22 · Lasertale.eu €40 · regnodellegno.com €42 (€/mq)'},
    {id:221,name:'Tiglio (Basswood) 15mm xP3',type:'material',cat:'legno',cost:46.00,unit:'€/mq',thickness:'15mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3 + CO2',notes:'Max spessore P3. 5 fornitori: Lasertale.eu €46 · AliExpress €30 · Temu €28 · apaholz.it €48 · xTool.com €52 (€/mq)'},
    {id:222,name:'Noce Plywood 3mm xP3',type:'material',cat:'legno',cost:30.00,unit:'€/mq',thickness:'3mm',supplier:'vectorealism.com',supplierUrl:'https://www.vectorealism.com/it/materiali/materiali-per-il-taglio-laser/compensato/compensato-di-betulla/',machine:'xTool P3',notes:'Noce scuro premium. 5 fornitori: vectorealism.com €30 · AliExpress €22 · Temu €20 · Lasertale.eu €32 · apaholz.it €35 (€/mq)'},
    {id:223,name:'Noce Plywood 6mm xP3',type:'material',cat:'legno',cost:42.00,unit:'€/mq',thickness:'6mm',supplier:'vectorealism.com',supplierUrl:'https://www.vectorealism.com',machine:'xTool P3',notes:'5 fornitori: vectorealism.com €42 · AliExpress €30 · Temu €28 · Lasertale.eu €44 · apaholz.it €46 (€/mq)'},
    {id:224,name:'Noce Nero Plywood 12mm xP3',type:'material',cat:'legno',cost:65.00,unit:'€/mq',thickness:'12mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3 + CO2',notes:'Black walnut luxury. 5 fornitori: Lasertale.eu €65 · AliExpress €45 · Temu €40 · vectorealism.com €70 · xTool.com €75 (€/mq)'},
    {id:225,name:'Acero Plywood 6mm xP3',type:'material',cat:'legno',cost:35.00,unit:'€/mq',thickness:'6mm',supplier:'apaholz.it',supplierUrl:'https://apaholz.it',machine:'xTool P3',notes:'5 fornitori: apaholz.it €35 · AliExpress €25 · Temu €22 · Lasertale.eu €37 · vectorealism.com €40 (€/mq)'},
    {id:226,name:'Ciliegio Plywood 12mm xP3',type:'material',cat:'legno',cost:55.00,unit:'€/mq',thickness:'12mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3 + CO2',notes:'Ciliegio premium. 5 fornitori: Lasertale.eu €55 · AliExpress €38 · Temu €35 · apaholz.it €58 · vectorealism.com €62 (€/mq)'},
    {id:227,name:'Faggio Verniciato xP3',type:'material',cat:'legno',cost:30.00,unit:'€/mq',thickness:'3-5mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com/collections/materials',machine:'xTool P3',notes:'Utensili cucina. 5 fornitori: xTool.com €30 · AliExpress €22 · Temu €20 · Lasertale.eu €28 · apaholz.it €32 (€/mq)'},
    {id:228,name:'Gomma Verniciata xP3',type:'material',cat:'legno',cost:28.00,unit:'€/mq',thickness:'3-5mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com/collections/materials',machine:'xTool P3',notes:'Rubber wood. 5 fornitori: xTool.com €28 · AliExpress €18 · Temu €15 · Lasertale.eu €25 · regnodellegno.com €30 (€/mq)'},
    {id:229,name:'Gomma Olio Paraffina (Food Safe)',type:'material',cat:'legno',cost:32.00,unit:'€/mq',thickness:'3-5mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com/collections/materials',machine:'xTool P3',notes:'Food safe certificato. Taglieri. 5 fornitori: xTool.com €32 · AliExpress €22 · Temu €20 · Lasertale.eu €30 · apaholz.it €35 (€/mq)'},
    {id:230,name:'Legno Dipinto Rosso xP3',type:'material',cat:'legno',cost:24.00,unit:'€/mq',thickness:'3mm',supplier:'xTool Store EU',supplierUrl:'https://www.xtool.com/collections/materials',machine:'xTool P3',notes:'Laccato rosso. 5 fornitori: xTool.com €24 · AliExpress €16 · Temu €14 · Lasertale.eu €22 · vectorealism.com €26 (€/mq)'},
    {id:231,name:'MDF Finto Acero 3mm xP3',type:'material',cat:'mdf',cost:16.00,unit:'€/mq',thickness:'3mm',supplier:'vectorealism.com',supplierUrl:'https://www.vectorealism.com',machine:'xTool P3',notes:'5 fornitori: vectorealism.com €16 · AliExpress €9 · Temu €8 · Lasertale.eu €17 · shop.laseridea.com €18 (€/mq)'},
    {id:232,name:'MDF Finto Noce 3mm xP3',type:'material',cat:'mdf',cost:16.00,unit:'€/mq',thickness:'3mm',supplier:'vectorealism.com',supplierUrl:'https://www.vectorealism.com',machine:'xTool P3',notes:'5 fornitori: vectorealism.com €16 · AliExpress €9 · Temu €8 · Lasertale.eu €17 · shop.laseridea.com €18 (€/mq)'},
    {id:233,name:'MDF Finto Ebano 3mm xP3',type:'material',cat:'mdf',cost:17.00,unit:'€/mq',thickness:'3mm',supplier:'vectorealism.com',supplierUrl:'https://www.vectorealism.com',machine:'xTool P3',notes:'5 fornitori: vectorealism.com €17 · AliExpress €10 · Temu €9 · Lasertale.eu €18 · shop.laseridea.com €20 (€/mq)'},
    {id:234,name:'MDF Nero 3mm xP3',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'shop.laseridea.com',supplierUrl:'https://shop.laseridea.com/plexiglass/lastre-plexiglass.html',machine:'xTool P3',notes:'5 fornitori: shop.laseridea.com €14 · AliExpress €8 · Temu €7 · Lasertale.eu €15 · vectorealism.com €16 (€/mq)'},
    {id:235,name:'MDF Grigio 3mm xP3',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'shop.laseridea.com',supplierUrl:'https://shop.laseridea.com',machine:'xTool P3',notes:'5 fornitori: shop.laseridea.com €14 · AliExpress €8 · Temu €7 · Lasertale.eu €15 · vectorealism.com €16 (€/mq)'},
    {id:236,name:'MDF Azzurro 3mm xP3',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'shop.laseridea.com',supplierUrl:'https://shop.laseridea.com',machine:'xTool P3',notes:'Pastello azzurro. 5 fornitori: shop.laseridea.com €14 · AliExpress €8 · Temu €7 · Lasertale.eu €15 · vectorealism.com €16 (€/mq)'},
    {id:237,name:'MDF Verde 3mm xP3',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'shop.laseridea.com',supplierUrl:'https://shop.laseridea.com',machine:'xTool P3',notes:'5 fornitori: shop.laseridea.com €14 · AliExpress €8 · Temu €7 · Lasertale.eu €15 · vectorealism.com €16 (€/mq)'},
    {id:238,name:'MDF Rosa 3mm xP3',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'shop.laseridea.com',supplierUrl:'https://shop.laseridea.com',machine:'xTool P3',notes:'5 fornitori: shop.laseridea.com €14 · AliExpress €8 · Temu €7 · Lasertale.eu €15 · vectorealism.com €16 (€/mq)'},
    {id:239,name:'MDF Rosso 3mm xP3',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'shop.laseridea.com',supplierUrl:'https://shop.laseridea.com',machine:'xTool P3',notes:'5 fornitori: shop.laseridea.com €14 · AliExpress €8 · Temu €7 · Lasertale.eu €15 · vectorealism.com €16 (€/mq)'},
    {id:240,name:'MDF Giallo 3mm xP3',type:'material',cat:'mdf',cost:14.00,unit:'€/mq',thickness:'3mm',supplier:'shop.laseridea.com',supplierUrl:'https://shop.laseridea.com',machine:'xTool P3',notes:'5 fornitori: shop.laseridea.com €14 · AliExpress €8 · Temu €7 · Lasertale.eu €15 · vectorealism.com €16 (€/mq)'},
    {id:241,name:'Acrilico Trasparente 3mm xP3',type:'material',cat:'plexy',cost:25.00,unit:'€/mq',thickness:'3mm',supplier:'plexishop.it',supplierUrl:'https://www.plexishop.it/it/metacrilato-pmma-acrilico/lastre-in-metacrilato.html',machine:'xTool P3',notes:'PMMA colato. 5 fornitori: plexishop.it €25 · AliExpress €14 · Temu €12 · designtrasparente.com €28 · shop.laseridea.com €26 (€/mq)'},
    {id:242,name:'Acrilico Trasparente 6mm xP3',type:'material',cat:'plexy',cost:40.00,unit:'€/mq',thickness:'6mm',supplier:'plexishop.it',supplierUrl:'https://www.plexishop.it',machine:'xTool P3',notes:'5 fornitori: plexishop.it €40 · AliExpress €22 · Temu €18 · designtrasparente.com €45 · shop.laseridea.com €42 (€/mq)'},
    {id:243,name:'Acrilico Bianco Opaco 3mm xP3',type:'material',cat:'plexy',cost:27.00,unit:'€/mq',thickness:'3mm',supplier:'plexishop.it',supplierUrl:'https://www.plexishop.it',machine:'xTool P3',notes:'5 fornitori: plexishop.it €27 · AliExpress €15 · Temu €13 · designtrasparente.com €30 · shop.laseridea.com €28 (€/mq)'},
    {id:244,name:'Acrilico Nero Opaco 3mm xP3',type:'material',cat:'plexy',cost:27.00,unit:'€/mq',thickness:'3mm',supplier:'plexishop.it',supplierUrl:'https://www.plexishop.it',machine:'xTool P3',notes:'5 fornitori: plexishop.it €27 · AliExpress €15 · Temu €13 · designtrasparente.com €30 · shop.laseridea.com €28 (€/mq)'},
    {id:245,name:'Acrilico Colorato 3mm xP3',type:'material',cat:'plexy',cost:30.00,unit:'€/mq',thickness:'3mm',supplier:'plexishop.it',supplierUrl:'https://www.plexishop.it',machine:'xTool P3',notes:'Tutti i colori. 5 fornitori: plexishop.it €30 · AliExpress €16 · Temu €14 · designtrasparente.com €33 · shop.laseridea.com €32 (€/mq)'},
    {id:246,name:'Acrilico Specchio Oro/Argento 3mm',type:'material',cat:'plexy',cost:38.00,unit:'€/mq',thickness:'3mm',supplier:'shop.laseridea.com',supplierUrl:'https://shop.laseridea.com',machine:'xTool P3',notes:'5 fornitori: shop.laseridea.com €38 · AliExpress €20 · Temu €18 · plexishop.it €42 · vectorealism.com €40 (€/mq)'},
    {id:247,name:'Acrilico Fluorescente 3mm xP3',type:'material',cat:'plexy',cost:35.00,unit:'€/mq',thickness:'3mm',supplier:'shop.laseridea.com',supplierUrl:'https://shop.laseridea.com',machine:'xTool P3',notes:'5 fornitori: shop.laseridea.com €35 · AliExpress €18 · Temu €16 · plexishop.it €38 · designtrasparente.com €36 (€/mq)'},
    {id:248,name:'Acrilico Opalino 3mm xP3',type:'material',cat:'plexy',cost:30.00,unit:'€/mq',thickness:'3mm',supplier:'plexishop.it',supplierUrl:'https://www.plexishop.it',machine:'xTool P3',notes:'LED diffuser. 5 fornitori: plexishop.it €30 · AliExpress €18 · Temu €15 · designtrasparente.com €32 · shop.laseridea.com €33 (€/mq)'},
    {id:249,name:'Sughero Sottobicchieri 5mm xP3',type:'material',cat:'legno',cost:22.00,unit:'€/mq',thickness:'5mm',supplier:'AliExpress',supplierUrl:'https://www.aliexpress.com/w/wholesale-cork-coasters-laser.html',machine:'xTool P3',notes:'5 fornitori: AliExpress €22 · Temu €18 · xTool.com €28 · regnodellegno.com €30 · Lasertale.eu €26 (€/mq)'},
    {id:250,name:'Sughero Foglio 3mm xP3',type:'material',cat:'legno',cost:18.00,unit:'€/mq',thickness:'3mm',supplier:'AliExpress',supplierUrl:'https://www.aliexpress.com/w/wholesale-cork-sheet-3mm.html',machine:'xTool P3',notes:'5 fornitori: AliExpress €18 · Temu €15 · Amazon IT €25 · regnodellegno.com €28 · Lasertale.eu €24 (€/mq)'},
    {id:251,name:'Pelle Naturale Vegetale 2mm xP3',type:'material',cat:'altro',cost:55.00,unit:'€/mq',thickness:'2-3mm',supplier:'AliExpress',supplierUrl:'https://www.aliexpress.com/w/wholesale-vegetable-tanned-leather-sheet.html',machine:'xTool P3',notes:'5 fornitori: AliExpress €55 · Temu €40 · conceria-online.it €70 · Lasertale.eu €65 · amazon.it €60 (€/mq)'},
    {id:252,name:'Ecopelle PU 1mm xP3',type:'material',cat:'altro',cost:20.00,unit:'€/mq',thickness:'1mm',supplier:'Temu',supplierUrl:'https://www.temu.com/search_result.html?search_key=faux+leather+sheet',machine:'xTool P3',notes:'5 fornitori: Temu €20 · AliExpress €22 · amazon.it €30 · Lasertale.eu €28 · vectorealism.com €32 (€/mq)'},
    {id:253,name:'Feltro Lana 3mm xP3',type:'material',cat:'altro',cost:18.00,unit:'€/mq',thickness:'3mm',supplier:'Temu',supplierUrl:'https://www.temu.com/search_result.html?search_key=felt+sheet+wool+laser',machine:'xTool P3',notes:'5 fornitori: Temu €18 · AliExpress €20 · amazon.it €28 · Lasertale.eu €25 · vectorealism.com €26 (€/mq)'},
    {id:254,name:'Feltro Acrilico 2mm xP3',type:'material',cat:'altro',cost:12.00,unit:'€/mq',thickness:'2mm',supplier:'Temu',supplierUrl:'https://www.temu.com',machine:'xTool P3',notes:'5 fornitori: Temu €12 · AliExpress €10 · amazon.it €18 · vectorealism.com €20 · Lasertale.eu €15 (€/mq)'},
    {id:255,name:'Ardesia Naturale 6mm xP3',type:'material',cat:'altro',cost:35.00,unit:'€/mq',thickness:'6mm',supplier:'AliExpress',supplierUrl:'https://www.aliexpress.com/w/wholesale-slate-tile-laser-engraving.html',machine:'xTool P3',notes:'5 fornitori: AliExpress €35 · Temu €30 · amazon.it €45 · Lasertale.eu €42 · xTool.com €48 (€/mq)'},
    {id:256,name:'Alluminio Anodizzato 1mm xP3',type:'material',cat:'metallo',cost:45.00,unit:'€/mq',thickness:'1mm',supplier:'AliExpress',supplierUrl:'https://www.aliexpress.com/w/wholesale-anodized-aluminum-sheet-laser.html',machine:'xTool P3',notes:'Solo incisione. 5 fornitori: AliExpress €45 · Temu €38 · amazon.it €60 · Lasertale.eu €55 · vectorealism.com €58 (€/mq)'},
    {id:257,name:'Acciaio Inox Coating xP3',type:'material',cat:'metallo',cost:50.00,unit:'€/mq',thickness:'0.5mm',supplier:'AliExpress',supplierUrl:'https://www.aliexpress.com/w/wholesale-stainless-steel-sheet-laser.html',machine:'xTool P3',notes:'Con cermark. Solo incisione. 5 fornitori: AliExpress €50 · Temu €42 · amazon.it €65 · Lasertale.eu €60 · xTool.com €68 (€/mq)'},
    {id:258,name:'Targhette Alluminio Sublimate',type:'material',cat:'metallo',cost:30.00,unit:'€/mq',thickness:'0.5mm',supplier:'AliExpress',supplierUrl:'https://www.aliexpress.com/w/wholesale-sublimation-aluminum-plate-laser.html',machine:'xTool P3',notes:'Targhe premio. 5 fornitori: AliExpress €30 · Temu €25 · amazon.it €40 · xTool.com €45 · Lasertale.eu €38 (€/mq)'},
    // ── LEGNI 4mm — Molto usati per Ingly Design ─────────────────────────
    {id:259,name:'Betulla Plywood 4mm',type:'material',cat:'legno',cost:18.00,unit:'€/mq',thickness:'4mm',supplier:'apaholz.it',supplierUrl:'https://apaholz.it',machine:'xTool P3',notes:'Compensato betulla 4mm. Robustezza+leggerezza. 5 fornitori: apaholz.it €18/mq · AliExpress €11/mq · Temu €10/mq · regnodellegno.com €17/mq · Lasertale.eu €20/mq'},
    {id:260,name:'Tiglio Plywood 4mm (Basswood)',type:'material',cat:'legno',cost:17.00,unit:'€/mq',thickness:'4mm',supplier:'apaholz.it',supplierUrl:'https://apaholz.it',machine:'xTool P3',notes:'Tiglio 4mm. Taglio netto. 5 fornitori: apaholz.it €17/mq · AliExpress €11/mq · Temu €10/mq · regnodellegno.com €16/mq · vectorealism.com €19/mq'},
    {id:261,name:'Noce Plywood 4mm (Walnut)',type:'material',cat:'legno',cost:36.00,unit:'€/mq',thickness:'4mm',supplier:'vectorealism.com',supplierUrl:'https://www.vectorealism.com',machine:'xTool P3',notes:'5 fornitori: vectorealism.com €36/mq · AliExpress €25/mq · Temu €22/mq · Lasertale.eu €38/mq · apaholz.it €40/mq'},
    {id:262,name:'Sapele Plywood 4mm',type:'material',cat:'legno',cost:28.00,unit:'€/mq',thickness:'4mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3',notes:'5 fornitori: Lasertale.eu €28/mq · AliExpress €20/mq · Temu €18/mq · apaholz.it €30/mq · xTool.com €33/mq'},
    {id:263,name:'Acero Plywood 4mm (Maple)',type:'material',cat:'legno',cost:28.00,unit:'€/mq',thickness:'4mm',supplier:'apaholz.it',supplierUrl:'https://apaholz.it',machine:'xTool P3',notes:'5 fornitori: apaholz.it €28/mq · AliExpress €19/mq · Temu €17/mq · Lasertale.eu €30/mq · vectorealism.com €32/mq'},
    {id:264,name:'MDF Standard 4mm',type:'material',cat:'mdf',cost:10.00,unit:'€/mq',thickness:'4mm',supplier:'shop.laseridea.com',supplierUrl:'https://shop.laseridea.com',machine:'xTool P3',notes:'MDF neutro 4mm. 5 fornitori: shop.laseridea.com €10/mq · AliExpress €6/mq · Temu €5/mq · Lasertale.eu €11/mq · vectorealism.com €12/mq'},
    {id:265,name:'MDF Finto Noce 4mm',type:'material',cat:'mdf',cost:18.00,unit:'€/mq',thickness:'4mm',supplier:'vectorealism.com',supplierUrl:'https://www.vectorealism.com',machine:'xTool P3',notes:'5 fornitori: vectorealism.com €18/mq · AliExpress €10/mq · Temu €9/mq · Lasertale.eu €19/mq · shop.laseridea.com €20/mq'},
    {id:266,name:'MDF Nero 4mm',type:'material',cat:'mdf',cost:16.00,unit:'€/mq',thickness:'4mm',supplier:'shop.laseridea.com',supplierUrl:'https://shop.laseridea.com',machine:'xTool P3',notes:'5 fornitori: shop.laseridea.com €16/mq · AliExpress €9/mq · Temu €8/mq · Lasertale.eu €17/mq · vectorealism.com €18/mq'},
    // ── LEGNI 6mm ─────────────────────────────────────────────────────────
    {id:267,name:'Betulla Plywood 6mm',type:'material',cat:'legno',cost:22.00,unit:'€/mq',thickness:'6mm',supplier:'apaholz.it',supplierUrl:'https://apaholz.it',machine:'xTool P3',notes:'5 fornitori: apaholz.it €22/mq · AliExpress €14/mq · Temu €12/mq · regnodellegno.com €21/mq · Lasertale.eu €24/mq'},
    {id:268,name:'Sapele Plywood 6mm',type:'material',cat:'legno',cost:32.00,unit:'€/mq',thickness:'6mm',supplier:'Lasertale EU',supplierUrl:'https://lasertale.eu',machine:'xTool P3',notes:'5 fornitori: Lasertale.eu €32/mq · AliExpress €22/mq · Temu €20/mq · apaholz.it €34/mq · xTool.com €36/mq'},
    {id:269,name:'Noce Nero Plywood 6mm',type:'material',cat:'legno',cost:52.00,unit:'€/mq',thickness:'6mm',supplier:'vectorealism.com',supplierUrl:'https://www.vectorealism.com',machine:'xTool P3',notes:'Black walnut 6mm. Luxury. 5 fornitori: vectorealism.com €52/mq · AliExpress €35/mq · Temu €30/mq · Lasertale.eu €55/mq · xTool.com €60/mq'},
    {id:270,name:'MDF Standard 6mm',type:'material',cat:'mdf',cost:12.00,unit:'€/mq',thickness:'6mm',supplier:'shop.laseridea.com',supplierUrl:'https://shop.laseridea.com',machine:'xTool P3',notes:'5 fornitori: shop.laseridea.com €12/mq · AliExpress €7/mq · Temu €6/mq · Lasertale.eu €13/mq · vectorealism.com €15/mq'},
    {id:271,name:'MDF Finto Acero 6mm',type:'material',cat:'mdf',cost:19.00,unit:'€/mq',thickness:'6mm',supplier:'vectorealism.com',supplierUrl:'https://www.vectorealism.com',machine:'xTool P3',notes:'5 fornitori: vectorealism.com €19/mq · AliExpress €11/mq · Temu €9/mq · Lasertale.eu €20/mq · shop.laseridea.com €22/mq'},
    // ── PLEXIGLASS 4mm ────────────────────────────────────────────────────
    {id:272,name:'Acrilico Trasparente 4mm',type:'material',cat:'plexy',cost:32.00,unit:'€/mq',thickness:'4mm',supplier:'plexishop.it',supplierUrl:'https://www.plexishop.it',machine:'xTool P3',notes:'PMMA colato 4mm. 5 fornitori: plexishop.it €32/mq · AliExpress €18/mq · Temu €15/mq · designtrasparente.com €35/mq · shop.laseridea.com €33/mq'},
    {id:273,name:'Acrilico Bianco Opaco 4mm',type:'material',cat:'plexy',cost:34.00,unit:'€/mq',thickness:'4mm',supplier:'plexishop.it',supplierUrl:'https://www.plexishop.it',machine:'xTool P3',notes:'5 fornitori: plexishop.it €34/mq · AliExpress €19/mq · Temu €16/mq · designtrasparente.com €37/mq · shop.laseridea.com €35/mq'},
    {id:274,name:'Acrilico Nero Opaco 4mm',type:'material',cat:'plexy',cost:34.00,unit:'€/mq',thickness:'4mm',supplier:'plexishop.it',supplierUrl:'https://www.plexishop.it',machine:'xTool P3',notes:'5 fornitori: plexishop.it €34/mq · AliExpress €19/mq · Temu €16/mq · designtrasparente.com €37/mq · shop.laseridea.com €35/mq'},
    {id:275,name:'Acrilico Colorato 4mm',type:'material',cat:'plexy',cost:36.00,unit:'€/mq',thickness:'4mm',supplier:'plexishop.it',supplierUrl:'https://www.plexishop.it',machine:'xTool P3',notes:'Tutti i colori. 5 fornitori: plexishop.it €36/mq · AliExpress €20/mq · Temu €17/mq · designtrasparente.com €40/mq · shop.laseridea.com €38/mq'},
    {id:276,name:'Acrilico Specchio 4mm',type:'material',cat:'plexy',cost:44.00,unit:'€/mq',thickness:'4mm',supplier:'shop.laseridea.com',supplierUrl:'https://shop.laseridea.com',machine:'xTool P3',notes:'5 fornitori: shop.laseridea.com €44/mq · AliExpress €24/mq · Temu €20/mq · plexishop.it €48/mq · designtrasparente.com €46/mq'},
    {id:277,name:'Acrilico Opalino 4mm',type:'material',cat:'plexy',cost:36.00,unit:'€/mq',thickness:'4mm',supplier:'plexishop',supplierUrl:'https://www.plexishop.it',machine:'xTool P3',notes:'Diffusore LED. 5 fornitori: plexishop.it €36/mq · AliExpress €21/mq · Temu €18/mq · designtrasparente.com €39/mq · shop.laseridea.co.it'},
  ],
  async seed() {
  const ex=await AppStore.get('materials');
    if(!ex.length){for(const m of this.DEFAULTS)await IDB.put('materials',m);}
    else{
      // Add new xTool P3 materials (id>=212) if not yet in DB
      const existingIds=new Set(ex.map(m=>m.id));
      const newMats=this.DEFAULTS.filter(m=>m.id>=212&&!existingIds.has(m.id));
      for(const m of newMats)await IDB.put('materials',m);
      if(newMats.length)console.log(`✅ Aggiunti ${newMats.length} nuovi materiali xTool P3`);
    }
  },
  async render(){await this.tab(this.activeTab,null);},
  async tab(t,btn){
    this.activeTab=t;
    document.querySelectorAll('#view-materials .tab-btn').forEach(b=>b.classList.remove('active'));
    if(btn)btn.classList.add('active');
    else{const tabs=document.querySelectorAll('#view-materials .tab-btn');if(tabs[['all','legno','mdf','plexy','machine'].indexOf(t)])tabs[['all','legno','mdf','plexy','machine'].indexOf(t)].classList.add('active');}
    const all=await AppStore.get('materials');
    const mats=all.filter(m=>m.type==='material');
    const machs=all.filter(m=>m.type==='machine');
    const kpiEl=eid('materials-kpis');
    if(kpiEl)kpiEl.innerHTML=[
      {l:'Materiali',v:mats.length,c:'var(--primary)',i:'fa-layer-group'},
      {l:'Macchine',v:machs.length,c:'var(--blue)',i:'fa-robot'},
      {l:'Costo Medio €/mq',v:'€'+(mats.filter(m=>m.unit&&m.unit.includes('mq')).reduce((a,m,_,arr)=>a+(+m.cost||0)/arr.length,0)).toFixed(2),c:'var(--green)',i:'fa-euro-sign'},
      {l:'Cat. Materiali',v:new Set(mats.map(m=>m.cat)).size,i:'fa-swatchbook',c:'var(--orange)'},
    ].map(k=>`<div class="kpi-card"><i class="fas ${k.i} kpi-icon" style="color:${k.c}"></i><div class="kpi-value">${k.v}</div><div class="kpi-label">${k.l}</div></div>`).join('');
    const el=eid('materials-content');if(!el)return;
    let filtered=all;
    if(t==='legno')filtered=all.filter(m=>m.cat==='legno'||m.cat==='tessuto'||m.cat==='sughero');
    else if(t==='mdf')filtered=all.filter(m=>m.cat==='mdf');
    else if(t==='plexy')filtered=all.filter(m=>m.cat==='plexy'||m.cat==='plastica');
    else if(t==='machine')filtered=all.filter(m=>m.type==='machine'||m.cat==='machine');
    const catIcon={legno:'🪵',mdf:'◾',plexy:'🔷',tessuto:'🧵',machine:'⚙️',sughero:'🍂',plastica:'🔩',altro:'📦'};
    const catColor={legno:'#a16207',mdf:'#6b7280',plexy:'#3b82f6',tessuto:'#ec4899',machine:'var(--primary)',sughero:'#78716c',plastica:'#8b5cf6',altro:'var(--text-muted)'};
    el.innerHTML=`<div class="table-wrap"><table>
      <thead><tr><th>Materiale</th><th>Categoria</th><th>Spessore</th><th>Costo</th><th>Fornitore</th><th>Note</th><th>Azioni</th></tr></thead>
      <tbody>${filtered.map(m=>`<tr>
        <td><div style="display:flex;align-items:center;gap:8px">${m.photo?`<img src="${m.photo}" style="width:32px;height:32px;border-radius:5px;object-fit:cover;border:1px solid var(--border);flex-shrink:0">`:`<div style="width:32px;height:32px;background:var(--bg-card2);border-radius:5px;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0">${catIcon[m.cat]||'📦'}</div>`}<strong>${m.name}</strong></div></td>
        <td><span class="badge" style="background:${catColor[m.cat]||'#888'}18;color:${catColor[m.cat]||'#888'}">${catIcon[m.cat]||'📦'} ${m.cat||m.type}</span></td>
        <td><code style="color:var(--text-muted)">${m.thickness||'—'}</code></td>
        <td><strong style="color:var(--primary)">${fmtCur(m.cost)}</strong> <small class="text-muted">${m.unit||''}</small></td>
        <td><small>${m.supplierUrl?`<a href="${m.supplierUrl}" target="_blank" style="color:var(--blue);text-decoration:none">${m.supplier||'—'} <i class="fas fa-external-link-alt" style="font-size:9px"></i></a>`:m.supplier||'—'}</small>${m.machine?`<br><span style="font-size:10px;color:var(--text-dim)">🔧 ${m.machine}</span>`:''}</td>
        <td style="max-width:180px;font-size:12px;color:var(--text-muted)">${m.notes||'—'}</td>
        <td><div class="act-group">
          <button class="act-btn act-edit" onclick="Materials.openEditModal(${m.id})"><i class="fas fa-edit"></i> Modifica</button>
          <button class="act-btn act-del" onclick="Materials.del(${m.id})"><i class="fas fa-trash"></i></button>
        </div></td>
      </tr>`).join('')||`<tr><td colspan="7" style="text-align:center;padding:24px;color:var(--text-dim)">Nessun elemento in questa categoria</td></tr>`}
      </tbody>
    </table></div>`;
  },
  _photoData:null,
  handlePhoto(input){
    const f=input.files?.[0];if(!f)return;
    const r=new FileReader();r.onload=e=>{this._photoData=e.target.result;const prev=eid('mat-photo-preview');if(prev){prev.innerHTML=`<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover">`;}};
    r.readAsDataURL(f);
  },
  clearPhoto(){
    this._photoData=null;
    const prev=eid('mat-photo-preview');if(prev){prev.innerHTML='🧱';}
    const inp=eid('mat-photo-input');if(inp)inp.value='';
  },
  openModal(type){
    this.editId=null;this.editType=type;this._photoData=null;
    eid('modal-mat-title').textContent=type==='material'?'Aggiungi Materiale':'Aggiungi Macchina';
    eid('mat-type').value=type;eid('mat-cat').value=type==='machine'?'machine':'legno';
    eid('mat-name').value='';eid('mat-cost').value='';eid('mat-unit').value=type==='material'?'€/mq':'€/min';
    eid('mat-thickness').value='';eid('mat-supplier').value='';eid('mat-notes').value='';
    const su=eid('mat-supplier-url');if(su)su.value='';
    const mm=eid('mat-machine');if(mm)mm.value='';
    const prev=eid('mat-photo-preview');if(prev)prev.innerHTML='🧱';
    openModal('material');
  },
  async openEditModal(id){
    const m=await IDB.get('materials',id);if(!m)return;
    this.editId=id;this.editType=m.type;this._photoData=m.photo||null;
    eid('modal-mat-title').textContent=m.type==='material'?'Modifica Materiale':'Modifica Macchina';
    eid('mat-type').value=m.type;eid('mat-cat').value=m.cat||'legno';
    eid('mat-name').value=m.name;eid('mat-cost').value=m.cost;eid('mat-unit').value=m.unit;
    eid('mat-thickness').value=m.thickness||'';eid('mat-supplier').value=m.supplier||'';eid('mat-notes').value=m.notes||'';
    const su=eid('mat-supplier-url');if(su)su.value=m.supplierUrl||'';
    const mm=eid('mat-machine');if(mm)mm.value=m.machine||'';
    const prev=eid('mat-photo-preview');
    if(prev){if(m.photo)prev.innerHTML=`<img src="${m.photo}" style="width:100%;height:100%;object-fit:cover">`;else prev.innerHTML='🧱';}
    openModal('material');
  },
  async save(){
    if(!eid('mat-name').value.trim()){toast('Nome obbligatorio','warning');return;}
    const item={id:Date.now(),name:eid('mat-name').value.trim(),price:+eid('mat-price')?.value||0,cost:+eid('mat-cost').value||0,unit:eid('mat-unit').value,type:eid('mat-type').value,cat:eid('mat-cat').value,thickness:eid('mat-thickness').value,supplier:eid('mat-supplier').value,notes:eid('mat-notes').value,supplierUrl:eid('mat-supplier-url')?.value||'',machine:eid('mat-machine')?.value||'',photo:this._photoData||null};
    if(this.editId)item.id=this.editId;
    await IDB.put('materials',item);
    this._photoData=null;
    toast(this.editId?'Aggiornato!':'Salvato!');closeModal('material');this.editId=null;await this.render();
  },
  async del(id){
    if(!await askConfirm('Eliminare questo elemento?'))return;
    await IDB.del('materials',id).catch(e=>console.warn('[IDB.del]',e));toast('Eliminato','warning');AppStore.invalidate('materials');
    await this.render();
  },

  // P3 — Add to Quoter
  async addToQuoterFromMat(id,name,cost){
    const area=parseFloat(await askPrompt('Area in mq? (es. 0.06 = 30x20cm)','0.06',{type:'number'})||'0.06')||0.06;
    const totalCost=+(cost*area).toFixed(2);
    localStorage.setItem('laser_calc_for_quoter',JSON.stringify({name,unitCost:totalCost,qty:1}));
    App.navigate('quoter');
    toast(`"${name}" → preventivo — €${totalCost}`,'success');
    setTimeout(()=>{
      const d=JSON.parse(localStorage.getItem('laser_calc_for_quoter')||'null');
      if(d&&Quoter.addLineFromCalc){Quoter.addLineFromCalc(d);localStorage.removeItem('laser_calc_for_quoter');}
    },800);
  },

  // P6 — Stock management
  async updateStockQty(id,delta){
    const all=await IDB.getAll('materials').catch(()=>[]);
    const m=all.find(x=>x.id===id);
    if(!m)return;
    m.stockQty=Math.max(0,(m.stockQty||0)+delta);
    m.stockUpdated=today();
    await IDB.put('materials',m);
    toast(`${m.name}: ${m.stockQty} fogli`,'success');
    await this.render();
  },

  async setStockAlert(id,qty){
    const all=await AppStore.get('materials');
    const m=all.find(x=>x.id===id);
    if(!m)return;
    m.stockAlertAt=+qty;
    await IDB.put('materials',m);
    toast('Alert scorta impostato','success');
  },

  async checkAllStockAlerts(){
    const all=await AppStore.get('materials').catch(()=>[]);
    const low=all.filter(m=>m.stockQty!==undefined&&m.stockAlertAt&&m.stockQty<=m.stockAlertAt);
    if(low.length){
      const el=eid('mat-stock-alert-banner');
      if(el){
        el.style.display='block';
        el.innerHTML=`<div style="background:#f59e0b20;border:1px solid #f59e0b40;border-radius:8px;padding:10px 14px;margin-bottom:12px;font-size:12px">
          ⚠️ <strong>Scorte basse</strong> (${low.length} materiali): ${low.map(m=>`${m.name} (${m.stockQty}fg)`).join(', ')}
          <button onclick="this.parentElement.parentElement.style.display='none'" style="float:right;background:none;border:none;cursor:pointer;color:var(--text-muted)">✕</button>
        </div>`;
      }
    }
  },
};

// ===== CATALOG PDF EXPORT =====
const Paints = {
  _editId: null,

  // RAL → HEX lookup (200 colori più comuni)
  RAL_HEX: {
    '1000':'#CCC58C','1001':'#C2A35D','1002':'#B5A12A','1003':'#E3A400','1004':'#D29000',
    '1005':'#BE7B00','1006':'#CC7A00','1007':'#E07D00','1011':'#A87638','1012':'#D4A300',
    '1013':'#F3E8C8','1014':'#DDCBA0','1015':'#E8D9B5','1016':'#EDDA00','1017':'#F09000',
    '1018':'#EDCF00','1019':'#B5A08B','1020':'#A89B6E','1021':'#EDB800','1023':'#FAC200',
    '1024':'#AF8B38','1026':'#FFFF00','1027':'#9A7300','1028':'#E87800','1032':'#E6B800',
    '1033':'#EDA000','1034':'#E8A838','1035':'#8B7E5A','1036':'#7A6040','1037':'#E07800',
    '2000':'#DA6000','2001':'#BC4B00','2002':'#CC2500','2003':'#E97000','2004':'#E05A00',
    '2005':'#FF4500','2007':'#FFA020','2008':'#E06020','2009':'#DC5500','2010':'#C86400',
    '2011':'#EA7000','2012':'#D06038','2013':'#883000','3000':'#A82000','3001':'#A01818',
    '3002':'#991818','3003':'#881010','3004':'#701818','3005':'#581010','3007':'#381010',
    '3009':'#703030','3011':'#782020','3012':'#C89090','3013':'#882222','3014':'#C07070',
    '3015':'#D8A0A0','3016':'#A84040','3017':'#C84060','3018':'#C03050','3020':'#C01010',
    '3022':'#C06048','3024':'#FF2020','3026':'#FF2020','3027':'#A81840','3028':'#CC1010',
    '3031':'#A02828','3032':'#701010','3033':'#B04040','4001':'#886088','4002':'#883060',
    '4003':'#C84880','4004':'#682848','4005':'#6060A0','4006':'#881078','4007':'#483048',
    '4008':'#883090','4009':'#A880A0','4010':'#C03070','4011':'#8870A0','4012':'#907898',
    '5000':'#284878','5001':'#1A3A5A','5002':'#0A1C60','5003':'#182848','5004':'#101830',
    '5005':'#005090','5007':'#306080','5008':'#283848','5009':'#2E5070','5010':'#005880',
    '5011':'#182038','5012':'#3070C8','5013':'#182248','5014':'#708098','5015':'#1070C0',
    '5017':'#006090','5018':'#308890','5019':'#206080','5020':'#104050','5021':'#107080',
    '5022':'#181848','5023':'#406888','5024':'#608098','5025':'#205878','5026':'#1A3C50',
    '6000':'#386040','6001':'#286030','6002':'#306828','6003':'#404830','6004':'#204830',
    '6005':'#204828','6006':'#303828','6007':'#283020','6008':'#302820','6009':'#283020',
    '6010':'#407030','6011':'#587048','6012':'#283830','6013':'#688060','6014':'#484038',
    '6015':'#383830','6016':'#006848','6017':'#487830','6018':'#508040','6019':'#C0D8A8',
    '6020':'#303820','6021':'#788060','6022':'#382820','6024':'#388050','6025':'#487030',
    '6026':'#006040','6027':'#90D0B0','6028':'#305840','6029':'#007040','6032':'#287838',
    '6033':'#409080','6034':'#80B0A8','6035':'#1D4C2B','6036':'#00584C','6037':'#00800A',
    '6038':'#00B920','7000':'#788898','7001':'#888C98','7002':'#807870','7003':'#786860',
    '7004':'#989090','7005':'#706A60','7006':'#706050','7008':'#806830','7009':'#504840',
    '7010':'#484840','7011':'#404848','7012':'#404850','7013':'#484038','7015':'#383840',
    '7016':'#303838','7021':'#282C2C','7022':'#383830','7023':'#788070','7024':'#404850',
    '7026':'#304040','7030':'#A8A090','7031':'#506070','7032':'#B0A890','7033':'#808878',
    '7034':'#907870','7035':'#C8C8C0','7036':'#909090','7037':'#787878','7038':'#A0A098',
    '7039':'#686058','7040':'#989098','7042':'#888C88','7043':'#484840','7044':'#A8A0A0',
    '7045':'#888898','7046':'#787888','7047':'#C0C0C0','7048':'#706860','8000':'#786038',
    '8001':'#885028','8002':'#784040','8003':'#704828','8004':'#703828','8007':'#583818',
    '8008':'#683818','8011':'#482818','8012':'#482020','8014':'#483018','8015':'#502818',
    '8016':'#402018','8017':'#382018','8019':'#3A3028','8022':'#181810','8023':'#784028',
    '8024':'#704838','8025':'#705040','8028':'#483828','8029':'#6C4830','9001':'#F0E8D8',
    '9002':'#E0DED0','9003':'#F0F0F0','9004':'#282820','9005':'#101010','9006':'#A0A0A0',
    '9007':'#888880','9010':'#FFFFF8','9011':'#181C18','9012':'#F8F8E8','9016':'#F8F8F8',
    '9017':'#181818','9018':'#D8DDD0','9022':'#909090','9023':'#808080',
  },

  // Cerca HEX da stringa RAL (es. "RAL 3020", "ral3020", "3020")
  ralToHex(ralStr) {
    if (!ralStr) return null;
    const num = ralStr.toString().replace(/[^0-9]/g, '');
    return this.RAL_HEX[num] || null;
  },

  // Calcola HEX da CMYK
  cmykToHex(c, m, y, k) {
    c = (+c || 0) / 100; m = (+m || 0) / 100;
    y = (+y || 0) / 100; k = (+k || 0) / 100;
    const r = Math.round(255 * (1 - c) * (1 - k));
    const g = Math.round(255 * (1 - m) * (1 - k));
    const b = Math.round(255 * (1 - y) * (1 - k));
    return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
  },

  // Aggiorna preview colore nel form
  updateColorPreview(ralStr) {
    const hex = this.ralToHex(ralStr) || null;
    const preview = eid('pt-color-preview');
    const hexDisp = eid('pt-hex-display');
    const ralName = eid('pt-ral-name');
    if (hex) {
      if (preview) preview.style.background = hex;
      if (hexDisp) hexDisp.textContent = hex.toUpperCase();
      if (ralName) ralName.textContent = `RAL ${ralStr.toString().replace(/[^0-9]/g, '')}`;
    } else if (ralStr.length >= 4) {
      // Try CMYK fallback
      const c = eid('pt-c')?.value, m = eid('pt-m')?.value,
            y = eid('pt-y')?.value, k = eid('pt-k')?.value;
      if (c || m || y || k) {
        const h = this.cmykToHex(c, m, y, k);
        if (preview) preview.style.background = h;
        if (hexDisp) hexDisp.textContent = h.toUpperCase();
      }
      if (ralName) ralName.textContent = 'Codice non trovato';
    }
  },

  // Render griglia colori
  async render() {
    const paints = await IDB.getAll('paints').catch(() => []);
    const search = eid('pt-search')?.value?.toLowerCase() || '';
    const fQ = eid('pt-filter-q')?.value || '';
    const fT = eid('pt-filter-t')?.value || '';
    const fS = eid('pt-filter-s')?.value || '';

    let list = paints.filter(p => {
      if (search && !`${p.nome}${p.marca}${p.ral}${p.fornitore}`.toLowerCase().includes(search)) return false;
      if (fQ && p.qualita !== fQ) return false;
      if (fT && p.tipo !== fT) return false;
      if (fS === 'low' && !(p.stock > 0 && p.stock <= (p.stockMin || 2))) return false;
      if (fS === 'zero' && p.stock > 0) return false;
      return true;
    });

    // KPIs
    const el = s => eid(s);
    const totalVal = paints.reduce((a, p) => a + (+p.stock || 0) * (+p.costoUnitario || 0), 0);
    const low = paints.filter(p => p.stock <= (p.stockMin || 2) && p.stock >= 0);
    const types = [...new Set(paints.map(p => p.tipo).filter(Boolean))].length;

    if (el('pt-total')) el('pt-total').textContent = paints.length;
    if (el('pt-value')) el('pt-value').textContent = fmtCur(totalVal);
    if (el('pt-low')) el('pt-low').textContent = low.length;
    if (el('pt-types')) el('pt-types').textContent = types;
    if (el('pt-count')) el('pt-count').textContent = `${list.length} risultati`;

    const grid = eid('pt-grid');
    if (!grid) return;

    if (!list.length) {
      grid.innerHTML = `<div style="grid-column:span 4;text-align:center;padding:40px;color:var(--text-dim)">
        <i class="fas fa-spray-can" style="font-size:32px;opacity:.2;display:block;margin-bottom:8px"></i>
        Nessuna vernice trovata
      </div>`;
      return;
    }

    grid.innerHTML = list.map(p => {
      const hex = this.ralToHex(p.ral) || p.ralHex || '#cccccc';
      const isLow = p.stock <= (p.stockMin || 2);
      const qualityColor = { Economica: '#22c55e', Standard: '#f59e0b', Premium: '#a855f7' }[p.qualita] || '#64748b';
      const tipoIcon = { spray: '🥫', vernice: '🪣', primer: '🫙', smalto: '✨' }[p.tipo] || '🎨';
      return `<div class="card" style="cursor:pointer;border:1.5px solid var(--border);transition:border-color .2s;padding:14px" onclick="Paints.openForm(${p.id})" onmouseover="this.style.borderColor='#e879f9'" onmouseout="this.style.borderColor='var(--border)'">
        <div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:10px">
          <div style="width:44px;height:44px;border-radius:8px;background:${hex};border:1.5px solid rgba(255,255,255,.15);flex-shrink:0"></div>
          <div style="flex:1;min-width:0">
            <div style="font-weight:700;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${p.nome || p.ral || '—'}</div>
            <div style="font-size:10px;color:var(--text-muted)">${p.marca || ''}</div>
          </div>
        </div>
        <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:8px">
          <span style="font-size:10px;background:${qualityColor}20;color:${qualityColor};border-radius:4px;padding:2px 6px;font-weight:600">${p.qualita || '—'}</span>
          <span style="font-size:10px;background:var(--bg-card2);border-radius:4px;padding:2px 6px">${tipoIcon} ${p.tipo || '—'}</span>
          ${p.ral ? `<span style="font-family:monospace;font-size:10px;background:${hex}33;border-radius:4px;padding:2px 6px;color:var(--text)">${p.ral}</span>` : ''}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center">
          <div style="font-size:11px">
            <span style="color:${isLow ? '#ef4444' : '#22c55e'};font-weight:700">${isLow ? '⚠️' : '✅'} ${p.stock || 0} ${p.unita || ''}</span>
          </div>
          <div style="font-size:11px;font-weight:700;color:var(--primary)">${p.costoUnitario ? fmtCur(p.costoUnitario) : '—'}</div>
        </div>
        ${p.fornitore ? `<div style="font-size:10px;color:var(--text-dim);margin-top:5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">🏪 ${p.fornitore}</div>` : ''}
      </div>`;
    }).join('');
  },

  // Apri form (nuovo o modifica)
  async openForm(id) {
    this._editId = id || null;
    const modal = eid('pt-modal');
    if (!modal) return;

    const titleEl = eid('pt-modal-title');
    const delBtn = eid('pt-del-btn');

    if (id) {
      const p = await IDB.get('paints', id).catch(() => null);
      if (!p) return;
      if (titleEl) titleEl.textContent = '✏️ Modifica Vernice';
      if (delBtn) delBtn.style.display = 'inline-flex';
      // Populate fields
      const set = (el, v) => { const e = eid(el); if (e) e.value = v ?? ''; };
      set('pt-ral', p.ral || '');
      set('pt-nome', p.nome || '');
      set('pt-marca', p.marca || '');
      set('pt-qualita', p.qualita || 'Standard');
      set('pt-tipo', p.tipo || 'spray');
      set('pt-unita', p.unita || 'bomboletta');
      set('pt-stock', p.stock ?? 0);
      set('pt-stock-min', p.stockMin ?? 2);
      set('pt-costo', p.costoUnitario || '');
      set('pt-fornitore', p.fornitore || '');
      set('pt-url', p.urlFornitore || '');
      set('pt-note', p.note || '');
      set('pt-c', p.cmyk?.c ?? '');
      set('pt-m', p.cmyk?.m ?? '');
      set('pt-y', p.cmyk?.y ?? '');
      set('pt-k', p.cmyk?.k ?? '');
      this.updateColorPreview(p.ral || '');
      const hex = p.ralHex || this.ralToHex(p.ral) || '#cccccc';
      if (eid('pt-color-preview')) eid('pt-color-preview').style.background = hex;
    } else {
      if (titleEl) titleEl.textContent = '🎨 Nuova Vernice';
      if (delBtn) delBtn.style.display = 'none';
      ['pt-ral','pt-nome','pt-marca','pt-fornitore','pt-url','pt-note','pt-c','pt-m','pt-y','pt-k'].forEach(id => { const e = eid(id); if (e) e.value = ''; });
      if (eid('pt-qualita')) eid('pt-qualita').value = 'Standard';
      if (eid('pt-tipo')) eid('pt-tipo').value = 'spray';
      if (eid('pt-unita')) eid('pt-unita').value = 'bomboletta';
      if (eid('pt-stock')) eid('pt-stock').value = '0';
      if (eid('pt-stock-min')) eid('pt-stock-min').value = '2';
      if (eid('pt-costo')) eid('pt-costo').value = '';
      if (eid('pt-color-preview')) eid('pt-color-preview').style.background = '#cccccc';
      if (eid('pt-hex-display')) eid('pt-hex-display').textContent = '#——';
    }

    modal.style.display = 'flex';
  },

  closeForm() {
    const modal = eid('pt-modal');
    if (modal) modal.style.display = 'none';
    this._editId = null;
  },

  async saveItem() {
    const g = id => eid(id)?.value || '';
    const ral = g('pt-ral').trim();
    const hex = this.ralToHex(ral) || this.cmykToHex(g('pt-c'), g('pt-m'), g('pt-y'), g('pt-k')) || '#cccccc';

    const paint = {
      id: this._editId || Date.now(),
      nome: g('pt-nome'),
      marca: g('pt-marca'),
      ral: ral,
      ralHex: hex,
      cmyk: { c: +g('pt-c') || 0, m: +g('pt-m') || 0, y: +g('pt-y') || 0, k: +g('pt-k') || 0 },
      qualita: g('pt-qualita'),
      tipo: g('pt-tipo'),
          stock: parseFloat(g('pt-stock')) || 0,
      unita: g('pt-unita'),
      stockMin: parseFloat(g('pt-stock-min')) || 2,
      costoUnitario: parseFloat(g('pt-costo')) || 0,
      fornitore: g('pt-fornitore'),
      urlFornitore: g('pt-url'),
      note: g('pt-note'),
      updatedAt: new Date().toISOString(),
      createdAt: this._editId ? undefined : new Date().toISOString(),
    };
    if (this._editId) delete paint.createdAt;

    await IDB.put('paints', paint);
    this.closeForm();
    await this.render();
    toast(`${paint.nome || 'Vernice'} salvata ✅`, 'success');
  },

  async deleteItem() {
    if (!this._editId) return;
    if (!await askConfirm('Eliminare questa vernice?')) return;
    await IDB.del('paints', this._editId).catch(e=>console.warn('[IDB.del]',e));
    this.closeForm();
    await this.render();
    toast('Vernice eliminata', 'success');
  },

  clearFilters() {
    ['pt-search','pt-filter-q','pt-filter-t','pt-filter-s'].forEach(id => {
      const e = eid(id);
      if (e) e.value = '';
    });
    this.render();
  },

  exportExcel() {
    IDB.getAll('paints').then(paints => {
      if (!paints.length) return toast('Nessuna vernice da esportare', 'warning');
      if (typeof ExcelExport !== 'undefined') {
        ExcelExport.fromArray(paints.map(p => ({
          'Nome': p.nome, 'Marca': p.marca, 'RAL': p.ral, 'HEX': p.ralHex,
          'CMYK C': p.cmyk?.c, 'CMYK M': p.cmyk?.m, 'CMYK Y': p.cmyk?.y, 'CMYK K': p.cmyk?.k,
          'Qualità': p.qualita, 'Tipo': p.tipo, 'Stock': p.stock, 'Unità': p.unita,
          'Costo €': p.costoUnitario, 'Fornitore': p.fornitore, 'URL': p.urlFornitore, 'Note': p.note,
        })), 'Vernici_Bombolette.xlsx');
      } else {
        toast('Modulo Excel non disponibile', 'warning');
      }
    });
  },
};

// ── Navigate hook for Paints ──────────────────────────────────────────────────
(function patchNavigateForPaints() {
  const _wait = () => {
    const _orig = App?.navigate?.bind(App);
    if (!_orig) { setTimeout(_wait, 400); return; }
    const _patched = App.navigate;
    // Only patch if not already done for paints
    if (_patched._paintsPatch) return;
    const _new = function(section) {
      _patched.call(this, section);
      if (section === 'paints' && typeof Paints!=='undefined') (async()=>{try{if(typeof Paints!=='undefined')await Paints.render();}catch(e){}}) ();
    };
    _new._paintsPatch = true;
    App.navigate = _new;
  };
  setTimeout(_wait, 1200);
})();

// ── Markup Calculator in Kanban newOrder ─────────────────────────────────────
// Adds a "🏷️ Rivendita Fornitore" section to the new order modal
(function patchKanbanNewOrder() {
  const _wait = () => {
    if (typeof Orders === 'undefined') { setTimeout(_wait, 600); return; }
    const _origNew = Orders.newOrder?.bind(Orders);
    if (!_origNew) { setTimeout(_wait, 600); return; }

    Orders.newOrder = function() {
      // Show direct order form with markup calculator
      const modal = document.createElement('div');
      modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px';
      modal.innerHTML = `
        <div style="background:var(--bg-card);border-radius:16px;padding:24px;max-width:520px;width:100%;max-height:92vh;overflow-y:auto;border:1px solid var(--border);box-shadow:0 20px 60px rgba(0,0,0,.5)">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px">
            <div><div style="font-size:16px;font-weight:800;color:var(--text)">📋 Nuovo Ordine</div>
            <div style="font-size:10px;color:var(--text-dim);margin-top:2px">Preventivo confermato, catalogo, o acquisto fornitore</div></div>
            <button onclick="this.closest('[style*=fixed]').remove()" style="background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);cursor:pointer;font-size:18px;width:32px;height:32px;border-radius:8px">✕</button>
          </div>

          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:12px">
            <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">📝 Nome Ordine</label><input class="form-control" id="no-name" placeholder="Es. Targa incisa x3"></div>
            <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">👤 Cliente</label><input class="form-control" id="no-client" placeholder="Nome cliente"></div>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">
            <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">💶 Valore €</label><input class="form-control" id="no-value" type="number" step="0.01" placeholder="0.00" oninput="PatchKanban.syncValue()"></div>
            <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">📅 Scadenza</label><input class="form-control" id="no-due" type="date"></div>
            <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">⚡ Priorità</label>
              <select class="form-control" id="no-prio">
                <option value="media" selected>🟡 Media</option>
                <option value="alta">🔴 Alta</option>
                <option value="bassa">🟢 Bassa</option>
              </select>
            </div>
          </div>
          <div style="margin-bottom:14px"><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">📋 Note</label><textarea class="form-control" id="no-desc" rows="2" placeholder="Descrizione, materiali, misure..."></textarea></div>
          <div class="form-group"><label class="form-label">📷 Foto prodotto</label>
          <div style="display:flex;gap:10px;align-items:center">
            <div id="no-photo-preview" onclick="document.getElementById('no-photo-input').click()" style="width:80px;height:80px;border-radius:10px;background:var(--bg-card2);border:2px dashed var(--border2);display:flex;align-items:center;justify-content:center;font-size:28px;cursor:pointer;overflow:hidden;flex-shrink:0">📷</div>
            <div style="flex:1"><input type="file" id="no-photo-input" accept="image/*" style="display:none" onchange="(function(f){if(!f)return;var r=new FileReader();r.onload=function(e){window._noPhotoData=e.target.result;var p=document.getElementById('no-photo-preview');if(p){p.innerHTML='';var img=document.createElement('img');img.src=e.target.result;img.style='width:100%;height:100%;object-fit:cover';p.appendChild(img);}};r.readAsDataURL(f);})(this.files[0])">
            <input id="no-photo-url" type="url" placeholder="URL immagine prodotto..." style="width:100%;padding:7px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:7px;color:var(--text);font-size:11px;outline:none;margin-top:5px"></div>
          </div></div></div>

          <!-- Markup Calculator -->
          <div style="background:var(--bg-card2);border-radius:10px;padding:14px;margin-bottom:16px;border:1px solid var(--border)">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;cursor:pointer" onclick="PatchKanban.toggleMarkup()">
              <div style="font-size:12px;font-weight:700;color:#f59e0b">🏷️ Rivendita Fornitore</div>
              <div style="font-size:10px;color:var(--text-dim)" id="no-markup-toggle">▼ Espandi</div>
            </div>
            <div id="no-markup-body" style="display:none">
              <div style="font-size:10px;color:var(--text-muted);margin-bottom:10px">Inserisci il costo dal fornitore e il markup desiderato. Il prezzo di vendita viene calcolato automaticamente.</div>
              <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:10px">
                <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">Costo Fornitore (€)</label>
                  <input class="form-control" id="no-cost" type="number" step="0.01" placeholder="0.00" oninput="PatchKanban.calcMarkup()"></div>
                <div><label style="font-size:10px;color:var(--text-muted);display:block;margin-bottom:4px">Markup %</label>
                  <input class="form-control" id="no-markup" type="number" step="1" placeholder="30" value="30" oninput="PatchKanban.calcMarkup()"></div>
              </div>
              <div style="background:var(--bg-card);border-radius:8px;padding:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;text-align:center">
                <div><div style="font-size:18px;font-weight:900;color:#22c55e" id="no-sale-price">€0</div><div style="font-size:9px;color:var(--text-muted)">Prezzo Vendita</div></div>
                <div><div style="font-size:18px;font-weight:900;color:var(--primary)" id="no-margin-eur">€0</div><div style="font-size:9px;color:var(--text-muted)">Margine €</div></div>
                <div><div style="font-size:18px;font-weight:900;color:#f59e0b" id="no-margin-pct">0%</div><div style="font-size:9px;color:var(--text-muted)">Margine %</div></div>
              </div>
              <button onclick="PatchKanban.applyMarkupPrice()" style="margin-top:8px;width:100%;padding:7px;background:#f59e0b;color:#000;border:none;border-radius:6px;cursor:pointer;font-size:11px;font-weight:700">⬆️ Usa questo prezzo nel campo "Valore €"</button>
            </div>
          </div>

          <div style="display:flex;justify-content:flex-end;gap:10px">
            <button onclick="this.closest('[style*=fixed]').remove()" style="padding:10px 16px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);border-radius:8px;cursor:pointer;font-size:13px">Annulla</button>
            <button onclick="PatchKanban.saveNewOrder(this.closest('[style*=fixed]'))" style="padding:10px 24px;background:var(--primary);color:#000;border:none;border-radius:8px;cursor:pointer;font-size:13px;font-weight:800">✅ Crea Ordine</button>
          </div>
        </div>`;
      document.body.appendChild(modal);
      modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
    };
  };
  setTimeout(_wait, 1000);
})();

// Helper for markup calculator
const PatchKanban = {
  calcMarkup() {
    const cost = parseFloat(eid('no-cost')?.value) || 0;
    const markup = parseFloat(eid('no-markup')?.value) || 0;
    const salePrice = cost * (1 + markup / 100);
    const marginEur = salePrice - cost;
    const marginPct = salePrice > 0 ? (marginEur / salePrice * 100) : 0;
    if (eid('no-sale-price')) eid('no-sale-price').textContent = fmtCur(salePrice);
    if (eid('no-margin-eur')) eid('no-margin-eur').textContent = fmtCur(marginEur);
    if (eid('no-margin-pct')) eid('no-margin-pct').textContent = marginPct.toFixed(1) + '%';
  },
  applyMarkupPrice() {
    const cost = parseFloat(eid('no-cost')?.value) || 0;
    const markup = parseFloat(eid('no-markup')?.value) || 0;
    const salePrice = +(cost * (1 + markup / 100)).toFixed(2);
    if (eid('no-value')) { eid('no-value').value = salePrice; }
    toast(`Prezzo ${fmtCur(salePrice)} applicato`, '✅');
  },
  syncValue() { /* price field edited directly */ },
  toggleMarkup() {
    const body = eid('no-markup-body');
    const toggle = eid('no-markup-toggle');
    if (!body) return;
    const open = body.style.display === 'none';
    body.style.display = open ? 'block' : 'none';
    if (toggle) toggle.textContent = open ? '▲ Chiudi' : '▼ Espandi';
  },
  async saveNewOrder(modalEl) {
    const cost = parseFloat(eid('no-cost')?.value) || 0;
    const markup = parseFloat(eid('no-markup')?.value) || 0;
    const o = {
      id: Date.now(),
      name: eid('no-name')?.value?.trim() || 'Nuovo Ordine',
      client: eid('no-client')?.value?.trim() || '',
      status: 'backlog',
      priority: eid('no-prio')?.value || 'media',
      dueDate: eid('no-due')?.value || '',
      value: parseFloat(eid('no-value')?.value) || 0,
      desc: eid('no-desc')?.value || '',
      photo: window._noPhotoData || null,
      supplierCost: cost || undefined,
      markup: markup || undefined,
      isDirect: cost > 0,
      createdAt: new Date().toISOString(),
    };
    await IDB.put('orders', o);
    if (modalEl) modalEl.remove();
    window._noPhotoData = null;
    await (typeof Orders!=='undefined'&&Orders.render());
    toast(`Ordine "${o.name}" creato nel Kanban ✅`, 'success');
  },
};


// ══════════════════════════════════════════════════════════════════
// INGLY v56 — UNIFIED MODULES: Items · Social Studio · Market Intel
// Favorites & Hide System · Full English i18n
// ══════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// INGLY v56 — UNIFIED MODULES
// Items · Social Studio · Market Intel · Favorites & Hide system
// ══════════════════════════════════════════════════════════════════════════════

// ── Helper: get availability status ──────────────────────────────────────────
function getItemAvailability(item) {
  const qty = +(item.quantity ?? item.qty ?? item.stock ?? 0);
  const min = +(item.minStock ?? item.min ?? 1);
  if (qty <= 0) return { label: '❌ Out of Stock', code: 'out', color: '#ef4444', badge: 'badge-red' };
  if (qty <= min) return { label: '⚠️ Low Stock',   code: 'low', color: '#f59e0b', badge: 'badge-yellow' };
  return { label: '✅ In Stock',      code: 'instock', color: '#22c55e', badge: 'badge-green' };
}

// ══════════════════════════════════════════════════════════════════════════════
// 🗄️ MAGAZZINO MODULE — Inventario Unificato
// Single store: 'items' — aggregates and replaces inventory/components/materials/gadgets
// ══════════════════════════════════════════════════════════════════════════════
const ItemsModule = {
  _editId: null,
  _catFilter: '_all',
  _ivaMode: 'inclusa',
  _page: 0,
  _pageSize: 30,

  _catGroups: [
    { group: null, cats: [{ key:'_all', label:'📋 Tutti' }] },
    { group: '🪵 Materiali Grezzi', cats: [
      { key:'Legno', label:'🪵 Legno' },
      { key:'MDF', label:'⬛ MDF' },
      { key:'Plexiglass', label:'💎 Plexiglass' },
      { key:'Sughero', label:'🍂 Sughero' },
      { key:'Carta & Cartone', label:'📄 Carta & Cartone' },
      { key:'Feltro & Tessuto', label:'🧵 Feltro & Tessuto' },
      { key:'Pelle', label:'🐄 Pelle' },
      { key:'Metallo', label:'🔩 Metallo' },
    ]},
    { group: '💡 Elettronica', cats: [
      { key:'LED & Illuminazione', label:'💡 LED & Illuminazione' },
    ]},
    { group: '🔧 Accessori', cats: [
      { key:'Magneti', label:'🧲 Magneti' },
      { key:'Minuteria', label:'🔧 Minuteria' },
      { key:'Colori & Finitura', label:'🎨 Colori & Finitura' },
      { key:'Adesivi', label:'🔗 Adesivi' },
      { key:'Packaging', label:'📦 Packaging' },
    ]},
    { group: '🎁 Gadget & Semilavorati', cats: [
      { key:'Portachiavi', label:'🔑 Portachiavi' },
      { key:'Frame & Cornici', label:'🖼️ Frame & Cornici' },
      { key:'Lightbox', label:'🔆 Lightbox' },
      { key:'Gadget', label:'🎁 Gadget' },
    ]},
    { group: '⚙️ Altro', cats: [
      { key:'Macchinari', label:'🛠️ Macchinari' },
      { key:'Altro', label:'❓ Altro' },
    ]},
  ],

  async _getAll() { return (await AppStore.get('items').catch(() => [])); },

  _avail(i) {
    const qty = +(i.quantity ?? i.qty ?? i.stock ?? 0);
    const min = +(i.minStock ?? i.min ?? 1);
    if (qty <= 0) return { label:'❌ Esaurito', color:'#ef4444', key:'out' };
    if (qty <= min) return { label:'⚠️ Scorta Bassa', color:'#f59e0b', key:'low' };
    return { label:'✅ OK', color:'#22c55e', key:'instock' };
  },

  setFilter(field, val) {
    this._page = 0;
    if (field === 'avail') { const e = eid('im-filter-avail'); if (e) { e.value = val; this.render(); } }
  },

  async _renderSidebar(items) {
    const sidebar = eid('im-cat-sidebar');
    if (!sidebar) return;
    const counts = { _all: items.length };
    for (const i of items) { const c = i.category || 'Altro'; counts[c] = (counts[c] || 0) + 1; }
    const knownKeys = new Set(this._catGroups.flatMap(g => g.cats.map(c => c.key)));
    let html = '';
    for (const grp of this._catGroups) {
      if (grp.group) html += `<div style="padding:5px 12px 2px;font-size:9px;font-weight:700;color:var(--text-dim);text-transform:uppercase;letter-spacing:.8px;margin-top:3px">${grp.group}</div>`;
      for (const cat of grp.cats) {
        const n = cat.key === '_all' ? items.length : (counts[cat.key] || 0);
        if (cat.key !== '_all' && n === 0) continue;
        const active = this._catFilter === cat.key;
        html += `<div onclick="ItemsModule._selectCat('${cat.key}')" style="padding:6px 12px;cursor:pointer;font-size:11px;font-weight:${active?'700':'500'};color:${active?'#38bdf8':'var(--text-muted)'};background:${active?'#38bdf812':'transparent'};border-left:2px solid ${active?'#38bdf8':'transparent'};transition:.15s;display:flex;justify-content:space-between;align-items:center">
          <span>${cat.label}</span><span style="font-size:9px;background:var(--bg-card2);border-radius:10px;padding:1px 6px">${n}</span>
        </div>`;
      }
    }
    for (const [cat, n] of Object.entries(counts)) {
      if (cat === '_all' || knownKeys.has(cat) || n === 0) continue;
      const active = this._catFilter === cat;
      html += `<div onclick="ItemsModule._selectCat('${cat.replace(/'/g,"\\'")}')" style="padding:6px 12px;cursor:pointer;font-size:11px;font-weight:${active?'700':'500'};color:${active?'#38bdf8':'var(--text-muted)'};background:${active?'#38bdf812':'transparent'};border-left:2px solid ${active?'#38bdf8':'transparent'};transition:.15s;display:flex;justify-content:space-between;align-items:center">
        <span>📁 ${cat}</span><span style="font-size:9px;background:var(--bg-card2);border-radius:10px;padding:1px 6px">${n}</span>
      </div>`;
    }
    sidebar.innerHTML = html;
  },

  _selectCat(key) { this._catFilter = key; this.render(); },

  async render() {
    const allItems = await this._getAll();
    const search = (eid('im-search')?.value || '').toLowerCase().trim();
    const supFilter = eid('im-filter-sup')?.value || '';
    const availFilter = eid('im-filter-avail')?.value || '';
    const sortBy = eid('im-sort')?.value || 'name';
    // Reset page when search/filter changes
    const _filterKey = search+'|'+supFilter+'|'+availFilter+'|'+sortBy+'|'+this._catFilter;
    if (this._lastFilterKey !== _filterKey) { this._page = 0; this._lastFilterKey = _filterKey; }

    const supSel = eid('im-filter-sup');
    if (supSel && supSel.options.length <= 1) {
      const sups = [...new Set(allItems.map(i => i.supplier).filter(Boolean))].sort();
      sups.forEach(s => { const o = document.createElement('option'); o.value = s; o.textContent = s; supSel.appendChild(o); });
    }
    await this._renderSidebar(allItems);

    let items = allItems.filter(i => {
      const avail = this._avail(i);
      const catOk = this._catFilter === '_all' || (i.category || 'Altro') === this._catFilter;
      const str = [i.name,i.sku,i.supplier,i.category,i.notes,i.brand,i.model,i.description].filter(Boolean).join(' ').toLowerCase();
      return catOk && (!search || str.includes(search)) && (!supFilter || i.supplier === supFilter) && (!availFilter || avail.key === availFilter);
    });

    items.sort((a, b) => {
      const qa = +(a.quantity??a.qty??a.stock??0), qb = +(b.quantity??b.qty??b.stock??0);
      const ca = +(a.costPrice??a.cost??0), cb = +(b.costPrice??b.cost??0);
      switch(sortBy) {
        case 'name': return (a.name||'').localeCompare(b.name||'');
        case 'name_desc': return (b.name||'').localeCompare(a.name||'');
        case 'cost': return ca - cb; case 'cost_desc': return cb - ca;
        case 'qty': return qa - qb; case 'qty_desc': return qb - qa;
        case 'updated': return (b.updatedAt||'').localeCompare(a.updatedAt||'');
        default: return (a.name||'').localeCompare(b.name||'');
      }
    });

    const totalVal = allItems.reduce((a,i) => a + (+(i.quantity??i.qty??i.stock??0)) * (+(i.costPrice??i.cost??0)), 0);
    const s = (id,v) => { const e = eid(id); if(e) e.textContent = v; };
    s('im-kpi-total', allItems.length);
    s('im-kpi-instock', allItems.filter(i=>this._avail(i).key==='instock').length);
    s('im-kpi-low', allItems.filter(i=>this._avail(i).key==='low').length);
    s('im-kpi-out', allItems.filter(i=>this._avail(i).key==='out').length);
    s('im-kpi-value', fmtCur(totalVal));
    const totalFiltered = items.length;
    s('im-count', `${totalFiltered} / ${allItems.length}`);

    // Pagination slice
    const ps = this._pageSize || 30;
    const pg = this._page || 0;
    const totalPages = Math.ceil(totalFiltered / ps);
    if (pg >= totalPages) this._page = Math.max(0, totalPages - 1);
    const pageItems = items.slice((this._page||0) * ps, (this._page||0) * ps + ps);

    const banner = eid('im-low-banner');
    if (banner) {
      const lowN = allItems.filter(i=>this._avail(i).key==='low').length;
      const outN = allItems.filter(i=>this._avail(i).key==='out').length;
      const msgs = [];
      if (outN) msgs.push(`❌ ${outN} esaurit${outN>1?'i':'o'}`);
      if (lowN) msgs.push(`⚠️ ${lowN} sotto scorta minima`);
      if (msgs.length) { eid('im-low-banner-text').textContent = msgs.join(' · ') + ' — clicca le KPI per filtrare'; banner.style.display = 'flex'; }
      else banner.style.display = 'none';
    }
    this._renderTable(pageItems, totalFiltered, totalPages);
    await this._montaRegistro();
  },

  _renderTable(items, totalFiltered, totalPages) {
    const tbody = eid('im-tbody');
    if (!tbody) return;
    if (!items.length) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;padding:48px;color:var(--text-dim)">
        <i class="fas fa-cubes" style="font-size:32px;display:block;margin-bottom:12px;opacity:.1"></i>
        Nessun item trovato.<br><span style="font-size:11px">Clicca "+ Aggiungi" o usa "DB Laser IT" per popolare il magazzino.</span>
      </td></tr>`;
      return;
    }
    tbody.innerHTML = items.map(i => {
      const qty = +(i.quantity ?? i.qty ?? i.stock ?? 0);
      const avail = this._avail(i);
      const cost = +(i.costPrice ?? i.cost ?? 0);
      const sale = +(i.salePrice ?? i.price ?? 0);
      const rowBg = avail.key === 'out' ? '#ef444408' : avail.key === 'low' ? '#f59e0b08' : '';
      const dimParts = [];
      if (i.dimW && i.dimH) dimParts.push(`${i.dimW}×${i.dimH}cm`);
      else if (i.dimW) dimParts.push(`${i.dimW}cm`);
      if (i.dimZ) dimParts.push(`${i.dimZ}mm`);
      const dimStr = dimParts.join(' · ');
      const margin = (cost && sale && sale > cost) ? Math.round((sale - cost) / sale * 100) : null;
      return `<tr style="border-bottom:1px solid var(--border);background:${rowBg};transition:background .15s" onmouseover="this.style.background='${avail.key!=='instock'?rowBg:'var(--bg-card2)'}'" onmouseout="this.style.background='${rowBg}'">
        <td style="padding:9px 14px">
          <div style="display:flex;align-items:center;gap:8px">
            ${i.photo ? `<img src="${i.photo}" style="width:30px;height:30px;border-radius:5px;object-fit:cover;border:1px solid var(--border);flex-shrink:0" onerror="this.style.display='none'">` : ''}
            <div style="min-width:0">
              <div style="font-weight:700;font-size:12px">${i.name||'—'}</div>
              ${dimStr ? `<div style="font-size:10px;color:var(--text-dim)">📐 ${dimStr}</div>` : ''}
              ${i.notes ? `<div style="font-size:10px;color:var(--text-dim);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:220px">${i.notes}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="padding:9px 10px"><span style="font-size:10px;background:var(--bg-card2);border-radius:4px;padding:2px 7px;white-space:nowrap">${i.category||'—'}</span></td>
        <td style="padding:9px 10px"><code style="color:var(--primary);font-size:10px">${i.sku||'—'}</code></td>
        <td style="padding:9px 10px;font-size:11px;white-space:nowrap">
          ${i.supplierUrl ? `<a href="${i.supplierUrl}" target="_blank" style="color:var(--text);text-decoration:none;display:inline-flex;align-items:center;gap:3px">${i.supplier||'—'} <i class="fas fa-external-link-alt" style="font-size:8px;color:var(--text-dim)"></i></a>` : (i.supplier||'—')}
        </td>
        <td style="padding:9px 10px;text-align:center">
          <div style="display:flex;align-items:center;justify-content:center;gap:4px">
            <button onclick="ItemsModule.adjustQty(${i.id},-1)" style="background:#ef444418;color:#f87171;border:1px solid #ef444430;border-radius:4px;width:20px;height:20px;cursor:pointer;font-size:11px">−</button>
            <span style="min-width:32px;text-align:center;font-weight:700;font-size:12px;color:${avail.color}">${qty}</span>
            <button onclick="ItemsModule.adjustQty(${i.id},1)" style="background:#22c55e18;color:#4ade80;border:1px solid #22c55e30;border-radius:4px;width:20px;height:20px;cursor:pointer;font-size:11px">+</button>
          </div>
          <div style="font-size:9px;color:var(--text-dim);text-align:center">${i.unit||'pz'} · min ${+(i.minStock??i.min??1)}</div>
        </td>
        <td style="padding:9px 10px;text-align:right;font-weight:600;font-size:12px">${cost?fmtCur(cost):'—'}</td>
        <td style="padding:9px 10px;text-align:right">
          <div style="font-weight:700;font-size:12px;color:var(--primary)">${sale?fmtCur(sale):'—'}</div>
          ${margin!==null?`<div style="font-size:9px;color:#22c55e">+${margin}%</div>`:''}
        </td>
        <td style="padding:9px 10px;text-align:center"><span style="font-size:10px;color:${avail.color};font-weight:700;white-space:nowrap">${avail.label}</span></td>
        <td style="padding:9px 10px;text-align:center">
          <div style="display:flex;gap:3px;justify-content:center">
            <button onclick="ItemsModule.openForm(${i.id})" style="padding:4px 8px;background:var(--bg-card2);border:1px solid var(--border);color:var(--text-muted);border-radius:5px;cursor:pointer;font-size:11px">✏️</button>
            <button onclick="ItemsModule.deleteItem($px;background:#ef444415;border:1px solid #ef444430;color:#ef4444;border-radius:5px;cursor:pointer;font-size:11px">🗑️</button>
          </div>
        </td>
      </tr>`;
    }).join('');

    // Pagination controls
    if (totalPages > 1) {
      const pg = this._page || 0;
      const bs = 'padding:4px 10px;border-radius:6px;border:1px solid var(--border);background:var(--bg-card);color:var(--text-muted);cursor:pointer;font-size:11px;';
      const bas = 'padding:4px 10px;border-radius:6px;border:1px solid var(--primary);background:var(--primary-dim);color:var(--primary);cursor:pointer;font-size:11px;font-weight:700;';
      let html = `<div id="im-pagination" style="display:flex;align-items:center;justify-content:center;gap:6px;padding:14px 0;border-top:1px solid var(--border);margin-top:4px">`;
      html += `<span style="font-size:11px;color:var(--text-muted);margin-right:4px">${items.length ? (pg*this._pageSize+1)+'-'+Math.min((pg+1)*this._pageSize,totalFiltered) : 0} di ${totalFiltered}</span>`;
      html += `<button onclick="ItemsModule._page=Math.max(0,(ItemsModule._page||0)-1);ItemsModule.render()" style="${bs}" ${pg===0?'disabled':''}>‹ Prec</button>`;
      const maxBtn = 5, half = Math.floor(maxBtn/2);
      let start = Math.max(0, pg - half), end = Math.min(totalPages, start + maxBtn);
      if (end - start < maxBtn) start = Math.max(0, end - maxBtn);
      for (let p = start; p < end; p++) html += `<button onclick="ItemsModule._page=${p};ItemsModule.render()" style="${p===pg?bas:bs}">${p+1}</button>`;
      html += `<button onclick="ItemsModule._page=Math.min(${totalPages-1},(ItemsModule._page||0)+1);ItemsModule.render()" style="${bs}" ${pg>=totalPages-1?'disabled':''}>Succ ›</button>`;
      html += `</div>`;
      const existing = document.getElementById('im-pagination');
      if (existing) existing.outerHTML = html;
      else { const tbody = document.getElementById('im-tbody'); if (tbody?.parentElement?.parentElement) { const wrap = tbody.parentElement.parentElement; wrap.insertAdjacentHTML('afterend', html); } }
    } else {
      const existing = document.getElementById('im-pagination');
      if (existing) existing.remove();
    }
  },

  /* Il registro sotto la tabella delle giacenze: due cose separate, una sotto
     l'altra, non due pannelli che si contendono lo stesso spazio. */
  async _montaRegistro() {
    const V = typeof window !== 'undefined' && window.InglyInventoryView;
    if (!V || !document.getElementById('im-ledger')) return;
    try { await V.monta('im-ledger'); } catch (e) { /* il registro non deve poter rompere il magazzino */ }
  },

  async adjustQty(id, delta) {
    const item = await IDB.get('items', +id).catch(() => null);
    if (!item) return;

    /* La giacenza non si scrive più: si **registra un movimento**, e la
       giacenza è ciò che ne risulta. La differenza si vede quando due
       operazioni si accavallano: leggi-modifica-scrivi ne perde una in
       silenzio, il registro le tiene entrambe. */
    const Inv = typeof window !== 'undefined' && window.InglyInventory;
    if (Inv) {
      const tipo = delta >= 0 ? 'acquista' : 'consuma';
      const esito = await Inv[tipo]('items', item.id, Math.abs(delta), {
        itemName: item.name || null, unit: item.unit || null,
        unitCost: item.costPrice != null ? +item.costPrice : null,
        referenceType: 'MANUAL',
        note: delta >= 0 ? 'carico manuale dal magazzino' : 'scarico manuale dal magazzino',
      });
      if (esito && esito.ok) { await this.render(); return; }
      /* Se il registro non è disponibile non si blocca il magazzino: si
         scrive come prima, e la riconciliazione se ne accorgerà. */
    }

    item.quantity = Math.max(0, +(item.quantity??item.qty??item.stock??0) + delta);
    item.updatedAt = new Date().toISOString();
    await IDB.put('items', item);
    await this.render();
  },

  async openForm(id) {
    const numId = id ? +id : null;
    this._editId = numId;
    const modal = eid('im-modal'); if (!modal) return;
    const sv = (fid, v) => { const e = eid(fid); if (e) e.value = v ?? ''; };
    if (numId) {
      const item = await IDB.get('items', numId).catch(() => null);
      if (!item) return toast('Item non trovato','warning');
      eid('im-modal-title').textContent = 'Modifica Item';
      eid('im-del-btn').style.display = 'inline-block';
      sv('im-name', item.name); sv('im-cat', item.category); sv('im-sku', item.sku||'');
      sv('im-location', item.location||''); sv('im-unit', item.unit||'pz');
      sv('im-dim-w', item.dimW||''); sv('im-dim-h', item.dimH||''); sv('im-dim-z', item.dimZ||'');
      sv('im-qty', item.quantity??item.qty??item.stock??0); sv('im-min', item.minStock??item.min??1);
      sv('im-supplier', item.supplier||''); sv('im-supplier-url', item.supplierUrl||'');
      sv('im-cost', item.costPrice??item.cost??''); sv('im-sale', item.salePrice??item.price??'');
      sv('im-notes', item.notes||item.note||''); sv('im-photo', item.photo||'');
      this.setIVA(item.ivaMode||'inclusa'); this._photoPreview(item.photo||'');
    } else {
      eid('im-modal-title').textContent = 'Aggiungi Item';
      eid('im-del-btn').style.display = 'none';
      ['im-name','im-cat','im-sku','im-location','im-supplier','im-supplier-url','im-cost','im-sale','im-notes','im-photo','im-dim-w','im-dim-h','im-dim-z'].forEach(fid => sv(fid, ''));
      sv('im-qty','0'); sv('im-min','1'); sv('im-unit','pz'); this.setIVA('inclusa'); this._photoPreview('');
    }
    modal.style.display = 'flex';
  },

  _photoPreview(url) {
    const img = eid('im-photo-img'); if (!img) return;
    if (url && url.startsWith('http')) { img.src = url; img.style.display = ''; }
    else img.style.display = 'none';
  },

  setIVA(mode) {
    this._ivaMode = mode;
    const inc = eid('im-iva-inc-btn'), exc = eid('im-iva-exc-btn');
    if (inc) { inc.style.background = mode==='inclusa'?'#22c55e':'transparent'; inc.style.color = mode==='inclusa'?'#fff':'var(--text-muted)'; }
    if (exc) { exc.style.background = mode==='esclusa'?'#ef4444':'transparent'; exc.style.color = mode==='esclusa'?'#fff':'var(--text-muted)'; }
    const hint = eid('im-iva-hint'); if (hint) hint.textContent = mode==='inclusa'?'Prezzo con IVA 22%':'+ 22% IVA da aggiungere';
    const lbl = eid('im-cost-label'); if (lbl) lbl.textContent = mode==='inclusa'?'💶 Costo (€ IVA incl.)':'💶 Costo (€ + IVA)';
  },

  closeForm() { const m = eid('im-modal'); if (m) m.style.display = 'none'; this._editId = null; },

  showPriceDB() {
    // Show current market prices for laser materials
    const priceData = [
      // Category, Material, Unit, Cost (Eur), Supplier, URL
      // ── PORTACHIAVI ───────────────────────────────────────────────
      ['Portachiavi','Bambù Rotondo 40mm','pz',0.40,'BSI Gadget','https://www.bsigadget.com'],
      ['Portachiavi','Bambù Rettangolare 55x30mm','pz',0.45,'BSI Gadget','https://www.bsigadget.com'],
      ['Portachiavi','Bambù Forma Casa','pz',0.85,'StampaSi.it','https://www.stampasi.it'],
      ['Portachiavi','Bambù Forma Cuore','pz',0.90,'gadget365.it','https://www.gadget365.it'],
      ['Portachiavi','Legno Faggio Rotondo 40mm','pz',0.55,'gadget365.it','https://www.gadget365.it'],
      ['Portachiavi','Legno Faggio Rettangolare 50x30','pz',0.65,'gadget365.it','https://www.gadget365.it'],
      ['Portachiavi','Acciaio Inox Rotondo Nero','pz',1.20,'HiGift.it','https://www.higift.it'],
      ['Portachiavi','Acciaio Inox Bicolore 150pz','pz',0.76,'HiGift.it','https://www.higift.it'],
      ['Portachiavi','Alluminio Colorato Rotondo','pz',0.83,'HiGift.it','https://www.higift.it'],
      ['Portachiavi','Alluminio Forma Casa','pz',1.20,'Yesmarket.it','https://www.yesmarket.it'],
      ['Portachiavi','Plexiglass Specchiato Oro 3mm','pz',1.50,'Artistico.it','https://www.artistico.it'],
      ['Portachiavi','Plexiglass Specchiato Argento','pz',1.40,'Artistico.it','https://www.artistico.it'],
      ['Portachiavi','Sughero Rotondo 40mm FSC','pz',0.75,'gadget365.it','https://www.gadget365.it'],
      ['Portachiavi','Pelle Naturale Rettangolare','pz',2.50,'Cuoio.it',''],
      ['Portachiavi','Inox con Astuccio Regalo','pz',2.50,'gadget365.it','https://www.gadget365.it'],
      // ── GADGET SUBLIMAZIONE ────────────────────────────────────────
      ['Sublimazione','Tazza Ceramica 350ml AAA','pz',1.47,'sublimet.com','https://www.sublimet.com'],
      ['Sublimazione','Tazza Ceramica 350ml qualità B','pz',0.85,'sublimet.com','https://www.sublimet.com'],
      ['Sublimazione','Tazza Magica Nera','pz',2.20,'sublimet.com','https://www.sublimet.com'],
      ['Sublimazione','Cuscino Bianco 40x40cm','pz',2.80,'Gadgetdiscount.it','https://www.gadgetdiscount.it'],
      ['Sublimazione','Puzzle 20x30cm 120pz','pz',2.50,'MyBay.it','https://www.mybay.it'],
      ['Sublimazione','Mousepad 20x24cm','pz',1.20,'MyBay.it','https://www.mybay.it'],
      ['Sublimazione','Borraccia Inox 500ml','pz',3.50,'Gadgetdiscount.it','https://www.gadgetdiscount.it'],
      // ── LEGNO ──────────────────────────────────────────────────────
      ['Legno','Compensato Betulla 3mm 30×30','foglio',2.50,'Atomm.com','https://www.atomm.com'],
      ['Legno','Compensato Betulla 4mm 40×40','foglio',5.50,'Lasertale EU','https://www.lasertale.com'],
      ['Legno','Mogano 3mm 30×30','foglio',4.50,'Atomm.com','https://www.atomm.com'],
      ['Legno','Noce 3mm 30×30','foglio',5.50,'Atomm.com','https://www.atomm.com'],
      ['Legno','Bambù 3mm 30×30','foglio',2.80,'Atomm.com','https://www.atomm.com'],
      ['MDF','MDF 3mm 30×30','foglio',1.80,'Leroy Merlin',''],
      ['MDF','MDF 4mm 60×40','foglio',5.50,'Leroy Merlin',''],
      ['MDF','MDF Laminato Bianco 3mm 30×30','foglio',2.50,'Leroy Merlin',''],
      ['MDF','MDF Laminato Bianco 4mm 60×40','foglio',6.50,'Leroy Merlin',''],
      ['MDF','MDF Laminato Nero 3mm 30×30','foglio',2.80,'Artistico.it','https://www.artistico.it'],
      ['Plexiglass','Plexiglass Trasparente 3mm 30×30','foglio',3.50,'Artistico.it','https://www.artistico.it'],
      ['Plexiglass','Plexiglass Bianco Opaco 3mm 30×30','foglio',3.20,'Artistico.it','https://www.artistico.it'],
      ['Plexiglass','Plexiglass Specchiato Oro 3mm 30×30','foglio',8.50,'Artistico.it','https://www.artistico.it'],
      ['Plexiglass','Plexiglass Specchiato Argento 3mm 30×30','foglio',7.50,'Artistico.it','https://www.artistico.it'],
      ['Plexiglass','Plexiglass Fluorescente 3mm 30×30','foglio',6.50,'Artistico.it','https://www.artistico.it'],
      ['Pelle','Pelle Vegana 1mm 30×30','foglio',4.50,'Cuoio.it',''],
      ['Sughero','Sughero 3mm 30×30','foglio',2.00,'AliExpress',''],
      ['Feltro','Feltro 2mm 30×30','foglio',1.20,'BricoItalia',''],
    ];
    const existing = document.getElementById('im-price-db-modal');
    if (existing) existing.remove();
    const ov = document.createElement('div');
    ov.id = 'im-price-db-modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);z-index:99999;display:flex;align-items:center;justify-content:center;padding:16px';
    ov.onclick = e => { if(e.target===ov) ov.remove(); };
    // Store data for onclick access
    window._imPriceRows = priceData;
    /* Il ×2,5 era un ricarico scritto a mano, e come tutti i ricarichi
       travestiti non diceva quale margine producesse: il 60%. Adesso lo fa il
       motore, dal margine, e il numero non si muove — ×2,5 e margine 60%
       sono lo stesso prezzo detto in due modi, ma solo il secondo si può
       confrontare con il pavimento sotto cui non si vende. */
    const MARGINE_SUGGERITO = 60;
    const prezzoSuggerito = (c) => {
      const M = window.InglyCostEngine;
      if (!M) return c * 2.5;
      return M.prezzo(c, { strategia: 'margine', marginePct: MARGINE_SUGGERITO, ivaPct: 0 }).netto;
    };
    let rows = priceData.map(([cat,name,unit,cost,sup,url],idx) => {
      const sale = prezzoSuggerito(cost).toFixed(2);
      const supHtml = url ? '<a href="'+url+'" target="_blank" style="color:#60a5fa;text-decoration:none">'+sup+' 🌐</a>' : sup;
      return '<tr style="border-bottom:1px solid var(--border)">'
        +'<td style="padding:8px 12px;font-size:11px;color:var(--text-muted)">'+cat+'</td>'
        +'<td style="padding:8px 12px;font-size:12px;color:var(--text);font-weight:600">'+name+'</td>'
        +'<td style="padding:8px 6px;text-align:center;font-size:11px;color:var(--text-muted)">'+unit+'</td>'
        +'<td style="padding:8px 12px;text-align:right;font-size:13px;font-weight:800;color:#fbbf24">€'+cost.toFixed(2)+'</td>'
        +'<td style="padding:8px 12px;text-align:right;font-size:11px;color:#22c55e">€'+sale+'</td>'
        +'<td style="padding:8px 10px;font-size:10px;color:var(--text-dim)">'+supHtml+'</td>'
        +'<td style="padding:8px 8px"><button onclick="ItemsModule._addFromPriceDB('+idx+')" style="padding:3px 8px;background:linear-gradient(135deg,#10b981,#059669);color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:10px;font-weight:700">+ Aggiungi</button></td>'
        +'</tr>';
    }).join('');
    ov.innerHTML = `<div style="background:var(--bg-card);border-radius:16px;width:min(800px,100%);max-height:90vh;overflow-y:auto;border:1px solid var(--border2)" onclick="event.stopPropagation()">
      <div style="padding:14px 18px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:10px;position:sticky;top:0;background:var(--bg-card);border-radius:16px 16px 0 0">
        <span style="font-size:22px">💶</span>
        <div style="flex:1">
          <div style="font-size:15px;font-weight:800;color:var(--text)">Prezzi Mercato Materiali Laser — Italia 2026</div>
          <div style="font-size:11px;color:var(--text-muted)">Fonti: Atomm.com · Lasertale EU · Artistico.it · Leroy Merlin · (prezzi indicativi — verifica sempre)</div>
        </div>
        <button onclick="document.getElementById('im-price-db-modal').remove()" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:20px">✕</button>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead><tr style="background:var(--bg-card2);font-size:10px;font-weight:700;color:var(--text-muted);text-transform:uppercase">
          <th style="padding:8px 12px;text-align:left">Cat.</th>
          <th style="padding:8px 12px;text-align:left">Materiale</th>
          <th style="padding:8px 6px;text-align:center">U.M.</th>
          <th style="padding:8px 12px;text-align:right">Costo acquisto</th>
          <th style="padding:8px 12px;text-align:right">Vendita ×2.5</th>
          <th style="padding:8px 10px;text-align:left">Fornitore</th>
          <th style="padding:8px 8px"></th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>`;
    document.body.appendChild(ov);
  },

  async _addFromPriceDB(idx) {
    const row = window._imPriceRows && window._imPriceRows[idx];
    if (!row) return;
    const [cat, name, unit, cost, sup, url] = row;
    const item = {
      id: Date.now(), name, category: cat, unit,
      quantity: 0, qty: 0, minStock: 1,
      costPrice: cost,
      /* Lo stesso prezzo della tabella, dalla stessa funzione: due strade allo
         stesso numero è come nascono i motori paralleli. */
      salePrice: +((window.InglyCostEngine
        ? window.InglyCostEngine.prezzo(cost, { strategia:'margine', marginePct:60, ivaPct:0 }).netto
        : cost * 2.5).toFixed(2)),
      supplier: sup, supplierUrl: url,
      notes: 'Aggiunto da Prezzi Mercato Laser 2026',
      updatedAt: new Date().toISOString(), createdAt: new Date().toISOString(),
    };
    await IDB.put('items', item);
    await this.render();
    if (typeof toast !== 'undefined') toast('✅ ' + name + ' aggiunto!', 'success');
  },

  async saveItem() {
    const gv = fid => eid(fid)?.value?.trim() || '';
    const name = gv('im-name'); if (!name) return toast('Nome obbligatorio','warning');
    const item = {
      id: this._editId || Date.now(), name,
      category: gv('im-cat') || 'Altro', sku: gv('im-sku'), location: gv('im-location'),
      unit: eid('im-unit')?.value || 'pz',
      dimW: parseFloat(eid('im-dim-w')?.value) || null,
      dimH: parseFloat(eid('im-dim-h')?.value) || null,
      dimZ: parseFloat(eid('im-dim-z')?.value) || null,
      qty: parseFloat(eid('im-qty')?.value) || 0,
      minStock: parseFloat(eid('im-min')?.value) || 1,
      supplier: gv('im-supplier'), supplierUrl: gv('im-supplier-url'),
      costPrice: parseFloat(eid('im-cost')?.value) || 0,
      salePrice: parseFloat(eid('im-sale')?.value) || 0,
      notes: gv('im-notes'), photo: gv('im-photo'), ivaMode: this._ivaMode,
      updatedAt: new Date().toISOString(),
    };
    if (!this._editId) item.createdAt = new Date().toISOString();
    await IDB.put('items', item);
    this.closeForm();
    const supSel = eid('im-filter-sup'); if (supSel) { while (supSel.options.length > 1) supSel.remove(1); }
    await this.render();
    toast(`${name} salvato ✅`,'success');
  },

  async deleteItem(id) {
    const targetId = id ? +id : this._editId; if (!targetId) return;
    if (!await askConfirm('Eliminare questo item?')) return;
    await IDB.del('items', targetId).catch(e=>console.warn('[IDB.del]',e)); this.closeForm();
    await this.render(); toast('Item eliminato','success');
  },

  clearFilters() {
    ['im-search','im-filter-sup','im-filter-avail'].forEach(id => { const e = eid(id); if (e) e.value = ''; });
    const s = eid('im-sort'); if (s) s.value = 'name';
    const sup = eid('im-filter-sup'); if (sup) { while (sup.options.length > 1) sup.remove(1); }
    this._catFilter = '_all'; this.render();
  },

  async exportCSV() {
    const items = await this._getAll();
    if (!items.length) return toast('Nessun item','warning');
    const hdr = 'Nome,Categoria,SKU,Largh_cm,Alt_cm,Spess_mm,Unità,Quantità,Scorta_Min,Fornitore,URL_Fornitore,Costo_EUR,Vendita_EUR,Posizione,Note';
    const esc = v => `"${String(v??'').replace(/"/g,'""')}"`;
    const rows = items.map(i => [
      i.name,i.category,i.sku||'',i.dimW||'',i.dimH||'',i.dimZ||'',
      i.unit||'pz',i.quantity??i.qty??i.stock??0,i.minStock??i.min??1,
      i.supplier||'',i.supplierUrl||'',i.costPrice??i.cost??0,i.salePrice??i.price??0,
      i.location||'',(i.notes||'').replace(/\n/g,' ').replace(/,/g,';')
    ].map(esc).join(','));
    const a = document.createElement('a');
    a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent([hdr,...rows].join('\n'));
    a.download = `Items_${new Date().toISOString().slice(0,10)}.csv`; a.click();
    toast('✅ CSV esportato','success');
  },

  openCSVImport() { const m = eid('im-csv-modal'); if (m) m.style.display = 'flex'; const t = eid('im-csv-text'); if (t) t.value = ''; },

  async importCSV() {
    const raw = eid('im-csv-text')?.value?.trim(); if (!raw) return toast('Nessun CSV','warning');
    const lines = raw.split('\n').map(l=>l.trim()).filter(Boolean);
    const isHdr = l => /nome|name/i.test(l);
    const data = isHdr(lines[0]) ? lines.slice(1) : lines;
    const parseL = line => {
      const res=[]; let cur='', inQ=false;
      for (let i=0;i<line.length;i++){
        const ch=line[i];
        if(ch==='"'){if(inQ&&line[i+1]==='"'){cur+='"';i++;}else inQ=!inQ;}
        else if(ch===','&&!inQ){res.push(cur.trim());cur='';}
        else cur+=ch;
      }
      res.push(cur.trim()); return res;
    };
    let added=0;
    for(const line of data){
      const c=parseL(line); if(c.length<2)continue;
      const item={id:Date.now()+added++,name:c[0],category:c[1]||'Altro',sku:c[2]||'',
        dimW:parseFloat(c[3])||null,dimH:parseFloat(c[4])||null,dimZ:parseFloat(c[5])||null,
        unit:c[6]||'pz',quantity:parseFloat(c[7])||0,minStock:parseFloat(c[8])||1,
        supplier:c[9]||'',supplierUrl:c[10]||'',costPrice:parseFloat(c[11])||0,
        salePrice:parseFloat(c[12])||0,location:c[13]||'',notes:c[14]||'',
        createdAt:new Date().toISOString(),source:'csv'};
      await IDB.put('items',item); await new Promise(r=>setTimeout(r,1));
    }
    const m = eid('im-csv-modal'); if(m) m.style.display='none';
    const sup = eid('im-filter-sup'); if(sup){while(sup.options.length>1)sup.remove(1);}
    await this.render(); toast(`✅ ${added} items importati da CSV`,'success');
  },

  async loadItalianDB() {
    if (!await askConfirm('Compensato, MDF, Plexiglass, LED, Magneti, Gadget, Packaging e altro — 60+ items con prezzi Atomm, Lasertale, Artistico.it, Supermagnete.',{title:'Caricare il database materiali laser con prezzi di mercato italiani?',confirmLabel:'Carica',danger:false})) return;
    const existing = await this._getAll();
    const names = new Set(existing.map(i=>(i.name||'').toLowerCase()));
    const DB = [
      {n:'Compensato Betulla 3mm 30x30cm',c:'Legno',u:'foglio',q:20,m:8,cost:2.50,sale:7.00,sup:'Atomm.com',url:'https://www.atomm.com',w:30,h:30,z:3,note:'Taglio laser xTool P2: 100%/30%. Incisione fine.'},
      {n:'Compensato Betulla 3mm 40x40cm',c:'Legno',u:'foglio',q:15,m:6,cost:4.00,sale:11.00,sup:'Atomm.com',url:'https://www.atomm.com',w:40,h:40,z:3,note:''},
      {n:'Compensato Betulla 4mm 40x40cm',c:'Legno',u:'foglio',q:12,m:5,cost:5.50,sale:14.00,sup:'Lasertale EU',url:'https://www.lasertale.com',w:40,h:40,z:4,note:''},
      {n:'Compensato Betulla 6mm 60x30cm',c:'Legno',u:'foglio',q:8,m:3,cost:8.00,sale:20.00,sup:'Lasertale EU',url:'https://www.lasertale.com',w:60,h:30,z:6,note:'Strutture 3D e oggetti spessi'},
      {n:'Compensato Tiglio 3mm 30x30cm',c:'Legno',u:'foglio',q:15,m:6,cost:3.00,sale:8.50,sup:'Atomm.com',url:'https://www.atomm.com',w:30,h:30,z:3,note:'Ottimo per incisione fine'},
      {n:'Compensato Tiglio 4mm 40x40cm',c:'Legno',u:'foglio',q:10,m:4,cost:5.80,sale:15.00,sup:'Atomm.com',url:'https://www.atomm.com',w:40,h:40,z:4,note:''},
      {n:'Compensato Pioppo 3mm 30x30cm',c:'Legno',u:'foglio',q:20,m:8,cost:2.20,sale:6.00,sup:'BricoItalia',url:'',w:30,h:30,z:3,note:'Economico per produzioni serie'},
      {n:'Compensato Pioppo 4mm 60x30cm',c:'Legno',u:'foglio',q:10,m:4,cost:5.00,sale:12.00,sup:'BricoItalia',url:'',w:60,h:30,z:4,note:''},
      {n:'MDF 3mm 30x30cm',c:'MDF',u:'foglio',q:20,m:8,cost:1.80,sale:5.50,sup:'Leroy Merlin',url:'',w:30,h:30,z:3,note:''},
      {n:'MDF 3mm 60x40cm',c:'MDF',u:'foglio',q:12,m:5,cost:3.50,sale:9.00,sup:'Leroy Merlin',url:'',w:60,h:40,z:3,note:''},
      {n:'MDF 6mm 30x30cm',c:'MDF',u:'foglio',q:10,m:4,cost:3.20,sale:8.50,sup:'Leroy Merlin',url:'',w:30,h:30,z:6,note:'Incisioni profonde e strutture'},
      {n:'MDF 6mm 60x40cm',c:'MDF',u:'foglio',q:8,m:3,cost:5.50,sale:14.00,sup:'Leroy Merlin',url:'',w:60,h:40,z:6,note:''},
      {n:'Plexiglass Trasparente 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:10,m:4,cost:3.50,sale:10.00,sup:'Artistico.it',url:'https://www.artistico.it',w:30,h:30,z:3,note:''},
      {n:'Plexiglass Trasparente 3mm 60x40cm',c:'Plexiglass',u:'foglio',q:6,m:2,cost:8.00,sale:22.00,sup:'Artistico.it',url:'https://www.artistico.it',w:60,h:40,z:3,note:''},
      {n:'Plexiglass Bianco Opaco 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:8,m:3,cost:3.20,sale:9.00,sup:'Artistico.it',url:'https://www.artistico.it',w:30,h:30,z:3,note:'Lightbox e retroilluminazione'},
      {n:'Plexiglass Colorato 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:8,m:3,cost:4.00,sale:11.00,sup:'Artistico.it',url:'https://www.artistico.it',w:30,h:30,z:3,note:'Disponibile: rosso, blu, verde, nero, giallo'},
      {n:'Plexiglass Specchiato Oro 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:5,m:2,cost:6.00,sale:16.00,sup:'Axen IT',url:'',w:30,h:30,z:3,note:'Taglio bassa potenza'},
      {n:'Plexiglass Specchiato Argento 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:5,m:2,cost:6.00,sale:16.00,sup:'Axen IT',url:'',w:30,h:30,z:3,note:''},
      {n:'Plexiglass Fluorescente 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:6,m:2,cost:5.00,sale:14.00,sup:'Artistico.it',url:'https://www.artistico.it',w:30,h:30,z:3,note:''},
      {n:'Sughero Naturale 3mm 30x30cm',c:'Sughero',u:'foglio',q:10,m:4,cost:2.00,sale:6.00,sup:'Corkstore IT',url:'',w:30,h:30,z:3,note:''},
      {n:'Sughero Naturale 6mm 30x30cm',c:'Sughero',u:'foglio',q:6,m:2,cost:3.50,sale:9.00,sup:'Corkstore IT',url:'',w:30,h:30,z:6,note:'Sottobicchieri e basi'},
      {n:'Cartoncino 300g 30x30cm',c:'Carta & Cartone',u:'foglio',q:50,m:20,cost:0.50,sale:1.50,sup:'Cartolibreria',url:'',w:30,h:30,z:0,note:''},
      {n:'Carta Transfer Sublimazione A4',c:'Carta & Cartone',u:'foglio',q:100,m:30,cost:0.30,sale:1.20,sup:'AliExpress',url:'',w:29.7,h:21,z:0,note:'Stampa + pressa termica 180C'},
      {n:'Feltro 3mm 30x30cm',c:'Feltro & Tessuto',u:'foglio',q:15,m:5,cost:1.50,sale:4.50,sup:'Manualex IT',url:'',w:30,h:30,z:3,note:'Base articoli antigraffio'},
      {n:'Feltro 5mm 30x30cm',c:'Feltro & Tessuto',u:'foglio',q:8,m:3,cost:2.20,sale:6.00,sup:'Manualex IT',url:'',w:30,h:30,z:5,note:''},
      {n:'Juta 30x30cm',c:'Feltro & Tessuto',u:'foglio',q:10,m:4,cost:1.20,sale:3.50,sup:'Manualex IT',url:'',w:30,h:30,z:0,note:'Incisione laser'},
      {n:'Pelle Sintetica 30x30cm',c:'Pelle',u:'foglio',q:8,m:3,cost:3.00,sale:9.00,sup:'PelleCraft IT',url:'',w:30,h:30,z:0,note:'Taglio laser fine'},
      {n:'Pelle Naturale 30x30cm',c:'Pelle',u:'foglio',q:5,m:2,cost:5.50,sale:16.00,sup:'PelleCraft IT',url:'',w:30,h:30,z:0,note:''},
      {n:'Alluminio Anodizzato Nero 0.5mm 30x20cm',c:'Metallo',u:'foglio',q:10,m:3,cost:4.50,sale:14.00,sup:'Metalrota IT',url:'',w:30,h:20,z:0,note:'Solo incisione (non taglio CO2)'},
      {n:'Acciaio Inox 304 0.5mm 20x20cm',c:'Metallo',u:'foglio',q:5,m:2,cost:6.00,sale:18.00,sup:'Metalrota IT',url:'',w:20,h:20,z:0,note:'Marcatura con pasta TherMark'},
      {n:'COB LED 50W Bianco Caldo 3000K',c:'LED & Illuminazione',u:'pz',q:8,m:2,cost:8.00,sale:22.00,sup:'AliExpress',url:'',w:0,h:0,z:0,note:'Lightbox e tavoli luminosi'},
      {n:'COB LED 30W Bianco Freddo 6000K',c:'LED & Illuminazione',u:'pz',q:6,m:2,cost:6.00,sale:17.00,sup:'AliExpress',url:'',w:0,h:0,z:0,note:''},
      {n:'Striscia LED 12V Bianco 5m',c:'LED & Illuminazione',u:'rotolo',q:5,m:2,cost:12.00,sale:32.00,sup:'AliExpress',url:'',w:0,h:0,z:0,note:'Shadowbox e cornici illuminate'},
      {n:'Striscia LED RGB 12V 5m',c:'LED & Illuminazione',u:'rotolo',q:4,m:2,cost:14.00,sale:38.00,sup:'AliExpress',url:'',w:0,h:0,z:0,note:''},
      {n:'LED Strip Silicone USB 1m',c:'LED & Illuminazione',u:'pz',q:12,m:4,cost:3.50,sale:10.00,sup:'AliExpress',url:'',w:0,h:0,z:0,note:''},
      {n:'Driver LED 30W 220V',c:'LED & Illuminazione',u:'pz',q:6,m:2,cost:5.00,sale:15.00,sup:'AliExpress',url:'',w:0,h:0,z:0,note:''},
      {n:'Alimentatore 12V 2A',c:'LED & Illuminazione',u:'pz',q:8,m:3,cost:3.50,sale:10.00,sup:'Amazon IT',url:'',w:0,h:0,z:0,note:''},
      {n:'Calamita Neodimio D20x6mm N52',c:'Magneti',u:'pz',q:200,m:50,cost:0.15,sale:0.50,sup:'Supermagnete IT',url:'https://www.supermagnete.it',w:0,h:0,z:0,note:'Calendari, lavagne, box'},
      {n:'Calamita Neodimio D10x3mm',c:'Magneti',u:'pz',q:300,m:80,cost:0.08,sale:0.30,sup:'Supermagnete IT',url:'https://www.supermagnete.it',w:0,h:0,z:0,note:''},
      {n:'Calamita Neodimio 20x10x3mm',c:'Magneti',u:'pz',q:100,m:30,cost:0.12,sale:0.40,sup:'Supermagnete IT',url:'https://www.supermagnete.it',w:0,h:0,z:0,note:''},
      {n:'Anello Portachiavi 25mm',c:'Minuteria',u:'pz',q:500,m:100,cost:0.10,sale:0.35,sup:'Amazon IT',url:'',w:0,h:0,z:0,note:''},
      {n:'Gancio D-ring Metallo 30mm',c:'Minuteria',u:'pz',q:200,m:50,cost:0.20,sale:0.60,sup:'Amazon IT',url:'',w:0,h:0,z:0,note:''},
      {n:'Occhiello Metallo 8mm',c:'Minuteria',u:'pz',q:500,m:100,cost:0.05,sale:0.20,sup:'Amazon IT',url:'',w:0,h:0,z:0,note:''},
      {n:'Catena Portachiavi 8cm',c:'Minuteria',u:'pz',q:200,m:50,cost:0.15,sale:0.50,sup:'Amazon IT',url:'',w:0,h:0,z:0,note:''},
      {n:'Rivetto Ottone 4mm',c:'Minuteria',u:'pz',q:300,m:80,cost:0.08,sale:0.25,sup:'Ferramenta IT',url:'',w:0,h:0,z:0,note:''},
      {n:'Vernice Spray Trasparente Lucida 400ml',c:'Colori & Finitura',u:'bomboletta',q:5,m:2,cost:6.00,sale:15.00,sup:'Leroy Merlin',url:'',w:0,h:0,z:0,note:''},
      {n:'Vernice Spray Opaca Nera 400ml',c:'Colori & Finitura',u:'bomboletta',q:4,m:2,cost:6.50,sale:16.00,sup:'Leroy Merlin',url:'',w:0,h:0,z:0,note:''},
      {n:'Vernice Acrilica Bianca 250ml',c:'Colori & Finitura',u:'barattolo',q:3,m:1,cost:4.50,sale:12.00,sup:'Leroy Merlin',url:'',w:0,h:0,z:0,note:''},
      {n:'Pasta TherMark per Metallo 100g',c:'Colori & Finitura',u:'barattolo',q:2,m:1,cost:25.00,sale:65.00,sup:'Amazon IT',url:'',w:0,h:0,z:0,note:'Marcatura laser metallo'},
      {n:'Olio di Lino per Legno 250ml',c:'Colori & Finitura',u:'barattolo',q:3,m:1,cost:5.00,sale:14.00,sup:'Ferramenta IT',url:'',w:0,h:0,z:0,note:'Finitura naturale post-incisione'},
      {n:'Colla a Caldo Stick 11mm',c:'Adesivi',u:'pz',q:100,m:20,cost:0.10,sale:0.35,sup:'Brico IT',url:'',w:0,h:0,z:0,note:''},
      {n:'Biadesivo 3M VHB 10mm x 3m',c:'Adesivi',u:'rotolo',q:5,m:2,cost:4.50,sale:12.00,sup:'Amazon IT',url:'',w:0,h:0,z:0,note:'Incollaggio specchi e insegne'},
      {n:'Resina Epossidica AB 100ml',c:'Adesivi',u:'pz',q:5,m:2,cost:8.00,sale:22.00,sup:'AliExpress',url:'',w:0,h:0,z:0,note:''},
      {n:'Colla Vinavil 750g',c:'Adesivi',u:'barattolo',q:3,m:1,cost:5.50,sale:14.00,sup:'Brico IT',url:'',w:0,h:0,z:0,note:''},
      {n:'Sacchetto Organza 10x15cm',c:'Packaging',u:'pz',q:500,m:100,cost:0.12,sale:0.40,sup:'Bella Confezione',url:'',w:0,h:0,z:0,note:''},
      {n:'Scatola Kraft 10x10x3cm',c:'Packaging',u:'pz',q:100,m:30,cost:0.40,sale:1.20,sup:'Packaging IT',url:'',w:0,h:0,z:0,note:''},
      {n:'Scatola Kraft 15x15x5cm',c:'Packaging',u:'pz',q:80,m:20,cost:0.65,sale:1.80,sup:'Packaging IT',url:'',w:0,h:0,z:0,note:''},
      {n:'Nastro Satin 10mm x 10m',c:'Packaging',u:'rotolo',q:10,m:3,cost:1.50,sale:4.00,sup:'Bella Confezione',url:'',w:0,h:0,z:0,note:''},
      {n:'Portachiavi Legno Grezzo 5x5cm',c:'Portachiavi',u:'pz',q:50,m:20,cost:0.80,sale:2.50,sup:'Atomm.com',url:'https://www.atomm.com',w:5,h:5,z:4,note:''},
      {n:'Portachiavi Plexiglass Trasparente 5x5cm',c:'Portachiavi',u:'pz',q:50,m:20,cost:0.60,sale:2.00,sup:'Atomm.com',url:'https://www.atomm.com',w:5,h:5,z:3,note:''},
      {n:'Portachiavi Plexiglass Colorato 5x5cm',c:'Portachiavi',u:'pz',q:40,m:15,cost:0.75,sale:2.20,sup:'Atomm.com',url:'https://www.atomm.com',w:5,h:5,z:3,note:''},
      {n:'Medaglione Legno Ovale 7x5cm',c:'Portachiavi',u:'pz',q:30,m:10,cost:0.90,sale:2.80,sup:'Lasertale EU',url:'https://www.lasertale.com',w:7,h:5,z:4,note:''},
      {n:'Frame Legno 20x20cm',c:'Frame & Cornici',u:'pz',q:20,m:5,cost:3.50,sale:10.00,sup:'IKEA',url:'',w:20,h:20,z:0,note:''},
      {n:'Frame Legno 30x20cm',c:'Frame & Cornici',u:'pz',q:15,m:4,cost:5.00,sale:14.00,sup:'IKEA',url:'',w:30,h:20,z:0,note:''},
      {n:'Frame Galleggiante 20x20cm',c:'Frame & Cornici',u:'pz',q:10,m:3,cost:6.50,sale:18.00,sup:'Amazon IT',url:'',w:20,h:20,z:0,note:'Shadowbox floating'},
      {n:'Cornice Plex A4 21x29.7cm',c:'Frame & Cornici',u:'pz',q:8,m:3,cost:4.00,sale:12.00,sup:'Amazon IT',url:'',w:21,h:29.7,z:0,note:''},
      {n:'Lightbox A4 con LED USB',c:'Lightbox',u:'pz',q:5,m:2,cost:15.00,sale:42.00,sup:'Amazon IT',url:'',w:21,h:29.7,z:0,note:'Retroilluminazione plexiglass'},
      {n:'Lightbox A3 con LED USB',c:'Lightbox',u:'pz',q:3,m:1,cost:22.00,sale:62.00,sup:'Amazon IT',url:'',w:29.7,h:42,z:0,note:''},
      {n:'Targa Commemorativa Legno 20x15cm',c:'Gadget',u:'pz',q:20,m:5,cost:5.00,sale:18.00,sup:'Lasertale EU',url:'https://www.lasertale.com',w:20,h:15,z:6,note:''},
      {n:'Sottobicchiere Legno 10x10cm',c:'Gadget',u:'pz',q:50,m:20,cost:1.20,sale:4.00,sup:'Atomm.com',url:'https://www.atomm.com',w:10,h:10,z:6,note:''},
      {n:'Puzzle Legno 30x20cm',c:'Gadget',u:'pz',q:10,m:3,cost:4.50,sale:14.00,sup:'Atomm.com',url:'https://www.atomm.com',w:30,h:20,z:6,note:'6-12 pezzi taglio laser'},
      // ── LEGNI PREGIATI ──
      {n:'Mogano 3mm 30x30cm',c:'Legno',u:'foglio',q:8,m:3,cost:4.50,sale:12.00,sup:'Atomm.com',url:'https://www.atomm.com',w:300,h:300,z:3,note:'Incisione fine, colore rosso-brunastro, aspetto premium'},
      {n:'Mogano 4mm 40x40cm',c:'Legno',u:'foglio',q:6,m:2,cost:7.50,sale:19.00,sup:'Atomm.com',url:'https://www.atomm.com',w:400,h:400,z:4,note:'Ottimo per targhe e oggettistica di lusso'},
      {n:'Mogano 6mm 60x30cm',c:'Legno',u:'foglio',q:4,m:2,cost:12.00,sale:30.00,sup:'Lasertale EU',url:'https://www.lasertale.com',w:600,h:300,z:6,note:'Strutture e decorazioni spesse'},
      {n:'Noce 3mm 30x30cm',c:'Legno',u:'foglio',q:6,m:2,cost:5.50,sale:14.00,sup:'Atomm.com',url:'https://www.atomm.com',w:300,h:300,z:3,note:'Venatura scura elegante, portachiavi premium'},
      {n:'Noce 3mm 40x40cm',c:'Legno',u:'foglio',q:5,m:2,cost:9.00,sale:22.00,sup:'Atomm.com',url:'https://www.atomm.com',w:400,h:400,z:3,note:''},
      {n:'Ciliegio 3mm 30x30cm',c:'Legno',u:'foglio',q:8,m:3,cost:4.80,sale:13.00,sup:'Atomm.com',url:'https://www.atomm.com',w:300,h:300,z:3,note:'Colore rosato caldo, alta qualità'},
      {n:'Acero 3mm 30x30cm',c:'Legno',u:'foglio',q:8,m:3,cost:4.20,sale:11.00,sup:'Lasertale EU',url:'https://www.lasertale.com',w:300,h:300,z:3,note:'Legno chiaro, ottimo contrasto incisione'},
      {n:'Faggio 3mm 30x30cm',c:'Legno',u:'foglio',q:10,m:4,cost:3.00,sale:8.50,sup:'BricoItalia',url:'',w:300,h:300,z:3,note:''},
      {n:'Bambù 3mm 30x30cm',c:'Legno',u:'foglio',q:15,m:6,cost:2.80,sale:8.00,sup:'Atomm.com',url:'https://www.atomm.com',w:300,h:300,z:3,note:'Eco-sostenibile, portachiavi molto richiesti'},
      {n:'Bambù 4mm 60x30cm',c:'Legno',u:'foglio',q:10,m:4,cost:5.50,sale:14.00,sup:'Atomm.com',url:'https://www.atomm.com',w:600,h:300,z:4,note:''},
      // ── MDF LAMINATI ──
      {n:'MDF Laminato Bianco 3mm 30x30cm',c:'MDF',u:'foglio',q:15,m:6,cost:2.50,sale:7.00,sup:'Leroy Merlin',url:'',w:300,h:300,z:3,note:'Superficie bianca liscia, ottima per sublimazione + laser'},
      {n:'MDF Laminato Bianco 3mm 60x40cm',c:'MDF',u:'foglio',q:10,m:4,cost:5.00,sale:13.00,sup:'Leroy Merlin',url:'',w:600,h:400,z:3,note:''},
      {n:'MDF Laminato Bianco 4mm 30x30cm',c:'MDF',u:'foglio',q:12,m:5,cost:3.20,sale:9.00,sup:'Leroy Merlin',url:'',w:300,h:300,z:4,note:'Più resistente, ottimo per targhe'},
      {n:'MDF Laminato Bianco 4mm 60x40cm',c:'MDF',u:'foglio',q:8,m:3,cost:6.50,sale:16.00,sup:'Leroy Merlin',url:'',w:600,h:400,z:4,note:''},
      {n:'MDF Laminato Nero 3mm 30x30cm',c:'MDF',u:'foglio',q:10,m:4,cost:2.80,sale:8.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Laser rivela il legno naturale sotto'},
      {n:'MDF Laminato Nero 4mm 60x40cm',c:'MDF',u:'foglio',q:8,m:3,cost:6.00,sale:15.00,sup:'Artistico.it',url:'https://www.artistico.it',w:600,h:400,z:4,note:'Contrasto estremo incisione'},
      {n:'MDF Finitura Rovere 3mm 30x30cm',c:'MDF',u:'foglio',q:10,m:4,cost:3.50,sale:9.50,sup:'Brico',url:'',w:300,h:300,z:3,note:'Effetto legno naturale, economico'},
      {n:'MDF Finitura Rovere 4mm 60x40cm',c:'MDF',u:'foglio',q:8,m:3,cost:7.00,sale:18.00,sup:'Brico',url:'',w:600,h:400,z:4,note:''},
      // ── PLEXIGLASS SPECCHIATO / COLORATO ──
      {n:'Plexiglass Specchiato Oro 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:5,m:2,cost:8.50,sale:22.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Effetto oro brillante, portachiavi premium'},
      {n:'Plexiglass Specchiato Argento 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:5,m:2,cost:7.50,sale:20.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:''},
      {n:'Plexiglass Specchiato Rosa 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:5,m:2,cost:8.00,sale:21.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:''},
      {n:'Plexiglass Fluorescente Verde 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:6,m:2,cost:6.50,sale:17.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Brillante sotto UV/luce'},
      {n:'Plexiglass Fluorescente Arancio 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:6,m:2,cost:6.50,sale:17.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:''},
      {n:'Plexiglass Opalino 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:8,m:3,cost:4.50,sale:12.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Semi-opaco, per lightbox e retroilluminazione'},
      {n:'Plexiglass Nero Opaco 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:6,m:2,cost:5.50,sale:14.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Incisione bianca su nero, ottimo contrasto'},
      {n:'Plexiglass Colorato Rosso 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:5,m:2,cost:5.00,sale:13.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:''},
      {n:'Plexiglass Colorato Blu 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:5,m:2,cost:5.00,sale:13.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:''},
      // ── MATERIALI SPECIALI ──
      {n:'Acciaio Inox Verniciato Nero 0.5mm 20x30cm',c:'Metallo',u:'foglio',q:5,m:2,cost:6.00,sale:18.00,sup:'AliExpress B2B',url:'',w:200,h:300,z:1,note:'Laser fibra o CO2+spray. Richiede prova'},
      {n:'Feltro 2mm 30x30cm',c:'Feltro & Tessuto',u:'foglio',q:20,m:8,cost:1.20,sale:4.00,sup:'BricoItalia',url:'',w:300,h:300,z:2,note:'Per sottobicchieri, decorazioni, portachiavi morbidi'},
      {n:'Sughero 3mm 30x30cm',c:'Sughero',u:'foglio',q:15,m:6,cost:2.00,sale:6.00,sup:'AliExpress',url:'',w:300,h:300,z:3,note:'Portachiavi ecologici, coasters'},
      {n:'Sughero 5mm 60x40cm',c:'Sughero',u:'foglio',q:8,m:3,cost:5.50,sale:14.00,sup:'AliExpress',url:'',w:600,h:400,z:5,note:''},
      {n:'Pelle Vegana 1mm 30x30cm',c:'Pelle',u:'foglio',q:10,m:4,cost:4.50,sale:12.00,sup:'Cuoio.it',url:'',w:300,h:300,z:1,note:'Incisione ottima, braccialetti e portafogli'},
      {n:'Pelle Naturale 2mm 30x30cm',c:'Pelle',u:'foglio',q:8,m:3,cost:8.00,sale:22.00,sup:'Cuoio.it',url:'',w:300,h:300,z:2,note:'Premium, cambio colore bellissimo con laser'},
      {n:'Portachiavi Tondo Legno Faggio 40mm',c:'Gadget',u:'pz',q:50,m:20,cost:0.55,sale:4.50,sup:'gadget365.it',url:'https://www.gadget365.it/portachiavi-incisione-laser',w:40,h:40,z:8,note:'Faggio anello ferro. Min 50pz gadget365. Incisione laser.'},
      {n:'Portachiavi Rettangolare Legno 50x30mm',c:'Gadget',u:'pz',q:50,m:20,cost:0.65,sale:5.00,sup:'gadget365.it',url:'https://www.gadget365.it',w:50,h:30,z:9,note:'Faggio 50x30x9mm. Incisione laser. Min 50pz.'},
      {n:'Portachiavi Legno Economico €0.30',c:'Gadget',u:'pz',q:100,m:40,cost:0.30,sale:2.50,sup:'GiftCampaign.it',url:'https://www.giftcampaign.it',note:'Min 50pz. Consegna 7gg gratis. Il piu economico.'},
      {n:'Portachiavi Sughero Ovale FSC',c:'Gadget',u:'pz',q:50,m:20,cost:0.75,sale:5.50,sup:'gadget365.it',url:'https://www.gadget365.it',note:'Sughero naturale FSC, galleggiante. Incisione laser.'},
      {n:'Portachiavi Metallo Satinato laser',c:'Gadget',u:'pz',q:50,m:20,cost:1.20,sale:7.00,sup:'gadget365.it',url:'https://www.gadget365.it/portachiavi-incisione-laser',note:'Metallo satinato. Incisione laser permanente.'},
      {n:'Portachiavi Alluminio con Astuccio',c:'Gadget',u:'pz',q:25,m:10,cost:1.80,sale:9.00,sup:'gadget365.it',url:'https://www.gadget365.it',note:'Con confezione regalo. Incisione logo/nome.'},
      {n:'Sottobicchiere Legno Tondo 90mm',c:'Gadget',u:'pz',q:20,m:8,cost:0.80,sale:4.00,sup:'BSI Gadget',url:'https://www.bsigadget.com',note:'Legno 90mm diametro. Set 4 pz 12-15 euro.'},
      {n:'Tagliere Acacia 25x15cm laser',c:'Gadget',u:'pz',q:10,m:4,cost:4.50,sale:18.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Legno acacia premium. Incisione nome/logo.'},
      {n:'Tagliere Bambu 30x20cm laser',c:'Gadget',u:'pz',q:10,m:4,cost:3.80,sale:15.00,sup:'gadget365.it',url:'https://www.gadget365.it',note:'Bambu FSC 30x20cm. Personalizzazione laser.'},
      {n:'Magnete Frigo Plexiglass 60x40mm',c:'Gadget',u:'pz',q:20,m:8,cost:0.80,sale:4.50,sup:'Artistico.it',url:'https://www.artistico.it',note:'Plexiglass + calamita. Laser o stampa.'},
      {n:'Cornice Foto MDF 13x18cm sublimazione',c:'Gadget',u:'pz',q:10,m:4,cost:2.50,sale:10.00,sup:'Gadgetdiscount.it',url:'https://www.gadgetdiscount.it',note:'MDF bianco sublimazione 13x18. Include supporto.'},
      {n:'Cornice Foto MDF 10x15cm sublimazione',c:'Gadget',u:'pz',q:15,m:6,cost:1.80,sale:8.00,sup:'Gadgetdiscount.it',url:'https://www.gadgetdiscount.it',note:'MDF bianco sublimazione 10x15. Standard.'},
      {n:'Night Light Acrilico LED 8x12cm',c:'Gadget',u:'pz',q:5,m:2,cost:3.50,sale:14.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Base LED RGB + lastra acrilico. Incisione 3D.'},
      {n:'Segnalibro Legno Betulla 5x15cm',c:'Gadget',u:'pz',q:30,m:12,cost:0.60,sale:3.50,sup:'Atomm.com',url:'https://www.atomm.com',note:'Betulla 3mm. Incisione nomi/citazioni.'},
      {n:'Orologio Tondo Legno 30cm',c:'Gadget',u:'pz',q:5,m:2,cost:5.50,sale:22.00,sup:'AliExpress',url:'',note:'Meccanismo + disco legno 30cm. Laser full custom.'},
      {n:'Tazza Ceramica 350ml Sub AAA',c:'Gadget',u:'pz',q:36,m:12,cost:1.47,sale:7.00,sup:'sublimet.com',url:'https://www.sublimet.com/it/tazze-sublimazione',note:'Qualita AAA. Lavastoviglie. Min 36pz. Bestseller sublimazione.'},
      {n:'Tazza Ceramica 350ml Sub Qualita B',c:'Gadget',u:'pz',q:36,m:12,cost:0.85,sale:5.00,sup:'sublimet.com',url:'https://www.sublimet.com/it/tazze-sublimazione',note:'Qualita B economica. Grandi tirature. Min 36pz.'},
      {n:'Tazza Magica Nera 350ml Sub',c:'Gadget',u:'pz',q:12,m:4,cost:2.20,sale:9.00,sup:'sublimet.com',url:'https://www.sublimet.com',note:'Rivela immagine con caldo. Effetto sorpresa. Molto richiesta.'},
      {n:'Tazza Con Foto 11oz Ceramica',c:'Gadget',u:'pz',q:6,m:2,cost:1.39,sale:7.00,sup:'HiGift.it',url:'https://www.higift.it',note:'Standard tazza foto. Classico bestseller sublimazione.'},
      {n:'Cuscino Bianco 40x40cm Sub',c:'Gadget',u:'pz',q:10,m:4,cost:2.80,sale:12.00,sup:'Gadgetdiscount.it',url:'https://www.gadgetdiscount.it',note:'Cover + imbottitura. Sublimazione full-color.'},
      {n:'Mousepad 20x24cm Sub',c:'Gadget',u:'pz',q:20,m:8,cost:1.20,sale:6.00,sup:'MyBay.it',url:'https://www.mybay.it',note:'Superficie sublimazione. Bordi cuciti.'},
      {n:'Borraccia Inox 500ml Sub',c:'Gadget',u:'pz',q:10,m:4,cost:3.50,sale:14.00,sup:'Gadgetdiscount.it',url:'https://www.gadgetdiscount.it',note:'Acciaio inox 500ml, rivestimento sub bianco.'},
      {n:'Puzzle 20x30cm 120pz Sub',c:'Gadget',u:'pz',q:10,m:4,cost:2.50,sale:10.00,sup:'MyBay.it',url:'https://www.mybay.it',note:'MDF bianco sublimazione 120pz. Personalizzazione foto.'},
      {n:'Pannello MDF 20x30cm Sub',c:'Gadget',u:'pz',q:10,m:4,cost:1.80,sale:8.00,sup:'Gadgetdiscount.it',url:'https://www.gadgetdiscount.it',note:'MDF bianco laccato sublimazione. Quadro/targa.'},
      {n:'Mattonella Ceramica 15x15cm Sub',c:'Gadget',u:'pz',q:10,m:4,cost:1.50,sale:7.00,sup:'Gadgetdiscount.it',url:'https://www.gadgetdiscount.it',note:'Piastrella ceramica sublimazione. Include cornicette.'},
      {n:'Shopper Cotone Naturale 38x42cm',c:'Gadget',u:'pz',q:50,m:20,cost:0.90,sale:4.50,sup:'HiGift.it',url:'https://www.higift.it',note:'Cotone 100g/m2. DTF o sublimazione. Molto richiesta.'},
      {n:'Striscia LED COB 24V 5m 480led/m',c:'LED & Illuminazione',u:'rotolo',q:3,m:1,cost:18.00,sale:45.00,sup:'RS Components',url:'https://it.rs-online.com',note:'COB alta densita. Uniforme. Ottima per lightbox laser.'},
      {n:'Striscia LED RGB 12V 5m IP20',c:'LED & Illuminazione',u:'rotolo',q:5,m:2,cost:8.50,sale:25.00,sup:'RS Components',url:'https://it.rs-online.com',note:'RGB SMD5050. Neon sign personalizzati.'},
      {n:'Driver LED 12V 30W',c:'LED & Illuminazione',u:'pz',q:5,m:2,cost:6.50,sale:18.00,sup:'RS Components',url:'https://it.rs-online.com',note:'Alimentatore LED stabilizzato.'},
      {n:'LED RGB WS2812B 5V 144led/m',c:'LED & Illuminazione',u:'rotolo',q:2,m:1,cost:22.00,sale:55.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Indirizzabile ESP32/Arduino. Neon sign animati.'},
      {n:'Trasformatore LED 12V 60W',c:'LED & Illuminazione',u:'pz',q:3,m:1,cost:12.00,sale:30.00,sup:'RS Components',url:'https://it.rs-online.com',note:'Per insegne luminose laser professionali.'},
      {n:'Magnete Neodimio Tondo 10mm N52',c:'Magneti & Ganci',u:'pz',q:200,m:80,cost:0.08,sale:0.50,sup:'Supermagnete.it',url:'https://www.supermagnete.it',note:'N52 ultra forte. Portachiavi, magneti frigo, chiusure.'},
      {n:'Magnete Neodimio Tondo 20mm N52',c:'Magneti & Ganci',u:'pz',q:100,m:40,cost:0.25,sale:1.20,sup:'Supermagnete.it',url:'https://www.supermagnete.it',note:'Diametro 20mm. Molto forte.'},
      {n:'Magnete Neodimio Quadrato 20x20mm',c:'Magneti & Ganci',u:'pz',q:50,m:20,cost:0.30,sale:1.50,sup:'Supermagnete.it',url:'https://www.supermagnete.it',note:'Quadrato. Inserimento in cornici/portachiavi MDF.'},
      {n:'Nastro Magnetico Autoadesivo 2cm 1m',c:'Magneti & Ganci',u:'rotolo',q:10,m:4,cost:2.50,sale:8.00,sup:'Supermagnete.it',url:'https://www.supermagnete.it',note:'Per targhe e decorazioni da parete.'},
      {n:'Occhietto Argento 10mm 100pz',c:'Magneti & Ganci',u:'busta',q:8,m:3,cost:1.80,sale:5.00,sup:'BricoItalia',url:'',note:'Per portachiavi, segnalibri, ciondoli laser.'},
      {n:'Moschettone Anello Rotondo 25mm 100pz',c:'Magneti & Ganci',u:'busta',q:5,m:2,cost:3.50,sale:9.00,sup:'BricoItalia',url:'',note:'Per portachiavi, cordonature, gadget appesi.'},
      {n:'Catena Portachiavi Argento 5cm 100pz',c:'Magneti & Ganci',u:'busta',q:5,m:2,cost:4.00,sale:10.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Anello split + catena 5cm. Completamento portachiavi.'},
      {n:'Resina Epossidica Bicomponente 1kg',c:'Resine & Colori',u:'kit',q:3,m:1,cost:18.00,sale:45.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Crystal clear. Inglobatura, finitura premium portachiavi.'},
      {n:'Pigmento Polvere Madreperla 10g',c:'Resine & Colori',u:'flacone',q:5,m:2,cost:2.50,sale:7.00,sup:'AliExpress',url:'',note:'Effetto madreperla per resina. Oro, argento, rosa, blu.'},
      {n:'Vernice Spray Nero Opaco 400ml',c:'Resine & Colori',u:'bomboletta',q:6,m:2,cost:3.50,sale:9.00,sup:'Leroy Merlin',url:'',note:'Finitura MDF e legno. Targhe e cornici.'},
      {n:'Vernice Spray Trasparente Lucido 400ml',c:'Resine & Colori',u:'bomboletta',q:6,m:2,cost:3.80,sale:9.50,sup:'Leroy Merlin',url:'',note:'Protezione finale materiali laser.'},
      {n:'Chalk Spray Bianco 400ml',c:'Resine & Colori',u:'bomboletta',q:5,m:2,cost:5.50,sale:13.00,sup:'Leroy Merlin',url:'',note:'Chalk paint effetto vintage su MDF laser.'},
      {n:'Sacchetto Kraft 10x15cm con manico',c:'Packaging',u:'pz',q:200,m:80,cost:0.12,sale:0.60,sup:'Scatolificio',url:'',note:'Carta kraft. Per gadget laser retail ed Etsy.'},
      {n:'Scatola Regalo 12x12x5cm Kraft',c:'Packaging',u:'pz',q:50,m:20,cost:0.45,sale:1.80,sup:'Scatolificio',url:'',note:'Scatola piatta. Portachiavi, magneti, bijoux laser.'},
      {n:'Busta Trasparente Acetato 8x12cm',c:'Packaging',u:'pz',q:200,m:80,cost:0.08,sale:0.40,sup:'AliExpress',url:'',note:'Per portachiavi e gadget piatti. Packaging Etsy.'},
      {n:'Nastro Raso Oro 1cm 25m',c:'Packaging',u:'rotolo',q:5,m:2,cost:2.50,sale:7.00,sup:'BricoItalia',url:'',note:'Nastro decorativo confezioni regalo premium Etsy.'},
      {n:'Tag Cartoncino Kraft 5x8cm 100pz',c:'Packaging',u:'busta',q:5,m:2,cost:3.50,sale:8.00,sup:'Scatolificio',url:'',note:'Cartellino con foro. Branding e prezzi gadget.'},
      {n:'Scatola Portachiavi Singola',c:'Packaging',u:'pz',q:100,m:40,cost:0.35,sale:1.20,sup:'gadget365.it',url:'https://www.gadget365.it',note:'Astuccio cartone singolo portachiavi premium.'},
      {n:'Carta Transfer DTF A4 100fg',c:'Consumabili',u:'conf',q:3,m:1,cost:15.00,sale:35.00,sup:'Gadgetdiscount.it',url:'https://www.gadgetdiscount.it',note:'Trasferimento DTF A4. Per pressa su tessuti.'},
      {n:'Polvere Hot Melt DTF 500g',c:'Consumabili',u:'conf',q:2,m:1,cost:12.00,sale:30.00,sup:'Gadgetdiscount.it',url:'https://www.gadgetdiscount.it',note:'Colla a caldo DTF. Fissaggio su tessuti.'},
      {n:'Carta Sublimazione A4 100fg',c:'Consumabili',u:'conf',q:5,m:2,cost:8.00,sale:20.00,sup:'ColorTarget.it',url:'https://colortarget.it',note:'Carta sublimatica A4 100g. Epson/Sawgrass.'},
      {n:'Carta Sublimazione A3 100fg',c:'Consumabili',u:'conf',q:3,m:1,cost:14.00,sale:32.00,sup:'ColorTarget.it',url:'https://colortarget.it',note:'Carta sublimatica A3.'},
      {n:'Nastro Termoresistente 3cm 50m',c:'Consumabili',u:'rotolo',q:5,m:2,cost:4.50,sale:12.00,sup:'ColorTarget.it',url:'https://colortarget.it',note:'Resistente calore sublimazione.'},
      {n:'Foglio Teflon 40x50cm',c:'Consumabili',u:'pz',q:5,m:2,cost:3.50,sale:9.00,sup:'ColorTarget.it',url:'https://colortarget.it',note:'Protezione pressa. Riutilizzabile.'},
      {n:'Occhiali Protezione Laser Diodo OD5+',c:'Accessori',u:'pz',q:2,m:1,cost:15.00,sale:35.00,sup:'xTool Store',url:'https://www.xtool.com',note:'OD5+ 450nm. Obbligatori sicurezza laser diodo.'},
      {n:'Honeycomb Piattaforma 40x40cm',c:'Accessori',u:'pz',q:1,m:0,cost:28.00,sale:65.00,sup:'xTool Store',url:'https://www.xtool.com',note:'Piano alveolare taglio laser. Elimina bordi bruciati.'},
      {n:'Rotary Attachment per Laser',c:'Accessori',u:'pz',q:1,m:0,cost:65.00,sale:150.00,sup:'xTool Store',url:'https://www.xtool.com',note:'Per tazze, bottiglie, bracciali cilindrici.'},
      {n:'Aspiratore Fumo Filtro HEPA',c:'Accessori',u:'pz',q:1,m:0,cost:85.00,sale:200.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Filtro fumi laser. Indispensabile in ambienti chiusi.'},
      {n:'Ardesia Naturale 10x10cm',c:'Naturale',u:'pz',q:20,m:8,cost:1.20,sale:5.50,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Incisione laser. Effetto rustico premium. Etsy bestseller.'},
      {n:'Ardesia 20x10cm per targhe',c:'Naturale',u:'pz',q:10,m:4,cost:2.50,sale:9.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Formato targa porta. Incisione laser su pietra.'},
      {n:'Mattonella Marmo Bianco 10x10cm',c:'Naturale',u:'pz',q:15,m:6,cost:2.80,sale:10.00,sup:'EmbroideryService.it',url:'https://www.embroideryservice.it',note:'Marmo sublimazione. Posacenere, sottobicchiere.'},
      // ── MOGANO (vari spessori) ──────────────────────────────────────
      {n:'Mogano 3mm 30x30cm',c:'Legno',u:'foglio',q:8,m:3,cost:4.50,sale:12.00,sup:'Atomm.com',url:'https://www.atomm.com',w:300,h:300,z:3,note:'Incisione fine, colore rosso-brunastro. Porto + Taglio laser. Etsy: €8-14/pz.'},
      {n:'Mogano 3mm 60x40cm',c:'Legno',u:'foglio',q:5,m:2,cost:8.50,sale:22.00,sup:'Atomm.com',url:'https://www.atomm.com',w:600,h:400,z:3,note:'Formato grande. Taglieri, cornici, targhe premium.'},
      {n:'Mogano 4mm 30x30cm',c:'Legno',u:'foglio',q:6,m:2,cost:6.00,sale:16.00,sup:'Atomm.com',url:'https://www.atomm.com',w:300,h:300,z:4,note:'Spessore robusto per targhe e oggettistica. Colore scuro elegante.'},
      {n:'Mogano 4mm 60x40cm',c:'Legno',u:'foglio',q:4,m:2,cost:11.00,sale:28.00,sup:'Lasertale EU',url:'https://www.lasertale.com',w:600,h:400,z:4,note:'Grandi superfici tagliere/display. Ottima incisione CO2.'},
      {n:'Mogano 6mm 30x30cm',c:'Legno',u:'foglio',q:5,m:2,cost:8.00,sale:20.00,sup:'Atomm.com',url:'https://www.atomm.com',w:300,h:300,z:6,note:'Strutture e oggetti tridimensionali. Taglio e incisione CO2.'},
      {n:'Mogano 6mm 60x40cm',c:'Legno',u:'foglio',q:3,m:1,cost:15.00,sale:38.00,sup:'Lasertale EU',url:'https://www.lasertale.com',w:600,h:400,z:6,note:'Decorazioni da parete, pannelli, insegne laser.'},
      // ── OKUMÉ (vari spessori) ───────────────────────────────────────
      {n:'Okume 3mm 30x30cm',c:'Legno',u:'foglio',q:10,m:4,cost:2.80,sale:8.00,sup:'Atomm.com',url:'https://www.atomm.com',w:300,h:300,z:3,note:'Okume chiaro. Incisione nitida, taglio facile. Economico e versatile.'},
      {n:'Okume 3mm 60x40cm',c:'Legno',u:'foglio',q:8,m:3,cost:5.50,sale:14.00,sup:'Atomm.com',url:'https://www.atomm.com',w:600,h:400,z:3,note:'Formato grande. Pannelli decorativi, decorazioni laser.'},
      {n:'Okume 4mm 30x30cm',c:'Legno',u:'foglio',q:8,m:3,cost:3.80,sale:10.00,sup:'Atomm.com',url:'https://www.atomm.com',w:300,h:300,z:4,note:'Resistente. Ottimo per portachiavi robusti e targhe.'},
      {n:'Okume 4mm 60x40cm',c:'Legno',u:'foglio',q:6,m:2,cost:7.50,sale:19.00,sup:'Lasertale EU',url:'https://www.lasertale.com',w:600,h:400,z:4,note:'Pannelli, scatole laser, portafoto.'},
      {n:'Okume 6mm 30x30cm',c:'Legno',u:'foglio',q:6,m:2,cost:5.50,sale:14.00,sup:'Atomm.com',url:'https://www.atomm.com',w:300,h:300,z:6,note:'Strutture rigide. Scatole assemblate laser.'},
      {n:'Okume 6mm 60x40cm',c:'Legno',u:'foglio',q:4,m:2,cost:10.50,sale:26.00,sup:'Lasertale EU',url:'https://www.lasertale.com',w:600,h:400,z:6,note:'Grandi costruzioni. Pannelli decorativi.'},
      // ── COMPENSATO BETULLA (standard laser) ────────────────────────
      {n:'Betulla 3mm 30x30cm',c:'Legno',u:'foglio',q:15,m:6,cost:2.50,sale:7.00,sup:'Atomm.com',url:'https://www.atomm.com',w:300,h:300,z:3,note:'Standard laser. Migliore qualita incisione. Bestseller.'},
      {n:'Betulla 3mm 40x40cm',c:'Legno',u:'foglio',q:12,m:5,cost:4.20,sale:11.00,sup:'Atomm.com',url:'https://www.atomm.com',w:400,h:400,z:3,note:'Formato medio. Cornici, scatoline, portachiavi grandi.'},
      {n:'Betulla 3mm 60x40cm',c:'Legno',u:'foglio',q:10,m:4,cost:6.00,sale:15.00,sup:'Atomm.com',url:'https://www.atomm.com',w:600,h:400,z:3,note:'Grande formato. Pannelli complessi, puzzle.'},
      {n:'Betulla 4mm 30x30cm',c:'Legno',u:'foglio',q:12,m:5,cost:3.20,sale:9.00,sup:'Atomm.com',url:'https://www.atomm.com',w:300,h:300,z:4,note:'Piu robusto del 3mm. Targhe e scatole.'},
      {n:'Betulla 4mm 60x40cm',c:'Legno',u:'foglio',q:8,m:3,cost:8.00,sale:20.00,sup:'Lasertale EU',url:'https://www.lasertale.com',w:600,h:400,z:4,note:'Grandi superfici. Decorazioni murali.'},
      {n:'Betulla 6mm 30x30cm',c:'Legno',u:'foglio',q:8,m:3,cost:5.00,sale:13.00,sup:'Atomm.com',url:'https://www.atomm.com',w:300,h:300,z:6,note:'Strutture e costruzioni assemblate laser.'},
      // ── MDF LAMINATO BIANCO (vari spessori) ────────────────────────
      {n:'MDF Laminato Bianco 3mm 30x30cm',c:'MDF',u:'foglio',q:15,m:6,cost:2.50,sale:7.00,sup:'Leroy Merlin',url:'https://www.leroymerlin.it',w:300,h:300,z:3,note:'Bianco lucido. Sublimazione + laser. Cornici, targhe, scatole.'},
      {n:'MDF Laminato Bianco 3mm 60x40cm',c:'MDF',u:'foglio',q:10,m:4,cost:5.00,sale:13.00,sup:'Leroy Merlin',url:'https://www.leroymerlin.it',w:600,h:400,z:3,note:'Grande formato bianco laminato.'},
      {n:'MDF Laminato Bianco 4mm 30x30cm',c:'MDF',u:'foglio',q:12,m:5,cost:3.20,sale:9.00,sup:'Leroy Merlin',url:'https://www.leroymerlin.it',w:300,h:300,z:4,note:'Piu rigido. Targhe premium, pannelli decorativi.'},
      {n:'MDF Laminato Bianco 4mm 60x40cm',c:'MDF',u:'foglio',q:8,m:3,cost:6.50,sale:17.00,sup:'Leroy Merlin',url:'https://www.leroymerlin.it',w:600,h:400,z:4,note:'Pannelli sublimazione grandi.'},
      {n:'MDF Laminato Bianco 6mm 60x40cm',c:'MDF',u:'foglio',q:6,m:2,cost:9.50,sale:24.00,sup:'Brico',url:'',w:600,h:400,z:6,note:'Robusto per tavoli, pannelli grandi, targhe da esterno.'},
      // ── MDF LAMINATO NERO ─────────────────────────────────────────
      {n:'MDF Laminato Nero 3mm 30x30cm',c:'MDF',u:'foglio',q:10,m:4,cost:2.80,sale:8.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Laser rivela il legno chiaro sotto. Contrasto estremo. Molto richiesto.'},
      {n:'MDF Laminato Nero 3mm 60x40cm',c:'MDF',u:'foglio',q:8,m:3,cost:5.80,sale:15.00,sup:'Artistico.it',url:'https://www.artistico.it',w:600,h:400,z:3,note:'Grande formato nero laminato. Insegne, pannelli.'},
      {n:'MDF Laminato Nero 4mm 30x30cm',c:'MDF',u:'foglio',q:8,m:3,cost:3.60,sale:10.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:4,note:'Robusto nero. Targhe porta, decorazioni wall.'},
      {n:'MDF Laminato Nero 4mm 60x40cm',c:'MDF',u:'foglio',q:6,m:2,cost:7.50,sale:19.00,sup:'Artistico.it',url:'https://www.artistico.it',w:600,h:400,z:4,note:'Pannelli decorativi neri grandi formato.'},
      // ── MDF FINITURA LEGNO (rovere, noce, ciliegio) ───────────────
      {n:'MDF Finitura Rovere 3mm 30x30cm',c:'MDF',u:'foglio',q:10,m:4,cost:3.50,sale:9.50,sup:'Brico',url:'',w:300,h:300,z:3,note:'Effetto legno rovere naturale. Economico rispetto al legno vero.'},
      {n:'MDF Finitura Noce 3mm 30x30cm',c:'MDF',u:'foglio',q:10,m:4,cost:3.80,sale:10.00,sup:'Brico',url:'',w:300,h:300,z:3,note:'Effetto legno noce scuro. Elegante per gadget premium.'},
      {n:'MDF Finitura Ciliegio 3mm 60x40cm',c:'MDF',u:'foglio',q:6,m:2,cost:7.00,sale:18.00,sup:'Brico',url:'',w:600,h:400,z:3,note:'Effetto ciliegio rossastro. Pannelli e cornici.'},
      // ── MDF GREZZO (vari spessori) ─────────────────────────────────
      {n:'MDF Grezzo 3mm 30x30cm',c:'MDF',u:'foglio',q:20,m:8,cost:1.80,sale:5.00,sup:'Leroy Merlin',url:'https://www.leroymerlin.it',w:300,h:300,z:3,note:'MDF grezzo naturale. Sublimazione con coating. Economico.'},
      {n:'MDF Grezzo 3mm 60x40cm',c:'MDF',u:'foglio',q:15,m:6,cost:3.50,sale:9.50,sup:'Leroy Merlin',url:'https://www.leroymerlin.it',w:600,h:400,z:3,note:'Formato grande grezzo. Primer + laser o sublimazione.'},
      {n:'MDF Grezzo 4mm 30x30cm',c:'MDF',u:'foglio',q:15,m:6,cost:2.20,sale:6.50,sup:'Leroy Merlin',url:'https://www.leroymerlin.it',w:300,h:300,z:4,note:'4mm grezzo. Targhe, pannelli, scatoline.'},
      {n:'MDF Grezzo 6mm 60x40cm',c:'MDF',u:'foglio',q:8,m:3,cost:6.50,sale:17.00,sup:'Leroy Merlin',url:'https://www.leroymerlin.it',w:600,h:400,z:6,note:'Robusto. Scatole assemblate, pannelli, mobili laser.'},
      // ── ACRILICO / PLEXIGLASS COLORATO ────────────────────────────
      {n:'Plexiglass Trasparente 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:8,m:3,cost:3.50,sale:9.50,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Trasparente cristallo. Night light, cornici, portachiavi.'},
      {n:'Plexiglass Bianco Opaco 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:8,m:3,cost:3.20,sale:9.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Bianco opaco. Incisione + retroilluminazione LED.'},
      {n:'Plexiglass Rosa 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:6,m:2,cost:4.50,sale:12.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Rosa pastello. Portachiavi femminili, decorazioni.'},
      {n:'Plexiglass Azzurro 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:6,m:2,cost:4.50,sale:12.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Azzurro ghiaccio. Decorazioni mare e cielo.'},
      {n:'Plexiglass Verde 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:6,m:2,cost:4.50,sale:12.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Verde smeraldo. Decorazioni e portachiavi.'},
      {n:'Plexiglass Giallo 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:6,m:2,cost:4.50,sale:12.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Giallo sole. Gadget estate, decorazioni.'},
      {n:'Plexiglass Nero Opaco 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:6,m:2,cost:5.50,sale:14.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Nero opaco. Incisione bianca visibile. Effetto premium.'},
      {n:'Plexiglass Specchiato Oro 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:5,m:2,cost:8.50,sale:22.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Oro metallico specchiato. Portachiavi lusso. Molto richiesto.'},
      {n:'Plexiglass Specchiato Argento 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:5,m:2,cost:7.50,sale:20.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Argento metallico specchiato. Portachiavi eleganti.'},
      {n:'Plexiglass Specchiato Rosa Gold 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:5,m:2,cost:8.00,sale:21.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Rose gold specchiato. Bestseller Etsy femminile.'},
      {n:'Plexiglass Fluorescente Verde 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:6,m:2,cost:6.50,sale:17.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Brillante sotto UV. Gadget dance/rave. Incisione netta.'},
      {n:'Plexiglass Opalino 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:8,m:3,cost:4.50,sale:12.00,sup:'Artistico.it',url:'https://www.artistico.it',w:300,h:300,z:3,note:'Semi-opaco. Retroilluminazione LED diffusa. Lightbox.'},
      // ── GADGET LASERABILI AVANZATI ─────────────────────────────────
      {n:'Orologio Legno da Parete 40cm',c:'Gadget',u:'pz',q:3,m:1,cost:8.00,sale:28.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Disco legno + meccanismo quarzo silenzioso. Laser full-custom. Etsy: 25-45 euro.'},
      {n:'Tabella Ouija Legno 30x25cm',c:'Gadget',u:'pz',q:5,m:2,cost:5.50,sale:20.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Betulla laser incisa. Halloween bestseller Etsy. Vendita ottobre.'},
      {n:'Scacchiera legno laser 30x30cm',c:'Gadget',u:'pz',q:5,m:2,cost:6.50,sale:22.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Con caselle incise, optionals: pezzi inclusi. Etsy: 20-35 euro.'},
      {n:'Cartello Personalizzato 20x15cm MDF',c:'Gadget',u:'pz',q:10,m:4,cost:2.50,sale:9.00,sup:'Leroy Merlin',url:'https://www.leroymerlin.it',note:'Cartello porta ufficio/casa. Laser. Bestseller B2B.'},
      {n:'Calendario Avvento Laser 25 cassetti',c:'Gadget',u:'pz',q:3,m:1,cost:18.00,sale:55.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Calendario avvento legno laser. Vendita ottobre-novembre. Etsy: 45-75 euro.'},
      {n:'Portagioie Legno con specchio laser',c:'Gadget',u:'pz',q:4,m:2,cost:9.50,sale:30.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Scatola gioielli laser incisa con specchio. Regalo donna.'},
      {n:'Libro segreto scatola legno laser',c:'Gadget',u:'pz',q:4,m:2,cost:12.00,sale:38.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Scatola a forma di libro. Sorpresa regalo originale.'},
      {n:'Set Coltelli da Cucina in legno',c:'Gadget',u:'pz',q:5,m:2,cost:7.00,sale:22.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Manico in legno laser personalizzato. Incisione nome.'},
      {n:'Sottobicchieri Set 4pz legno laser',c:'Gadget',u:'set',q:15,m:6,cost:3.00,sale:12.00,sup:'BSI Gadget',url:'https://www.bsigadget.com',note:'Set 4 sottobicchieri incisi laser tema/nome. Etsy: 10-18 euro/set.'},
      {n:'Targa Benvenuto legno laser 30x15cm',c:'Gadget',u:'pz',q:8,m:3,cost:4.50,sale:16.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Targa Welcome personalizzata. B2B hotels/airbnb. Etsy.'},
      {n:'Magneti Frigo Set 6pz plexiglass',c:'Gadget',u:'set',q:10,m:4,cost:4.50,sale:14.00,sup:'Artistico.it',url:'https://www.artistico.it',note:'Set 6 calamite plexiglass colori. Personalizzazione nomi. Etsy.'},
      {n:'Cornice Foto Polaroid Legno',c:'Gadget',u:'pz',q:10,m:4,cost:2.20,sale:8.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Cornicina formato polaroid laser. Regalo compleanno. Etsy: 6-12 euro.'},
      {n:'Porta Telefono Legno da Scrivania',c:'Gadget',u:'pz',q:6,m:2,cost:3.80,sale:14.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Supporto telefono legno laser. Personalizzato nome/logo. Etsy.'},
      {n:'Segnalibro Set 4pz Legno Laser',c:'Gadget',u:'set',q:15,m:6,cost:2.50,sale:9.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Set 4 segnalibri tema (gatti, libri, fiori...). Etsy: 7-12/set.'},
      {n:'Medaglia Personalizzata Legno/Plexiglass',c:'Gadget',u:'pz',q:20,m:8,cost:1.80,sale:7.00,sup:'Artistico.it',url:'https://www.artistico.it',note:'Medaglia laser con nome/evento. Premiazioni, gare. Da 1pz.'},
      // ══ PORTACHIAVI BAMBÙ — Tutte le forme ══════════════════════════
      {n:'Portachiavi Bambù Rotondo 40mm',c:'Gadget',u:'pz',q:100,m:40,cost:0.40,sale:3.80,sup:'BSI Gadget',url:'https://www.bsigadget.com/it/portachiavi-in-legno-personalizzati.html',note:'Min 160pz BSI. Rotondo diam 40mm. Incisione laser diodo o CO2. Bomboniere matrimonio/laurea.'},
      {n:'Portachiavi Bambù Rettangolare 55x30mm',c:'Gadget',u:'pz',q:100,m:40,cost:0.45,sale:4.00,sup:'BSI Gadget',url:'https://www.bsigadget.com/it/portachiavi-in-legno-personalizzati.html',note:'Rettangolare 55x30mm bambù FSC. Cordino PET incluso. Incisione laser.'},
      {n:'Portachiavi Bambù Forma Casa 35x40mm',c:'Gadget',u:'pz',q:50,m:20,cost:0.85,sale:5.50,sup:'StampaSi.it',url:'https://www.stampasi.it/portachiavi-personalizzati-legno',note:'Forma casetta. Bambù + anello metallo. Simbolo casa. Incisione laser.'},
      {n:'Portachiavi Bambù Forma Cuore',c:'Gadget',u:'pz',q:50,m:20,cost:0.90,sale:5.50,sup:'gadget365.it',url:'https://www.gadget365.it/portachiavi-incisione-laser',note:'Forma cuore. Molto richiesto per San Valentino e bomboniere. Bambù.'},
      {n:'Portachiavi Bambù Quadrato 40x40mm',c:'Gadget',u:'pz',q:100,m:40,cost:0.55,sale:4.20,sup:'gadget365.it',url:'https://www.gadget365.it',note:'Quadrato 40x40mm bambù. Design moderno. Incisione laser.'},
      {n:'Portachiavi Bambù Ovale 55x35mm',c:'Gadget',u:'pz',q:50,m:20,cost:0.65,sale:4.50,sup:'StampaSi.it',url:'https://www.stampasi.it/portachiavi-personalizzati-legno',note:'Ovale elegante. Incisione laser nomi/logo. Bomboniere.'},
      {n:'Portachiavi Bambù con Acciaio Inox',c:'Gadget',u:'pz',q:50,m:20,cost:1.10,sale:6.50,sup:'HiGift.it',url:'https://www.higift.it',note:'Bambù + placca acciaio inox centrale. Doppia incisione laser+fibra. Premium.'},
      {n:'Portachiavi Bambù Forma Bimbo/Bimba',c:'Gadget',u:'pz',q:50,m:20,cost:1.00,sale:6.00,sup:'prezziingrosso.com',url:'https://prezziingrosso.com/48-portachiavi-in-metallo-personalizzati',note:'Silhouette bimbo o bimba. Battesimo, nascita. Bambù + laser.'},
      {n:'Portachiavi Bambù Forma Fiocco Nascita',c:'Gadget',u:'pz',q:50,m:20,cost:0.95,sale:5.80,sup:'gadget365.it',url:'https://www.gadget365.it',note:'Forma fiocco. Personalizzazione nome+data nascita laser.'},
      {n:'Portachiavi Bambù Apribottiglie',c:'Gadget',u:'pz',q:50,m:20,cost:1.20,sale:6.50,sup:'HiGift.it',url:'https://www.higift.it',note:'Funzionale + laser. Bambù+metallo. Molto richiesto eventi/feste.'},
      // ══ PORTACHIAVI LEGNO FAGGIO — Varie forme ══════════════════════
      {n:'Portachiavi Faggio Rotondo 40mm',c:'Gadget',u:'pz',q:50,m:20,cost:0.55,sale:4.50,sup:'gadget365.it',url:'https://www.gadget365.it/portachiavi-incisione-laser',note:'Faggio classico 40mm. Anello ferro 32mm. Min 50pz gadget365.'},
      {n:'Portachiavi Faggio Rettangolare 50x30mm',c:'Gadget',u:'pz',q:50,m:20,cost:0.65,sale:5.00,sup:'gadget365.it',url:'https://www.gadget365.it/portachiavi-incisione-laser',note:'Rettangolare 50x30x9mm. Incisione laser. Min 50pz.'},
      {n:'Portachiavi Faggio Quadrato 40x40mm',c:'Gadget',u:'pz',q:50,m:20,cost:0.60,sale:4.80,sup:'gadget365.it',url:'https://www.gadget365.it',note:'Quadrato faggio 4x4cm. Incisione entrambi i lati.'},
      {n:'Portachiavi Legno Noce 40x20mm Premium',c:'Gadget',u:'pz',q:20,m:8,cost:1.80,sale:8.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Legno noce premium. Incisione laser CO2/diodo. Alta qualità.'},
      // ══ PORTACHIAVI METALLO INOX — Acciaio ══════════════════════════
      {n:'Portachiavi Acciaio Inox Rotondo 40mm Nero',c:'Gadget',u:'pz',q:50,m:20,cost:1.20,sale:7.00,sup:'HiGift.it',url:'https://www.higift.it/chiavi-e-strumenti/portachiavi-personalizzati/portachiavi-in-metallo-e-alluminio-personalizzati',note:'Finitura gomma nera. Incisione laser a specchio. Elegante.'},
      {n:'Portachiavi Acciaio Inox Rotondo Satinato',c:'Gadget',u:'pz',q:50,m:20,cost:1.10,sale:6.50,sup:'gadget365.it',url:'https://www.gadget365.it/portachiavi-incisione-laser',note:'Satinato. Incisione laser permanente. Standard professionale.'},
      {n:'Portachiavi Acciaio Inox Rettangolare',c:'Gadget',u:'pz',q:50,m:20,cost:1.30,sale:7.00,sup:'gadget365.it',url:'https://www.gadget365.it/portachiavi-incisione-laser',note:'Rettangolare inox. Incisione laser fibra (xTool F2). Logo aziendale.'},
      {n:'Portachiavi Acciaio Inox Forma Casa Laser',c:'Gadget',u:'pz',q:50,m:20,cost:1.50,sale:7.50,sup:'StampaSi.it',url:'https://www.stampasi.it/portachiavi-personalizzati-metallo',note:'Casa metallo. Incisione laser area 20x15mm.'},
      {n:'Portachiavi Acciaio Inox Forma Cuore Laser',c:'Gadget',u:'pz',q:50,m:20,cost:1.40,sale:7.00,sup:'StampaSi.it',url:'https://www.stampasi.it/portachiavi-personalizzati-metallo',note:'Cuore metallo. Colorato cangiante laterale. San Valentino, matrimoni.'},
      {n:'Portachiavi Inox con Astuccio Regalo',c:'Gadget',u:'pz',q:25,m:10,cost:2.50,sale:10.00,sup:'gadget365.it',url:'https://www.gadget365.it',note:'Inox + scatola regalo inclusa. Premium per eventi e aziende.'},
      {n:'Portachiavi Inox Bicolore Incisione Laser',c:'Gadget',u:'pz',q:50,m:20,cost:0.76,sale:5.50,sup:'HiGift.it',url:'https://www.higift.it',note:'Acciaio inox 150pz €0.76/pz (-25% flash). Bicolore, laser.'},
      {n:'Portachiavi Inox Riciclato Gommato',c:'Gadget',u:'pz',q:50,m:20,cost:1.30,sale:6.50,sup:'IotiStampo.it',url:'https://www.iotistampo.it/it/gadget-per-eventi/portachiavi/portachiavi-in-metallo',note:'Acciaio riciclato. Finitura gommata. Incisione laser a specchio.'},
      // ══ PORTACHIAVI ALLUMINIO COLORATO ══════════════════════════════
      {n:'Portachiavi Alluminio Colorato Rotondo',c:'Gadget',u:'pz',q:100,m:40,cost:0.83,sale:5.00,sup:'HiGift.it',url:'https://www.higift.it',note:'Alluminio colori (nero, rosso, blu, verde). Laser a colori con xTool F2 MOPA.'},
      {n:'Portachiavi Alluminio Apribottiglie',c:'Gadget',u:'pz',q:50,m:20,cost:1.10,sale:6.00,sup:'gadget365.it',url:'https://www.gadget365.it/portachiavi-incisione-laser',note:'Funzionale. Alluminio + apribottiglie integrato. Laser.'},
      {n:'Portachiavi Alluminio Forma Casa Laser',c:'Gadget',u:'pz',q:50,m:20,cost:1.20,sale:6.00,sup:'Yesmarket.it',url:'https://www.yesmarket.it/gadget-promozionali/portachiavi-in-metallo',note:'Casa alluminio. Stampasi/Yesmarket. Incisione laser.'},
      {n:'Portachiavi Alluminio Supporto Smartphone',c:'Gadget',u:'pz',q:100,m:40,cost:1.00,sale:5.50,sup:'StampaSi.it',url:'https://www.stampasi.it/portachiavi-personalizzati-metallo',note:'Doppio uso: portachiavi + stand telefono. Alluminio riciclato. Min 100pz.'},
      {n:'Portachiavi Alluminio Bici Mini',c:'Gadget',u:'pz',q:50,m:20,cost:0.95,sale:5.20,sup:'HiGift.it',url:'https://www.higift.it',note:'Forma bicicletta alluminio colorato. Laser. Nicchia ciclismo.'},
      // ══ PORTACHIAVI PLEXIGLASS — Personalizzati ══════════════════════
      {n:'Portachiavi Plexiglass Trasparente Forma Libera',c:'Gadget',u:'pz',q:20,m:8,cost:0.80,sale:4.50,sup:'Artistico.it',url:'https://www.artistico.it',note:'Plexiglass 3mm taglio laser. Forma personalizzata. Ottimo con xTool P2.'},
      {n:'Portachiavi Plexiglass Specchiato Oro 40x40mm',c:'Gadget',u:'pz',q:20,m:8,cost:1.50,sale:7.00,sup:'Artistico.it',url:'https://www.artistico.it',note:'Oro specchiato 3mm. Incisione laser CO2. Premium. Etsy bestseller.'},
      {n:'Portachiavi Plexiglass Specchiato Argento',c:'Gadget',u:'pz',q:20,m:8,cost:1.40,sale:6.50,sup:'Artistico.it',url:'https://www.artistico.it',note:'Argento specchiato 3mm. Incisione laser. Elegante.'},
      {n:'Portachiavi Plexiglass Specchiato Rose Gold',c:'Gadget',u:'pz',q:20,m:8,cost:1.50,sale:7.00,sup:'Artistico.it',url:'https://www.artistico.it',note:'Rose gold specchiato. Etsy bestseller femminile 2025.'},
      {n:'Portachiavi Plexiglass Fluorescente',c:'Gadget',u:'pz',q:20,m:8,cost:1.20,sale:5.50,sup:'Artistico.it',url:'https://www.artistico.it',note:'Fluorescente verde/arancio. Brillante UV. Incisione CO2.'},
      {n:'Portachiavi Plexiglass Colorato Rosa',c:'Gadget',u:'pz',q:20,m:8,cost:0.90,sale:4.80,sup:'Artistico.it',url:'https://www.artistico.it',note:'Rosa pastello 3mm. Incisione CO2. Gadget femminili.'},
      {n:'Portachiavi Plexiglass Forma Cuore 3D',c:'Gadget',u:'pz',q:15,m:6,cost:1.80,sale:7.50,sup:'Artistico.it',url:'https://www.artistico.it',note:'Cuore 3D plexiglass. Taglio sagomato + incisione. San Valentino.'},
      // ══ PORTACHIAVI METALLO FORME SPECIALI ═════════════════════════
      {n:'Portachiavi Metallo Forma Auto',c:'Gadget',u:'pz',q:25,m:10,cost:2.00,sale:9.00,sup:'gadget365.it',url:'https://www.gadget365.it/portachiavi-personalizzati-incisione-laser',note:'Metallo forma auto con confezione regalo. Concessionarie, eventi auto.'},
      {n:'Portachiavi Metallo Ancora Marine',c:'Gadget',u:'pz',q:50,m:20,cost:1.20,sale:6.00,sup:'prezziingrosso.com',url:'https://prezziingrosso.com',note:'Forma ancora nautica. Incisione laser. Nicchia nautica/mare.'},
      {n:'Portachiavi Metallo Forma Fiocco Nascita',c:'Gadget',u:'pz',q:50,m:20,cost:1.40,sale:7.00,sup:'prezziingrosso.com',url:'https://prezziingrosso.com',note:'Silhouette nascita metallo. Personalizzazione nome+peso+data laser.'},
      {n:'Portachiavi Metallo Forma Mela (Maestra)',c:'Gadget',u:'pz',q:50,m:20,cost:1.50,sale:7.50,sup:'prezziingrosso.com',url:'https://prezziingrosso.com',note:'Forma mela metallo. Regalo maestre. Incisione "Grazie Maestra". Maggio-giugno.'},
      {n:'Portachiavi Metallo Pennant Laurea',c:'Gadget',u:'pz',q:50,m:20,cost:1.60,sale:8.00,sup:'prezziingrosso.com',url:'https://prezziingrosso.com',note:'Tocco/pergamena metallo. Laser nome+data laurea. Bestseller giugno-luglio.'},
      {n:'Portachiavi Metallo Forma Gatto',c:'Gadget',u:'pz',q:50,m:20,cost:1.20,sale:6.00,sup:'prezziingrosso.com',url:'https://prezziingrosso.com',note:'Silhouette gatto metallo. Nicchia amanti animali. Incisione nome.'},
      {n:'Portachiavi Metallo Forma Cane',c:'Gadget',u:'pz',q:50,m:20,cost:1.20,sale:6.00,sup:'prezziingrosso.com',url:'https://prezziingrosso.com',note:'Silhouette cane metallo. Personalizzazione razza+nome. Etsy.'},
      {n:'Portachiavi Metallo Forma Zampa',c:'Gadget',u:'pz',q:50,m:20,cost:1.10,sale:5.80,sup:'BlueBag Italia',url:'https://www.bluebagitalia.com',note:'Impronta zampa metallo. Pet lovers. Incisione nome animale.'},
      // ══ PORTACHIAVI PELLE ════════════════════════════════════════════
      {n:'Portachiavi Pelle Naturale Rettangolare',c:'Gadget',u:'pz',q:20,m:8,cost:2.50,sale:10.00,sup:'Cuoio.it',url:'',note:'Pelle naturale 2-3mm. Incisione laser CO2. Cambio colore bellissimo.'},
      {n:'Portachiavi Pelle Vegana Rotondo',c:'Gadget',u:'pz',q:30,m:12,cost:1.50,sale:7.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Eco vegana. Incisione laser. Alternativa economica alla pelle naturale.'},
      {n:'Portachiavi Pelle con Moschettone Canna',c:'Gadget',u:'pz',q:20,m:8,cost:3.00,sale:12.00,sup:'Cuoio.it',url:'',note:'Pelle+moschettone. Incisione laser + timbro a caldo. Artigianale premium.'},
      // ══ PORTACHIAVI SUGHERO ══════════════════════════════════════════
      {n:'Portachiavi Sughero Rotondo 40mm FSC',c:'Gadget',u:'pz',q:50,m:20,cost:0.75,sale:5.00,sup:'gadget365.it',url:'https://www.gadget365.it',note:'Sughero FSC galleggiante. Eco-sostenibile. Incisione laser CO2.'},
      {n:'Portachiavi Sughero Rettangolare 55x30mm',c:'Gadget',u:'pz',q:50,m:20,cost:0.80,sale:5.20,sup:'StampaSi.it',url:'https://www.stampasi.it/portachiavi-personalizzati-legno',note:'Sughero rettangolare. Ottimo contrasto incisione. Eco.'},
      {n:'Portachiavi Metallo + Sughero Rotondo',c:'Gadget',u:'pz',q:50,m:20,cost:0.95,sale:5.50,sup:'StampaSi.it',url:'https://www.stampasi.it',note:'Combinato: corpo sughero + struttura metallo. Incisione laser.'},
      // ══ GADGET SPECIALI LASERABILI ══════════════════════════════════
      {n:'Targhetta Luggage Tag Legno 10x5cm',c:'Gadget',u:'pz',q:20,m:8,cost:1.50,sale:6.50,sup:'Atomm.com',url:'https://www.atomm.com',note:'Targhetta valigia legno. Incisione nome+contatti laser. Regalo viaggio.'},
      {n:'Targhetta Cane/Gatto Metallo Laser',c:'Gadget',u:'pz',q:30,m:12,cost:0.90,sale:5.00,sup:'gadget365.it',url:'https://www.gadget365.it',note:'Medaglietta animali metallo. Nome+telefono laser. Da 1pz. Nicchia pet.'},
      {n:'Penna Metallo con Incisione Laser',c:'Gadget',u:'pz',q:50,m:20,cost:1.80,sale:8.00,sup:'gadget365.it',url:'https://www.gadget365.it',note:'Penna alluminio+incisione laser logo/nome. Regalo aziendale classico.'},
      {n:'Righello Legno 30cm Personalizzato',c:'Gadget',u:'pz',q:30,m:12,cost:1.20,sale:5.50,sup:'Atomm.com',url:'https://www.atomm.com',note:'Righello legno laser. Incisione nome+classe. Regalo maestre. Etsy.'},
      {n:'Porta Matite Cilindro Legno Laser',c:'Gadget',u:'pz',q:15,m:6,cost:3.50,sale:13.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Portapenne betulla. Incisione nome/logo. Scrivania personalizzata.'},
      {n:'Salvadanaio Legno Laser Personalizzato',c:'Gadget',u:'pz',q:10,m:4,cost:5.50,sale:18.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Scatola piggy bank legno laser. Battesimi, primo dente, risparmio.'},
      {n:'Alberello di Natale Legno Laser 15cm',c:'Gadget',u:'pz',q:20,m:8,cost:2.50,sale:9.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Alberello 3D assemblato laser. Decorazione Natale. Bestseller novembre.'},
      {n:'Stella Natale Legno Laser 20cm',c:'Gadget',u:'pz',q:20,m:8,cost:3.00,sale:11.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Stella geometrica legno laser. Appendere. Decorazione natalizia.'},
      {n:'Ciondolo Orecchini Legno Laser (coppia)',c:'Gadget',u:'pz',q:20,m:8,cost:0.60,sale:5.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Coppia orecchini legno 3mm taglio laser. Ganci argentati inclusi. Etsy moda.'},
      {n:'Bracciale Legno Curvato Laser Personalizzato',c:'Gadget',u:'pz',q:15,m:6,cost:1.80,sale:8.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Listino legno curvato incisione. Nome/citazione. Etsy bijoux laser.'},
      {n:'Clessidra Legno Laser 15cm',c:'Gadget',u:'pz',q:8,m:3,cost:6.50,sale:22.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Clessidra legno assemb laser. Sabbia inclusa. Regalo pensionamento/laurea.'},
      {n:'Set Coltelli Bbq Manico Legno Laser',c:'Gadget',u:'set',q:5,m:2,cost:12.00,sale:38.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Set 4 coltelli manico legno incisione laser nome. Regalo uomo.'},
      {n:'Tagliere Con Grondaia Legno Acacia',c:'Gadget',u:'pz',q:8,m:3,cost:8.50,sale:28.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Con canale raccolta succhi. Legno acacia. Incisione laser nome. Premium.'},
      {n:'Vassoio Rotondo Legno Bambù 30cm',c:'Gadget',u:'pz',q:8,m:3,cost:5.50,sale:18.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Vassoio bambù con incisione laser bordo. Regalo casa.'},
      {n:'Cornice Multispot 4 Foto Legno Laser',c:'Gadget',u:'pz',q:5,m:2,cost:8.00,sale:25.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Cornice collage 4 foto legno laser. Incisione dedica. Regalo coppia.'},
      {n:'Libro degli Ospiti Copertina Legno Laser',c:'Gadget',u:'pz',q:5,m:2,cost:15.00,sale:45.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Copertina MDF/legno laser + fogli bianchi. Matrimoni, compleanni.'},
      {n:'Guestbook Cuore Legno Laser 30x30cm',c:'Gadget',u:'pz',q:5,m:2,cost:12.00,sale:38.00,sup:'Atomm.com',url:'https://www.atomm.com',note:'Pannello cuore con slot per firme ospiti. Matrimoni. Etsy bestseller.'},
      // ══ GADGET INCISIONE FIBRA (xTool F2 specifica) ═════════════════
      {n:'Piastra Acciaio Inox 8x5cm Laser Fibra',c:'Gadget',u:'pz',q:50,m:20,cost:0.60,sale:5.50,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Placca inox per incisione fibra (xTool F2). Nome/logo permanente. Incisione a colori MOPA.'},
      {n:'Portachiavi Inox Bianco Laser Fibra',c:'Gadget',u:'pz',q:50,m:20,cost:0.85,sale:6.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Inox rivestito bianco. Incisione fibra rivela metallo. Premium.'},
      {n:'Dog Tag Militare Acciaio Laser Fibra',c:'Gadget',u:'pz',q:30,m:12,cost:0.90,sale:5.50,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Piastrina militare. Incisione fibra nome/numero. Personalizzazione totale.'},
      {n:'Bracciale Acciaio Inox Laser Fibra',c:'Gadget',u:'pz',q:20,m:8,cost:1.20,sale:7.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Bracciale inox regolabile. Incisione fibra nome/data. Bijoux laser.'},
      {n:'Medaglia Premio Metallo Laser Fibra',c:'Gadget',u:'pz',q:20,m:8,cost:1.80,sale:8.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Medaglia alluminio/inox. Incisione fibra+colori MOPA. Premiazioni sportive.'},
      {n:'Bottoni Metallo Custom Laser (set 10)',c:'Gadget',u:'set',q:10,m:4,cost:3.50,sale:12.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'10 bottoni alluminio laser logo. Personalizzazione abbigliamento premium.'},
      {n:'Zippo / Accendino Metallo Laser Fibra',c:'Gadget',u:'pz',q:10,m:4,cost:4.00,sale:15.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Accendino alluminio/inox incisione laser fibra. Regalo uomo. Min 10pz.'},
      {n:'Flask Borraccia Acciaio Laser Fibra',c:'Gadget',u:'pz',q:10,m:4,cost:5.50,sale:18.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Fiaschetta inox. Incisione laser fibra logo. Regalo uomo. Nicchia outdoor.'},
      // ══ MATERIALI SPECIALI PER xTool F2 ═════════════════════════════
      {n:'Alluminio Anodizzato Nero 1mm 20x30cm',c:'Metallo',u:'foglio',q:10,m:4,cost:3.50,sale:10.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Alluminio anodizzato. Incisione laser fibra rivela alluminio chiaro. Targhe premium.'},
      {n:'Acciaio Inox 304 0.5mm 20x30cm',c:'Metallo',u:'foglio',q:8,m:3,cost:4.50,sale:13.00,sup:'RS Components',url:'https://it.rs-online.com',note:'Per incisione laser fibra (xTool F2). Marcatura permanente. Taglie varie.'},
      {n:'Titanio Lamina 0.5mm 10x10cm',c:'Metallo',u:'foglio',q:5,m:2,cost:8.00,sale:25.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Titanio puro. Incisione MOPA produce oltre 100 colori vivaci. Gioielli.'},
      {n:'Ottone 1mm 15x20cm',c:'Metallo',u:'foglio',q:8,m:3,cost:5.50,sale:16.00,sup:'RS Components',url:'https://it.rs-online.com',note:'Ottone lavorazione laser. Targhe vintage, placche decorative.'},
      {n:'Acciaio Verniciato Bianco 0.5mm 20x30cm',c:'Metallo',u:'foglio',q:6,m:2,cost:3.80,sale:11.00,sup:'AliExpress',url:'https://www.aliexpress.com',note:'Verniciato bianco. Laser rimuove vernice rivelando metallo. Contrasto perfetto.'},
      // ══ ABBIGLIAMENTO NEUTRO INGROSSO ════════════════════════════════
      // Fonte: Wordans.it, TeeFactory.it, StampaSi.it, Teezily.com (prezzi 2025)
      {n:'T-Shirt Gildan 64000 Softstyle Bianca',c:'Abbigliamento',u:'pz',q:72,m:24,cost:2.20,sale:8.00,sup:'Wordans.it',url:'https://www.wordans.it/basic-accessori-c37029/gildan-b34/t-shirt-s2729',note:'100% cotone ring-spun 153g. Standard DTF/sublimazione. Min 72pz. Colori: 60+. XS-5XL.'},
      {n:'T-Shirt Gildan 64000 Nera/Colore',c:'Abbigliamento',u:'pz',q:72,m:24,cost:2.40,sale:9.00,sup:'Wordans.it',url:'https://www.wordans.it/basic-accessori-c37029/gildan-b34/t-shirt-s2729',note:'64000 colori scuri. DTF ideale. Min 72pz. Ottimo qualita/prezzo mercato.'},
      {n:'T-Shirt Fruit of the Loom 61-082 Bianca',c:'Abbigliamento',u:'pz',q:72,m:24,cost:2.35,sale:8.50,sup:'StampaSi.it',url:'https://www.stampasi.it/brand/fruit-of-the-loom',note:'165g cotone Belcoro. Da €2.61/100pz su StampaSi. OEKO-TEX. XS-5XL. Classico DTF.'},
      {n:'T-Shirt B&C Exact 150 Bianca',c:'Abbigliamento',u:'pz',q:72,m:24,cost:2.50,sale:9.00,sup:'Wordans.it',url:'https://www.wordans.it/basic-accessori-c37029/b-c-b6342/t-shirt-s2729',note:'150g cotone ring-spun. Brand europeo. Ottima per DTF. Certificato GOTS.'},
      {n:'T-Shirt Stanley/Stella Creator STTU755',c:'Abbigliamento',u:'pz',q:25,m:10,cost:5.50,sale:18.00,sup:'TeeFactory.it',url:'https://teefactory.it/vendita-all-ingrosso',note:'100% cotone organico 155g. Premium eco. Etsy bestseller qualita top. S-XXL.'},
      {n:'T-Shirt Sols Imperial Bianca',c:'Abbigliamento',u:'pz',q:72,m:24,cost:1.90,sale:7.50,sup:'TeeFactory.it',url:'https://teefactory.it/vendita-all-ingrosso',note:'Sol\'s 190g cotone. Economica per grandi tirature. Min 72pz. 40+ colori.'},
      {n:'T-Shirt Roly Atomic 150',c:'Abbigliamento',u:'pz',q:100,m:40,cost:1.60,sale:6.50,sup:'HiGift.it',url:'https://www.higift.it',note:'Roly/JHK economiche B2B. 150g. Ottima per eventi grandi volumi. 40 colori.'},
      {n:'Polo Pique Uomo Fruit of the Loom',c:'Abbigliamento',u:'pz',q:36,m:12,cost:4.50,sale:15.00,sup:'Wordans.it',url:'https://www.wordans.it/basic-accessori-c37029/fruit-of-the-loom-b6348/polo-p2559',note:'Polo cotone pique 180-220g. Ricamo o DTF. S-4XL. OEKO-TEX.'},
      {n:'Felpa Girocollo Gildan 18000',c:'Abbigliamento',u:'pz',q:36,m:12,cost:5.50,sale:18.00,sup:'Wordans.it',url:'https://www.wordans.it/basic-accessori-c37029/gildan-b34/felpe-s2736',note:'Cotone/poly 280g. Fleece interno. DTF e sublimazione. Autunno-inverno.'},
      {n:'Felpa Con Cappuccio Gildan 18500',c:'Abbigliamento',u:'pz',q:36,m:12,cost:7.00,sale:22.00,sup:'Wordans.it',url:'https://www.wordans.it/basic-accessori-c37029/gildan-b34/felpe-s2736',note:'Hoodie 280g. Tasca canguro. DTF/ricamo. Bestseller inverno.'},
      {n:'Shopper Cotone Naturale 38x42cm',c:'Abbigliamento',u:'pz',q:100,m:40,cost:0.85,sale:3.50,sup:'HiGift.it',url:'https://www.higift.it',note:'100% cotone naturale. Sublimazione/DTF/serigrafia. GOTS. Molto richiesta.'},
      // ── ABBIGLIAMENTO DA LAVORO ──────────────────────────────────────
      {n:'T-Shirt Lavoro Payper Worker 190g',c:'Abbigliamento',u:'pz',q:36,m:12,cost:5.50,sale:16.00,sup:'TeeFactory.it',url:'https://teefactory.it/vendita-all-ingrosso',note:'190g cotone rinforzato. Stampa DTF. Per artigiani, edili, operai.'},
      {n:'Polo Lavoro Pique 240g',c:'Abbigliamento',u:'pz',q:36,m:12,cost:7.00,sale:20.00,sup:'HiGift.it',url:'https://www.higift.it',note:'Polo robusta 240g. Taschino frontale. Ricamo logo aziendale. Lavabile ind.'},
      {n:'Gilet Softshell Lavoro',c:'Abbigliamento',u:'pz',q:12,m:4,cost:14.00,sale:38.00,sup:'HiGift.it',url:'https://www.higift.it',note:'Gilet softshell impermeabile. Ricamo/DTF aziendale. Settori: edilizia, logistica.'},
      // ══ STAMPA DTF PREZZI (servizio per rivendita) ══════════════════
      {n:'Stampa DTF 30x40cm singola',c:'Consumabili',u:'pz',q:1,m:0,cost:4.50,sale:12.00,sup:'CPLFabbrika',url:'https://www.cplfabbrika.com/servizio-di-stampa-transfer-dtf.html',note:'CPLFabbrika: DTF da €13/metro. 30x40cm = approx €4.50 costo. Qualita premium.'},
      {n:'Stampa DTF al metro (30cm larg.)',c:'Consumabili',u:'metro',q:5,m:2,cost:13.00,sale:35.00,sup:'CPLFabbrika',url:'https://www.cplfabbrika.com/servizio-di-stampa-transfer-dtf.html',note:'DTF al metro €13/metro da CPLFabbrika. PrintDTF.it e Weloco.it simili.'},
      {n:'Stampa DTF UV al metro',c:'Consumabili',u:'metro',q:3,m:1,cost:23.00,sale:55.00,sup:'CPLFabbrika',url:'https://www.cplfabbrika.com/servizio-di-stampa-transfer-dtf.html',note:'DTF UV €23/metro CPLFabbrika. Per oggetti rigidi: plexiglass, legno, metallo.'},
      {n:'Stampa DTF Sublimazione 60cm largh.',c:'Consumabili',u:'metro',q:5,m:2,cost:15.00,sale:38.00,sup:'PrintDTF.it',url:'https://printdtf.it',note:'Sublimazione 60cm luce. Per poliestere bianco e oggettistica.'},
      {n:'Transfer DTF 50pz A4 full-color',c:'Consumabili',u:'conf',q:3,m:1,cost:35.00,sale:75.00,sup:'Weloco.it',url:'https://weloco.it/it/configuratore/transfer-dtf-uv',note:'50 transfer A4 pronti da applicare. Weloco.it configuratore online.'},
      // ══ PLEXIGLASS INGROSSO ══════════════════════════════════════════
      {n:'Lastra Plexiglass Trasparente 3mm 200x100cm',c:'Plexiglass',u:'lastra',q:3,m:1,cost:32.00,sale:75.00,sup:'Temaplex Shop',url:'https://temaplex-shop.com/12-plexiglas-trasparente-incolore',note:'XT trasparente €31.96/mq+taglio. 200x100cm. Ideale per laser CO2/xTool.'},
      {n:'Lastra Plexiglass Trasparente 4mm 200x100cm',c:'Plexiglass',u:'lastra',q:3,m:1,cost:44.00,sale:105.00,sup:'Temaplex Shop',url:'https://temaplex-shop.com/12-plexiglas-trasparente-incolore',note:'XT 4mm €57.10/mq. Taglio laser. Portachiavi, cornici, pannelli.'},
      {n:'Lastra Plexiglass Trasparente 5mm 200x100cm',c:'Plexiglass',u:'lastra',q:2,m:1,cost:58.00,sale:135.00,sup:'Temaplex Shop',url:'https://temaplex-shop.com/12-plexiglas-trasparente-incolore',note:'5mm €72.10/mq. Strutture rigide, display, insegne.'},
      {n:'Lastra Plexiglass Colorato 3mm 200x100cm',c:'Plexiglass',u:'lastra',q:3,m:1,cost:62.00,sale:145.00,sup:'Materie-Plastiche.com',url:'https://www.materie-plastiche.com/catalogo/plexiglass/lastre-plexiglass-colorato-trasparente-alta-qualita-colato',note:'€76.40 IVA escl/lastra 200x100cm. Colori: verde, rosso, blu, giallo, arancio, fumé.'},
      {n:'Lastra Plexiglass Colorato 3mm 100x50cm (x4)',c:'Plexiglass',u:'kit',q:5,m:2,cost:62.00,sale:145.00,sup:'Materie-Plastiche.com',url:'https://www.materie-plastiche.com/catalogo/plexiglass/lastre-plexiglass-colorato-trasparente-alta-qualita-colato',note:'4 pezzi 100x50cm per €76.40. Stessa lastra in 4 pezzi comodi.'},
      {n:'Lastra Plexiglass Specchiato 3mm 100x50cm',c:'Plexiglass',u:'lastra',q:5,m:2,cost:35.00,sale:85.00,sup:'DesignTrasparente.com',url:'https://www.designtrasparente.com/it/140-lastre-plexiglass-pannelli-plex',note:'Acrilico specchiato oro/argento/fumé. Laser CO2. Portachiavi premium.'},
      {n:'Lastra Plexiglass Opalino/Milk 3mm 100x50cm',c:'Plexiglass',u:'lastra',q:5,m:2,cost:22.00,sale:55.00,sup:'Pannelliplastica.it',url:'https://pannelliplastica.it/plexiglass/',note:'Opalino semi-trasparente. LED lightbox. Retroilluminazione.'},
      {n:'Plexiglass Fogli 30x30cm Taglio Laser (set 10)',c:'Plexiglass',u:'set',q:5,m:2,cost:25.00,sale:60.00,sup:'Artistico.it',url:'https://www.artistico.it',note:'Set 10 fogli 30x30cm 3mm trasparente/colorato. Pronti per laser CO2.'},
      // ══ GADGET CON LED (minuteria con link immagine) ════════════════
      {n:'Night Light LED Acrilico 3D 10x15cm',c:'Gadget',u:'pz',q:5,m:2,cost:4.50,sale:16.00,sup:'AliExpress',url:'https://www.aliexpress.com/item/night-light-acrylic-led-lamp-3d',note:'Base LED 7 colori + lastra acrilico 10x15cm. Incisione xTool laser. Etsy bestseller €15-25.'},
      {n:'Night Light LED Acrilico 8x12cm (base sola)',c:'Gadget',u:'pz',q:10,m:4,cost:2.00,sale:8.00,sup:'AliExpress',url:'https://www.aliexpress.com/wholesale?SearchText=led+night+light+base+acrylic',note:'Solo base LED RGB USB. Per usare con propria lastra acrilico incisa laser.'},
      {n:'Luce Neon LED Flessibile (metro)',c:'Gadget',u:'metro',q:3,m:1,cost:8.00,sale:22.00,sup:'RS Components',url:'https://it.rs-online.com/web/c/led-lighting/led-strips/',note:'LED neon flex silicone. Per insegne neon laser. 12V. Colori: bianco, rosa, blu.'},
      {n:'Insegna Neon LED Personalizzata Kit',c:'Gadget',u:'pz',q:2,m:1,cost:25.00,sale:70.00,sup:'AliExpress',url:'https://www.aliexpress.com/wholesale?SearchText=neon+sign+led+kit+custom',note:'Kit: acrilico trasparente + LED strip neon + alimentatore 12V. Logo/testo laser.'},
      {n:'Lampada Luna LED Acrilico 3D',c:'Gadget',u:'pz',q:5,m:2,cost:5.00,sale:18.00,sup:'AliExpress',url:'https://www.aliexpress.com/wholesale?SearchText=moon+lamp+acrylic+3d+led',note:'Sfera acrilico luna incisa laser 3D. Base LED 7 colori. Etsy regalo €15-28.'},
      {n:'Cornice Foto Luminosa LED A4',c:'Gadget',u:'pz',q:4,m:2,cost:7.50,sale:25.00,sup:'AliExpress',url:'https://www.aliexpress.com/wholesale?SearchText=led+light+up+photo+frame',note:'Cornice acrilico LED perimetro. Incisione laser testo/logo. Illumina la foto.'},
      {n:'Lightbox A5 LED USB Parole',c:'Gadget',u:'pz',q:5,m:2,cost:8.00,sale:22.00,sup:'AliExpress',url:'https://www.aliexpress.com/wholesale?SearchText=lightbox+led+letters+a5',note:'Lightbox acrilico opalino A5 con lettere intercambiabili. USB. Regalo ufficio.'},
      {n:'Targhetta LED Acrilico Porta Ufficio',c:'Gadget',u:'pz',q:5,m:2,cost:9.00,sale:25.00,sup:'AliExpress',url:'https://www.aliexpress.com/wholesale?SearchText=led+acrylic+sign+office+door',note:'Targa ufficio acrilico + LED USB. Nome/logo laser inciso. B2B aziendale.'},
      {n:'Striscia LED RGB 5m 12V IP65 waterproof',c:'LED & Illuminazione',u:'rotolo',q:3,m:1,cost:12.00,sale:30.00,sup:'RS Components',url:'https://it.rs-online.com',note:'IP65. Per insegne da esterno. 300 LED/5m. Controller incluso.'},
      {n:'Driver LED Dimmerabile 12V 5A 60W',c:'LED & Illuminazione',u:'pz',q:5,m:2,cost:9.00,sale:22.00,sup:'RS Components',url:'https://it.rs-online.com',note:'Dimmerabile. Per lightbox professionali e insegne laser.'},
      // ══ PORTACHIAVI INOX / GADGET LASERABILI — FORNITORI PREMIUM ════
      {n:'Portachiavi Inox 304 Ovale 50x30mm (100pz)',c:'Gadget',u:'pz',q:100,m:40,cost:0.75,sale:5.50,sup:'IotiStampo.it',url:'https://www.iotistampo.it/it/gadget-per-eventi/portachiavi/portachiavi-in-metallo',note:'Acc. inox 304 ovale. Min 50pz. Incisione laser permanente. Aziende/eventi.'},
      {n:'Portachiavi Inox Quadrato 30x30mm (100pz)',c:'Gadget',u:'pz',q:100,m:40,cost:0.70,sale:5.00,sup:'IotiStampo.it',url:'https://www.iotistampo.it/it/gadget-per-eventi/portachiavi/portachiavi-in-metallo',note:'Quadrato inox. Incisione laser fibra (F2). Grafica/testo permanente.'},
      {n:'Portachiavi Alluminio Colorato 10 colori (50pz)',c:'Gadget',u:'pz',q:50,m:20,cost:0.80,sale:5.50,sup:'Yesmarket.it',url:'https://www.yesmarket.it/gadget-promozionali/portachiavi-in-metallo',note:'10 colori anodizzati. Laser rimuove strato rivela alluminio argento. MOPA colori.'},
      {n:'Portachiavi Dog Tag Metallo Premium (50pz)',c:'Gadget',u:'pz',q:50,m:20,cost:0.90,sale:6.00,sup:'prezziingrosso.com',url:'https://prezziingrosso.com/48-portachiavi-in-metallo-personalizzati',note:'Piastrina militare + catena 60cm + anello. Laser fibra F2. Personalizzazione totale.'},
      {n:'Portachiavi Inox Bianco Laccato Laser UV (50pz)',c:'Gadget',u:'pz',q:50,m:20,cost:1.10,sale:7.00,sup:'AliExpress',url:'https://www.aliexpress.com/wholesale?SearchText=keychain+stainless+steel+white+laser',note:'Inox rivestito bianco. Laser CO2 rimuove strato: contrasto bianco/argento netto.'},
      {n:'Medaglione Premio Alluminio 50mm (25pz)',c:'Gadget',u:'pz',q:25,m:10,cost:1.50,sale:8.00,sup:'prezziingrosso.com',url:'https://prezziingrosso.com',note:'Alluminio anodizzato oro/argento. Laser incisione testo+logo. Premiazioni.'},
      {n:'Bracciale Inox Piatto 12x200mm (25pz)',c:'Gadget',u:'pz',q:25,m:10,cost:1.20,sale:7.00,sup:'AliExpress',url:'https://www.aliexpress.com/wholesale?SearchText=stainless+steel+bracelet+flat+laser',note:'Bracciale inox regolabile. xTool F2 laser fibra. Nome/data/citazione.'},
      // ══ PLEXIGLASS FOGLI PRONTI LASER — COLORI ══════════════════════
      {n:'Plexi Rosa Cipria 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:10,m:4,cost:3.80,sale:10.00,sup:'Artistico.it',url:'https://www.artistico.it',note:'Rosa cipria pastello. Portachiavi femminili, decorazioni. Laser CO2.'},
      {n:'Plexi Celeste/Azzurro 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:10,m:4,cost:3.80,sale:10.00,sup:'Artistico.it',url:'https://www.artistico.it',note:'Azzurro cielo. Decorazioni nautiche/cielo. Laser CO2.'},
      {n:'Plexi Verde Menta 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:10,m:4,cost:3.80,sale:10.00,sup:'Artistico.it',url:'https://www.artistico.it',note:'Verde menta pastello. Deco primavera. Laser CO2.'},
      {n:'Plexi Giallo Limone 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:10,m:4,cost:3.80,sale:10.00,sup:'Artistico.it',url:'https://www.artistico.it',note:'Giallo vivace. Estate/spiaggia. Laser CO2.'},
      {n:'Plexi Rosso Trasparente 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:10,m:4,cost:4.00,sale:11.00,sup:'Materie-Plastiche.com',url:'https://www.materie-plastiche.com',note:'Rosso trasparente acrilico colato. Laser CO2. Decorazioni Natale.'},
      {n:'Plexi Fumé/Grigio 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:10,m:4,cost:3.90,sale:10.50,sup:'Artistico.it',url:'https://www.artistico.it',note:'Fumé grigiastro. Insegne moderne, targhe premium.'},
      {n:'Plexi Nero Coprente 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:10,m:4,cost:3.80,sale:10.00,sup:'Artistico.it',url:'https://www.artistico.it',note:'Nero opaco. Laser rivela bianco underneath. Contrasto estremo.'},
      {n:'Plexi Viola 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:10,m:4,cost:4.00,sale:11.00,sup:'Artistico.it',url:'https://www.artistico.it',note:'Viola/ametista trasparente. Bijoux e gadget femminili.'},
      {n:'Plexi Arancio Fluorescente 3mm 30x30cm',c:'Plexiglass',u:'foglio',q:8,m:3,cost:6.00,sale:16.00,sup:'Artistico.it',url:'https://www.artistico.it',note:'Arancio brillante UV. Laser CO2. Effetto neon. Alta visibilita.'},
      // ══ INGROSSO ABBIGLIAMENTO PALERMO / SICILIA ═════════════════════
      {n:'Ingrosso tessuti DTF Palermo (servizio)',c:'Servizi',u:'mese',q:1,m:0,cost:0,sale:0,sup:'Stampa Sicilia Palermo',url:'https://www.stampasicilia.it',note:'LOCALE PALERMO: DTF su tessuto. Prezzi da concordare. Tel. diretto. Turnaround 3-5gg. Ottimo per urgenze locali.'},
      {n:'Abbigliamento ingrosso Mercato Ballarò PA',c:'Abbigliamento',u:'pz',q:100,m:40,cost:1.50,sale:5.00,sup:'Mercato Ballarò Palermo',url:'',note:'LOCALE PALERMO: Ballarò e Capo market. T-shirt, shopper, polo ingrosso. Prezzi da €1.50/pz. Non garantita qualita DTF.'},
      {n:'Plexiglass Taglio Laser Palermo',c:'Servizi',u:'pz',q:1,m:0,cost:0,sale:0,sup:'Palermo Laser (ricerca locale)',url:'https://www.google.it/search?q=taglio+laser+plexiglass+palermo',note:'LOCALE PA: cerca tipografie/centri laser per taglio plexiglass su commissione. Alternative: Tecnomat Palermo (lastre plexiglass).'},
    ];
    let added=0;
    for(let idx=0;idx<DB.length;idx++){
      const d=DB[idx];
      if(names.has(d.n.toLowerCase()))continue;
      const item={id:Date.now()+idx,name:d.n,category:d.c,unit:d.u,
        quantity:d.q,minStock:d.m,costPrice:d.cost,salePrice:d.sale,
        supplier:d.sup,supplierUrl:d.url,
        dimW:d.w||null,dimH:d.h||null,dimZ:d.z||null,
        notes:d.note,photo:'',createdAt:new Date().toISOString(),source:'laser_db_it'};
      await IDB.put('items',item); await new Promise(r=>setTimeout(r,1)); added++;
    }
    const sup = eid('im-filter-sup'); if(sup){while(sup.options.length>1)sup.remove(1);}
    await this.render(); toast(`✅ ${added} materiali laser IT caricati (${DB.length-added} già presenti)`,'🪵');
  },

  async openCatManager() {
    const items = await this._getAll();
    const cats = [...new Set(items.map(i=>i.category).filter(Boolean))].sort();
    const modal = eid('im-cat-modal'); if(!modal)return;
    const list = eid('im-cat-modal-list');
    if(list) list.innerHTML = cats.length ? cats.map(cat=>{
      const n=items.filter(i=>i.category===cat).length;
      const k=cat.replace(/[^a-z0-9]/gi,'_');
      return `<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-card2);border-radius:8px;border:1px solid var(--border);margin-bottom:5px">
        <div style="flex:1"><span id="catlbl-${k}" style="font-size:12px;font-weight:600">${cat}</span><span style="font-size:10px;color:var(--text-muted);margin-left:6px">${n} item${n!==1?'s':''}</span></div>
        <input id="catinp-${k}" value="${cat}" style="display:none;padding:4px 8px;background:var(--bg-card);border:1px solid var(--primary);border-radius:4px;font-size:12px;color:var(--text);width:130px">
        <button onclick="ItemsModule._catEditStart('${cat}')" id="catedit-${k}" style="padding:3px 8px;background:none;border:1px solid var(--border);color:var(--text-muted);border-radius:4px;cursor:pointer;font-size:11px">✏️</button>
        <button onclick="ItemsModule._catEditSave('${cat}')" id="catsave-${k}" style="display:none;padding:3px 8px;background:#22c55e;border:none;color:#000;border-radius:4px;cursor:pointer;font-size:11px;font-weight:700">✓</button>
        ${n===0?`<button onclick="ItemsModule._catDel('${cat}')" style="padding:3px 8px;background:#ef444415;border:1px solid #ef444430;color:#ef4444;border-radius:4px;cursor:pointer;font-size:11px">🗑️</button>`:''}
      </div>`;
    }).join('') : '<div style="text-align:center;padding:20px;font-size:12px;color:var(--text-muted)">Nessuna categoria presente.</div>';
    modal.style.display = 'flex';
  },

  addNewCat() {
    const inp=eid('im-new-cat-input'); const cat=inp?.value?.trim(); if(!cat)return toast('Inserisci nome','warning');
    const dl=eid('im-cat-dl'); if(dl){const o=document.createElement('option');o.value=cat;dl.appendChild(o);}
    if(inp)inp.value=''; toast(`Categoria "${cat}" pronta`,'success');
  },

  _catEditStart(cat){
    const k=cat.replace(/[^a-z0-9]/gi,'_');
    const inp=eid('catinp-'+k),lbl=eid('catlbl-'+k),eb=eid('catedit-'+k),sb=eid('catsave-'+k);
    if(lbl)lbl.style.display='none'; if(inp){inp.style.display='';inp.focus();}
    if(eb)eb.style.display='none'; if(sb)sb.style.display='';
  },

  async _catEditSave(oldCat){
    const k=oldCat.replace(/[^a-z0-9]/gi,'_');
    const inp=eid('catinp-'+k); const newCat=inp?.value?.trim();
    if(!newCat||newCat===oldCat){const m=eid('im-cat-modal');if(m)m.style.display='none';return;}
    const items=await this._getAll(); let n=0;
    for(const item of items){if(item.category===oldCat){item.category=newCat;await IDB.put('items',item);n++;}}
    const m=eid('im-cat-modal');if(m)m.style.display='none';
    await this.render(); toast(`"${oldCat}"→"${newCat}" — ${n} items aggiornati`,'success');
  },

  async _catDel(cat){
    if(!await askConfirm(`Eliminare "${cat}"?`))return;
    const m=eid('im-cat-modal');if(m)m.style.display='none'; toast(`Categoria "${cat}" eliminata`,'success');
  },

  openModal(id){ this.openForm(id||null); }
};

// ── Migrate legacy stores → unified items store ───────────────────────────────
async function migrateToItemsStore(){
  try{
    const existing=await AppStore.get('items').catch(()=>[]);
    if(existing.length>0)return;
    let added=0;
    const gads=await IDB.getAll('gadgets').catch(()=>[]);
    for(const g of gads){
      await IDB.put('items',{id:Date.now()+added++,name:g.name,category:g.category||'Gadget',unit:g.unit||'pz',quantity:+(g.stock??0),minStock:+(g.minStock??1),costPrice:+(g.cost??0),salePrice:0,supplier:g.supplier||'',notes:g.usage||g.notes||'',source:'gadget',createdAt:new Date().toISOString()});
      await new Promise(r=>setTimeout(r,1));
    }
    const mats=await AppStore.get('materials').catch(()=>[]);
    const catMap={legno:'Legno',mdf:'MDF',plexy:'Plexiglass',metallo:'Metallo',plastica:'Altro',tessuto:'Feltro & Tessuto',sughero:'Sughero',machine:'Macchinari',altro:'Altro'};
    for(const m of mats){
      if(!m.name)continue;
      await IDB.put('items',{id:Date.now()+added++,name:m.name,category:catMap[m.cat||m.type]||m.cat||'Legno',unit:m.unit||'m\u00b2',quantity:+(m.stock??0),minStock:+(m.min??1),costPrice:+(m.cost??0),salePrice:0,supplier:m.supplier||'',notes:m.notes||(m.thickness?`Spessore: ${m.thickness}`:''),source:'material',createdAt:new Date().toISOString()});
      await new Promise(r=>setTimeout(r,1));
    }
    const inv=await IDB.getAll('inventory').catch(()=>[]);
    for(const i of inv){
      await IDB.put('items',{id:Date.now()+added++,name:i.name,category:i.category||'Altro',unit:i.unit||'pz',quantity:+(i.stock??i.quantity??0),minStock:+(i.minStock??1),costPrice:+(i.costPrice??i.cost??0),salePrice:+(i.salePrice??0),supplier:i.supplier||'',notes:i.notes||'',source:'inventory',createdAt:new Date().toISOString()});
      await new Promise(r=>setTimeout(r,1));
    }
    console.log('\u2705 Items migrated: '+added+' items');
  }catch(e){console.warn('Items migration:',e);}
}


// ── Auto-load Items when navigating to items section ─────────────────────────
(function patchNavigateForItems() {
  const _wait = () => {
    if (!App?.navigate) { setTimeout(_wait, 400); return; }
    if (App.navigate._itemsPatch) return;
    const _orig = App.navigate.bind(App);
    App.navigate = function(section) {
      _orig(section);
      if (section === 'items') migrateToItemsStore().then(()=>(typeof ItemsModule!=='undefined'&&ItemsModule.render())).catch(console.warn);
      if (section === 'socialstudio') SocialStudio.load().catch(console.warn);
      if (section === 'marketintel') CompetitorTracker.load().catch(console.warn);
    };
    App.navigate._itemsPatch = true;
  };
  setTimeout(_wait, 1500);
})();

// ══════════════════════════════════════════════════════════════════════════════
// 📱 SOCIAL STUDIO MODULE — Unified Social + Content Calendar
// Store: social_posts, social_accounts
// ══════════════════════════════════════════════════════════════════════════════
const MATERIAL_COLORS = {
  'Legno': '#c8a46e', 'legno': '#c8a46e', 'Wood': '#c8a46e',
  'MDF': '#d4a06a', 'mdf': '#d4a06a',
  'Plexiglass': '#88ccff', 'Plexy': '#88ccff', 'Acrylic': '#88ccff', 'Plastic': '#88ccff',
  'Vetro': '#b0e0ff', 'Glass': '#b0e0ff',
  'Carta': '#f5e6c8', 'Paper': '#f5e6c8', 'Cartoncino': '#f5e6c8',
  'Consumabili': '#94a3b8', 'Metal': '#a0a8b8',
  'LED': '#ffd700', 'Elettronica': '#f59e0b', 'Electronics': '#f59e0b',
  'Macchina': '#6366f1', 'Machine': '#6366f1',
  'Gadget': '#ec4899', 'Vernici': '#8b5cf6', 'Paint': '#8b5cf6',
  'Manodopera': '#22c55e', 'Labor': '#22c55e',
  'Default': '#64748b'
};
function getMaterialColor(item) {
  for(const [key,col] of Object.entries(MATERIAL_COLORS)){
    if((item.category||'').toLowerCase().includes(key.toLowerCase()) ||
       (item.name||'').toLowerCase().includes(key.toLowerCase())) return col;
  }
  return MATERIAL_COLORS.Default;
}

const ResourcePicker = {
  _items: [],
  _filtered: [],
  _selected: null,
  _activeCat: 'Tutti',

  async open() {
    const cat = eid('ql-cat')?.value || '';
    if(!cat){ toast('Seleziona prima una categoria','warning'); return; }
    await this._loadItems(cat);
    eid('resource-picker-overlay').style.display = 'block';
    const panel = eid('resource-picker-panel');
    panel.style.display = 'flex';
    panel.style.animation = 'slideInRight .25s cubic-bezier(.4,0,.2,1)';
    if(!document.getElementById('rp-anim-style')){
      const s=document.createElement('style');s.id='rp-anim-style';
      s.textContent='@keyframes slideInRight{from{transform:translateX(100%)}to{transform:translateX(0)}}';
      document.head.appendChild(s);
    }
    eid('rp-search').value = '';
    this._selected = null;
    eid('rp-selected-label').textContent = 'Nessuna selezione';
    this._renderCats();
    this._renderItems();
  },

  async _loadItems(cat) {
    this._items = [];
    if(cat === 'materiale' || cat === 'verniciatura') {
      const inv = await IDB.getAll('inventory').catch(()=>[]);
      const mats = await AppStore.get('materials').catch(()=>[]);
      inv.forEach(i => this._items.push({
        id: 'inv_'+i.id, name: i.name, cost: i.costPrice||0,
        unit: i.unit||'mq', category: i.category||'Magazzino', supplier: i.supplier||'',
        stock: i.stock||0
      }));
      mats.filter(m=>m.type==='material').forEach(m => this._items.push({
        id: 'mat_'+m.id, name: m.name, cost: m.cost||0,
        unit: m.unit||'mq', category: m.subtype||m.category||'Materiale', supplier: m.supplier||''
      }));
      // Also add items store
      const its = await AppStore.get('items').catch(()=>[]);
      its.filter(i=>['Legno','MDF','Plexiglass','Plexy','Carta','Cartoncino','Acrylic','Materiale','Magazzino','Vetro'].some(k=>(i.category||'').includes(k))).forEach(i=>this._items.push({
        id:'itm_'+i.id, name:i.name, cost:i.costPrice||0, unit:i.unit||'mq', category:i.category||'Materiale', supplier:i.supplier||'', stock:i.quantity||0
      }));
      eid('rp-subtitle').textContent = 'Materiali · Lastre · MDF · Plexiglass dal tuo listino';
    } else if(cat === 'laser') {
      const mach = await AppStore.get('materials').catch(()=>[]);
      const cfg = await IDB.get('settings','main').catch(()=>null) || {};
      this._items.push({ id:'gen_laser', name:'Laser Generico', cost: cfg.machineCost||0.35, unit:'€/min', category:'Macchina', supplier:'Default' });
      mach.filter(m=>m.type==='machine').forEach(m => this._items.push({
        id:'mac_'+m.id, name:m.name, cost:m.cost||0, unit:'€/min', category:'Macchina', supplier:m.supplier||''
      }));
      const its = await AppStore.get('items').catch(()=>[]);
      its.filter(i=>(i.category||'').toLowerCase().includes('macchina') || (i.category||'').toLowerCase().includes('laser')).forEach(i=>this._items.push({
        id:'itm_'+i.id, name:i.name, cost:i.costPrice||0, unit:'€/min', category:i.category||'Macchina', supplier:i.supplier||''
      }));
      eid('rp-subtitle').textContent = 'Macchine laser · Costo al minuto';
    } else if(cat === 'manodopera') {
      const cfg = await IDB.get('settings','main').catch(()=>null) || {};
      const team = await IDB.getAll('team').catch(()=>[]);
      this._items.push({ id:'gen_labor', name:'Manodopera Generica', cost: cfg.laborCost||0.50, unit:'€/min', category:'Manodopera', supplier:'Studio' });
      team.forEach(t => this._items.push({
        id:'team_'+t.id, name:t.name+' ('+t.role+')', cost:+(t.rate/60).toFixed(4), unit:'€/min', category:'Manodopera', supplier:t.role
      }));
      eid('rp-subtitle').textContent = 'Operatori · Costo al minuto';
    } else if(cat === 'gadget') {
      const inv = await IDB.getAll('inventory').catch(()=>[]);
      const gadgets = await IDB.getAll('gadgets').catch(()=>[]);
      const its = await AppStore.get('items').catch(()=>[]);
      inv.forEach(i => this._items.push({
        id:'inv_'+i.id, name:i.name, cost:i.costPrice||0, unit:i.unit||'pz', category:i.category||'Gadget', supplier:i.supplier||'', stock:i.stock||0
      }));
      gadgets.forEach(g => this._items.push({
        id:'gad_'+g.id, name:g.name, cost:g.costPrice||0, unit:g.unit||'pz', category:g.category||'Gadget', supplier:g.supplier||''
      }));
      its.filter(i=>['Gadget','LED','Elettronica','Minuteria'].some(k=>(i.category||'').includes(k))).forEach(i=>this._items.push({
        id:'itm_'+i.id, name:i.name, cost:i.costPrice||0, unit:i.unit||'pz', category:i.category||'Gadget', supplier:i.supplier||''
      }));
      eid('rp-subtitle').textContent = 'Gadget · LED · Minuteria dal magazzino';
    } else if(cat === 'catalogo') {
      const catalog = await AppStore.get('catalog').catch(()=>[]);
      catalog.forEach(c => this._items.push({
        id:'cat_'+c.id, name:c.name+' '+c.emoji, cost:c.costPrice||0, unit:'pz', category:c.category||'Catalogo', supplier:'', salePrice:c.salePrice
      }));
      eid('rp-subtitle').textContent = 'Prodotti dal catalogo Ingly';
    }
    this._filtered = [...this._items];
  },

  _getCats() {
    const cats = ['Tutti', ...new Set(this._items.map(i=>i.category).filter(Boolean))];
    return cats;
  },

  _renderCats() {
    const el = eid('rp-cats'); if(!el) return;
    const cats = this._getCats();
    el.innerHTML = cats.map(c => `
      <div onclick="ResourcePicker.setCat('${c}')" style="padding:10px 14px;cursor:pointer;font-size:12px;font-weight:${c===this._activeCat?700:400};color:${c===this._activeCat?'var(--primary)':'var(--text-muted)'};background:${c===this._activeCat?'var(--primary-dim)':'transparent'};border-right:2px solid ${c===this._activeCat?'var(--primary)':'transparent'};transition:.15s;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">
        ${c}
        <span style="float:right;font-size:10px;opacity:.5">${c==='Tutti'?this._items.length:this._items.filter(i=>i.category===c).length}</span>
      </div>`).join('');
  },

  setCat(cat) {
    this._activeCat = cat;
    this._filtered = cat === 'Tutti' ? [...this._items] : this._items.filter(i=>i.category===cat);
    const q = eid('rp-search')?.value||'';
    if(q) this._filtered = this._filtered.filter(i=>i.name.toLowerCase().includes(q.toLowerCase()));
    this._renderCats();
    this._renderItems();
  },

  filterItems() {
    const q = (eid('rp-search')?.value||'').toLowerCase();
    const base = this._activeCat==='Tutti' ? this._items : this._items.filter(i=>i.category===this._activeCat);
    this._filtered = q ? base.filter(i=>i.name.toLowerCase().includes(q) || (i.supplier||'').toLowerCase().includes(q)) : [...base];
    this._renderItems();
  },

  _renderItems() {
    const el = eid('rp-items'); if(!el) return;
    if(!this._filtered.length){
      el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px"><i class="fas fa-search" style="font-size:24px;opacity:.2;display:block;margin-bottom:10px"></i>Nessuna risorsa trovata</div>';
      return;
    }
    el.innerHTML = this._filtered.map(item => {
      const col = getMaterialColor(item);
      const isSel = this._selected?.id === item.id;
      return `<div onclick="ResourcePicker.selectItem('${item.id}')" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;cursor:pointer;border:1.5px solid ${isSel?'var(--primary)':'transparent'};background:${isSel?'var(--primary-dim)':'transparent'};margin-bottom:2px;transition:.15s" onmouseover="if(!${isSel})this.style.background='var(--bg-card2)'" onmouseout="if(!${isSel})this.style.background='transparent'">
        <div style="width:32px;height:32px;border-radius:6px;background:${col};flex-shrink:0;border:1px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center">
          ${isSel?'<i class="fas fa-check" style="color:#fff;font-size:11px"></i>':''}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:${isSel?700:500};color:${isSel?'var(--primary)':'var(--text)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.name}</div>
          <div style="font-size:10px;color:var(--text-muted)">${item.category}${item.supplier?' · '+item.supplier:''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:13px;font-weight:700;color:${isSel?'var(--primary)':'var(--text)'}">${fmtCur(item.cost)}</div>
          <div style="font-size:10px;color:var(--text-dim)">${item.unit}</div>
        </div>
      </div>`;
    }).join('');
  },

  selectItem(id) {
    this._selected = this._filtered.find(i=>i.id===id) || null;
    if(this._selected) {
      eid('rp-selected-label').textContent = '✓ ' + this._selected.name + ' — ' + fmtCur(this._selected.cost) + '/' + this._selected.unit;
    }
    this._renderCats();
    this._renderItems();
  },

  confirm() {
    if(!this._selected){ toast('Seleziona una risorsa prima','warning'); return; }
    const item = this._selected;
    // Update display
    const col = getMaterialColor(item);
    eid('rp-resource-swatch').style.background = col;
    eid('ql-resource-swatch').style.background = col;
    eid('ql-resource-label').textContent = item.name;
    eid('ql-resource-label').style.color = 'var(--text)';
    // Update hidden select for compat
    const sel = eid('ql-resource');
    sel.innerHTML = `<option value="${item.id}" data-cost="${item.cost}" data-unit="${item.unit}" ${item.salePrice?'data-sale="'+item.salePrice+'"':''}>${item.name}</option>`;
    sel.selectedIndex = 0;
    if(eid('ql-unit-cost')) eid('ql-unit-cost').value = item.cost.toFixed(4);
    if(item.salePrice && eid('qr-markup')){
      const mk = item.cost>0 ? Math.round((item.salePrice-item.cost)/item.cost*100) : 100;
      eid('qr-markup').value = mk>0?mk:100;
    }
    Quoter.calcItem();
    this.close();
    toast('Risorsa selezionata: '+item.name,'success');
  },

  close() {
    eid('resource-picker-overlay').style.display = 'none';
    eid('resource-picker-panel').style.display = 'none';
  }
};

// ════════════════════════════════════════════════════════════════
// ITEMS PICKER — same panel for Items section
// ════════════════════════════════════════════════════════════════
const ItemsPicker = {
  _items: [],
  _filtered: [],
  _selected: null,
  _activeCat: 'Tutti',
  _callback: null,

  async open(callback) {
    this._callback = callback || null;
    const all = await AppStore.get('items').catch(()=>[]);
    this._items = all.map(i => ({
      id: i.id, name: i.name, cost: i.costPrice||i.cost||0,
      unit: i.unit||'pz', category: i.category||'Altro',
      supplier: i.supplier||'', stock: i.quantity||i.qty||i.stock||0,
      salePrice: i.salePrice||0, sku: i.sku||''
    }));
    this._filtered = [...this._items];
    this._activeCat = 'Tutti';
    eid('items-picker-overlay').style.display = 'block';
    const panel = eid('items-picker-panel');
    panel.style.display = 'flex';
    panel.style.animation = 'slideInRight .25s cubic-bezier(.4,0,.2,1)';
    eid('ip-search').value = '';
    this._selected = null;
    eid('ip-selected-label').textContent = 'Nessuna selezione';
    this._renderCats();
    this._renderItems();
  },

  _getCats() {
    return ['Tutti', ...new Set(this._items.map(i=>i.category).filter(Boolean))];
  },

  _renderCats() {
    const el = eid('ip-cats'); if(!el) return;
    el.innerHTML = this._getCats().map(c => `
      <div onclick="ItemsPicker.setCat('${c}')" style="padding:10px 14px;cursor:pointer;font-size:12px;font-weight:${c===this._activeCat?700:400};color:${c===this._activeCat?'var(--primary)':'var(--text-muted)'};background:${c===this._activeCat?'var(--primary-dim)':'transparent'};border-right:2px solid ${c===this._activeCat?'var(--primary)':'transparent'};transition:.15s">
        ${c}
        <span style="float:right;font-size:10px;opacity:.5">${c==='Tutti'?this._items.length:this._items.filter(i=>i.category===c).length}</span>
      </div>`).join('');
  },

  setCat(cat) {
    this._activeCat = cat;
    this._filtered = cat==='Tutti' ? [...this._items] : this._items.filter(i=>i.category===cat);
    const q = eid('ip-search')?.value||'';
    if(q) this._filtered = this._filtered.filter(i=>i.name.toLowerCase().includes(q.toLowerCase()));
    this._renderCats();
    this._renderItems();
  },

  filterItems() {
    const q = (eid('ip-search')?.value||'').toLowerCase();
    const base = this._activeCat==='Tutti' ? this._items : this._items.filter(i=>i.category===this._activeCat);
    this._filtered = q ? base.filter(i=>i.name.toLowerCase().includes(q)||(i.sku||'').toLowerCase().includes(q)) : [...base];
    this._renderItems();
  },

  _renderItems() {
    const el = eid('ip-items'); if(!el) return;
    if(!this._filtered.length){
      el.innerHTML = '<div style="text-align:center;padding:40px;color:var(--text-dim);font-size:12px"><i class="fas fa-box-open" style="font-size:24px;opacity:.2;display:block;margin-bottom:10px"></i>Nessun item trovato</div>';
      return;
    }
    el.innerHTML = this._filtered.map(item => {
      const col = getMaterialColor(item);
      const isSel = this._selected?.id === item.id;
      const qty = item.stock;
      const qtyColor = qty<=0?'#ef4444':qty<3?'#f59e0b':'#22c55e';
      return `<div onclick="ItemsPicker.selectItem(${item.id})" style="display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;cursor:pointer;border:1.5px solid ${isSel?'#38bdf8':'transparent'};background:${isSel?'rgba(56,189,248,.08)':'transparent'};margin-bottom:2px;transition:.15s" onmouseover="if(!${isSel})this.style.background='var(--bg-card2)'" onmouseout="if(!${isSel})this.style.background='transparent'">
        <div style="width:32px;height:32px;border-radius:6px;background:${col};flex-shrink:0;border:1px solid rgba(255,255,255,.15);display:flex;align-items:center;justify-content:center">
          ${isSel?'<i class="fas fa-check" style="color:#fff;font-size:11px"></i>':''}
        </div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:${isSel?700:500};color:${isSel?'#38bdf8':'var(--text)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.name}</div>
          <div style="font-size:10px;color:var(--text-muted)">${item.category}${item.sku?' · '+item.sku:''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:13px;font-weight:700;color:${isSel?'#38bdf8':'var(--text)'}">${fmtCur(item.cost)}</div>
          <div style="font-size:10px;color:${qtyColor}">Stock: ${qty} ${item.unit}</div>
        </div>
      </div>`;
    }).join('');
  },

  selectItem(id) {
    this._selected = this._filtered.find(i=>i.id===id) || null;
    if(this._selected) eid('ip-selected-label').textContent = '✓ ' + this._selected.name;
    this._renderCats();
    this._renderItems();
  },

  confirm() {
    if(!this._selected){ toast('Seleziona un item prima','warning'); return; }
    if(typeof this._callback === 'function') this._callback(this._selected);
    this.close();
  },

  close() {
    eid('items-picker-overlay').style.display = 'none';
    eid('items-picker-panel').style.display = 'none';
  }
};

// ════════════════════════════════════════════════════════════════
// EDITABLE SAVED QUOTES — Load quote into Quoter for editing
// ════════════════════════════════════════════════════════════════
Quoter._loadForEdit = async function(quoteId) {
  const q = await IDB.get('quotes', +quoteId).catch(()=>null);
  if(!q){ toast('Preventivo non trovato','warning'); return; }
  this.editId = +quoteId;
  this._lastSavedId = +quoteId;
  this.lines = (q.lines || []).map(l=>({...l, id:l.id||Date.now()+Math.random()}));
  // Restore header fields
  const setV = (id,v)=>{ const e=eid(id); if(e&&v!=null) e.value=v; };
  setV('q-name', q.name);
  setV('q-notes', q.notes);
  setV('q-deadline', q.deadline);
  setV('q-priority', q.priority||'Media');
  setV('qr-markup', (window.InglyQuoteAdapter ? window.InglyQuoteAdapter.markupPctDi(q) : (q.markup!=null?q.markup*100:100)));
  setV('qr-discount', q.discount||0);
  // Restore client
  const clientEl = eid('q-client');
  if(clientEl && q.clientId){
    for(let i=0;i<clientEl.options.length;i++){
      if(+clientEl.options[i].value === +q.clientId){ clientEl.selectedIndex=i; break; }
    }
  }
  this.renderLines();
  this.recalcRight();
  toast('✏️ Preventivo caricato — puoi modificarlo','info');
};

// ════════════════════════════════════════════════════════════════
// OVERRIDE renderList — make quotes editable + show load button
// ════════════════════════════════════════════════════════════════
Quoter._qlPage = Quoter._qlPage || 0;
Quoter._qlPageSize = 20;
Quoter.renderList = async function(){
  const el = eid('quotes-list'); if(!el) return;
  const allQuotes = (await AppStore.get('quotes').catch(()=>[])).sort((a,b)=>(b.id||0)-(a.id||0));
  if(!allQuotes.length){ el.innerHTML='<p class="text-muted" style="padding:10px;font-size:12px">Nessun preventivo ancora</p>'; return; }
  const pageSize = Quoter._qlPageSize;
  const page = Math.min(Quoter._qlPage||0, Math.max(0, Math.ceil(allQuotes.length/pageSize)-1));
  Quoter._qlPage = page;
  const totalPages = Math.max(1, Math.ceil(allQuotes.length/pageSize));
  const quotes = allQuotes.slice(page*pageSize, (page+1)*pageSize);
  const nav = totalPages > 1 ? `<div style="display:flex;align-items:center;justify-content:center;gap:8px;padding:8px 0;border-top:1px solid var(--border)">
    <button onclick="Quoter._qlPage=Math.max(0,(Quoter._qlPage||0)-1);Quoter.renderList()" ${page===0?'disabled':''} style="padding:4px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-size:10px">◀</button>
    <span style="font-size:10px;color:var(--text-muted)">Pag ${page+1}/${totalPages} · ${allQuotes.length} prev.</span>
    <button onclick="Quoter._qlPage=Math.min(${totalPages}-1,(Quoter._qlPage||0)+1);Quoter.renderList()" ${page>=totalPages-1?'disabled':''} style="padding:4px 10px;background:var(--bg-card2);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-size:10px">▶</button>
  </div>` : '';
  el.innerHTML = quotes.map(q=>`
    <div style="padding:8px 0;border-bottom:1px solid var(--border);display:flex;flex-direction:column;gap:4px">
      <div style="display:flex;align-items:center;gap:6px">
        <div style="flex:1;min-width:0">
          <div style="font-size:12px;font-weight:600;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${q.name||'—'}</div>
          <div style="font-size:10px;color:var(--text-muted)">${q.clientName||'—'} · ${fmtDate(q.date)}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:12px;font-weight:700;color:var(--primary)">${fmtCur(q.grossPrice)}</div>
          <div>${badgeStatus(q.status)}</div>
        </div>
      </div>
      <div style="display:flex;gap:4px">
        <button onclick="Quoter._loadForEdit(${q.id})" title="Carica e modifica" style="flex:1;padding:4px 6px;background:var(--primary-dim);border:1pstyle="flex:1;padding:4px 6px;background:var(--primary-dim);border:1px solid var(--primary-border);color:var(--primary);border-radius:4px;cursor:pointer;font-size:10px;font-weight:700">✏️ Modifica</button>
        <button onclick="Quoter.convertToInvoice(${q.id})" title="Converti in Fattura" style="padding:4px 8px;background:#10b98120;color:#4ade80;border:1px solid #10b98140;border-radius:4px;cursor:pointer;font-size:10px;font-weight:700">→ FAT</button>
        <button onclick="QuoterBridge.toOrder(${q.id})" title="Manda in produzione" style="padding:4px 8px;background:#6366f120;color:#a5b4fc;border:1px solid #6366f140;border-radius:4px;cursor:pointer;font-size:10px">📋</button>
        <button onclick="askConfirm('Eliminare questo preventivo?').then(ok=>{if(ok)IDB.del('quotes',${q.id}).then(()=>Quoter.renderList())})" style="padding:4px 6px;background:#ef444415;color:#ef4444;border:1px solid #ef444430;border-radius:4px;cursor:pointer;font-size:10px">🗑</button>
      </div>
    </div>`).join('') + nav;
};
// ════════════════════════════════════════════════════════════════
// CLIENT PDF EXPORT v81 — Single authoritative implementation
// Replaces all previous conflicting versions.
// Strategy: window.open() FIRST (user-gesture tick), then async.
// ════════════════════════════════════════════════════════════════
// ══════════════════════════════════════════════════════════════════
// 📄 PDF CLIENTE v83 — 3-STEP TEMPLATE CHOOSER
//    Step 1: Template + Customization
//    Step 2: Line Selection  
//    Step 3: Opens styled PDF in new tab (Ctrl+P to save)
// ══════════════════════════════════════════════════════════════════
Quoter._pdfState = {
  tpl: 'professional', // professional | friendly | minimal | premium
  color: '#0ea5e9',
  company: '', tagline: '', validDays: 7,
  greeting: '', closing: '', notes: '',
  showIVA: true, showValidity: true, showDiscount: true, showTerms: false
};

Quoter.exportClientPDF = function(){
  if(!Quoter.lines||!Quoter.lines.length){ toast('Aggiungi voci al preventivo','warning'); return; }

  // Build the chooser dialog (stays in same tab — no popup needed until Step 3)
  const existing = document.getElementById('pdf-chooser-overlay');
  if(existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'pdf-chooser-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.75);backdrop-filter:blur(5px);z-index:19999;display:flex;align-items:center;justify-content:center;padding:20px';
  overlay.onclick = e=>{ if(e.target===overlay) overlay.remove(); };
  document.body.appendChild(overlay);

  Quoter._pdfRenderStep(1);
};

Quoter._pdfRenderStep = function(step){
  const overlay = document.getElementById('pdf-chooser-overlay');
  if(!overlay) return;
  const s = Quoter._pdfState;

  const TEMPLATES = [
    { id:'professional', icon:'🏢', name:'Professionale',  desc:'Navy, formale, B2B',      hBg:'#0f172a', hColor:'#38bdf8',  acDef:'#0ea5e9',  greetDef:'Gentile {cliente},' },
    { id:'friendly',     icon:'😊', name:'Amichevole',     desc:'Verde, caldo, emoji',     hBg:'#064e3b', hColor:'#6ee7b7',  acDef:'#10b981',  greetDef:'Ciao {cliente}! 👋' },
    { id:'minimal',      icon:'◻️', name:'Minimalista',    desc:'Bianco, neutro, pulito',  hBg:'#f8fafc', hColor:'#0f172a',  acDef:'#6366f1',  greetDef:'{cliente},' },
    { id:'premium',      icon:'✨', name:'Premium',         desc:'Oro, esclusivo, lusso',   hBg:'#1c1410', hColor:'#fbbf24',  acDef:'#d97706',  greetDef:'Egregio {cliente},' },
  ];

  // ── STEP 1 ─────────────────────────────────────────────────────
  if(step===1){
    const clientName = (()=>{ const el=eid('q-client'); return el?.selectedIndex>0?el.options[el.selectedIndex].text:'Cliente'; })();
    overlay.innerHTML = `
    <style>
      @keyframes pdfSlide{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}
      .pdfc{background:#0b1120;border-radius:20px;width:min(780px,98vw);max-height:90vh;display:flex;flex-direction:column;border:1px solid #1e293b;box-shadow:0 40px 120px #000c;overflow:hidden;animation:pdfSlide .2s ease}
      .pdf-tpl{border:2px solid #1e293b;border-radius:14px;cursor:pointer;overflow:hidden;transition:all .16s;background:#0f172a}
      .pdf-tpl:hover{border-color:#334155;transform:translateY(-2px);box-shadow:0 8px 28px #0008}
      .pdf-tpl.active{border-color:#0ea5e9!important;box-shadow:0 0 0 3px #0ea5e920}
      .pdf-toggle{display:flex;align-items:center;gap:8px;padding:8px 12px;border-radius:8px;background:#0f172a;border:1px solid #1e293b;cursor:pointer;font-size:12px;color:#94a3b8;transition:all .14s;user-select:none}
      .pdf-toggle:hover{border-color:#334155}
      .pdf-toggle.on{background:#0c2236;border-color:#0ea5e9;color:#38bdf8}
      .pdf-toggle input{accent-color:#0ea5e9;width:14px;height:14px;cursor:pointer}
      .pdf-inp{background:#0f172a;border:1.5px solid #1e293b;border-radius:9px;color:#f1f5f9;padding:8px 12px;font-size:13px;outline:none;transition:border .15s;width:100%;box-sizing:border-box}
      .pdf-inp:focus{border-color:#0ea5e9}
      .pdf-lbl{font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px}
    </style>
    <div class="pdfc">
      <!-- Header -->
      <div style="padding:16px 22px;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;background:#060911cc;flex-shrink:0">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px">📄</div>
          <div>
            <div style="font-size:14px;font-weight:800;color:#f1f5f9">PDF Cliente</div>
            <div style="font-size:10px;color:#64748b">Step 1 di 3 — Scegli template e personalizza</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="display:flex;gap:4px">${[1,2,3].map(i=>`<div style="width:${i===1?28:8}px;height:6px;border-radius:3px;background:${i===1?'#0ea5e9':'#1e293b'}"></div>`).join('')}</div>
          <button onclick="document.getElementById('pdf-chooser-overlay').remove()" style="width:28px;height:28px;background:#1e293b;border:1px solid #334155;border-radius:7px;color:#64748b;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">✕</button>
        </div>
      </div>

      <!-- Scrollable body -->
      <div style="overflow-y:auto;flex:1;padding:20px 22px">

        <!-- Template cards -->
        <div class="pdf-lbl" style="margin-bottom:10px">🎨 Scegli il tono del documento</div>
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin-bottom:20px">
          ${TEMPLATES.map(t=>`
          <div class="pdf-tpl${s.tpl===t.id?' active':''}" onclick="
            Quoter._pdfState.tpl='${t.id}';
            Quoter._pdfState.color='${t.acDef}';
            document.querySelectorAll('.pdf-tpl').forEach(x=>x.classList.remove('active'));
            this.classList.add('active');
            document.getElementById('pdfcp').value='${t.acDef}';
            document.getElementById('pdfhex').value='${t.acDef}';
            if(!document.getElementById('pdfgreet').dataset.edited) document.getElementById('pdfgreet').value='${t.greetDef}'.replace('{cliente}','${clientName}');
          ">
            <div style="padding:12px;background:${t.hBg};min-height:52px;display:flex;align-items:center;gap:8px">
              <span style="font-size:18px">${t.icon}</span>
              <div>
                <div style="font-size:12px;font-weight:700;color:${t.hColor}">${t.name}</div>
                <div style="font-size:10px;color:${t.hColor}88">${t.desc}</div>
              </div>
            </div>
            <div style="padding:10px 12px;background:#0b1120">
              <div style="height:4px;width:60%;background:${t.acDef};border-radius:2px;margin-bottom:6px"></div>
              <div style="height:3px;width:90%;background:#1e293b;border-radius:2px;margin-bottom:3px"></div>
              <div style="height:3px;width:75%;background:#1e293b;border-radius:2px"></div>
            </div>
          </div>`).join('')}
        </div>

        <!-- Customization grid -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-bottom:16px">

          <div>
            <div class="pdf-lbl">Colore principale</div>
            <div style="display:flex;gap:8px;align-items:center">
              <input id="pdfcp" type="color" value="${s.color}" oninput="Quoter._pdfState.color=this.value;document.getElementById('pdfhex').value=this.value"
                style="width:40px;height:38px;border:none;border-radius:8px;cursor:pointer;background:none;padding:0">
              <input id="pdfhex" class="pdf-inp" style="flex:1" value="${s.color}" placeholder="#0ea5e9" oninput="if(this.value.match(/^#[0-9a-f]{6}$/i)){Quoter._pdfState.color=this.value;document.getElementById('pdfcp').value=this.value}">
            </div>
          </div>

          <div>
            <div class="pdf-lbl">Validità offerta (giorni)</div>
            <input class="pdf-inp" id="pdfdays" type="number" value="${s.validDays}" min="1" max="365" oninput="Quoter._pdfState.validDays=+this.value||7">
          </div>

          <div>
            <div class="pdf-lbl">Nome azienda nel PDF</div>
            <input class="pdf-inp" id="pdfco" placeholder="Da impostazioni…" value="${s.company}" oninput="Quoter._pdfState.company=this.value">
          </div>

          <div>
            <div class="pdf-lbl">Tagline / Slogan</div>
            <input class="pdf-inp" id="pdftag" placeholder="Laser · Incisione · Personalizzazione" value="${s.tagline}" oninput="Quoter._pdfState.tagline=this.value">
          </div>

          <div>
            <div class="pdf-lbl">Saluto al cliente</div>
            <input class="pdf-inp" id="pdfgreet" value="${s.greeting||TEMPLATES.find(t=>t.id===s.tpl)?.greetDef?.replace('{cliente}',clientName)||'Gentile '+clientName+','}"
              oninput="Quoter._pdfState.greeting=this.value;this.dataset.edited=1">
          </div>

          <div>
            <div class="pdf-lbl">Testo di chiusura</div>
            <input class="pdf-inp" id="pdfclose" placeholder="Cordiali saluti" value="${s.closing||'Cordiali saluti,'}" oninput="Quoter._pdfState.closing=this.value">
          </div>
        </div>

        <div style="margin-bottom:16px">
          <div class="pdf-lbl">Note aggiuntive (visibili al cliente)</div>
          <textarea class="pdf-inp" id="pdfnotes" rows="2" placeholder="Es. Il prezzo include imballaggio e consegna" oninput="Quoter._pdfState.notes=this.value" style="resize:vertical">${s.notes}</textarea>
        </div>

        <!-- Toggles -->
        <div class="pdf-lbl" style="margin-bottom:8px">Mostra nel documento</div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          ${[
            ['showIVA','📊 IVA 22%'],
            ['showValidity','📅 Badge validità'],
            ['showDiscount','🎯 Box sconto'],
            ['showTerms','📋 Condizioni generali']
          ].map(([k,lbl])=>`
          <label class="pdf-toggle${s[k]?' on':''}" onclick="Quoter._pdfState.${k}=!Quoter._pdfState.${k};this.className='pdf-toggle'+(Quoter._pdfState.${k}?' on':'')">
            <input type="checkbox" ${s[k]?'checked':''} onclick="event.stopPropagation();Quoter._pdfState.${k}=this.checked"> ${lbl}
          </label>`).join('')}
        </div>
      </div>

      <!-- Footer -->
      <div style="padding:14px 22px;border-top:1px solid #1e293b;display:flex;justify-content:flex-end;gap:10px;flex-shrink:0;background:#060911aa">
        <button onclick="document.getElementById('pdf-chooser-overlay').remove()"
          style="padding:9px 20px;background:#1e293b;border:1px solid #334155;color:#94a3b8;border-radius:9px;cursor:pointer;font-size:13px;font-weight:600">Annulla</button>
        <button onclick="
          Quoter._pdfState.company = document.getElementById('pdfco').value;
          Quoter._pdfState.tagline = document.getElementById('pdftag').value;
          Quoter._pdfState.greeting= document.getElementById('pdfgreet').value;
          Quoter._pdfState.closing = document.getElementById('pdfclose').value;
          Quoter._pdfState.notes   = document.getElementById('pdfnotes').value;
          Quoter._pdfState.validDays= +document.getElementById('pdfdays').value||7;
          Quoter._pdfRenderStep(2);"
          style="padding:9px 24px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">
          Avanti — Scegli voci →
        </button>
      </div>
    </div>`;
    return;
  }

  // ── STEP 2 ─────────────────────────────────────────────────────
  if(step===2){
    const lines = Quoter.lines;
    /* I prezzi di riga arrivano dal motore, non da una formula ricopiata qui.
       Il commento storico prometteva «allineati 1:1 allo Smart Quoter»: era
       l'aspirazione, e niente la garantiva — è esattamente così che due copie
       della stessa riga cominciano a divergere. */
    const _pdfCalc = (typeof Quoter._calcola === 'function') ? Quoter._calcola({ setupCost: 0 }) : null;
    const _pdfPrezzi = {};
    if (_pdfCalc && !_pdfCalc.indisponibile) _pdfCalc.lines.forEach(r => { _pdfPrezzi[r.id] = r; });
    const TNAME   = {professional:'🏢 Professionale',friendly:'😊 Amichevole',minimal:'◻️ Minimalista',premium:'✨ Premium'};

    overlay.innerHTML = `
    <div class="pdfc">
      <div style="padding:16px 22px;border-bottom:1px solid #1e293b;display:flex;align-items:center;justify-content:space-between;background:#060911cc;flex-shrink:0">
        <div style="display:flex;align-items:center;gap:10px">
          <div style="background:linear-gradient(135deg,#0ea5e9,#6366f1);width:32px;height:32px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:14px">📋</div>
          <div>
            <div style="font-size:14px;font-weight:800;color:#f1f5f9">Scegli voci da includere</div>
            <div style="font-size:10px;color:#64748b">Step 2 di 3 — Template: ${TNAME[s.tpl]||s.tpl}</div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <div style="display:flex;gap:4px">${[1,2,3].map(i=>`<div style="width:${i<=2?28:8}px;height:6px;border-radius:3px;background:${i<=2?'#0ea5e9':'#1e293b'}"></div>`).join('')}</div>
          <button onclick="document.getElementById('pdf-chooser-overlay').remove()" style="width:28px;height:28px;background:#1e293b;border:1px solid #334155;border-radius:7px;color:#64748b;cursor:pointer;font-size:13px;display:flex;align-items:center;justify-content:center">✕</button>
        </div>
      </div>

      <div style="overflow-y:auto;flex:1;padding:16px 22px">
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
          <div style="font-size:10px;font-weight:700;color:#475569;text-transform:uppercase;letter-spacing:.8px">${lines.length} voci disponibili</div>
          <div style="display:flex;gap:6px">
            <button onclick="document.querySelectorAll('.pdf-line-chk').forEach(c=>c.checked=true)"
              style="font-size:11px;padding:4px 10px;background:#0f172a;border:1px solid #1e293b;border-radius:6px;color:#64748b;cursor:pointer">Seleziona tutto</button>
            <button onclick="document.querySelectorAll('.pdf-line-chk').forEach(c=>c.checked=false)"
              style="font-size:11px;padding:4px 10px;background:#0f172a;border:1px solid #1e293b;border-radius:6px;color:#64748b;cursor:pointer">Deseleziona</button>
          </div>
        </div>
        ${lines.map((l,i)=>{
          const lineFin = (_pdfPrezzi[l.id] || { price: 0 }).price;
          const ac = s.color;
          return `<label style="display:flex;align-items:center;gap:12px;padding:11px 14px;background:#0f172a;border:1.5px solid #1e293b;border-radius:10px;margin-bottom:7px;cursor:pointer;transition:border .15s" onmouseover="this.style.borderColor='#334155'" onmouseout="this.style.borderColor='#1e293b'">
            <input type="checkbox" class="pdf-line-chk" id="pdfln-${l.id}" checked data-id="${l.id}" style="width:16px;height:16px;accent-color:${ac};cursor:pointer;flex-shrink:0">
            <div style="flex:1;min-width:0">
              <div style="font-size:13px;font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${l.desc||'Voce'}</div>
              <div style="font-size:11px;color:#475569;margin-top:2px">${l.catLabel||''} · Qtà ${l.qty} · ${l.detail||''}</div>
            </div>
            <div style="text-align:right;flex-shrink:0">
              <div style="font-size:14px;font-weight:800;color:${ac}">${fmtCur(lineFin)}</div>
              ${discount>0?`<div style="font-size:10px;text-decoration:line-through;color:#475569">${fmtCur(lineBase)}</div>`:''}
            </div>
          </label>`;
        }).join('')}
      </div>

      <div style="padding:14px 22px;border-top:1px solid #1e293b;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;background:#060911aa">
        <button onclick="Quoter._pdfRenderStep(1)"
          style="padding:9px 18px;background:#1e293b;border:1px solid #334155;color:#94a3b8;border-radius:9px;cursor:pointer;font-size:13px;font-weight:600">← Indietro</button>
        <button onclick="
          Quoter._pdfSelectedIds = [...document.querySelectorAll('.pdf-line-chk:checked')].map(c=>+c.dataset.id);
          if(!Quoter._pdfSelectedIds.length){toast('Seleziona almeno una voce','warning');return;}
          document.getElementById('pdf-chooser-overlay').remove();
          Quoter._pdfGenerate();"
          style="padding:9px 24px;background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;border:none;border-radius:9px;cursor:pointer;font-size:13px;font-weight:800">
          🚀 Genera PDF →
        </button>
      </div>
    </div>`;
  }
};

// ── STEP 3 — build & open PDF ───────────────────────────────────
Quoter._pdfGenerate = function(){
  if(!Quoter.lines||!Quoter.lines.length){ toast('Nessuna voce nel preventivo','warning'); return; }

  // Open popup SYNCHRONOUSLY (user just clicked Genera PDF inside an onclick)
  const _win = window.open('','_blank');
  if(!_win){ toast('⚠️ Popup bloccato — abilita i popup per questo sito','warning'); return; }
  _win.document.write('<html><body style="background:#0f172a;display:flex;height:100vh;align-items:center;justify-content:center"><p style="font-family:system-ui;color:#0ea5e9;font-size:15px;font-weight:700">📄 Generazione PDF…</p></body></html>');
  _win.document.c

  (async()=>{
    try{
      const s        = Quoter._pdfState;
      const selIds   = Quoter._pdfSelectedIds || Quoter.lines.map(l=>l.id);
      const lines    = Quoter.lines.filter(l=>selIds.includes(l.id)).map(l=>({
      ...l,
      subtotal: +(l.subtotal) || ((+(l.unitCost)||0)*(+(l.qty)||1)),
      desc: l.desc||l.name||'Voce',
      catLabel: l.catLabel||l.cat||'',
      unit: l.unit||'pz',
      detail: l.detail||''
    }));
      const markup   = parseFloat(eid('qr-markup')?.value||100)/100;
      const discount = parseFloat(eid('qr-discount')?.value||0)/100;
      const withIVA  = s.showIVA && (Quoter._ivaMode!==false);

      const cfg       = await IDB.get('settings','main').catch(()=>null)||{};
      const clientEl  = eid('q-client');
      const clientName= clientEl?.selectedIndex>0 ? clientEl.options[clientEl.selectedIndex].text : '';
      const jobName   = eid('q-name')?.value||'Preventivo';
      const deadline  = eid('q-deadline')?.value||'';
      const company   = s.company || cfg.company || 'LA TUA AZIENDA';
      const tagline   = s.tagline || cfg.tagline || 'Professionalità · Qualità · Cura';
      const ac        = s.color;
      const validDays = s.validDays||7;
      const quoteNum  = 'PRV-'+Date.now().toString().slice(-6);
      const dateStr   = new Date().toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'});
      const deadlineStr = deadline
        ? new Date(deadline).toLocaleDateString('it-IT',{day:'2-digit',month:'long',year:'numeric'})
        : validDays+' giorni dalla data di emissione';
      const greeting  = s.greeting||('Gentile '+clientName+',');
      const closing   = s.closing||'Cordiali saluti,';

      // Totals — allineati 1:1 allo Smart Quoter (INCLUDONO i Costi Aggiuntivi)
      /* Totali dal motore. Erano ricopiati qui «allineati 1:1 allo Smart
         Quoter» — una promessa che nessun test manteneva. Il documento che
         arriva al cliente e la schermata che il laboratorio guarda ora
         nascono dallo stesso conto, e non possono più raccontare due cifre. */
      const _extraCost = (typeof Quoter._getExtraCosts==='function' ? (Quoter._getExtraCosts()||0) : 0);
      const _linesCost = lines.reduce((a,l)=>a+l.subtotal,0);
      const _tot = (typeof Quoter._calcola === 'function') ? Quoter._calcola({ lines, setupCost: 0 }) : null;
      if (!_tot || _tot.indisponibile) {
        toast('Motore di costo non disponibile: PDF non generato','error');
        try { _win.close(); } catch(e) {}
        return;
      }
      const _prezzoRiga = {}; _tot.lines.forEach(r => { _prezzoRiga[r.id] = r; });
      const subBase  = _tot.subtotalNet;
      const subFinal = _tot.subtotalNet;
      const vatAmt   = withIVA ? _tot.vat : 0;
      const grand    = subFinal + vatAmt;
      const saved    = _tot.totalCost > 0 ? Math.max(0, subFinal - _tot.totalCost) : 0;
      /* Il costo dei materiali aggiuntivi, ricaricato in proporzione. */
      const _extraMarked = _tot.totalCost > 0 ? subFinal * (_extraCost / _tot.totalCost) : 0;

      // Template themes
      const T = {
        professional:{ hBg:'#0f172a', hFg:'#38bdf8',   bodyBg:'#f8fafc', font:'Segoe UI,system-ui,sans-serif', radius:'4px' },
        friendly:    { hBg:'#064e3b', hFg:'#6ee7b7',   bodyBg:'#f0fdf4', font:'Nunito,system-ui,sans-serif',   radius:'16px' },
        minimal:     { hBg:'#ffffff', hFg:'#0f172a',   bodyBg:'#ffffff', font:'Inter,system-ui,sans-serif',    radius:'0px'  },
        premium:     { hBg:'#1c1410', hFg:'#fbbf24',   bodyBg:'#fffbf0', font:'Georgia,serif',                 radius:'6px'  },
      };
      const th = T[s.tpl]||T.professional;

      const rowsHTML = lines.map((l,i)=>{
        /* Prezzo di riga e prezzo unitario dal motore, che li ha già ripartiti
           in proporzione al costo. Il prezzo «prima dello sconto» serve solo a
           mostrare il risparmio, e si ricava dallo sconto applicato — non da
           quello richiesto, che il pavimento di margine può aver ridotto. */
        const _r = _prezzoRiga[l.id] || { price: 0, unitPrice: 0 };
        const lf = _r.price;
        const up = _r.unitPrice;
        const _fattore = 1 - Math.min(0.99, (_tot.discountAppliedPct || 0) / 100);
        const upOrig = _fattore > 0 ? up / _fattore : up;
        const lfOrig = _fattore > 0 ? lf / _fattore : lf;
        const discBadge3 = discount>0 ? `<span style="font-size:9px;background:#f0fdf4;color:#16a34a;padding:1px 6px;border-radius:99px;font-weight:700;margin-left:5px">-${discountPct}%</span>` : '';
        const origStruck3 = discount>0 ? `<div style="font-size:10px;color:#94a3b8;text-decoration:line-through">${fmtCur(lfOrig)}</div>` : '';
        return `<tr>
          <td style="padding:13px 18px;border-bottom:1px solid #e2e8f0;vertical-align:top">
            <div style="font-size:13px;color:#1e293b;font-weight:600">${l.desc||'Voce'}</div>
            ${l.detail&&l.detail!==l.desc?`<div style="font-size:11px;color:#94a3b8;margin-top:2px">${l.detail}</div>`:''}
            ${l.catLabel?`<span style="margin-top:4px;display:inline-block;padding:2px 9px;background:#f1f5f9;border-radius:20px;font-size:10px;color:#64748b">${l.catLabel}</span>`:''}
          </td>
          <td style="padding:13px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px;color:#475569">${l.qty} <span style="font-size:10px;color:#94a3b8">${l.unit||'pz'}</span></td>
          <td style="padding:13px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;color:#475569">${fmtCur(up)}</td>
          <td style="padding:13px 18px;border-bottom:1px solid #e2e8f0;text-align:right">
            ${origStruck3}
            <span style="font-size:14px;font-weight:800;color:#1e293b">${fmtCur(lf)}</span>${discBadge3}
          </td>
        </tr>`;
      }).join('') + (_extraMarked>0 ? `<tr>
          <td style="padding:13px 18px;border-bottom:1px solid #e2e8f0;vertical-align:top">
            <div style="font-size:13px;color:#1e293b;font-weight:600">Costi aggiuntivi</div>
            <span style="margin-top:4px;display:inline-block;padding:2px 9px;background:#f1f5f9;border-radius:20px;font-size:10px;color:#64748b">Extra</span>
          </td>
          <td style="padding:13px 10px;border-bottom:1px solid #e2e8f0;text-align:center;font-size:13px;color:#475569">1</td>
          <td style="padding:13px 10px;border-bottom:1px solid #e2e8f0;text-align:right;font-size:13px;color:#475569">${fmtCur(_extraMarked)}</td>
          <td style="padding:13px 18px;border-bottom:1px solid #e2e8f0;text-align:right"><span style="font-size:14px;font-weight:800;color:#1e293b">${fmtCur(_extraMarked)}</span></td>
        </tr>` : '');

      const html = `<!DOCTYPE html><html><head><meta charset="UTF-8">
<title>Preventivo ${jobName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:${th.font};background:${th.bodyBg};color:#1e293b;font-size:14px;padding:32px;max-width:840px;margin:0 auto}
  .editable{outline:none;cursor:text;border-bottom:1.5px dashed transparent;transition:border .2s;display:inline-block;min-width:20px}
  .editable:hover{border-bottom-color:${ac}44}
  .editable:focus{border-bottom-color:${ac};background:${ac}08}
  @media print{.editable{border-bottom-color:transparent!important}.no-print{display:none!important}}
</style></head><body>

<!-- Print hint bar -->
<div class="no-print" style="position:fixed;top:0;left:0;right:0;background:${ac};color:#fff;text-align:center;padding:8px;font-size:13px;font-weight:700;z-index:9999">
  ✏️ Clicca su qualsiasi testo per modificarlo &nbsp;·&nbsp; <kbd style="background:rgba(0,0,0,.25);padding:2px 7px;border-radius:4px">Ctrl+P</kbd> per stampare/salvare come PDF &nbsp;·&nbsp;
  <span class="no-print" style="cursor:pointer;text-decoration:underline" onclick="this.closest('div').style.display='none'">Nascondi</span>
</div>
<div style="height:40px" class="no-print"></div>

<!-- HEADER -->
<div style="background:${th.hBg};border-radius:${th.radius};padding:28px 32px;margin-bottom:24px;display:flex;justify-content:space-between;align-items:flex-start">
  <div>
    <div style="font-size:22px;font-weight:800;color:${th.hFg}" contenteditable class="editable">${company}</div>
    <div style="font-size:12px;color:${th.hFg}aa;margin-top:4px" contenteditable class="editable">${tagline}</div>
  </div>
  <div style="text-align:right">
    <div style="font-size:26px;font-weight:900;color:${ac}" contenteditable class="editable">PREVENTIVO</div>
    <div style="font-size:11px;color:${th.hFg}99;margin-top:4px">${quoteNum} · ${dateStr}</div>
  </div>
</div>

<!-- CLIENT + GREETING -->
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:${th.radius};padding:22px 28px;margin-bottom:20px">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:18px">
    <div>
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">PREPARATO PER</div>
      <div style="font-size:16px;font-weight:800;color:#0f172a" contenteditable class="editable">${clientName||'—'}</div>
      <div style="font-size:12px;color:#64748b;margin-top:2px" contenteditable class="editable">${jobName}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.8px;margin-bottom:6px">VALIDITÀ OFFERTA</div>
      ${s.showValidity?`<div style="display:inline-block;background:${ac}18;border:1.5px solid ${ac}40;border-radius:20px;padding:4px 14px;font-size:12px;font-weight:700;color:${ac}">📅 Valido fino al: ${deadlineStr}</div>`:''}
    </div>
  </div>
  <div style="font-size:14px;line-height:1.7;color:#374151" contenteditable class="editable">${greeting}</div>
</div>

<!-- TABLE -->
<table style="width:100%;border-collapse:collapse;background:#fff;border-radius:${th.radius};overflow:hidden;border:1px solid #e2e8f0;margin-bottom:20px">
  <thead>
    <tr style="background:${ac}">
      <th style="padding:12px 18px;text-align:left;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px">Descrizione</th>
      <th style="padding:12px 10px;text-align:center;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px">Qtà</th>
      <th style="padding:12px 10px;text-align:right;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px">Prezzo Unit.</th>
      <th style="padding:12px 18px;text-align:right;font-size:11px;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.6px">Totale</th>
    </tr>
  </thead>
  <tbody>${rowsHTML}</tbody>
</table>

<!-- TOTALS -->
<div style="display:flex;justify-content:flex-end;margin-bottom:20px">
  <div style="width:280px;background:#fff;border:1px solid #e2e8f0;border-radius:${th.radius};overflow:hidden">
    <div style="display:flex;justify-content:space-between;padding:10px 18px;border-bottom:1px solid #f1f5f9">
      <span style="color:#64748b;font-size:13px">Subtotale</span>
      <span style="font-weight:600;font-size:13px">${fmtCur(subFinal)}</span>
    </div>
    ${withIVA?`<div style="display:flex;justify-content:space-between;padding:10px 18px;border-bottom:1px solid #f1f5f9">
      <span style="color:#64748b;font-size:13px">IVA 22%</span>
      <span style="font-weight:600;font-size:13px">${fmtCur(vatAmt)}</span>
    </div>`:''}
    <div style="display:flex;justify-content:space-between;padding:14px 18px;background:${ac}">
      <span style="color:#fff;font-size:14px;font-weight:700">TOTALE</span>
      <span style="color:#fff;font-size:18px;font-weight:900">${fmtCur(grand)}</span>
    </div>
  </div>
</div>

${s.showDiscount&&discount>0?`
<!-- DISCOUNT BOX -->
<div style="background:linear-gradient(135deg,#f0fdf4,#dcfce7);border:2px solid #22c55e40;border-radius:${th.radius};padding:18px 24px;margin-bottom:20px;display:flex;align-items:center;gap:16px">
  <div style="font-size:28px">🎯</div>
  <div>
    <div style="font-size:13px;font-weight:700;color:#15803d">PREZZO RISERVATO A TE</div>
    <div style="font-size:13px;color:#166534;margin-top:3px">Risparmi <strong>${fmtCur(saved)}</strong> rispetto al prezzo base — Offerta valida ${validDays} giorni</div>
  </div>
</div>`:''}

<!-- NOTES + CLOSING -->
<div style="background:#fff;border:1px solid #e2e8f0;border-radius:${th.radius};padding:22px 28px;margin-bottom:20px">
  ${s.notes?`<div style="font-size:13px;color:#475569;margin-bottom:16px;line-height:1.7" contenteditable class="editable">${s.notes}</div>`:''}
  <div style="font-size:14px;line-height:1.7;color:#374151" contenteditable class="editable">${closing}</div>
  <div style="margin-top:32px;font-size:12px;font-weight:700;color:#0f172a" contenteditable class="editable">${company}</div>
</div>

${s.showTerms?`
<!-- TERMS -->
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:${th.radius};padding:16px 24px;font-size:11px;color:#94a3b8;line-height:1.6">
  <div style="font-weight:700;margin-bottom:6px;color:#64748b">CONDIZIONI GENERALI</div>
  <div contenteditable class="editable">Il presente preventivo è valido per ${validDays} giorni. I prezzi si intendono IVA ${withIVA?'inclusa':'esclusa'}. La conferma dell'ordine avviene tramite risposta scritta. Per qualsiasi informazione non esiti a contattarci.</div>
</div>`:''}

<\/body><\/html>`;

      _win.document.open();
      _win.document.write(html);
      _win.document.close();
      toast('✅ PDF Cliente aperto — modifica e stampa con Ctrl+P','success');
    }catch(err){
      console.error('[PDF Cliente]',err);
      toast('❌ Errore: '+err.message,'warning');
      try{ _win.close(); }catch(_){}
    }
  })();
};

// _doClientPDF kept as alias for any legacy calls
Quoter._doClientPDF = function(){ Quoter.exportClientPDF(); };


// Auto-render quote list when section opens
setTimeout(()=>{
  const origNav = App.navigate?.bind(App);
  if(origNav && !App.navigate._v58patch){
    App.navigate = function(section){
      origNav(section);
      if(section==='quoter') setTimeout(()=>Quoter.renderList(), 300);
    };
    App.navigate._v58patch = true;
  }
}, 2000);

// ════════════════════════════════════════════════════════════════
// 🎯 RESOURCE PICKER MODAL — v58
// ════════════════════════════════════════════════════════════════
Quoter._rpData = [];       // all items for current cat
Quoter._rpFiltered = [];   // after search
Quoter._rpView = 'list';   // 'grid' | 'list'
Quoter._rpCat = 'all';     // active sidebar cat

Quoter.openResourcePicker = async function(){
  const modal = eid('qrp-modal');
  if(!modal) return;
  modal.style.display = 'flex';
  const searchEl = eid('qrp-search');
  if(searchEl) searchEl.value = '';
  this._rpStockFilter = 'all';
  this._rpHierarchy = null;
  await this._loadRPData();
  this._rpCat = 'all';
  this._renderRPCats();
  this._renderRPHierarchy();
  this.filterResources();
};

Quoter.closeResourcePicker = function(){
  const modal = eid('qrp-modal');
  if(modal) modal.style.display = 'none';
};

Quoter._loadRPData = async function(){
  const cat = eid('ql-cat')?.value || '';

  // Colour palette
  const catColors = {
    'Legno':'#a16207','MDF':'#78716c','Plexiglass':'#06b6d4','Sughero':'#b45309',
    'Feltro & Tessuto':'#ec4899','Pelle':'#92400e','Metallo':'#64748b',
    'Carta & Cartone':'#d1d5db','Macchinari':'#f59e0b',
    'Gadget':'#f472b6','LED & Illuminazione':'#fbbf24','Minuteria':'#94a3b8',
    'Magneti':'#818cf8','Packaging':'#34d399','Portachiavi':'#38bdf8',
    'Frame & Cornici':'#e879f9','Lightbox':'#fb923c','Adesivi':'#4ade80',
    'Colori & Finitura':'#f87171','Vernici':'#c084fc',
    'Default':'#6366f1','Legacy':'#475569','Catalogo':'#10b981','Team':'#60a5fa'
  };
  const catEmoji = {
    'Legno':'🪵','MDF':'⬛','Plexiglass':'💎','Sughero':'🍂',
    'Feltro & Tessuto':'🧵','Pelle':'🐄','Metallo':'🔩','Carta & Cartone':'📄',
    'Macchinari':'⚡','Gadget':'🎁','LED & Illuminazione':'💡',
    'Minuteria':'🔧','Magneti':'🧲','Packaging':'📦','Portachiavi':'🔑',
    'Frame & Cornici':'🖼️','Lightbox':'🔆','Adesivi':'🔗','Colori & Finitura':'🎨',
    'Vernici':'🎨','Default':'⚙️','Team':'👤','Catalogo':'📋','Legacy':'📁'
  };
  const colorFor  = g => catColors[g] || '#6366f1';
  const emojiFor  = g => catEmoji[g]  || '📦';

  const getMagazzinoItems = async (catKeys=[]) => {
    const all = await AppStore.get('items').catch(()=>[]);
    return catKeys.length ? all.filter(i => catKeys.includes(i.category||'Altro')) : all;
  };

  let items = [];

  if(cat === 'materiale'){
    const matCats = ['Legno','MDF','Plexiglass','Sughero','Carta & Cartone','Feltro & Tessuto','Pelle','Metallo'];
    const mats = await getMagazzinoItems(matCats);
    mats.forEach(i => {
      const qty = +(i.quantity ?? i.qty ?? 0);
      const avail = qty <= 0 ? '❌ Esaurito' : qty <= +(i.minStock??1) ? '⚠️ Scorta bassa' : '';
      const availKey = qty <= 0 ? 'out' : qty <= +(i.minStock??1) ? 'low' : 'ok';
      const dims = (i.width && i.height) ? `${i.width}×${i.height}${i.thickness?'×'+i.thickness:''}mm` : '';
      items.push({
        label: i.name, cost: i.costPrice||0, unit: i.unit||'mq',
        group: i.category||'Materiale', color: colorFor(i.category),
        emoji: emojiFor(i.category),
        meta: `${fmtCur(i.costPrice||0)}/${i.unit||'mq'}${dims?' · '+dims:''}${avail?' · '+avail:''}${i.supplier?' · '+i.supplier:''}`,
        id: i.id, dims, avail, availKey, supplier: i.supplier||'', sku: i.sku||'',
        qty, minStock: +(i.minStock??1)
      });
    });
    // Legacy fallback
    const old = (await AppStore.get('materials').catch(()=>[])).filter(m=>m.type==='material');
    old.forEach(m => items.push({
      label:m.name, cost:m.cost, unit:m.unit,
      group:'Legacy', color:colorFor('Legacy'), emoji:'📁',
      meta:`${fmtCur(m.cost)} ${m.unit}`
    }));

  } else if(cat === 'verniciatura'){
    const paints = await IDB.getAll('paints').catch(()=>[]);
    paints.forEach(p => {
      const tipo = p.tipo||p.type||'smalto';
      const cov = tipo==='spray'?8:tipo==='smalto'?6:tipo==='epossidica'?4:10;
      const cpm = (p.costoUnitario||p.cost||0)/cov;
      items.push({
        label: `${p.nome||p.name}${p.ral?' RAL'+p.ral:''}`,
        cost: cpm, unit:'m²',
        group:'Vernici', color:'#c084fc', emoji:'🎨',
        meta:`${tipo} · ${fmtCur(cpm)}/m² · copertura ${cov}m²/ud`,
        coverage:cov, unitCost:p.costoUnitario||p.cost||0, tipo
      });
    });
    const colori = await getMagazzinoItems(['Colori & Finitura']);
    colori.forEach(i => items.push({
      label: i.name, cost:(i.costPrice||0)/6, unit:'m²',
      group:'Colori & Finitura', color:colorFor('Colori & Finitura'), emoji:'🖌️',
      meta:`Magazzino · ${fmtCur((i.costPrice||0)/6)}/m²`, id:i.id
    }));
    if(!items.length){
      [{name:'Verniciatura Bianca',cost:8},{name:'Spray Acrilico',cost:6.5},
       {name:'Vernice Epossidica',cost:18},{name:'Primer',cost:5.5}
      ].forEach(v => items.push({
        label:v.name, cost:v.cost, unit:'m²',
        group:'Default', color:'#6366f1', emoji:'🎨',
        meta:`default · ${fmtCur(v.cost)}/m²`
      }));
    }

  } else if(cat === 'laser'){
    const macch = await getMagazzinoItems(['Macchinari']);
    macch.forEach(i => {
      const cpm = i.costPerMin||i.costPrice||0.35;
      items.push({
        label:i.name, cost:cpm, unit:'€/min',
        group:'Macchinari', color:'#f59e0b', emoji:'⚡',
        meta:`${fmtCur(cpm)}/min${i.notes?' · '+i.notes.substring(0,40):''}`
      });
    });
    const oldM = (await AppStore.get('materials').catch(()=>[])).filter(m=>m.type==='machine');
    oldM.forEach(m => items.push({
      label:m.name, cost:m.cost, unit:'€/min',
      group:'Legacy', color:'#475569', emoji:'⚙️',
      meta:`${fmtCur(m.cost)}/min`
    }));
    const cfg = await IDB.get('settings','main')||{};
    items.unshift({
      label:'Laser Generico (impostazioni)',
      cost:cfg.machineCost||0.35, unit:'€/min',
      group:'Default', color:'#6366f1', emoji:'🔥',
      meta:`${fmtCur(cfg.machineCost||0.35)}/min · da Impostazioni`
    });

  } else if(cat === 'manodopera'){
    const cfg = await IDB.get('settings','main')||{};
    items.push({
      label:'Manodopera Generica',
      cost:cfg.laborCost||0.50, unit:'€/min',
      group:'Default', color:'#6366f1', emoji:'👷',
      meta:`${fmtCur(cfg.laborCost||0.50)}/min · da Impostazioni`
    });
    const team = await IDB.getAll('team').catch(()=>[]);
    team.forEach(t => items.push({
      label:t.name,
      cost:+(+(t.rate||30)/60).toFixed(4), unit:'€/min',
      group:t.role||'Team', color:colorFor('Team'), emoji:'👤',
      meta:`${t.role||'Team'} · €${(+(t.rate||30)/60).toFixed(2)}/min`
    }));

  } else if(cat === 'gadget'){
    const gadgetCats=['Gadget','LED & Illuminazione','Minuteria','Packaging','Portachiavi','Frame & Cornici','Lightbox','Adesivi','Magneti'];
    const gadgets = await getMagazzinoItems(gadgetCats);
    gadgets.forEach(i => {
      const qty = +(i.quantity??i.qty??0);
      const avail = qty<=0?'❌':qty<=(+(i.minStock??1))?'⚠️':'';
      items.push({
        label:i.name, cost:i.costPrice||0, unit:i.unit||'pz',
        group:i.category||'Gadget', color:colorFor(i.category), emoji:emojiFor(i.category),
        meta:`${fmtCur(i.costPrice||0)}/${i.unit||'pz'}${avail?' · '+avail:''}${i.supplier?' · '+i.supplier:''}`,
        id:i.id
      });
    });
    const oldG = await IDB.getAll('gadgets').catch(()=>[]);
    oldG.forEach(g => items.push({
      label:g.name, cost:g.cost||0, unit:g.unit||'pz',
      group:'Gadget (Legacy)', color:'#475569', emoji:'🎁',
      meta:`${fmtCur(g.cost||0)}/${g.unit||'pz'}`
    }));

  } else if(cat === 'catalogo'){
    const catalog = await AppStore.get('catalog').catch(()=>[]);
    catalog.forEach(c => items.push({
      label:c.name, cost:c.costPrice, unit:'pz', sale:c.salePrice,
      group:c.category||'Catalogo', color:colorFor('Catalogo'), emoji:'📋',
      meta:`costo ${fmtCur(c.costPrice)} · vendita ${fmtCur(c.salePrice)}`
    }));

  } else {
    // No category selected: mostra tutti dal Magazzino
    const all = await AppStore.get('items').catch(()=>[]);
    all.forEach(i => items.push({
      label:i.name, cost:i.costPrice||0, unit:i.unit||'pz',
      group:i.category||'Altro',
      color:colorFor(i.category), emoji:emojiFor(i.category),
      meta:`${fmtCur(i.costPrice||0)}/${i.unit||'pz'} · ${i.category||'Altro'}`,
      id:i.id
    }));
  }

  this._rpData = items;
};

Quoter._renderRPCats = function(){
  const container = eid('qrp-cats');
  if(!container) return;
  const groups = ['all', ...new Set(this._rpData.map(i=>i.group))];
  const EM = {
    'Legno':'🪵','MDF':'⬛','Plexiglass':'💎','Sughero':'🍂','Feltro & Tessuto':'🧵',
    'Pelle':'🐄','Metallo':'🔩','Carta & Cartone':'📄','Macchinari':'⚡',
    'Gadget':'🎁','LED & Illuminazione':'💡','Minuteria':'🔧','Magneti':'🧲',
    'Packaging':'📦','Portachiavi':'🔑','Frame & Cornici':'🖼️','Lightbox':'🔆',
    'Adesivi':'🔗','Colori & Finitura':'🎨','Vernici':'🎨','Default':'⚙️',
    'Legacy':'📁','Catalogo':'📋','Team':'👤','Manodopera':'👷'
  };
  container.innerHTML = groups.map(g=>{
    const cnt = g==='all' ? this._rpData.length : this._rpData.filter(i=>i.group===g).length;
    const on  = g===this._rpCat;
    const ico = g==='all' ? '⭐' : (EM[g]||'📁');
    const sg  = g.replace(/'/g,"\\'");
    return `<button onclick="Quoter._rpCat='${sg}';Quoter._renderRPCatBtns();Quoter.filterResources()"
      id="qrp-cat-${g.replace(/[\s&]/g,'_')}" class="rp-cat${on?' on':''}">
      <span>${ico} ${g==='all'?'Tutti':g}</span>
      <span class="rp-cc">${cnt}</span>
    </button>`;
  }).join('');
  // update subtitle
  const lbl = eid('qrp-cat-label');
  if(lbl) lbl.textContent = this._rpCat==='all' ? 'Tutti i materiali e servizi' : this._rpCat;
};

Quoter._renderRPCatBtns = function(){
  const groups = ['all', ...new Set(this._rpData.map(i=>i.group))];
  groups.forEach(g=>{
    const btn = eid('qrp-cat-'+g.replace(/[\s&]/g,'_'));
    if(!btn) return;
    btn.className = 'rp-cat' + (g===this._rpCat?' on':'');
  });
  const lbl = eid('qrp-cat-label');
  if(lbl) lbl.textContent = this._rpCat==='all' ? 'Tutti i materiali e servizi' : this._rpCat;
};

Quoter._rpStockFilter = 'all';
Quoter.filterResources = function(){
  const q  = (eid('qrp-search')?.value||'').toLowerCase();
  const sf = this._rpStockFilter||'all';
  this._rpFiltered = (this._rpData||[]).filter(i=>{
    const mCat = this._rpCat==='all' || i.group===this._rpCat;
    const mQ   = !q || i.label.toLowerCase().includes(q) || (i.meta||'').toLowerCase().includes(q)
                     || (i.supplier||'').toLowerCase().includes(q) || (i.sku||'').toLowerCase().includes(q);
    const mSt  = sf==='all'  ? true
               : sf==='ok'   ? (!i.avail || i.avail==='')
               : sf==='low'  ? (i.avail||'').includes('Scorta')
               : sf==='out'  ? (i.avail||'').includes('Esaurito') : true;
    return mCat && mQ && mSt;
  });
  // Chip active state
  ['all','ok','low','out'].forEach(f=>{
    const b = eid('qrp-sf-'+f);
    if(b) b.className = 'rp-sf'+(f===sf?' on':'');
  });
  // Count badge
  const cnt = eid('qrp-count');
  if(cnt){ const n=this._rpFiltered.length; cnt.textContent=n+' risorsa'+(n!==1?'e':''); }
  this._renderRPItems();
};

Quoter._renderRPHierarchy = function(){ /* deprecated v83 */ };

Quoter.setResourceView = function(v){
  this._rpView = v;
  const gb=eid('qrp-grid-btn'), lb=eid('qrp-list-btn');
  if(gb){ gb.style.background=v==='grid'?'#0ea5e9':'transparent'; gb.style.color=v==='grid'?'#fff':'#64748b'; }
  if(lb){ lb.style.background=v==='list'?'#0ea5e9':'transparent'; lb.style.color=v==='list'?'#fff':'#64748b'; }
  const cont=eid('qrp-items');
  if(cont){ cont.className=v==='grid'?'rp-ic':'rp-il'; }
  this._renderRPItems();
};

Quoter._renderRPItems = function(){
  const cont  = eid('qrp-items');
  if(!cont) return;
  const items = this._rpFiltered || [];
  const cnt   = eid('qrp-count');
  if(cnt){ cnt.textContent=items.length+' risorsa'+(items.length!==1?'e':''); }

  if(!items.length){
    cont.innerHTML=`<div style="grid-column:1/-1;padding:48px;text-align:center">
      <div style="font-size:40px;margin-bottom:14px;opacity:.4">🔍</div>
      <div style="font-size:13px;color:#475569;font-weight:600">Nessuna risorsa trovata</div>
      <div style="font-size:11px;color:#334155;margin-top:6px">Prova ad allargare il filtro o aggiungi articoli al Magazzino</div>
    </div>`;
    return;
  }

  const isList   = this._rpView === 'list';
  const curLabel = eid('ql-resource-label')?.textContent||'';

  cont.innerHTML = items.map((item,idx)=>{
    const sel  = curLabel && curLabel===item.label;
    const bgIco= item.color+'22';
    const brIco= item.color+'44';
    const avBadge = item.avail ? `<span class="rp-avb">${item.avail.split(' ')[0]}</span>` : '';

    if(isList){
      return `<div onclick="Quoter._selectResource(${idx})" class="rp-lc${sel?' sel':''}">
        <div class="rp-ico" style="background:${bgIco};border:1px solid ${brIco}">${item.emoji}</div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:700;color:#f1f5f9;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.label}</div>
          <div style="font-size:10px;color:#64748b;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.meta||''}</div>
        </div>
        <div style="text-align:right;flex-shrink:0">
          <div style="font-size:14px;font-weight:800;color:${item.color}">${fmtCur(item.cost)}</div>
          <div style="font-size:10px;color:#475569">${item.unit||'pz'}</div>
        </div>
        ${sel?'<span style="color:#22c55e;font-size:16px;font-weight:700;flex-shrink:0">✓</span>':''}
      </div>`;
    } else {
      return `<div onclick="Quoter._selectResource(${idx})" class="rp-gc${sel?' sel':''}">
        ${sel?'<span class="rp-sel-ck">✓</span>':''}
        ${avBadge}
        <div class="rp-gio" style="background:${bgIco};border:1px solid ${brIco}">${item.emoji}</div>
        <div style="font-size:12px;font-weight:700;color:#f1f5f9;margin-bottom:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${item.label}</div>
        <div style="font-size:12px;font-weight:800;color:${item.color}">${fmtCur(item.cost)}</div>
        <div style="font-size:10px;color:#475569;margin-top:1px">${item.unit||'pz'}</div>
        ${item.dims?`<div style="font-size:9px;color:#334155;margin-top:3px">${item.dims}</div>`:''}
      </div>`;
    }
  }).join('');
};

Quoter._selectResource = function(idx){
  const item = this._rpFiltered[idx];
  if(!item) return;

  // Update hidden select
  const sel = eid('ql-resource');
  if(sel){
    // find matching option or create one
    let found = false;
    for(let o of sel.options){
      if(parseFloat(o.dataset.cost)===item.cost && o.textContent.includes(item.label.substring(0,15))){
        sel.value = o.value; found = true; break;
      }
    }
    if(!found){
      const opt = document.createElement('option');
      opt.textContent = item.label; opt.value = item.label;
      opt.dataset.cost = item.cost; opt.dataset.unit = item.unit||'pz';
      if(item.sale) opt.dataset.sale = item.sale;
      sel.appendChild(opt); sel.value = item.label;
    }
  }

  // Update display pill
  const lbl = eid('ql-resource-label');
  if(lbl){ lbl.textContent = item.label; lbl.style.color = 'var(--text)'; }
  const disp = eid('ql-resource-display');
  if(disp) disp.style.borderColor = '#22c55e';

  // Trigger cost update
  if(eid('ql-unit-cost')) eid('ql-unit-cost').value = item.cost.toFixed(4);
  if(item.sale && eid('qr-markup')){
    const markup = item.sale>0?Math.round((item.sale-item.cost)/item.cost*100):100;
    eid('qr-markup').value = markup>0?markup:100;
  }
  // Se è una vernice, pre-compila il campo COLORE/FINITURA
  if(item.group==='Vernici'||item.group==='Colori & Finitura'){
    if(eid('ql-color-text')&&!eid('ql-color-text').value) eid('ql-color-text').value = item.label;
    // Sincronizza anche la select paints
    const ps=eid('ql-color-paint');
    if(ps){ for(const o of ps.options){ if(o.dataset.name===item.label){ ps.value=o.value; Quoter.onPaintColorChange(); break; } } }
  }
  // Se ha dimensioni, suggerisci nei campi W/H (solo se vuoti)
  if(item.dims){
    const parts=item.dims.replace('mm','').split('×');
    if(parts[0]&&!+eid('ql-w')?.value&&eid('ql-w')) eid('ql-w').value=+parts[0]/10; // mm→cm
    if(parts[1]&&!+eid('ql-h')?.value&&eid('ql-h')) eid('ql-h').value=+parts[1]/10;
  }
  Quoter.calcItem?.();
  this.closeResourcePicker();
  toast(`✅ ${item.label} selezionato`, 'success');
};

// Patch clearResource to also reset display pill
(()=>{
  const _orig = Quoter.clearResource?.bind(Quoter);
  Quoter.clearResource = function(){
    if(_orig) _orig();
    const lbl = eid('ql-resource-label');
    if(lbl){ lbl.textContent='-- Scegli risorsa --'; lbl.style.color='var(--text-muted)'; }
    const disp = eid('ql-resource-display');
    if(disp) disp.style.borderColor = 'var(--border)';
  };
})();

// ════════════════════════════════════════════════════════════════
// 💶 ITEMS MODULE — IVA Toggle  v58
// ════════════════════════════════════════════════════════════════
ItemsModule._ivaMode = 'inclusa'; // 'inclusa' | 'esclusa'

ItemsModule.setIVA = function(mode){
  this._ivaMode = mode;
  const incBtn = eid('im-iva-inc-btn');
  const excBtn = eid('im-iva-exc-btn');
  const hint   = eid('im-iva-hint');
  const costLbl = eid('im-cost-label');
  const saleLbl = eid('im-sale-label');

  if(incBtn){
    incBtn.style.background = mode==='inclusa'?'#22c55e':'transparent';
    incBtn.style.color      = mode==='inclusa'?'#fff':'var(--text-muted)';
  }
  if(excBtn){
    excBtn.style.background = mode==='esclusa'?'#ef4444':'transparent';
    excBtn.style.color      = mode==='esclusa'?'#fff':'var(--text-muted)';
  }

  const cfg = IDB.get ? null : {};
  IDB.get('settings','main').then(cfg=>{
    const vat = cfg?.vat ?? 22;
    if(hint) hint.textContent = mode==='inclusa'
      ? `IVA ${vat}% già compresa nel prezzo`
      : `IVA ${vat}% da aggiungere al prezzo netto`;
    if(costLbl) costLbl.textContent = mode==='inclusa' ? '💶 Costo (IVA incl.)' : '💶 Costo (imponibile)';
    if(saleLbl) saleLbl.textContent = mode==='inclusa' ? '💰 Vendita (IVA incl.)' : '💰 Vendita (imponibile)';
  }).catch(()=>{
    if(hint) hint.textContent = mode==='inclusa'?'IVA inclusa':'IVA esclusa';
  });
};

// Patch openForm to restore IVA mode from saved item
(()=>{
  const _origOpen = ItemsModule.openForm?.bind(ItemsModule);
  ItemsModule.openForm = async function(id){
    await _origOpen(id);
    const mode = (id && await IDB.get('items',+id).catch(()=>null))?.ivaMode || 'inclusa';
    ItemsModule.setIVA(mode);
  };

  const _origSave = ItemsModule.saveItem?.bind(ItemsModule);
  ItemsModule.saveItem = async function(){
    // inject ivaMode before save by patching the item
    const _origPut = IDB.put?.bind(IDB);
    IDB.put = async function(store, obj){
      if(store==='items') obj.ivaMode = ItemsModule._ivaMode;
      IDB.put = _origPut;
      return _origPut(store, obj);
    };
    await _origSave();
  };
})();

// ════════════════════════════════════════════════════════════════
// 🧠 ANCHORING — 3-Tier AI Pricing  v60
// ════════════════════════════════════════════════════════════════
const StoreUnification = {
  _KEY: 'ingly_store_unification_v12',

  async run() {
    if (localStorage.getItem(this._KEY)) return; // already done
    try {
      // Any reads from old 'material' store → migrate to 'materials'
      // The IDB doesn't have a separate 'material' store in v12, it was always 'materials'
      // But some code may have written to items with type='material' in 'items' store
      // Ensure items of type material also exist in materials store
      const items = await AppStore.get('items').catch(()=>[]);
      const mats = await AppStore.get('materials').catch(()=>[]);
      const matIds = new Set(mats.map(m => m.legacyId || m.originalId));

      const toMigrate = items.filter(i => i.type === 'material' && !matIds.has(i.id));
      for (const item of toMigrate) {
        const mat = {
          ...item,
          id: Date.now() + Math.random(),
          legacyId: item.id,
          type: 'material',
          _migrated: true
        };
        await IDB.put('materials', mat).catch(()=>{});
      }

      if (toMigrate.length) {
        console.log(`[StoreUnification] Migrated ${toMigrate.length} items → materials`);
        Bus.emit('data:updated', { store: 'materials' });
      }

      localStorage.setItem(this._KEY, '1');
      console.log('[StoreUnification] ✅ v12 unification complete');
    } catch(e) {
      console.warn('[StoreUnification]', e);
    }
  }
};

// ══════════════════════════════════════════════════════════════════════
// INVENTORY REORDER ENGINE  v78
// Quando stock < minStock, genera una bozza ordine di acquisto.
// Integrato con SmartNotif e StockAlert.
// ══════════════════════════════════════════════════════════════════════
const InventoryReorder = {

  // ── Scan and create purchase order drafts ─────────────────────────────
  async checkAndCreatePOs() {
    try {
      const [items, materials, orders] = await Promise.all([
        IDB.getAll('items').catch(()=>[]),
        IDB.getAll('materials').catch(()=>[]),
        IDB.getAll('orders').catch(()=>[]),
      ]);

      // Items below reorder level that don't already have an open PO
      const openPOs = orders.filter(o => o.type === 'acquisto' && o.status !== 'consegnato');
      const openPOItems = new Set(openPOs.flatMap(o => o.lines?.map(l => l.itemId) || []));

      const allStock = [...items, ...materials];
      const needReorder = allStock.filter(m => {
        if (openPOItems.has(m.id)) return false; // PO already exists
        const qty = +m.quantity || +m.qty || +m.stockQty || 0;
        const min = +m.minStock || +m.minQty || 0;
        return min > 0 && qty <= min;
      });

      if (!needReorder.length) return 0;

      // Group by supplier
      const bySupplier = {};
      needReorder.forEach(m => {
        const sup = m.supplier || '—';
        if (!bySupplier[sup]) bySupplier[sup] = [];
        bySupplier[sup].push(m);
      });

      let created = 0;
      for (const [supplier, items] of Object.entries(bySupplier)) {
        const lines = items.map(m => ({
          itemId:   m.id,
          name:     m.name,
          unit:     m.unit || 'pz',
          qty:      Math.max(+m.minStock || 1, 5), // reorder qty = minStock or at least 5
          cost:     +m.cost || +m.costPrice || 0,
          subtotal: Math.max(+m.minStock || 1, 5) * (+m.cost || +m.costPrice || 0),
        }));
        const total = lines.reduce((a, l) => a + l.subtotal, 0);

        const po = {
          type:      'acquisto',
          title:     `Ordine acquisto — ${supplier}`,
          supplier,
          date:      today(),
          status:    'bozza',
          priority:  'Alta',
          lines,
          total,
          notes:     `Generato automaticamente da Inventory Reorder Engine. ${lines.length} articolo/i sotto scorta minima.`,
          autoGenerated: true,
          _upd:      Date.now(),
        };
        await IDB.put('orders', po);
        created++;
      }

      if (created > 0) {
        Bus.emit('data:updated', { store: 'orders' });
        toast(`📦 ${created} bozza/e ordine acquisto create automaticamente → sezione Ordini`, 'info');
      }
      return created;
    } catch(e) {
      console.warn('[InventoryReorder]', e);
      return 0;
    }
  },

  // ── Manual trigger from StockAlert page ──────────────────────────────
  async triggerFromUI() {
    toast('Verifica scorte e creazione ordini acquisto...', 'success');
    const count = await this.checkAndCreatePOs();
    if (count === 0) {
      toast('Nessun riordino necessario o ordini già aperti per tutti gli articoli', 'info');
    } else {
      if (await askConfirm(`${count} ordine/i acquisto creati. Aprire la sezione Ordini?`,{confirmLabel:'Apri Ordini',danger:false})) {
        App.navigate('orders');
      }
    }
  },
};




// ══════════════════════════════════════════════════════════════════════════════
// ORDER FLOW ENGINE v84  — Unified Order Pipeline
// Single source of truth: orders store
// Stages: draft→ready→sent→accepted→production→working→completed→delivery→
//         delivered→to_pay→deposit→paid  |  rejected
// ══════════════════════════════════════════════════════════════════════════════

window.Inventory = Inventory;
window.Materials = Materials;
window.Paints = Paints;
window.PatchKanban = PatchKanban;
window.getItemAvailability = getItemAvailability;
window.ItemsModule = ItemsModule;
window.MATERIAL_COLORS = MATERIAL_COLORS;
window.getMaterialColor = getMaterialColor;
window.ResourcePicker = ResourcePicker;
window.ItemsPicker = ItemsPicker;
window.StoreUnification = StoreUnification;
window.InventoryReorder = InventoryReorder;

