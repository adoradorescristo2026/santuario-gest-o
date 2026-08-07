# Servidor Online — Santuário Gestão

Este serviço é o ponto central de sincronização dos aplicativos desktop.

## Segurança
- O servidor exige um token Bearer.
- O conteúdo da base é criptografado no computador com AES-256-GCM antes de sair do `.exe`.
- O servidor não recebe a chave de criptografia e armazena somente o payload cifrado.
- Em produção, publique este serviço atrás de HTTPS.

## Variáveis
`SANTUARIO_SYNC_TOKEN` é obrigatória e deve ter pelo menos 20 caracteres.
`DATA_DIR` deve apontar para um disco persistente do servidor.

## Teste local
Windows PowerShell:

```powershell
$env:SANTUARIO_SYNC_TOKEN="uma-chave-de-servidor-bem-longa"
npm start
```

Depois use no aplicativo: `http://IP-DO-SERVIDOR:8787`.
Para computadores em redes diferentes, hospede este diretório em um servidor/VPS/plataforma Node com HTTPS e armazenamento persistente.
