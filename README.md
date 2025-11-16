# MVP Sistema de Tickets - Frontend (SPA Puro)

## Objetivo
Implementação da Single Page Application (SPA) utilizando apenas HTML, CSS e JavaScript, conforme o requisito de **não utilizar frameworks** (React, Vue, Angular).

## Arquitetura (SOLID e Segurança)
O sistema atua como cliente, chamando a API (http://127.0.0.1:5000), e aplica o Princípio da Responsabilidade Única (SRP) e o fluxo de segurança **JWT**:

`index.html`: Estrutura (HTML).
`style.css`: Apresentação (Estilo).
`script.js`: Comportamento (Lógica e Fetch API).

O `script.js` implementa o fluxo de autenticação:
1.  Chama `POST /auth` (login) ou `POST /users/register` (registro).
2.  Armazena o `access_token` (JWT).
3.  Envia o token no *Header* `Authorization: Bearer <token>` em todas as chamadas de API subsequentes (para `/tickets` e `/logs`), cumprindo os requisitos de API "Stateless" e "Segura".

## Instruções de Inicialização

O Frontend atende ao requisito mais restrito: **Não exige servidor local ou dependências adicionais.**

1.  Garantir o Backend: Certifique-se de que o servidor Flask (`backend-mvp/`) esteja rodando em `http://127.0.0.1:5000`.
2.  Abrir a Aplicação:
    * Abra o arquivo `index.html` diretamente no seu navegador (ex: clicando duas vezes no arquivo).