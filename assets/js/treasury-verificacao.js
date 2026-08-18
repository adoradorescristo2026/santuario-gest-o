(() => {
  'use strict';
  const A=window.TreasuryApp, db=A.loadData();
  const general=A.generalUser(db), session=A.readTreasurySession(db);
  const $=s=>document.querySelector(s);

  function guard(){
    if(!general){location.replace('index.html');return false;}
    if(!session){location.replace('tesouraria-login.html');return false;}
    return true;
  }
  function card(id,title,description){return `<article class="treasury-health-card pending" data-health="${id}"><span class="health-state-dot"></span><div><small>VERIFICANDO</small><strong>${A.esc(title)}</strong><p>${A.esc(description)}</p></div><b>...</b></article>`;}
  function setCard(id,status,detail){const el=document.querySelector(`[data-health="${id}"]`);if(!el)return;el.className=`treasury-health-card ${status}`;el.querySelector('small').textContent=status==='ok'?'OPERANDO':status==='warning'?'ATENÇÃO':'INDISPONÍVEL';el.querySelector('b').textContent=status==='ok'?'OK':status==='warning'?'REVISAR':'FALHA';if(detail)el.querySelector('p').textContent=detail;}
  function integrationSettings(){const s=db.treasurySettings||{};return{provider:String(s.paymentProvider||'MANUAL').trim().toUpperCase(),bridge:String(s.paymentBridgeUrl||'').trim(),pixProvider:String(s.pixProvider||'MANUAL_STATIC').trim().toUpperCase(),pixEndpoint:String(s.pixStatusEndpoint||'').trim(),handle:String(s.infinitePayHandle||'').trim(),document:String(s.infinitePayDocument||'').trim(),cardChannel:String(s.infinitePayCardChannel||'TAP').trim().toUpperCase()};}
  async function run(){
    $('#healthGrid').innerHTML=[
      card('desktop','Aplicativo desktop','Verificando comunicação entre a janela do Caixa e o aplicativo.'),
      card('monitor','Terminal de monitoramento','Verificando se o acompanhamento da sessão está ativo.'),
      card('printer','Impressão de comprovantes','Procurando impressoras físicas reconhecidas pelo Windows.'),
      card('network','Conectividade','Verificando disponibilidade de rede no computador.'),
      card('bluetooth','Canal de maquininha','Verificando ponte móvel / TEF para pagamentos presenciais.'),
      card('card','Maquininha / adquirente','Verificando configuração da integração de cartão.'),
      card('pix','PIX bancário','Verificando configuração para confirmação automática do PIX.')
    ].join('');
    $('#healthOverall').textContent='VERIFICANDO...';$('#healthContinueBtn').disabled=true;
    let h={ok:false};
    try{h=await window.santuarioDesktop?.systemHealth?.()||{ok:false};}catch(_){}
    setCard('desktop',h.ok&&h.desktop&&h.server?'ok':'error',h.ok?'Aplicativo e servidor local responderam corretamente.':'Não foi possível validar o processo desktop.');
    setCard('monitor',h.monitor?'ok':'warning',h.monitor?'Monitor do Caixa ativo em segundo plano.':'Monitor não foi confirmado; o Caixa ainda pode operar, mas revise o terminal.');
    const printers=Array.isArray(h.physicalPrinters)?h.physicalPrinters:[];
    setCard('printer',printers.length?'ok':'warning',printers.length?`${printers.length} impressora(s) física(s) disponível(is): ${printers.map(p=>p.name).slice(0,2).join(', ')}.`:'Nenhuma impressora física detectada. Comprovantes serão salvos no computador.');
    setCard('network',navigator.onLine?'ok':'warning',navigator.onLine?'O Windows informa conexão de rede disponível.':'O computador aparenta estar sem conexão de rede.');
    const cfg=integrationSettings();
    const bridge=h.paymentBridge||{};
    if(cfg.provider==='INFINITEPAY'&&cfg.cardChannel==='TAP')setCard('bluetooth',bridge.lanAddress?'ok':'warning',bridge.lanAddress?`Ponte local pronta em ${bridge.lanAddress}:${bridge.port}. InfiniteTap não usa Bluetooth do PC; a cobrança é aberta no app InfinitePay pelo celular.`:'Conecte computador e celular ao mesmo Wi-Fi para usar InfiniteTap.');
    else if(cfg.provider==='GENERIC_HTTP')setCard('bluetooth',cfg.bridge?'ok':'warning',cfg.bridge?`Conector TEF/API configurado em ${cfg.bridge}.`:'Informe o endpoint do conector TEF/API.');
    else setCard('bluetooth','warning','Nenhum canal presencial automático ativo. O Caixa pode continuar em modo manual.');
    if(cfg.provider==='INFINITEPAY')setCard('card',cfg.handle?'ok':'warning',cfg.handle?`InfinitePay configurada com a InfiniteTag $${cfg.handle}. Canal: ${cfg.cardChannel==='CHECKOUT'?'Checkout Integrado':'InfiniteTap no celular'}.`:'Informe sua InfiniteTag para ativar o adaptador InfinitePay.');
    else if(cfg.provider==='GENERIC_HTTP')setCard('card',cfg.bridge?'ok':'warning',cfg.bridge?'Hub genérico pronto para encaminhar a cobrança ao conector informado.':'Informe o endpoint TEF/API do provedor.');
    else setCard('card','warning','Cartões em modo manual. Configure InfinitePay ou um conector TEF/API para automação.');
    if(cfg.pixProvider==='INFINITEPAY')setCard('pix',cfg.handle&&navigator.onLine?'ok':'warning',cfg.handle?(navigator.onLine?'InfinitePay Checkout pronto para criar cobranças PIX reais e conferir o pagamento.':'InfinitePay configurada, porém o computador está sem rede.'):'Informe sua InfiniteTag para ativar o PIX InfinitePay.');
    else if(cfg.pixProvider==='GENERIC_HTTP')setCard('pix',cfg.pixEndpoint?'ok':'warning',cfg.pixEndpoint?'API PIX externa configurada. O retorno deve seguir o contrato do Hub de Pagamentos.':'Informe o endpoint PIX do banco/PSP.');
    else setCard('pix','warning','PIX manual / QR estático ativo. Não há confirmação bancária automática neste modo.');
    const critical=h.ok&&h.desktop&&h.server;
    $('#healthOverall').textContent=critical?'SISTEMA PRONTO':'REVISAR SISTEMA';
    $('#healthOverall').className=critical?'ok':'error';
    $('#healthContinueBtn').disabled=!critical;
    $('#healthContinueBtn').textContent=(cfg.provider==='INFINITEPAY'&&cfg.handle)||(cfg.pixProvider==='INFINITEPAY'&&cfg.handle)||(cfg.provider==='GENERIC_HTTP'&&cfg.bridge)||(cfg.pixProvider==='GENERIC_HTTP'&&cfg.pixEndpoint)?'CONTINUAR COM INTEGRAÇÕES':'CONTINUAR EM MODO MANUAL';
  }
  function init(){A.applyTheme();if(!guard())return;$('#healthUser').textContent=session.user.name;$('#healthChurch').textContent=db.church?.name||'Santuário Gestão';$('#healthThemeBtn').addEventListener('click',()=>A.toggleTheme());$('#healthRetryBtn').addEventListener('click',run);$('#healthContinueBtn').addEventListener('click',()=>location.href='tesouraria-painel.html');$('#healthBackBtn').addEventListener('click',()=>{A.clearTreasurySession(db);location.href='tesouraria-login.html';});run();}
  init();
})();
