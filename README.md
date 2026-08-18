# Santuário Gestão Web + Sincronização V1.4.3

Esta pasta substitui a pasta `online-server` já publicada no Railway.

## Variáveis do Railway
- `SANTUARIO_SYNC_TOKEN`: mantenha o MESMO token já configurado.
- `DATA_DIR=/data`: mantenha como está.
- O Volume deve continuar montado em `/data`.

## Depois do deploy
Acesse o domínio público do Railway. A página principal passa a abrir o Santuário Gestão Web.

No primeiro acesso de cada navegador:
1. Entre no sistema local.
2. Vá em Administração > Configurações > Sincronização online.
3. Ative a sincronização.
4. Servidor: o próprio domínio Railway (preenchido automaticamente quando possível).
5. Espaço: `santuario-principal` (ou o código que já usa).
6. Token: o MESMO `SANTUARIO_SYNC_TOKEN`.
7. Chave: a MESMA chave de criptografia usada nos computadores desktop.
8. Clique em `Atualizar agora` para baixar a base central.

A versão web e a versão desktop usam o mesmo formato criptografado AES-256-GCM com chave derivada por scrypt, portanto compartilham a mesma base existente.
