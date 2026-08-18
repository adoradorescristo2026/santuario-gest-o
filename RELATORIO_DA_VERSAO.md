# Santuário Gestão Desktop 1.4.0

- Adaptador nativo InfinitePay Checkout para PIX/crédito online.
- Conferência de pagamento via `payment_check` antes de registrar a venda.
- Ponte local InfiniteTap para débito/crédito no celular usando deeplink oficial e retorno por rede local.
- Hub genérico TEF/API HTTP para integração futura com outras adquirentes.
- Dados de NSU, autorização, bandeira e comprovante vinculados à venda e ao comprovante interno.
- Tela de verificação atualizada para exibir a situação real das integrações.

## V1.4.0 — Sincronização online entre computadores

- Cliente desktop conectado a servidor central configurável.
- Sincronização automática da base `santuarioGestaoV3Data`.
- Criptografia ponta a ponta AES-256-GCM antes do envio.
- Token do servidor e chave de criptografia protegidos pelo Windows/Electron.
- Controle de revisão e mesclagem de três vias para reduzir perda em alterações simultâneas.
- Nova aba **Administração → Configurações → Sincronização online**.
- Servidor Node.js independente incluído na pasta `online-server/`.


## V1.3.4 — Operações persistentes e alertas
- Sincronização entre a janela principal e a janela separada do Caixa por IPC + armazenamento compartilhado.
- Painel de operações abertas na tela "Tesouraria e Caixa" para Tesouraria Interna, Externa e caixas físicos.
- Navegação entre departamentos não fecha a janela nem a operação do Caixa.
- Retorno a departamentos minimiza a janela do Caixa e preserva a sessão.
- Alertas configuráveis de abertura, fechamento, fechamento forçado e falta.
- E-mail real via SMTP/Nodemailer e SMS real via Twilio REST API.
- Seleção de destinatários e canais por usuário ativo.
- Segredos dos provedores de notificação protegidos via Electron safeStorage.


## V1.4.2 — Sessão independente por computador
- Corrigido o reload automático da janela principal ao receber atualização online.
- A igreja/ministério/departamento/tela atual permanece local a cada computador.
- Atualizações remotas renovam os dados em memória e renderizam a tela atual sem redirecionamento.
- Caixa continua recebendo atualização dedicada.
