document.addEventListener('DOMContentLoaded', () => {
    
    const API_URL = 'http://127.0.0.1:5000';
    
    let global_access_token = null; 

    const authSection = document.getElementById('auth-section');
    const ticketSection = document.getElementById('ticket-section');
    
    const boardContainer = document.querySelector('.ticket-board-container');
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

    registerUserBtn.addEventListener('click', async () => {
        const username = document.getElementById('reg-username').value;
        const password = document.getElementById('reg-password').value;

        if (!username || !password) {
            showMessage("New user and Password are required for registration.", "error");
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
                showMessage(`User '${username}' registered successfully! You can now log in.`, 'success');
            } else {
                showMessage(`error ${response.status}: ${data.message || data.error}`, 'error');
            }
        } catch (error) {
            showMessage('error connecting to register. Please contact local Support?', 'error');
        }
    });

    loginBtn.addEventListener('click', async () => {
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;

        if (!username || !password) {
            showMessage("User and Password are required to log in.", "error");
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
                showMessage(`Login successful! Welcome, ${username}.`, 'success');
                global_access_token = data.access_token;
                authSection.style.display = 'none';
                ticketSection.style.display = 'block';
                logoutBtn.style.display = 'block';
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

    loginPasswordInput.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') {
            loginBtn.click();
        }
    });

    logoutBtn.addEventListener('click', () => {
        location.reload(); 
    });

    async function fetchProtected(endpoint, options = {}) {
        if (!global_access_token) {
            showMessage("Fatal Error: Access token is missing. Please log in again.", "error");
            throw new Error("Token does not exist");
        }

        const headers = {
            ...options.headers,
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${global_access_token}`
        };

        return fetch(`${API_URL}${endpoint}`, { ...options, headers });
    }

    function createTicketCardElement(ticket) {
        const ticketCard = document.createElement('div');
        ticketCard.className = `ticket-card priority-${ticket.priority}`; 
        ticketCard.id = `ticket-${ticket.id}`;
        ticketCard.draggable = true; 
        const creatorName = ticket.creator ? ticket.creator.username : 'Unknown';

        ticketCard.innerHTML = `
            <div class="details">
                <p><strong>${ticket.title}</strong> (Prioridade: ${ticket.priority})</p>
                <p>Status: ${ticket.status}</p>
                <p><small>Criador: ${creatorName}</small></p>
            </div>
            <button data-id="${ticket.id}" class="delete-btn">Close (X)</button>
        `;
        return ticketCard;
    }

    async function fetchAndRenderTickets() {
        const columnOpen = document.getElementById('column-Open');
        
        try {
            const response = await fetchProtected('/tickets/list');
            const data = await response.json();
            document.querySelectorAll('.ticket-list').forEach(col => col.innerHTML = '');

            if (response.status === 200 && data.data && data.data.length > 0) {
                data.data.forEach(ticket => {
                    const ticketCard = createTicketCardElement(ticket);
                    
                    if(ticket.status === 'Open') {
                         document.getElementById('column-open').appendChild(ticketCard);
                    } else if (ticket.status === 'In Progress') {
                         document.getElementById('column-inprogress').appendChild(ticketCard);
                    } else if (ticket.status === 'Closed') {
                         document.getElementById('column-closed').appendChild(ticketCard);
                    } else {
                         document.getElementById('column-open').appendChild(ticketCard);
                    }
                });
            } else if (response.status === 200 && (!data.data || data.data.length === 0)) {
                 document.getElementById('column-open').innerHTML = '<p>No tickets available.</p>';
            } else {
                 showMessage(data.message || 'Error fetching tickets.', 'error');
            }
        } catch (error) {
            showMessage(`Connection error while fetching tickets.`, 'error');
            console.error('Fetch Tickets Error:', error);
        }
    }

    async function fetchAndRenderLogs() {
        try {
            const response = await fetchProtected('/logs');
            const data = await response.json();

            logListContainer.innerHTML = '';
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
                logListContainer.innerHTML = '<p>No logs available.</p>';
            }
        } catch (error) {
            logListContainer.innerHTML = `<p class="error">Error when fetching logs.</p>`;
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
            
            const body = { title, description, priority };

            const response = await fetchProtected('/tickets', {
                method: 'POST',
                body: JSON.stringify(body),
            });

            const data = await response.json();

            if (response.status === 201) {
                showMessage(`Ticket created successfully with ID ${data.data.id.substring(0, 8)}...`, 'success');
                clearTicketFormFields(); 
                const newTicket = data.data;
                const ticketCard = createTicketCardElement(newTicket);
                document.getElementById('column-open').appendChild(ticketCard);

                fetchAndRenderLogs(); 
            } else {
                showMessage(`Errr ${response.status}: ${data.details || data.message || data.error}`, 'error');
            }
        } catch (error) {
            showMessage('Network error while creating ticket. Check console.', 'error');
        }
    });

    boardContainer.addEventListener('click', async (event) => {
        if (event.target.classList.contains('delete-btn')) {
            const ticketId = event.target.dataset.id;
            
            if (!confirm(`Did you really want to close ticket ${ticketId.substring(0, 8)}...? This action cannot be undone.`)) {
                return;
            }
            
            try {
                const response = await fetchProtected(`/tickets/${ticketId}`, {
                    method: 'DELETE',
                });

                if (response.status === 200) {
                    showMessage(`Ticket ${ticketId.substring(0, 8)}... deletado.`, 'success');
                    document.getElementById(`ticket-${ticketId}`).remove();
                    fetchAndRenderLogs();
                } else {
                    const data = await response.json();
                    showMessage(`Erro ${response.status}: ${data.details || data.message || data.error}`, 'error');
                }
            } catch (error) {
                showMessage('Erro de rede ao deletar. Verifique o console.', 'error');
            }
        }
    });
    
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

                const statusElement = card.querySelector('.details p:nth-child(2)');
                const newStatus = column.parentElement.querySelector('.column-title').textContent;
                if(statusElement) {
                    statusElement.textContent = `Status: ${newStatus}`;
                }

                showMessage(`The status of ticket ${cardId.substring(7, 15)}... has been updated to '${newStatus}'.`, 'success');
            }
        });
    });

});