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
    const modalCloseButton = csFilesModal.querySelector('.modal-close-button');
    const csFilesList = document.getElementById('cs-files-list');

    const searchModal = document.getElementById('search-modal');
    const searchCasesButton = document.getElementById('search-cases-button');
    const searchModalCloseButton = searchModal.querySelector('.modal-close-button');
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const resetSearchButton = document.getElementById('reset-search-button');
    const searchResultsContainer = document.getElementById('search-results');
    const searchCaseContentContainer = document.getElementById('search-case-content-container');

    // --- ESTADO DA APLICAÇÃO ---
    let cases = [];
    let activeCaseId = null;
    let currentFileName = '';
    let draggedTab = null;
    const caseStatusGroups = [
        { number: 1, statuses: ['New'] },
        { number: 2, statuses: ['Developer Assigned'] },
        { number: 3, statuses: ['Work in Progress'] },
        { number: 4, statuses: ['Peer Review', 'Send for QA', 'QA Approved'] },
        { number: 5, statuses: ['Send for Review'] },
        { number: 6, statuses: ['Approved'] },
        { number: 7, statuses: ['Launched'] },
        { number: 8, statuses: ['Verified', 'Denorm', 'Edits Needed', 'Escalated', 'Globalization Completed', 'Globalization Started', 'Need More info'] },
        { number: 9, statuses: ['Closed', 'Rejected'] }
    ];
    const caseStatuses = caseStatusGroups.flatMap(group => group.statuses);
    const statusesWithoutNumber = [
        'Send for QA', 'QA Approved', 'Denorm', 'Edits Needed', 'Escalated',
        'Globalization Completed', 'Globalization Started', 'Need More info', 'Rejected'
    ];

    // --- INICIALIZAÇÃO ---
    function init() {
        addEventListeners();
        document.getElementById('pending-tasks-container').classList.remove('hidden');
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
            handleCsFilesModalClick(event);
        });

        // Delegação de eventos para elementos dinâmicos
        tabsContainer.addEventListener('click', handleTabClick);
        tabsContainer.addEventListener('dragstart', handleDragStart);
        tabsContainer.addEventListener('dragover', handleDragOver);
        tabsContainer.addEventListener('drop', handleDrop);
        tabsContainer.addEventListener('dragend', handleDragEnd);
        archivedList.addEventListener('click', handleUnarchive);
        contentContainer.addEventListener('input', handleContentChange);
        contentContainer.addEventListener('click', handleContentClick);
        contentContainer.addEventListener('change', handleColorChange);

        const togglePostLiveButton = document.getElementById('toggle-post-live-button');
        const postLiveList = document.getElementById('post-live-list');
        togglePostLiveButton.addEventListener('click', togglePostLiveView);
        postLiveList.addEventListener('click', handleUnpostLive);





        const pendingTasksList = document.getElementById('pending-tasks-list');
        pendingTasksList.addEventListener('click', handlePendingTaskClick);

        // Event Listeners da Pesquisa
        searchCasesButton.addEventListener('click', openSearchModal);
        searchModalCloseButton.addEventListener('click', closeSearchModal);
        searchButton.addEventListener('click', performSearch);
        resetSearchButton.addEventListener('click', resetSearch);
        searchInput.addEventListener('keyup', (event) => {
            if (event.key === 'Enter') {
                performSearch();
            }
        });
        searchResultsContainer.addEventListener('click', handleSearchResultClick);

        searchModal.addEventListener('click', (event) => {
            if (event.target === searchModal) {
                closeSearchModal();
            }
        });

        window.addEventListener('resize', () => {
            const titleInputs = document.querySelectorAll('.case-title-input');
            titleInputs.forEach(input => adjustTitleFontSize(input));
        });
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
                    if (!caseItem.status) caseItem.status = 'New';
                    if (!caseItem.isFavorite) caseItem.isFavorite = false;

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
            if (selectedColumns.includes('nome')) line1Parts.push(file.nome || '');
            if (selectedColumns.includes('profile')) line1Parts.push(file.profile || '');
            if (selectedColumns.includes('collection')) line1Parts.push(file.collection || '');
            if (selectedColumns.includes('productId')) line1Parts.push(file.productId || '');

            if (line1Parts.length > 0) {
                fileContent += line1Parts.join(' - ') + '\n';
            }

            if (selectedColumns.includes('url')) {
                fileContent += (file.url || '') + '\n';
            }

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
    function renderChecklist(activeCase, container) {
        const checklistItemsContainer = container.querySelector('.checklist-items');
        if (!checklistItemsContainer) return;

        checklistItemsContainer.innerHTML = ''; // Clear existing items

        activeCase.checklist.forEach(item => {
            const itemLi = document.createElement('li');
            itemLi.className = 'checklist-item';
            if(item.isDone) itemLi.classList.add('done');
            itemLi.innerHTML = `<input type="checkbox" data-task-id="${item.id}" ${item.isDone ? 'checked' : ''}><label class="checklist-label">${item.text}</label><div class="checklist-actions"><button class="edit-task-button" data-task-id="${item.id}">Editar</button><button class="delete-task-button" data-task-id="${item.id}">Excluir</button></div>`;
            checklistItemsContainer.appendChild(itemLi);
        });
    }

    function renderTags(activeCase, container) {
        const tagsContainer = container.querySelector('.tags-container');
        if (!tagsContainer) return;

        tagsContainer.innerHTML = ''; // Clear existing tags

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
    }

    function renderCsFilesList(activeCase) {
        csFilesList.innerHTML = ''; // Clear previous content

        const columnSelector = document.createElement('div');
        columnSelector.id = 'cs-column-selector';
        columnSelector.innerHTML = `
            <strong>Colunas para exportar:</strong>
            <div class="cs-column-selector-row">
                <label><input type="checkbox" class="cs-column-checkbox" value="nome" checked> Nome</label>
                <label><input type="checkbox" class="cs-column-checkbox" value="url" checked> URL</label>
                <label><input type="checkbox" class="cs-column-checkbox" value="profile" checked> Profile</label>
                <label><input type="checkbox" class="cs-column-checkbox" value="collection" checked> Collection</label>
                <label><input type="checkbox" class="cs-column-checkbox" value="productId" checked> Product ID</label>
            </div>
        `;

        const downloadButton = document.createElement('button');
        downloadButton.id = 'download-cs-files-button';
        downloadButton.textContent = 'Download .txt dos Selecionados';
        downloadButton.addEventListener('click', handleCsFilesDownload);
        columnSelector.querySelector('.cs-column-selector-row').appendChild(downloadButton);

        csFilesList.appendChild(columnSelector);

        const listHeader = document.createElement('div');
        listHeader.className = 'cs-files-list-header';
        const title = document.createElement('h3');
        title.textContent = 'CS Files Registrados';
        listHeader.appendChild(title);
        csFilesList.appendChild(listHeader);
        
        if (activeCase.csFiles.length > 0) {
            const table = document.createElement('table');
            table.innerHTML = `
                <thead>
                    <tr>
                        <th class="cs-actions-header"></th>
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
                row.dataset.csFileId = file.id;
                row.innerHTML = `
                    <td class="cs-file-actions-cell">
                        <div class="cs-file-actions">
                            <button class="edit-cs-file-button" data-cs-file-id="${file.id}">Editar</button>
                            <button class="delete-cs-file-button" data-cs-file-id="${file.id}">Excluir</button>
                        </div>
                    </td>
                    <td>${file.nome || ''}</td>
                    <td>${file.url || ''}</td>
                    <td>${file.profile || ''}</td>
                    <td>${file.collection || ''}</td>
                    <td>${file.productId || ''}</td>
                `;
            });
            csFilesList.appendChild(table);
        } else {
            const noFilesMessage = document.createElement('p');
            noFilesMessage.textContent = 'Nenhum CS File registrado para este caso.';
            csFilesList.appendChild(noFilesMessage);
        }
    }

    function openCsFilesModal() {
        const activeCase = getActiveCase();
        if (!activeCase) return;

        renderCsFilesList(activeCase);
        csFilesModal.classList.remove('hidden');
    }

    function closeCsFilesModal() {
        csFilesModal.classList.add('hidden');
    }

    function render() {
        renderTabs();
        renderActiveCaseContent(contentContainer, false);
        renderArchivedList();
        renderPostLiveList();
        renderPendingTasks();
    }

    function getStatusLabel(status) {
        let statusLabel = status || 'New';
        if (!statusesWithoutNumber.includes(statusLabel)) {
            const group = caseStatusGroups.find(g => g.statuses.includes(statusLabel));
            if (group) {
                statusLabel = `${group.number}. ${statusLabel}`;
            }
        }
        return statusLabel;
    }

    function renderTabs() {
        tabsContainer.querySelectorAll('.tab').forEach(tab => tab.remove());
        const visibleCases = cases.filter(c => !c.isArchived && !c.isPostLive);
        visibleCases.forEach(caseData => {
            const tabNode = caseTabTemplate.content.cloneNode(true);
            const tabButton = tabNode.querySelector('.tab');
            
            let mainContentHTML = `<span class="case-number-in-tab">${caseData.number || 'Novo Caso'}</span>`;
            if (caseData.isSpecialProject) mainContentHTML += ' <span class="sp-tag">SP</span>';
            if (caseData.canLaunchSooner) {
                mainContentHTML += ' <span class="cls-tag">CLS</span>';
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
                        mainContentHTML += ` <span class="date-tag ${dateClass}">(${day}/${month})</span>`;
                    }
                } catch (e) { console.error("Data inválida:", caseData.launchDate); }
            }

            let statusHTML = '';
            if (caseData.status) {
                statusHTML = `<div class="tab-status">${getStatusLabel(caseData.status)}</div>`;
            }

            tabButton.innerHTML = `<div class="tab-main-content">${mainContentHTML}</div>${statusHTML}`;
            tabButton.dataset.caseId = caseData.id;
            if (caseData.id === activeCaseId) tabButton.classList.add('active');
            if (caseData.isReopened) tabButton.classList.add('reopened');
            tabsContainer.appendChild(tabButton);
        });
    }

    function renderStatusDropdown(activeCase, container) {
        const statusText = container.querySelector('.status-text');
        const statusInfoIcon = container.querySelector('.status-info-icon');
        const statusOptions = container.querySelector('.status-options');

        statusText.textContent = getStatusLabel(activeCase.status);
        statusInfoIcon.classList.toggle('hidden', !activeCase.status);

        statusOptions.innerHTML = '';
        caseStatusGroups.forEach(group => {
            group.statuses.forEach(status => {
                const option = document.createElement('div');
                option.className = 'status-option';
                if (statusesWithoutNumber.includes(status)) {
                    option.textContent = status;
                } else {
                    option.textContent = `${group.number}. ${status}`;
                }
                option.dataset.status = status;
                statusOptions.appendChild(option);
            });
        });
    }

    function renderActiveCaseContent(container = contentContainer, isReadOnly = false) {
        container.innerHTML = '';
        const activeCase = getActiveCase();
        if (!activeCase) {
            container.innerHTML = `<div class="welcome-message"><h2>Bem-vindo!</h2><p>Crie um novo caso ou carregue um arquivo.</p></div>`;
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

        const favoriteButton = contentNode.querySelector('.favorite-case-button');
        if (activeCase.isFavorite) {
            favoriteButton.innerHTML = '&#x2605;'; // ★ - Black Star
            favoriteButton.classList.add('favorited');
        } else {
            favoriteButton.innerHTML = '&#x2606;'; // ☆ - White Star
            favoriteButton.classList.remove('favorited');
        }

        renderStatusDropdown(activeCase, contentNode);
        renderTags(activeCase, contentNode);



        const diaryEntriesContainer = contentNode.querySelector('.diary-entries');
        activeCase.diary.forEach(entry => {
            const entryDiv = document.createElement('div');
            entryDiv.className = 'diary-entry';
            const entryDate = new Date(entry.timestamp).toLocaleString('pt-BR');
            entryDiv.innerHTML = `<div class="diary-entry-header"><div class="timestamp">${entryDate}</div><div class="diary-actions"><button class="edit-diary-button" data-diary-id="${entry.id}">Editar</button><button class="delete-diary-button" data-diary-id="${entry.id}">Excluir</button></div></div><div class="diary-text-content">${entry.text}</div>`;
            diaryEntriesContainer.appendChild(entryDiv);
        });
        renderChecklist(activeCase, contentNode);

        const archiveButton = contentNode.querySelector('.archive-case-button');
        const deleteButton = contentNode.querySelector('.delete-case-button');

        if (activeCase.isArchived) {
            archiveButton.textContent = 'Reativar Caso';
            archiveButton.classList.remove('archive-case-button');
            archiveButton.classList.add('unarchive-case-button');
            deleteButton.classList.remove('hidden');
        } else {
            deleteButton.classList.add('hidden');
        }

        if (isReadOnly) {
            contentNode.querySelectorAll('input, button, [contenteditable]').forEach(el => {
                el.disabled = true;
                el.setAttribute('disabled', 'disabled');
                if(el.hasAttribute('contenteditable')) {
                    el.removeAttribute('contenteditable');
                }
            });
        }

        container.appendChild(contentNode);

        const titleInput = container.querySelector('.case-title-input');
        if (titleInput) {
            adjustTitleFontSize(titleInput);
        }

        // --- Toolbar visibility logic ---
        const diaryToolbar = container.querySelector('.diary-toolbar');
        const diaryEditable = container.querySelector('.diary-editable');

        if (diaryToolbar && diaryEditable) {
            diaryEditable.addEventListener('focus', () => {
                diaryToolbar.classList.remove('hidden');
            });

            diaryEditable.addEventListener('blur', () => {
                diaryToolbar.classList.add('hidden');
            });

            diaryToolbar.addEventListener('mousedown', (event) => {
                event.preventDefault();
            });
        }

        // --- Add tag on Enter key ---
        const tagInput = container.querySelector('.tag-input');
        if (tagInput) {
            tagInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    addTag();
                }
            });
        }

        // --- Add checklist task on Enter key ---
        const checklistInput = container.querySelector('.checklist-input-area input');
        if (checklistInput) {
            checklistInput.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    addChecklistTask();
                }
            });
        }

        updateManageCsFilesButtonCount();
    }

    function renderArchivedList() {
        const h3 = archivedList.querySelector('h3');
        archivedList.innerHTML = '';
        if (h3) archivedList.appendChild(h3);

        const archivedCases = cases.filter(c => c.isArchived);
        archivedCases.forEach(caseData => {
            const button = document.createElement('button');
            button.textContent = caseData.number || 'Caso Arquivado';
            button.dataset.caseId = caseData.id;
            if (caseData.id === activeCaseId) {
                button.classList.add('active');
            }
            if (caseData.isFavorite) {
                button.classList.add('favorite-archived');
            }
            archivedList.appendChild(button);
        });
    }

    // --- AÇÕES DO USUÁRIO ---
    function addChecklistTask() {
        const activeCase = getActiveCase();
        if (!activeCase) return;

        const checklistInput = contentContainer.querySelector('.checklist-input-area input');
        if (checklistInput && checklistInput.value.trim()) {
            activeCase.checklist.unshift({ id: Date.now().toString(), text: checklistInput.value.trim(), isDone: false });
            checklistInput.value = '';
            renderChecklist(activeCase, contentContainer);
            checklistInput.focus();
        }
    }

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
            isFavorite: false,
            diary: [],
            checklist: [],
            csFiles: [],
            tags: [],
            status: 'New'
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

    function handleDragStart(event) {
        if (!event.target.matches('.tab')) return;
        draggedTab = event.target;
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', draggedTab.dataset.caseId);
        setTimeout(() => {
            if (draggedTab) draggedTab.classList.add('dragging');
        }, 0);
    }

    function handleDragOver(event) {
        event.preventDefault();
        const targetTab = event.target.closest('.tab');
        if (targetTab && targetTab !== draggedTab) {
            const rect = targetTab.getBoundingClientRect();
            const isAfter = event.clientX > rect.left + rect.width / 2;
            if (isAfter) {
                targetTab.parentNode.insertBefore(draggedTab, targetTab.nextSibling);
            } else {
                targetTab.parentNode.insertBefore(draggedTab, targetTab);
            }
        }
    }

    function handleDrop(event) {
        event.preventDefault();
        if (draggedTab) {
            const newOrderedIds = [...tabsContainer.querySelectorAll('.tab')].map(tab => tab.dataset.caseId);
            const visibleCases = cases.filter(c => !c.isArchived && !c.isPostLive);
            
            visibleCases.sort((a, b) => {
                return newOrderedIds.indexOf(a.id) - newOrderedIds.indexOf(b.id);
            });

            const otherCases = cases.filter(c => c.isArchived || c.isPostLive);
            cases = [...visibleCases, ...otherCases];
            
            renderTabs();
        }
    }

    function handleDragEnd(event) {
        if (draggedTab) {
            draggedTab.classList.remove('dragging');
        }
        draggedTab = null;
    }

    function toggleArchivedView() {
        archivedList.classList.toggle('hidden');
    }

    function handleCsFilesModalClick(event) {
        const activeCase = getActiveCase();
        if (!activeCase) return;

        const target = event.target;

        if (target.matches('.add-cs-file-button-modal')) {
            const modal = target.closest('#cs-files-modal');
            const nomeInput = modal.querySelector('.cs-file-nome');
            const urlInput = modal.querySelector('.cs-file-url');
            const profileInput = modal.querySelector('.cs-file-profile');
            const collectionInput = modal.querySelector('.cs-file-collection');
            const productIdInput = modal.querySelector('.cs-file-product-id');

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
                
                renderCsFilesList(activeCase);
                updateManageCsFilesButtonCount();
            }
        } else if (target.matches('.delete-cs-file-button')) {
            const csFileId = target.dataset.csFileId;
            if (confirm('Tem certeza que deseja excluir este CS File?')) {
                activeCase.csFiles = activeCase.csFiles.filter(file => file.id !== csFileId);
                renderCsFilesList(activeCase);
                updateManageCsFilesButtonCount();
            }
        } else if (target.matches('.edit-cs-file-button')) {
            const row = target.closest('tr');
            const cells = row.querySelectorAll('td');
            
            // Make cells editable
            for (let i = 1; i < cells.length; i++) {
                cells[i].contentEditable = true;
                cells[i].classList.add('editing');
            }

            // Change buttons
            const actionsCell = cells[0];
            const csFileId = target.dataset.csFileId;
            actionsCell.innerHTML = `
                <div class="cs-file-actions" style="visibility: visible; flex-direction: column;">
                    <button class="save-cs-file-button" data-cs-file-id="${csFileId}">Salvar</button>
                    <button class="cancel-cs-file-button" data-cs-file-id="${csFileId}">Cancelar</button>
                </div>
            `;
            
            cells[1].focus();
        } else if (target.matches('.save-cs-file-button')) {
            const csFileId = target.dataset.csFileId;
            const file = activeCase.csFiles.find(f => f.id === csFileId);
            if (file) {
                const row = target.closest('tr');
                const cells = row.querySelectorAll('td');
                
                file.nome = cells[1].textContent;
                file.url = cells[2].textContent;
                file.profile = cells[3].textContent;
                file.collection = cells[4].textContent;
                file.productId = cells[5].textContent;
                
                renderCsFilesList(activeCase);
            }
        } else if (target.matches('.cancel-cs-file-button')) {
            renderCsFilesList(activeCase);
        }
    }

    function handleContentChange(event) {
        const activeCase = getActiveCase();
        if (!activeCase) return;
        const target = event.target;
        const value = target.type === 'checkbox' ? target.checked : target.value;
        if (target.matches('.case-title-input')) {
            activeCase.title = value;
            adjustTitleFontSize(target);
        }
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

    function handleColorChange(event) {
        if (event.target.matches('.diary-color-input')) {
            applyFormatToDiary('foreColor', event.target.value);
        }
    }

    function addTag() {
        const activeCase = getActiveCase();
        if (!activeCase) return;

        const tagInput = contentContainer.querySelector('.tag-input');
        if (tagInput && tagInput.value.trim()) {
            if (!activeCase.tags) {
                activeCase.tags = [];
            }
            activeCase.tags.push(tagInput.value.trim());
            tagInput.value = '';
            renderTags(activeCase, contentContainer);
            tagInput.focus();
        }
    }

    function handleContentClick(event) {
        const target = event.target;
        const activeCase = getActiveCase();

        if (target.closest('.status-selected')) {
            const statusOptions = target.closest('.status-dropdown').querySelector('.status-options');
            statusOptions.classList.toggle('hidden');
            return;
        }

        if (target.matches('.status-option')) {
            if (activeCase) {
                activeCase.status = target.dataset.status;
                renderActiveCaseContent();
                renderTabs();
            }
            return;
        }

        if (target.matches('.status-info-icon')) {
            const popup = contentContainer.querySelector('.status-info-popup');
            popup.classList.remove('hidden');
            return;
        }

        if (target.matches('.status-info-popup-close-button') || target.matches('.status-info-popup')) {
            const popup = contentContainer.querySelector('.status-info-popup');
            popup.classList.add('hidden');
            return;
        }

        if (target.matches('.favorite-case-button')) {
            if (activeCase) {
                activeCase.isFavorite = !activeCase.isFavorite;
                if (activeCase.isFavorite) {
                    target.innerHTML = '&#x2605;';
                    target.classList.add('favorited');
                } else {
                    target.innerHTML = '&#x2606;';
                    target.classList.remove('favorited');
                }
            }
            return;
        }

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

        if (event.target.matches('.format-button')) {
            applyFormatToDiary(event.target.dataset.format);
            return;
        }

        if (event.target.matches('.manage-cs-files-button')) {
            openCsFilesModal();
            return;
        }

        if (!activeCase) return;

        // --- Ações de Tags ---
        if (target.matches('.add-tag-button')) {
            addTag();
        }

        if (target.matches('.remove-tag-button')) {
            const tagToRemove = target.dataset.tag;
            if (activeCase.tags) {
                activeCase.tags = activeCase.tags.filter(tag => tag !== tagToRemove);
                renderTags(activeCase, contentContainer);
            }
        }

        // --- Ações do Diário ---
        if (target.matches('.add-diary-button')) {
            const editableDiv = contentContainer.querySelector('.diary-editable');
            if (editableDiv.innerHTML.trim()) {
                activeCase.diary.unshift({ id: Date.now().toString(), text: editableDiv.innerHTML, timestamp: new Date().toISOString() });
                editableDiv.innerHTML = '';
                renderActiveCaseContent();
            }
        }
        if (target.matches('.edit-diary-button')) {
            const diaryId = target.dataset.diaryId;
            const entry = activeCase.diary.find(e => e.id === diaryId);
            if (entry) {
                const entryDiv = target.closest('.diary-entry');
                const textContentDiv = entryDiv.querySelector('.diary-text-content');

                const mainToolbar = contentContainer.querySelector('.diary-toolbar');
                const newToolbar = mainToolbar.cloneNode(true);
                newToolbar.classList.remove('hidden');

                const editableDiv = document.createElement('div');
                editableDiv.className = 'diary-editable diary-editable-inline';
                editableDiv.contentEditable = true;
                editableDiv.innerHTML = entry.text;
                
                const actionsDiv = document.createElement('div');
                actionsDiv.className = 'edit-diary-actions';
                actionsDiv.style.marginTop = '0.5rem';
                actionsDiv.innerHTML = `
                    <button class="save-diary-button" data-diary-id="${diaryId}">Salvar</button>
                    <button class="cancel-diary-button" data-diary-id="${diaryId}">Cancelar</button>
                `;

                textContentDiv.innerHTML = '';
                textContentDiv.appendChild(newToolbar);
                textContentDiv.appendChild(editableDiv);
                textContentDiv.appendChild(actionsDiv);

                editableDiv.focus();

                newToolbar.addEventListener('mousedown', (event) => {
                    event.preventDefault();
                });
            }
        }

        if (target.matches('.save-diary-button')) {
            const diaryId = target.dataset.diaryId;
            const entry = activeCase.diary.find(e => e.id === diaryId);
            if (entry) {
                const entryDiv = target.closest('.diary-entry');
                const editableDiv = entryDiv.querySelector('.diary-editable');
                entry.text = editableDiv.innerHTML;
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
            addChecklistTask();
        }
        if (target.matches('.checklist-item input[type="checkbox"]')) {
            const taskId = target.dataset.taskId;
            const task = activeCase.checklist.find(t => t.id === taskId);
            if (task) { 
                task.isDone = target.checked; 
                renderChecklist(activeCase, contentContainer);
            }
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
                renderChecklist(activeCase, contentContainer);
            }
        }

        if (target.matches('.cancel-task-button')) {
            renderChecklist(activeCase, contentContainer);
        }
        if (target.matches('.delete-task-button')) {
            const taskId = target.dataset.taskId;
            if (confirm('Tem certeza que deseja excluir esta tarefa?')) {
                activeCase.checklist = activeCase.checklist.filter(t => t.id !== taskId);
                renderChecklist(activeCase, contentContainer);
            }
        }

        if (target.matches('.delete-case-button')) {
            if (activeCase && confirm('Tem certeza que deseja excluir permanentemente este caso? Esta ação não pode ser desfeita.')) {
                cases = cases.filter(c => c.id !== activeCase.id);
                activeCaseId = cases.find(c => !c.isArchived && !c.isPostLive)?.id || null;
                render();
            }
        }

        // --- Ações do Caso ---
        if (target.matches('.archive-case-button')) {
            const activeCase = getActiveCase();
            if(activeCase) {
                activeCase.isArchived = true;
                activeCaseId = cases.find(c => !c.isArchived && !c.isPostLive)?.id || null;
                render();
            }
        }
        if (target.matches('.unarchive-case-button')) {
            const caseToUnarchive = getCaseById(activeCaseId);
            if (caseToUnarchive) {
                caseToUnarchive.isArchived = false;
                render();
            }
        }
    }

    // --- FUNÇÕES AUXILIARES ---
    function applyFormatToDiary(format, value = null) {
        document.execCommand(format, false, value);
    }

    function adjustTitleFontSize(inputElement) {
        // Reset font size to the default
        inputElement.style.fontSize = '1.8rem';
    
        // Get the computed font size in pixels
        let computedStyle = window.getComputedStyle(inputElement);
        let fontSize = parseFloat(computedStyle.fontSize);
    
        // Check if the text is overflowing
        while (inputElement.scrollWidth > inputElement.clientWidth && fontSize > 10) { // Added a minimum font size
            fontSize -= 1; // Decrease font size by 1px
            inputElement.style.fontSize = fontSize + 'px';
        }
    }



    function updateManageCsFilesButtonCount() {
        const activeCase = getActiveCase();
        if (!activeCase) return;

        const manageCsButton = contentContainer.querySelector('.manage-cs-files-button');
        if (manageCsButton) {
            const csFilesCount = activeCase.csFiles ? activeCase.csFiles.length : 0;
            manageCsButton.textContent = `Gerenciar CS Files (${csFilesCount})`;
        }
    }

    function getCaseById(id) {
        return cases.find(c => c.id === id);
    }

    function getActiveCase() {
        return getCaseById(activeCaseId);
    }

    function renderPostLiveList() {
        const postLiveList = document.getElementById('post-live-list');
        const h3 = postLiveList.querySelector('h3');
        postLiveList.innerHTML = '';
        if(h3) postLiveList.appendChild(h3);

        const postLiveCases = cases.filter(c => c.isPostLive && !c.isArchived);
        postLiveCases.forEach(caseData => {
            const button = document.createElement('button');
            button.dataset.caseId = caseData.id;

            const statusLabel = getStatusLabel(caseData.status);

            button.innerHTML = `
                <span class="post-live-item-number">${caseData.number || 'Caso Post-live'}</span>
                <span class="post-live-item-status">${statusLabel}</span>
            `;

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
                        let linkClass = 'case-number-for-task';
                        if (caseData.isPostLive) {
                            linkClass += ' post-live-link';
                        } else if (caseData.isArchived) {
                            linkClass += ' archived-link';
                        }

                        const taskElement = document.createElement('div');
                        taskElement.className = 'pending-task-item';
                        taskElement.innerHTML = `
                            <a href="#" class="${linkClass}" data-case-id="${caseData.id}">${caseData.number || 'N/A'}</a>
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

    // --- Funções de Pesquisa ---
    function openSearchModal() {
        const lastSearch = localStorage.getItem('lastSearchQuery');
        if (lastSearch) {
            searchInput.value = lastSearch;
            performSearch();
        }
        searchModal.classList.remove('hidden');
        searchInput.focus();
    }

    function closeSearchModal() {
        searchModal.classList.add('hidden');
    }

    function performSearch() {
        const query = searchInput.value.trim().toLowerCase();
        localStorage.setItem('lastSearchQuery', searchInput.value.trim());

        searchResultsContainer.innerHTML = '';

        if (!query) return;

        const results = cases.filter(caseData => {
            const title = caseData.title?.toLowerCase() || '';
            const number = caseData.number?.toLowerCase() || '';
            const diary = caseData.diary.map(entry => entry.text.toLowerCase()).join(' ');
            const checklist = caseData.checklist.map(task => task.text.toLowerCase()).join(' ');
            const tags = caseData.tags.map(tag => tag.toLowerCase()).join(' ');

            return title.includes(query) ||
                   number.includes(query) ||
                   diary.includes(query) ||
                   checklist.includes(query) ||
                   tags.includes(query);
        });

        if (results.length === 0) {
            searchResultsContainer.innerHTML = '<p>Nenhum caso encontrado.</p>';
            return;
        }

        const highlight = (text, term) => {
            if (!text || !term) return text;
            const regex = new RegExp(`(${term})`, 'gi');
            return text.replace(regex, '<span class="highlight">$1</span>');
        };

        results.forEach(caseData => {
            const resultItem = document.createElement('div');
            resultItem.className = 'search-result-item';
            resultItem.dataset.caseId = caseData.id;

            let content = '';
            content += `<p><strong>Título:</strong> ${highlight(caseData.title, query)}</p>`;
            content += `<p><strong>Número:</strong> ${highlight(caseData.number, query)}</p>`;

            const matchingTags = caseData.tags.filter(tag => tag.toLowerCase().includes(query));
            if (matchingTags.length > 0) {
                content += `<p><strong>Tags:</strong> ${matchingTags.map(tag => highlight(tag, query)).join(', ')}</p>`;
            }
            
            resultItem.innerHTML = `
                <h4>${caseData.number || 'Novo Caso'} - ${caseData.title}</h4>
                ${content}
            `;
            searchResultsContainer.appendChild(resultItem);
        });
    }

    function resetSearch() {
        searchInput.value = '';
        searchResultsContainer.innerHTML = '';
        searchCaseContentContainer.innerHTML = '';
        localStorage.removeItem('lastSearchQuery');
        searchInput.focus();
    }

    function handleSearchResultClick(event) {
        const resultItem = event.target.closest('.search-result-item');
        if (resultItem) {
            const caseId = resultItem.dataset.caseId;
            const originalActiveCaseId = activeCaseId;
            activeCaseId = caseId;
            
            renderActiveCaseContent(searchCaseContentContainer, true);

            activeCaseId = originalActiveCaseId;
        }
    }

    // --- INICIA A APLICAÇÃO ---
    init();
});
