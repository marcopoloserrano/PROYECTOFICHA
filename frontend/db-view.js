document.addEventListener('DOMContentLoaded', () => {
    // ── State ──────────────────────────────────────────────────
    const state = {
        tables: {},
        currentTable: null,
        autoRefreshInterval: null,
        refreshRate: 5000
    };

    // ── DOM Elements ───────────────────────────────────────────
    const el = {
        tableList:        document.getElementById('table-list'),
        currentTitle:     document.getElementById('current-table-title'),
        rowCount:         document.getElementById('row-count'),
        tableWrapper:     document.getElementById('data-table-wrapper'),
        tableHead:        document.getElementById('data-table-head'),
        tableBody:        document.getElementById('data-table-body'),
        emptyState:       document.getElementById('empty-state'),
        loadingState:     document.getElementById('loading-state'),
        refreshBtn:       document.getElementById('refresh-btn'),
        autoRefreshToggle:document.getElementById('auto-refresh-toggle'),
        insertBtn:        document.getElementById('insert-btn'),
        // Modal
        modal:            document.getElementById('insert-modal'),
        modalTableName:   document.getElementById('modal-table-name'),
        modalCloseBtn:    document.getElementById('modal-close-btn'),
        modalCancelBtn:   document.getElementById('modal-cancel-btn'),
        insertForm:       document.getElementById('insert-form'),
        formFields:       document.getElementById('form-fields'),
        formFeedback:     document.getElementById('form-feedback'),
        // Toast
        toast:            document.getElementById('toast')
    };

    // ── Toast ──────────────────────────────────────────────────
    function showToast(message, type = 'success') {
        el.toast.textContent = message;
        el.toast.className = `toast toast-${type}`;
        setTimeout(() => el.toast.classList.add('hidden'), 3000);
    }

    // ── Fetch all DB data ──────────────────────────────────────
    async function fetchDatabaseData(silent = false) {
        if (!silent && !state.currentTable) {
            el.loadingState.classList.remove('hidden');
            el.tableList.innerHTML = '<li class="loading-item">Loading tables...</li>';
        }
        if (silent) el.refreshBtn.classList.add('spinning');

        try {
            const res = await fetch('http://localhost:4000/api/db-test');
            const result = await res.json();

            if (result.success) {
                state.tables = result.tables;
                renderTableList();
                if (state.currentTable && state.tables[state.currentTable]) {
                    renderTableData(state.currentTable);
                } else if (!state.currentTable) {
                    el.loadingState.classList.add('hidden');
                }
            }
        } catch (err) {
            console.error('Fetch error:', err);
        } finally {
            if (silent) setTimeout(() => el.refreshBtn.classList.remove('spinning'), 500);
        }
    }

    // ── Sidebar list ───────────────────────────────────────────
    function renderTableList() {
        el.tableList.innerHTML = '';
        Object.keys(state.tables).sort().forEach(name => {
            const li = document.createElement('li');
            li.innerHTML = `<i class="fas fa-table"></i> ${name}`;
            li.dataset.tableName = name;
            if (state.currentTable === name) li.classList.add('active');
            li.addEventListener('click', () => selectTable(name));
            el.tableList.appendChild(li);
        });
    }

    // ── Select table ───────────────────────────────────────────
    function selectTable(name) {
        state.currentTable = name;
        Array.from(el.tableList.children).forEach(li => {
            li.classList.toggle('active', li.dataset.tableName === name);
        });
        el.insertBtn.classList.remove('hidden');
        renderTableData(name);
    }

    // ── Render table data ──────────────────────────────────────
    function renderTableData(name) {
        const tableData = state.tables[name];
        if (!tableData) return;

        el.emptyState.classList.add('hidden');
        el.loadingState.classList.add('hidden');
        el.tableWrapper.classList.remove('hidden');
        el.currentTitle.textContent = name;
        el.rowCount.textContent = `${tableData.data.length} rows`;

        // Get primary key (first PRI column, or first column)
        const pkCol = (tableData.columnsMeta || []).find(c => c.key === 'PRI');
        const pkField = pkCol ? pkCol.field : tableData.columns[0];

        // Headers + acciones
        let headerHTML = '<tr>';
        tableData.columns.forEach(col => {
            headerHTML += `<th>${col}</th>`;
        });
        headerHTML += '<th class="th-actions">Acciones</th></tr>';
        el.tableHead.innerHTML = headerHTML;

        // Rows
        let bodyHTML = '';
        if (tableData.data.length === 0) {
            bodyHTML = `<tr><td colspan="${tableData.columns.length + 1}" class="no-data">No hay datos en esta tabla.</td></tr>`;
        } else {
            tableData.data.forEach(row => {
                const pkValue = row[pkField];
                bodyHTML += '<tr>';
                tableData.columns.forEach(col => {
                    let cell = row[col];
                    if (cell === null) cell = `<span class="null-badge">NULL</span>`;
                    else if (typeof cell === 'object') cell = JSON.stringify(cell);
                    // Format dates nicely
                    else if (typeof cell === 'string' && cell.match(/^\d{4}-\d{2}-\d{2}T/)) {
                        cell = cell.split('T')[0];
                    }
                    bodyHTML += `<td>${cell}</td>`;
                });
                bodyHTML += `
                    <td class="td-actions">
                        <button class="btn-edit" 
                            data-table="${name}" 
                            data-pk="${pkField}" 
                            data-id="${pkValue}"
                            title="Modificar fila">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-delete" 
                            data-table="${name}" 
                            data-pk="${pkField}" 
                            data-id="${pkValue}"
                            title="Eliminar fila">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </td>
                </tr>`;
            });
        }
        el.tableBody.innerHTML = bodyHTML;

        // Attach edit listeners
        el.tableBody.querySelectorAll('.btn-edit').forEach(btn => {
            btn.addEventListener('click', handleEdit);
        });
        
        // Attach delete listeners
        el.tableBody.querySelectorAll('.btn-delete').forEach(btn => {
            btn.addEventListener('click', handleDelete);
        });
    }

    // ── Delete row ─────────────────────────────────────────────
    async function handleDelete(e) {
        const btn = e.currentTarget;
        const { table, pk, id } = btn.dataset;

        if (!confirm(`¿Eliminar la fila con ${pk} = ${id} de la tabla "${table}"?`)) return;

        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            const res = await fetch(`/api/db-test/${table}/${id}?pk=${pk}`, { method: 'DELETE' });
            const result = await res.json();
            if (result.success) {
                showToast(`✅ ${result.message}`);
                fetchDatabaseData(true);
            } else {
                showToast(`❌ ${result.message}`, 'error');
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-trash-alt"></i>';
            }
        } catch (err) {
            showToast('❌ Error de red al eliminar.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-trash-alt"></i>';
        }
    }

    // ── Edit modal Setup ───────────────────────────────────────
    function handleEdit(e) {
        const btn = e.currentTarget;
        const { table, pk, id } = btn.dataset;
        // Find row data
        const tableData = state.tables[table];
        if(!tableData) return;
        const row = tableData.data.find(r => String(r[pk]) === String(id));
        if(!row) return;

        openModalMode(table, row, pk, id);
    }

    // ── Insert Modal ───────────────────────────────────────────
    function openInsertModal() {
        const name = state.currentTable;
        if (!name) return;
        openModalMode(name, null, null, null);
    }

    // mode: insert (row=null) or update (row!=null)
    function openModalMode(name, row = null, pkField = null, pkValue = null) {
        const isEdit = row !== null;
        const tableData = state.tables[name];
        
        el.modalTableName.innerHTML = isEdit ? `Modificar fila en ${name}` : `Insertar fila en ${name}`;
        el.formFeedback.classList.add('hidden');
        el.formFeedback.textContent = '';
        el.formFields.innerHTML = '';
        
        // Save mode metadata into the form
        el.insertForm.dataset.mode = isEdit ? 'edit' : 'insert';
        if (isEdit) {
            el.insertForm.dataset.editId = pkValue;
            el.insertForm.dataset.editPkField = pkField;
        }

        const meta = tableData.columnsMeta || tableData.columns.map(c => ({ field: c, type: 'varchar(255)', null: 'YES', key: '', extra: '' }));

        meta.forEach(col => {
            // Skip AUTO_INCREMENT PKs during Insert, but show them (disabled) in Edit mode
            const isAutoIncrement = col.extra && col.extra.includes('auto_increment');
            if (isAutoIncrement && !isEdit) return;

            const isRequired = col.null === 'NO' && col.default === null;
            const inputType = getInputType(col.type);

            let isForeignKey = false;
            let refTableName = null;
            let refTableData = null;

            // Simple heuristic to detect foreign keys: field starts with "id_" and isn't the PK of the current table.
            if (col.field.startsWith('id_') && col.field !== `id_${name}`) {
                refTableName = col.field.substring(3);
                // Si la tabla referenciada existe en el estado
                if (state.tables[refTableName]) {
                    isForeignKey = true;
                    refTableData = state.tables[refTableName];
                }
            }

            let inputElementHTML = '';

            // ── Caso especial: dia_semana en tabla Horario ──────────────────
            if (col.field === 'dia_semana' && name.toLowerCase() === 'horario') {
                const dias = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo'];
                let options = `<option value="">-- Seleccionar día --</option>`;
                dias.forEach(d => {
                    const selected = isEdit && row[col.field] === d ? 'selected' : '';
                    options += `<option value="${d}" ${selected}>${d}</option>`;
                });
                inputElementHTML = `
                    <select id="field-${col.field}" name="${col.field}" class="form-input" ${isRequired ? 'required' : ''}>
                        ${options}
                    </select>`;

            } else if (isForeignKey) {

                let options = `<option value="">-- Seleccionar ${refTableName} --</option>`;
                
                refTableData.data.forEach(row => {
                    let label = '';
                    // Construir un label visualmente amigable basado en la tabla
                    if (refTableName === 'horario') {
                        label = `${row.dia_semana} (${row.hora_inicio} a ${row.hora_fin})`;
                    } else if (refTableName === 'paciente' || refTableName === 'medico') {
                        label = `${row.nombre} ${row.apellido} (CI/Tel: ${row.ci || row.telefono || 'N/A'})`;
                    } else {
                        // Respaldo genérico (intenta nombre, usuario o simplemente el ID)
                        label = row.nombre || row.usuario || `ID: ${row[col.field]}`;
                    }
                    
                    options += `<option value="${row['id_' + refTableName] || row[col.field]}">${label}</option>`;
                });

                inputElementHTML = `
                    <select 
                        id="field-${col.field}" 
                        name="${col.field}" 
                        class="form-input"
                        ${isRequired ? 'required' : ''}
                    >
                        ${options}
                    </select>
                `;
            } else {
                let defaultVal = '';
                if(isEdit) {
                    if (row[col.field] !== null && row[col.field] !== undefined) {
                      defaultVal = typeof row[col.field] === 'string' && row[col.field].match(/^\d{4}-\d{2}-\d{2}T/) ? row[col.field].substring(0, 16) : row[col.field];
                    }
                } else {
                    defaultVal = col.default !== null ? col.default : '';
                }
                
                inputElementHTML = `
                    <input 
                        type="${inputType}" 
                        id="field-${col.field}" 
                        name="${col.field}"
                        value="${defaultVal}"
                        ${isRequired && !isAutoIncrement ? 'required' : ''}
                        ${isAutoIncrement ? 'readonly style="background:#e2e8f0; cursor:not-allowed;"' : ''}
                        class="form-input"
                        step="${inputType === 'number' ? '1' : undefined}"
                    >
                `;
            }

            const div = document.createElement('div');
            div.className = 'form-group';
            div.innerHTML = `
                <label for="field-${col.field}">
                    ${col.field}
                    <span class="field-type">${col.field === 'dia_semana' && name.toLowerCase() === 'horario' ? 'Día Semana' : isForeignKey ? 'Foreign Key' : col.type}</span>
                    ${isRequired ? '<span class="required-badge">req</span>' : '<span class="optional-badge">opc</span>'}
                </label>
                ${inputElementHTML}
            `;
            el.formFields.appendChild(div);
            
            // Set dynamic value for Select later
            if (isForeignKey && isEdit && row[col.field] !== null) {
                const sel = document.getElementById(`field-${col.field}`);
                if (sel) sel.value = row[col.field];
            }
        });

        el.modal.classList.remove('hidden');
        // Focus first input
        const firstInput = el.formFields.querySelector('input:not([readonly])');
        if (firstInput) firstInput.focus();
    }

    function getInputType(sqlType) {
        if (!sqlType) return 'text';
        const t = sqlType.toLowerCase();
        if (t.includes('int') || t.includes('decimal') || t.includes('float') || t.includes('double')) return 'number';
        if (t.includes('date') && !t.includes('datetime') && !t.includes('timestamp')) return 'date';
        if (t.includes('datetime') || t.includes('timestamp')) return 'datetime-local';
        if (t.includes('time') && !t.includes('datetime')) return 'time';
        return 'text';
    }

    function closeModal() {
        el.modal.classList.add('hidden');
        el.insertForm.reset();
    }

    // ── Form Submit ────────────────────────────────────────────
    el.insertForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = state.currentTable;
        const submitBtn = el.formFields.closest('form').querySelector('#modal-submit-btn');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Guardando...';

        const formData = new FormData(el.insertForm);
        const data = {};
        formData.forEach((value, key) => { data[key] = value; });

        const mode = el.insertForm.dataset.mode;
        const editId = el.insertForm.dataset.editId;
        const editPkField = el.insertForm.dataset.editPkField;

        try {
            let res;
            if (mode === 'edit') {
                 // Remove original PK from payload if readonly to prevent updates on immutable pk
                 const tableMeta = state.tables[name].columnsMeta;
                 if (tableMeta) {
                     const isAutoIncr = tableMeta.find(c => c.field === editPkField)?.extra?.includes('auto_increment');
                     if(isAutoIncr) delete data[editPkField];
                 }
                 res = await fetch(`/api/db-test/${name}/${editId}?pk=${editPkField}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            } else {
                 res = await fetch(`/api/db-test/${name}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
            }
            
            const result = await res.json();

            if (result.success) {
                showToast(`✅ ${result.message}`);
                closeModal();
                fetchDatabaseData(true);
            } else {
                el.formFeedback.textContent = `❌ Error: ${result.message}`;
                el.formFeedback.classList.remove('hidden');
            }
        } catch (err) {
            el.formFeedback.textContent = '❌ Error de red. Intenta de nuevo.';
            el.formFeedback.classList.remove('hidden');
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Guardar';
        }
    });

    // ── Auto-Refresh ───────────────────────────────────────────
    function setupAutoRefresh() {
        if (el.autoRefreshToggle.checked) {
            state.autoRefreshInterval = setInterval(() => fetchDatabaseData(true), state.refreshRate);
        }
        el.autoRefreshToggle.addEventListener('change', e => {
            if (e.target.checked) {
                state.autoRefreshInterval = setInterval(() => fetchDatabaseData(true), state.refreshRate);
            } else {
                clearInterval(state.autoRefreshInterval);
                state.autoRefreshInterval = null;
            }
        });
    }

    // ── Event Listeners ────────────────────────────────────────
    el.refreshBtn.addEventListener('click', () => fetchDatabaseData(true));
    el.insertBtn.addEventListener('click', openInsertModal);
    el.modalCloseBtn.addEventListener('click', closeModal);
    el.modalCancelBtn.addEventListener('click', closeModal);
    el.modal.addEventListener('click', e => { if (e.target === el.modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

    // ── Init ───────────────────────────────────────────────────
    fetchDatabaseData();
    setupAutoRefresh();
});
