(() => {
  'use strict';
  const pad = (value) => String(value).padStart(2, '0');
  const iso = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  const shift = (days) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setDate(date.getDate() + days); return iso(date); };
  const monthDate = (monthsAgo, day = 15) => { const date = new Date(); date.setHours(12, 0, 0, 0); date.setMonth(date.getMonth() - monthsAgo, day); return iso(date); };

  window.SANTUARIO_SEED_V3 = {
    version: 3,
    churches: [
      { id:'ch1', type:'Matriz', active:true,
        name:'Igreja Comunidade da Graça', legalName:'Comunidade da Graça de Três Lagoas', cnpj:'12.345.678/0001-90',
        phone:'(67) 3521-1000', email:'contato@comunidadedagraca.local', address:'Avenida da Esperança, 420', city:'Três Lagoas', state:'MS',
        pastor:'Pr. Daniel Souza', image:'', colorKey:'cyan', fiscalYearStart:'01-01', currency:'BRL'
      }
    ],
    church: {
      name: 'Igreja Comunidade da Graça', legalName: 'Comunidade da Graça de Três Lagoas', cnpj: '12.345.678/0001-90',
      phone: '(67) 3521-1000', email: 'contato@comunidadedagraca.local', address: 'Avenida da Esperança, 420', city: 'Três Lagoas', state: 'MS',
      pastor: 'Pr. Daniel Souza', fiscalYearStart: '01-01', currency: 'BRL'
    },
    users: [
      { id: 'u1', name: 'Administrador Geral', login: 'admin', email: 'admin@igreja.local', treasuryLogin: 'adm001', treasuryCode: 'ADM001', treasuryPassword:'123456', treasuryConfigured:true, password: '123456', role: 'admin', managementRole:'adm_regional', churchIds:['ch1'], active: true, areas: ['admin', 'finance'] },
      { id: 'u2', name: 'Marcos Oliveira', login: 'financeiro', email: 'financeiro@igreja.local', treasuryLogin: 'tes001', treasuryCode: 'TES001', treasuryPassword:'123456', treasuryConfigured:true, password: '123456', role: 'financeiro', managementRole:'adm_local', churchIds:['ch1'], active: true, areas: ['finance'] },
      { id: 'u3', name: 'Ana Paula Santos', login: 'secretaria', email: 'secretaria@igreja.local', password: '123456', role: 'secretaria', managementRole:'adm_local', churchIds:['ch1'], active: true, areas: ['admin'] }
    ],
    members: [
      { id:'m1', name:'Amanda Ribeiro', cpf:'123.456.789-01', phone:'(67) 99111-2233', email:'amanda@email.com', birthDate:'1994-08-18', gender:'Feminino', maritalStatus:'Casada', status:'Ativo', type:'Membro', familyId:'f1', ministryIds:['mn1'], joinedAt:'2022-03-12', baptized:true, baptismDate:'2022-04-10', address:'Rua das Flores, 80', city:'Três Lagoas', notes:'Líder auxiliar do louvor.' },
      { id:'m2', name:'João Silva', cpf:'234.567.890-12', phone:'(67) 99222-3344', email:'joao@email.com', birthDate:'1988-02-04', gender:'Masculino', maritalStatus:'Casado', status:'Ativo', type:'Membro', familyId:'f2', ministryIds:['mn5'], joinedAt:'2021-06-07', baptized:true, baptismDate:'2021-07-18', address:'Rua Central, 115', city:'Três Lagoas', notes:'' },
      { id:'m3', name:'Carla Mendes', cpf:'', phone:'(67) 99333-4455', email:'carla@email.com', birthDate:'1999-11-21', gender:'Feminino', maritalStatus:'Solteira', status:'Em integração', type:'Visitante', familyId:'', ministryIds:[], joinedAt:shift(-18), baptized:false, baptismDate:'', address:'Jardim Alvorada', city:'Três Lagoas', notes:'Visitou três cultos.' },
      { id:'m4', name:'Lucas Ferreira', cpf:'345.678.901-23', phone:'(67) 99444-5566', email:'lucas@email.com', birthDate:'2001-05-30', gender:'Masculino', maritalStatus:'Solteiro', status:'Ativo', type:'Membro', familyId:'f3', ministryIds:['mn2'], joinedAt:'2023-01-15', baptized:true, baptismDate:'2023-03-19', address:'Vila Nova', city:'Três Lagoas', notes:'Líder dos jovens.' },
      { id:'m5', name:'Fernanda Costa', cpf:'456.789.012-34', phone:'(67) 99555-6677', email:'fernanda@email.com', birthDate:'1990-09-12', gender:'Feminino', maritalStatus:'Casada', status:'Ativo', type:'Membro', familyId:'f1', ministryIds:['mn3'], joinedAt:'2020-09-20', baptized:true, baptismDate:'2020-11-08', address:'Rua das Flores, 80', city:'Três Lagoas', notes:'Coordenadora do infantil.' },
      { id:'m6', name:'Paulo Nunes', cpf:'567.890.123-45', phone:'(67) 99666-7788', email:'paulo@email.com', birthDate:'1985-12-08', gender:'Masculino', maritalStatus:'Divorciado', status:'Afastado', type:'Membro', familyId:'', ministryIds:[], joinedAt:'2019-04-11', baptized:true, baptismDate:'2019-06-02', address:'Centro', city:'Três Lagoas', notes:'Solicitada visita pastoral.' },
      { id:'m7', name:'Rita Alves', cpf:'678.901.234-56', phone:'(67) 99777-8899', email:'rita@email.com', birthDate:'1978-04-23', gender:'Feminino', maritalStatus:'Viúva', status:'Ativo', type:'Membro', familyId:'f4', ministryIds:['mn4'], joinedAt:'2022-07-19', baptized:true, baptismDate:'2022-09-04', address:'Jardim Esperança', city:'Três Lagoas', notes:'Responsável pela ação social.' },
      { id:'m8', name:'Diego Martins', cpf:'', phone:'(67) 99888-9900', email:'diego@email.com', birthDate:'1996-06-14', gender:'Masculino', maritalStatus:'Solteiro', status:'Novo visitante', type:'Visitante', familyId:'', ministryIds:[], joinedAt:shift(-8), baptized:false, baptismDate:'', address:'Interlagos', city:'Três Lagoas', notes:'Veio por convite de Lucas.' },
      { id:'m9', name:'Helena Oliveira', cpf:'789.012.345-67', phone:'(67) 99911-2233', email:'helena@email.com', birthDate:'1968-10-02', gender:'Feminino', maritalStatus:'Casada', status:'Ativo', type:'Membro', familyId:'f5', ministryIds:['mn6'], joinedAt:'2018-02-12', baptized:true, baptismDate:'2018-03-25', address:'Jardim Primaveril', city:'Três Lagoas', notes:'' },
      { id:'m10', name:'Marcos Oliveira', cpf:'890.123.456-78', phone:'(67) 99123-7788', email:'marcos@email.com', birthDate:'1970-07-19', gender:'Masculino', maritalStatus:'Casado', status:'Ativo', type:'Membro', familyId:'f5', ministryIds:['mn6'], joinedAt:'2018-02-12', baptized:true, baptismDate:'2018-03-25', address:'Jardim Primaveril', city:'Três Lagoas', notes:'Tesoureiro.' }
    ],
    families: [
      { id:'f1', name:'Família Ribeiro Costa', headMemberId:'m1', memberIds:['m1','m5'], address:'Rua das Flores, 80', phone:'(67) 99111-2233', status:'Ativa' },
      { id:'f2', name:'Família Silva', headMemberId:'m2', memberIds:['m2'], address:'Rua Central, 115', phone:'(67) 99222-3344', status:'Ativa' },
      { id:'f3', name:'Família Ferreira', headMemberId:'m4', memberIds:['m4'], address:'Vila Nova', phone:'(67) 99444-5566', status:'Ativa' },
      { id:'f4', name:'Família Alves', headMemberId:'m7', memberIds:['m7'], address:'Jardim Esperança', phone:'(67) 99777-8899', status:'Ativa' },
      { id:'f5', name:'Família Oliveira', headMemberId:'m10', memberIds:['m9','m10'], address:'Jardim Primaveril', phone:'(67) 99123-7788', status:'Ativa' }
    ],
    visitors: [
      { id:'v1', memberId:'m3', firstVisit:shift(-18), lastVisit:shift(-4), visits:3, source:'Instagram', responsible:'Ana Paula Santos', stage:'Integração', nextAction:'Convidar para café de boas-vindas', nextDate:shift(2) },
      { id:'v2', memberId:'m8', firstVisit:shift(-8), lastVisit:shift(-1), visits:2, source:'Convite de membro', responsible:'Lucas Ferreira', stage:'Primeiro contato', nextAction:'Enviar mensagem de agradecimento', nextDate:shift(1) }
    ],
    careCases: [
      { id:'c1', memberId:'m6', category:'Acompanhamento pastoral', priority:'Alta', status:'Em acompanhamento', owner:'Pr. Daniel Souza', openedAt:shift(-12), nextContact:shift(1), notes:'Afastamento após mudança familiar. Agendar visita.' },
      { id:'c2', memberId:'m7', category:'Apoio social', priority:'Média', status:'Aberto', owner:'Rita Alves', openedAt:shift(-5), nextContact:shift(3), notes:'Família atendida precisa de encaminhamento para documentação.' },
      { id:'c3', memberId:'m3', category:'Integração', priority:'Normal', status:'Em acompanhamento', owner:'Ana Paula Santos', openedAt:shift(-8), nextContact:shift(2), notes:'Apresentar turma de novos membros.' }
    ],
    ministries: [
      { id:'mn1', name:'Louvor', icon:'♫', color:'#18a999', leaderId:'m1', memberIds:['m1'], budgetId:'b1', status:'Ativo', description:'Música, celebrações, ensaios e apoio aos cultos.' },
      { id:'mn2', name:'Jovens', icon:'✦', color:'#676bd3', leaderId:'m4', memberIds:['m4'], budgetId:'b2', status:'Ativo', description:'Discipulado, encontros e integração da juventude.' },
      { id:'mn3', name:'Infantil', icon:'☀', color:'#f26e5b', leaderId:'m5', memberIds:['m5'], budgetId:'b3', status:'Ativo', description:'Ensino bíblico e cuidado das crianças.' },
      { id:'mn4', name:'Ação Social', icon:'♡', color:'#d98a12', leaderId:'m7', memberIds:['m7'], budgetId:'b4', status:'Ativo', description:'Cestas básicas, visitas e apoio à comunidade.' },
      { id:'mn5', name:'Recepção', icon:'⌂', color:'#326da8', leaderId:'m2', memberIds:['m2'], budgetId:'b5', status:'Ativo', description:'Acolhimento, informações e integração de visitantes.' },
      { id:'mn6', name:'Missões', icon:'◎', color:'#0e8176', leaderId:'m10', memberIds:['m9','m10'], budgetId:'b6', status:'Ativo', description:'Projetos missionários locais e apoio a obreiros.' }
    ],
    teams: [
      { id:'tm1', ministryId:'mn1', name:'Escala de Celebração', members:['m1'], coordinator:'Amanda Ribeiro' },
      { id:'tm2', ministryId:'mn5', name:'Recepção Principal', members:['m2'], coordinator:'João Silva' },
      { id:'tm3', ministryId:'mn3', name:'Turma 6–9 anos', members:['m5'], coordinator:'Fernanda Costa' }
    ],
    shifts: [
      { id:'s1', teamId:'tm1', date:shift(1), time:'18:30', role:'Vocal e direção', memberId:'m1', status:'Confirmado' },
      { id:'s2', teamId:'tm2', date:shift(1), time:'18:15', role:'Recepção porta principal', memberId:'m2', status:'Confirmado' },
      { id:'s3', teamId:'tm3', date:shift(1), time:'18:30', role:'Professora', memberId:'m5', status:'Pendente' }
    ],
    events: [
      { id:'e1', title:'Culto de Celebração', date:shift(1), start:'19:00', end:'21:00', type:'Culto', location:'Templo principal', responsible:'Pr. Daniel Souza', ministryId:'', capacity:450, registrations:0, status:'Confirmado', description:'Celebração dominical da comunidade.' },
      { id:'e2', title:'Ensaio do Louvor', date:shift(2), start:'19:30', end:'21:00', type:'Ensaio', location:'Auditório', responsible:'Amanda Ribeiro', ministryId:'mn1', capacity:30, registrations:12, status:'Confirmado', description:'Ensaio geral da equipe de música.' },
      { id:'e3', title:'Reunião de Líderes', date:shift(4), start:'20:00', end:'21:30', type:'Reunião', location:'Sala 2', responsible:'Pr. Daniel Souza', ministryId:'', capacity:35, registrations:22, status:'Confirmado', description:'Planejamento mensal dos ministérios.' },
      { id:'e4', title:'Ação Social no Bairro', date:shift(7), start:'08:30', end:'12:00', type:'Ação social', location:'Jardim Esperança', responsible:'Rita Alves', ministryId:'mn4', capacity:80, registrations:37, status:'Confirmado', description:'Distribuição de alimentos e atendimento.' },
      { id:'e5', title:'Encontro de Jovens', date:shift(10), start:'19:30', end:'22:00', type:'Jovens', location:'Salão multiuso', responsible:'Lucas Ferreira', ministryId:'mn2', capacity:120, registrations:68, status:'Planejado', description:'Noite de integração e palavra.' }
    ],
    attendance: [
      { id:'at1', eventId:'e1', date:shift(-6), adults:238, children:42, visitors:18, volunteers:31, total:329 },
      { id:'at2', eventId:'e1', date:shift(-13), adults:221, children:39, visitors:12, volunteers:28, total:300 },
      { id:'at3', eventId:'e1', date:shift(-20), adults:246, children:46, visitors:21, volunteers:33, total:346 },
      { id:'at4', eventId:'e5', date:shift(-9), adults:0, children:0, visitors:11, volunteers:8, total:74 }
    ],
    assets: [
      { id:'as1', code:'PAT-0001', name:'Mesa de som digital', category:'Áudio', location:'Templo principal', acquisitionDate:'2023-06-15', value:18900, condition:'Excelente', responsible:'Amanda Ribeiro', status:'Em uso' },
      { id:'as2', code:'PAT-0002', name:'Projetor 6.000 lúmens', category:'Vídeo', location:'Auditório', acquisitionDate:'2022-02-10', value:7800, condition:'Bom', responsible:'João Silva', status:'Em uso' },
      { id:'as3', code:'PAT-0003', name:'Freezer horizontal', category:'Cozinha', location:'Cozinha social', acquisitionDate:'2021-09-02', value:3200, condition:'Regular', responsible:'Rita Alves', status:'Manutenção programada' },
      { id:'as4', code:'PAT-0004', name:'Notebook secretaria', category:'Informática', location:'Secretaria', acquisitionDate:'2024-01-20', value:4100, condition:'Excelente', responsible:'Ana Paula Santos', status:'Em uso' }
    ],
    documents: [
      { id:'d1', type:'Ata', title:'Ata da assembleia geral — 2026', reference:'ATA-2026-01', date:monthDate(1,12), owner:'Secretaria', status:'Assinado', notes:'Documento aprovado pela assembleia.' },
      { id:'d2', type:'Certidão', title:'Certidão de batismo — Amanda Ribeiro', reference:'BAT-2022-014', date:'2022-04-10', owner:'Secretaria', status:'Emitido', notes:'' },
      { id:'d3', type:'Contrato', title:'Contrato de internet', reference:'CTR-2025-008', date:'2025-08-01', owner:'Administração', status:'Vigente', notes:'Renovação anual.' }
    ],
    announcements: [
      { id:'an1', title:'Campanha do agasalho', audience:'Toda a igreja', channel:'WhatsApp e telão', publishDate:shift(0), status:'Publicado', message:'Receberemos doações durante todo o mês.' },
      { id:'an2', title:'Reunião de líderes', audience:'Liderança', channel:'WhatsApp', publishDate:shift(1), status:'Agendado', message:'Confirmação de presença necessária.' }
    ],
    accounts: [
      { id:'a1', name:'Conta Principal', bank:'Cooperativa Sicredi', type:'Conta corrente', branch:'0901', number:'44321-0', initialBalance:18500, active:true },
      { id:'a2', name:'Caixa da Igreja', bank:'Interno', type:'Caixa', branch:'', number:'', initialBalance:2300, active:true },
      { id:'a3', name:'Fundo Missionário', bank:'Banco do Brasil', type:'Poupança', branch:'0031', number:'12987-4', initialBalance:4200, active:true },
      { id:'a4', name:'Cofre da Tesouraria', bank:'Interno', type:'Cofre', branch:'', number:'', initialBalance:1000, active:true }
    ],
    cashSessions: [
      { id:'cx1', accountId:'a2', label:'Tesouraria — Culto de quarta', event:'Culto de quarta-feira', shift:'Noite', openedAt:`${shift(-10)}T18:10:00`, openedBy:'Marcos Oliveira', openingBalance:500, openingCount:{'5000':6,'2000':5,'1000':5,'500':4,'200':5,'100':20}, status:'Fechado', closedAt:`${shift(-10)}T21:35:00`, closedBy:'Marcos Oliveira', expectedBalance:780, countedBalance:780, difference:0, closingCount:{'5000':8,'2000':11,'1000':8,'500':8,'200':10,'100':20}, notes:'Caixa aberto antes do culto.', closingNotes:'Conferido e encerrado sem divergência.' }
    ],
    cashAdjustments: [
      { id:'ca1', sessionId:'cx1', type:'sangria', amount:1000, at:`${shift(-10)}T21:00:00`, reason:'Depósito no cofre após a contagem das ofertas.', recordedBy:'Marcos Oliveira', counterpartAccountId:'a1' }
    ],
    transactions: [
      { id:'t1', type:'entrada', category:'Dízimo', costCenter:'Geral', description:'Dízimos do culto de domingo', amount:4850, date:shift(-1), accountId:'a1', memberId:'', method:'PIX', status:'confirmado', document:'REC-2026-188', notes:'' },
      { id:'t2', type:'entrada', category:'Oferta', costCenter:'Missões', description:'Oferta missionária', amount:1720, date:shift(-2), accountId:'a3', memberId:'', method:'Dinheiro', status:'confirmado', document:'REC-2026-187', notes:'' },
      { id:'t3', type:'saida', category:'Manutenção', costCenter:'Infraestrutura', description:'Manutenção do ar-condicionado', amount:980, date:shift(-3), accountId:'a1', memberId:'', method:'Transferência', status:'confirmado', document:'NF-8821', supplierId:'sp2', notes:'' },
      { id:'t4', type:'entrada', category:'Dízimo', costCenter:'Geral', description:'Contribuição mensal — Amanda Ribeiro', amount:650, date:shift(-4), accountId:'a1', memberId:'m1', method:'PIX', status:'confirmado', document:'REC-2026-186', notes:'' },
      { id:'t5', type:'saida', category:'Ação Social', costCenter:'Ação Social', description:'Compra de 20 cestas básicas', amount:2100, date:shift(-5), accountId:'a3', memberId:'', method:'Cartão', status:'confirmado', document:'NF-1933', supplierId:'sp1', notes:'' },
      { id:'t6', type:'entrada', category:'Doação', costCenter:'Reforma', description:'Doação para reforma', amount:2500, date:shift(-7), accountId:'a1', memberId:'', method:'Transferência', status:'confirmado', document:'REC-2026-181', notes:'' },
      { id:'t7', type:'saida', category:'Material', costCenter:'Infantil', description:'Material para ministério infantil', amount:540, date:shift(-9), accountId:'a2', memberId:'', method:'Dinheiro', status:'confirmado', document:'NF-1220', supplierId:'sp3', notes:'' },
      { id:'t8', type:'entrada', category:'Oferta', costCenter:'Geral', description:'Oferta do culto de quarta', amount:1280, date:shift(-10), accountId:'a2', memberId:'', method:'Dinheiro', status:'confirmado', document:'REC-2026-177', cashSessionId:'cx1', notes:'' },
      { id:'t9', type:'entrada', category:'Dízimo', costCenter:'Geral', description:'Dízimos do mês anterior', amount:11900, date:monthDate(1,25), accountId:'a1', memberId:'', method:'Misto', status:'confirmado', document:'LOTE-021', notes:'' },
      { id:'t10', type:'saida', category:'Pessoal', costCenter:'Administração', description:'Ajuda ministerial', amount:4200, date:monthDate(1,27), accountId:'a1', memberId:'', method:'Transferência', status:'confirmado', document:'FOLHA-07', supplierId:'', notes:'' },
      { id:'t11', type:'entrada', category:'Dízimo', costCenter:'Geral', description:'Dízimos — dois meses atrás', amount:10850, date:monthDate(2,24), accountId:'a1', memberId:'', method:'Misto', status:'confirmado', document:'LOTE-020', notes:'' },
      { id:'t12', type:'saida', category:'Manutenção', costCenter:'Infraestrutura', description:'Pintura do templo', amount:3600, date:monthDate(2,26), accountId:'a1', memberId:'', method:'Transferência', status:'confirmado', document:'NF-8102', supplierId:'sp2', notes:'' },
      { id:'t13', type:'entrada', category:'Oferta', costCenter:'Geral', description:'Contribuições — três meses atrás', amount:9250, date:monthDate(3,20), accountId:'a1', memberId:'', method:'Misto', status:'confirmado', document:'LOTE-019', notes:'' },
      { id:'t14', type:'saida', category:'Eventos', costCenter:'Famílias', description:'Conferência de famílias', amount:2850, date:monthDate(3,22), accountId:'a1', memberId:'', method:'Cartão', status:'confirmado', document:'NF-7320', supplierId:'sp4', notes:'' },
      { id:'t15', type:'entrada', category:'Dízimo', costCenter:'Geral', description:'Contribuições — quatro meses atrás', amount:10100, date:monthDate(4,18), accountId:'a1', memberId:'', method:'Misto', status:'confirmado', document:'LOTE-018', notes:'' },
      { id:'t16', type:'saida', category:'Contas', costCenter:'Administração', description:'Despesas gerais — quatro meses atrás', amount:6220, date:monthDate(4,20), accountId:'a1', memberId:'', method:'Misto', status:'confirmado', document:'LOTE-D17', supplierId:'', notes:'' },
      { id:'t17', type:'entrada', category:'Doação', costCenter:'Missões', description:'Contribuições — cinco meses atrás', amount:8700, date:monthDate(5,17), accountId:'a1', memberId:'', method:'Misto', status:'confirmado', document:'LOTE-017', notes:'' },
      { id:'t18', type:'saida', category:'Missões', costCenter:'Missões', description:'Apoio missionário — cinco meses atrás', amount:5100, date:monthDate(5,19), accountId:'a3', memberId:'', method:'Transferência', status:'confirmado', document:'COM-511', supplierId:'', notes:'' }
    ],
    contributions: [
      { id:'ct1', transactionId:'t4', memberId:'m1', type:'Dízimo', competence:monthDate(0,1).slice(0,7), amount:650, receipt:'REC-2026-186', anonymous:false },
      { id:'ct2', transactionId:'t1', memberId:'', type:'Dízimo coletivo', competence:monthDate(0,1).slice(0,7), amount:4850, receipt:'REC-2026-188', anonymous:true },
      { id:'ct3', transactionId:'t2', memberId:'', type:'Oferta missionária', competence:monthDate(0,1).slice(0,7), amount:1720, receipt:'REC-2026-187', anonymous:true }
    ],
    bills: [
      { id:'bl1', direction:'pagar', description:'Energia elétrica', category:'Utilidades', supplierId:'sp5', accountId:'a1', amount:1360, dueDate:shift(3), status:'Aberta', recurrence:'Mensal', document:'FAT-ENER-08', approvalId:'ap1' },
      { id:'bl2', direction:'pagar', description:'Internet e telefonia', category:'Utilidades', supplierId:'sp6', accountId:'a1', amount:289.9, dueDate:shift(6), status:'Aberta', recurrence:'Mensal', document:'FAT-NET-08', approvalId:'' },
      { id:'bl3', direction:'pagar', description:'Revisão elétrica do templo', category:'Manutenção', supplierId:'sp2', accountId:'a1', amount:2450, dueDate:shift(12), status:'Em aprovação', recurrence:'Única', document:'ORC-441', approvalId:'ap2' },
      { id:'bl4', direction:'receber', description:'Reembolso de evento', category:'Eventos', supplierId:'', accountId:'a1', amount:780, dueDate:shift(5), status:'Aberta', recurrence:'Única', document:'REC-EXT-14', approvalId:'' }
    ],
    reconciliations: [
      { id:'rc1', accountId:'a1', period:monthDate(1,1).slice(0,7), statementBalance:31420.5, systemBalance:31420.5, difference:0, status:'Conciliado', closedAt:monthDate(0,2), owner:'Marcos Oliveira' },
      { id:'rc2', accountId:'a2', period:monthDate(1,1).slice(0,7), statementBalance:3280, systemBalance:3260, difference:20, status:'Com divergência', closedAt:'', owner:'Marcos Oliveira' }
    ],
    budgets: [
      { id:'b1', name:'Louvor 2026', costCenter:'Louvor', year:new Date().getFullYear(), planned:3200, committed:1850, realized:1850, owner:'Amanda Ribeiro', status:'Aprovado' },
      { id:'b2', name:'Jovens 2026', costCenter:'Jovens', year:new Date().getFullYear(), planned:4600, committed:2750, realized:2310, owner:'Lucas Ferreira', status:'Aprovado' },
      { id:'b3', name:'Infantil 2026', costCenter:'Infantil', year:new Date().getFullYear(), planned:2900, committed:2380, realized:1920, owner:'Fernanda Costa', status:'Aprovado' },
      { id:'b4', name:'Ação Social 2026', costCenter:'Ação Social', year:new Date().getFullYear(), planned:5200, committed:3900, realized:3520, owner:'Rita Alves', status:'Aprovado' },
      { id:'b5', name:'Recepção 2026', costCenter:'Recepção', year:new Date().getFullYear(), planned:1200, committed:480, realized:420, owner:'João Silva', status:'Aprovado' },
      { id:'b6', name:'Missões 2026', costCenter:'Missões', year:new Date().getFullYear(), planned:6800, committed:3120, realized:2890, owner:'Marcos Oliveira', status:'Aprovado' },
      { id:'b7', name:'Infraestrutura 2026', costCenter:'Infraestrutura', year:new Date().getFullYear(), planned:18000, committed:10480, realized:8220, owner:'Administração', status:'Aprovado' }
    ],
    funds: [
      { id:'fd1', name:'Reforma do templo', type:'Campanha', target:50000, raised:28750, startDate:'2026-01-01', endDate:'2026-12-15', accountId:'a1', status:'Ativa', description:'Reforma do telhado e climatização.' },
      { id:'fd2', name:'Missões 2026', type:'Fundo restrito', target:24000, raised:11890, startDate:'2026-01-01', endDate:'2026-12-31', accountId:'a3', status:'Ativa', description:'Apoio a missionários e viagens.' },
      { id:'fd3', name:'Natal Solidário', type:'Campanha', target:12000, raised:1800, startDate:'2026-07-01', endDate:'2026-12-10', accountId:'a2', status:'Planejada', description:'Cestas e brinquedos para famílias.' }
    ],
    suppliers: [
      { id:'sp1', name:'Supermercado Bom Preço', document:'11.222.333/0001-44', category:'Alimentos', contact:'(67) 3521-2255', email:'vendas@bompreco.local', status:'Ativo' },
      { id:'sp2', name:'EletroClima Serviços', document:'22.333.444/0001-55', category:'Manutenção', contact:'(67) 99125-7744', email:'contato@eletroclima.local', status:'Ativo' },
      { id:'sp3', name:'Papelaria Central', document:'33.444.555/0001-66', category:'Materiais', contact:'(67) 3522-1001', email:'atendimento@papelaria.local', status:'Ativo' },
      { id:'sp4', name:'Espaço Celebrare', document:'44.555.666/0001-77', category:'Eventos', contact:'(67) 99810-2222', email:'eventos@celebrare.local', status:'Ativo' },
      { id:'sp5', name:'Energisa MS', document:'15.413.826/0001-50', category:'Utilidades', contact:'0800 722 7272', email:'', status:'Ativo' },
      { id:'sp6', name:'Conecta Telecom', document:'55.666.777/0001-88', category:'Utilidades', contact:'(67) 3521-9090', email:'financeiro@conecta.local', status:'Ativo' }
    ],
    approvals: [
      { id:'ap1', kind:'Conta a pagar', referenceId:'bl1', description:'Pagamento de energia elétrica', amount:1360, requester:'Marcos Oliveira', requestedAt:shift(-1), approver:'Administrador Geral', status:'Aprovado', decidedAt:shift(0), notes:'' },
      { id:'ap2', kind:'Despesa', referenceId:'bl3', description:'Revisão elétrica do templo', amount:2450, requester:'Administrador Geral', requestedAt:shift(0), approver:'Pr. Daniel Souza', status:'Pendente', decidedAt:'', notes:'Aguardando segunda cotação.' },
      { id:'ap3', kind:'Orçamento', referenceId:'b7', description:'Reforço do orçamento de infraestrutura', amount:3500, requester:'Administrador Geral', requestedAt:shift(-2), approver:'Conselho Fiscal', status:'Pendente', decidedAt:'', notes:'' }
    ],
    notifications: [
      { id:'n1', area:'finance', title:'Conta com vencimento próximo', text:'A conta de energia vence em 3 dias.', read:false, date:shift(0) },
      { id:'n2', area:'admin', title:'Novo visitante aguardando contato', text:'Diego Martins possui ação de integração para amanhã.', read:false, date:shift(0) },
      { id:'n3', area:'finance', title:'Aprovação pendente', text:'Há duas solicitações aguardando decisão.', read:false, date:shift(0) },
      { id:'n4', area:'admin', title:'Escala sem confirmação', text:'A escala do Infantil ainda está pendente.', read:true, date:shift(-1) }
    ],
    audit: [
      { id:'au1', user:'Administrador Geral', area:'Sistema', action:'Acessou o sistema', detail:'Sessão de demonstração iniciada', at:new Date().toISOString() },
      { id:'au2', user:'Marcos Oliveira', area:'Financeiro', action:'Registrou uma entrada', detail:'Dízimos do culto de domingo — R$ 4.850,00', at:new Date(Date.now()-1000*60*45).toISOString() },
      { id:'au3', user:'Ana Paula Santos', area:'Administração', action:'Cadastrou um visitante', detail:'Diego Martins', at:new Date(Date.now()-1000*60*60*4).toISOString() }
    ]
  };
})();
