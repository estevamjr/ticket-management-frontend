// Aguarda o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    
    // REMOVIDO: 'lucide.createIcons();' para evitar quebra do script
    
    let global_access_token = null; 

    // MOCK: Simulação de um banco de dados local
    let MOCK_DB = {
        users: [
            { id: 1, username: 'admin', password: '123' }
        ],
        tickets: [
            { id: 't1_mock', title: 'Ticket de Exemplo (Alta)', description: '...', priority: 'Alta', status: 'Open', creator_username: 'admin' },
            { id: 't2_mock', title: 'Ticket de Exemplo (Baixa)', description: '...', priority: 'Baixa', status: 'Open', creator_username: 'admin' }
        ],
        logs: [
            { id: 'l1_mock', action: 'START', details: 'Sistema mockado iniciado.', timestamp: new Date().toISOString() }
        ],
        currentUser: null // Armazena quem está logado
    };

    // --- Seletores do DOM ---
    const authSection = document.getElementById('auth-section');
    const ticketSection = document.getElementById('ticket-section');
    
    // MODIFICADO: Container de tickets agora é a coluna "Open"
    const ticketListContainer = document.getElementById('column-Open'); 
    
    const logListContainer = document.getElementById('logListContainer');
    const messageDisplay = document.getElementById('message');
    
    const registerUserBtn = document.getElementById('registerUserBtn');
    const loginBtn = document.getElementById('loginBtn');
    const registerTicketBtn = document.getElementById('registerTicketBtn');

    // ADICIONADO: Seletores para Login com Enter e Logout
    const loginPasswordInput = document.getElementById('login-password');
    const logoutBtn = document.getElementById('logoutBtn');

    // --- Funções Auxiliares ---

    function showMessage(text, type = 'error') {
        messageDisplay.textContent = text;
        messageDisplay.className = 'message'; 
        messageDisplay.classList.add(type);
    }
    
    function clearTicketFormFields() {
        document.getElementById('ticketTitle').value = '';
        document.getElementById('ticketDescription').value = '';
        document.getElementById('ticketPriority').value = 'Baixa';
    }

    // --- Lógica de Autenticação (Mock) ---

    registerUserBtn.addEventListener('click', () => {
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;

        if (!username || !password) {
            showMessage("Novo Usuário e Nova Senha são obrigatórios.", "error");
            return;
        }

        if (MOCK_DB.users.find(u => u.username === username)) {
            showMessage(`Erro 409: Usuário '${username}' já existe.`, 'error');
        } else {
            const newUser = { id: MOCK_DB.users.length + 1, username, password };
            MOCK_DB.users.push(newUser);
            showMessage(`Usuário '${username}' criado! Agora faça o login.`, 'success');
            console.log("Mock DB (Usuários):", MOCK_DB.users);
        }
    });

    loginBtn.addEventListener('click', () => {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            showMessage("Usuário e Senha são obrigatórios para o login.", "error");
            return;
        }

        const user = MOCK_DB.users.find(u => u.username === username && u.password === password);

        if (user) {
            showMessage(`Login (Mock) de '${username}' bem-sucedido!`, 'success');
            global_access_token = `mock-token-for-${username}`;
            MOCK_DB.currentUser = user; 
            
            MOCK_DB.logs.push({
                id: `l${MOCK_DB.logs.length + 1}_mock`,
                action: 'LOGIN',
                details: `Usuário '${username}' logou.`,
                timestamp: new Date().toISOString()
            });

            authSection.style.display = 'none';
            ticketSection.style.display = 'block';
            logoutBtn.style.display = 'block'; // ADICIONADO: Mostra botão de logout

            fetchAndRenderTickets();
            fetchAndRenderLogs();
        } else {
            showMessage(`Erro 401: Usuário ou senha inválidos.`, 'error');
            global_access_token = null;
            MOCK_DB.currentUser = null;
        }
    });

    // ADICIONADO: Login com "Enter"
    loginPasswordInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            loginBtn.click();
        }
    });

    // ADICIONADO: Logout
    logoutBtn.addEventListener('click', () => {
        location.reload(); // Simplesmente recarrega a página para o estado inicial
    });


    // --- Lógica de Tickets (Mock) ---

    // MODIFICADO: Renderiza os tickets na coluna "Open"
    function fetchAndRenderTickets() {
        if (!global_access_token) {
            showMessage("Erro fatal: Token de acesso não encontrado.", "error");
            return;
        }
        
        ticketListContainer.innerHTML = ''; // Limpa o "Aguardando login..."
        
        const tickets = MOCK_DB.tickets;

        if (tickets && tickets.length > 0) {
            tickets.forEach(ticket => {
                // Re-usa a função de criar card para adicionar os tickets existentes
                const ticketCard = createTicketCardElement(ticket);
                ticketListContainer.appendChild(ticketCard);
            });
        } else {
            ticketListContainer.innerHTML = '<p>Nenhum ticket cadastrado.</p>';
        }
    }

    // ADICIONADO: Função separada para criar o elemento do card
    function createTicketCardElement(ticket) {
        const ticketCard = document.createElement('div');
        ticketCard.className = `ticket-card priority-${ticket.priority}`; 
        ticketCard.id = `ticket-${ticket.id}`;
        ticketCard.draggable = true; // ADICIONADO: Torna o card arrastável

        ticketCard.innerHTML = `
            <div class="details">
                <p><strong>${ticket.title}</strong> (Prioridade: ${ticket.priority})</p>
                <p>Status: ${ticket.status}</p>
                <p><small>Criador: ${ticket.creator_username || 'Desconhecido'}</small></p>
            </div>
            <button data-id="${ticket.id}" class="delete-btn">Fechar (X)</button>
        `;
        return ticketCard;
    }

    registerTicketBtn.addEventListener('click', () => {
        if (!global_access_token || !MOCK_DB.currentUser) {
            showMessage("Você precisa estar logado para criar tickets.", "error");
            return;
        }
        
        const title = document.getElementById('ticketTitle').value;
        const description = document.getElementById('ticketDescription').value;
        const priority = document.getElementById('ticketPriority').value;

        if (!title || !description) {
            showMessage("Título e Descrição são obrigatórios.", "error");
            return;
        }

        const newTicket = {
            id: `t${MOCK_DB.tickets.length + 1}_mock_${Date.now()}`,
            title: title,
            description: description,
            priority: priority,
            status: 'Open', // Novos tickets sempre começam como "Open"
            creator_username: MOCK_DB.currentUser.username
        };
        MOCK_DB.tickets.push(newTicket); // Salva no "banco" mock

        MOCK_DB.logs.push({
            id: `l${MOCK_DB.logs.length + 1}_mock`,
            action: 'CREATE_TICKET',
            details: `Ticket '${title}' (ID: ${newTicket.id.substring(0, 8)}...) criado.`,
            timestamp: new Date().toISOString()
        });

        // MODIFICADO: Adiciona o novo ticket direto na coluna "Open"
        const ticketCard = createTicketCardElement(newTicket);
        ticketListContainer.appendChild(ticketCard);

        showMessage(`Ticket criado com sucesso!`, 'success');
        clearTicketFormFields(); 
        fetchAndRenderLogs(); // Apenas atualiza os logs
    });

    // MODIFICADO: A deleção agora é escutada no container do board
    const boardContainer = document.querySelector('.ticket-board-container');
    boardContainer.addEventListener('click', (event) => {
        if (event.target.classList.contains('delete-btn')) {
            if (!global_access_token) {
                showMessage("Você precisa estar logado para deletar tickets.", "error");
                return;
            }
            
            const ticketId = event.target.dataset.id;
            
            const ticketIndex = MOCK_DB.tickets.findIndex(t => t.id === ticketId);
            
            if (ticketIndex > -1) {
                const deletedTicket = MOCK_DB.tickets.splice(ticketIndex, 1)[0];
                
                MOCK_DB.logs.push({
                    id: `l${MOCK_DB.logs.length + 1}_mock`,
                    action: 'DELETE_TICKET',
                    details: `Ticket '${deletedTicket.title}' (ID: ${ticketId.substring(0, 8)}...) deletado.`,
                    timestamp: new Date().toISOString()
                });

                showMessage(`Ticket ${ticketId.substring(0, 8)}... deletado.`, 'success');
                document.getElementById(`ticket-${ticketId}`).remove(); // Remove da tela
                fetchAndRenderLogs(); // Atualiza o relatório de logs
            } else {
                 showMessage(`Erro: Ticket ${ticketId} não encontrado no Mock DB.`, 'error');
            }
        }
    });


    // --- Lógica de Logs (Mock) ---

    function fetchAndRenderLogs() {
        if (!global_access_token) return; 

        logListContainer.innerHTML = '';
        const logs = [...MOCK_DB.logs].reverse();

        if (logs && logs.length > 0) {
            logs.forEach(log => {
                const logCard = document.createElement('div');
                logCard.className = 'log-card';
                const timestamp = new Date(log.timestamp).toLocaleString('pt-BR');
                
                logCard.innerHTML = `
                    <div>
                        <span class="action">${log.action}</span>
                        <span class="details">${log.details}</span>
                    </div>
                    <span class="timestamp">${timestamp}</span>
                `;
                logListContainer.appendChild(logCard);
            });
        } else {
            logListContainer.innerHTML = '<p>Nenhum log de atividade encontrado.</p>';
        }
    }

    // --- ADICIONADO: Lógica de Drag-and-Drop ---
    
    let draggedCard = null; // Variável para guardar o card sendo arrastado

    // Escuta o início do arraste em qualquer card dentro do board
    boardContainer.addEventListener('dragstart', (event) => {
        if (event.target.classList.contains('ticket-card')) {
            draggedCard = event.target;
            event.target.classList.add('dragging');
            // Guarda o ID para o 'drop'
            event.dataTransfer.setData('text/plain', event.target.id);
        }
    });

    // Escuta o fim do arraste (se soltou ou cancelou)
    boardContainer.addEventListener('dragend', (event) => {
        if (draggedCard) {
            draggedCard.classList.remove('dragging');
            draggedCard = null;
        }
    });

    // Escuta as colunas
    const columns = document.querySelectorAll('.ticket-list');
    columns.forEach(column => {
        // Quando um card passa por cima da coluna
        column.addEventListener('dragover', (event) => {
            event.preventDefault(); // ESSENCIAL: Permite o 'drop'
            column.classList.add('drag-over');
        });

        // Quando o card sai de cima da coluna
        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });

        // Quando o card é solto (drop) na coluna
        column.addEventListener('drop', (event) => {
            event.preventDefault();
            column.classList.remove('drag-over');
            
            // Pega o card que está sendo arrastado (que guardamos no 'dragstart')
            const cardId = event.dataTransfer.getData('text/plain');
           const card = document.getElementById(cardId);
            
            if (card) {
                column.appendChild(card); // Move o card para a nova coluna

                // ATUALIZA O STATUS MOCK (somente visual)
                const statusElement = card.querySelector('.details p:nth-child(2)');
                const newStatus = column.parentElement.querySelector('.column-title').textContent;
                if(statusElement) {
                    statusElement.textContent = `Status: ${newStatus}`;
                }

                // (Aqui, na versão final, você faria o fetch PATCH para o backend)
            }
        });
    });

});