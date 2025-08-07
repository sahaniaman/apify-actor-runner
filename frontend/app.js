
// Global Application State
const AppState = {
    apiKey: null,
    user: null,
    selectedActor: null,
    actorDetails: null,
    inputConfig: {},
    currentRun: null,
    filters: {
        type: 'public', // 'public' or 'my'
        search: '',
        category: ''
    }
};

// DOM Element References
const Elements = {
    // Auth
    authSection: document.getElementById('auth-section'),
    apiKeyInput: document.getElementById('api-key'),
    toggleApiKey: document.getElementById('toggle-api-key'),
    validateKeyBtn: document.getElementById('validate-key'),
    authStatus: document.getElementById('auth-status'),
    headerActions: document.getElementById('header-actions'),
    userInfo: document.getElementById('user-info'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // Actor Browser
    actorBrowser: document.getElementById('actor-browser'),
    filterBtns: document.querySelectorAll('.filter-btn'),
    actorSearch: document.getElementById('actor-search'),
    categoryFilter: document.getElementById('category-filter'),
    actorsLoading: document.getElementById('actors-loading'),
    actorsGrid: document.getElementById('actors-grid'),
    actorsEmpty: document.getElementById('actors-empty'),
    
    // Actor Config
    actorConfig: document.getElementById('actor-config'),
    selectedActorName: document.getElementById('selected-actor-name'),
    selectedActorDescription: document.getElementById('selected-actor-description'),
    configTabs: document.querySelectorAll('.config-tabs .tab-btn'),
    visualEditor: document.getElementById('visual-editor'),
    jsonEditor: document.getElementById('json-editor'),
    schemaForm: document.getElementById('schema-form'),
    jsonInput: document.getElementById('json-input'),
    backToBrowse: document.getElementById('back-to-browse'),
    runActorBtn: document.getElementById('run-actor'),
    
    // Results
    resultsSection: document.getElementById('results-section'),
    runStatus: document.getElementById('run-status'),
    resultsTabs: document.getElementById('results-tabs'),
    resultsContent: document.getElementById('results-content'),
    resultsPreview: document.getElementById('results-preview'),
    resultsRaw: document.getElementById('results-raw'),
    resultsStats: document.getElementById('results-stats'),
    rawOutput: document.getElementById('raw-output'),
    resultsTable: document.getElementById('results-table'),
    statsContent: document.getElementById('stats-content'),
    newRunBtn: document.getElementById('new-run'),
    downloadResults: document.getElementById('download-results'),
    
    // Toast
    toastContainer: document.getElementById('toast-container')
};

// Utility Functions
const Utils = {
    // Show toast notification
    showToast(message, type = 'info', duration = 5000) {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const icon = type === 'success' ? 'check-circle' : 
                    type === 'error' ? 'exclamation-circle' : 
                    type === 'warning' ? 'exclamation-triangle' : 'info-circle';
        
        toast.innerHTML = `
            <i class="fas fa-${icon}"></i>
            <span>${message}</span>
        `;
        
        Elements.toastContainer.appendChild(toast);
        
        setTimeout(() => {
            toast.style.animation = 'slideIn 0.3s ease reverse';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },
    
    // Format date
    formatDate(dateString) {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // Format duration
    formatDuration(ms) {
        const seconds = Math.floor(ms / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        
        if (hours > 0) return `${hours}h ${minutes % 60}m`;
        if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
        return `${seconds}s`;
    },
    
    // Truncate text
    truncate(text, length = 100) {
        return text && text.length > length ? text.substring(0, length) + '...' : text || '';
    },
    
    // Debounce function
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

// API Client
const ApiClient = {
    async request(endpoint, options = {}) {
        try {
            console.log('Making API request:', endpoint, 'with API key:', AppState.apiKey ? 'present' : 'missing');
            const response = await fetch(`/api${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    'api-key': AppState.apiKey,
                    ...options.headers
                },
                ...options
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },
    
    async validateKey(apiKey) {
        // Don't use the regular request method to avoid sending api-key header
        try {
            const response = await fetch('/api/validate-key', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ apiKey })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.message || 'Request failed');
            }
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    },
    
    async getMyActors() {
        return this.request('/my-actors');
    },
    
    async getPublicActors(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/public-actors?${query}`);
    },
    
    async getActor(actorId) {
        return this.request(`/actor/${actorId}`);
    },
    
    async runActor(actorId, input) {
        console.log('Running actor:', actorId, 'with input:', input);
        return this.request(`/actor/${actorId}/run`, {
            method: 'POST',
            body: JSON.stringify(input)
        });
    },
    
    async getRunStatus(runId) {
        return this.request(`/run/${runId}/status`);
    },
    
    async getRunResults(runId, params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/run/${runId}/results?${query}`);
    },
    
    async getCategories() {
        return this.request('/categories');
    }
};

// Authentication Module
const Auth = {
    init() {
        Elements.toggleApiKey.addEventListener('click', this.toggleApiKeyVisibility);
        Elements.validateKeyBtn.addEventListener('click', this.validateApiKey.bind(this));
        Elements.logoutBtn.addEventListener('click', this.logout.bind(this));
        
        // Auto-validate if key exists in localStorage
        const savedKey = localStorage.getItem('apify_api_key');
        if (savedKey) {
            Elements.apiKeyInput.value = savedKey;
            this.validateApiKey();
        }
    },
    
    toggleApiKeyVisibility() {
        const input = Elements.apiKeyInput;
        const icon = Elements.toggleApiKey.querySelector('i');
        
        if (input.type === 'password') {
            input.type = 'text';
            icon.className = 'fas fa-eye-slash';
        } else {
            input.type = 'password';
            icon.className = 'fas fa-eye';
        }
    },
    
    async validateApiKey() {
        const apiKey = Elements.apiKeyInput.value.trim();
        
        if (!apiKey) {
            this.showAuthStatus('Please enter your API key', 'error');
            return;
        }
        
        Elements.validateKeyBtn.disabled = true;
        Elements.validateKeyBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Connecting...';
        
        try {
            const response = await ApiClient.validateKey(apiKey);
            
            AppState.apiKey = apiKey;
            AppState.user = response.user;
            
            // Save to localStorage
            localStorage.setItem('apify_api_key', apiKey);
            
            this.showAuthStatus(`Connected successfully! Welcome, ${response.user.username}`, 'success');
            this.showAuthenticatedUI();
            
            // Load actors
            ActorBrowser.init();
            
        } catch (error) {
            this.showAuthStatus(error.message, 'error');
        } finally {
            Elements.validateKeyBtn.disabled = false;
            Elements.validateKeyBtn.innerHTML = '<i class="fas fa-check-circle"></i> Connect Account';
        }
    },
    
    showAuthStatus(message, type) {
        Elements.authStatus.textContent = message;
        Elements.authStatus.className = `status-message ${type}`;
    },
    
    showAuthenticatedUI() {
        Elements.authSection.classList.add('hidden');
        Elements.headerActions.style.display = 'flex';
        Elements.userInfo.textContent = `${AppState.user.username} (${AppState.user.plan})`;
        Elements.actorBrowser.classList.remove('hidden');
    },
    
    logout() {
        AppState.apiKey = null;
        AppState.user = null;
        localStorage.removeItem('apify_api_key');
        
        Elements.authSection.classList.remove('hidden');
        Elements.headerActions.style.display = 'none';
        Elements.actorBrowser.classList.add('hidden');
        Elements.actorConfig.classList.add('hidden');
        Elements.resultsSection.classList.add('hidden');
        
        Elements.apiKeyInput.value = '';
        Elements.authStatus.textContent = '';
        
        Utils.showToast('Logged out successfully', 'success');
    }
};

// Actor Browser Module
const ActorBrowser = {
    actors: [],
    categories: [],
    
    init() {
        this.bindEvents();
        this.loadCategories();
        this.loadActors();
    },
    
    bindEvents() {
        // Filter buttons
        Elements.filterBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                Elements.filterBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                AppState.filters.type = e.target.dataset.filter;
                this.loadActors();
            });
        });
        
        // Search input
        Elements.actorSearch.addEventListener('input', 
            Utils.debounce((e) => {
                AppState.filters.search = e.target.value;
                this.loadActors();
            }, 500)
        );
        
        // Category filter
        Elements.categoryFilter.addEventListener('change', (e) => {
            AppState.filters.category = e.target.value;
            this.loadActors();
        });
    },
    
    async loadCategories() {
        try {
            const response = await ApiClient.getCategories();
            this.categories = response.categories || [];
            this.updateCategoryFilter();
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    },
    
    updateCategoryFilter() {
        if (AppState.filters.type === 'public') {
            Elements.categoryFilter.style.display = 'block';
            Elements.categoryFilter.innerHTML = '<option value="">All Categories</option>';
            
            this.categories.forEach(category => {
                const option = document.createElement('option');
                option.value = category.id;
                option.textContent = category.title;
                Elements.categoryFilter.appendChild(option);
            });
        } else {
            Elements.categoryFilter.style.display = 'none';
        }
    },
    
    async loadActors() {
        this.showLoading();
        
        try {
            let response;
            const params = {
                search: AppState.filters.search,
                limit: 50
            };
            
            if (AppState.filters.type === 'public') {
                if (AppState.filters.category) {
                    params.category = AppState.filters.category;
                }
                response = await ApiClient.getPublicActors(params);
            } else {
                response = await ApiClient.getMyActors();
            }
            
            this.actors = response.actors || [];
            this.renderActors();
            
        } catch (error) {
            Utils.showToast('Failed to load actors: ' + error.message, 'error');
            this.showEmpty();
        }
    },
    
    showLoading() {
        Elements.actorsLoading.classList.remove('hidden');
        Elements.actorsGrid.classList.add('hidden');
        Elements.actorsEmpty.classList.add('hidden');
    },
    
    showEmpty() {
        Elements.actorsLoading.classList.add('hidden');
        Elements.actorsGrid.classList.add('hidden');
        Elements.actorsEmpty.classList.remove('hidden');
    },
    
    renderActors() {
        Elements.actorsLoading.classList.add('hidden');
        
        if (this.actors.length === 0) {
            this.showEmpty();
            return;
        }
        
        Elements.actorsGrid.classList.remove('hidden');
        Elements.actorsEmpty.classList.add('hidden');
        
        Elements.actorsGrid.innerHTML = this.actors.map(actor => `
            <div class="actor-card" data-actor-id="${actor.id}">
                <div class="actor-header">
                    <div class="actor-icon">
                        <i class="fas fa-robot"></i>
                    </div>
                    <div class="actor-info">
                        <h3>${actor.title || actor.name}</h3>
                        <div class="actor-author">by ${actor.username}</div>
                    </div>
                </div>
                <div class="actor-description">
                    ${Utils.truncate(actor.description, 120)}
                </div>
                <div class="actor-tags">
                    ${actor.isPublic ? '<span class="actor-tag">Public</span>' : '<span class="actor-tag">Private</span>'}
                    ${actor.featured ? '<span class="actor-tag">Featured</span>' : ''}
                </div>
            </div>
        `).join('');
        
        // Bind click events
        Elements.actorsGrid.querySelectorAll('.actor-card').forEach(card => {
            card.addEventListener('click', () => {
                const actorId = card.dataset.actorId;
                this.selectActor(actorId);
            });
        });
    },
    
    async selectActor(actorId) {
        try {
            const response = await ApiClient.getActor(actorId);
            AppState.selectedActor = actorId;
            AppState.actorDetails = response.actor;
            
            ActorConfig.show();
            
        } catch (error) {
            Utils.showToast('Failed to load actor details: ' + error.message, 'error');
        }
    }
};

// Actor Configuration Module
const ActorConfig = {
    currentTab: 'visual',
    
    init() {
        this.bindEvents();
    },
    
    bindEvents() {
        // Tab switching
        Elements.configTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // Navigation
        Elements.backToBrowse.addEventListener('click', () => {
            Elements.actorConfig.classList.add('hidden');
            Elements.actorBrowser.classList.remove('hidden');
        });
        
        // Run actor
        Elements.runActorBtn.addEventListener('click', this.runActor.bind(this));
        
        // JSON input changes
        Elements.jsonInput.addEventListener('input', this.updateFromJson.bind(this));
    },
    
    show() {
        Elements.actorBrowser.classList.add('hidden');
        Elements.actorConfig.classList.remove('hidden');
        
        const actor = AppState.actorDetails;
        Elements.selectedActorName.textContent = actor.title || actor.name;
        Elements.selectedActorDescription.textContent = Utils.truncate(actor.description, 200);
        
        this.generateForm();
        this.updateJsonEditor();
    },
    
    switchTab(tabName) {
        this.currentTab = tabName;
        
        Elements.configTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `${tabName}-editor`);
        });
        
        if (tabName === 'json') {
            this.updateJsonEditor();
        }
    },
    
    generateForm() {
        const schema = AppState.actorDetails.inputSchema;
        const defaultInput = AppState.actorDetails.defaultRunInput || {};
        
        AppState.inputConfig = { ...defaultInput };
        
        if (!schema || !schema.properties) {
            Elements.schemaForm.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-info-circle"></i>
                    <p>This actor doesn't have a defined input schema. You can still provide input using the JSON editor.</p>
                </div>
            `;
            return;
        }
        
        Elements.schemaForm.innerHTML = this.renderProperties(schema.properties, schema.required || []);
        this.bindFormEvents();
    },
    
    renderProperties(properties, required = []) {
        return Object.entries(properties).map(([key, prop]) => {
            const isRequired = required.includes(key);
            const value = AppState.inputConfig[key];
            
            return `
                <div class="schema-property">
                    <div class="property-label">
                        <strong>${key}</strong>
                        ${isRequired ? '<span class="required-indicator">*</span>' : ''}
                        <small>(${prop.type})</small>
                    </div>
                    ${prop.description ? `<div class="property-description">${prop.description}</div>` : ''}
                    ${this.renderInput(key, prop, value)}
                </div>
            `;
        }).join('');
    },
    
    renderInput(key, prop, value) {
        switch (prop.type) {
            case 'string':
                if (prop.enum) {
                    const options = prop.enum.map(opt => 
                        `<option value="${opt}" ${value === opt ? 'selected' : ''}>${opt}</option>`
                    ).join('');
                    return `<select data-key="${key}"><option value="">Select...</option>${options}</select>`;
                }
                return `<input type="text" data-key="${key}" value="${value || ''}" placeholder="Enter ${key}">`;
                
            case 'number':
            case 'integer':
                return `<input type="number" data-key="${key}" value="${value || ''}" 
                        ${prop.minimum !== undefined ? `min="${prop.minimum}"` : ''}
                        ${prop.maximum !== undefined ? `max="${prop.maximum}"` : ''}
                        ${prop.type === 'integer' ? 'step="1"' : 'step="any"'}>`;
                
            case 'boolean':
                return `<label class="checkbox-label">
                    <input type="checkbox" data-key="${key}" ${value ? 'checked' : ''}>
                    <span>Enable ${key}</span>
                </label>`;
                
            case 'array':
                return `<textarea data-key="${key}" rows="4" placeholder="Enter JSON array">${JSON.stringify(value || [], null, 2)}</textarea>`;
                
            case 'object':
                return `<textarea data-key="${key}" rows="6" placeholder="Enter JSON object">${JSON.stringify(value || {}, null, 2)}</textarea>`;
                
            default:
                return `<input type="text" data-key="${key}" value="${value || ''}" placeholder="Enter ${key}">`;
        }
    },
    
    bindFormEvents() {
        Elements.schemaForm.querySelectorAll('input, select, textarea').forEach(input => {
            input.addEventListener('change', this.updateFromForm.bind(this));
            input.addEventListener('input', this.updateFromForm.bind(this));
        });
    },
    
    updateFromForm() {
        const formData = new FormData();
        const inputs = Elements.schemaForm.querySelectorAll('[data-key]');
        
        inputs.forEach(input => {
            const key = input.dataset.key;
            let value;
            
            if (input.type === 'checkbox') {
                value = input.checked;
            } else if (input.tagName === 'TEXTAREA') {
                try {
                    value = JSON.parse(input.value || (input.value.trim().startsWith('[') ? '[]' : '{}'));
                } catch {
                    value = input.value;
                }
            } else if (input.type === 'number') {
                value = input.value === '' ? undefined : Number(input.value);
            } else {
                value = input.value;
            }
            
            if (value !== undefined && value !== '') {
                AppState.inputConfig[key] = value;
            } else {
                delete AppState.inputConfig[key];
            }
        });
        
        if (this.currentTab === 'visual') {
            this.updateJsonEditor();
        }
    },
    
    updateFromJson() {
        try {
            AppState.inputConfig = JSON.parse(Elements.jsonInput.value || '{}');
            Elements.jsonInput.style.borderColor = '';
        } catch {
            Elements.jsonInput.style.borderColor = 'var(--error-color)';
        }
    },
    
    updateJsonEditor() {
        Elements.jsonInput.value = JSON.stringify(AppState.inputConfig, null, 2);
    },
    
    async runActor() {
        if (!AppState.selectedActor) return;
        
        Elements.runActorBtn.disabled = true;
        Elements.runActorBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';
        
        try {
            // Update config from current tab
            if (this.currentTab === 'json') {
                this.updateFromJson();
            } else {
                this.updateFromForm();
            }
            
            const response = await ApiClient.runActor(AppState.selectedActor, AppState.inputConfig);
            
            AppState.currentRun = {
                id: response.runId,
                status: response.status,
                startTime: Date.now()
            };
            
            Utils.showToast('Actor run started successfully!', 'success');
            Results.show();
            
        } catch (error) {
            Utils.showToast('Failed to start actor run: ' + error.message, 'error');
        } finally {
            Elements.runActorBtn.disabled = false;
            Elements.runActorBtn.innerHTML = '<i class="fas fa-play"></i> Run Actor';
        }
    }
};

// Results Module
const Results = {
    statusCheckInterval: null,
    currentTab: 'preview',
    
    init() {
        this.bindEvents();
    },
    
    bindEvents() {
        // Tab switching
        const resultsTabs = document.querySelectorAll('.results-tabs .tab-btn');
        resultsTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                const tabName = e.target.dataset.tab;
                this.switchTab(tabName);
            });
        });
        
        // New run
        Elements.newRunBtn.addEventListener('click', () => {
            this.hide();
            Elements.actorConfig.classList.remove('hidden');
        });
        
        // Download results
        Elements.downloadResults.addEventListener('click', this.downloadResults.bind(this));
    },
    
    show() {
        Elements.actorConfig.classList.add('hidden');
        Elements.resultsSection.classList.remove('hidden');
        
        this.startStatusCheck();
        this.updateRunStatus('RUNNING', 'Actor is starting...');
    },
    
    hide() {
        Elements.resultsSection.classList.add('hidden');
        this.stopStatusCheck();
    },
    
    switchTab(tabName) {
        this.currentTab = tabName;
        
        const resultsTabs = document.querySelectorAll('.results-tabs .tab-btn');
        resultsTabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        document.querySelectorAll('.results-content .tab-panel').forEach(panel => {
            panel.classList.toggle('active', panel.id === `results-${tabName}`);
        });
    },
    
    startStatusCheck() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
        }
        
        this.statusCheckInterval = setInterval(async () => {
            try {
                const response = await ApiClient.getRunStatus(AppState.currentRun.id);
                AppState.currentRun.status = response.status;
                
                this.updateRunStatus(response.status, this.getStatusMessage(response.status));
                
                if (response.status === 'SUCCEEDED' || response.status === 'FAILED' || response.status === 'ABORTED') {
                    this.stopStatusCheck();
                    
                    if (response.status === 'SUCCEEDED') {
                        await this.loadResults();
                    }
                }
                
            } catch (error) {
                console.error('Failed to check run status:', error);
            }
        }, 2000);
    },
    
    stopStatusCheck() {
        if (this.statusCheckInterval) {
            clearInterval(this.statusCheckInterval);
            this.statusCheckInterval = null;
        }
    },
    
    updateRunStatus(status, message) {
        const statusIcon = Elements.runStatus.querySelector('.status-icon');
        const statusLabel = Elements.runStatus.querySelector('.status-label');
        const statusDetails = Elements.runStatus.querySelector('.status-details');
        const progressFill = Elements.runStatus.querySelector('.progress-fill');
        
        // Update icon and styles
        statusIcon.className = 'status-icon';
        
        switch (status) {
            case 'RUNNING':
                statusIcon.classList.add('running');
                statusIcon.innerHTML = '<i class="fas fa-cog fa-spin"></i>';
                progressFill.classList.add('indeterminate');
                break;
            case 'SUCCEEDED':
                statusIcon.classList.add('success');
                statusIcon.innerHTML = '<i class="fas fa-check"></i>';
                progressFill.style.width = '100%';
                progressFill.classList.remove('indeterminate');
                break;
            case 'FAILED':
            case 'ABORTED':
                statusIcon.classList.add('error');
                statusIcon.innerHTML = '<i class="fas fa-times"></i>';
                progressFill.style.width = '100%';
                progressFill.classList.remove('indeterminate');
                break;
            default:
                statusIcon.innerHTML = '<i class="fas fa-clock"></i>';
                progressFill.style.width = '25%';
        }
        
        statusLabel.textContent = this.getStatusLabel(status);
        statusDetails.textContent = message;
    },
    
    getStatusLabel(status) {
        const labels = {
            'READY': 'Ready',
            'RUNNING': 'Running',
            'SUCCEEDED': 'Completed',
            'FAILED': 'Failed',
            'ABORTED': 'Aborted',
            'TIMING-OUT': 'Timing Out',
            'TIMED-OUT': 'Timed Out'
        };
        return labels[status] || status;
    },
    
    getStatusMessage(status) {
        const messages = {
            'READY': 'Preparing to start...',
            'RUNNING': 'Processing your request...',
            'SUCCEEDED': 'Actor completed successfully!',
            'FAILED': 'Actor run failed. Check the logs for details.',
            'ABORTED': 'Actor run was aborted.',
            'TIMING-OUT': 'Actor is taking longer than expected...',
            'TIMED-OUT': 'Actor run timed out.'
        };
        return messages[status] || 'Unknown status';
    },
    
    async loadResults() {
        try {
            const response = await ApiClient.getRunResults(AppState.currentRun.id);
            
            if (response.results && response.results.length > 0) {
                this.renderResults(response.results);
                Elements.downloadResults.style.display = 'inline-flex';
            } else {
                this.renderEmptyResults();
            }
            
            Elements.resultsTabs.classList.remove('hidden');
            Elements.resultsContent.classList.remove('hidden');
            
        } catch (error) {
            Utils.showToast('Failed to load results: ' + error.message, 'error');
        }
    },
    
    renderResults(results) {
        // Render preview table
        this.renderPreviewTable(results);
        
        // Render raw JSON
        Elements.rawOutput.textContent = JSON.stringify(results, null, 2);
        
        // Render statistics
        this.renderStats(results);
    },
    
    renderPreviewTable(results) {
        if (!Array.isArray(results) || results.length === 0) {
            Elements.resultsTable.innerHTML = '<p>No results to display</p>';
            return;
        }
        
        // Get all unique keys from results
        const allKeys = [...new Set(results.flatMap(Object.keys))];
        const displayKeys = allKeys.slice(0, 10); // Limit columns
        
        const table = document.createElement('table');
        table.className = 'results-table';
        
        // Header
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');
        displayKeys.forEach(key => {
            const th = document.createElement('th');
            th.textContent = key;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);
        table.appendChild(thead);
        
        // Body
        const tbody = document.createElement('tbody');
        results.slice(0, 100).forEach(item => { // Limit rows
            const row = document.createElement('tr');
            displayKeys.forEach(key => {
                const td = document.createElement('td');
                const value = item[key];
                
                if (typeof value === 'object' && value !== null) {
                    td.textContent = JSON.stringify(value);
                } else {
                    td.textContent = Utils.truncate(String(value || ''), 50);
                }
                
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });
        table.appendChild(tbody);
        
        Elements.resultsTable.innerHTML = '';
        Elements.resultsTable.appendChild(table);
    },
    
    renderStats(results) {
        const stats = {
            'Total Items': results.length,
            'Data Size': this.formatBytes(JSON.stringify(results).length),
            'Execution Time': Utils.formatDuration(Date.now() - AppState.currentRun.startTime)
        };
        
        // Add custom stats based on data
        if (results.length > 0) {
            const firstItem = results[0];
            stats['Fields'] = Object.keys(firstItem).length;
        }
        
        const statsHtml = Object.entries(stats).map(([label, value]) => `
            <div class="stat-card">
                <div class="stat-value">${value}</div>
                <div class="stat-label">${label}</div>
            </div>
        `).join('');
        
        Elements.statsContent.innerHTML = `<div class="stats-grid">${statsHtml}</div>`;
    },
    
    renderEmptyResults() {
        Elements.resultsTable.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-inbox"></i>
                <h3>No Results</h3>
                <p>The actor completed but didn't return any data.</p>
            </div>
        `;
        Elements.rawOutput.textContent = '[]';
        Elements.statsContent.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-chart-bar"></i>
                <p>No statistics available</p>
            </div>
        `;
    },
    
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    async downloadResults() {
        try {
            const response = await ApiClient.getRunResults(AppState.currentRun.id);
            const dataStr = JSON.stringify(response.results, null, 2);
            
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `apify-results-${AppState.currentRun.id}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            Utils.showToast('Results downloaded successfully!', 'success');
            
        } catch (error) {
            Utils.showToast('Failed to download results: ' + error.message, 'error');
        }
    }
};

// App Initialization
document.addEventListener('DOMContentLoaded', () => {
    Auth.init();
    ActorConfig.init();
    Results.init();
    
    console.log('🚀  Apify Actor Runner initialized');
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (Results.statusCheckInterval) {
        Results.stopStatusCheck();
    }
});
