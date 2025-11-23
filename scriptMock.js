document.addEventListener('DOMContentLoaded', () => {
    
    
    let global_access_token = null; 

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
        currentUser: null 
    };

    const authSection = document.getElementById('auth-section');
    const ticketSection = document.getElementById('ticket-section');
    
    const ticketListContainer = document.getElementById('column-Open'); 
    
    const logListContainer = document.getElementById('logListContainer');
    const messageDisplay = document.getElementById('message');
    
    const registerUserBtn = document.getElementById('registerUserBtn');
    const loginBtn = document.getElementById('loginBtn');
    const registerTicketBtn = document.getElementById('registerTicketBtn');

    const loginPasswordInput = document.getElementById('login-password');
    const logoutBtn = document.getElementById('logoutBtn');

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
            logoutBtn.style.display = 'block';

            fetchAndRenderTickets();
            fetchAndRenderLogs();
        } else {
            showMessage(`Erro 401: Usuário ou senha inválidos.`, 'error');
            global_access_token = null;
            MOCK_DB.currentUser = null;
        }
    });

    loginPasswordInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            loginBtn.click();
        }
    });

    logoutBtn.addEventListener('click', () => {
        location.reload(); 
    });


    function fetchAndRenderTickets() {
        if (!global_access_token) {
            showMessage("Erro fatal: Token de acesso não encontrado.", "error");
            return;
        }
        
        ticketListContainer.innerHTML = ''; 
        
        const tickets = MOCK_DB.tickets;

        if (tickets && tickets.length > 0) {
            tickets.forEach(ticket => {
                const ticketCard = createTicketCardElement(ticket);
                ticketListContainer.appendChild(ticketCard);
            });
        } else {
            ticketListContainer.innerHTML = '<p>Nenhum ticket cadastrado.</p>';
        }
    }

    function createTicketCardElement(ticket) {
        const ticketCard = document.createElement('div');
        ticketCard.className = `ticket-card priority-${ticket.priority}`; 
        ticketCard.id = `ticket-${ticket.id}`;
        ticketCard.draggable = true; 

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
            status: 'Open', 
            creator_username: MOCK_DB.currentUser.username
        };
        MOCK_DB.tickets.push(newTicket); 

        MOCK_DB.logs.push({
            id: `l${MOCK_DB.logs.length + 1}_mock`,
            action: 'CREATE_TICKET',
            details: `Ticket '${title}' (ID: ${newTicket.id.substring(0, 8)}...) criado.`,
            timestamp: new Date().toISOString()
        });

        const ticketCard = createTicketCardElement(newTicket);
        ticketListContainer.appendChild(ticketCard);

        showMessage(`Ticket criado com sucesso!`, 'success');
        clearTicketFormFields(); 
        fetchAndRenderLogs(); // 
    });

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
                document.getElementById(`ticket-${ticketId}`).remove(); 
                fetchAndRenderLogs(); 
            } else {
                 showMessage(`Erro: Ticket ${ticketId} não encontrado no Mock DB.`, 'error');
            }
        }
    });


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

   
    let draggedCard = null; 

    boardContainer.addEventListener('dragstart', (event) => {
        if (event.target.classList.contains('ticket-card')) {
            draggedCard = event.target;
            event.target.classList.add('dragging');
            event.dataTransfer.setData('text/plain', event.target.id);
        }
    });

    boardContainer.addEventListener('dragend', (event) => {
        if (draggedCard) {
            draggedCard.classList.remove('dragging');
            draggedCard = null;
        }
    });

    const columns = document.querySelectorAll('.ticket-list');
    columns.forEach(column => {
        column.addEventListener('dragover', (event) => {
            event.preventDefault(); // ESSENCIAL: Permite o 'drop'
            column.classList.add('drag-over');
        });

        column.addEventListener('dragleave', () => {
            column.classList.remove('drag-over');
        });

        column.addEventListener('drop', (event) => {
            event.preventDefault();
            column.classList.remove('drag-over');
            
            const cardId = event.dataTransfer.getData('text/plain');
           const card = document.getElementById(cardId);
            
            if (card) {
                column.appendChild(card); 
                const statusElement = card.querySelector('.details p:nth-child(2)');
                const newStatus = column.parentElement.querySelector('.column-title').textContent;
                if(statusElement) {
                    statusElement.textContent = `Status: ${newStatus}`;
                }

            }
        });
    });

});