// Aguarda o DOM carregar
document.addEventListener('DOMContentLoaded', () => {
    
    // Deixamos a inicialização dos ícones aqui, mas
    // a movemos para o final do HTML para garantir
    
    const API_URL = 'http://127.0.0.1:5000';
    
    let global_access_token = null; 

    const authSection = document.getElementById('auth-section');
    const ticketSection = document.getElementById('ticket-section');
    
    // Container principal do board (onde as colunas estão)
    const boardContainer = document.querySelector('.ticket-board-container');
    // Container de logs
    const logListContainer = document.getElementById('logListContainer');
    const messageDisplay = document.getElementById('message');
    
    const registerUserBtn = document.getElementById('registerUserBtn');
    const loginBtn = document.getElementById('loginBtn');
    const registerTicketBtn = document.getElementById('registerTicketBtn');

    // ADICIONADO: Seletores para Login com Enter e Logout
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

    registerUserBtn.addEventListener('click', async () => {
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;

        if (!username || !password) {
            showMessage("Novo Usuário e Nova Senha são obrigatórios.", "error");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/users/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            const data = await response.json();

            if (response.status === 201) {
                showMessage(`Usuário '${username}' criado! Agora faça o login.`, 'success');
            } else {
                showMessage(`Erro ${response.status}: ${data.message || data.error}`, 'error');
            }
        } catch (error) {
            showMessage('Erro de rede ao registrar. Backend está rodando?', 'error');
        }
    });

    loginBtn.addEventListener('click', async () => {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            showMessage("Usuário e Senha são obrigatórios para o login.", "error");
            return;
        }

        try {
            const response = await fetch(`${API_URL}/auth`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
            });
            
            const data = await response.json();

            if (response.status === 200) {
                showMessage(`Login de '${username}' bem-sucedido!`, 'success');
                global_access_token = data.access_token; // <--- ARMAZENA O TOKEN
                
                // Esconde a autenticação e mostra a criação de tickets
                authSection.style.display = 'none';
                ticketSection.style.display = 'block';
                logoutBtn.style.display = 'block'; // Mostra o botão de logout

                // Carrega os dados protegidos
                fetchAndRenderTickets();
                fetchAndRenderLogs();
            } else {
                showMessage(`Erro ${response.status}: ${data.message || data.error}`, 'error');
                global_access_token = null;
            }
        } catch (error) {
            showMessage('Erro de rede ao logar. Backend está rodando?', 'error');
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

    // Wrapper para chamadas protegidas
    async function fetchProtected(endpoint, options = {}) {
        if (!global_access_token) {
            showMessage("Erro fatal: Token de acesso não encontrado.", "error");
            throw new Error("Token não encontrado");
        }

        // Adiciona o Header de Autorização Bearer
        const headers = {
            ...options.headers,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${global_access_token}`
        };

        return fetch(`${API_URL}${endpoint}`, { ...options, headers });
    }

    // Função para criar o elemento do card (reutilizável)
    function createTicketCardElement(ticket) {
        const ticketCard = document.createElement('div');
        ticketCard.className = `ticket-card priority-${ticket.priority}`; 
        ticketCard.id = `ticket-${ticket.id}`;
        ticketCard.draggable = true; // Torna o card arrastável

        // O 'creator' agora é um objeto aninhado
        const creatorName = ticket.creator ? ticket.creator.username : 'Desconhecido';

        ticketCard.innerHTML = `
            <div class="details">
                <p><strong>${ticket.title}</strong> (Prioridade: ${ticket.priority})</p>
                <p>Status: ${ticket.status}</p>
                <p><small>Criador: ${creatorName}</small></p>
            </div>
            <button data-id="${ticket.id}" class="delete-btn">Fechar (X)</button>
        `;
        return ticketCard;
    }

    async function fetchAndRenderTickets() {
        const columnAberto = document.getElementById('column-aberto');
        
        try {
            const response = await fetchProtected('/tickets/list');
            const data = await response.json();

            // Limpa todas as colunas (para o caso de recarregar)
            document.querySelectorAll('.ticket-list').forEach(col => col.innerHTML = '');

            if (response.status === 200 && data.data && data.data.length > 0) {
                data.data.forEach(ticket => {
                    const ticketCard = createTicketCardElement(ticket);
                    
                    // Lógica para colocar o card na coluna certa
                    if(ticket.status === 'Aberto') {
                         document.getElementById('column-aberto').appendChild(ticketCard);
                    } else if (ticket.status === 'Em Análise') {
                         document.getElementById('column-analise').appendChild(ticketCard);
                    } else if (ticket.status === 'Fechado') {
                         document.getElementById('column-fechado').appendChild(ticketCard);
                    } else {
                         document.getElementById('column-aberto').appendChild(ticketCard); // Padrão
                    }
                });
            } else if (response.status === 200 && (!data.data || data.data.length === 0)) {
                 // 200 OK com lista vazia (corrigido no backend)
                 columnAberto.innerHTML = '<p>Nenhum ticket cadastrado.</p>';
            } else {
                 showMessage(data.message || 'Erro ao buscar tickets.', 'error');
            }
        } catch (error) {
            showMessage(`Erro de conexão ao buscar tickets.`, 'error');
            console.error('Fetch Tickets Error:', error);
        }
    }

    async function fetchAndRenderLogs() {
        try {
            const response = await fetchProtected('/logs');
            const data = await response.json();

            logListContainer.innerHTML = '';
            // Os logs agora estão dentro de 'data'
            if (response.status === 200 && data.data && data.data.length > 0) {
                data.data.forEach(log => {
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
        } catch (error) {
            logListContainer.innerHTML = `<p class="error">Erro ao carregar logs.</p>`;
            console.error('Fetch Logs Error:', error);
        }
    }


    registerTicketBtn.addEventListener('click', async () => {
        const title = document.getElementById('ticketTitle').value;
        const description = document.getElementById('ticketDescription').value;
        const priority = document.getElementById('ticketPriority').value;
        
        if (!title || !description) {
            showMessage("Título e Descrição são obrigatórios.", "error");
            return;
        }

        try {
            // *** CORREÇÃO CRÍTICA ***
            // O 'user_id' foi REMOVIDO do body. O backend agora pega 
            // o ID do usuário direto do Token JWT.
            const body = { title, description, priority };

            const response = await fetchProtected('/tickets', {
                method: 'POST',
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.status === 201) {
                showMessage(`Ticket criado com sucesso!`, 'success');
                clearTicketFormFields(); // Limpa o formulário
                
                // Adiciona o novo card diretamente na coluna "Aberto"
                const newTicket = data.data; // O ticket está em 'data'
                const ticketCard = createTicketCardElement(newTicket);
                document.getElementById('column-aberto').appendChild(ticketCard);

                fetchAndRenderLogs(); // Atualiza o relatório de logs
            } else {
                showMessage(`Erro ${response.status}: ${data.details || data.message || data.error}`, 'error');
            }
        } catch (error) {
            showMessage('Erro de rede ao cadastrar. Verifique o console.', 'error');
        }
    });

    boardContainer.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const ticketId = event.target.dataset.id;
            
            // Confirmação
            if (!confirm(`Tem certeza que deseja deletar o ticket ${ticketId.substring(0, 8)}...?`)) {
                return;
            }
            
            try {
                const response = await fetchProtected(`/tickets/${ticketId}`, {
                    method: 'DELETE',
                });

                if (response.status === 200) {
                    showMessage(`Ticket ${ticketId.substring(0, 8)}... deletado.`, 'success');
                    document.getElementById(`ticket-${ticketId}`).remove();
                    fetchAndRenderLogs(); // Atualiza o relatório de logs
                } else {
                    const data = await response.json();
                    showMessage(`Erro ${response.status}: ${data.details || data.message || data.error}`, 'error');
                }
            } catch (error) {
                showMessage('Erro de rede ao deletar. Verifique o console.', 'error');
            }
        }
    });

    // --- Lógica de Drag-and-Drop (Ainda é um MOCK VISUAL) ---
    // Esta parte apenas move o card na tela.
    // Para salvar a mudança de status, precisaríamos de uma rota PATCH /tickets/<id>
    
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
            event.preventDefault(); 
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

                // ATUALIZA O STATUS MOCK (somente visual)
                const statusElement = card.querySelector('.details p:nth-child(2)');
                const newStatus = column.parentElement.querySelector('.column-title').textContent;
                if(statusElement) {
                    statusElement.textContent = `Status: ${newStatus}`;
                }

                // TODO: Chamar fetchProtected(`/tickets/${cardId}`, { method: 'PATCH', ... })
                // para salvar o novo status no backend.
                showMessage(`(Mock) Status do ${cardId.substring(0,8)}... mudou para ${newStatus}`, 'success');
            }
        });
    });

});