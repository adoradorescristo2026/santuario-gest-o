(() => {
  'use strict';

  const KEYS = {
    data: 'santuarioGestaoV3Data',
    generalSession: 'santuarioGestaoV3Session',
    treasurySession: 'santuarioTreasurySessionV1',
    theme: 'santuarioGestaoV3Theme',
    church: 'santuarioCurrentChurchV1'
  };

  const clone = value => JSON.parse(JSON.stringify(value));
  const TREASURY_COLOR_PALETTE={
    cyan:{accent:'#18A999',light:'#76DFD0',deep:'#0D8177',rgb:'24,169,153',themes:{light:{bg:'#edf8f6',surface:'#ffffff',surface2:'#f5fbfa',text:'#142f31',muted:'#60787a',border:'#cce3df',navy:'#0a4a50',navy2:'#0e686a',mint:'#ddf4f0'},dark:{bg:'#07191d',surface:'#0d252a',surface2:'#112f35',text:'#edf9f7',muted:'#9dbbb8',border:'#24474b',navy:'#05171b',navy2:'#0a3035',mint:'#123c38'}}},
    pink:{accent:'#DB4F91',light:'#FF9BC7',deep:'#A82D68',rgb:'219,79,145',themes:{light:{bg:'#fff1f7',surface:'#ffffff',surface2:'#fff8fb',text:'#351925',muted:'#806273',border:'#edcbd9',navy:'#6c2146',navy2:'#8d2d5c',mint:'#f9dce9'},dark:{bg:'#1d0c15',surface:'#2a111e',surface2:'#351625',text:'#fff1f7',muted:'#c6a4b4',border:'#5a2c40',navy:'#160811',navy2:'#351224',mint:'#482039'}}},
    red:{accent:'#D84A4A',light:'#FF8B8B',deep:'#A72F36',rgb:'216,74,74',themes:{light:{bg:'#fff1f1',surface:'#ffffff',surface2:'#fff8f8',text:'#361b1d',muted:'#806466',border:'#eccdce',navy:'#6b252a',navy2:'#8d3036',mint:'#f8dddd'},dark:{bg:'#1c0d0f',surface:'#291416',surface2:'#35191c',text:'#fff2f2',muted:'#c5a5a7',border:'#5a3033',navy:'#15090b',navy2:'#351517',mint:'#472326'}}},
    blue:{accent:'#3478E5',light:'#83B5FF',deep:'#225DB8',rgb:'52,120,229',themes:{light:{bg:'#edf4ff',surface:'#ffffff',surface2:'#f6f9ff',text:'#172842',muted:'#63738c',border:'#cbdaf1',navy:'#173f78',navy2:'#225aa5',mint:'#dce9fc'},dark:{bg:'#071323',surface:'#0e2037',surface2:'#132944',text:'#eff5ff',muted:'#a1b4d0',border:'#284565',navy:'#06101e',navy2:'#102c4d',mint:'#183657'}}},
    yellow:{accent:'#C99A12',light:'#F2D060',deep:'#8B6508',rgb:'201,154,18',themes:{light:{bg:'#fff9e7',surface:'#ffffff',surface2:'#fffdf5',text:'#332a13',muted:'#7d7358',border:'#e9ddb4',navy:'#67510e',navy2:'#856b13',mint:'#f6ebbd'},dark:{bg:'#1b1709',surface:'#28220f',surface2:'#342c13',text:'#fff9e7',muted:'#c5b98f',border:'#584b23',navy:'#141005',navy2:'#332a0c',mint:'#443918'}}},
    purple:{accent:'#8056D9',light:'#BE9AF7',deep:'#5D35AB',rgb:'128,86,217',themes:{light:{bg:'#f5f0ff',surface:'#ffffff',surface2:'#faf8ff',text:'#2a1d40',muted:'#746487',border:'#ddd0ef',navy:'#442777',navy2:'#5b35a0',mint:'#e9def8'},dark:{bg:'#130d20',surface:'#1f1730',surface2:'#281e3c',text:'#f7f1ff',muted:'#b5a5ca',border:'#493964',navy:'#0e0918',navy2:'#271b3e',mint:'#382850'}}},
    orange:{accent:'#E67E22',light:'#FFB56B',deep:'#B85A12',rgb:'230,126,34',themes:{light:{bg:'#fff4e9',surface:'#ffffff',surface2:'#fff9f3',text:'#3a2414',muted:'#846d5b',border:'#efd4ba',navy:'#7a3c10',navy2:'#a45417',mint:'#f9e2c9'},dark:{bg:'#1d1007',surface:'#2b180c',surface2:'#382011',text:'#fff4e9',muted:'#c9ad94',border:'#5e3920',navy:'#150b04',navy2:'#351b0b',mint:'#4a2a16'}}},
    emerald:{accent:'#1F9D63',light:'#76DFA9',deep:'#147747',rgb:'31,157,99',themes:{light:{bg:'#eef9f3',surface:'#ffffff',surface2:'#f6fcf8',text:'#173429',muted:'#627b70',border:'#cce5d7',navy:'#15583d',navy2:'#1b7650',mint:'#dff2e8'},dark:{bg:'#071a12',surface:'#0d291d',surface2:'#123426',text:'#eefaf4',muted:'#9fbcaf',border:'#285541',navy:'#05130d',navy2:'#0c3121',mint:'#174936'}}},
    indigo:{accent:'#4F5FD5',light:'#9AA6FF',deep:'#3544AC',rgb:'79,95,213',themes:{light:{bg:'#f0f2ff',surface:'#ffffff',surface2:'#f8f9ff',text:'#202541',muted:'#6b7089',border:'#d2d6ef',navy:'#303b83',navy2:'#4050ad',mint:'#e1e4fb'},dark:{bg:'#0b0d21',surface:'#151934',surface2:'#1c2143',text:'#f1f3ff',muted:'#abb0cc',border:'#3a416b',navy:'#080a19',navy2:'#1a2043',mint:'#2a315f'}}},
    terracotta:{accent:'#C86449',light:'#F2A38B',deep:'#974532',rgb:'200,100,73',themes:{light:{bg:'#fff2ed',surface:'#ffffff',surface2:'#fff8f5',text:'#3b211b',muted:'#82685f',border:'#eccfc5',navy:'#6e3426',navy2:'#914734',mint:'#f7dfd6'},dark:{bg:'#1b0e0b',surface:'#291713',surface2:'#351e19',text:'#fff3ef',muted:'#c5a99f',border:'#5b372e',navy:'#140a08',navy2:'#351912',mint:'#49271f'}}},
    graphite:{accent:'#64748B',light:'#A8B5C7',deep:'#455468',rgb:'100,116,139',themes:{light:{bg:'#f2f5f8',surface:'#ffffff',surface2:'#f8fafc',text:'#202832',muted:'#687482',border:'#d6dde5',navy:'#334155',navy2:'#475569',mint:'#e4e9ee'},dark:{bg:'#0c1117',surface:'#151c24',surface2:'#1c2630',text:'#f2f5f8',muted:'#aab4bf',border:'#3b4855',navy:'#080c11',navy2:'#1d2732',mint:'#2b3743'}}}
  };
  const CHURCH_SCOPED_KEYS = ['members','families','visitors','careCases','ministries','teams','shifts','events','attendance','assets','documents','announcements','accounts','cashSessions','cashAdjustments','transactions','contributions','bills','reconciliations','budgets','funds','suppliers','approvals','notifications','treasuryAccessLog','treasuryActiveSessions','treasuryClosureReports','treasuryOperations','externalCashSessions','treasurySales','treasuryStockMoves','externalCashAdjustments'];
  const snapshotChurchData = data => Object.fromEntries(CHURCH_SCOPED_KEYS.map(key=>[key,clone(Array.isArray(data[key])?data[key]:[])]));
  const emptyChurchData = () => Object.fromEntries(CHURCH_SCOPED_KEYS.map(key=>[key,[]]));
  function activateChurchData(data,id){
    const church=(data.churches||[]).find(item=>item.id===id&&item.active!==false);if(!church)return;
    data.branchData=data.branchData||{};if(data.activeChurchDataId)data.branchData[data.activeChurchDataId]=snapshotChurchData(data);
    if(!data.branchData[id])data.branchData[id]=emptyChurchData();const branch=data.branchData[id];
    CHURCH_SCOPED_KEYS.forEach(key=>data[key]=clone(Array.isArray(branch[key])?branch[key]:[]));data.activeChurchDataId=id;data.church={...church};
  }
  const normalize = (value='') => String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  const normalizeTreasuryCode = (value='') => String(value).toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);
  const normalizeTreasuryLogin = (value='') => String(value).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9._-]/g,'').slice(0,24);
  const uid = (prefix='id') => `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,8)}`;
  const parseMoney = value => window.CurrencyBRL?.parse ? window.CurrencyBRL.parse(value) : (Number(value)||0);
  const money = (value=0) => new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'}).format(parseMoney(value));
  const dateTimeBR = value => value ? new Intl.DateTimeFormat('pt-BR',{dateStyle:'short',timeStyle:'short'}).format(new Date(value)) : '—';
  const dateBR = value => value ? new Intl.DateTimeFormat('pt-BR').format(new Date(`${value}T12:00:00`)) : '—';
  const localDateTimeInput = () => { const d=new Date(Date.now()-new Date().getTimezoneOffset()*60000); return d.toISOString().slice(0,16); };
  const todayISO = () => localDateTimeInput().slice(0,10);
  const esc = (value='') => String(value).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;').replaceAll("'",'&#039;');
  const sum = (rows, getter=(row)=>row) => rows.reduce((total,row)=>total+parseMoney(getter(row)),0);

  function peopleList(data,{treasuryOnly=false,excludeUserId=''}={}){
    const rows=[];
    const add=(name,kind,id='')=>{
      const clean=String(name||'').trim();if(!clean)return;
      const key=normalize(clean);if(rows.some(item=>item.key===key))return;
      rows.push({name:clean,kind,id,key});
    };
    (data.users||[]).filter(user=>user.active!==false&&user.id!==excludeUserId&&(!treasuryOnly||isTreasuryAuthorized(user))).forEach(user=>add(user.name,treasuryOnly?'Operador da Tesouraria':'Usuário do sistema',user.id));
    if(!treasuryOnly){
      (data.members||[]).filter(member=>normalize(member.status)!=='afastado').forEach(member=>add(member.name,'Membro cadastrado',member.id));
    }
    return rows.sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
  }
  function personOptions(data,selected='',options={}){
    const {treasuryOnly=false,excludeUserId='',includeBlank=true,blankLabel='Selecione uma pessoa'}=options;
    const rows=peopleList(data,{treasuryOnly,excludeUserId});
    const selectedValue=String(selected||'').trim();
    if(selectedValue&&!rows.some(item=>normalize(item.name)===normalize(selectedValue)))rows.unshift({name:selectedValue,kind:'Valor já registrado',id:'',key:normalize(selectedValue)});
    return `${includeBlank?`<option value="">${esc(blankLabel)}</option>`:''}${rows.map(item=>`<option value="${esc(item.name)}" ${normalize(item.name)===normalize(selectedValue)?'selected':''}>${esc(item.name)} — ${esc(item.kind)}</option>`).join('')}`;
  }

  const DEFAULT_PRODUCTS = [
    {id:'tp1',saleType:'ALIMENTAÇÃO',code:'1001',barcode:'7891001000011',name:'Água mineral 500 ml',category:'Bebidas',price:4,cost:1.6,stock:80,minStock:15,active:true},
    {id:'tp2',saleType:'ALIMENTAÇÃO',code:'1002',barcode:'7891001000028',name:'Refrigerante lata',category:'Bebidas',price:6,cost:3.1,stock:60,minStock:12,active:true},
    {id:'tp3',saleType:'ALIMENTAÇÃO',code:'1003',barcode:'7891001000035',name:'Suco natural 300 ml',category:'Bebidas',price:7,cost:3,stock:35,minStock:8,active:true},
    {id:'tp4',saleType:'ALIMENTAÇÃO',code:'2001',barcode:'7891002000010',name:'Salgado assado',category:'Alimentos',price:8,cost:3.7,stock:90,minStock:20,active:true},
    {id:'tp5',saleType:'ALIMENTAÇÃO',code:'2002',barcode:'7891002000027',name:'Combo salgado + refrigerante',category:'Combos',price:13,cost:6.8,stock:45,minStock:10,active:true},
    {id:'tp6',saleType:'VESTUÁRIO',code:'3001',barcode:'7891003000019',name:'Camiseta do evento',category:'Produtos',price:45,cost:23,stock:30,minStock:5,active:true},
    {id:'tp7',saleType:'PRODUTOS',code:'3002',barcode:'7891003000026',name:'Caneca personalizada',category:'Produtos',price:28,cost:14,stock:24,minStock:5,active:true},
    {id:'tp8',saleType:'PRODUTOS',code:'4001',barcode:'7891004000018',name:'Inscrição individual',category:'Inscrições',price:35,cost:0,stock:200,minStock:20,active:true}
  ];

  function ensureShape(data){
    data=data||{church:{name:'Santuário Gestão'},churches:[],users:[],audit:[],notifications:[]};
    data.churches=Array.isArray(data.churches)&&data.churches.length?data.churches:[{id:'ch1',type:'Matriz',active:true,...(data.church||{})}];
    const firstChurchId=data.churches.find(church=>church.active!==false)?.id||data.churches[0]?.id||'ch1';
    if(!data.branchData||typeof data.branchData!=='object'){data.branchData={[firstChurchId]:snapshotChurchData(data)};data.activeChurchDataId=firstChurchId;}
    data.users=Array.isArray(data.users)?data.users:[];
    data.members=Array.isArray(data.members)?data.members:[];
    const registrationYear=new Date().getFullYear();
    data.members.forEach((member,index)=>{
      if(!member.registration) member.registration=`${registrationYear}-${String(index+1).padStart(6,'0')}`;
    });
    data.audit=Array.isArray(data.audit)?data.audit:[];
    data.notifications=Array.isArray(data.notifications)?data.notifications:[];
    data.treasuryOperations=Array.isArray(data.treasuryOperations)?data.treasuryOperations:[];
    data.treasuryAccessLog=Array.isArray(data.treasuryAccessLog)?data.treasuryAccessLog:[];
    data.treasuryActiveSessions=Array.isArray(data.treasuryActiveSessions)?data.treasuryActiveSessions:[];
    data.treasuryClosureReports=Array.isArray(data.treasuryClosureReports)?data.treasuryClosureReports:[];
    const now=Date.now();
    data.treasuryActiveSessions=data.treasuryActiveSessions.filter(item=>Number(item.expiresAt||0)>now);
    const usedGeneralLogins=new Set();
    const usedTreasuryCodes=new Set();
    const usedTreasuryLogins=new Set();
    data.users.forEach((user,userIndex)=>{
      const eligible=user.areas?.includes('finance')&&['admin','financeiro'].includes(user.role);
      let generalLogin=String(user.login||String(user.email||'').split('@')[0]||`usuario${userIndex+1}`).trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9._-]/g,'').slice(0,32);
      if(generalLogin.length<3||usedGeneralLogins.has(generalLogin)){let index=1;do{generalLogin=`usuario${index++}`;}while(usedGeneralLogins.has(generalLogin));}
      user.login=generalLogin;usedGeneralLogins.add(generalLogin);
      if(user.treasuryAccess===undefined) user.treasuryAccess=eligible;
      user.treasuryPermissions={internal:true,external:true,open:true,close:true,adjust:true,cancel:true,report:true,...(user.treasuryPermissions||{})};
      let code=normalizeTreasuryCode(user.treasuryCode||'');
      if(code&&usedTreasuryCodes.has(code)) code='';
      if(eligible&&!code){
        const prefix=user.role==='admin'?'ADM':'TES';
        let index=1;
        do { code=`${prefix}${String(index++).padStart(3,'0')}`; } while(usedTreasuryCodes.has(code));
      }
      if(code){user.treasuryCode=code;usedTreasuryCodes.add(code);}
      let treasuryLogin=normalizeTreasuryLogin(user.treasuryLogin||code||'');
      if(eligible&&(treasuryLogin.length<4||usedTreasuryLogins.has(treasuryLogin))){let index=1;do{treasuryLogin=`tesouraria${index++}`;}while(usedTreasuryLogins.has(treasuryLogin));}
      if(treasuryLogin){user.treasuryLogin=treasuryLogin;usedTreasuryLogins.add(treasuryLogin);}
    });
    data.treasuryProducts=Array.isArray(data.treasuryProducts)&&data.treasuryProducts.length?data.treasuryProducts:clone(DEFAULT_PRODUCTS);
    data.externalCashSessions=Array.isArray(data.externalCashSessions)?data.externalCashSessions:[];
    data.treasurySales=Array.isArray(data.treasurySales)?data.treasurySales:[];
    data.treasuryStockMoves=Array.isArray(data.treasuryStockMoves)?data.treasuryStockMoves:[];
    data.externalCashAdjustments=Array.isArray(data.externalCashAdjustments)?data.externalCashAdjustments:[];
    data.treasurySettings=data.treasurySettings||{};
    data.treasurySettings={
      requireReauthentication:true,
      requireSecondChecker:false,
      sessionMinutes:120,
      maxFailedAttempts:5,
      lockMinutes:10,
      allowNegativeStock:false,
      pixKey:'',
      pixMerchantName:'',
      pixMerchantCity:'',
      creditMaxInstallments:6,
      creditInterestPerExtraInstallment:0,
      notifications:{enabled:false,onOpen:true,onClose:true,onShortage:true,recipients:[]},
      ...data.treasurySettings
    };
    data.treasurySettings.notifications={enabled:false,onOpen:true,onClose:true,onShortage:true,recipients:[],...(data.treasurySettings.notifications||{})};
    data.treasurySettings.notifications.recipients=Array.isArray(data.treasurySettings.notifications.recipients)?data.treasurySettings.notifications.recipients:[];
    return data;
  }

  function loadData(){
    let data;
    try { data=JSON.parse(localStorage.getItem(KEYS.data)||'null'); } catch (_) { data=null; }
    if(!data && window.SANTUARIO_SEED_V3) data=clone(window.SANTUARIO_SEED_V3);
    data=ensureShape(data);
    const selectedChurchId=sessionStorage.getItem(KEYS.church);if(selectedChurchId)activateChurchData(data,selectedChurchId);
    saveData(data);
    return data;
  }

  function saveData(data){ data=ensureShape(data);if(data.activeChurchDataId){data.branchData=data.branchData||{};data.branchData[data.activeChurchDataId]=snapshotChurchData(data);}localStorage.setItem(KEYS.data,JSON.stringify(data));window.santuarioDesktop?.cloudStateChanged?.(data);window.santuarioDesktop?.logCashEvent?.('DADOS',{message:'Dados operacionais do Caixa/Tesouraria atualizados',page:location.pathname});window.santuarioDesktop?.treasuryDataChanged?.(); }
  function generalUser(data){
    localStorage.removeItem(KEYS.generalSession);
    const id=sessionStorage.getItem(KEYS.generalSession);
    return data.users.find(user=>user.id===id&&user.active)||null;
  }
  function isTreasuryAuthorized(user){ return Boolean(user&&user.active&&user.treasuryAccess!==false&&user.areas?.includes('finance')&&['admin','financeiro'].includes(user.role)); }
  function canOperate(user,type='internal',action='access'){
    if(!isTreasuryAuthorized(user)) return false;
    const permissions=user.treasuryPermissions||{};
    if(type==='internal'&&permissions.internal===false) return false;
    if(type==='external'&&permissions.external===false) return false;
    if(action==='open'&&permissions.open===false) return false;
    if(action==='close'&&permissions.close===false) return false;
    if(action==='adjust'&&permissions.adjust===false) return false;
    if(action==='cancel'&&permissions.cancel===false) return false;
    if(action==='report'&&permissions.report===false) return false;
    return true;
  }
  function authenticate(data,identity,password){
    const login=normalizeTreasuryLogin(identity);
    const code=normalizeTreasuryCode(identity);
    return data.users.find(user=>isTreasuryAuthorized(user)&&(normalizeTreasuryLogin(user.treasuryLogin)===login||normalizeTreasuryCode(user.treasuryCode)===code)&&(user.treasuryPassword||user.password)===password)||null;
  }
  function readTreasurySession(data){
    let session;
    try { session=JSON.parse(sessionStorage.getItem(KEYS.treasurySession)||'null'); } catch (_) { session=null; }
    if(!session||Date.now()>Number(session.expiresAt||0)) { sessionStorage.removeItem(KEYS.treasurySession); return null; }
    const user=data.users.find(item=>item.id===session.userId&&isTreasuryAuthorized(item));
    if(!user) { sessionStorage.removeItem(KEYS.treasurySession); return null; }
    return {...session,user};
  }
  function createTreasurySession(data,user,parentUser){
    const minutes=Number(data.treasurySettings?.sessionMinutes||120);
    const session={id:uid('ts'),userId:user.id,parentUserId:parentUser?.id||'',createdAt:Date.now(),expiresAt:Date.now()+minutes*60*1000,lastActivityAt:Date.now()};
    sessionStorage.setItem(KEYS.treasurySession,JSON.stringify(session));
    data.treasuryActiveSessions=(data.treasuryActiveSessions||[]).filter(item=>item.userId!==user.id&&Number(item.expiresAt||0)>Date.now());
    data.treasuryActiveSessions.unshift({id:session.id,userId:user.id,userName:user.name,role:user.role,createdAt:session.createdAt,lastActivityAt:session.lastActivityAt,expiresAt:session.expiresAt,device:navigator.userAgent.slice(0,120)});
    saveData(data);
    return session;
  }
  function touchTreasurySession(data){
    const existing=readTreasurySession(data); if(!existing)return null;
    const session={id:existing.id,userId:existing.userId,parentUserId:existing.parentUserId,createdAt:existing.createdAt,expiresAt:existing.expiresAt,lastActivityAt:Date.now()};
    sessionStorage.setItem(KEYS.treasurySession,JSON.stringify(session));
    const active=(data.treasuryActiveSessions||[]).find(item=>item.id===session.id);
    if(active){active.lastActivityAt=session.lastActivityAt;active.expiresAt=session.expiresAt;}else{data.treasuryActiveSessions.unshift({id:session.id,userId:existing.user.id,userName:existing.user.name,role:existing.user.role,createdAt:session.createdAt,lastActivityAt:session.lastActivityAt,expiresAt:session.expiresAt,device:navigator.userAgent.slice(0,120)});}
    saveData(data);
    return session;
  }
  function clearTreasurySession(data){
    let current=null;try{current=JSON.parse(sessionStorage.getItem(KEYS.treasurySession)||'null');}catch(_){current=null;}
    sessionStorage.removeItem(KEYS.treasurySession);
    if(data&&current){data.treasuryActiveSessions=(data.treasuryActiveSessions||[]).filter(item=>item.id!==current.id);saveData(data);}
  }
  function audit(data,user,action,detail){
    data.audit.unshift({id:uid('au'),user:user?.name||'Sistema',area:'Financeiro',action,detail,at:new Date().toISOString()});
    data.audit=data.audit.slice(0,700); saveData(data);
  }
  function accessLog(data,{user='',identity='',action='',result='',detail=''}){
    data.treasuryAccessLog.unshift({id:uid('tal'),user,identity,action,result,detail,at:new Date().toISOString()});
    data.treasuryAccessLog=data.treasuryAccessLog.slice(0,500); saveData(data);
  }
  function applyTheme(){
    const mode=localStorage.getItem(KEYS.theme)||'light';
    document.documentElement.dataset.theme=mode;
    document.body?.classList.toggle('dark-mode',mode==='dark');
    let stored=null;try{stored=JSON.parse(localStorage.getItem(KEYS.data)||'null');}catch(_){stored=null;}
    const selectedId=sessionStorage.getItem(KEYS.church);const church=(stored?.churches||[]).find(item=>item.id===selectedId)||stored?.church||{};const palette=TREASURY_COLOR_PALETTE[church.colorKey]||TREASURY_COLOR_PALETTE.cyan;const theme=palette.themes[mode]||palette.themes.light;const root=document.documentElement;
    const variables={'--treasury-navy':theme.navy,'--treasury-navy-2':theme.navy2,'--treasury-teal':palette.accent,'--treasury-teal-dark':mode==='dark'?palette.light:palette.deep,'--treasury-mint':theme.mint,'--treasury-coral':palette.accent,'--treasury-gold':palette.light,'--treasury-paper':theme.bg,'--treasury-white':theme.surface,'--treasury-surface-2':theme.surface2,'--treasury-ink':theme.text,'--treasury-muted':theme.muted,'--treasury-line':theme.border,'--treasury-accent-rgb':palette.rgb};
    [root,document.body].filter(Boolean).forEach(target=>Object.entries(variables).forEach(([name,value])=>target.style.setProperty(name,value)));root.dataset.churchTheme=church.colorKey||'cyan';if(document.body)document.body.dataset.churchTheme=church.colorKey||'cyan';const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.setAttribute('content',mode==='dark'?theme.bg:theme.navy);
  }
  function toggleTheme(){
    const next=(localStorage.getItem(KEYS.theme)||'light')==='dark'?'light':'dark';
    localStorage.setItem(KEYS.theme,next); applyTheme(); return next;
  }
  function nextNumber(data,prefix,collection='treasuryOperations'){
    const year=new Date().getFullYear();
    const rows=Array.isArray(data[collection])?data[collection]:[];
    const count=rows.filter(item=>String(item.number||'').startsWith(`${prefix}-${year}-`)).length+1;
    return `${prefix}-${year}-${String(count).padStart(6,'0')}`;
  }

  function notificationRecipients(data){
    const cfg=data.treasurySettings?.notifications||{};
    const selected=Array.isArray(cfg.recipients)?cfg.recipients:[];
    return selected.map(rule=>{
      const user=(data.users||[]).find(item=>item.id===rule.userId&&item.active!==false);if(!user)return null;
      const linked=(data.members||[]).find(member=>normalize(member.name)===normalize(user.name));
      return {userId:user.id,name:user.name,email:String(user.email||linked?.email||'').trim(),phone:String(user.phone||linked?.phone||'').trim(),emailEnabled:Boolean(rule.email),smsEnabled:Boolean(rule.sms)};
    }).filter(Boolean);
  }
  function notifyTreasuryEvent(data,eventType,payload={}){
    const cfg=data.treasurySettings?.notifications||{};const type=String(eventType||'').toUpperCase();
    if(!cfg.enabled||!window.santuarioDesktop?.sendTreasuryNotification)return Promise.resolve({ok:false,skipped:true});
    if(type==='OPEN'&&cfg.onOpen===false)return Promise.resolve({ok:false,skipped:true});
    if((type==='CLOSE'||type==='FORCED_CLOSE')&&cfg.onClose===false)return Promise.resolve({ok:false,skipped:true});
    if(type==='SHORTAGE'&&cfg.onShortage===false)return Promise.resolve({ok:false,skipped:true});
    const recipients=notificationRecipients(data);if(!recipients.length)return Promise.resolve({ok:false,skipped:true});
    const church=(data.churches||[]).find(item=>item.id===data.activeChurchDataId)||data.church||{};
    return window.santuarioDesktop.sendTreasuryNotification({eventType:type,recipients,payload:{...payload,churchName:payload.churchName||church.name||'Santuário Gestão'}}).catch(()=>({ok:false}));
  }

  // V1.5.3 — atualização remota da Tesouraria.
  // IMPORTANTE: no navegador NUNCA registramos recarga completa da página.
  // O web-sync atualiza o localStorage e notificamos as telas por evento.
  // A recarga total fica restrita ao aplicativo Desktop nativo.
  if(window.santuarioDesktop?.isDesktop && window.santuarioDesktop?.onTreasuryRefresh){
    window.santuarioDesktop.onTreasuryRefresh(()=>{ try{ location.reload(); }catch(_){} });
  }else if(window.santuarioDesktop?.isWeb && window.santuarioDesktop?.onTreasuryDataChanged){
    window.santuarioDesktop.onTreasuryDataChanged(()=>{
      try{ window.dispatchEvent(new CustomEvent('santuario:treasury-remote-refresh')); }catch(_){}
    });
  }

  function activeExternalCash(data){ return data.externalCashSessions.find(item=>item.status==='Aberto')||null; }
  function sessionSales(data,sessionId,{includeCancelled=false}={}){ return data.treasurySales.filter(sale=>sale.sessionId===sessionId&&(includeCancelled||sale.status!=='Cancelada')); }
  function paymentTotals(sales){
    const totals={Dinheiro:0,PIX:0,'Cartão de débito':0,'Cartão de crédito':0,Transferência:0,Outros:0};
    sales.forEach(sale=>(sale.payments||[]).forEach(payment=>{const key=Object.hasOwn(totals,payment.method)?payment.method:'Outros';totals[key]+=Number(payment.amount||0);}));
    return totals;
  }

  window.TreasuryApp={KEYS,clone,normalize,normalizeTreasuryCode,normalizeTreasuryLogin,uid,parseMoney,money,dateTimeBR,dateBR,localDateTimeInput,todayISO,esc,sum,peopleList,personOptions,loadData,saveData,generalUser,isTreasuryAuthorized,canOperate,authenticate,readTreasurySession,createTreasurySession,touchTreasurySession,clearTreasurySession,audit,accessLog,applyTheme,toggleTheme,nextNumber,notificationRecipients,notifyTreasuryEvent,activeExternalCash,sessionSales,paymentTotals};
})();
