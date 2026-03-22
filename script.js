document.addEventListener('DOMContentLoaded', () => {
    const API_URL = 'http://127.0.0.1:5000';
    let global_access_token = null; 
    let draggedCard = null;
    
    // --- VARIÁVEIS DO POLLING ---
    let pollingInterval = null;
    let isPollingActive = false;

    const ui = {
        auth: document.getElementById('auth-section'),
        loginUser: document.getElementById('login-username'),
        loginPass: document.getElementById('login-password'),
        ticket: document.getElementById('ticket-section'),
        batch: document.getElementById('batch-section'),
        andon: document.getElementById('andon-section'),
        light: document.getElementById('andon-light'),
        statusText: document.getElementById('andon-status-text'),
        pollingLabel: document.getElementById('polling-label'),
        pollingBtn: document.getElementById('polling-btn'),
        logout: document.getElementById('logoutBtn'),
        msg: document.getElementById('message'),
        logCont: document.getElementById('logListContainer'),
        fileInput: document.getElementById('jsonFileInput')
    };

    function showMsg(t, type = 'error') {
        ui.msg.textContent = t; ui.msg.className = `message ${type}`;
        setTimeout(() => ui.msg.className = 'message', 5000);
    }

    async function fetchAPI(end, opt = {}) {
        const headers = { ...opt.headers, 'Content-Type': 'application/json' };
        if (global_access_token) headers['Authorization'] = `Bearer ${global_access_token}`;
        return fetch(`${API_URL}${end}`, { ...opt, headers });
    }

    // --- REGISTRO DE USUÁRIO ---
    const registerBtn = document.getElementById('registerUserBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', async () => {
            const username = document.getElementById('reg-username').value;
            const password = document.getElementById('reg-password').value;

            if (!username || !password) return showMsg("Preencha usuário e senha para registrar.");

            try {
                const res = await fetchAPI('/users/register', { 
                    method: 'POST', 
                    body: JSON.stringify({ username, password }) 
                });
                
                if (res.ok) {
                    showMsg("Usuário registrado com sucesso! Agora faça o Login.", "success");
                    document.getElementById('reg-username').value = '';
                    document.getElementById('reg-password').value = '';
                } else {
                    const data = await res.json();
                    showMsg(data.message || "Erro ao registrar usuário.");
                }
            } catch (e) {
                showMsg("Erro de conexão com o servidor.");
            }
        });
    }

    // --- LOGIN COM SUPORTE AO ENTER ---
    const handleLogin = async () => {
        const username = ui.loginUser.value;
        const password = ui.loginPass.value;
        try {
            const res = await fetchAPI('/auth', { method: 'POST', body: JSON.stringify({ username, password }) });
            const data = await res.json();
            if (res.status === 200) {
                global_access_token = data.access_token;
                ui.auth.style.display = 'none'; 
                ui.ticket.style.display = 'block'; 
                ui.batch.style.display = 'block'; 
                ui.andon.style.display = 'block'; 
                ui.logout.style.display = 'block';
                setupDragAndDrop();
                fetchData(); // Busca inicial de dados
            } else showMsg("Falha no login.");
        } catch (e) { showMsg("Erro de conexão."); }
    };

    if (document.getElementById('loginBtn')) {
        document.getElementById('loginBtn').addEventListener('click', handleLogin);
    }
    if (ui.loginPass) {
        ui.loginPass.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });
    }

    // --- CONTROLE DE POLLING (ON/OFF) ---
    function executePollingTask() {
        const sensors = [{ id: "SENS-01", cpu: Math.random()*100 }, { id: "SENS-02", cpu: Math.random()*100 }];
        sensors.forEach(async (s) => {
            await runAIAnalysis({ device_id: s.id, cpu_usage_pct: s.cpu, mem_available_gb: 4, active_threats: 0, untrusted_processes: 0 });
        });
        fetchData();
    }

    function togglePolling() {
        if (isPollingActive) {
            // DESLIGAR
            clearInterval(pollingInterval);
            isPollingActive = false;
            if (ui.pollingLabel) {
                ui.pollingLabel.textContent = "Polling: Desativado";
                ui.pollingLabel.style.color = "var(--text-secondary)";
            }
            if (ui.pollingBtn) {
                ui.pollingBtn.textContent = "Ativar Polling";
                ui.pollingBtn.style.backgroundColor = "var(--accent-blue)";
            }
        } else {
            // LIGAR
            executePollingTask(); // Roda uma vez imediatamente
            pollingInterval = setInterval(executePollingTask, 60000); // Roda a cada 60s
            isPollingActive = true;
            if (ui.pollingLabel) {
                ui.pollingLabel.textContent = "Polling: Ativado (60s)";
                ui.pollingLabel.style.color = "var(--accent-green)";
            }
            if (ui.pollingBtn) {
                ui.pollingBtn.textContent = "Desativar Polling";
                ui.pollingBtn.style.backgroundColor = "var(--accent-red)";
            }
        }
    }

    if(ui.pollingBtn) {
        ui.pollingBtn.addEventListener('click', togglePolling);
    }

    // --- DRAG & DROP COM ATUALIZAÇÃO DO BANCO ---
    function setupDragAndDrop() {
        document.querySelectorAll('.ticket-list').forEach(list => {
            list.addEventListener('dragover', (e) => { e.preventDefault(); list.classList.add('drag-over'); });
            list.addEventListener('dragleave', () => list.classList.remove('drag-over'));
            list.addEventListener('drop', async (e) => {
                e.preventDefault();
                list.classList.remove('drag-over');
                if (draggedCard) {
                    const ticketId = draggedCard.id.replace('ticket-', '');
                    
                    // Pega o título limpo, ignorando o número do contador
                    let columnTitle = "Open";
                    const titleEl = list.closest('.ticket-column').querySelector('.column-title');
                    if (titleEl && titleEl.childNodes.length > 0) {
                        columnTitle = titleEl.childNodes[0].textContent.trim();
                    }

                    const statusMap = { "Open": "Open", "In Progress": "In Progress", "Closed": "Closed" };
                    const newStatus = statusMap[columnTitle] || "Open";

                    list.appendChild(draggedCard);

                    try {
                        const response = await fetchAPI(`/tickets/${ticketId}`, { 
                            method: 'PUT', body: JSON.stringify({ status: newStatus }) 
                        });
                        if (response.ok) await fetchData(); 
                        else { showMsg("Erro ao salvar."); fetchData(); }
                    } catch (err) { fetchData(); }
                }
            });
        });
    }

    function createCard(t) {
        const card = document.createElement('div');
        card.className = `ticket-card priority-${t.priority}`;
        card.id = `ticket-${t.id}`;
        card.draggable = true;
        card.innerHTML = `<strong>${t.title}</strong><br><small>Status: ${t.status}</small>`;
        
        card.addEventListener('dragstart', (e) => { 
            draggedCard = card; card.classList.add('dragging'); e.dataTransfer.effectAllowed = 'move';
        });
        card.addEventListener('dragend', () => { card.classList.remove('dragging'); draggedCard = null; });
        return card;
    }

    // --- IA ANALYSIS API CALL ---
    async function runAIAnalysis(data) {
        try {
            const res = await fetchAPI('/api/andon/analyze', { method: 'POST', body: JSON.stringify(data) });
            const result = await res.json();
            if (res.status === 201 && result.data.andon_status >= 1) {
                await fetchAPI('/tickets', {
                    method: 'POST',
                    body: JSON.stringify({
                        title: `[IA] Falha: ${data.device_id}`,
                        description: `Detecção de anomalia. CPU: ${data.cpu_usage_pct}%`,
                        priority: result.data.andon_status === 2 ? "High" : "Middle"
                    })
                });
            }
        } catch (e) { 
            console.error(`Erro IA no dispositivo ${data.device_id}:`, e); 
        }
    }

    // --- REFRESH DATA, ATUALIZAR CONTADORES E RECALCULAR ANDON ---
    async function fetchData() {
        try {
            const [resT, resL] = await Promise.all([fetchAPI('/tickets/list'), fetchAPI('/logs')]);
            const tickets = await resT.json(); 
            const logs = await resL.json();
            
            const cols = { 
                "open": document.getElementById('column-open'), 
                "inprogress": document.getElementById('column-inprogress'), 
                "closed": document.getElementById('column-closed') 
            };
            Object.values(cols).forEach(c => { if (c) c.innerHTML = ''; });

            let currentHighestStatus = 0; 

            if (tickets.data) {
                // FILTROS PARA OS CONTADORES
                const closedTickets = tickets.data.filter(t => t.status === 'Closed');
                const otherTickets = tickets.data.filter(t => t.status !== 'Closed');
                const openTickets = otherTickets.filter(t => t.status === 'Open');
                const inProgressTickets = otherTickets.filter(t => t.status === 'In Progress');

                // ATUALIZA OS BADGES (Contadores) NO HTML
                const countOpenObj = document.getElementById('count-open');
                const countProgObj = document.getElementById('count-inprogress');
                const countClosObj = document.getElementById('count-closed');
                
                if(countOpenObj) countOpenObj.textContent = openTickets.length;
                if(countProgObj) countProgObj.textContent = inProgressTickets.length;
                if(countClosObj) countClosObj.textContent = closedTickets.length;

                // RENDERIZA OS CARDS ABERTOS E EM PROGRESSO E CALCULA O ANDON
                otherTickets.forEach(t => {
                    const colKey = t.status.toLowerCase().replace(/\s+/g, '');
                    if (cols[colKey]) cols[colKey].appendChild(createCard(t));
                    const weight = t.priority === 'High' ? 2 : (t.priority === 'Middle' ? 1 : 0);
                    if (weight > currentHighestStatus) currentHighestStatus = weight;
                });

                // RENDERIZA APENAS OS 5 MAIS RECENTES FECHADOS
                if (cols["closed"]) {
                    closedTickets.slice(0, 5).forEach(t => cols["closed"].appendChild(createCard(t)));
                }
            }

            // ATUALIZA A LUZ DO ANDON
            if (ui.light && ui.statusText) {
                ui.light.className = `andon-light status-${currentHighestStatus}`;
                const labels = { 0: "SISTEMA NORMAL", 1: "ATENÇÃO: RISCO MÉDIO", 2: "PERIGO: ESTADO CRÍTICO" };
                ui.statusText.textContent = labels[currentHighestStatus];
                ui.statusText.style.color = currentHighestStatus === 2 ? "var(--accent-red)" : (currentHighestStatus === 1 ? "var(--accent-yellow)" : "var(--accent-green)");
            }

            // ATUALIZA OS LOGS
            if (ui.logCont) {
                ui.logCont.innerHTML = '';
                if (logs.data) {
                    logs.data.slice().reverse().forEach(l => {
                        const div = document.createElement('div'); div.className = 'log-card';
                        div.innerHTML = `<span><b>${l.action}</b>: ${l.details}</span>`;
                        ui.logCont.appendChild(div);
                    });
                }
            }
        } catch (e) { console.error("Erro Refresh"); }
    }

    // --- PROCESSAMENTO DE LOTE (BLINDADO E ADAPTADO PARA SEU JSON) ---
    const processBtn = document.getElementById('processBatchBtn');
    if (processBtn) {
        processBtn.addEventListener('click', async () => {
            const file = ui.fileInput.files[0];
            if (!file) return showMsg("Selecione um JSON");
            
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const list = JSON.parse(e.target.result);
                    showMsg(`Processando lote com IA...`, "success");
                    ui.fileInput.disabled = true; // Bloqueia o botão enquanto processa
                    
                    for (const item of list) {
                        try {
                            // Navega na estrutura do JSON (item -> metrics)
                            const flatData = {
                                device_id: item.device_id,
                                cpu_usage_pct: item.metrics ? item.metrics.cpu_usage_pct : item.cpu_usage_pct,
                                mem_available_gb: item.metrics ? item.metrics.mem_available_gb : item.mem_available_gb,
                                active_threats: item.metrics ? item.metrics.active_threats : item.active_threats,
                                untrusted_processes: item.metrics ? item.metrics.untrusted_processes : item.untrusted_processes
                            };
                            await runAIAnalysis(flatData);
                        } catch (innerErr) {
                            console.error("Falha ao processar item específico", innerErr);
                        }
                    }
                } catch (err) {
                    showMsg("Erro ao ler o formato do JSON");
                } finally {
                    // Roda sempre, atualizando a interface
                    ui.fileInput.value = ""; 
                    ui.fileInput.disabled = false;
                    await fetchData(); 
                    showMsg("Processamento Delta concluído!", "success");
                }
            };
            reader.readAsText(file);
        });
    }

    // --- CRIAÇÃO DE TICKET MANUAL ---
    const registerTicketBtn = document.getElementById('registerTicketBtn');
    if (registerTicketBtn) {
        registerTicketBtn.addEventListener('click', async () => {
            const title = document.getElementById('ticketTitle').value;
            const description = document.getElementById('ticketDescription').value;
            const priority = document.getElementById('ticketPriority').value;

            if (!title || !description || !priority) return showMsg('Preencha todos os campos do Ticket');

            try {
                const res = await fetchAPI('/tickets', {
                    method: 'POST',
                    body: JSON.stringify({ title, description, priority })
                });

                if (res.status === 201) {
                    document.getElementById('ticketTitle').value = '';
                    document.getElementById('ticketDescription').value = '';
                    document.getElementById('ticketPriority').value = '';
                    fetchData();
                    showMsg("Ticket criado com sucesso!", "success");
                } else {
                    showMsg('Erro ao criar ticket');
                }
            } catch (e) {
                showMsg('Erro de conexão');
            }
        });
    }

    if (ui.logout) {
        ui.logout.addEventListener('click', () => location.reload());
    }
});