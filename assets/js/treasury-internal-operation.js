(() => {
  'use strict';
  const A=window.TreasuryApp, db=A.loadData();
  const generalUser=A.generalUser(db); let session=A.readTreasurySession(db);
  const $=selector=>document.querySelector(selector), num=value=>A.parseMoney(value);
  const operationId=new URLSearchParams(location.search).get('id');
  let operation=(db.treasuryOperations||[]).find(item=>item.id===operationId&&(item.type==='internal'||item.type==='cult'))||null;
  const paymentKeys=['cash','pix','debit','credit','transfer','check'];
  const nonCashPaymentKeys=paymentKeys.filter(key=>key!=='cash');
  const categoryKeys=['tithe','generalOffer','missions','campaigns','donations','other'];
  const paymentLabels={cash:'Dinheiro',pix:'PIX',debit:'Cartão de débito',credit:'Cartão de crédito',transfer:'Transferência',check:'Cheque'};
  const categoryLabels={tithe:'Dízimos',generalOffer:'Ofertas gerais',missions:'Missões',campaigns:'Campanhas',donations:'Doações',other:'Outras receitas'};
  const launchTypes=[
    {value:'Dízimo',label:'Dízimo',category:'tithe'},
    {value:'Oferta geral',label:'Oferta geral',category:'generalOffer'},
    {value:'Oferta missionária',label:'Oferta missionária',category:'missions'},
    {value:'Campanha ou propósito',label:'Campanha ou propósito',category:'campaigns'},
    {value:'Doação',label:'Doação',category:'donations'},
    {value:'Cantina ou venda',label:'Cantina ou venda',category:'other'},
    {value:'Evento ou inscrição',label:'Evento ou inscrição',category:'other'},
    {value:'Departamento ou ministério',label:'Departamento ou ministério',category:'other'},
    {value:'Outra entrada',label:'Outra entrada',category:'other'},
    {value:'Múltiplas finalidades',label:'Múltiplas finalidades',category:'mixed'}
  ];
  const denominations=[200,100,50,20,10,5,2,1,.5,.25,.1,.05];

  function guard(){
    if(!generalUser){location.replace('index.html');return false;}
    if(!session){location.replace('tesouraria-login.html');return false;}
    if(!A.canOperate(session.user,'internal','access')){location.replace('tesouraria-painel.html');return false;}
    if(!operation){location.replace('tesouraria-interna.html');return false;}
    return true;
  }
  function workflow(){
    operation.internalWorkflow=operation.internalWorkflow||{};
    const w=operation.internalWorkflow;
    w.receipts=Array.isArray(w.receipts)?w.receipts:[];
    w.cashCount=w.cashCount&&typeof w.cashCount==='object'?w.cashCount:{};
    w.paymentVerification=w.paymentVerification&&typeof w.paymentVerification==='object'?w.paymentVerification:{};
    nonCashPaymentKeys.forEach(key=>{
      const current=w.paymentVerification[key];
      w.paymentVerification[key]=current&&typeof current==='object'?current:{};
    });
    w.destinations=Array.isArray(w.destinations)?w.destinations:[];
    w.events=Array.isArray(w.events)?w.events:[];
    w.receipts.forEach((item,index)=>{
      item.launchCode=item.launchCode||`LAN-${String(index+1).padStart(3,'0')}`;
      item.designation=item.designation||inferDesignation(item);
      item.deliveryMode=item.deliveryMode||(item.sealStatus==='Entrega digital'?'Recebimento digital':item.bagCode?'Malote físico':'Entrega direta');
      item.identificationMode=item.identificationMode||inferIdentificationMode(item);
      item.source=item.source||'Origem não informada';
      item.description=item.description||'';
      if(!item.sealStatus&&item.deliveryMode==='Malote físico')item.sealStatus='Lacrado';
    });
    return w;
  }

  function sumReceipt(receipt,keys){return keys.reduce((sum,key)=>sum+num(receipt[key]),0);}
  function launchType(value){return launchTypes.find(item=>item.value===value)||null;}
  function launchCategory(value){return launchType(value)?.category||'other';}
  function inferDesignation(item){
    const used=categoryKeys.filter(key=>num(item[key])>0);
    if(used.length>1)return 'Múltiplas finalidades';
    const map={tithe:'Dízimo',generalOffer:'Oferta geral',missions:'Oferta missionária',campaigns:'Campanha ou propósito',donations:'Doação',other:'Outra entrada'};
    return map[used[0]]||'Outra entrada';
  }
  function inferIdentificationMode(item){
    const identified=num(item.identified),anonymous=num(item.anonymous);
    if(identified>0&&anonymous>0)return 'Misto';
    if(identified>0)return 'Identificado';
    return 'Anônimo';
  }
  function launchLabel(item){return item.designation||inferDesignation(item);}
  function launchDeliveryLabel(item){
    if(item.deliveryMode==='Malote físico')return item.bagCode?`Malote ${item.bagCode}`:'Malote físico';
    return item.deliveryMode||'Entrega direta';
  }
  function totals(){
    const w=workflow(),receipts=w.receipts;
    const payments=Object.fromEntries(paymentKeys.map(key=>[key,receipts.reduce((sum,item)=>sum+num(item[key]),0)]));
    const categories=Object.fromEntries(categoryKeys.map(key=>[key,receipts.reduce((sum,item)=>sum+num(item[key]),0)]));
    const declaredTotal=Object.values(payments).reduce((sum,value)=>sum+value,0);
    const cashExpected=payments.cash;
    const cashCounted=Object.entries(w.cashCount).reduce((sum,[value,qty])=>sum+num(value)*num(qty),0);
    const cashDifference=Number((cashCounted-cashExpected).toFixed(2));
    const paymentVerification={
      cash:{
        expected:cashExpected,
        confirmed:cashCounted,
        difference:cashDifference,
        verified:cashExpected===0||Boolean(w.cashCountedAt),
        confirmedAt:w.cashCountedAt||'',
        confirmedBy:w.cashCountedBy||''
      }
    };
    nonCashPaymentKeys.forEach(key=>{
      const entry=w.paymentVerification[key]||{};
      const expected=payments[key];
      const confirmed=entry.confirmedAt?num(entry.amount):0;
      paymentVerification[key]={
        expected,
        confirmed,
        difference:Number((confirmed-expected).toFixed(2)),
        verified:expected===0||Boolean(entry.confirmedAt),
        confirmedAt:entry.confirmedAt||'',
        confirmedBy:entry.confirmedBy||'',
        reference:entry.reference||''
      };
    });
    const confirmedTotal=paymentKeys.reduce((sum,key)=>sum+paymentVerification[key].confirmed,0);
    const receivingDifference=Number((confirmedTotal-declaredTotal).toFixed(2));
    const allPaymentsVerified=paymentKeys.every(key=>paymentVerification[key].verified);
    const allPaymentsReconciled=allPaymentsVerified&&paymentKeys.every(key=>Math.abs(paymentVerification[key].difference)<.01);
    const actualTotal=Number(confirmedTotal.toFixed(2));
    const classified=Object.values(categories).reduce((sum,value)=>sum+value,0);
    const identified=receipts.reduce((sum,item)=>sum+num(item.identified),0);
    const anonymous=receipts.reduce((sum,item)=>sum+num(item.anonymous),0);
    const identityTotal=identified+anonymous;
    const classificationDifference=Number((declaredTotal-classified).toFixed(2));
    const identityDifference=Number((declaredTotal-identityTotal).toFixed(2));
    const destinationTotal=workflow().destinations.reduce((sum,item)=>sum+num(item.amount),0);
    const destinationDifference=Number((actualTotal-destinationTotal).toFixed(2));
    const envelopes=receipts.reduce((sum,item)=>sum+Number(item.envelopes||0),0);
    return {payments,categories,declaredTotal,cashExpected,cashCounted,cashDifference,paymentVerification,confirmedTotal,receivingDifference,allPaymentsVerified,allPaymentsReconciled,actualTotal,classified,identified,anonymous,identityTotal,classificationDifference,identityDifference,destinationTotal,destinationDifference,envelopes};
  }
  function submissionIssues(){
    const t=totals(),w=workflow(),issues=[];
    const add=(condition,message)=>{if(!condition)issues.push(message);};
    add(Boolean(operation.title&&operation.date&&operation.time&&operation.congregation&&operation.collectionLeader),'Complete os dados da operação.');
    add(w.receipts.length>0&&t.declaredTotal>0,'Adicione pelo menos um lançamento com valor.');
    const launchCodes=w.receipts.map(item=>A.normalize(item.launchCode)).filter(Boolean);
    add(w.receipts.every(item=>item.launchCode&&item.designation&&item.source&&item.deliveredBy&&item.receivedAt&&sumReceipt(item,paymentKeys)>0),'Complete a identificação, a origem, o responsável, a data e o valor de todos os lançamentos.');
    add(launchCodes.length===new Set(launchCodes).size,'Existem códigos de lançamento repetidos.');
    const physical=w.receipts.filter(item=>item.deliveryMode==='Malote físico');
    const bagCodes=physical.map(item=>A.normalize(item.bagCode)).filter(Boolean);
    add(physical.every(item=>item.bagCode&&item.sealStatus),'Complete o código e a condição de cada malote físico.');
    add(bagCodes.length===new Set(bagCodes).size,'Existem códigos de malote repetidos.');
    add(t.cashExpected===0||Boolean(w.cashCountedAt),'Realize a contagem individual das cédulas e moedas.');
    add(nonCashPaymentKeys.every(key=>t.paymentVerification[key].verified),'Confirme os valores recebidos por PIX, cartões, transferência e cheque.');
    add(t.allPaymentsReconciled,'Existem diferenças entre os valores declarados e os valores confirmados por forma de recebimento.');
    add(w.receipts.every(item=>Math.abs(sumReceipt(item,paymentKeys)-sumReceipt(item,categoryKeys))<.01),'A finalidade de um ou mais lançamentos não corresponde ao valor recebido.');
    add(w.receipts.every(item=>Math.abs(sumReceipt(item,paymentKeys)-num(item.identified)-num(item.anonymous))<.01),'A identificação de um ou mais lançamentos não corresponde ao valor recebido.');
    const protocols=w.destinations.map(item=>A.normalize(item.protocol)).filter(Boolean);
    add(w.destinations.length>0&&Math.abs(t.destinationDifference)<.01,'Defina a destinação integral do valor disponível.');
    add(w.destinations.every(item=>item.type&&num(item.amount)>0&&item.date&&item.responsible&&item.protocol),'Complete os dados de todas as destinações.');
    add(protocols.length===new Set(protocols).size,'Existem protocolos de destinação repetidos.');
    const approvers=(db.users||[]).filter(user=>A.canOperate(user,'internal','close'));
    add(approvers.some(user=>user.id!==session.user.id),'É necessário outro operador autorizado para a aprovação final.');
    return issues;
  }
  function checks(){
    const t=totals(),w=workflow();
    return [
      {key:'receipt',label:'Lançamentos',description:'',ok:w.receipts.length>0&&t.declaredTotal>0&&w.receipts.every(item=>item.designation&&item.launchCode)},
      {key:'cash',label:'Conferência dos recebimentos',description:'',ok:t.allPaymentsReconciled},
      {key:'classification',label:'Distribuição',description:'',ok:t.classified>0&&Math.abs(t.classificationDifference)<.01&&Math.abs(t.identityDifference)<.01},
      {key:'destination',label:'Destinação',description:'',ok:t.actualTotal>0&&Math.abs(t.destinationDifference)<.01},
      {key:'approval',label:'Análise humana',description:'',ok:operation.status==='Aguardando aprovação'||operation.status==='Fechado'}
    ];
  }
  function readyForHumanAnalysis(){return submissionIssues().length===0;}
  function statusLabel(){
    if(operation.status==='Fechado')return 'Fechada';
    if(operation.status==='Aguardando aprovação')return 'Em análise humana';
    const c=checks();
    if(!c[0].ok)return 'Aguardando lançamentos';
    if(!c[1].ok)return 'Conferência pendente';
    if(!c[2].ok)return 'Distribuição pendente';
    if(!c[3].ok)return 'Destinação pendente';
    return readyForHumanAnalysis()?'Pronta para análise':'Ajustes pendentes';
  }

  function locked(){return operation.status==='Aguardando aprovação'||operation.status==='Fechado';}
  function addEvent(type,title,detail,user){
    workflow().events.unshift({id:A.uid('iwe'),type,title,detail,at:new Date().toISOString(),userId:user?.id||session.user.id,userName:user?.name||session.user.name});
  }
  function persist(action='',detail=''){
    if(operation.status==='Aberto'&&workflow().receipts.length)operation.status='Em conferência';
    operation.updatedAt=new Date().toISOString();
    if(action)A.audit(db,session.user,action,detail||operation.number);
    A.saveData(db);
  }
  function init(){
    A.applyTheme();if(!guard())return;workflow();A.saveData(db);
    $('#workspaceChurchName').textContent=db.church?.name||'Santuário Gestão';
    $('#workspaceThemeBtn').addEventListener('click',()=>A.toggleTheme());
    $('#workspaceBackBtn').addEventListener('click',()=>location.href='tesouraria-interna.html');
    $('#workspaceExitBtn').addEventListener('click',()=>{A.clearTreasurySession(db);location.href='tesouraria-login.html';});
    $('#closeTreasuryModal').addEventListener('click',closeModal);
    $('#treasuryModalBackdrop').addEventListener('click',event=>{if(event.target===event.currentTarget)closeModal();});
    document.addEventListener('click',handleClick);
    document.addEventListener('submit',handleSubmit);
    document.addEventListener('input',handleLiveInput);
    render();
  }
  function render(){
    const t=totals(),c=checks(),w=workflow(),completed=c.filter(item=>item.ok).length;
    document.title=`${operation.number} — Tesouraria Interna`;
    $('#workspaceHero').innerHTML=`<div><span class="treasury-operation-type ${operation.status==='Aguardando aprovação'?'approval':'cult'}">${A.esc(statusLabel()).toUpperCase()}</span><h1>${A.esc(operation.title)}</h1><p>${A.esc(operation.number)} · ${A.dateBR(operation.date)} às ${A.esc(operation.time)} · ${A.esc(operation.congregation)}</p></div><div class="internal-workspace-hero-actions"><span><small>RESPONSÁVEL PELA COLETA</small><strong>${A.esc(operation.collectionLeader||'Não informado')}</strong></span><span><small>ABERTO POR</small><strong>${A.esc(operation.openedBy)}</strong></span></div>`;
    $('#workflowSteps').innerHTML=c.map((item,index)=>`<a href="#${item.key}Panel" class="${item.ok?'done':''}"><i>${item.ok?'✓':index+1}</i><span><strong>${A.esc(item.label)}</strong><small>${item.ok?'Concluída':'Pendente'}</small></span></a>`).join('');
    $('#workspaceMetrics').innerHTML=[['Total declarado',A.money(t.declaredTotal),`${w.receipts.length} lançamento(s)`],['Total confirmado',A.money(t.confirmedTotal),`Diferença ${A.money(t.receivingDifference)}`],['Distribuído',A.money(t.classified),`Diferença ${A.money(t.classificationDifference)}`],['Destinado',A.money(t.destinationTotal),`Diferença ${A.money(t.destinationDifference)}`]].map(([a,b,d])=>`<article><small>${A.esc(a)}</small><strong>${A.esc(b)}</strong><span>${A.esc(d)}</span></article>`).join('');
    renderReceipts(t);renderCash(t);renderClassification(t);renderDestinations(t);renderApproval(t,c);renderSummary(t,c,completed);
  }

  function panelHead(kicker,title,description,action=''){
    return `<header class="internal-workspace-panel-head"><div><span>${A.esc(kicker)}</span><h2>${A.esc(title)}</h2></div>${action}</header>`;
  }
  function renderReceipts(t){
    const w=workflow(),button=!locked()?'<button class="treasury-small-primary" data-action="add-receipt">+ Adicionar lançamento</button>':'';
    const rows=w.receipts.map((item,index)=>{
      const total=sumReceipt(item,paymentKeys),allocated=sumReceipt(item,categoryKeys);
      const reconciled=Math.abs(total-allocated)<.01&&Math.abs(total-num(item.identified)-num(item.anonymous))<.01;
      return `<tr>
        <td><strong>${A.esc(item.launchCode||`LAN-${String(index+1).padStart(3,'0')}`)}</strong><small><span class="launch-purpose-badge">${A.esc(launchLabel(item))}</span>${item.description?` · ${A.esc(item.description)}`:''}</small></td>
        <td><strong>${A.esc(item.source||'—')}</strong><small>${A.esc(launchDeliveryLabel(item))}</small></td>
        <td>${A.esc(item.deliveredBy||'—')}</td>
        <td>${A.money(total)}</td>
        <td><span class="internal-mini-status ${reconciled?'ok':'pending'}">${reconciled?'Conferido':'Revisar'}</span></td>
        <td><div class="internal-row-actions">${!locked()?`<button data-action="edit-receipt" data-id="${item.id}">Editar</button><button class="danger" data-action="delete-receipt" data-id="${item.id}">Excluir</button>`:'<span>Bloqueado</span>'}</div></td>
      </tr>`;
    }).join('');
    $('#receiptPanel').innerHTML=panelHead('ETAPA 1','Identificar e registrar lançamentos','Primeiro informe a que o valor se refere. O malote é apenas uma forma opcional de entrega.',button)+(w.receipts.length?`<div class="internal-table-wrap"><table class="internal-workflow-table"><thead><tr><th>Lançamento / finalidade</th><th>Origem / entrega</th><th>Responsável</th><th>Valor</th><th>Conferência</th><th></th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3"><strong>Total declarado</strong></td><td><strong>${A.money(t.declaredTotal)}</strong></td><td colspan="2"></td></tr></tfoot></table></div>`:`<div class="treasury-empty-state compact"><strong>Nenhum lançamento registrado</strong></div>`);
  }

  function renderCash(t){
    const actions=[];
    if(!locked()&&(t.cashExpected>0||workflow().cashCountedAt))actions.push('<button class="treasury-small-primary" data-action="count-cash">Contar dinheiro</button>');
    if(!locked()&&nonCashPaymentKeys.some(key=>t.payments[key]>0))actions.push('<button class="treasury-small-primary" data-action="verify-payments">Conferir PIX e outros</button>');
    const reconciliationRows=paymentKeys.filter(key=>t.paymentVerification[key].expected>0||t.paymentVerification[key].confirmed>0).map(key=>{
      const item=t.paymentVerification[key];
      const state=!item.verified?'Pendente':Math.abs(item.difference)<.01?'Conferido':'Divergente';
      const cls=!item.verified?'pending':Math.abs(item.difference)<.01?'ok':'warning';
      return `<tr><td><strong>${A.esc(paymentLabels[key])}</strong>${item.reference?`<small>${A.esc(item.reference)}</small>`:''}</td><td class="right">${A.money(item.expected)}</td><td class="right">${A.money(item.confirmed)}</td><td class="right ${cls}">${A.money(item.difference)}</td><td><span class="internal-mini-status ${cls}">${state}</span></td></tr>`;
    }).join('');
    const denominationRows=denominations.filter(value=>num(workflow().cashCount[value])>0).map(value=>`<div><span>${A.money(value)} × ${num(workflow().cashCount[value])}</span><strong>${A.money(value*num(workflow().cashCount[value]))}</strong></div>`).join('');
    $('#cashPanel').innerHTML=panelHead('ETAPA 2','Conferência por forma de recebimento','',actions.join(' '))+`<div class="internal-table-wrap"><table class="internal-workflow-table"><thead><tr><th>Forma</th><th class="right">Declarado</th><th class="right">Confirmado</th><th class="right">Diferença</th><th>Situação</th></tr></thead><tbody>${reconciliationRows||'<tr><td colspan="5">Nenhum valor informado.</td></tr>'}</tbody><tfoot><tr><td><strong>Total</strong></td><td class="right"><strong>${A.money(t.declaredTotal)}</strong></td><td class="right"><strong>${A.money(t.confirmedTotal)}</strong></td><td class="right"><strong>${A.money(t.receivingDifference)}</strong></td><td><span class="internal-mini-status ${t.allPaymentsReconciled?'ok':'pending'}">${t.allPaymentsReconciled?'Conciliado':'Pendente'}</span></td></tr></tfoot></table></div>${denominationRows?`<div class="internal-denomination-summary">${denominationRows}</div>`:''}`;
  }
  function renderClassification(t){
    const paymentRows=paymentKeys.map(key=>`<tr><td>${A.esc(paymentLabels[key])}</td><td class="right">${A.money(t.payments[key])}</td></tr>`).join('');
    const categoryRows=categoryKeys.map(key=>`<tr><td>${A.esc(categoryLabels[key])}</td><td class="right">${A.money(t.categories[key])}</td></tr>`).join('');
    $('#classificationPanel').innerHTML=panelHead('ETAPA 3','Resumo e distribuição dos lançamentos','A finalidade escolhida em cada lançamento é alocada automaticamente; somente lançamentos mistos exigem divisão manual.')+`<div class="internal-reconciliation-grid"><section><h3>Formas de recebimento</h3><table>${paymentRows}<tr class="total"><td>Total declarado</td><td class="right">${A.money(t.declaredTotal)}</td></tr><tr class="actual"><td>Total confirmado</td><td class="right">${A.money(t.confirmedTotal)}</td></tr></table></section><section><h3>Finalidade dos lançamentos</h3><table>${categoryRows}<tr class="total"><td>Total distribuído</td><td class="right">${A.money(t.classified)}</td></tr><tr class="${Math.abs(t.classificationDifference)<.01?'ok':'warning'}"><td>Diferença</td><td class="right">${A.money(t.classificationDifference)}</td></tr></table></section><section><h3>Identificação</h3><table><tr><td>Valores identificados</td><td class="right">${A.money(t.identified)}</td></tr><tr><td>Valores anônimos</td><td class="right">${A.money(t.anonymous)}</td></tr><tr class="total"><td>Total identificado</td><td class="right">${A.money(t.identityTotal)}</td></tr><tr class="${Math.abs(t.identityDifference)<.01?'ok':'warning'}"><td>Diferença</td><td class="right">${A.money(t.identityDifference)}</td></tr></table></section></div><p class="internal-panel-help">Para corrigir a finalidade ou a identificação, edite o lançamento na Etapa 1. O sistema recalcula este resumo automaticamente.</p>`;
  }

  function renderDestinations(t){
    const w=workflow(),button=!locked()?'<button class="treasury-small-primary" data-action="add-destination">+ Definir destinação</button>':'';
    const rows=w.destinations.map(item=>`<tr><td><strong>${A.esc(item.type)}</strong><small>${A.esc(destinationAccount(item))}${item.protocol?` · ${A.esc(item.protocol)}`:''}</small></td><td>${A.esc(item.responsible||'—')}</td><td>${A.dateBR(item.date)}</td><td>${A.money(item.amount)}</td><td><div class="internal-row-actions">${!locked()?`<button data-action="edit-destination" data-id="${item.id}">Editar</button><button class="danger" data-action="delete-destination" data-id="${item.id}">Excluir</button>`:'<span>Bloqueado</span>'}</div></td></tr>`).join('');
    $('#destinationPanel').innerHTML=panelHead('ETAPA 4','Custódia e destinação','Informe onde cada parte do valor ficará: banco, cofre, caixa interno ou outra custódia.',button)+(w.destinations.length?`<div class="internal-table-wrap"><table class="internal-workflow-table"><thead><tr><th>Destino</th><th>Responsável</th><th>Data prevista</th><th>Valor</th><th></th></tr></thead><tbody>${rows}</tbody><tfoot><tr><td colspan="3"><strong>Total destinado</strong></td><td><strong>${A.money(t.destinationTotal)}</strong></td><td></td></tr></tfoot></table></div>`:`<div class="treasury-empty-state compact"><strong>Nenhuma destinação definida</strong></div>`)+`<div class="internal-destination-balance ${Math.abs(t.destinationDifference)<.01&&t.actualTotal>0?'ok':'warning'}"><span>Valor ainda sem destinação</span><strong>${A.money(t.destinationDifference)}</strong></div>`;
  }
  function renderApproval(t,c){
    const w=workflow(),events=w.events.slice(0,8).map(item=>`<li><i></i><div><strong>${A.esc(item.title)}</strong><span>${A.esc(item.detail||'')}</span><small>${A.esc(item.userName||'Operador')} · ${A.dateTimeBR(item.at)}</small></div></li>`).join('');
    let action='',message='';
    if(operation.status==='Aguardando aprovação'){
      message=`Enviada por ${A.esc(operation.submittedBy)} em ${A.dateTimeBR(operation.submittedAt)}.`;
      action=`<div class="internal-approval-actions"><button data-action="return-adjustment">Devolver para correção</button><button class="primary" data-action="approve-close">Analisar e aprovar</button></div>`;
    }else if(operation.status==='Fechado'){
      message=`Aprovada por ${A.esc(operation.closedBy)} em ${A.dateTimeBR(operation.closedAt)}.`;
      action=`<div class="internal-approval-actions"><button data-action="open-report">Abrir extrato</button></div>`;
    }else{
      message=readyForHumanAnalysis()?'Operação pronta para ser enviada.':'Conclua as etapas pendentes antes do envio.';
      action=`<div class="internal-approval-actions"><button class="primary" data-action="submit-approval">Mandar para análise</button></div>`;
    }
    $('#approvalPanel').innerHTML=panelHead('ETAPA 5','Análise e fechamento','')+`<div class="internal-approval-box"><div><small>SITUAÇÃO ATUAL</small><strong>${A.esc(statusLabel())}</strong>${message?`<span>${message}</span>`:''}</div>${action}</div><ol class="internal-audit-timeline">${events||'<li><i></i><div><strong>Sem movimentações</strong></div></li>'}</ol>`;
  }
  function renderSummary(t,c,completed){
    $('#workspaceSummary').innerHTML=`<div class="internal-summary-card totals"><h3>Resumo financeiro</h3><div><span>Valor declarado</span><strong>${A.money(t.declaredTotal)}</strong></div><div><span>Valor confirmado</span><strong>${A.money(t.confirmedTotal)}</strong></div><div class="result ${Math.abs(t.receivingDifference)<.01&&t.allPaymentsVerified?'ok':'warning'}"><span>Diferença dos recebimentos</span><strong>${A.money(t.receivingDifference)}</strong></div><div><span>Distribuído</span><strong>${A.money(t.classified)}</strong></div><div><span>Destinado</span><strong>${A.money(t.destinationTotal)}</strong></div><div class="result ${Math.abs(t.destinationDifference)<.01?'ok':'warning'}"><span>Saldo sem destinação</span><strong>${A.money(t.destinationDifference)}</strong></div></div>`;
  }
  function destinationAccount(item){const account=(db.accounts||[]).find(acc=>acc.id===item.accountId);return account?.name||item.accountName||item.protocol||'Destino sem conta vinculada';}
  function handleClick(event){
    const button=event.target.closest('[data-action]');if(!button)return;
    const action=button.dataset.action,id=button.dataset.id;
    if(action==='add-receipt')openReceipt();
    if(action==='edit-receipt')openReceipt(id);
    if(action==='delete-receipt')deleteReceipt(id);
    if(action==='count-cash')openCashCount();
    if(action==='verify-payments')openPaymentVerification();
    if(action==='add-destination')openDestination();
    if(action==='edit-destination')openDestination(id);
    if(action==='delete-destination')deleteDestination(id);
    if(action==='submit-approval')openSubmitApproval();
    if(action==='approve-close')openApproval();
    if(action==='return-adjustment')openReturnAdjustment();
    if(action==='open-report')openReport();
  }

  function openModal(kicker,title,subtitle,body){$('#treasuryModalKicker').textContent=kicker;$('#treasuryModalTitle').textContent=title;$('#treasuryModalSubtitle').textContent=subtitle;$('#treasuryModalBody').innerHTML=body;$('#treasuryModalBackdrop').hidden=false;bindModalClose();}
  function closeModal(){$('#treasuryModalBackdrop').hidden=true;$('#treasuryModalBody').innerHTML='';}
  function bindModalClose(){document.querySelectorAll('[data-action-modal-close]').forEach(button=>button.addEventListener('click',closeModal));}
  function moneyField(name,label,value=0){return `<label><span>${A.esc(label)}</span><input name="${name}" type="number" min="0" step="0.01" value="${num(value).toFixed(2)}"></label>`;}
  function personSelect(name,label,selected='',options={}){
    const required=options.required===false?'':' required';
    return `<label><span>${A.esc(label)}</span><select name="${A.esc(name)}"${required}>${A.personOptions(db,selected,{treasuryOnly:Boolean(options.treasuryOnly),excludeUserId:options.excludeUserId||'',includeBlank:options.includeBlank!==false,blankLabel:options.blankLabel||'Selecione uma pessoa'})}</select></label>`;
  }
  function nextBagCode(){
    const values=workflow().receipts.map(item=>String(item.bagCode||''));let max=0;
    values.forEach(value=>{const match=value.match(/^MAL-(\d+)$/i);if(match)max=Math.max(max,Number(match[1]));});
    return `MAL-${String(max+1).padStart(2,'0')}`;
  }
  function nextLaunchCode(){
    const values=workflow().receipts.map(item=>String(item.launchCode||''));let max=0;
    values.forEach(value=>{const match=value.match(/^LAN-(\d+)$/i);if(match)max=Math.max(max,Number(match[1]));});
    return `LAN-${String(max+1).padStart(3,'0')}`;
  }

  function nextDestinationProtocol(){
    const prefix=`${operation.number}-DST`;let max=0;
    workflow().destinations.forEach(item=>{const match=String(item.protocol||'').match(new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}-(\\d+)$`,'i'));if(match)max=Math.max(max,Number(match[1]));});
    return `${prefix}-${String(max+1).padStart(3,'0')}`;
  }
  function authBlock(title='Confirmação do responsável'){return `<div class="treasury-auth-confirm"><strong>${A.esc(title)}</strong><div class="treasury-form-grid two"><label><span>Login da Tesouraria</span><input name="authIdentity" value="${A.esc(session.user.treasuryLogin||session.user.treasuryCode||'')}" autocapitalize="none" required></label><label><span>Senha</span><input name="authPassword" type="password" required></label></div></div>`;}
  function openReceipt(id=''){
    if(locked())return;
    const item=workflow().receipts.find(row=>row.id===id)||{};
    const designation=item.designation||'';
    const deliveryMode=item.deliveryMode||'';
    const identificationMode=item.identificationMode||inferIdentificationMode(item);
    const typeOptions=`<option value="">Selecione a finalidade</option>${launchTypes.map(type=>`<option value="${A.esc(type.value)}" ${designation===type.value?'selected':''}>${A.esc(type.label)}</option>`).join('')}`;
    openModal('LANÇAMENTO',id?'Editar lançamento':'Adicionar lançamento','Defina primeiro a que o valor se refere; depois informe como ele foi recebido.',`<form data-form="receipt" data-id="${A.esc(id)}" class="treasury-form launch-form">
      <section class="launch-form-section">
        <header><span>1</span><div><strong>Identificação do lançamento</strong><small>O malote não define o lançamento. Aqui você informa do que o valor realmente se trata.</small></div></header>
        <div class="treasury-form-grid two">
          <label><span>Código do lançamento</span><input name="launchCode" value="${A.esc(item.launchCode||nextLaunchCode())}" required><small>Gerado automaticamente e liberado para edição.</small></label>
          <label><span>A que este lançamento se refere?</span><select name="designation" required>${typeOptions}</select></label>
          <label><span>Origem / departamento</span><input name="source" value="${A.esc(item.source||'Templo principal')}" placeholder="Ex.: templo, infantil, jovens, cantina" required></label>
          <label><span>Descrição complementar</span><input name="description" value="${A.esc(item.description||'')}" placeholder="Ex.: oferta do culto da manhã, venda de almoço"></label>
        </div>
      </section>

      <section class="launch-form-section">
        <header><span>2</span><div><strong>Forma de entrega e responsável</strong><small>O malote só será solicitado quando a opção “Malote físico” for escolhida.</small></div></header>
        <div class="treasury-form-grid three">
          <label><span>Forma de entrega</span><select name="deliveryMode" required>
            <option value="">Selecione</option>
            ${['Malote físico','Envelopes / caixa','Recebimento digital','Entrega direta'].map(value=>`<option ${deliveryMode===value?'selected':''}>${value}</option>`).join('')}
          </select></label>
          ${personSelect('deliveredBy','Entregue / informado por',item.deliveredBy||operation.collectionLeader||'',{blankLabel:'Selecione o responsável'})}
          <label><span>Recebido em</span><input name="receivedAt" type="datetime-local" value="${A.esc(item.receivedAt||A.localDateTimeInput())}" required></label>
          <label><span>Quantidade de envelopes</span><input name="envelopes" type="number" min="0" value="${Number(item.envelopes||0)}"></label>
        </div>
        <div class="treasury-form-grid two launch-bag-fields" data-bag-details ${deliveryMode==='Malote físico'?'':'hidden'}>
          <label><span>Código do malote</span><input name="bagCode" value="${A.esc(item.bagCode||nextBagCode())}"><small>Automático e editável.</small></label>
          <label><span>Condição do lacre</span><select name="sealStatus">
            <option ${item.sealStatus==='Lacrado'?'selected':''}>Lacrado</option>
            <option ${item.sealStatus==='Sem lacre'?'selected':''}>Sem lacre</option>
            <option ${item.sealStatus==='Lacre rompido'?'selected':''}>Lacre rompido</option>
          </select></label>
        </div>
      </section>

      <section class="launch-form-section">
        <header><span>3</span><div><strong>Valores por forma de recebimento</strong><small>Digite os números normalmente; a máscara monetária posiciona os centavos.</small></div></header>
        <div class="treasury-form-grid three">${paymentKeys.map(key=>moneyField(key,paymentLabels[key],item[key])).join('')}</div>
        <div class="internal-modal-summary"><span>Total deste lançamento</span><strong data-receipt-total>${A.money(sumReceipt(item,paymentKeys))}</strong></div>
      </section>

      <section class="launch-form-section" data-auto-purpose>
        <header><span>4</span><div><strong>Alocação da finalidade</strong><small data-auto-purpose-text>${designation&&designation!=='Múltiplas finalidades'?`O total será alocado automaticamente em ${A.esc(designation)}.`:'Escolha a finalidade do lançamento.'}</small></div></header>
        <div class="launch-auto-allocation"><span>O sistema fará a distribuição automaticamente com base na finalidade selecionada.</span></div>
      </section>
      <section class="launch-form-section" data-mixed-purpose ${designation==='Múltiplas finalidades'?'':'hidden'}>
        <header><span>4</span><div><strong>Divisão entre finalidades</strong><small>Use apenas quando um mesmo recebimento reúne mais de uma finalidade.</small></div></header>
        <div class="treasury-form-grid three">${categoryKeys.map(key=>moneyField(key,categoryLabels[key],item[key])).join('')}</div>
        <div class="internal-live-summary"><div><small>TOTAL DO LANÇAMENTO</small><strong data-purpose-total>${A.money(sumReceipt(item,paymentKeys))}</strong></div><div><small>TOTAL DISTRIBUÍDO</small><strong data-purpose-allocated>${A.money(sumReceipt(item,categoryKeys))}</strong></div><div><small>DIFERENÇA</small><strong data-purpose-difference>${A.money(sumReceipt(item,paymentKeys)-sumReceipt(item,categoryKeys))}</strong></div></div>
      </section>

      <section class="launch-form-section">
        <header><span>5</span><div><strong>Identificação do valor</strong><small>Informe se o valor possui identificação de membro/doador ou se é anônimo.</small></div></header>
        <div class="treasury-form-grid two">
          <label><span>Tipo de identificação</span><select name="identificationMode">
            ${['Identificado','Anônimo','Misto'].map(value=>`<option ${identificationMode===value?'selected':''}>${value}</option>`).join('')}
          </select></label>
          <div class="launch-identification-preview"><span>Distribuição automática</span><strong data-identity-preview>${identificationMode==='Identificado'?'100% identificado':identificationMode==='Misto'?'Divisão manual':'100% anônimo'}</strong></div>
        </div>
        <div class="treasury-form-grid two" data-identification-split ${identificationMode==='Misto'?'':'hidden'}>
          ${moneyField('identified','Valor identificado',item.identified)}
          ${moneyField('anonymous','Valor anônimo',item.anonymous)}
        </div>
        <div class="internal-live-summary" data-identification-summary ${identificationMode==='Misto'?'':'hidden'}>
          <div><small>TOTAL DO LANÇAMENTO</small><strong data-identity-total>${A.money(sumReceipt(item,paymentKeys))}</strong></div>
          <div><small>IDENTIFICADO + ANÔNIMO</small><strong data-identity-allocated>${A.money(num(item.identified)+num(item.anonymous))}</strong></div>
          <div><small>DIFERENÇA</small><strong data-identity-difference>${A.money(sumReceipt(item,paymentKeys)-num(item.identified)-num(item.anonymous))}</strong></div>
        </div>
      </section>

      <label><span>Observações</span><textarea name="notes" placeholder="Registre qualquer ocorrência ou informação adicional.">${A.esc(item.notes||'')}</textarea></label>
      <div class="treasury-form-actions"><button type="button" data-action-modal-close>Cancelar</button><button class="primary" type="submit">Salvar lançamento</button></div>
    </form>`);
    syncReceiptForm(document.querySelector('form[data-form="receipt"]'));
  }

  function openClassification(id){
    openReceipt(id);
  }

  function openCashCount(){
    if(locked())return;const t=totals(),w=workflow();
    openModal('CONTAGEM FÍSICA','Cédulas e moedas',`Dinheiro declarado nos lançamentos: ${A.money(t.cashExpected)}.`,`<form data-form="cash" class="treasury-form"><div class="internal-denomination-grid">${denominations.map(value=>`<label><span>${A.money(value)}</span><input name="denom_${String(value).replace('.','_')}" data-denomination="${value}" type="number" min="0" step="1" value="${num(w.cashCount[value])}"><small data-denomination-total>${A.money(value*num(w.cashCount[value]))}</small></label>`).join('')}</div><div class="internal-live-summary"><div><small>DECLARADO</small><strong>${A.money(t.cashExpected)}</strong></div><div><small>CONTADO</small><strong data-cash-counted>${A.money(t.cashCounted)}</strong></div><div><small>SOBRA / FALTA</small><strong data-cash-difference>${A.money(t.cashDifference)}</strong></div><div><small>SITUAÇÃO</small><strong data-cash-status>${Math.abs(t.cashDifference)<.01?'Conciliado':'Revisar'}</strong></div></div><div class="treasury-form-actions"><button type="button" data-action-modal-close>Cancelar</button><button class="primary" type="submit">Salvar contagem</button></div></form>`);
  }
  function openPaymentVerification(){
    if(locked())return;
    const t=totals(),w=workflow();
    const active=nonCashPaymentKeys.filter(key=>t.payments[key]>0||w.paymentVerification[key]?.confirmedAt);
    if(!active.length){toast('Nada para conferir','Não existem recebimentos por PIX, cartão, transferência ou cheque.','error');return;}
    const rows=active.map(key=>{
      const current=w.paymentVerification[key]||{};
      const initial=current.confirmedAt?current.amount:t.payments[key];
      return `<section class="launch-form-section" data-payment-verification-row="${key}" data-expected="${t.payments[key]}"><header><span>✓</span><div><strong>${A.esc(paymentLabels[key])}</strong><small>Declarado: ${A.money(t.payments[key])}</small></div></header><div class="treasury-form-grid two">${moneyField(`verify_${key}`,'Valor confirmado',initial)}<label><span>Comprovante / referência</span><input name="reference_${key}" value="${A.esc(current.reference||'')}" placeholder="Opcional"></label></div><div class="internal-live-summary"><div><small>DECLARADO</small><strong>${A.money(t.payments[key])}</strong></div><div><small>CONFIRMADO</small><strong data-payment-confirmed>${A.money(initial)}</strong></div><div><small>DIFERENÇA</small><strong data-payment-difference>${A.money(num(initial)-t.payments[key])}</strong></div><div><small>SITUAÇÃO</small><strong data-payment-status>${Math.abs(num(initial)-t.payments[key])<.01?'Conciliado':'Revisar'}</strong></div></div></section>`;
    }).join('');
    openModal('CONFERÊNCIA','PIX, cartões e outros recebimentos','Compare os valores com extratos, comprovantes ou relatórios das operadoras.',`<form data-form="payments-verification" class="treasury-form">${rows}<div class="treasury-form-actions"><button type="button" data-action-modal-close>Cancelar</button><button class="primary" type="submit">Salvar conferência</button></div></form>`);
  }
  function openDestination(id=''){
    if(locked())return;const item=workflow().destinations.find(row=>row.id===id)||{},t=totals();const accounts=(db.accounts||[]).filter(account=>account.active!==false);
    const protocol=item.protocol||nextDestinationProtocol();
    openModal('DESTINAÇÃO',id?'Editar destinação':'Nova destinação',`Valor real ainda não destinado: ${A.money(t.destinationDifference)}.`,`<form data-form="destination" data-id="${A.esc(id)}" class="treasury-form"><div class="treasury-form-grid two"><label><span>Tipo de destinação</span><select name="type"><option ${item.type==='Depósito bancário'?'selected':''}>Depósito bancário</option><option ${item.type==='Cofre da igreja'?'selected':''}>Cofre da igreja</option><option ${item.type==='Caixa interno'?'selected':''}>Caixa interno</option><option ${item.type==='Transferência entre contas'?'selected':''}>Transferência entre contas</option><option ${item.type==='Outra custódia'?'selected':''}>Outra custódia</option></select></label><label><span>Conta / local de custódia</span><select name="accountId"><option value="">Não vincular conta</option>${accounts.map(account=>`<option value="${account.id}" ${item.accountId===account.id?'selected':''}>${A.esc(account.name)} — ${A.esc(account.bank)}</option>`).join('')}</select></label>${moneyField('amount','Valor destinado',item.amount||Math.max(0,t.destinationDifference))}<label><span>Data prevista / realizada</span><input name="date" type="date" value="${A.esc(item.date||A.todayISO())}" required></label>${personSelect('responsible','Responsável pela custódia',item.responsible||session.user.name,{blankLabel:'Selecione o responsável'})}<label><span>Protocolo / comprovante</span><input name="protocol" value="${A.esc(protocol)}" required><small>Gerado automaticamente e liberado para edição.</small></label></div><label><span>Observações</span><textarea name="notes">${A.esc(item.notes||'')}</textarea></label><div class="treasury-form-actions"><button type="button" data-action-modal-close>Cancelar</button><button class="primary" type="submit">Salvar destinação</button></div></form>`);
  }
  function openSubmitApproval(){
    if(locked())return;
    const issues=submissionIssues();
    if(issues.length){toast('Não foi possível enviar',issues[0],'error');return;}
    const t=totals();
    openModal('ANÁLISE','Mandar para análise','',`<form data-form="submit-approval" class="treasury-form"><section class="system-conference-panel"><div class="system-conference-metrics"><article><small>TOTAL CONFIRMADO</small><strong>${A.money(t.confirmedTotal)}</strong><span>Dif. ${A.money(t.receivingDifference)}</span></article><article><small>DINHEIRO CONTADO</small><strong>${A.money(t.cashCounted)}</strong><span>Dif. ${A.money(t.cashDifference)}</span></article><article><small>DISTRIBUÍDO</small><strong>${A.money(t.classified)}</strong><span>Dif. ${A.money(t.classificationDifference)}</span></article><article><small>DESTINADO</small><strong>${A.money(t.destinationTotal)}</strong><span>Dif. ${A.money(t.destinationDifference)}</span></article></div></section><label><span>Observações para o responsável pela análise</span><textarea name="reviewNotes" placeholder="Opcional"></textarea></label>${authBlock('Confirme o responsável pelo envio')}<div class="treasury-form-actions"><button type="button" data-action-modal-close>Cancelar</button><button class="primary" type="submit">Mandar para análise</button></div></form>`);
  }
  function openApproval(){
    if(operation.status!=='Aguardando aprovação')return;const t=totals();
    openModal('APROVAÇÃO','Aprovar e fechar operação','',`<form data-form="approve" class="treasury-form"><section class="system-conference-panel"><div class="system-conference-metrics"><article><small>DECLARADO</small><strong>${A.money(t.declaredTotal)}</strong><span>${workflow().receipts.length} lançamento(s)</span></article><article><small>TOTAL CONFIRMADO</small><strong>${A.money(t.confirmedTotal)}</strong><span>Dif. ${A.money(t.receivingDifference)}</span></article><article><small>DISTRIBUÍDO</small><strong>${A.money(t.classified)}</strong><span>Dif. ${A.money(t.classificationDifference)}</span></article><article><small>DESTINADO</small><strong>${A.money(t.destinationTotal)}</strong><span>Dif. ${A.money(t.destinationDifference)}</span></article></div></section>${operation.submissionNotes?`<label><span>Observações do envio</span><textarea readonly>${A.esc(operation.submissionNotes)}</textarea></label>`:''}<label><span>Observação final do aprovador</span><textarea name="finalNotes" placeholder="Opcional"></textarea></label>${authBlock('Credenciais do segundo aprovador')}<div class="treasury-form-actions"><button type="button" data-action-modal-close>Cancelar</button><button class="primary" type="submit">Aprovar, fechar e gerar extrato</button></div></form>`);
  }
  function openReturnAdjustment(){
    if(operation.status!=='Aguardando aprovação')return;
    openModal('DEVOLUÇÃO','Devolver operação para ajuste','Os lançamentos serão desbloqueados e o motivo ficará no histórico.',`<form data-form="return" class="treasury-form"><label><span>Motivo da devolução</span><textarea name="reason" required placeholder="Informe exatamente o que precisa ser corrigido."></textarea></label>${authBlock('Confirmação do revisor')}<div class="treasury-form-actions"><button type="button" data-action-modal-close>Cancelar</button><button class="primary" type="submit">Devolver para ajuste</button></div></form>`);
  }
  function syncReceiptForm(form){
    if(!form)return;
    const total=paymentKeys.reduce((sum,key)=>sum+num(form.elements[key]?.value),0);
    const designation=form.elements.designation?.value||'';
    const deliveryMode=form.elements.deliveryMode?.value||'';
    const identificationMode=form.elements.identificationMode?.value||'Anônimo';
    const bagDetails=form.querySelector('[data-bag-details]');
    if(bagDetails)bagDetails.hidden=deliveryMode!=='Malote físico';
    if(form.elements.bagCode)form.elements.bagCode.required=deliveryMode==='Malote físico';
    if(form.elements.sealStatus)form.elements.sealStatus.required=deliveryMode==='Malote físico';
    const mixedPurpose=form.querySelector('[data-mixed-purpose]');
    const autoPurpose=form.querySelector('[data-auto-purpose]');
    const isMixed=designation==='Múltiplas finalidades';
    if(mixedPurpose)mixedPurpose.hidden=!isMixed;
    if(autoPurpose)autoPurpose.hidden=isMixed;
    const purposeText=form.querySelector('[data-auto-purpose-text]');
    if(purposeText)purposeText.textContent=designation?`O total será alocado automaticamente em ${designation}.`:'Escolha a finalidade do lançamento.';
    const totalNode=form.querySelector('[data-receipt-total]');if(totalNode)totalNode.textContent=A.money(total);
    if(isMixed){
      const allocated=categoryKeys.reduce((sum,key)=>sum+num(form.elements[key]?.value),0);
      const purposeTotal=form.querySelector('[data-purpose-total]'),purposeAllocated=form.querySelector('[data-purpose-allocated]'),purposeDifference=form.querySelector('[data-purpose-difference]');
      if(purposeTotal)purposeTotal.textContent=A.money(total);
      if(purposeAllocated)purposeAllocated.textContent=A.money(allocated);
      if(purposeDifference)purposeDifference.textContent=A.money(total-allocated);
    }
    const split=form.querySelector('[data-identification-split]');
    const identitySummary=form.querySelector('[data-identification-summary]');
    const mixedIdentity=identificationMode==='Misto';
    if(split)split.hidden=!mixedIdentity;
    if(identitySummary)identitySummary.hidden=!mixedIdentity;
    const preview=form.querySelector('[data-identity-preview]');
    if(preview)preview.textContent=identificationMode==='Identificado'?'100% identificado':mixedIdentity?'Divisão manual':'100% anônimo';
    if(mixedIdentity){
      const allocated=num(form.elements.identified?.value)+num(form.elements.anonymous?.value);
      const identityTotal=form.querySelector('[data-identity-total]'),identityAllocated=form.querySelector('[data-identity-allocated]'),identityDifference=form.querySelector('[data-identity-difference]');
      if(identityTotal)identityTotal.textContent=A.money(total);
      if(identityAllocated)identityAllocated.textContent=A.money(allocated);
      if(identityDifference)identityDifference.textContent=A.money(total-allocated);
    }
  }
  function handleLiveInput(event){
    const form=event.target.closest('form[data-form]');if(!form)return;
    if(form.dataset.form==='receipt')syncReceiptForm(form);
    if(form.dataset.form==='payments-verification'){
      form.querySelectorAll('[data-payment-verification-row]').forEach(row=>{
        const key=row.dataset.paymentVerificationRow;
        const expected=num(row.dataset.expected);
        const confirmed=num(form.elements[`verify_${key}`]?.value);
        const difference=Number((confirmed-expected).toFixed(2));
        row.querySelector('[data-payment-confirmed]').textContent=A.money(confirmed);
        row.querySelector('[data-payment-difference]').textContent=A.money(difference);
        row.querySelector('[data-payment-status]').textContent=Math.abs(difference)<.01?'Conciliado':'Revisar';
      });
    }
    if(form.dataset.form==='cash'){
      let counted=0;
      form.querySelectorAll('[data-denomination]').forEach(input=>{
        const subtotal=num(input.dataset.denomination)*num(input.value);
        counted+=subtotal;
        input.closest('label').querySelector('[data-denomination-total]').textContent=A.money(subtotal);
      });
      const expected=totals().cashExpected,diff=Number((counted-expected).toFixed(2));
      form.querySelector('[data-cash-counted]').textContent=A.money(counted);
      form.querySelector('[data-cash-difference]').textContent=A.money(diff);
      form.querySelector('[data-cash-status]').textContent=Math.abs(diff)<.01?'Conciliado':'Revisar';
    }
  }

  function handleSubmit(event){
    const form=event.target.closest('form[data-form]');if(!form)return;event.preventDefault();const d=Object.fromEntries(new FormData(form).entries());
    if(form.dataset.form==='receipt')saveReceipt(form,d);
    if(form.dataset.form==='cash')saveCash(form);
    if(form.dataset.form==='payments-verification')savePaymentVerification(form,d);
    if(form.dataset.form==='destination')saveDestination(form,d);
    if(form.dataset.form==='submit-approval')submitApproval(d);
    if(form.dataset.form==='approve')approveClose(d);
    if(form.dataset.form==='return')returnAdjustment(d);
  }

  function saveReceipt(form,d){
    if(locked())return;
    const total=paymentKeys.reduce((sum,key)=>sum+num(d[key]),0);
    if(total<=0){toast('Valor obrigatório','O lançamento precisa ter algum valor declarado.','error');return;}
    if(!d.designation){toast('Finalidade obrigatória','Informe a que este lançamento se refere.','error');return;}
    const launchCode=String(d.launchCode||'').trim()||nextLaunchCode();
    const duplicateLaunch=workflow().receipts.some(row=>row.id!==form.dataset.id&&A.normalize(row.launchCode)===A.normalize(launchCode));
    if(duplicateLaunch){toast('Código repetido','Edite o código para que cada lançamento seja único.','error');return;}
    const isPhysical=d.deliveryMode==='Malote físico';
    const bagCode=isPhysical?String(d.bagCode||'').trim():'';
    if(isPhysical&&!bagCode){toast('Malote sem código','Informe o código do malote físico.','error');return;}
    const duplicateBag=isPhysical&&workflow().receipts.some(row=>row.id!==form.dataset.id&&row.deliveryMode==='Malote físico'&&A.normalize(row.bagCode)===A.normalize(bagCode));
    if(duplicateBag){toast('Malote repetido','Este código de malote já está vinculado a outro lançamento.','error');return;}

    let item=workflow().receipts.find(row=>row.id===form.dataset.id);
    const isNew=!item;
    if(!item){item={id:A.uid('tir'),createdAt:new Date().toISOString(),createdBy:session.user.name,createdById:session.user.id};workflow().receipts.push(item);}
    Object.assign(item,{
      launchCode,designation:d.designation,description:String(d.description||'').trim(),source:String(d.source||'').trim(),
      deliveryMode:d.deliveryMode,bagCode,deliveredBy:d.deliveredBy,receivedAt:d.receivedAt,
      sealStatus:isPhysical?d.sealStatus:'Não se aplica',envelopes:Number(d.envelopes||0),
      identificationMode:d.identificationMode||'Anônimo',notes:d.notes,updatedAt:new Date().toISOString(),updatedBy:session.user.name
    });
    paymentKeys.forEach(key=>item[key]=num(d[key]));
    categoryKeys.forEach(key=>item[key]=0);
    const category=launchCategory(d.designation);
    if(category==='mixed')categoryKeys.forEach(key=>item[key]=num(d[key]));
    else item[category]=total;
    if(item.identificationMode==='Identificado'){item.identified=total;item.anonymous=0;}
    else if(item.identificationMode==='Anônimo'){item.identified=0;item.anonymous=total;}
    else{item.identified=num(d.identified);item.anonymous=num(d.anonymous);}
    item.classifiedAt=new Date().toISOString();item.classifiedBy=session.user.name;

    const allocationDifference=Number((total-sumReceipt(item,categoryKeys)).toFixed(2));
    const identityDifference=Number((total-num(item.identified)-num(item.anonymous)).toFixed(2));
    addEvent('receipt',isNew?'Lançamento registrado':'Lançamento atualizado',`${launchCode} — ${item.designation} — ${A.money(total)} — ${item.deliveryMode}`);
    persist(isNew?'Registrou lançamento na Tesouraria Interna':'Atualizou lançamento da Tesouraria Interna',`${operation.number} — ${launchCode} — ${item.designation}`);
    closeModal();
    if(Math.abs(allocationDifference)>=.01||Math.abs(identityDifference)>=.01)toast('Lançamento salvo com pendência','Revise a distribuição ou a identificação antes de enviar para análise.','error');
    else toast('Lançamento salvo',`${launchCode}: ${item.designation} — ${A.money(total)}.`);
    render();
  }

  function saveClassification(form,d){
    const id=form?.dataset?.id;if(id)openReceipt(id);
  }

  function saveCash(form){
    if(locked())return;const count={};form.querySelectorAll('[data-denomination]').forEach(input=>count[input.dataset.denomination]=Number(input.value||0));workflow().cashCount=count;workflow().cashCountedAt=new Date().toISOString();workflow().cashCountedBy=session.user.name;const t=totals();addEvent('cash','Dinheiro contado',`${A.money(t.cashCounted)} contado — diferença ${A.money(t.cashDifference)}`);persist('Registrou contagem física da Tesouraria Interna',`${operation.number} — ${A.money(t.cashCounted)}`);closeModal();toast('Contagem salva',Math.abs(t.cashDifference)<.01?'Dinheiro conciliado.':`Diferença de ${A.money(t.cashDifference)} registrada.`,Math.abs(t.cashDifference)<.01?'success':'error');render();
  }
  function savePaymentVerification(form,d){
    if(locked())return;
    const tBefore=totals(),w=workflow(),now=new Date().toISOString();
    nonCashPaymentKeys.filter(key=>tBefore.payments[key]>0||w.paymentVerification[key]?.confirmedAt).forEach(key=>{
      w.paymentVerification[key]={
        amount:num(d[`verify_${key}`]),
        reference:String(d[`reference_${key}`]||'').trim(),
        confirmedAt:now,
        confirmedBy:session.user.name,
        confirmedById:session.user.id
      };
    });
    const t=totals();
    addEvent('payment','Recebimentos não monetários conferidos',`${A.money(t.confirmedTotal)} confirmados — diferença total ${A.money(t.receivingDifference)}`);
    persist('Conferiu PIX, cartões e outros recebimentos',`${operation.number} — ${A.money(t.confirmedTotal)}`);
    closeModal();
    toast('Conferência salva',t.allPaymentsReconciled?'Todas as formas de recebimento foram conciliadas.':`Existe diferença total de ${A.money(t.receivingDifference)}.` ,t.allPaymentsReconciled?'success':'error');
    render();
  }
  function saveDestination(form,d){
    if(locked())return;const amount=num(d.amount);if(amount<=0){toast('Valor obrigatório','Informe o valor destinado.','error');return;}
    const protocol=String(d.protocol||'').trim()||nextDestinationProtocol();
    const duplicate=workflow().destinations.some(row=>row.id!==form.dataset.id&&A.normalize(row.protocol)===A.normalize(protocol));
    if(duplicate){toast('Protocolo duplicado','Edite o protocolo para que ele seja único nesta operação.','error');return;}
    let item=workflow().destinations.find(row=>row.id===form.dataset.id),isNew=!item;if(!item){item={id:A.uid('tid'),createdAt:new Date().toISOString(),createdBy:session.user.name};workflow().destinations.push(item);}Object.assign(item,{type:d.type,accountId:d.accountId,amount,date:d.date,responsible:d.responsible,protocol,notes:d.notes,updatedAt:new Date().toISOString()});addEvent('destination',isNew?'Destinação registrada':'Destinação atualizada',`${protocol} — ${d.type} — ${A.money(amount)} — ${d.responsible}`);persist(isNew?'Registrou destinação da Tesouraria Interna':'Atualizou destinação da Tesouraria Interna',`${operation.number} — ${protocol} — ${d.type} — ${A.money(amount)}`);closeModal();toast('Destinação salva',`${protocol}: ${A.money(amount)}.`);render();
  }
  function authenticate(d,action='access'){
    const user=A.authenticate(db,d.authIdentity,d.authPassword);if(!user){toast('Autorização negada','Login ou senha inválidos.','error');return null;}if(!A.canOperate(user,'internal',action)){toast('Permissão insuficiente','Este operador não possui a autorização necessária.','error');return null;}return user;
  }
  function submitApproval(d){
    if(locked())return;
    const issues=submissionIssues();if(issues.length){toast('Não foi possível enviar',issues[0],'error');return;}
    const user=authenticate(d,'close');if(!user)return;
    operation.status='Aguardando aprovação';operation.submittedAt=new Date().toISOString();operation.submittedBy=user.name;operation.submittedById=user.id;operation.submissionNotes=String(d.reviewNotes||'').trim();
    delete operation.submittedAnalysisId;delete operation.submittedAnalysisNumber;delete operation.reconciliationJustification;
    addEvent('submit','Mandada para análise',operation.submissionNotes||'Dados bloqueados para revisão.',user);
    A.audit(db,user,'Mandou Tesouraria Interna para análise',operation.number);A.saveData(db);closeModal();toast('Mandada para análise','A operação foi bloqueada e aguarda outro operador.');render();
  }
  function approveClose(d){
    if(operation.status!=='Aguardando aprovação')return;const user=authenticate(d,'close');if(!user)return;if(user.id===operation.submittedById){toast('Dupla aprovação obrigatória','Use as credenciais de outro operador autorizado.','error');return;}const t=totals();if(Math.abs(t.destinationDifference)>=.01){toast('Destinação inconsistente','O valor destinado não corresponde ao valor real disponível.','error');return;}
    operation.status='Fechado';operation.closedAt=new Date().toISOString();operation.closedBy=user.name;operation.closedById=user.id;operation.secondChecker=user.name;operation.closing={...t.payments,...t.categories,envelopes:t.envelopes,identified:t.identified,anonymous:t.anonymous,totalReceived:t.actualTotal,totalConfirmed:t.confirmedTotal,totalDeclared:t.declaredTotal,receivingDifference:t.receivingDifference,paymentVerification:A.clone(t.paymentVerification),totalClassified:t.classified,difference:t.classificationDifference,identityDifference:t.identityDifference,cashExpected:t.cashExpected,cashCounted:t.cashCounted,cashDifference:t.cashDifference,destinationTotal:t.destinationTotal,destinations:A.clone(workflow().destinations),receiptCount:workflow().receipts.length,secondChecker:user.name,notes:d.finalNotes||'',reconciliationJustification:operation.reconciliationJustification||''};addEvent('close','Operação aprovada e fechada',`${A.money(t.actualTotal)} finalizados por ${user.name}`,user);const report=createReport(user);A.audit(db,user,'Aprovou e fechou Tesouraria Interna',`${operation.number} — ${A.money(t.actualTotal)}`);A.saveData(db);A.notifyTreasuryEvent(db,'CLOSE',{operationType:'Tesouraria Interna',operationNumber:operation.number,operationName:operation.title,user:user.name,at:operation.closedAt});if(Number(t.cashDifference||0)<-0.009)A.notifyTreasuryEvent(db,'SHORTAGE',{operationType:'Tesouraria Interna',operationNumber:operation.number,operationName:operation.title,user:user.name,at:operation.closedAt,amount:Math.abs(Number(t.cashDifference||0))});closeModal();toast('Operação finalizada',`${operation.number} foi aprovada e fechada.`);render();window.open(`tesouraria-extrato.html?report=${encodeURIComponent(report.id)}&print=1`,'_blank');
  }
  function returnAdjustment(d){
    if(operation.status!=='Aguardando aprovação')return;const user=authenticate(d,'close');if(!user)return;operation.status='Em conferência';operation.returnedAt=new Date().toISOString();operation.returnedBy=user.name;operation.returnReason=d.reason;addEvent('return','Devolvida para correção',d.reason,user);A.audit(db,user,'Devolveu Tesouraria Interna para correção',`${operation.number} — ${d.reason}`);A.saveData(db);closeModal();toast('Operação devolvida','Os registros foram desbloqueados para correção.');render();
  }
  function createReport(user){
    let report=(db.treasuryClosureReports||[]).find(item=>item.operationId===operation.id&&item.type==='internal');if(report){report.snapshot=A.clone(operation);report.generatedAt=new Date().toISOString();return report;}
    report={id:A.uid('trp'),type:'internal',operationId:operation.id,number:`EXT-${operation.number}`,generatedAt:new Date().toISOString(),operator:{id:operation.openedById||'',name:operation.openedBy||''},treasurer:{id:user.id,name:user.name},snapshot:A.clone(operation)};db.treasuryClosureReports=Array.isArray(db.treasuryClosureReports)?db.treasuryClosureReports:[];db.treasuryClosureReports.unshift(report);operation.reportId=report.id;return report;
  }
  function openReport(){
    let report=(db.treasuryClosureReports||[]).find(item=>item.operationId===operation.id&&item.type==='internal');if(!report&&operation.status==='Fechado'){report=createReport({id:operation.closedById||'',name:operation.closedBy||''});A.saveData(db);}if(report)window.open(`tesouraria-extrato.html?report=${encodeURIComponent(report.id)}`,'_blank');
  }
  function deleteReceipt(id){
    if(locked())return;
    const item=workflow().receipts.find(row=>row.id===id);
    if(!item||!confirm(`Excluir o lançamento ${item.launchCode||''} — ${launchLabel(item)}?`))return;
    workflow().receipts=workflow().receipts.filter(row=>row.id!==id);
    addEvent('delete','Lançamento excluído',`${item.launchCode||''} — ${launchLabel(item)} — ${A.money(sumReceipt(item,paymentKeys))}`);
    persist('Excluiu lançamento da Tesouraria Interna',`${operation.number} — ${item.launchCode||item.id}`);
    toast('Lançamento excluído',item.launchCode||launchLabel(item));render();
  }

  function deleteDestination(id){
    if(locked())return;const item=workflow().destinations.find(row=>row.id===id);if(!item||!confirm(`Excluir a destinação de ${A.money(item.amount)}?`))return;workflow().destinations=workflow().destinations.filter(row=>row.id!==id);addEvent('delete','Destinação excluída',`${item.type} — ${A.money(item.amount)}`);persist('Excluiu destinação da Tesouraria Interna',`${operation.number} — ${item.type}`);toast('Destinação excluída',A.money(item.amount));render();
  }
  function toast(title,message,type='success'){const item=document.createElement('div');item.className=`treasury-toast ${type}`;item.innerHTML=`<strong>${A.esc(title)}</strong><span>${A.esc(message)}</span>`;$('#treasuryToastRegion').append(item);setTimeout(()=>item.remove(),3800);}
  init();
})();
