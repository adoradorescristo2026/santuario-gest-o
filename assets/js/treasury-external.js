(() => {
  'use strict';
  const A=window.TreasuryApp, db=A.loadData();
  const generalUser=A.generalUser(db); let treasurySession=A.readTreasurySession(db); let cash=A.activeExternalCash(db);
  let cart=[]; let category='Todos';
  let adjustmentAuthorization=null;
  const SALE_TYPES=['ALIMENTAÇÃO','VESTUÁRIO','PRODUTOS'];
  const $=s=>document.querySelector(s); const $$=s=>[...document.querySelectorAll(s)]; const num=v=>A.parseMoney(v);
  const normalizeSaleType=value=>{const raw=String(value||'').trim().toUpperCase();return SALE_TYPES.includes(raw)?raw:'';};
  function productSaleType(product={}){const explicit=normalizeSaleType(product.saleType);if(explicit)return explicit;const text=A.normalize(`${product.category||''} ${product.name||''}`);if(/bebida|alimento|comida|salgado|suco|refrigerante|agua|combo|lanche|doce|bolo|cantina/.test(text))return 'ALIMENTAÇÃO';if(/vestuario|roupa|camiseta|camisa|blusa|moletom|bone|boné|jaqueta/.test(text))return 'VESTUÁRIO';return 'PRODUTOS';}
  const cashSaleType=()=>normalizeSaleType(cash?.saleType);
  let activeTapToken='';
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  function integrationSettings(){
    const st=db.treasurySettings||{};
    const card=String(st.paymentProvider||'MANUAL').toUpperCase();
    const pix=String(st.pixProvider||'MANUAL_STATIC').toUpperCase();
    return{cardProvider:['MANUAL','INFINITEPAY','GENERIC_HTTP'].includes(card)?card:'MANUAL',pixProvider:['MANUAL_STATIC','INFINITEPAY','GENERIC_HTTP'].includes(pix)?pix:'MANUAL_STATIC',bridge:String(st.paymentBridgeUrl||'').trim(),pixEndpoint:String(st.pixStatusEndpoint||'').trim(),handle:String(st.infinitePayHandle||'').trim().replace(/^\$/,''),document:String(st.infinitePayDocument||'').trim(),cardChannel:String(st.infinitePayCardChannel||'TAP').toUpperCase()};
  }
  function providerOrderId(prefix='PAY'){return `${cash?.number||'TE'}-${prefix}-${Date.now().toString(36).toUpperCase()}`;}
  function paymentItems(amount){
    const t=totals();
    if(Math.abs(Number(t.discount||0))>.001)return[{quantity:1,priceCents:Math.max(1,Math.round(Number(amount||t.total)*100)),description:`Venda ${cash?.eventName||'Santuário Gestão'}`}];
    return cart.map(item=>({quantity:item.quantity,priceCents:Math.max(1,Math.round(Number(item.price||0)*100)),description:item.name}));
  }

  function guard(){if(!generalUser){location.replace('index.html');return false;}if(!treasurySession){location.replace('tesouraria-login.html');return false;}if(!A.canOperate(treasurySession.user,'external','access')){location.replace('tesouraria-painel.html');return false;}return true;}
  function init(){A.applyTheme();if(!guard())return;$('#posChurchName').textContent=db.church?.name||'Santuário Gestão';$('#posOperator').textContent=treasurySession.user.name;bind();render();if(!cash)setTimeout(openCashModal,180);}
  function bind(){
    $('#posThemeBtn').addEventListener('click',()=>A.toggleTheme());
    $('#posChoiceBtn').addEventListener('click',()=>location.href='tesouraria-painel.html');
    $('#posOpenBtn').addEventListener('click',openCashModal); $('#posCloseBtn').addEventListener('click',openCloseCashModal);
    $('#addByCodeBtn').addEventListener('click',addFromCode); $('#productCode').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();addFromCode();}}); $('#productCode').addEventListener('input',previewCode);
    $('#catalogSearch').addEventListener('input',renderCatalog); $('#catalogCategories').addEventListener('click',e=>{const b=e.target.closest('[data-category]');if(!b)return;category=b.dataset.category;renderCatalog();});
    $('#productCatalog').addEventListener('click',e=>{const b=e.target.closest('[data-product]');if(b)addProduct(b.dataset.product);});
    $('#posCartList').addEventListener('click',cartAction); $('#clearCartBtn').addEventListener('click',()=>{cart=[];renderCart();}); $('#saleDiscount').addEventListener('input',renderCart);
    $('#posPaymentMethods').addEventListener('click',e=>{const b=e.target.closest('[data-quick-payment]');if(!b||b.disabled)return;beginPayment(b.dataset.quickPayment);});
    $('#manageProductsBtn').addEventListener('click',openProductsModal); $('#cashAdjustmentBtn').addEventListener('click',openAdjustmentAuthorization);
    $('#closePosModal').addEventListener('click',closeModal); $('#posModalBackdrop').addEventListener('click',e=>{if(e.target===e.currentTarget)closeModal();});
    document.addEventListener('submit',handleSubmit); document.addEventListener('click',handleGlobalClick); document.addEventListener('input',handleModalInput);
    setInterval(()=>{treasurySession=A.readTreasurySession(db);if(!treasurySession)location.replace('tesouraria-login.html');},30000);

    // V1.5.2 — Web: atualiza o estado em memória em vez de recarregar a página.
    // Assim um formulário/modal aberto (principalmente ABERTURA DE CAIXA) não
    // desaparece e reaparece a cada sincronização do Railway.
    let remoteRefreshTimer=null;
    const refreshFromSharedState=()=>{
      if(!window.santuarioDesktop?.isWeb)return;
      clearTimeout(remoteRefreshTimer);
      remoteRefreshTimer=setTimeout(()=>{
        try{
          const fresh=A.loadData();
          const previousCashId=cash?.id||'';
          const hadCash=Boolean(cash);
          const nextCash=A.activeExternalCash(fresh);

          if(previousCashId&&!((fresh.externalCashSessions||[]).some(item=>item.id===previousCashId&&item.status==='Aberto'))){
            toast('Caixa encerrado','Esta operação foi encerrada por outro usuário.','error');
            setTimeout(()=>location.href='tesouraria-painel.html',900);
            return;
          }

          Object.keys(db).forEach(key=>delete db[key]);
          Object.assign(db,fresh);
          treasurySession=A.readTreasurySession(db);
          if(!treasurySession){location.replace('tesouraria-login.html');return;}
          cash=nextCash;
          render();

          // Se outro terminal acabou de abrir um caixa enquanto este navegador
          // ainda mostrava o formulário de abertura, fecha somente esse modal.
          if(!hadCash&&cash){
            const openingForm=document.querySelector('[data-pos-form="open-cash"]');
            if(openingForm){closeModal();toast('Caixa já aberto',`${cash.number} está em operação.`);}
          }
        }catch(_){}
      },180);
    };
    window.addEventListener('santuario:treasury-remote-refresh',refreshFromSharedState);
    window.santuarioDesktop?.onTreasuryDataChanged?.(refreshFromSharedState);
    window.addEventListener('storage',event=>{if(event.key===A.KEYS.data)refreshFromSharedState();});
  }
  function handleGlobalClick(e){const b=e.target.closest('[data-pos-action]');if(!b)return;const a=b.dataset.posAction,id=b.dataset.id;if(a==='cancel-modal')closeModal();if(a==='pix-mode')openPaymentModal('PIX',{pixMode:b.dataset.mode});if(a==='pix-generate')generatePixQrFromForm();if(a==='pix-copy')copyPixCode();if(a==='credit-installment')openPaymentModal('Cartão de crédito',{creditInstallments:Number(b.dataset.installments||1)});if(a==='marked-customer-type')selectMarkedCustomerType(b.dataset.type);if(a==='cash-verify')openCashVerifyScreen();if(a==='adjustment-back')openAdjustmentModal();if(a==='sale-cancel')openCancelSale(id);if(a==='product-new')openProductForm();if(a==='product-edit')openProductForm(id);if(a==='product-toggle')toggleProduct(id);if(a==='tap-cancel')cancelActiveTap();}

  function render(){cash=A.activeExternalCash(db);renderHeader();renderCategories();renderCatalog();renderCart();}
  function renderHeader(){const open=Boolean(cash),saleType=cashSaleType();$('#posCashStatus').textContent=open?'CAIXA ABERTO':'CAIXA FECHADO';$('#posCashStatus').className=`pos-status ${open?'open':'closed'}`;$('#posEventName').textContent=open?`${cash.eventName} · ${cash.pointOfSale}`:'Nenhum caixa aberto';$('#posSaleType').textContent=open?(saleType?`TIPO DE VENDA · ${saleType}`:'TIPO DE VENDA · LEGADO'):'TIPO DE VENDA NÃO DEFINIDO';$('#posOpenBtn').hidden=open;$('#posCloseBtn').hidden=!open;$('#productCode').disabled=!open;$('#addByCodeBtn').disabled=!open;$('#cashAdjustmentBtn').disabled=!open;}
  function renderCategories(){const saleType=cashSaleType();const available=db.treasuryProducts.filter(p=>p.active&&(!saleType||productSaleType(p)===saleType));const cats=['Todos',...new Set(available.map(p=>p.category))];if(!cats.includes(category))category='Todos';$('#catalogCategories').innerHTML=cats.map(c=>`<button class="${c===category?'active':''}" data-category="${A.esc(c)}">${A.esc(c)}</button>`).join('');}
  function visibleProducts(){const q=A.normalize($('#catalogSearch')?.value||''),saleType=cashSaleType();return db.treasuryProducts.filter(p=>p.active&&(!saleType||productSaleType(p)===saleType)&&(category==='Todos'||p.category===category)&&(!q||A.normalize(`${p.name} ${p.code} ${p.barcode} ${p.category} ${productSaleType(p)}`).includes(q)));}
  function renderCatalog(){const rows=visibleProducts(),saleType=cashSaleType();$('#productCatalog').innerHTML=rows.length?rows.map(p=>`<button class="pos-product-card ${p.stock<=p.minStock?'low-stock':''}" data-product="${p.id}" ${!cash||p.stock<=0?'disabled':''}><span class="pos-product-code">${A.esc(p.code)}</span><strong>${A.esc(p.name)}</strong><small>${A.esc(p.category)} · ${A.esc(productSaleType(p))}</small><div><b>${A.money(p.price)}</b><span>Estoque: ${p.stock}</span></div></button>`).join(''):`<div class="treasury-empty-state"><strong>${saleType?'Nenhum item disponível para '+A.esc(saleType):'Nenhum produto encontrado'}</strong><p>${saleType?'Cadastre ou classifique produtos neste tipo de venda.':'Revise a busca ou cadastre um novo item.'}</p></div>`;}
  function productByCode(code){const term=A.normalize(code),saleType=cashSaleType();return db.treasuryProducts.find(p=>p.active&&(!saleType||productSaleType(p)===saleType)&&(A.normalize(p.code)===term||A.normalize(p.barcode)===term))||null;}
  function previewCode(){const code=$('#productCode').value.trim(),p=code?productByCode(code):null;$('#productPreview').innerHTML=p?`<div class="preview-product"><span>${A.esc(p.code)}</span><div><strong>${A.esc(p.name)}</strong><small>${A.esc(p.category)} · Estoque ${p.stock}</small></div><b>${A.money(p.price)}</b></div>`:`<span class="preview-placeholder">${code?'Código não localizado.':'A informação do item aparecerá aqui.'}</span>`;}
  function addFromCode(){if(!ensureCash())return;const code=$('#productCode').value.trim();if(!code){toast('Informe o código','Digite ou leia o código do produto.','error');return;}const p=productByCode(code);if(!p){const any=db.treasuryProducts.find(item=>item.active&&(A.normalize(item.code)===A.normalize(code)||A.normalize(item.barcode)===A.normalize(code)));if(any&&cashSaleType()&&productSaleType(any)!==cashSaleType())toast('Item de outro tipo de venda',`${any.name} pertence a ${productSaleType(any)}. Este caixa está aberto para ${cashSaleType()}.`,'error');else toast('Item não encontrado',`Nenhum produto ativo para o código ${code}.`,'error');return;}addProduct(p.id);$('#productCode').value='';previewCode();$('#productCode').focus();}
  function addProduct(id){if(!ensureCash())return;const p=db.treasuryProducts.find(x=>x.id===id&&x.active);if(!p)return;const saleType=cashSaleType();if(saleType&&productSaleType(p)!==saleType){toast('Produto indisponível neste caixa',`${p.name} pertence a ${productSaleType(p)}.`,'error');return;}const item=cart.find(x=>x.productId===id),qty=(item?.quantity||0)+1;if(qty>p.stock&&!db.treasurySettings.allowNegativeStock){toast('Estoque insuficiente',`${p.name} possui ${p.stock} unidade(s).`,'error');return;}if(item)item.quantity=qty;else cart.push({productId:p.id,code:p.code,name:p.name,price:Number(p.price),cost:Number(p.cost||0),quantity:1,saleType:productSaleType(p)});renderCart();}
  function cartAction(e){const b=e.target.closest('[data-cart-action]');if(!b)return;const item=cart.find(x=>x.productId===b.dataset.id);if(!item)return;if(b.dataset.cartAction==='plus')addProduct(item.productId);if(b.dataset.cartAction==='minus'){item.quantity--;if(item.quantity<=0)cart=cart.filter(x=>x!==item);renderCart();}if(b.dataset.cartAction==='remove'){cart=cart.filter(x=>x!==item);renderCart();}}
  function totals(){const subtotal=A.sum(cart,i=>i.price*i.quantity),discount=Math.min(Math.max(num($('#saleDiscount')?.value),0),subtotal),total=Number((subtotal-discount).toFixed(2));return{subtotal,discount,total};}
  function renderCart(){const t=totals(),paymentDisabled=!cash||!cart.length||t.total<=0;$('#posCartList').innerHTML=cart.length?cart.map(i=>`<article class="pos-cart-item"><div><span>${A.esc(i.code)}</span><strong>${A.esc(i.name)}</strong><small>${A.money(i.price)} por unidade</small></div><div class="pos-qty"><button data-cart-action="minus" data-id="${i.productId}">−</button><b>${i.quantity}</b><button data-cart-action="plus" data-id="${i.productId}">+</button></div><strong>${A.money(i.price*i.quantity)}</strong><button class="pos-remove" data-cart-action="remove" data-id="${i.productId}">×</button></article>`).join(''):`<div class="pos-empty-cart"><span>▢</span><strong>Carrinho vazio</strong><p>Digite um código ou selecione um produto.</p></div>`;$('#posSubtotal').textContent=A.money(t.subtotal);$('#posDiscountView').textContent=`− ${A.money(t.discount)}`;$('#posGrandTotal').textContent=A.money(t.total);$$('[data-quick-payment]').forEach(button=>button.disabled=paymentDisabled);}
  function sessionSales(){return cash?A.sessionSales(db,cash.id):[];}
  function renderRecentSales(){const totalEl=$('#todaySalesTotal'),listEl=$('#recentSales');if(!totalEl||!listEl)return;const rows=sessionSales().sort((a,b)=>String(b.createdAt).localeCompare(String(a.createdAt)));totalEl.textContent=A.money(A.sum(rows,s=>s.total));listEl.innerHTML=rows.length?rows.slice(0,8).map(s=>`<article><div><strong>${A.esc(s.number)}</strong><small>${new Date(s.createdAt).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})} · ${(s.payments||[]).map(p=>p.method).join(' + ')}</small></div><div><strong>${A.money(s.total)}</strong><button data-pos-action="sale-cancel" data-id="${s.id}">Cancelar</button></div></article>`).join(''):`<div class="treasury-empty-state compact"><strong>Nenhuma venda</strong><p>As vendas concluídas aparecerão aqui.</p></div>`;}
  function renderPaymentSummary(){const target=$('#paymentSummary');if(!target)return;const totals=A.paymentTotals(sessionSales());target.innerHTML=Object.entries(totals).filter(([m,v])=>v>0||['Dinheiro','PIX','Cartão de débito','Cartão de crédito'].includes(m)).map(([m,v])=>`<div><span>${A.esc(m)}</span><strong>${A.money(v)}</strong></div>`).join('');}
  function ensureCash(){if(cash)return true;toast('Caixa fechado','Abra um caixa externo antes de registrar vendas.','error');openCashModal();return false;}

  function focusReplaceField(){const input=$('#posModalBody [data-auto-replace]');if(!input)return;setTimeout(()=>{try{input.focus();input.select?.();}catch(_){}},70);}
  function openModal(kicker,title,subtitle,body,wide=false){$('#posModalKicker').textContent=kicker;$('#posModalTitle').textContent=title;$('#posModalSubtitle').textContent=subtitle;$('#posModalBody').innerHTML=body;$('#posModalBackdrop').hidden=false;$('#posModalBackdrop').querySelector('.treasury-modal').classList.toggle('wide',wide);focusReplaceField();}
  function closeModal(){$('#posModalBackdrop').hidden=true;$('#posModalBody').innerHTML='';}
  const authFields=()=>`<div class="treasury-auth-confirm"><strong>Autorização financeira</strong><div class="treasury-form-grid two"><label><span>Login da Tesouraria</span><input name="authIdentity" value="${A.esc(treasurySession.user.treasuryLogin||treasurySession.user.treasuryCode||'')}" autocapitalize="none" maxlength="24" required></label><label><span>Senha</span><input name="authPassword" type="password" required></label></div></div>`;
  const actions=label=>`<div class="treasury-form-actions"><button type="button" data-pos-action="cancel-modal">Cancelar</button><button class="primary" type="submit">${label}</button></div>`;
  function openCashModal(){
    if(cash){toast('Caixa já aberto',`${cash.number} está em operação.`);return;}
    const typeCards=SALE_TYPES.map((type,index)=>`<label><input type="radio" name="saleType" value="${A.esc(type)}" ${index===0?'checked':''} required><span class="sale-type-card"><strong>${A.esc(type)}</strong><small>${type==='ALIMENTAÇÃO'?'Bebidas, lanches, salgados, combos e alimentos.':type==='VESTUÁRIO'?'Camisetas, roupas e demais peças de vestuário.':'Canecas, livros, lembranças e outros produtos.'}</small></span></label>`).join('');
    openModal('ABERTURA DE CAIXA','Abrir Tesouraria Externa','Escolha primeiro o tipo de venda. O catálogo ficará limitado aos produtos correspondentes.',`<form data-pos-form="open-cash" class="treasury-form">
      <section class="sale-type-section"><span>TIPO DE VENDA</span><strong>O que será vendido neste caixa?</strong><small>Esta escolha define quais produtos e códigos ficarão disponíveis durante a operação.</small><div class="sale-type-choice">${typeCards}</div></section>
      <div class="treasury-form-grid two"><label><span>Evento</span><input name="eventName" value="Cantina da igreja" required></label><label><span>Ponto de venda</span><input name="pointOfSale" value="Caixa principal" required></label><label><span>Departamento responsável</span><input name="department" value="Eventos" required></label><label><span>Turno</span><select name="shift"><option>Manhã</option><option>Tarde</option><option selected>Noite</option><option>Evento integral</option></select></label><label><span>Data e hora</span><input name="openedAt" type="datetime-local" value="${A.localDateTimeInput()}" required></label><label><span>Saldo inicial para troco</span><input name="openingFloat" type="number" min="0" step="0.01" value="200.00" data-auto-replace required></label></div>
      <label><span>Observações</span><textarea name="notes" placeholder="Conferentes, local e informações do caixa"></textarea></label>${authFields()}${actions('Abrir caixa externo')}
    </form>`);
  }
  function memberOptions(){
    const activeMembers=(db.members||[]).filter(member=>member.type==='Membro'&&member.status!=='Falecido');
    return activeMembers.map(member=>`<option value="${A.esc(member.id)}">${A.esc(member.name)} · ${A.esc(member.registration||'Sem matrícula')} · CPF ${A.esc(member.cpf||'não informado')}</option>`).join('');
  }
  function beginPayment(method){
    if(!ensureCash())return;
    const t=totals();
    if(!cart.length||t.total<=0){toast('Venda vazia','Adicione ao menos um item antes de escolher o pagamento.','error');return;}
    if(method==='PIX'){openPixModeModal();return;}
    if(method==='Cartão de crédito'){openCreditInstallmentModal();return;}
    openPaymentModal(method);
  }
  function creditSettings(){
    const settings=db.treasurySettings||(db.treasurySettings={});
    const max=Math.max(1,Math.min(24,Math.round(Number(settings.creditMaxInstallments||6))));
    const rate=Math.max(0,Math.min(100,Number(settings.creditInterestPerExtraInstallment||0)));
    return{max,rate};
  }
  function creditPlan(base,installments){
    const count=Math.max(1,Math.round(Number(installments||1))),settings=creditSettings();
    const interestPercent=count<=1?0:Number((settings.rate*(count-1)).toFixed(4));
    const interestAmount=Number((Number(base||0)*interestPercent/100).toFixed(2));
    const total=Number((Number(base||0)+interestAmount).toFixed(2));
    const installmentValue=Number((total/count).toFixed(2));
    return{installments:count,interestPercent,interestAmount,total,installmentValue,rate:settings.rate};
  }
  function openCreditInstallmentModal(){
    const integrations=integrationSettings();
    if(integrations.cardProvider==='INFINITEPAY'&&integrations.cardChannel==='CHECKOUT'){openPaymentModal('Cartão de crédito',{creditInstallments:1,providerManaged:true});return;}
    const base=totals().total,{max,rate}=creditSettings();
    const options=Array.from({length:max},(_,index)=>{
      const plan=creditPlan(base,index+1);
      return `<button type="button" class="credit-installment-card" data-pos-action="credit-installment" data-installments="${plan.installments}"><span>${plan.installments}x</span><div><strong>${A.money(plan.installmentValue)} por parcela</strong><small>${plan.installments===1?'Sem juros':`Juros ${plan.interestPercent.toLocaleString('pt-BR',{maximumFractionDigits:2})}% · total ${A.money(plan.total)}`}</small></div></button>`;
    }).join('');
    openModal('CARTÃO DE CRÉDITO',`Escolha o parcelamento — ${A.money(base)}`,`Configuração atual: até ${max}x · juros de ${rate.toLocaleString('pt-BR',{maximumFractionDigits:2})}% por parcela adicional.`, `<div class="credit-installment-grid">${options}</div><div class="credit-installment-note"><strong>Regra configurada na Tesouraria e Caixa</strong><span>1x é sem juros. Cada parcela adicional acrescenta ${rate.toLocaleString('pt-BR',{maximumFractionDigits:2})}% sobre o valor original da compra.</span></div><div class="treasury-form-actions"><button type="button" data-pos-action="cancel-modal">Cancelar</button></div>`,true);
  }
  function openPixModeModal(){
    const t=totals();
    openModal('PAGAMENTO PIX',`PIX — ${A.money(t.total)}`,'Escolha como o PIX será apresentado ao cliente.',`<div class="pix-mode-grid">
      <button type="button" class="pix-mode-card" data-pos-action="pix-mode" data-mode="FÍSICO"><span>F</span><strong>PIX FÍSICO</strong><small>O pagamento será realizado usando a forma física já disponível no ponto de venda. O operador confirma o recebimento no sistema.</small></button>
      <button type="button" class="pix-mode-card" data-pos-action="pix-mode" data-mode="DIGITAL"><span>QR</span><strong>PIX DIGITAL</strong><small>O sistema gera um QR Code PIX com o valor exato desta venda para apresentação ao cliente.</small></button>
    </div><div class="treasury-form-actions"><button type="button" data-pos-action="cancel-modal">Cancelar</button></div>`);
  }
  function pixClean(value,max){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9 .-]/g,' ').replace(/\s+/g,' ').trim().slice(0,max);}
  function emvField(id,value){const text=String(value??'');return `${id}${String(text.length).padStart(2,'0')}${text}`;}
  function crc16Pix(text){let crc=0xFFFF;for(let i=0;i<text.length;i++){crc^=text.charCodeAt(i)<<8;for(let bit=0;bit<8;bit++)crc=(crc&0x8000)?((crc<<1)^0x1021)&0xFFFF:(crc<<1)&0xFFFF;}return crc.toString(16).toUpperCase().padStart(4,'0');}
  function buildPixPayload({key,merchantName,merchantCity,amount,txid}){
    const cleanKey=String(key||'').trim();if(!cleanKey)throw new Error('Informe a chave PIX.');
    const account=emvField('00','br.gov.bcb.pix')+emvField('01',cleanKey);
    const merchant=pixClean(merchantName||db.church?.name||'SANTUARIO GESTAO',25)||'SANTUARIO GESTAO';
    const city=pixClean(merchantCity||db.church?.city||'BRASIL',15)||'BRASIL';
    const cleanTxid=pixClean(txid||'***',25).replace(/ /g,'')||'***';
    let payload=emvField('00','01')+emvField('26',account)+emvField('52','0000')+emvField('53','986')+emvField('54',Number(amount||0).toFixed(2))+emvField('58','BR')+emvField('59',merchant)+emvField('60',city)+emvField('62',emvField('05',cleanTxid))+'6304';
    return payload+crc16Pix(payload);
  }
  async function generatePixQrFromForm(){
    const form=$('form[data-pos-form="payment"]');if(!form||form.elements.paymentMode?.value!=='PIX'||form.elements.pixMode?.value!=='DIGITAL')return;
    const key=String(form.elements.pixKey?.value||'').trim();if(!key){toast('Chave PIX necessária','Informe a chave PIX que receberá este pagamento.','error');return;}
    const txid=`SG${Date.now().toString(36).toUpperCase()}`.slice(0,25);
    try{
      const payload=buildPixPayload({key,merchantName:form.elements.pixMerchantName?.value,merchantCity:form.elements.pixMerchantCity?.value,amount:totals().total,txid});
      form.elements.pixPayload.value=payload;form.elements.pixTxid.value=txid;
      const result=await window.santuarioDesktop?.generateQrCode?.(payload);
      const box=$('#pixQrBox');
      if(result?.ok&&result.dataUrl){box.innerHTML=`<img src="${A.esc(result.dataUrl)}" alt="QR Code PIX">`;$('#pixCopyPaste').value=payload;$('#pixTxidView').textContent=txid;toast('QR Code PIX gerado',`Valor ${A.money(totals().total)}.`);}
      else{box.innerHTML='<div class="pix-qr-placeholder">Não foi possível desenhar o QR Code. Use o código PIX copia e cola.</div>';$('#pixCopyPaste').value=payload;}
      window.santuarioDesktop?.logCashEvent?.('PIX',{message:'PIX digital preparado',mode:'DIGITAL',amount:totals().total,txid});
    }catch(err){toast('PIX digital',err.message||'Não foi possível gerar o código PIX.','error');}
  }
  async function copyPixCode(){const value=$('#pixCopyPaste')?.value||'';if(!value)return;try{await navigator.clipboard.writeText(value);toast('PIX copia e cola','Código copiado.');}catch(_){toast('Não foi possível copiar','Selecione o código manualmente.','error');}}
  function openPaymentModal(method,{pixMode='',creditInstallments=1,providerManaged=false}={}){
    if(!ensureCash())return;
    const t=totals();
    const labels={'Dinheiro':'DINHEIRO','Cartão de débito':'DÉBITO','Cartão de crédito':'CRÉDITO','PIX':'PIX','Marcar venda':'MARCAR'};
    const paymentLabel=labels[method]||method;
    let body='';
    if(method==='Dinheiro'){
      body=`<div class="payment-entry"><label><span>Valor recebido</span><input name="singleAmount" type="number" min="0" step="0.01" value="${t.total.toFixed(2)}" data-auto-replace required></label><div><small>TROCO</small><strong id="paymentChange">${A.money(0)}</strong></div></div>`;
    }else if(method==='Marcar venda'){
      body=`<input type="hidden" name="singleAmount" value="0"><section id="markedSaleArea" class="marked-sale-area"><div class="marked-sale-heading"><div><span>MARCAR VENDA</span><strong>Quem ficará responsável por esta compra?</strong></div><small>A venda será registrada como pendente e não entrará no dinheiro disponível do caixa.</small></div><div class="marked-customer-type-grid"><button type="button" data-pos-action="marked-customer-type" data-type="member"><strong>Irmão cadastrado</strong><small>Selecionar pelos dados do cadastro da igreja</small></button><button type="button" data-pos-action="marked-customer-type" data-type="guest"><strong>Pessoa não cadastrada</strong><small>Anotar nome e CPF para o termo de assinatura</small></button></div><input type="hidden" name="markedCustomerType" value=""><div id="markedMemberArea" class="marked-customer-fields" hidden><label><span>Irmão cadastrado</span><select name="markedMemberId" disabled><option value="">Selecione um irmão</option>${memberOptions()}</select></label><div id="markedMemberPreview" class="marked-member-preview"><span>Selecione um cadastro para visualizar os dados.</span></div></div><div id="markedGuestArea" class="marked-customer-fields treasury-form-grid two" hidden><label><span>Nome</span><input name="markedGuestName" placeholder="Nome da pessoa" disabled></label><label><span>CPF</span><input name="markedGuestCpf" inputmode="numeric" maxlength="14" placeholder="000.000.000-00" disabled></label></div></section>`;
    }else if(method==='PIX'&&pixMode==='DIGITAL'){
      const integrations=integrationSettings();
      if(integrations.pixProvider==='INFINITEPAY'&&integrations.handle){
        body=`<input type="hidden" name="singleAmount" value="${t.total.toFixed(2)}"><input type="hidden" name="pixMode" value="DIGITAL"><input type="hidden" name="pixIntegratedProvider" value="INFINITEPAY"><section class="credit-payment-summary"><div><small>PROVEDOR</small><strong>INFINITEPAY CHECKOUT</strong></div><div><small>INFINITETAG</small><strong>$${A.esc(integrations.handle)}</strong></div><div class="credit-payment-final"><small>VALOR DA COBRANÇA</small><strong>${A.money(t.total)}</strong></div></section><p class="receipt-result-note"><strong>Pagamento real ativado.</strong> Ao confirmar, o Santuário Gestão criará uma cobrança na InfinitePay e abrirá o Checkout oficial. A venda só será registrada após a InfinitePay confirmar a transação.</p>`;
      }else{
        const settings=db.treasurySettings||{},merchantName=settings.pixMerchantName||db.church?.name||'',merchantCity=settings.pixMerchantCity||db.church?.city||'';
        body=`<input type="hidden" name="singleAmount" value="${t.total.toFixed(2)}"><input type="hidden" name="pixMode" value="DIGITAL"><input type="hidden" name="pixPayload" value=""><input type="hidden" name="pixTxid" value=""><div class="treasury-form-grid two"><label><span>Chave PIX</span><input name="pixKey" value="${A.esc(settings.pixKey||'')}" placeholder="CPF, CNPJ, e-mail, telefone ou chave aleatória" required></label><label><span>Nome do recebedor</span><input name="pixMerchantName" value="${A.esc(merchantName)}" maxlength="25" required></label><label><span>Cidade</span><input name="pixMerchantCity" value="${A.esc(merchantCity)}" maxlength="15" required></label><div class="mixed-payment-total"><small>VALOR DO PIX</small><strong>${A.money(t.total)}</strong></div></div><div class="treasury-form-actions"><button type="button" data-pos-action="pix-generate">GERAR / ATUALIZAR QR CODE</button></div><section class="pix-digital-stage"><div id="pixQrBox" class="pix-qr-box"><div class="pix-qr-placeholder">Informe a chave PIX e gere o QR Code.</div></div><div class="pix-digital-info"><div><small>VALOR</small><strong>${A.money(t.total)}</strong></div><div><small>TXID</small><strong id="pixTxidView">Aguardando geração</strong></div><label><span>PIX copia e cola</span><div class="pix-copy-row"><textarea id="pixCopyPaste" readonly></textarea><button type="button" data-pos-action="pix-copy">COPIAR</button></div></label></div></section>`;
      }
    }else if(method==='Cartão de crédito'){
      const integrations=integrationSettings();
      if(providerManaged&&integrations.cardProvider==='INFINITEPAY'&&integrations.cardChannel==='CHECKOUT'){
        body=`<input type="hidden" name="singleAmount" value="${t.total.toFixed(2)}"><input type="hidden" name="creditProviderManaged" value="1"><input type="hidden" name="creditInstallments" value="1"><input type="hidden" name="creditFinalTotal" value="${t.total.toFixed(2)}"><section class="credit-payment-summary"><div><small>PROVEDOR</small><strong>INFINITEPAY CHECKOUT</strong></div><div><small>INFINITETAG</small><strong>$${A.esc(integrations.handle||'não configurada')}</strong></div><div class="credit-payment-final"><small>VALOR DA COMPRA</small><strong>${A.money(t.total)}</strong></div></section><p class="receipt-result-note">O parcelamento será escolhido dentro do Checkout InfinitePay e o Santuário Gestão registrará a quantidade realmente confirmada pelo provedor.</p>`;
      }else{
        const plan=creditPlan(t.total,creditInstallments);
        body=`<input type="hidden" name="singleAmount" value="${plan.total.toFixed(2)}"><input type="hidden" name="creditInstallments" value="${plan.installments}"><input type="hidden" name="creditInterestPercent" value="${plan.interestPercent}"><input type="hidden" name="creditInterestAmount" value="${plan.interestAmount}"><input type="hidden" name="creditInstallmentValue" value="${plan.installmentValue}"><input type="hidden" name="creditFinalTotal" value="${plan.total}"><section class="credit-payment-summary"><div><small>VALOR DA COMPRA</small><strong>${A.money(t.total)}</strong></div><div><small>PARCELAMENTO</small><strong>${plan.installments}x de ${A.money(plan.installmentValue)}</strong></div><div><small>JUROS</small><strong>${plan.interestPercent?`${plan.interestPercent.toLocaleString('pt-BR',{maximumFractionDigits:2})}% · ${A.money(plan.interestAmount)}`:'SEM JUROS'}</strong></div><div class="credit-payment-final"><small>TOTAL NO CRÉDITO</small><strong>${A.money(plan.total)}</strong></div></section><p class="receipt-result-note">Após a conclusão, o sistema gerará o comprovante com o parcelamento. Quando houver uma impressora física disponível no Windows, tentará imprimir automaticamente; caso contrário, salvará o comprovante e abrirá uma prévia.</p>`;
      }
    }else{
      body=`<input type="hidden" name="singleAmount" value="${t.total.toFixed(2)}">${method==='PIX'?`<input type="hidden" name="pixMode" value="${A.esc(pixMode||'FÍSICO')}">`:''}<div class="mixed-payment-total"><small>${A.esc(paymentLabel)} · VALOR A RECEBER</small><strong>${A.money(t.total)}</strong></div><p class="receipt-result-note">Após a conclusão, o sistema gerará o comprovante da venda. Quando houver uma impressora física disponível no Windows, tentará imprimir automaticamente; caso contrário, salvará o comprovante no computador e abrirá uma prévia.</p>`;
    }
    const actionLabel=method==='Marcar venda'?'Marcar venda':method==='Dinheiro'?'Concluir em dinheiro':method==='PIX'&&pixMode==='DIGITAL'?'Confirmar PIX digital':`Concluir em ${paymentLabel.toLowerCase()}`;
    const creditPlanData=method==='Cartão de crédito'?creditPlan(t.total,creditInstallments):null;
    openModal('FINALIZAR VENDA',`${paymentLabel}${pixMode?` · ${pixMode}`:''}${creditPlanData?` · ${creditPlanData.installments}x`:''} — ${A.money(creditPlanData?.total??t.total)}`,method==='Marcar venda'?'Registre o responsável pelo pagamento posterior.':'Confira a forma escolhida e finalize a venda.',`<form data-pos-form="payment" class="treasury-form"><input type="hidden" name="paymentMode" value="${A.esc(method)}">${body}<label><span>Observação</span><textarea name="notes" placeholder="Informações adicionais da venda"></textarea></label>${actions(actionLabel)}</form>`,method==='PIX'&&pixMode==='DIGITAL');
    if(method==='PIX'&&pixMode==='DIGITAL'&&integrationSettings().pixProvider!=='INFINITEPAY'&&(db.treasurySettings?.pixKey||''))setTimeout(generatePixQrFromForm,80);
  }
  function setFieldState(element,{disabled=false,required=false}={}){
    if(!element)return;element.disabled=disabled;element.required=required;
  }
  function resetMarkedSaleFields(form){
    form.elements.markedCustomerType.value='';
    $$('[data-pos-action="marked-customer-type"]').forEach(button=>button.classList.remove('active'));
    $('#markedMemberArea').hidden=true;
    $('#markedGuestArea').hidden=true;
    setFieldState(form.elements.markedMemberId,{disabled:true,required:false});
    setFieldState(form.elements.markedGuestName,{disabled:true,required:false});
    setFieldState(form.elements.markedGuestCpf,{disabled:true,required:false});
    if(form.elements.markedMemberId)form.elements.markedMemberId.value='';
    if(form.elements.markedGuestName)form.elements.markedGuestName.value='';
    if(form.elements.markedGuestCpf)form.elements.markedGuestCpf.value='';
    const preview=$('#markedMemberPreview');if(preview)preview.innerHTML='<span>Selecione um cadastro para visualizar os dados.</span>';
  }
  function selectMarkedCustomerType(type){
    const form=$('form[data-pos-form="payment"]');
    if(!form||form.elements.paymentMode.value!=='Marcar venda')return;
    form.elements.markedCustomerType.value=type;
    $$('[data-pos-action="marked-customer-type"]').forEach(button=>button.classList.toggle('active',button.dataset.type===type));
    const member=type==='member',guest=type==='guest';
    $('#markedMemberArea').hidden=!member;
    $('#markedGuestArea').hidden=!guest;
    setFieldState(form.elements.markedMemberId,{disabled:!member,required:member});
    setFieldState(form.elements.markedGuestName,{disabled:!guest,required:guest});
    setFieldState(form.elements.markedGuestCpf,{disabled:!guest,required:guest});
    if(!member&&form.elements.markedMemberId)form.elements.markedMemberId.value='';
    if(!guest){if(form.elements.markedGuestName)form.elements.markedGuestName.value='';if(form.elements.markedGuestCpf)form.elements.markedGuestCpf.value='';}
    updateMarkedMemberPreview();
  }
  function updateMarkedMemberPreview(){
    const form=$('form[data-pos-form="payment"]'),preview=$('#markedMemberPreview');
    if(!form||!preview)return;
    const member=(db.members||[]).find(item=>item.id===form.elements.markedMemberId?.value);
    preview.innerHTML=member?`<div><small>MATRÍCULA</small><strong>${A.esc(member.registration||'Não informada')}</strong></div><div><small>NOME</small><strong>${A.esc(member.name)}</strong></div><div><small>CPF</small><strong>${A.esc(member.cpf||'Não informado')}</strong></div><div><small>SITUAÇÃO</small><strong>${A.esc(member.status||'—')}</strong></div>`:'<span>Selecione um cadastro para visualizar os dados.</span>';
  }
  function handleModalInput(e){
    const closeForm=e.target.closest('form[data-pos-form="close-cash"]');
    if(closeForm){
      const counted=num(closeForm.elements.cashCounted?.value),expected=num(closeForm.elements.expected?.value),difference=Number((counted-expected).toFixed(2));
      const target=$('#externalDifference');
      if(target){target.textContent=A.money(difference);target.className=Math.abs(difference)<.01?'ok':difference>0?'positive':'negative';}
      return;
    }
    if(e.target?.name==='markedGuestCpf'){const digits=String(e.target.value||'').replace(/\D/g,'').slice(0,11);e.target.value=digits.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})(\d{1,2})$/,'$1-$2');}
    const form=e.target.closest('form[data-pos-form="payment"]');
    if(!form)return;
    if(e.target.name==='markedMemberId')updateMarkedMemberPreview();
    updatePaymentForm();
  }
  function updatePaymentForm(){const form=$('form[data-pos-form="payment"]');if(!form)return;const mode=form.elements.paymentMode?.value;if(mode==='Dinheiro'){const target=$('#paymentChange');if(target){const received=num(form.elements.singleAmount?.value),change=Math.max(received-totals().total,0);target.textContent=A.money(change);}}}
  function openAdjustmentAuthorization(){
    if(!ensureCash())return;
    adjustmentAuthorization=null;
    openModal('SEGURANÇA DO CAIXA','Autorizar Sangria / Suprimento','Confirme a senha financeira antes de acessar as movimentações de numerário.',`<form data-pos-form="adjustment-auth" class="treasury-form">${authFields()}${actions('Autorizar acesso')}</form>`);
    setTimeout(()=>{const password=$('#posModalBody input[name="authPassword"]');password?.focus();password?.select?.();},90);
  }
  function openAdjustmentModal(){
    if(!ensureCash())return;
    if(!adjustmentAuthorization||adjustmentAuthorization.expiresAt<Date.now()){openAdjustmentAuthorization();return;}
    openModal('MOVIMENTAÇÃO DE CAIXA','Sangria ou suprimento','Acesso autorizado. Antes de movimentar dinheiro, você pode verificar o valor estimado e todo o histórico deste caixa.',`<form data-pos-form="adjustment" class="treasury-form"><div class="adjustment-actions"><div><strong>Quer conferir o caixa antes?</strong><small>Veja entradas, saídas e o dinheiro estimado sem gerar fechamento ou PDF.</small></div><button type="button" data-pos-action="cash-verify">VERIFICAR</button></div><div class="treasury-form-grid two"><label><span>Tipo</span><select name="type"><option value="sangria">Sangria</option><option value="reforco">Suprimento</option></select></label><label><span>Valor</span><input name="amount" type="number" min="0.01" step="0.01" value="0.00" data-auto-replace required></label><label class="span-2"><span>Motivo / destino <small>(opcional)</small></span><input name="reason" placeholder="Anotação opcional"></label></div>${actions('Registrar movimentação')}</form>`);
  }
  function openCashVerifyScreen(){
    if(!ensureCash())return;
    const sales=sessionSales(),payments=A.paymentTotals(sales),adjustments=db.externalCashAdjustments.filter(a=>a.sessionId===cash.id),reinforcements=A.sum(adjustments.filter(a=>a.type==='reforco'),a=>a.amount),withdrawals=A.sum(adjustments.filter(a=>a.type==='sangria'),a=>a.amount),cashSales=Number(payments.Dinheiro||0),expected=Number(cash.openingFloat||0)+cashSales+reinforcements-withdrawals,digital=Number(payments.PIX||0)+Number(payments['Cartão de débito']||0)+Number(payments['Cartão de crédito']||0),marked=A.sum(sales.filter(s=>s.status==='Marcada'),s=>s.outstandingAmount||s.total);
    const rows=[{at:cash.openedAt,title:'Abertura do caixa',detail:`Saldo inicial · ${cash.saleType||'Tipo legado'}`,amount:Number(cash.openingFloat||0),kind:'in'},...sales.map(s=>{const paid=(s.payments||[]).map(p=>p.method).join(' + ')||'Marcada';const cashAmount=A.sum((s.payments||[]).filter(p=>p.method==='Dinheiro'),p=>p.amount);return{at:s.createdAt,title:`Venda ${s.number}`,detail:`${paid} · ${A.money(s.total)}`,amount:cashAmount,kind:cashAmount>0?'in':''};}),...adjustments.map(a=>({at:a.at,title:a.type==='sangria'?'Sangria':'Suprimento',detail:`${a.reason} · ${a.user}`,amount:Number(a.amount||0),kind:a.type==='sangria'?'out':'in'}))].sort((a,b)=>String(b.at).localeCompare(String(a.at)));
    const timeline=rows.map(row=>`<article class="cash-process-row ${row.kind}"><time>${row.at?new Date(row.at).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'}):'—'}</time><div><strong>${A.esc(row.title)}</strong><small>${A.esc(row.detail)}</small></div><b>${row.amount?`${row.kind==='out'?'−':row.kind==='in'?'+':''} ${A.money(row.amount)}`:'—'}</b></article>`).join('');
    openModal(cash.number,'Verificar caixa','Demonstrativo informativo em tempo real. Esta tela não fecha o caixa e não gera PDF.',`<div class="cash-verify-screen"><section class="cash-verify-hero"><small>DINHEIRO ESTIMADO NO CAIXA</small><strong>${A.money(expected)}</strong><span>Saldo inicial + vendas em dinheiro + suprimentos − sangrias</span></section><section class="cash-verify-metrics"><article><small>VENDAS EM DINHEIRO</small><strong>${A.money(cashSales)}</strong></article><article><small>RECEBIMENTOS DIGITAIS</small><strong>${A.money(digital)}</strong></article><article><small>SUPRIMENTOS</small><strong>+ ${A.money(reinforcements)}</strong></article><article><small>SANGRIAS</small><strong>− ${A.money(withdrawals)}</strong></article></section>${marked?`<div class="system-reconciliation warning"><span>Vendas marcadas pendentes</span><strong>${A.money(marked)}</strong><small>Este valor não compõe o dinheiro disponível do caixa.</small></div>`:''}<div><span class="treasury-kicker dark">PROCESSOS DO CAIXA</span><div class="cash-process-list">${timeline||'<div class="treasury-empty-state compact"><strong>Sem movimentações</strong><p>Nenhum processo foi registrado.</p></div>'}</div></div><div class="treasury-form-actions"><button type="button" data-pos-action="adjustment-back">Voltar para Sangria / Suprimento</button></div></div>`,true);
  }
  function openCloseCashModal(){
    if(!ensureCash())return;
    const sales=sessionSales();
    const allSales=A.sessionSales(db,cash.id,{includeCancelled:true});
    const cancelled=allSales.filter(sale=>sale.status==='Cancelada');
    const payments=A.paymentTotals(sales);
    const paymentTotal=A.sum(Object.values(payments));
    const markedSales=sales.filter(sale=>sale.status==='Marcada');
    const markedTotal=A.sum(markedSales,sale=>sale.outstandingAmount||sale.total);
    const adjustments=db.externalCashAdjustments.filter(a=>a.sessionId===cash.id);
    const reinforcementRows=adjustments.filter(a=>a.type==='reforco');
    const withdrawalRows=adjustments.filter(a=>a.type==='sangria');
    const reinforcements=A.sum(reinforcementRows,a=>a.amount);
    const withdrawals=A.sum(withdrawalRows,a=>a.amount);
    const expected=Number(cash.openingFloat||0)+Number(payments.Dinheiro||0)+reinforcements-withdrawals;
    const gross=A.sum(sales,s=>s.total);
    const receivedSales=gross-markedTotal;
    const paymentDifference=Number((paymentTotal-receivedSales).toFixed(2));
    const methodRows=Object.entries(payments).filter(([,value])=>value>0).map(([method,value])=>`<tr><td>${A.esc(method)}</td><td>${sales.filter(sale=>(sale.payments||[]).some(payment=>payment.method===method)).length}</td><td class="right"><strong>${A.money(value)}</strong></td></tr>`).join('');
    const systemStatus=Math.abs(paymentDifference)<.01?'Conferido':'Revisar';
    openModal(cash.number,'Conferência de fechamento',`${cash.eventName} · ${cash.pointOfSale}`,`<form data-pos-form="close-cash" class="treasury-form close-conference-form">
      <section class="system-conference-panel">
        <div class="system-conference-head"><div><span>CONFERÊNCIA AUTOMÁTICA DO SISTEMA</span><h3>Operações registradas neste caixa</h3><p>Revise o resumo antes de informar o dinheiro contado e confirmar o fechamento.</p></div><strong class="system-check-badge ${Math.abs(paymentDifference)<.01?'ok':'warning'}">${systemStatus}</strong></div>
        <div class="system-conference-metrics">
          <article><small>VENDAS VÁLIDAS</small><strong>${sales.length}</strong><span>${A.money(gross)}</span></article>
          <article><small>VENDAS CANCELADAS</small><strong>${cancelled.length}</strong><span>${A.money(A.sum(cancelled,sale=>sale.total))}</span></article>
          <article><small>VENDAS MARCADAS</small><strong>${markedSales.length}</strong><span>${A.money(markedTotal)}</span></article>
          <article><small>VALOR RECEBIDO</small><strong>${A.money(paymentTotal)}</strong><span>Pagamentos registrados</span></article>
        </div>
        <div class="system-conference-grid">
          <div class="system-conference-card"><div class="conference-card-title"><strong>Formas de pagamento</strong><span>${A.money(paymentTotal)}</span></div><table class="conference-table"><thead><tr><th>Forma</th><th>Vendas</th><th class="right">Valor</th></tr></thead><tbody>${methodRows||'<tr><td colspan="3">Nenhum pagamento recebido.</td></tr>'}<tr class="total"><td>Total recebido</td><td></td><td class="right"><strong>${A.money(paymentTotal)}</strong></td></tr></tbody></table></div>
          <div class="system-conference-card"><div class="conference-card-title"><strong>Movimentação do numerário</strong><span>${A.money(expected)}</span></div><div class="conference-cash-rows"><div><span>Saldo inicial</span><strong>${A.money(cash.openingFloat)}</strong></div><div><span>Vendas em dinheiro</span><strong>${A.money(payments.Dinheiro)}</strong></div><div><span>Suprimentos (${reinforcementRows.length})</span><strong>+ ${A.money(reinforcements)}</strong></div><div><span>Sangrias (${withdrawalRows.length})</span><strong>− ${A.money(withdrawals)}</strong></div><div class="total"><span>Dinheiro esperado</span><strong>${A.money(expected)}</strong></div></div></div>
        </div>
        <div class="system-reconciliation ${Math.abs(paymentDifference)<.01?'ok':'warning'}"><span>Recebimentos x vendas pagas</span><strong>${A.money(paymentDifference)}</strong><small>${Math.abs(paymentDifference)<.01?'Os pagamentos correspondem às vendas recebidas.':'Existe diferença entre as vendas pagas e os pagamentos registrados.'}</small></div>
      </section>
      <section class="manual-close-panel"><div class="treasury-form-grid two"><label><span>Dinheiro contado</span><input name="cashCounted" type="number" min="0" step="0.01" value="${expected.toFixed(2)}" data-auto-replace required></label><label><span>Data e hora</span><input name="closedAt" type="datetime-local" value="${A.localDateTimeInput()}" required></label></div><div class="external-difference"><small>DIFERENÇA APURADA</small><strong id="externalDifference" class="ok">${A.money(0)}</strong></div><label><span>Observações <small>(opcional)</small></span><textarea name="notes" placeholder="Use este campo somente quando desejar registrar uma observação."></textarea></label></section>
      <input type="hidden" name="expected" value="${expected}">${authFields()}${actions('Confirmar fechamento')}
    </form>`,true);
  }
  function openProductsModal(){const rows=db.treasuryProducts;openModal('CATÁLOGO','Produtos e estoque','Cadastre códigos, preços, estoque e o tipo de venda de cada item.',`<div class="product-management-head"><button class="treasury-small-primary" data-pos-action="product-new">+ Novo produto</button></div><div class="product-management-list">${rows.map(p=>`<article><div><span>${A.esc(p.code)}</span><strong>${A.esc(p.name)}</strong><small>${A.esc(productSaleType(p))} · ${A.esc(p.category)} · ${A.money(p.price)} · Estoque ${p.stock}</small></div><div><button data-pos-action="product-edit" data-id="${p.id}">Editar</button><button data-pos-action="product-toggle" data-id="${p.id}">${p.active?'Desativar':'Ativar'}</button></div></article>`).join('')}</div>`,true);}
  function openProductForm(id=''){const p=db.treasuryProducts.find(x=>x.id===id)||{};const type=productSaleType(p);openModal(id?'EDITAR PRODUTO':'NOVO PRODUTO',id?p.name:'Cadastrar item','Defina também em qual TIPO DE VENDA o item aparecerá.',`<form data-pos-form="product" data-id="${A.esc(id)}" class="treasury-form"><div class="treasury-form-grid two"><label><span>Código interno</span><input name="code" value="${A.esc(p.code||'')}" required></label><label><span>Código de barras</span><input name="barcode" value="${A.esc(p.barcode||'')}"></label><label class="span-2"><span>Nome do item</span><input name="name" value="${A.esc(p.name||'')}" required></label><label><span>Tipo de venda</span><select name="saleType">${SALE_TYPES.map(item=>`<option value="${item}" ${item===type?'selected':''}>${item}</option>`).join('')}</select></label><label><span>Categoria</span><input name="category" value="${A.esc(p.category||'Produtos')}" required></label><label><span>Preço de venda</span><input name="price" type="number" min="0" step="0.01" value="${num(p.price).toFixed(2)}" required></label><label><span>Custo</span><input name="cost" type="number" min="0" step="0.01" value="${num(p.cost).toFixed(2)}"></label><label><span>Estoque atual</span><input name="stock" type="number" min="0" step="1" value="${Number(p.stock||0)}" required></label><label><span>Estoque mínimo</span><input name="minStock" type="number" min="0" step="1" value="${Number(p.minStock||0)}"></label></div>${actions(id?'Salvar produto':'Cadastrar produto')}</form>`);}
  function toggleProduct(id){const p=db.treasuryProducts.find(x=>x.id===id);if(!p)return;p.active=!p.active;A.saveData(db);openProductsModal();render();}
  function openCancelSale(id){const sale=db.treasurySales.find(s=>s.id===id&&s.status!=='Cancelada');if(!sale)return;openModal('CANCELAMENTO',`Cancelar ${sale.number}`,'O estoque será devolvido e a ação ficará na auditoria.',`<form data-pos-form="cancel-sale" data-id="${sale.id}" class="treasury-form"><label><span>Motivo do cancelamento <small>(opcional)</small></span><textarea name="reason" placeholder="Anotação opcional"></textarea></label>${authFields()}${actions('Confirmar cancelamento')}</form>`);}

  async function handleSubmit(e){
    const f=e.target.closest('form[data-pos-form]');if(!f)return;e.preventDefault();treasurySession=A.readTreasurySession(db);if(!treasurySession){location.replace('tesouraria-login.html');return;}
    const d=Object.fromEntries(new FormData(f).entries()),type=f.dataset.posForm;
    if(type==='adjustment-auth'){
      const user=A.authenticate(db,d.authIdentity,d.authPassword);if(!user||!A.canOperate(user,'external','adjust')){toast('Autorização negada','Senha ou permissão inválida para Sangria / Suprimento.','error');return;}
      adjustmentAuthorization={user,expiresAt:Date.now()+120000};window.santuarioDesktop?.logCashEvent?.('SEGURANÇA',{message:'Acesso a Sangria / Suprimento autorizado',user:user.name});openAdjustmentModal();return;
    }
    if(['open-cash','close-cash','cancel-sale'].includes(type)){
      const user=A.authenticate(db,d.authIdentity,d.authPassword);if(!user){toast('Autorização negada','Login, senha ou permissão inválidos.','error');return;}
      const action=type==='open-cash'?'open':type==='close-cash'?'close':'cancel';if(!A.canOperate(user,'external',action)){toast('Permissão insuficiente','Este operador não possui autorização para esta ação.','error');return;}d._authUser=user;
    }
    if(type==='adjustment'){if(!adjustmentAuthorization||adjustmentAuthorization.expiresAt<Date.now()){toast('Autorização expirada','Informe novamente a senha para acessar Sangria / Suprimento.','error');openAdjustmentAuthorization();return;}d._authUser=adjustmentAuthorization.user;}
    if(type==='open-cash')saveOpenCash(d);if(type==='payment')await saveSale(d);if(type==='adjustment')saveAdjustment(d);if(type==='close-cash')saveCloseCash(d);if(type==='product')saveProduct(f.dataset.id,d);if(type==='cancel-sale')saveCancelSale(f.dataset.id,d);
  }
  function saveOpenCash(d){
    if(A.activeExternalCash(db)){toast('Já existe caixa aberto','Feche a operação atual antes de abrir outra.','error');return;}
    const saleType=normalizeSaleType(d.saleType);if(!saleType){toast('Tipo de venda obrigatório','Escolha ALIMENTAÇÃO, VESTUÁRIO ou PRODUTOS.','error');return;}
    const c={id:A.uid('ec'),number:A.nextNumber(db,'TE','externalCashSessions'),status:'Aberto',saleType,eventName:d.eventName,pointOfSale:d.pointOfSale,department:d.department,shift:d.shift,openedAt:d.openedAt,openingFloat:num(d.openingFloat),operator:d._authUser.name,operatorId:d._authUser.id,notes:d.notes,closedAt:'',closing:null,posted:false};
    db.externalCashSessions.unshift(c);A.audit(db,d._authUser,'Abriu Tesouraria Externa',`${c.number} — ${c.saleType} — ${c.eventName} — ${c.pointOfSale}`);A.saveData(db);A.notifyTreasuryEvent(db,'OPEN',{operationType:'Tesouraria Externa',operationNumber:c.number,operationName:`${c.eventName} · ${c.pointOfSale}`,user:d._authUser.name,at:c.openedAt});cash=c;category='Todos';closeModal();toast('Caixa externo aberto',`${c.number} · ${c.saleType}`);render();setTimeout(()=>$('#productCode').focus(),100);
  }
  function integrationMethodName(mode){return mode==='Cartão de crédito'?'credit':mode==='Cartão de débito'?'debit':mode==='PIX'?'pix':'';}
  function paymentWaitMarkup(title,detail){return `<section class="payment-provider-wait"><div class="health-state-dot"></div><span>INTEGRAÇÃO DE PAGAMENTO</span><h3>${A.esc(title)}</h3><p>${A.esc(detail)}</p></section>`;}
  async function cancelActiveTap(){const token=activeTapToken;activeTapToken='';if(token)try{await window.santuarioDesktop?.infinitePayTapCancel?.(token);}catch(_){}closeModal();toast('Pagamento cancelado','A operação InfiniteTap foi cancelada no Santuário Gestão.','error');}
  async function runInfiniteTapPayment({amount,mode,installments,orderId}){
    const cfg=integrationSettings();
    if(!window.santuarioDesktop?.infinitePayTapCreate)return{approved:false,error:'A integração InfiniteTap só está disponível no aplicativo desktop.'};
    closeModal();
    let created;
    try{created=await window.santuarioDesktop.infinitePayTapCreate({handle:cfg.handle,docNumber:cfg.document,amountCents:Math.round(Number(amount||0)*100),method:integrationMethodName(mode),installments,orderId});}catch(err){return{approved:false,error:err?.message||'Falha ao preparar InfiniteTap.'};}
    if(!created?.ok)return{approved:false,error:created?.error||'Não foi possível preparar InfiniteTap.'};
    activeTapToken=created.token;
    openModal('INFINITEPAY · INFINITETAP',`Aguardando ${mode.toUpperCase()} — ${A.money(amount)}`,'Use o celular cadastrado na InfinitePay. O computador e o celular precisam estar no mesmo Wi‑Fi.',`<section class="pix-digital-stage"><div class="pix-qr-box"><img src="${A.esc(created.qrDataUrl)}" alt="QR Code para abrir InfiniteTap"></div><div class="pix-digital-info"><div><small>PASSO 1</small><strong>Escaneie este QR Code com o celular</strong></div><div><small>PASSO 2</small><strong>Toque em “Abrir InfinitePay e cobrar”</strong></div><div><small>STATUS</small><strong id="tapLiveStatus">Aguardando pagamento...</strong></div><p>O valor, a forma de pagamento e o parcelamento serão enviados ao aplicativo InfinitePay.</p></div></section><div class="treasury-form-actions"><button type="button" data-pos-action="tap-cancel">Cancelar pagamento</button></div>`,true);
    const deadline=Date.now()+12*60*1000;
    while(activeTapToken===created.token&&Date.now()<deadline){
      await sleep(850);
      let status;try{status=await window.santuarioDesktop.infinitePayTapStatus(created.token);}catch(err){status={ok:false,error:err?.message||'Falha na consulta.'};}
      const label=$('#tapLiveStatus');if(label)label.textContent=status?.status==='pending'?'Aguardando pagamento...':status?.status==='approved'?'PAGAMENTO APROVADO':status?.status==='failed'?'PAGAMENTO NÃO CONCLUÍDO':status?.status==='expired'?'TEMPO EXPIRADO':status?.status||'Verificando...';
      if(status?.status==='approved'){activeTapToken='';closeModal();return{approved:true,...(status.result||{}),orderId:created.orderId};}
      if(['failed','expired','cancelled','missing'].includes(status?.status)){activeTapToken='';closeModal();return{approved:false,error:status.error||'Pagamento não concluído.'};}
    }
    if(activeTapToken===created.token)activeTapToken='';
    try{await window.santuarioDesktop.infinitePayTapCancel(created.token);}catch(_){}
    closeModal();return{approved:false,error:'Tempo limite excedido aguardando o InfiniteTap.'};
  }
  async function runInfiniteCheckout({amount,mode,orderId}){
    const cfg=integrationSettings();
    if(!cfg.handle)return{approved:false,error:'Informe a InfiniteTag em Tesouraria e Caixa > Integrações de pagamento.'};
    if(!window.santuarioDesktop?.infinitePayCheckout)return{approved:false,error:'A integração InfinitePay só está disponível no aplicativo desktop.'};
    closeModal();openModal('INFINITEPAY · CHECKOUT',`Pagamento em processamento — ${A.money(amount)}`,'Uma janela segura da InfinitePay foi aberta. O Caixa só concluirá a venda depois da confirmação do provedor.',paymentWaitMarkup('Aguardando a InfinitePay','Finalize o pagamento na janela da InfinitePay. Não feche o Caixa durante a transação.'));
    let result;try{result=await window.santuarioDesktop.infinitePayCheckout({handle:cfg.handle,orderId,expectedMethod:integrationMethodName(mode),items:paymentItems(amount)});}catch(err){result={approved:false,error:err?.message||'Falha no Checkout InfinitePay.'};}
    closeModal();return result||{approved:false,error:'Sem retorno da InfinitePay.'};
  }
  async function runGenericPayment({amount,mode,installments,orderId,pix=false}){
    const cfg=integrationSettings(),endpoint=pix?cfg.pixEndpoint:cfg.bridge;
    if(!endpoint)return{approved:false,error:'O endpoint do conector de pagamento não foi configurado.'};
    if(!window.santuarioDesktop?.genericPayment)return{approved:false,error:'O Hub de Pagamentos só está disponível no aplicativo desktop.'};
    closeModal();openModal('HUB DE PAGAMENTOS',`Aguardando provedor — ${A.money(amount)}`,'O Santuário Gestão enviou a cobrança ao conector configurado.',paymentWaitMarkup('Processando cobrança',endpoint));
    let result;try{result=await window.santuarioDesktop.genericPayment({endpoint,orderId,amountCents:Math.round(Number(amount||0)*100),method:integrationMethodName(mode),installments,items:paymentItems(amount)});}catch(err){result={approved:false,error:err?.message||'Falha no conector.'};}
    closeModal();return result||{approved:false,error:'Sem retorno do conector.'};
  }
  async function authorizeIntegratedPayment({mode,pixMode,amount,installments,orderId}){
    const cfg=integrationSettings();
    if(mode==='PIX'&&String(pixMode||'').toUpperCase()==='DIGITAL'){
      if(cfg.pixProvider==='INFINITEPAY')return{required:true,result:await runInfiniteCheckout({amount,mode,orderId})};
      if(cfg.pixProvider==='GENERIC_HTTP')return{required:true,result:await runGenericPayment({amount,mode,installments:1,orderId,pix:true})};
      return{required:false,result:null};
    }
    if(mode==='Cartão de débito'||mode==='Cartão de crédito'){
      if(cfg.cardProvider==='INFINITEPAY'){
        if(cfg.cardChannel==='CHECKOUT'){
          if(mode==='Cartão de débito')return{required:true,result:{approved:false,error:'O Checkout Integrado da InfinitePay não documenta débito. Para DÉBITO, selecione InfiniteTap no celular em Tesouraria e Caixa.'}};
          return{required:true,result:await runInfiniteCheckout({amount,mode,orderId})};
        }
        return{required:true,result:await runInfiniteTapPayment({amount,mode,installments,orderId})};
      }
      if(cfg.cardProvider==='GENERIC_HTTP')return{required:true,result:await runGenericPayment({amount,mode,installments,orderId,pix:false})};
    }
    return{required:false,result:null};
  }
  async function processPaymentReceipt(sale){
    if(!['PIX','Cartão de débito','Cartão de crédito','Marcar venda'].includes(sale.paymentMode))return null;
    const receipt={
      number:sale.number,cashNumber:cash?.number||'',churchName:db.church?.name||'Santuário Gestão',saleType:cash?.saleType||sale.saleType||'',createdAt:sale.createdAt,createdAtLabel:new Date(sale.createdAt).toLocaleString('pt-BR'),operator:sale.operator,items:sale.items,subtotal:sale.subtotal,discount:sale.discount,total:sale.total,paymentMethod:sale.paymentMode,pixMode:sale.pixMode||'',pixTxid:sale.pixTxid||'',baseTotal:sale.baseTotal??sale.total,creditInstallments:sale.creditInstallments||0,creditInterestPercent:sale.creditInterestPercent||0,creditInterestAmount:sale.creditInterestAmount||0,creditInstallmentValue:sale.creditInstallmentValue||0,paymentProvider:sale.paymentProvider||'',transactionId:sale.paymentTransactionId||'',authorizationCode:sale.paymentAuthorizationCode||'',cardBrand:sale.paymentCardBrand||'',providerReceiptUrl:sale.providerReceiptUrl||'',receiptKind:sale.paymentMode==='Marcar venda'?'MARKED':'PAYMENT',customerName:sale.markedCustomer?.name||'',customerCpf:sale.markedCustomer?.cpf||'',memberRegistration:sale.markedCustomer?.registration||''
    };
    window.santuarioDesktop?.logCashEvent?.('COMPROVANTE',{message:'Processando comprovante da venda',sale:sale.number,method:sale.paymentMode});
    if(!window.santuarioDesktop?.processPaymentReceipt)return{ok:false,error:'Recurso de comprovante disponível somente no aplicativo desktop.'};
    try{return await window.santuarioDesktop.processPaymentReceipt(receipt);}catch(err){return{ok:false,error:err?.message||'Falha ao processar comprovante.'};}
  }
  async function saveSale(d){
    if(!ensureCash())return;
    const t=totals();let mode=d.paymentMode;
    if(!['Dinheiro','PIX','Cartão de débito','Cartão de crédito','Marcar venda'].includes(mode)){toast('Forma de pagamento inválida','Selecione uma das formas disponíveis no quadro de itens.','error');return;}
    let payments=[],change=0,status='Concluída',markedCustomer=null,pixMode='',creditInstallments=0,creditInterestPercent=0,creditInterestAmount=0,creditInstallmentValue=0,finalTotal=t.total;
    let providerResult=null,paymentProvider='',providerOrder='',providerCaptureMethod='',providerPaidAmount=0;
    const integrations=integrationSettings();
    if(mode==='Marcar venda'){
      if(!d.markedCustomerType){toast('Escolha a identificação','Informe se a venda será marcada para um irmão cadastrado ou para uma pessoa não cadastrada.','error');return;}
      if(d.markedCustomerType==='member'){
        const member=(db.members||[]).find(item=>item.id===d.markedMemberId);if(!member){toast('Irmão não selecionado','Selecione um irmão cadastrado para marcar a venda.','error');return;}
        markedCustomer={type:'member',memberId:member.id,registration:member.registration||'',name:member.name,cpf:member.cpf||''};
      }else{
        const name=String(d.markedGuestName||'').trim(),cpf=String(d.markedGuestCpf||'').trim(),cpfDigits=cpf.replace(/\D/g,'');if(!name||cpfDigits.length!==11){toast('Dados incompletos','Informe o nome e um CPF com 11 dígitos.','error');return;}
        markedCustomer={type:'guest',memberId:'',registration:'',name,cpf};
      }
      status='Marcada';
    }else{
      const received=num(d.singleAmount);
      if(mode==='Cartão de crédito'){
        if(String(d.creditProviderManaged||'')==='1'&&integrations.cardProvider==='INFINITEPAY'&&integrations.cardChannel==='CHECKOUT'){
          creditInstallments=1;creditInterestPercent=0;creditInterestAmount=0;creditInstallmentValue=t.total;finalTotal=t.total;
        }else{
          const plan=creditPlan(t.total,Number(d.creditInstallments||1));creditInstallments=plan.installments;creditInterestPercent=plan.interestPercent;creditInterestAmount=plan.interestAmount;creditInstallmentValue=plan.installmentValue;finalTotal=plan.total;
          if(Math.abs(num(d.creditFinalTotal)-plan.total)>=.01){toast('Parcelamento alterado','Reabra a opção CRÉDITO e selecione novamente o parcelamento.','error');return;}
        }
      }
      if(mode==='Dinheiro'&&received<t.total){toast('Valor insuficiente','O dinheiro recebido é menor que o total da venda.','error');return;}
      if(mode!=='Dinheiro'&&Math.abs(received-finalTotal)>=.01){toast('Valor inválido',`O pagamento deve corresponder a ${A.money(finalTotal)}.`,'error');return;}
      if(mode==='PIX'){
        pixMode=String(d.pixMode||'FÍSICO').toUpperCase();
        if(!['FÍSICO','DIGITAL'].includes(pixMode))pixMode='FÍSICO';
        if(pixMode==='DIGITAL'){
          const integratedPix=integrations.pixProvider==='INFINITEPAY'||integrations.pixProvider==='GENERIC_HTTP';
          if(!integratedPix){
            if(!d.pixPayload||!d.pixTxid){toast('QR Code não gerado','Gere o QR Code PIX antes de confirmar o pagamento.','error');return;}
            db.treasurySettings.pixKey=String(d.pixKey||'').trim();db.treasurySettings.pixMerchantName=String(d.pixMerchantName||'').trim();db.treasurySettings.pixMerchantCity=String(d.pixMerchantCity||'').trim();
          }
        }
      }
      for(const item of cart){const product=db.treasuryProducts.find(entry=>entry.id===item.productId);if(!product||(!db.treasurySettings.allowNegativeStock&&product.stock<item.quantity)){toast('Estoque alterado',`Revise o estoque de ${item.name}.`,'error');render();return;}}
      if(['PIX','Cartão de débito','Cartão de crédito'].includes(mode)){
        providerOrder=providerOrderId(mode==='PIX'?'PIX':mode==='Cartão de débito'?'DEB':'CRE');
        const auth=await authorizeIntegratedPayment({mode,pixMode,amount:finalTotal,installments:creditInstallments||1,orderId:providerOrder});
        if(auth.required){
          providerResult=auth.result||{};
          if(!providerResult.approved){toast('Pagamento não concluído',providerResult.error||'O provedor não confirmou a transação.','error');return;}
          paymentProvider=String(providerResult.provider||integrations.cardProvider||integrations.pixProvider||'').replace(/^INFINITEPAY_/,'InfinitePay ');
          providerCaptureMethod=String(providerResult.captureMethod||'');
          providerPaidAmount=Number(providerResult.paidAmountCents||0)/100;
          if(providerCaptureMethod==='pix'){
            mode='PIX';pixMode='DIGITAL';creditInstallments=0;creditInterestPercent=0;creditInterestAmount=0;creditInstallmentValue=0;
          }else if(providerCaptureMethod==='credit_card'){
            mode='Cartão de crédito';pixMode='';creditInstallments=Math.max(1,Number(providerResult.installments||1));creditInterestPercent=0;creditInterestAmount=0;creditInstallmentValue=Number((finalTotal/creditInstallments).toFixed(2));
          }
        }
      }
      payments=[{method:mode,amount:finalTotal,...(mode==='PIX'?{mode:pixMode}:{}),...(mode==='Cartão de crédito'?{installments:creditInstallments,interestPercent:creditInterestPercent,interestAmount:creditInterestAmount,installmentValue:creditInstallmentValue}:{}),...(providerResult?{provider:paymentProvider||providerResult.provider||'',transactionId:providerResult.transactionId||providerResult.transactionNsu||'',authorizationCode:providerResult.authorizationCode||'',cardBrand:providerResult.cardBrand||'',orderId:providerResult.orderId||providerOrder}:{} )}];change=mode==='Dinheiro'?Number((received-t.total).toFixed(2)):0;
    }
    if(status==='Marcada')for(const item of cart){const product=db.treasuryProducts.find(entry=>entry.id===item.productId);if(!product||(!db.treasurySettings.allowNegativeStock&&product.stock<item.quantity)){toast('Estoque alterado',`Revise o estoque de ${item.name}.`,'error');render();return;}}
    const sale={
      id:A.uid('sale'),number:A.nextNumber(db,'VD','treasurySales'),sessionId:cash.id,status,saleType:cash.saleType||'',items:cart.map(item=>({...item,total:Number((item.price*item.quantity).toFixed(2))})),subtotal:t.subtotal,discount:t.discount,baseTotal:t.total,total:finalTotal,creditInstallments,creditInterestPercent,creditInterestAmount,creditInstallmentValue,payments,change,paymentMode:mode,pixMode,pixTxid:mode==='PIX'&&pixMode==='DIGITAL'?String(providerResult?.transactionNsu||providerResult?.transactionId||d.pixTxid||''):'',pixPayload:mode==='PIX'&&pixMode==='DIGITAL'?String(d.pixPayload||''):'',paymentProvider:paymentProvider||'',paymentProviderOrderId:providerResult?.orderId||providerOrder||'',paymentTransactionId:providerResult?.transactionId||providerResult?.transactionNsu||'',paymentAuthorizationCode:providerResult?.authorizationCode||'',paymentCardBrand:providerResult?.cardBrand||'',providerReceiptUrl:providerResult?.receiptUrl||'',providerCaptureMethod,providerPaidAmount,markedCustomer,outstandingAmount:status==='Marcada'?t.total:0,customer:markedCustomer?.name||'',memberId:markedCustomer?.memberId||'',memberRegistration:markedCustomer?.registration||'',customerCpf:markedCustomer?.cpf||'',notes:d.notes,operator:treasurySession.user.name,operatorId:treasurySession.user.id,createdAt:new Date().toISOString()
    };
    db.treasurySales.unshift(sale);
    if(status==='Marcada'){db.bills=Array.isArray(db.bills)?db.bills:[];db.bills.unshift({id:A.uid('bl'),direction:'receber',description:`Venda marcada — ${markedCustomer.name}`,category:'Vendas de evento',supplierId:'',accountId:'',amount:t.total,dueDate:A.todayISO(),status:'Aberta',recurrence:'Única',document:sale.number,approvalId:'',externalSaleId:sale.id,customerName:markedCustomer.name,customerCpf:markedCustomer.cpf,memberId:markedCustomer.memberId||'',notes:`Gerada pela Tesouraria Externa ${cash.number}`});}
    sale.items.forEach(item=>{const product=db.treasuryProducts.find(entry=>entry.id===item.productId);product.stock-=item.quantity;db.treasuryStockMoves.unshift({id:A.uid('sm'),productId:product.id,sessionId:cash.id,saleId:sale.id,type:'saida',quantity:item.quantity,reason:status==='Marcada'?'Venda marcada':'Venda',at:sale.createdAt,user:treasurySession.user.name});});
    A.audit(db,treasurySession.user,status==='Marcada'?'Registrou venda marcada':'Registrou venda externa',`${sale.number} — ${A.money(sale.total)} — ${status==='Marcada'?markedCustomer.name:payments.map(payment=>payment.method+(payment.mode?` ${payment.mode}`:'')+(payment.provider?` · ${payment.provider}`:'')).join(' + ')}`);A.saveData(db);
    cart=[];if(window.CurrencyBRL?.setValue)window.CurrencyBRL.setValue($('#saleDiscount'),0);else $('#saleDiscount').value='0';closeModal();toast(status==='Marcada'?'Venda marcada com sucesso':'Venda concluída',status==='Marcada'?`${sale.number} · ${A.money(sale.total)} · ${markedCustomer.name}`:`${sale.number} · ${A.money(sale.total)}${paymentProvider?` · ${paymentProvider}`:''}${change?` · troco ${A.money(change)}`:''}`);render();
    if(['PIX','Cartão de débito','Cartão de crédito','Marcar venda'].includes(mode)){
      const receiptResult=await processPaymentReceipt(sale);sale.receipt=receiptResult||null;A.saveData(db);
      if(receiptResult?.ok){toast(receiptResult.printed?'Comprovante impresso':'Comprovante salvo',receiptResult.printed?`Impresso em ${receiptResult.printerName||'impressora conectada'}.`:`Prévia aberta. Arquivo salvo em ${receiptResult.savedPath||'Documentos'}.`);}
      else toast('Venda concluída','O pagamento foi registrado, mas o comprovante não pôde ser processado.','error');
    }
  }
  function saveAdjustment(d){adjustmentAuthorization=null;const a={id:A.uid('eca'),sessionId:cash.id,type:d.type,amount:num(d.amount),reason:String(d.reason||'').trim()||'Não informado',at:new Date().toISOString(),user:d._authUser.name};db.externalCashAdjustments.unshift(a);A.audit(db,d._authUser,d.type==='sangria'?'Registrou sangria externa':'Registrou suprimento externo',`${cash.number} — ${A.money(a.amount)} — ${a.reason}`);A.saveData(db);closeModal();toast('Movimentação registrada',`${d.type==='sangria'?'Sangria':'Suprimento'} de ${A.money(a.amount)}.`);render();}
  function saveCloseCash(d){
    const counted=num(d.cashCounted),expected=num(d.expected),difference=Number((counted-expected).toFixed(2));
    const sales=sessionSales(),allSales=A.sessionSales(db,cash.id,{includeCancelled:true}),payments=A.paymentTotals(sales),adjustments=db.externalCashAdjustments.filter(a=>a.sessionId===cash.id),reinforcements=A.sum(adjustments.filter(a=>a.type==='reforco'),a=>a.amount),withdrawals=A.sum(adjustments.filter(a=>a.type==='sangria'),a=>a.amount),gross=A.sum(sales,s=>s.total),markedSales=sales.filter(s=>s.status==='Marcada'),markedTotal=A.sum(markedSales,s=>s.outstandingAmount||s.total),receivedTotal=gross-markedTotal,cost=A.sum(sales,s=>A.sum(s.items,i=>i.cost*i.quantity));
    cash.status='Fechado';cash.closedAt=d.closedAt;cash.closedBy=d._authUser.name;cash.closedById=d._authUser.id;
    cash.closing={salesCount:sales.length,cancelledSalesCount:allSales.filter(s=>s.status==='Cancelada').length,grossSales:gross,receivedSales:receivedTotal,markedSalesCount:markedSales.length,markedSalesTotal:markedTotal,cost,estimatedResult:gross-cost,payments,reinforcements,withdrawals,expectedCash:expected,cashCounted:counted,difference,notes:d.notes};
    postExternalTransactions(cash,sales,payments);
    const report=createExternalReport(cash,d._authUser,allSales,adjustments);
    A.audit(db,d._authUser,'Fechou Tesouraria Externa',`${cash.number} — faturamento ${A.money(gross)} — diferença ${A.money(difference)}`);
    A.saveData(db);
    A.notifyTreasuryEvent(db,'CLOSE',{operationType:'Tesouraria Externa',operationNumber:cash.number,operationName:`${cash.eventName} · ${cash.pointOfSale}`,user:d._authUser.name,at:cash.closedAt});
    if(difference<-0.009)A.notifyTreasuryEvent(db,'SHORTAGE',{operationType:'Tesouraria Externa',operationNumber:cash.number,operationName:`${cash.eventName} · ${cash.pointOfSale}`,user:d._authUser.name,at:cash.closedAt,amount:Math.abs(difference)});
    const number=cash.number;cash=null;cart=[];closeModal();toast('Caixa externo fechado',`${number} foi consolidado e o extrato foi criado.`);render();openReport(report.id,true);setTimeout(()=>location.href='tesouraria-painel.html',1200);
  }
  function createExternalReport(cashSession,treasurer,sales,adjustments){
    const existing=(db.treasuryClosureReports||[]).find(report=>report.operationId===cashSession.id&&report.type==='external');
    if(existing)return existing;
    const report={id:A.uid('trp'),type:'external',operationId:cashSession.id,number:`EXT-${cashSession.number}`,generatedAt:new Date().toISOString(),operator:{id:cashSession.operatorId||'',name:cashSession.operator||''},treasurer:{id:treasurer?.id||cashSession.closedById||'',name:treasurer?.name||cashSession.closedBy||''},snapshot:{session:A.clone(cashSession),sales:A.clone(sales),adjustments:A.clone(adjustments)}};
    db.treasuryClosureReports=Array.isArray(db.treasuryClosureReports)?db.treasuryClosureReports:[];
    db.treasuryClosureReports.unshift(report);cashSession.reportId=report.id;return report;
  }
  function openReport(reportId,autoPrint=false){window.open(`tesouraria-extrato.html?report=${encodeURIComponent(reportId)}${autoPrint?'&print=1':''}`,'_blank');}
  function postExternalTransactions(cashSession,sales,payments){if(cashSession.posted)return;db.transactions=Array.isArray(db.transactions)?db.transactions:[];const cashAccount=db.accounts?.find(a=>a.active&&A.normalize(a.type)==='caixa')||db.accounts?.[0],bankAccount=db.accounts?.find(a=>a.active&&A.normalize(a.type)!=='caixa')||cashAccount;Object.entries(payments).forEach(([method,amount])=>{if(amount<=0)return;db.transactions.unshift({id:A.uid('t'),type:'entrada',category:'Vendas de evento',costCenter:cashSession.department||'Eventos',description:`${cashSession.eventName} — ${method}`,amount:Number(amount),date:String(cashSession.closedAt).slice(0,10),accountId:method==='Dinheiro'?cashAccount?.id:bankAccount?.id,memberId:'',method,status:'confirmado',document:cashSession.number,cashSessionId:'',externalCashSessionId:cashSession.id,notes:`Consolidação de ${sales.length} venda(s) no ponto ${cashSession.pointOfSale}`});});cashSession.posted=true;}
  function saveProduct(id,d){const duplicate=db.treasuryProducts.find(p=>p.id!==id&&(A.normalize(p.code)===A.normalize(d.code)||(d.barcode&&A.normalize(p.barcode)===A.normalize(d.barcode))));if(duplicate){toast('Código já utilizado','Escolha outro código interno ou código de barras.','error');return;}let p=db.treasuryProducts.find(x=>x.id===id);if(!p){p={id:A.uid('tp'),active:true};db.treasuryProducts.unshift(p);}Object.assign(p,{code:d.code,barcode:d.barcode,name:d.name,saleType:normalizeSaleType(d.saleType)||'PRODUTOS',category:d.category,price:num(d.price),cost:num(d.cost),stock:Number(d.stock||0),minStock:Number(d.minStock||0)});A.audit(db,treasurySession.user,id?'Editou produto de venda':'Cadastrou produto de venda',`${p.code} — ${p.name}`);A.saveData(db);closeModal();toast('Produto salvo',p.name);render();}
  function saveCancelSale(id,d){const sale=db.treasurySales.find(s=>s.id===id&&s.status!=='Cancelada');if(!sale)return;sale.status='Cancelada';sale.cancelledAt=new Date().toISOString();sale.cancelledBy=d._authUser.name;sale.cancelReason=String(d.reason||'').trim()||'Não informado';const receivable=(db.bills||[]).find(item=>item.externalSaleId===sale.id&&item.status!=='Cancelada');if(receivable){receivable.status='Cancelada';receivable.notes=`Cancelada junto com ${sale.number}: ${sale.cancelReason}`;}sale.items.forEach(item=>{const p=db.treasuryProducts.find(x=>x.id===item.productId);if(p)p.stock+=item.quantity;db.treasuryStockMoves.unshift({id:A.uid('sm'),productId:item.productId,sessionId:sale.sessionId,saleId:sale.id,type:'entrada',quantity:item.quantity,reason:'Cancelamento de venda',at:sale.cancelledAt,user:d._authUser.name});});A.audit(db,d._authUser,'Cancelou venda externa',`${sale.number} — ${A.money(sale.total)} — ${sale.cancelReason}`);A.saveData(db);closeModal();toast('Venda cancelada',sale.number);render();}
  function toast(t,m,type='success'){const d=document.createElement('div');d.className=`treasury-toast ${type}`;d.innerHTML=`<strong>${A.esc(t)}</strong><span>${A.esc(m)}</span>`;$('#treasuryToastRegion').append(d);setTimeout(()=>d.remove(),3800);}
  init();
})();
