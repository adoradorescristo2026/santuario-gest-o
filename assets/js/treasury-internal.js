(() => {
  'use strict';
  const A=window.TreasuryApp, db=A.loadData();
  const generalUser=A.generalUser(db); let session=A.readTreasurySession(db);
  const $=selector=>document.querySelector(selector);

  function guard(){
    if(!generalUser){location.replace('index.html');return false;}
    if(!session){location.replace('tesouraria-login.html');return false;}
    if(!A.canOperate(session.user,'internal','access')){location.replace('tesouraria-painel.html');return false;}
    return true;
  }
  function init(){
    A.applyTheme(); if(!guard())return;
    $('#internalChurchName').textContent=db.church?.name||'Santuário Gestão';
    $('#internalOperator').textContent=session.user.name;
    $('#internalSessionAt').textContent=A.dateTimeBR(session.createdAt);
    bind(); render();
  }
  function rows(){return (db.treasuryOperations||[]).filter(o=>o.type==='internal'||o.type==='cult');}
  function workflow(o){
    o.internalWorkflow=o.internalWorkflow||{};
    const w=o.internalWorkflow;
    w.receipts=Array.isArray(w.receipts)?w.receipts:[];
    w.cashCount=w.cashCount&&typeof w.cashCount==='object'?w.cashCount:{};
    w.destinations=Array.isArray(w.destinations)?w.destinations:[];
    w.events=Array.isArray(w.events)?w.events:[];
    return w;
  }
  function receiptTotal(receipt){return ['cash','pix','debit','credit','transfer','check'].reduce((sum,key)=>sum+Number(receipt[key]||0),0);}
  function workflowTotals(o){
    const w=workflow(o), receipts=w.receipts;
    const totalReceived=receipts.reduce((sum,item)=>sum+receiptTotal(item),0);
    const cashExpected=receipts.reduce((sum,item)=>sum+Number(item.cash||0),0);
    const classified=receipts.reduce((sum,item)=>sum+['tithe','generalOffer','missions','campaigns','donations','other'].reduce((s,key)=>s+Number(item[key]||0),0),0);
    const identity=receipts.reduce((sum,item)=>sum+Number(item.identified||0)+Number(item.anonymous||0),0);
    const cashCounted=Object.entries(w.cashCount).reduce((sum,[value,qty])=>sum+Number(value)*Number(qty||0),0);
    const cashDifference=Number((cashCounted-cashExpected).toFixed(2));
    const actualTotal=Number((totalReceived+cashDifference).toFixed(2));
    const destinationTotal=w.destinations.reduce((sum,item)=>sum+Number(item.amount||0),0);
    return {totalReceived,cashExpected,classified,identity,cashCounted,cashDifference,actualTotal,destinationTotal};
  }
  function progress(o){
    const w=workflow(o),t=workflowTotals(o),complete=[];
    complete.push(w.receipts.length>0&&t.totalReceived>0);
    complete.push(t.cashExpected===0||Boolean(w.cashCountedAt));
    complete.push(t.totalReceived>0&&Math.abs(t.totalReceived-t.classified)<.01&&Math.abs(t.totalReceived-t.identity)<.01);
    complete.push(t.actualTotal>0&&Math.abs(t.actualTotal-t.destinationTotal)<.01);
    complete.push(o.status==='Aguardando aprovação'||o.status==='Fechado');
    return {done:complete.filter(Boolean).length,total:5,percent:complete.filter(Boolean).length*20,complete,t};
  }
  function statusLabel(o){
    if(o.status==='Fechado')return 'Fechada';
    if(o.status==='Aguardando aprovação')return 'Em análise humana';
    const p=progress(o);
    if(p.done===0)return 'Aguardando lançamentos';
    if(!p.complete[1])return 'Contagem pendente';
    if(!p.complete[2])return 'Distribuição pendente';
    if(!p.complete[3])return 'Destinação pendente';
    return 'Pronta para análise';
  }
  function render(){
    const operations=rows();
    const open=operations.filter(o=>o.status!=='Fechado').sort((a,b)=>String(b.openedAt).localeCompare(String(a.openedAt)));
    const closed=operations.filter(o=>o.status==='Fechado').sort((a,b)=>String(b.closedAt).localeCompare(String(a.closedAt)));
    const month=A.todayISO().slice(0,7),monthly=closed.filter(o=>String(o.closedAt||'').slice(0,7)===month);
    const awaiting=open.filter(o=>o.status==='Aguardando aprovação').length;
    const inProgress=open.length-awaiting;
    $('#internalOpenCount').textContent=open.length;
    $('#internalMetrics').innerHTML=[
      ['Em andamento',inProgress,'Lançamentos e conferência'],
      ['Em análise humana',awaiting,'Aguardando outro operador'],
      ['Fechadas no mês',monthly.length,'Operações concluídas'],
      ['Recebido no mês',A.money(A.sum(monthly,o=>o.closing?.totalReceived||0)),'Valores finalizados']
    ].map(([a,b,c])=>`<article><small>${A.esc(a)}</small><strong>${A.esc(b)}</strong><span>${A.esc(c)}</span></article>`).join('');
    $('#internalOpenList').innerHTML=open.length?open.map(operationCard).join(''):`<div class="treasury-empty-state"><strong>Nenhuma operação interna em andamento</strong><button class="treasury-small-primary" data-action="new">Abrir tesouraria</button></div>`;
    $('#internalHistory').innerHTML=closed.length?`<table class="treasury-history-table"><thead><tr><th>Número</th><th>Programação</th><th>Data</th><th>Recebido</th><th>Sobra / falta</th><th>Aprovado por</th><th></th></tr></thead><tbody>${closed.map(o=>`<tr><td><strong>${A.esc(o.number)}</strong></td><td>${A.esc(o.title)}</td><td>${A.dateBR(o.date)}</td><td>${A.money(o.closing?.totalReceived)}</td><td>${A.money(o.closing?.difference)}</td><td>${A.esc(o.closedBy||o.openedBy)}</td><td><button class="treasury-table-button" data-action="print" data-id="${o.id}">Extrato</button></td></tr>`).join('')}</tbody></table>`:`<div class="treasury-empty-state"><strong>Sem histórico</strong></div>`;
  }
  function operationCard(o){
    const p=progress(o), w=workflow(o), label=statusLabel(o), cls=o.status==='Aguardando aprovação'?'approval':p.percent>=80?'ready':'cult';
    return `<article class="treasury-operation-row internal-operation-card">
      <div class="internal-operation-main"><div class="internal-operation-heading"><span class="treasury-operation-type ${cls}">${A.esc(label).toUpperCase()}</span><strong>${A.esc(o.title)}</strong></div><small>${A.esc(o.number)} · ${A.dateBR(o.date)} às ${A.esc(o.time)} · ${A.esc(o.congregation)}</small><div class="internal-operation-progress"><span style="width:${p.percent}%"></span></div><div class="internal-operation-meta"><span>${w.receipts.length} lançamento(s)</span><span>${A.money(p.t.totalReceived)} registrado</span><span>${p.done}/5 etapas</span></div></div>
      <div class="treasury-operation-actions"><button data-action="details" data-id="${o.id}">Resumo</button><button class="primary" data-action="manage" data-id="${o.id}">${o.status==='Aguardando aprovação'?'Abrir análise':'Continuar lançamento'}</button></div>
    </article>`;
  }
  function bind(){
    $('#internalThemeBtn').addEventListener('click',()=>A.toggleTheme());
    $('#operationChoiceBtn').addEventListener('click',()=>location.href='tesouraria-painel.html');
    $('#internalExitBtn').addEventListener('click',()=>{A.clearTreasurySession(db);location.href='tesouraria-login.html';});
    $('#newInternalTreasuryBtn').addEventListener('click',openNew);
    $('#closeTreasuryModal').addEventListener('click',closeModal);
    $('#treasuryModalBackdrop').addEventListener('click',event=>{if(event.target===event.currentTarget)closeModal();});
    document.addEventListener('click',handleClick);
    document.addEventListener('submit',handleSubmit);
  }
  function handleClick(event){
    const button=event.target.closest('[data-action]');if(!button)return;
    const action=button.dataset.action,id=button.dataset.id;
    if(action==='new')openNew();
    if(action==='manage')location.href=`tesouraria-interna-operacao.html?id=${encodeURIComponent(id)}`;
    if(action==='details')openDetails(id);
    if(action==='print')printTerm(id);
  }
  function openModal(kicker,title,subtitle,body){
    $('#treasuryModalKicker').textContent=kicker;$('#treasuryModalTitle').textContent=title;$('#treasuryModalSubtitle').textContent=subtitle;$('#treasuryModalBody').innerHTML=body;$('#treasuryModalBackdrop').hidden=false;
  }
  function closeModal(){$('#treasuryModalBackdrop').hidden=true;$('#treasuryModalBody').innerHTML='';}
  function bindModalClose(){document.querySelectorAll('[data-action-modal-close]').forEach(button=>button.addEventListener('click',closeModal));}
  const auth=()=>`<div class="treasury-auth-confirm"><strong>Confirmação do responsável pela abertura</strong><div class="treasury-form-grid two"><label><span>Login da Tesouraria</span><input name="authIdentity" value="${A.esc(session.user.treasuryLogin||session.user.treasuryCode||'')}" autocapitalize="none" maxlength="24" required></label><label><span>Senha</span><input name="authPassword" type="password" required></label></div></div>`;
  function personSelect(name,label,selected='',options={}){
    const required=options.required===false?'':' required';
    return `<label><span>${A.esc(label)}</span><select name="${A.esc(name)}"${required}>${A.personOptions(db,selected,{treasuryOnly:Boolean(options.treasuryOnly),excludeUserId:options.excludeUserId||'',includeBlank:options.includeBlank!==false,blankLabel:options.blankLabel||'Selecione uma pessoa'})}</select></label>`;
  }
  function openNew(){
    const currentTreasuryUser=session?.user||{};
    openModal('ABERTURA','Nova operação interna','',`<form data-form="open" class="treasury-form"><div class="treasury-form-grid two"><label><span>Nome da programação</span><input name="title" value="Culto de Celebração" required></label><label><span>Contexto da operação</span><select name="serviceType"><option>Culto regular</option><option>Santa Ceia</option><option>Culto de missões</option><option>Campanha</option><option>Congresso ou conferência</option><option>Evento especial</option><option>Fechamento de departamento</option><option>Outro</option></select></label><label><span>Data</span><input name="date" type="date" value="${A.todayISO()}" required></label><label><span>Horário</span><input name="time" type="time" value="19:00" required></label><label><span>Congregação / local</span><input name="congregation" value="Sede Central" required></label>${personSelect('leader','Pastor ou dirigente',db.church?.pastor||'',{blankLabel:'Selecione o dirigente'})}${personSelect('collectionLeader','Responsável pela coleta','',{blankLabel:'Selecione o responsável pela coleta'})}${personSelect('secondChecker','Segundo conferente previsto','',{treasuryOnly:true,excludeUserId:currentTreasuryUser.id,required:false,blankLabel:'Definir posteriormente'})}<label><span>Público aproximado</span><input name="attendance" type="number" min="0" value="0"></label></div><label><span>Orientações ou observações da abertura</span><textarea name="notes" placeholder="Ex.: haverá lançamentos separados para templo, infantil, cantina e PIX."></textarea></label>${auth()}<div class="treasury-form-actions"><button type="button" data-action-modal-close>Cancelar</button><button class="primary" type="submit">Abrir e iniciar operação</button></div></form>`);
    bindModalClose();
  }

  function handleSubmit(event){
    const form=event.target.closest('form[data-form="open"]');if(!form)return;event.preventDefault();
    session=A.readTreasurySession(db);if(!session){location.replace('tesouraria-login.html');return;}
    const d=Object.fromEntries(new FormData(form).entries()),authUser=A.authenticate(db,d.authIdentity,d.authPassword);
    if(!authUser){toast('Autorização negada','Credenciais inválidas.','error');return;}
    if(!A.canOperate(authUser,'internal','open')){toast('Permissão insuficiente','Este operador não pode abrir a Tesouraria Interna.','error');return;}
    if(d.secondChecker&&A.normalize(d.secondChecker)===A.normalize(authUser.name)){toast('Segundo conferente inválido','O segundo conferente deve ser outro operador da Tesouraria.','error');return;}
    const operation={id:A.uid('ti'),number:A.nextNumber(db,'TI'),type:'internal',status:'Aberto',title:d.title,serviceType:d.serviceType,date:d.date,time:d.time,congregation:d.congregation,leader:d.leader,collectionLeader:d.collectionLeader,secondChecker:d.secondChecker,attendance:Number(d.attendance||0),notes:d.notes,openedAt:new Date().toISOString(),openedBy:authUser.name,openedById:authUser.id,closing:null,internalWorkflow:{receipts:[],cashCount:{},destinations:[],events:[{id:A.uid('iwe'),type:'open',title:'Operação aberta',detail:`Abertura realizada por ${authUser.name}. Os lançamentos devem ser identificados por finalidade.`,at:new Date().toISOString(),userId:authUser.id,userName:authUser.name}]}};
    db.treasuryOperations.unshift(operation);A.audit(db,authUser,'Abriu Tesouraria Interna',`${operation.number} — ${operation.title}`);A.saveData(db);A.notifyTreasuryEvent(db,'OPEN',{operationType:'Tesouraria Interna',operationNumber:operation.number,operationName:operation.title,user:authUser.name,at:operation.openedAt});closeModal();location.href=`tesouraria-interna-operacao.html?id=${encodeURIComponent(operation.id)}`;
  }
  function openDetails(id){
    const o=db.treasuryOperations.find(item=>item.id===id);if(!o)return;
    const p=progress(o),w=workflow(o);
    openModal(o.number,o.title,`${statusLabel(o)} · ${A.dateBR(o.date)}`,`<div class="treasury-detail-grid"><div><small>Programação</small><strong>${A.esc(o.serviceType)}</strong></div><div><small>Local</small><strong>${A.esc(o.congregation)}</strong></div><div><small>Responsável pela coleta</small><strong>${A.esc(o.collectionLeader||'Não informado')}</strong></div><div><small>Aberto por</small><strong>${A.esc(o.openedBy)}</strong></div><div><small>Lançamentos registrados</small><strong>${w.receipts.length}</strong></div><div><small>Total registrado</small><strong>${A.money(p.t.totalReceived)}</strong></div><div><small>Progresso</small><strong>${p.done}/5 etapas</strong></div><div><small>Situação</small><strong>${A.esc(statusLabel(o))}</strong></div></div><div class="treasury-form-actions"><button type="button" data-action-modal-close>Fechar</button><button class="primary" type="button" data-action="manage" data-id="${o.id}">Gerenciar operação</button></div>`);
    bindModalClose();
  }
  function printTerm(id){
    const operation=db.treasuryOperations.find(item=>item.id===id);if(!operation)return;
    let report=(db.treasuryClosureReports||[]).find(item=>item.operationId===id&&item.type==='internal');
    if(!report){report={id:A.uid('trp'),type:'internal',operationId:operation.id,number:`EXT-${operation.number}`,generatedAt:operation.closedAt||new Date().toISOString(),operator:{id:operation.openedById||'',name:operation.openedBy||''},treasurer:{id:operation.closedById||'',name:operation.closedBy||''},snapshot:A.clone(operation)};db.treasuryClosureReports.unshift(report);operation.reportId=report.id;A.saveData(db);}
    window.open(`tesouraria-extrato.html?report=${encodeURIComponent(report.id)}`,'_blank');
  }
  function toast(title,message,type='success'){const item=document.createElement('div');item.className=`treasury-toast ${type}`;item.innerHTML=`<strong>${A.esc(title)}</strong><span>${A.esc(message)}</span>`;$('#treasuryToastRegion').append(item);setTimeout(()=>item.remove(),3500);}
  init();
})();
