(() => {
  'use strict';
  const A=window.TreasuryApp;
  const db=A.loadData();
  let generalUser=A.generalUser(db);

  const $=selector=>document.querySelector(selector);
  const error=$('#treasuryLoginError');

  function updateClock(){
    $('#loginClock').textContent=new Intl.DateTimeFormat('pt-BR',{dateStyle:'full',timeStyle:'short'}).format(new Date());
  }

  function init(){
    A.applyTheme();
    if(!generalUser){ window.location.replace('index.html'); return; }
    if(!generalUser.areas?.includes('finance')){
      $('#treasuryLoginForm').hidden=true;
      error.textContent='O usuário conectado ao sistema geral não possui acesso à área financeira.';
    }
    $('#churchVisualName').textContent=db.church?.name||'Santuário Gestão';
    $('#generalSessionInfo').innerHTML=`<span>${A.esc(generalUser.name.split(' ').map(p=>p[0]).slice(0,2).join(''))}</span><div><small>SESSÃO GERAL ATIVA</small><strong>${A.esc(generalUser.name)}</strong><p>${A.esc(generalUser.role==='admin'?'Administrador Geral':'Área Financeira')}</p></div>`;
    $('#treasuryUser').value='';
    $('#treasuryPassword').value='';
    A.clearTreasurySession(db);

    updateClock(); setInterval(updateClock,30000);
    bind();
  }

  function bind(){
    $('#backDepartmentsBtn').addEventListener('click',()=>{if(window.santuarioDesktop?.isDesktop&&window.santuarioDesktop?.returnCashToMain)window.santuarioDesktop.returnCashToMain();else window.location.href='index.html';});
    $('#treasuryThemeBtn').addEventListener('click',()=>A.toggleTheme());
    $('#showTreasuryPassword').addEventListener('click',()=>{
      const input=$('#treasuryPassword'),show=input.type==='password'; input.type=show?'text':'password';
      $('#showTreasuryPassword').textContent=show?'Ocultar':'Mostrar';
    });
    $('#treasuryUser').addEventListener('input',event=>{event.target.value=A.normalizeTreasuryLogin(event.target.value);});
    $('#treasuryLoginForm').addEventListener('submit',event=>{
      event.preventDefault(); error.textContent='';
      const identity=$('#treasuryUser').value.trim(),password=$('#treasuryPassword').value;
      if(!identity||!password){error.textContent='Informe o login da Tesouraria e a senha.';return;}
      const lockMinutes=Number(db.treasurySettings?.lockMinutes||10);
      const maxAttempts=Number(db.treasurySettings?.maxFailedAttempts||5);
      const lockSince=Date.now()-lockMinutes*60*1000;
      const recentFailures=db.treasuryAccessLog.filter(item=>A.normalize(item.identity)===A.normalize(identity)&&item.action==='Login da Tesouraria'&&item.result==='Negado'&&new Date(item.at).getTime()>=lockSince).length;
      if(recentFailures>=maxAttempts){
        A.accessLog(db,{identity,action:'Login da Tesouraria',result:'Bloqueado',detail:`Limite de tentativas atingido por ${lockMinutes} minutos`});
        error.textContent=`Acesso temporariamente bloqueado. Aguarde ${lockMinutes} minutos.`; return;
      }
      const user=A.authenticate(db,identity,password);
      if(!user){
        A.accessLog(db,{identity,action:'Login da Tesouraria',result:'Negado',detail:'Credenciais ou permissão inválidas'});
        error.textContent='Login, senha ou permissão inválidos.'; return;
      }
      A.createTreasurySession(db,user,generalUser);
      A.accessLog(db,{user:user.name,identity,action:'Login da Tesouraria',result:'Autorizado',detail:`Sessão geral: ${generalUser.name}`});
      A.audit(db,user,'Autenticou na Tesouraria','Acesso interno autorizado ao departamento Tesouraria e Caixa');
      window.location.href='tesouraria-verificacao.html';
    });
  }

  init();
})();
