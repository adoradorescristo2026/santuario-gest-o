(() => {
  'use strict';
  const A=window.TreasuryApp,db=A.loadData();
  const generalUser=A.generalUser(db),root=document.querySelector('#reportRoot'),params=new URLSearchParams(location.search);
  const num=value=>A.parseMoney(value);
  const row=(label,value,cls='')=>`<tr class="${cls}"><td>${A.esc(label)}</td><td class="right"><strong>${A.esc(value)}</strong></td></tr>`;
  const moneyRow=(label,value,cls='')=>row(label,A.money(value),cls);

  function init(){
    if(!generalUser||!generalUser.areas?.includes('finance')){location.replace('index.html');return;}
    document.querySelector('#printReportBtn').addEventListener('click',()=>window.print());
    document.querySelector('#closeReportBtn').addEventListener('click',()=>window.close());
    const report=resolveReport();
    if(!report){root.innerHTML='<section class="report-error"><h1>Resumo não encontrado</h1><p>O fechamento solicitado não existe ou ainda não foi gerado.</p></section>';return;}
    root.innerHTML=report.type==='external'?renderExternal(report):renderInternal(report);
    document.title=`${report.number} — Resumo de Fechamento`;
    if(params.get('print')==='1')setTimeout(()=>window.print(),450);
  }
  function resolveReport(){
    const reportId=params.get('report');
    if(reportId)return (db.treasuryClosureReports||[]).find(item=>item.id===reportId)||null;
    const type=params.get('type'),id=params.get('id');
    const saved=(db.treasuryClosureReports||[]).find(item=>item.operationId===id&&item.type===type);if(saved)return saved;
    if(type==='internal'){
      const operation=(db.treasuryOperations||[]).find(item=>item.id===id&&item.status==='Fechado');
      if(operation)return {id:'legacy',type:'internal',operationId:id,number:`EXT-${operation.number}`,generatedAt:operation.closedAt||new Date().toISOString(),operator:{name:operation.openedBy||''},treasurer:{name:operation.closedBy||''},snapshot:operation};
    }
    if(type==='external'){
      const session=(db.externalCashSessions||[]).find(item=>item.id===id&&item.status==='Fechado');
      if(session)return {id:'legacy',type:'external',operationId:id,number:`EXT-${session.number}`,generatedAt:session.closedAt||new Date().toISOString(),operator:{name:session.operator||''},treasurer:{name:session.closedBy||''},snapshot:{session,sales:A.sessionSales(db,id,{includeCancelled:true}),adjustments:(db.externalCashAdjustments||[]).filter(item=>item.sessionId===id)}};
    }
    return null;
  }
  function documentHeader(report,typeLabel,title,subtitle){
    return `<header class="report-document-header"><div class="report-brand"><h1>${A.esc(db.church?.name||'Santuário Gestão')}</h1><p>${A.esc(db.church?.legalName||'')} ${db.church?.cnpj?`· ${A.esc(db.church.cnpj)}`:''}</p></div><div class="report-identity"><small>RESUMO DE FECHAMENTO</small><strong>${A.esc(report.number)}</strong><span>${A.dateTimeBR(report.generatedAt)}</span></div></header><section class="report-title"><span>${A.esc(typeLabel)}</span><h2>${A.esc(title)}</h2><p>${A.esc(subtitle)}</p></section>`;
  }
  function footer(report){return `<footer class="report-footer"><div>Folha-resumo destinada ao envelope físico da operação.</div><div>${A.esc(report.number)}</div></footer>`;}
  function signatures(report,third=''){
    const operator=report.operator?.name||'Operador não informado',treasurer=report.treasurer?.name||'Tesoureiro não informado';
    return `<section class="report-signatures ${third?'three':''}"><div class="report-signature"><strong>${A.esc(operator)}</strong><span>Operador — assinatura</span></div><div class="report-signature"><strong>${A.esc(treasurer)}</strong><span>Tesoureiro — assinatura</span></div>${third?`<div class="report-signature"><strong>${A.esc(third)}</strong><span>Conferente — assinatura</span></div>`:''}</section>`;
  }
  function meta(items){return `<section class="report-meta-grid compact">${items.map(([label,value])=>`<article class="report-meta-card"><small>${A.esc(label)}</small><strong>${A.esc(value||'—')}</strong></article>`).join('')}</section>`;}
  function section(title,subtitle,body){return `<section class="report-section compact"><div class="report-section-title"><div><span>${A.esc(title)}</span><h3>${A.esc(subtitle)}</h3></div></div>${body}</section>`;}

  function renderInternal(report){
    const operation=report.snapshot||{},c=operation.closing||{},w=operation.internalWorkflow||{};
    const receipts=`<table class="report-table compact"><tbody>${moneyRow('Dinheiro',c.cash)}${moneyRow('PIX',c.pix)}${moneyRow('Cartão de débito',c.debit)}${moneyRow('Cartão de crédito',c.credit)}${moneyRow('Transferência',c.transfer)}${moneyRow('Cheque',c.check)}${moneyRow('TOTAL DECLARADO',c.totalDeclared??c.totalReceived,'total')}</tbody></table>`;
    const verification=c.paymentVerification||{};
    const methodDefs=[['cash','Dinheiro'],['pix','PIX'],['debit','Cartão de débito'],['credit','Cartão de crédito'],['transfer','Transferência'],['check','Cheque']];
    const paymentControl=`<table class="report-table compact"><thead><tr><th>Forma</th><th class="right">Declarado</th><th class="right">Confirmado</th><th class="right">Diferença</th></tr></thead><tbody>${methodDefs.map(([key,label])=>{const item=verification[key]||{};const expected=item.expected??c[key]??0;const confirmed=item.confirmed??(key==='cash'?(c.cashCounted??c.cash):c[key]??0);const difference=item.difference??(confirmed-expected);return `<tr><td>${A.esc(label)}</td><td class="right">${A.money(expected)}</td><td class="right">${A.money(confirmed)}</td><td class="right ${Math.abs(num(difference))>.009?'alert':''}">${A.money(difference)}</td></tr>`;}).join('')}<tr class="total"><td>TOTAL</td><td class="right"><strong>${A.money(c.totalDeclared??c.totalReceived)}</strong></td><td class="right"><strong>${A.money(c.totalConfirmed??c.totalReceived)}</strong></td><td class="right"><strong>${A.money(c.receivingDifference??0)}</strong></td></tr></tbody></table>`;
    const classification=`<table class="report-table compact"><tbody>${moneyRow('Dízimos',c.tithe)}${moneyRow('Ofertas gerais',c.generalOffer)}${moneyRow('Missões',c.missions)}${moneyRow('Campanhas',c.campaigns)}${moneyRow('Doações',c.donations)}${moneyRow('Outras',c.other)}${moneyRow('TOTAL CLASSIFICADO',c.totalClassified,'total')}</tbody></table>`;
    const cashControl=`<table class="report-table compact"><tbody>${moneyRow('Dinheiro declarado',c.cashExpected??c.cash)}${moneyRow('Dinheiro contado',c.cashCounted??c.cash)}${moneyRow('Sobra / falta em espécie',c.cashDifference,Math.abs(num(c.cashDifference))>.009?'alert':'')}${moneyRow('Total declarado nos lançamentos',c.totalDeclared??c.totalReceived)}${moneyRow('Total real disponível',c.totalReceived,'total')}</tbody></table>`;
    const destinations=Array.isArray(c.destinations)?c.destinations:[];
    const destinationTable=`<table class="report-table compact"><thead><tr><th>Destino</th><th>Responsável</th><th class="right">Valor</th></tr></thead><tbody>${destinations.length?destinations.map(item=>`<tr><td>${A.esc(item.type||'Destino')}<br><small>${A.esc(item.protocol||'')}</small></td><td>${A.esc(item.responsible||'—')}</td><td class="right"><strong>${A.money(item.amount)}</strong></td></tr>`).join(''):`<tr><td colspan="3">Nenhuma destinação detalhada.</td></tr>`}<tr class="total"><td colspan="2">TOTAL DESTINADO</td><td class="right"><strong>${A.money(c.destinationTotal??c.totalReceived)}</strong></td></tr></tbody></table>`;
    const lots=Array.isArray(w.receipts)?w.receipts:[];
    const lotTable=lots.length?section('LANÇAMENTOS REGISTRADOS','Finalidade, origem e forma de entrega',`<table class="report-table compact"><thead><tr><th>Lançamento</th><th>Finalidade</th><th>Origem / entrega</th><th>Responsável</th><th class="right">Valor</th></tr></thead><tbody>${lots.map((item,index)=>`<tr><td><strong>${A.esc(item.launchCode||`LAN-${String(index+1).padStart(3,'0')}`)}</strong></td><td>${A.esc(item.designation||'Outra entrada')}</td><td>${A.esc(item.source||'—')}<small>${A.esc(item.deliveryMode==='Malote físico'?(item.bagCode?`Malote ${item.bagCode}`:'Malote físico'):(item.deliveryMode||'Entrega direta'))}</small></td><td>${A.esc(item.deliveredBy||'—')}</td><td class="right"><strong>${A.money(['cash','pix','debit','credit','transfer','check'].reduce((sum,key)=>sum+num(item[key]),0))}</strong></td></tr>`).join('')}</tbody></table>`):'';
    const justification=c.reconciliationJustification?`<section class="report-note alert"><strong>JUSTIFICATIVA DE DIVERGÊNCIA</strong><p>${A.esc(c.reconciliationJustification)}</p></section>`:'';
    return `${documentHeader(report,'TESOURARIA INTERNA',operation.title||operation.number,`${A.dateBR(operation.date)} às ${operation.time||'—'} · ${operation.congregation||'Congregação não informada'}`)}
      ${meta([['Operação',operation.number],['Abertura',A.dateTimeBR(operation.openedAt)],['Fechamento',A.dateTimeBR(operation.closedAt)],['Aberto por',operation.openedBy],['Aprovado por',operation.closedBy],['Lançamentos / envelopes',`${c.receiptCount||lots.length||0} / ${c.envelopes||0}`]])}
      <section class="report-summary-strip"><div><small>DECLARADO</small><strong>${A.money(c.totalDeclared??c.totalReceived)}</strong></div><div><small>CONFIRMADO</small><strong>${A.money(c.totalConfirmed??c.totalReceived)}</strong></div><div><small>DIF. RECEBIMENTOS</small><strong>${A.money(c.receivingDifference??0)}</strong></div><div><small>DESTINADO</small><strong>${A.money(c.destinationTotal??c.totalReceived)}</strong></div></section>
      <section class="report-two-columns">${section('FORMAS DE RECEBIMENTO','Valores declarados',receipts)}${section('CONFERÊNCIA','Declarado x confirmado',paymentControl)}</section>
      <section class="report-two-columns">${section('DISTRIBUIÇÃO','Finalidade dos lançamentos',classification)}${section('DESTINAÇÃO','Custódia dos valores',destinationTable)}</section>
      ${section('CONTAGEM FÍSICA','Conciliação do numerário',cashControl)}
      ${lotTable}
      <section class="report-summary-strip"><div><small>IDENTIFICADO</small><strong>${A.money(c.identified)}</strong></div><div><small>ANÔNIMO</small><strong>${A.money(c.anonymous)}</strong></div><div><small>DIF. CLASSIFICAÇÃO</small><strong>${A.money(c.difference)}</strong></div><div><small>DIF. IDENTIFICAÇÃO</small><strong>${A.money(c.identityDifference)}</strong></div></section>
      ${justification}${signatures(report,c.secondChecker||'')}${footer(report)}`;
  }
  function renderExternal(report){
    const snapshot=report.snapshot||{},session=snapshot.session||{},sales=snapshot.sales||[],adjustments=snapshot.adjustments||[],closing=session.closing||{};
    const validSales=sales.filter(sale=>sale.status!=='Cancelada'),cancelled=sales.filter(sale=>sale.status==='Cancelada');
    const paymentTotals=closing.payments||A.paymentTotals(validSales);
    const markedTotal=num(closing.markedSalesTotal)||A.sum(validSales.filter(sale=>sale.status==='Marcada'),sale=>sale.outstandingAmount||sale.total);
    const paymentRows=Object.entries(paymentTotals).filter(([,value])=>num(value)>0).map(([method,value])=>moneyRow(method,value)).join('');
    const cashFlow=`<table class="report-table compact"><tbody>${moneyRow('Saldo inicial',session.openingFloat)}${moneyRow('Vendas em dinheiro',paymentTotals.Dinheiro)}${moneyRow('Reforços',closing.reinforcements)}${moneyRow('Sangrias',closing.withdrawals)}${moneyRow('Dinheiro esperado',closing.expectedCash,'total')}${moneyRow('Dinheiro contado',closing.cashCounted)}${moneyRow('Sobra / falta',closing.difference,Math.abs(num(closing.difference))>.009?'alert':'')}</tbody></table>`;
    const payments=`<table class="report-table compact"><tbody>${paymentRows||moneyRow('Pagamentos recebidos',0)}${moneyRow('Vendas marcadas / a receber',markedTotal)}${moneyRow('TOTAL VENDIDO',closing.grossSales,'total')}</tbody></table>`;
    return `${documentHeader(report,'TESOURARIA EXTERNA',session.eventName||session.number,`${session.pointOfSale||'Ponto de venda'} · ${session.department||'Departamento não informado'} · ${session.shift||'Turno não informado'}`)}
      ${meta([['Caixa',session.number],['Abertura',A.dateTimeBR(session.openedAt)],['Fechamento',A.dateTimeBR(session.closedAt)],['Operador',session.operator],['Tesoureiro',session.closedBy],['Vendas válidas',String(validSales.length)]])}
      <section class="report-summary-strip"><div><small>FATURAMENTO</small><strong>${A.money(closing.grossSales)}</strong></div><div><small>VENDAS MARCADAS</small><strong>${A.money(markedTotal)}</strong></div><div><small>CANCELAMENTOS</small><strong>${cancelled.length}</strong></div><div><small>RESULTADO ESTIMADO</small><strong>${A.money(closing.estimatedResult)}</strong></div></section>
      <section class="report-two-columns">${section('FORMAS DE PAGAMENTO','Totais recebidos',payments)}${section('NUMERÁRIO','Saldo, sangrias e reforços',cashFlow)}</section>
      ${signatures(report)}${footer(report)}`;
  }
  init();
})();
