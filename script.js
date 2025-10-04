document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS DO DOM ---
    const fileLoader = document.getElementById('file-loader');
    const saveButton = document.getElementById('save-button');
    const newCaseButton = document.getElementById('new-case-button');
    const tabsContainer = document.getElementById('tabs-container');
    const contentContainer = document.getElementById('content-container');
    const toggleArchivedButton = document.getElementById('toggle-archived-button');
    const archivedList = document.getElementById('archived-list');

    const caseTabTemplate = document.getElementById('case-tab-template');
    const caseContentTemplate = document.getElementById('case-content-template');
    const csFilesModal = document.getElementById('cs-files-modal');
    const modalCloseButton = document.querySelector('.modal-close-button');
    const csFilesList = document.getElementById('cs-files-list');
    const downloadCsFilesButton = document.getElementById('download-cs-files-button');

    // --- ESTADO DA APLICAÇÃO ---
    let cases = [];
    let activeCaseId = null;
    let currentFileName = '';
    const converter = new showdown.Converter({ simpleLineBreaks: true });

    // --- INICIALIZAÇÃO ---
    function init() {
        addEventListeners();
        render();
        renderCurrentFileName();
    }

    // --- EVENT LISTENERS ---
    function addEventListeners() {
        fileLoader.addEventListener('change', handleFileLoad);
        saveButton.addEventListener('click', handleFileSave);
        newCaseButton.addEventListener('click', createNewCase);
        toggleArchivedButton.addEventListener('click', toggleArchivedView);
        modalCloseButton.addEventListener('click', closeCsFilesModal);

        csFilesModal.addEventListener('click', (event) => {
            if (event.target === csFilesModal) { // Fecha se clicar fora do conteúdo
                closeCsFilesModal();
            }
        });

        // Delegação de eventos para elementos dinâmicos
        tabsContainer.addEventListener('click', handleTabClick);
        archivedList.addEventListener('click', handleUnarchive);
        contentContainer.addEventListener('input', handleContentChange);
        contentContainer.addEventListener('click', handleContentClick);

        const togglePostLiveButton = document.getElementById('toggle-post-live-button');
        const postLiveList = document.getElementById('post-live-list');
        togglePostLiveButton.addEventListener('click', togglePostLiveView);
        postLiveList.addEventListener('click', handleUnpostLive);

        const togglePendingTasksButton = document.getElementById('toggle-pending-tasks-button');
        const pendingTasksModal = document.getElementById('pending-tasks-modal');
        const pendingTasksModalCloseButton = pendingTasksModal.querySelector('.modal-close-button');

        togglePendingTasksButton.addEventListener('click', () => {
            pendingTasksModal.classList.remove('hidden');
        });

        pendingTasksModalCloseButton.addEventListener('click', () => {
            pendingTasksModal.classList.add('hidden');
        });

        pendingTasksModal.addEventListener('click', (event) => {
            if (event.target === pendingTasksModal) {
                pendingTasksModal.classList.add('hidden');
            }
        });

        const pendingTasksList = document.getElementById('pending-tasks-list');
        pendingTasksList.addEventListener('click', handlePendingTaskClick);
    }

    // --- MANIPULAÇÃO DE ARQUIVOS ---
    function handleFileLoad(event) {
        const file = event.target.files[0];
        if (!file) return;
        currentFileName = file.name;
        renderCurrentFileName();

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);

                if (!Array.isArray(data)) {
                    throw new Error("O arquivo de dados não contém um array JSON válido.");
                }

                data.forEach(caseItem => {
                    if (!caseItem.id) caseItem.id = Date.now().toString() + Math.random();
                    if (!caseItem.diary) caseItem.diary = [];
                    if (!caseItem.checklist) caseItem.checklist = [];
                    if (!caseItem.csFiles) caseItem.csFiles = [];
                    if (!caseItem.tags) caseItem.tags = [];
                    if (!caseItem.isPostLive) caseItem.isPostLive = false;
                    if (!caseItem.isContentAutomated) caseItem.isContentAutomated = false;

                    caseItem.diary.forEach(entry => {
                        if (!entry.id) entry.id = Date.now().toString() + Math.random();
                    });
                    caseItem.checklist.forEach(task => {
                        if (!task.id) task.id = Date.now().toString() + Math.random();
                    });
                    caseItem.csFiles.forEach(file => {
                        if (!file.id) file.id = Date.now().toString() + Math.random();
                    });
                });

                cases = data;
                activeCaseId = cases.find(c => !c.isArchived)?.id || null;
                render();
            } catch (error) {
                console.error('Erro ao carregar o arquivo:', error);
                alert('Arquivo de casos inválido ou corrompido.');
            }
        };
        reader.readAsText(file);
    }

    function handleFileSave() {
        const dataStr = JSON.stringify(cases, null, 2);
        const blob = new Blob([dataStr], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const timestamp = `${year}-${month}-${day}_${hours}-${minutes}`;
        a.download = `baseDeCasos_${timestamp}.txt`;
        currentFileName = a.download;
        renderCurrentFileName();
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function handleCsFilesDownload() {
        const activeCase = getActiveCase();
        if (!activeCase) return;

        const selectedColumns = Array.from(csFilesModal.querySelectorAll('.cs-column-checkbox:checked')).map(box => box.value);

        if (selectedColumns.length === 0) {
            alert("Selecione pelo menos uma coluna para exportar.");
            return;
        }

        let fileContent = '';

        activeCase.csFiles.forEach(file => {
            const line1Parts = [];
            // Constrói a primeira linha dinamicamente
            if (selectedColumns.includes('nome')) line1Parts.push(file.nome || '');
            if (selectedColumns.includes('profile')) line1Parts.push(file.profile || '');
            if (selectedColumns.includes('collection')) line1Parts.push(file.collection || '');
            if (selectedColumns.includes('productId')) line1Parts.push(file.productId || '');

            if (line1Parts.length > 0) {
                fileContent += line1Parts.join(' - ') + '\n';
            }

            // Adiciona a URL na linha seguinte, se selecionada
            if (selectedColumns.includes('url')) {
                fileContent += (file.url || '') + '\n';
            }

            // Adiciona uma linha em branco como separador, se houver algum conteúdo
            if (line1Parts.length > 0 || selectedColumns.includes('url')) {
                fileContent += '\n';
            }
        });

        const blob = new Blob([fileContent.trim()], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `CS_Files_Caso_${activeCase.number || ''}.txt`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // --- LÓGICA DE RENDERIZAÇÃO E MODAL ---
    function openCsFilesModal() {
        const activeCase = getActiveCase();
        if (!activeCase) return;

        csFilesList.innerHTML = ''; // Limpa o conteúdo anterior do modal

        // Cria a área de seleção de colunas
        const columnSelector = document.createElement('div');
        columnSelector.id = 'cs-column-selector';
        columnSelector.innerHTML = `
            <strong>Colunas para exportar:</strong>
            <div>
                <label><input type="checkbox" class="cs-column-checkbox" value="nome" checked> Nome</label>
                <label><input type="checkbox" class="cs-column-checkbox" value="url" checked> URL</label>
                <label><input type="checkbox" class="cs-column-checkbox" value="profile" checked> Profile</label>
                <label><input type="checkbox" class="cs-column-checkbox" value="collection" checked> Collection</label>
                <label><input type="checkbox" class="cs-column-checkbox" value="productId" checked> Product ID</label>
            </div>
        `;

        // Cria o botão de download
        const modalFooter = document.createElement('div');
        modalFooter.className = 'modal-footer';
        const downloadButton = document.createElement('button');
        downloadButton.id = 'download-cs-files-button';
        downloadButton.textContent = 'Download .txt dos Selecionados';
        downloadButton.addEventListener('click', handleCsFilesDownload);
        modalFooter.appendChild(downloadButton);

        csFilesList.appendChild(columnSelector);
        csFilesList.appendChild(modalFooter);

        // Cria e exibe a tabela de visualização
        if (activeCase.csFiles.length > 0) {
            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>URL</th>
                        <th>Profile</th>
                        <th>Collection</th>
                        <th>Product ID</th>
                    </tr>
                </thead>
                <tbody></tbody>
            `;
            const tbody = table.querySelector('tbody');
            activeCase.csFiles.forEach(file => {
                const row = tbody.insertRow();
                row.innerHTML = `
                    <td>${file.nome || ''}</td>
                    <td>${file.url || ''}</td>
                    <td>${file.profile || ''}</td>
                    <td>${file.collection || ''}</td>
                    <td>${file.productId || ''}</td>
                `;
            });
            // Insere a tabela antes do rodapé
            csFilesList.insertBefore(table, modalFooter);
        } else {
            const noFilesMessage = document.createElement('p');
            noFilesMessage.textContent = 'Nenhum CS File registrado para este caso.';
            csFilesList.insertBefore(noFilesMessage, modalFooter);
        }

        csFilesModal.classList.remove('hidden');
    }

    function closeCsFilesModal() {
        csFilesModal.classList.add('hidden');
    }

    function render() {
        renderTabs();
        renderActiveCaseContent();
        renderArchivedList();
        renderPostLiveList();
        renderPendingTasks();
    }

    function renderTabs() {
        tabsContainer.querySelectorAll('.tab').forEach(tab => tab.remove());
        const visibleCases = cases.filter(c => !c.isArchived && !c.isPostLive);
        visibleCases.forEach(caseData => {
            const tabNode = caseTabTemplate.content.cloneNode(true);
            const tabButton = tabNode.querySelector('.tab');
            let tabHTML = `<span>${caseData.number || 'Novo Caso'}</span>`;
            if (caseData.isSpecialProject) tabHTML += ' <span class="sp-tag">SP</span>';
            if (caseData.canLaunchSooner) {
                tabHTML += ' <span class="cls-tag">CLS</span>';
            }
            if (caseData.launchDate) {
                try {
                    const date = new Date(caseData.launchDate);
                    if (!isNaN(date.getTime())) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);

                        const launchDate = new Date(date);
                        launchDate.setHours(0, 0, 0, 0);

                        let dateClass = 'date-future';

                        if (launchDate.getTime() < today.getTime()) {
                            dateClass = 'date-past';
                        } else if (launchDate.getTime() === today.getTime()) {
                            dateClass = 'date-today';
                        } else if (launchDate.getTime() === today.getTime() + 86400000) {
                            dateClass = 'date-tomorrow';
                        }

                        const day = String(date.getDate()).padStart(2, '0');
                        const month = String(date.getMonth() + 1).padStart(2, '0');
                        tabHTML += ` <span class="date-tag ${dateClass}">(${day}/${month})</span>`;
                    }
                } catch (e) { console.error("Data inválida:", caseData.launchDate); }
            }
            tabButton.innerHTML = tabHTML;
            tabButton.dataset.caseId = caseData.id;
            if (caseData.id === activeCaseId) tabButton.classList.add('active');
            if (caseData.isReopened) tabButton.classList.add('reopened');
            tabsContainer.appendChild(tabButton);
        });
    }

    function renderActiveCaseContent() {
        contentContainer.innerHTML = '';
        const activeCase = getActiveCase();
        if (!activeCase) {
            contentContainer.innerHTML = `<div class="welcome-message"><h2>Bem-vindo!</h2><p>Crie um novo caso ou carregue um arquivo.</p></div>`;
            return;
        }
        const contentNode = caseContentTemplate.content.cloneNode(true);
        const caseContentDiv = contentNode.querySelector('.case-content');
        if (activeCase.isPostLive) {
            caseContentDiv.classList.add('post-live-case');
        }
        if (activeCase.isArchived) {
            caseContentDiv.classList.add('archived-case');
        }
        contentNode.querySelector('.case-title-input').value = activeCase.title;
        contentNode.querySelector('.case-number-input').value = activeCase.number;
        contentNode.querySelector('.case-launch-date-input').value = activeCase.launchDate;
        contentNode.querySelector('.special-project-checkbox').checked = activeCase.isSpecialProject;
        contentNode.querySelector('.can-launch-sooner-checkbox').checked = activeCase.canLaunchSooner;
        contentNode.querySelector('.content-automated-checkbox').checked = activeCase.isContentAutomated;
        contentNode.querySelector('.post-live-checkbox').checked = activeCase.isPostLive;

        const tagsContainer = contentNode.querySelector('.tags-container');
        if (activeCase.isContentAutomated) {
            const mapexTag = document.createElement('span');
            mapexTag.className = 'tag mapex-tag';
            mapexTag.textContent = 'Mapex';
            tagsContainer.appendChild(mapexTag);
        }
        if (activeCase.tags) {
            activeCase.tags.forEach(tag => {
                const tagElement = document.createElement('span');
                tagElement.className = 'tag';
                tagElement.textContent = tag;
                const removeButton = document.createElement('button');
                removeButton.className = 'remove-tag-button';
                removeButton.textContent = 'x';
                removeButton.dataset.tag = tag;
                tagElement.appendChild(removeButton);
                tagsContainer.appendChild(tagElement);
            });
        }

        const diaryEntriesContainer = contentNode.querySelector('.diary-entries');
        activeCase.diary.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'diary-entry';
            const entryDate = new Date(entry.timestamp).toLocaleString('pt-BR');
            entryDiv.innerHTML = `<div class="diary-entry-header"><div class="timestamp">${entryDate}</div><div class="diary-actions"><button class="edit-diary-button" data-diary-id="${entry.id}">Editar</button><button class="delete-diary-button" data-diary-id="${entry.id}">Excluir</button></div></div><div class="diary-text-content">${converter.makeHtml(entry.text)}</div>`;
            diaryEntriesContainer.appendChild(entryDiv);
        });
        const checklistItemsContainer = contentNode.querySelector('.checklist-items');
        activeCase.checklist.forEach(item => {
            const itemLi = document.createElement('li');
            itemLi.className = 'checklist-item';
            if(item.isDone) itemLi.classList.add('done');
            itemLi.innerHTML = `<input type="checkbox" data-task-id="${item.id}" ${item.isDone ? 'checked' : ''}><label class="checklist-label">${item.text}</label><div class="checklist-actions"><button class="edit-task-button" data-task-id="${item.id}">Editar</button><button class="delete-task-button" data-task-id="${item.id}">Excluir</button></div>`;
            checklistItemsContainer.appendChild(itemLi);
        });
        contentContainer.appendChild(contentNode);
    }

    function renderArchivedList() {
        archivedList.querySelectorAll('button').forEach(btn => btn.remove());
        const archivedCases = cases.filter(c => c.isArchived);
        archivedCases.forEach(caseData => {
            const button = document.createElement('button');
            button.textContent = caseData.number || 'Caso Arquivado';
            button.dataset.caseId = caseData.id;
            if (caseData.id === activeCaseId) {
                button.classList.add('active');
            }
            archivedList.appendChild(button);
        });
    }

    // --- AÇÕES DO USUÁRIO ---
    function createNewCase() {
        const newCase = {
            id: Date.now().toString(),
            title: 'Novo Caso',
            number: '',
            launchDate: '',
            isSpecialProject: false,
            canLaunchSooner: false,
            isArchived: false,
            isReopened: false,
            isPostLive: false,
            isContentAutomated: false,
            diary: [],
            checklist: [],
            csFiles: [],
            tags: []
        };
        cases.unshift(newCase);
        activeCaseId = newCase.id;
        render();
    }

    function handleTabClick(event) {
        const tab = event.target.closest('.tab');
        if (tab) {
            activeCaseId = tab.dataset.caseId;
            render();
        }
    }

    function handleUnarchive(event) {
        const button = event.target.closest('button');
        if (button) {
            activeCaseId = button.dataset.caseId;
            render();
        }
    }

    function toggleArchivedView() {
        archivedList.classList.toggle('hidden');
    }

    function handleContentChange(event) {
        const activeCase = getActiveCase();
        if (!activeCase) return;
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        if (target.matches('.case-title-input')) activeCase.title = value;
        if (target.matches('.case-number-input')) activeCase.number = value;
        if (target.matches('.case-launch-date-input')) activeCase.launchDate = value;
        if (target.matches('.special-project-checkbox')) activeCase.isSpecialProject = value;
        if (target.matches('.can-launch-sooner-checkbox')) activeCase.canLaunchSooner = value;
        if (target.matches('.content-automated-checkbox')) {
            activeCase.isContentAutomated = value;
            renderActiveCaseContent();
        }
        if (target.matches('.post-live-checkbox')) {
            activeCase.isPostLive = value;
            if (value) {
                activeCaseId = cases.find(c => !c.isArchived && !c.isPostLive)?.id || null;
            }
            render();
        }
        if (target.matches('.case-number-input') || target.matches('.special-project-checkbox') || target.matches('.case-launch-date-input') || target.matches('.can-launch-sooner-checkbox')) {
            renderTabs();
        }
    }

    function handleContentClick(event) {
        if (event.target.matches('.copy-case-number-button-content')) {
            const caseContent = event.target.closest('.case-content');
            if (caseContent) {
                const caseNumberInput = caseContent.querySelector('.case-number-input');
                if (caseNumberInput && caseNumberInput.value) {
                    navigator.clipboard.writeText(caseNumberInput.value).catch(err => {
                        console.error('Erro ao copiar o número do caso: ', err);
                    });
                }
            }
            return;
        }

        const activeCase = getActiveCase();
        if (!activeCase) return;
        const target = event.target;

        // --- Ações de Tags ---
        if (target.matches('.add-tag-button')) {
            const tagInput = contentContainer.querySelector('.tag-input');
            if (tagInput.value.trim()) {
                if (!activeCase.tags) {
                    activeCase.tags = [];
                }
                activeCase.tags.push(tagInput.value.trim());
                tagInput.value = '';
                renderActiveCaseContent();
            }
        }

        if (target.matches('.remove-tag-button')) {
            const tagToRemove = target.dataset.tag;
            if (activeCase.tags) {
                activeCase.tags = activeCase.tags.filter(tag => tag !== tagToRemove);
                renderActiveCaseContent();
            }
        }

        // --- Ações de CS Files ---
        if (target.matches('.add-cs-file-button')) {
            const nomeInput = contentContainer.querySelector('.cs-file-nome');
            const urlInput = contentContainer.querySelector('.cs-file-url');
            const profileInput = contentContainer.querySelector('.cs-file-profile');
            const collectionInput = contentContainer.querySelector('.cs-file-collection');
            const productIdInput = contentContainer.querySelector('.cs-file-product-id');

            if (nomeInput.value.trim()) {
                activeCase.csFiles.unshift({ 
                    id: Date.now().toString(), 
                    nome: nomeInput.value.trim(), 
                    url: urlInput.value.trim(), 
                    profile: profileInput.value.trim(),
                    collection: collectionInput.value.trim(),
                    productId: productIdInput.value.trim()
                });
                nomeInput.value = '';
                urlInput.value = '';
                profileInput.value = '';
                collectionInput.value = '';
                productIdInput.value = '';
                alert('CS File adicionado!');
            }
        }

        if (target.matches('.view-cs-files-button')) {
            openCsFilesModal();
        }

        // --- Ações do Diário ---
        if (target.matches('.add-diary-button')) {
            const textarea = contentContainer.querySelector('.diary-input-area textarea');
            if (textarea.value.trim()) {
                activeCase.diary.unshift({ id: Date.now().toString(), text: textarea.value, timestamp: new Date().toISOString() });
                textarea.value = '';
                renderActiveCaseContent();
            }
        }
        if (target.matches('.edit-diary-button')) {
            const diaryId = target.dataset.diaryId;
            const entry = activeCase.diary.find(e => e.id === diaryId);
            if (entry) {
                const entryDiv = target.closest('.diary-entry');
                const textContentDiv = entryDiv.querySelector('.diary-text-content');
                
                textContentDiv.innerHTML = `
                    <textarea class="edit-diary-textarea" style="width: 100%; height: 150px;">${entry.text}</textarea>
                    <div class="edit-diary-actions" style="margin-top: 0.5rem;">
                        <button class="save-diary-button" data-diary-id="${diaryId}">Salvar</button>
                        <button class="cancel-diary-button" data-diary-id="${diaryId}">Cancelar</button>
                    </div>
                `;
            }
        }

        if (target.matches('.save-diary-button')) {
            const diaryId = target.dataset.diaryId;
            const entry = activeCase.diary.find(e => e.id === diaryId);
            if (entry) {
                const entryDiv = target.closest('.diary-entry');
                const textarea = entryDiv.querySelector('.edit-diary-textarea');
                entry.text = textarea.value;
                renderActiveCaseContent();
            }
        }

        if (target.matches('.cancel-diary-button')) {
            renderActiveCaseContent();
        }
        if (target.matches('.delete-diary-button')) {
            const diaryId = target.dataset.diaryId;
            if (confirm('Tem certeza que deseja excluir esta entrada do diário?')) {
                activeCase.diary = activeCase.diary.filter(e => e.id !== diaryId);
                renderActiveCaseContent();
            }
        }

        // --- Ações da Checklist ---
        if (target.matches('.add-checklist-button')) {
            const input = contentContainer.querySelector('.checklist-input-area input');
            if (input.value.trim()) {
                activeCase.checklist.unshift({ id: Date.now().toString(), text: input.value, isDone: false });
                input.value = '';
                renderActiveCaseContent();
            }
        }
        if (target.matches('.checklist-item input[type="checkbox"]')) {
            const taskId = target.dataset.taskId;
            const task = activeCase.checklist.find(t => t.id === taskId);
            if (task) { task.isDone = target.checked; renderActiveCaseContent(); }
        }
        if (target.matches('.edit-task-button')) {
            const taskId = target.dataset.taskId;
            const task = activeCase.checklist.find(t => t.id === taskId);
            if (task) {
                const itemLi = target.closest('.checklist-item');
                const label = itemLi.querySelector('.checklist-label');
                label.innerHTML = `
                    <input type="text" class="edit-task-input" value="${task.text}" style="width: 100%;">
                    <div class="edit-task-actions" style="margin-top: 0.5rem;">
                        <button class="save-task-button" data-task-id="${taskId}">Salvar</button>
                        <button class="cancel-task-button" data-task-id="${taskId}">Cancelar</button>
                    </div>
                `;
            }
        }

        if (target.matches('.save-task-button')) {
            const taskId = target.dataset.taskId;
            const task = activeCase.checklist.find(t => t.id === taskId);
            if (task) {
                const itemLi = target.closest('.checklist-item');
                const input = itemLi.querySelector('.edit-task-input');
                task.text = input.value;
                renderActiveCaseContent();
            }
        }

        if (target.matches('.cancel-task-button')) {
            renderActiveCaseContent();
        }
        if (target.matches('.delete-task-button')) {
            const taskId = target.dataset.taskId;
            if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                activeCase.checklist = activeCase.checklist.filter(t => t.id !== taskId);
                renderActiveCaseContent();
            }
        }

        // --- Ações do Caso ---
        if (target.matches('.archive-case-button')) {
            activeCase.isArchived = true;
            activeCaseId = cases.find(c => !c.isArchived)?.id || null;
            render();
        }
    }

    // --- FUNÇÕES AUXILIARES ---
    function getCaseById(id) {
        return cases.find(c => c.id === id);
    }

    function getActiveCase() {
        return getCaseById(activeCaseId);
    }

    function renderPostLiveList() {
        const postLiveList = document.getElementById('post-live-list');
        postLiveList.querySelectorAll('button').forEach(btn => btn.remove());
        const postLiveCases = cases.filter(c => c.isPostLive);
        postLiveCases.forEach(caseData => {
            const button = document.createElement('button');
            button.textContent = caseData.number || 'Caso Post-live';
            button.dataset.caseId = caseData.id;
            if (caseData.id === activeCaseId) {
                button.classList.add('active');
            }
            postLiveList.appendChild(button);
        });
    }

    function togglePostLiveView() {
        const postLiveList = document.getElementById('post-live-list');
        postLiveList.classList.toggle('hidden');
    }

    function handleUnpostLive(event) {
        const button = event.target.closest('button');
        if (button) {
            activeCaseId = button.dataset.caseId;
            render();
        }
    }

    function renderPendingTasks() {
        const pendingTasksList = document.getElementById('pending-tasks-list');
        pendingTasksList.innerHTML = '';

        cases.forEach(caseData => {
            if (caseData.checklist) {
                caseData.checklist.forEach(task => {
                    if (!task.isDone) {
                        const taskElement = document.createElement('div');
                        taskElement.className = 'pending-task-item';
                        taskElement.innerHTML = `
                            <a href="#" class="case-number-for-task" data-case-id="${caseData.id}">${caseData.number || 'N/A'}</a>
                            <span class="task-text">${task.text}</span>
                        `;
                        pendingTasksList.appendChild(taskElement);
                    }
                });
            }
        });
    }

    function handlePendingTaskClick(event) {
        if (event.target.matches('.case-number-for-task')) {
            event.preventDefault();
            const caseId = event.target.dataset.caseId;
            const caseToView = getCaseById(caseId);

            if (caseToView) {
                activeCaseId = caseId;
                // Close the modal
                const pendingTasksModal = document.getElementById('pending-tasks-modal');
                pendingTasksModal.classList.add('hidden');
                render();
            }
        }
    }

    function renderCurrentFileName() {
        const fileNameElement = document.getElementById('current-file-name');
        if (fileNameElement) {
            fileNameElement.textContent = currentFileName;
        }
    }

    // --- INICIA A APLICAÇÃO ---
    init();
});
