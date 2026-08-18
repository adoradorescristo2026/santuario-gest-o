(() => {
  'use strict';
  const A=window.TreasuryApp;
  const db=A.loadData();
  const generalUser=A.generalUser(db);
  let session=A.readTreasurySession(db);
  const $=selector=>document.querySelector(selector);
  const roleLabel={admin:'Administrador',financeiro:'Tesoureiro / Financeiro'};

  function guard(){
    if(!generalUser){location.replace('index.html');return false;}
    if(!session){location.replace('tesouraria-login.html');return false;}
    return true;
  }
  function init(){
    A.applyTheme(); if(!guard())return;
    $('#panelChurchName').textContent=db.church?.name||'Santuário Gestão';
    $('#treasurySessionUser').textContent=session.user.name;
    $('#treasurySessionRole').textContent=roleLabel[session.user.role]||session.user.role;
    $('#treasurySessionAt').textContent=A.dateTimeBR(session.createdAt);
    $('#treasurySessionExpiry').textContent=A.dateTimeBR(session.expiresAt);
    $('#choiceOperator').textContent=session.user.name;
    renderMetrics(); renderActivity(); applyOperationPermissions(); bind(); A.touchTreasurySession(db);
  }
  function renderMetrics(){
    const today=A.todayISO();
    const internalOpen=db.treasuryOperations.filter(o=>o.type==='internal'&&o.status==='Aberto').length;
    const externalOpen=db.externalCashSessions.filter(o=>o.status==='Aberto').length;
    const internalToday=A.sum(db.treasuryOperations.filter(o=>o.type==='internal'&&o.status==='Fechado'&&String(o.closedAt||'').slice(0,10)===today),o=>o.closing?.totalReceived||0);
    const salesToday=A.sum(db.treasurySales.filter(s=>s.status!=='Cancelada'&&String(s.createdAt||'').slice(0,10)===today),s=>s.total||0);
    $('#treasuryChoiceMetrics').innerHTML=[
      ['Tesourarias internas abertas',internalOpen,'Cultos em conferência'],
      ['Caixas externos abertos',externalOpen,'Pontos de venda em operação'],
      ['Recebido internamente hoje',A.money(internalToday),'Cultos fechados'],
      ['Vendas externas hoje',A.money(salesToday),'Vendas concluídas']
    ].map(([label,value,help])=>`<article><small>${A.esc(label)}</small><strong>${A.esc(value)}</strong><span>${A.esc(help)}</span></article>`).join('');
  }
  function renderActivity(){
    const internals=db.treasuryOperations.map(o=>({id:o.id,type:'Interna',reportType:'internal',title:o.title||o.number,status:o.status,at:o.closedAt||o.openedAt,total:o.closing?.totalReceived||0,number:o.number}));
    const externals=db.externalCashSessions.map(o=>({id:o.id,type:'Externa',reportType:'external',title:o.eventName||o.pointOfSale,status:o.status,at:o.closedAt||o.openedAt,total:o.closing?.grossSales||A.sum(A.sessionSales(db,o.id),s=>s.total),number:o.number}));
    const rows=[...internals,...externals].sort((a,b)=>String(b.at).localeCompare(String(a.at))).slice(0,6);
    $('#choiceRecentActivity').innerHTML=rows.length?rows.map(row=>`<article class="treasury-operation-row"><div><span class="treasury-operation-type ${row.type==='Interna'?'cult':'event'}">${row.type}</span><strong>${A.esc(row.title)}</strong><small>${A.esc(row.number||'')} · ${A.dateTimeBR(row.at)}</small></div><div class="treasury-operation-total"><small>${A.esc(row.status)}</small><strong>${A.money(row.total)}</strong>${row.status==='Fechado'?`<button class="treasury-table-button" data-report-type="${row.reportType}" data-report-id="${row.id}">Extrato</button>`:''}</div></article>`).join(''):`<div class="treasury-empty-state"><strong>Nenhuma atividade registrada</strong><p>Escolha uma operação para iniciar a primeira tesouraria.</p></div>`;
  }

  function applyOperationPermissions(){
    const internal=A.canOperate(session.user,'internal','access');
    const external=A.canOperate(session.user,'external','access');
    const internalButton=document.querySelector('[data-operation="internal"]');
    const externalButton=document.querySelector('[data-operation="external"]');
    if(internalButton){internalButton.disabled=!internal;internalButton.innerHTML=internal?'Acessar Tesouraria Interna <span>→</span>':'Acesso não autorizado';}
    if(externalButton){externalButton.disabled=!external;externalButton.innerHTML=external?'Acessar Tesouraria Externa <span>→</span>':'Acesso não autorizado';}
  }
  function bind(){
    $('#panelThemeBtn').addEventListener('click',()=>A.toggleTheme());
    $('#backToDepartmentsBtn').addEventListener('click',()=>{A.touchTreasurySession(db);if(window.santuarioDesktop?.isDesktop&&window.santuarioDesktop?.returnCashToMain)window.santuarioDesktop.returnCashToMain();else location.href='index.html';});
    $('#endTreasurySessionBtn').addEventListener('click',()=>{A.audit(db,session.user,'Encerrou sessão da Tesouraria','Sessão financeira finalizada na escolha de operação');A.clearTreasurySession(db);location.href='tesouraria-login.html';});
    document.querySelectorAll('[data-operation]').forEach(button=>button.addEventListener('click',()=>{
      const external=button.dataset.operation==='external';
      if(!A.canOperate(session.user,external?'external':'internal','access'))return;
      A.touchTreasurySession(db);
      A.audit(db,session.user,'Selecionou tipo de operação',external?'Tesouraria Externa':'Tesouraria Interna');
      location.href=external?'tesouraria-externa.html':'tesouraria-interna.html';
    }));
    document.addEventListener('click',event=>{const button=event.target.closest('[data-report-id]');if(!button)return;window.open(`tesouraria-extrato.html?type=${button.dataset.reportType}&id=${encodeURIComponent(button.dataset.reportId)}`,'_blank');});
    setInterval(()=>{session=A.readTreasurySession(db);if(!session)location.replace('tesouraria-login.html');},30000);
  }
  init();
})();
