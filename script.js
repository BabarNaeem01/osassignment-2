document.addEventListener('DOMContentLoaded', () => {
    const colors = ['#ff6b6b', '#f59f00', '#2ec4b6', '#4dabf7', '#845ef7', '#f06595', '#94d82d'];

    const state = {
        resources: [],
        processes: [],
        tick: 0,
        nextProcessNumber: 1,
        nextColorIndex: 0,
        runningTimer: null,
        timeline: [],
        logs: [],
        syncMode: 'mutex',
        detectionMode: 'detect-resolve',
        safeSequence: []
    };

    const els = {
        syncMode: document.getElementById('sync-mode'),
        detectionMode: document.getElementById('detection-mode'),
        timeSlice: document.getElementById('time-slice'),
        resourceName: document.getElementById('resource-name'),
        resourceType: document.getElementById('resource-type'),
        resourceTotal: document.getElementById('resource-total'),
        processName: document.getElementById('process-name'),
        criticalDuration: document.getElementById('critical-duration'),
        initialAllocation: document.getElementById('initial-allocation'),
        resourceRequest: document.getElementById('resource-request'),
        maxDemand: document.getElementById('max-demand'),
        sharedTarget: document.getElementById('shared-target'),
        processTableBody: document.getElementById('process-table-body'),
        resourceCards: document.getElementById('resource-cards'),
        waitGraph: document.getElementById('wait-graph'),
        timeline: document.getElementById('timeline'),
        eventLog: document.getElementById('event-log'),
        statProcesses: document.getElementById('stat-processes'),
        statBlocked: document.getElementById('stat-blocked'),
        statDeadlock: document.getElementById('stat-deadlock'),
        deadlockSubtext: document.getElementById('deadlock-subtext'),
        statSequence: document.getElementById('stat-sequence')
    };

    document.getElementById('btn-add-resource').addEventListener('click', () => addResource());
    document.getElementById('btn-add-process').addEventListener('click', () => addProcess());
    document.getElementById('btn-run').addEventListener('click', toggleRun);
    document.getElementById('btn-step').addEventListener('click', () => runSingleStep());
    document.getElementById('btn-reset').addEventListener('click', resetSimulation);
    document.getElementById('btn-clear-all').addEventListener('click', clearEverything);
    document.getElementById('btn-resolve').addEventListener('click', resolveDeadlockManually);
    document.getElementById('btn-load-deadlock').addEventListener('click', loadDeadlockScenario);
    document.getElementById('btn-resource-sample').addEventListener('click', loadResourceSample);
    els.processTableBody.addEventListener('click', handleProcessTableClick);
    els.syncMode.addEventListener('change', syncSettings);
    els.detectionMode.addEventListener('change', syncSettings);

    loadResourceSample();
    render();

    function syncSettings() {
        state.syncMode = els.syncMode.value;
        state.detectionMode = els.detectionMode.value;
        logEvent(`Mode changed to ${labelForSyncMode()} with ${labelForDetectionMode()}.`);
        render();
    }

    function addResource(resource = null) {
        const name = resource ? resource.name : els.resourceName.value.trim();
        const type = resource ? resource.type : els.resourceType.value;
        const total = resource ? resource.total : Number.parseInt(els.resourceTotal.value, 10);

        if (!name || Number.isNaN(total) || total <= 0) {
            alert('Enter a valid resource name and a total unit count greater than zero.');
            return false;
        }

        if (state.resources.some(item => item.name === name)) {
            if (!resource) {
                alert('Resource names must be unique.');
            }
            return false;
        }

        state.resources.push({ name, type, total });
        logEvent(`Resource ${name} added as ${type} with ${total} unit(s).`);

        els.resourceName.value = '';
        els.resourceTotal.value = 1;
        render();
        return true;
    }

    function addProcess(process = null) {
        if (state.resources.length === 0) {
            alert('Add at least one shared resource before adding processes.');
            return false;
        }

        try {
            const id = process ? process.id : (els.processName.value.trim() || `P${state.nextProcessNumber}`);
            const duration = process ? process.criticalDuration : Number.parseInt(els.criticalDuration.value, 10);
            const allocation = process ? cloneMap(process.allocation) : parseResourceMap(els.initialAllocation.value);
            const request = process ? cloneMap(process.request) : parseResourceMap(els.resourceRequest.value);
            const maxDemand = process ? cloneMap(process.maxDemand) : parseResourceMap(els.maxDemand.value);
            const sharedTarget = process ? process.sharedTarget : els.sharedTarget.value.trim();

            if (Number.isNaN(duration) || duration <= 0) {
                alert('Critical section time must be greater than zero.');
                return false;
            }

            if (state.processes.some(item => item.id === id)) {
                alert('Process names must be unique.');
                return false;
            }

            validateResourceMap(allocation);
            validateResourceMap(request);
            validateResourceMap(maxDemand);

            if (!sharedTarget) {
                alert('Enter the shared resource this process is contending for.');
                return false;
            }

            if (!state.resources.some(resourceItem => resourceItem.name === sharedTarget)) {
                alert('Shared resource focus must match one of the configured resources.');
                return false;
            }

            const normalizedMax = Object.keys(maxDemand).length ? maxDemand : mergeMaps(allocation, request);
            const normalizedRequest = Object.keys(request).length ? request : subtractPositive(normalizedMax, allocation);

            state.processes.push({
                id,
                color: process ? process.color || colors[state.nextColorIndex % colors.length] : colors[state.nextColorIndex % colors.length],
                criticalDuration: duration,
                initialAllocation: cloneMap(allocation),
                initialRequest: cloneMap(normalizedRequest),
                currentAllocation: cloneMap(allocation),
                request: cloneMap(normalizedRequest),
                maxDemand: cloneMap(normalizedMax),
                sharedTarget,
                state: 'ready',
                remainingTime: duration,
                waitingFor: [],
                completedAt: null,
                aborted: false
            });

            state.nextProcessNumber += 1;
            state.nextColorIndex += 1;
            logEvent(`${id} added with allocation ${formatMap(allocation)}, request ${formatMap(normalizedRequest)}, and shared target ${sharedTarget}.`);
            clearProcessInputs();
            render();
            return true;
        } catch (error) {
            alert(error.message);
            return false;
        }
    }

    function parseResourceMap(text) {
        const map = {};
        const value = text.trim();

        if (!value) {
            return map;
        }

        value.split(',').forEach(pair => {
            const parts = pair.split(':');
            const rawName = parts[0] ? parts[0].trim() : '';
            const rawUnits = parts[1] ? parts[1].trim() : '';
            const units = Number.parseInt(rawUnits, 10);

            if (!rawName || Number.isNaN(units) || units < 0) {
                throw new Error('Use resource entries like FileA:1, Memory1:2');
            }

            map[rawName] = units;
        });

        return map;
    }

    function validateResourceMap(map) {
        Object.keys(map).forEach(name => {
            if (!state.resources.some(resource => resource.name === name)) {
                throw new Error(`Unknown resource: ${name}`);
            }
        });
    }

    function toggleRun() {
        if (state.runningTimer) {
            stopRunLoop();
            return;
        }

        if (state.processes.length === 0) {
            alert('Add at least one process to run the simulator.');
            return;
        }

        const intervalMs = Math.max(200, (Number.parseInt(els.timeSlice.value, 10) || 1) * 350);
        state.runningTimer = window.setInterval(() => {
            const result = runSingleStep();
            if (!result.canContinue) {
                stopRunLoop();
            }
        }, intervalMs);
    }

    function stopRunLoop() {
        if (state.runningTimer) {
            window.clearInterval(state.runningTimer);
            state.runningTimer = null;
        }
    }

    function runSingleStep() {
        if (!state.processes.length) {
            return { canContinue: false };
        }

        state.tick += 1;
        let progressMade = false;

        releaseFinishedProcesses();

        const activeProcesses = state.processes
            .filter(process => !process.aborted && process.state !== 'completed')
            .sort((a, b) => a.id.localeCompare(b.id));

        activeProcesses.forEach(process => {
            if (process.state === 'running') {
                process.remainingTime -= 1;
                recordTimeline(process.id, process.color, process.sharedTarget);
                logEvent(`${process.id} is inside the critical section for ${process.sharedTarget}. Remaining time: ${Math.max(process.remainingTime, 0)}.`, false);
                progressMade = true;
                return;
            }

            if (process.state === 'ready' || process.state === 'blocked') {
                const granted = tryAcquireResources(process);
                if (granted) {
                    process.remainingTime -= 1;
                    recordTimeline(process.id, process.color, process.sharedTarget);
                    logEvent(`${process.id} entered the critical section using ${labelForSyncMode().toLowerCase()}.`, false);
                    progressMade = true;
                }
            }
        });

        releaseFinishedProcesses();

        const deadlockInfo = detectDeadlock();
        if (deadlockInfo.deadlocked) {
            logEvent(`Deadlock detected among ${deadlockInfo.participants.join(', ')}.`, true);
            if (state.detectionMode === 'detect-resolve') {
                resolveDeadlock(deadlockInfo);
                progressMade = true;
            }
        }

        const banker = computeBankerState();
        state.safeSequence = banker.safeSequence;
        if (state.detectionMode === 'banker') {
            if (banker.safe) {
                logEvent(`Banker's check confirms a safe sequence: ${banker.safeSequence.join(' -> ') || 'none needed'}.`, false);
            } else {
                logEvent(`Banker's check found an unsafe state, so unsafe requests are deferred.`, true);
            }
        }

        render();

        const activeRemaining = state.processes.some(process => !process.aborted && process.state !== 'completed');
        return { canContinue: activeRemaining && (progressMade || detectDeadlock().deadlocked) };
    }

    function tryAcquireResources(process) {
        if (process.state === 'running' || process.state === 'completed' || process.aborted) {
            return false;
        }

        const needs = outstandingNeed(process);
        const requestedNames = Object.keys(needs).filter(name => needs[name] > 0);

        if (requestedNames.length && !requestedNames.every(name => availableUnits(name) >= needs[name])) {
            process.state = 'blocked';
            process.waitingFor = holdersForResources(requestedNames, process.id);
            logEvent(`${process.id} is waiting for ${formatMap(needs)}.`, false);
            return false;
        }

        if (!canEnterCriticalSection(process)) {
            process.state = 'blocked';
            process.waitingFor = holdersOfSharedTarget(process.sharedTarget, process.id);
            logEvent(`${process.id} is blocked by ${labelForSyncMode().toLowerCase()} access on ${process.sharedTarget}.`, false);
            return false;
        }

        if (requestedNames.length && state.detectionMode === 'banker' && !isSafeToGrant(process, needs)) {
            process.state = 'blocked';
            process.waitingFor = holdersForResources(requestedNames, process.id);
            logEvent(`Request from ${process.id} deferred because Banker's Algorithm marked it unsafe.`, true);
            return false;
        }

        requestedNames.forEach(name => {
            process.currentAllocation[name] = (process.currentAllocation[name] || 0) + needs[name];
            process.request[name] = 0;
        });

        process.state = 'running';
        process.waitingFor = [];
        return true;
    }

    function canEnterCriticalSection(process) {
        const target = state.resources.find(resource => resource.name === process.sharedTarget);
        if (!target) {
            return false;
        }

        const runners = state.processes.filter(item =>
            item.id !== process.id &&
            !item.aborted &&
            item.state === 'running' &&
            item.sharedTarget === process.sharedTarget
        );

        if (state.syncMode === 'semaphore') {
            return runners.length < target.total;
        }

        return runners.length === 0;
    }

    function releaseFinishedProcesses() {
        state.processes
            .filter(process => process.state === 'running' && process.remainingTime <= 0)
            .forEach(process => {
                const released = formatMap(process.currentAllocation);
                releaseProcessResources(process);
                process.state = 'completed';
                process.completedAt = state.tick;
                logEvent(`${process.id} completed and released ${released}.`, false);
            });
    }

    function releaseProcessResources(process) {
        Object.keys(process.currentAllocation).forEach(name => {
            process.currentAllocation[name] = 0;
        });
        process.request = {};
        process.waitingFor = [];
    }

    function resolveDeadlockManually() {
        const info = detectDeadlock();
        if (!info.deadlocked) {
            alert('No deadlock is currently present.');
            return;
        }

        resolveDeadlock(info);
        render();
    }

    function resolveDeadlock(info) {
        const victim = info.participants
            .map(id => state.processes.find(process => process.id === id))
            .filter(Boolean)
            .sort((a, b) => allocatedUnits(b) - allocatedUnits(a))[0];

        if (!victim) {
            return;
        }

        releaseProcessResources(victim);
        victim.state = 'aborted';
        victim.aborted = true;
        victim.waitingFor = [];
        logEvent(`Deadlock resolved by aborting ${victim.id} and releasing its resources.`, true);

        state.processes.forEach(process => {
            if (process.state === 'blocked') {
                process.state = 'ready';
            }
        });
    }

    function detectDeadlock() {
        const graph = {};
        const blocked = state.processes.filter(process => process.state === 'blocked' && process.waitingFor.length && !process.aborted);

        blocked.forEach(process => {
            graph[process.id] = process.waitingFor.filter(waiter => state.processes.some(item => item.id === waiter && !item.aborted));
        });

        const visited = new Set();
        const stack = new Set();
        let cycle = [];

        function dfs(node, path) {
            visited.add(node);
            stack.add(node);
            path.push(node);

            const neighbors = graph[node] || [];
            for (const neighbor of neighbors) {
                if (!visited.has(neighbor)) {
                    if (dfs(neighbor, path)) {
                        return true;
                    }
                } else if (stack.has(neighbor)) {
                    const startIndex = path.indexOf(neighbor);
                    cycle = path.slice(startIndex).concat(neighbor);
                    return true;
                }
            }

            path.pop();
            stack.delete(node);
            return false;
        }

        Object.keys(graph).some(node => !visited.has(node) && dfs(node, []));

        return {
            deadlocked: cycle.length > 0,
            cycle,
            participants: [...new Set(cycle)]
        };
    }

    function computeBankerState() {
        return computeBankerStateFor(
            state.processes.map(process => ({
                ...process,
                currentAllocation: cloneMap(process.currentAllocation),
                maxDemand: cloneMap(process.maxDemand)
            })),
            state.resources.map(resource => ({ ...resource }))
        );
    }

    function isSafeToGrant(process, requestMap) {
        const processesCopy = state.processes.map(item => ({
            ...item,
            currentAllocation: cloneMap(item.currentAllocation),
            maxDemand: cloneMap(item.maxDemand),
            request: cloneMap(item.request)
        }));
        const resourcesCopy = state.resources.map(resource => ({ ...resource }));
        const target = processesCopy.find(item => item.id === process.id);

        Object.keys(requestMap).forEach(name => {
            target.currentAllocation[name] = (target.currentAllocation[name] || 0) + requestMap[name];
            target.request[name] = 0;
        });

        return computeBankerStateFor(processesCopy, resourcesCopy).safe;
    }

    function computeBankerStateFor(processes, resources) {
        const work = {};
        resources.forEach(resource => {
            const allocated = processes.reduce((sum, process) => {
                if (process.aborted || process.state === 'completed') {
                    return sum;
                }
                return sum + (process.currentAllocation[resource.name] || 0);
            }, 0);
            work[resource.name] = resource.total - allocated;
        });

        const pending = processes.filter(process => !process.aborted && process.state !== 'completed');
        const finish = {};
        const safeSequence = [];

        pending.forEach(process => {
            finish[process.id] = false;
        });

        let progress = true;
        while (progress) {
            progress = false;

            pending.forEach(process => {
                if (finish[process.id]) {
                    return;
                }

                const need = remainingNeedFrom(process);
                const canFinish = Object.keys(need).every(name => need[name] <= (work[name] || 0));
                if (!canFinish) {
                    return;
                }

                finish[process.id] = true;
                safeSequence.push(process.id);
                Object.keys(process.currentAllocation).forEach(name => {
                    work[name] = (work[name] || 0) + process.currentAllocation[name];
                });
                progress = true;
            });
        }

        return {
            safe: pending.every(process => finish[process.id]),
            safeSequence
        };
    }

    function remainingNeedFrom(process) {
        const need = {};
        const names = new Set([...Object.keys(process.maxDemand || {}), ...Object.keys(process.currentAllocation || {})]);
        names.forEach(name => {
            need[name] = Math.max((process.maxDemand[name] || 0) - (process.currentAllocation[name] || 0), 0);
        });
        return need;
    }

    function availableUnits(resourceName) {
        const resource = state.resources.find(item => item.name === resourceName);
        if (!resource) {
            return 0;
        }

        const allocated = state.processes.reduce((sum, process) => {
            if (process.aborted || process.state === 'completed') {
                return sum;
            }
            return sum + (process.currentAllocation[resourceName] || 0);
        }, 0);

        return resource.total - allocated;
    }

    function outstandingNeed(process) {
        const need = {};
        Object.keys(process.request || {}).forEach(name => {
            if ((process.request[name] || 0) > 0) {
                need[name] = process.request[name];
            }
        });
        return need;
    }

    function holdersForResources(resourceNames, requesterId) {
        const holders = new Set();
        state.processes.forEach(process => {
            if (process.id === requesterId || process.aborted || process.state === 'completed') {
                return;
            }
            resourceNames.forEach(name => {
                if ((process.currentAllocation[name] || 0) > 0) {
                    holders.add(process.id);
                }
            });
        });
        return [...holders];
    }

    function holdersOfSharedTarget(targetName, requesterId) {
        return state.processes
            .filter(process => process.id !== requesterId && !process.aborted && process.state === 'running' && process.sharedTarget === targetName)
            .map(process => process.id);
    }

    function allocatedUnits(process) {
        return Object.values(process.currentAllocation).reduce((sum, value) => sum + value, 0);
    }

    function recordTimeline(processId, color, resourceName) {
        state.timeline.push({
            tick: state.tick,
            processId,
            color,
            resourceName
        });
    }

    function resetSimulation() {
        stopRunLoop();
        state.tick = 0;
        state.timeline = [];
        state.logs = [];
        state.safeSequence = [];

        state.processes.forEach(process => {
            process.currentAllocation = cloneMap(process.initialAllocation);
            process.request = cloneMap(process.initialRequest);
            process.state = 'ready';
            process.remainingTime = process.criticalDuration;
            process.waitingFor = [];
            process.completedAt = null;
            process.aborted = false;
        });

        logEvent('Simulation reset to the initial dependency state.');
        render();
    }

    function clearEverything() {
        stopRunLoop();
        state.resources = [];
        state.processes = [];
        state.tick = 0;
        state.timeline = [];
        state.logs = [];
        state.safeSequence = [];
        state.nextProcessNumber = 1;
        state.nextColorIndex = 0;
        clearProcessInputs();
        els.resourceName.value = '';
        render();
    }

    function loadResourceSample() {
        if (state.resources.length) {
            return;
        }
        addResource({ name: 'FileA', type: 'file', total: 1 });
        addResource({ name: 'FileB', type: 'file', total: 1 });
        addResource({ name: 'Memory1', type: 'memory', total: 2 });
    }

    function loadDeadlockScenario() {
        stopRunLoop();
        clearEverything();
        addResource({ name: 'FileA', type: 'file', total: 1 });
        addResource({ name: 'FileB', type: 'file', total: 1 });
        addResource({ name: 'Memory1', type: 'memory', total: 1 });

        addProcess({
            id: 'P1',
            criticalDuration: 2,
            allocation: { FileA: 1 },
            request: { FileB: 1 },
            maxDemand: { FileA: 1, FileB: 1 },
            sharedTarget: 'FileA'
        });

        addProcess({
            id: 'P2',
            criticalDuration: 2,
            allocation: { FileB: 1 },
            request: { FileA: 1 },
            maxDemand: { FileA: 1, FileB: 1 },
            sharedTarget: 'FileB'
        });

        logEvent('Loaded the classic circular-wait deadlock scenario.');
        render();
    }

    function handleProcessTableClick(event) {
        const button = event.target.closest('button[data-action]');
        if (!button) {
            return;
        }

        const row = button.closest('tr[data-id]');
        if (!row) {
            return;
        }

        const processId = row.dataset.id;
        state.processes = state.processes.filter(process => process.id !== processId);
        logEvent(`${processId} removed from the scenario.`);
        render();
    }

    function render() {
        renderStats();
        renderResources();
        renderProcesses();
        renderWaitGraph();
        renderTimeline();
        renderLogs();
    }

    function renderStats() {
        const deadlockInfo = detectDeadlock();
        const banker = computeBankerState();
        state.safeSequence = banker.safeSequence;

        els.statProcesses.textContent = String(state.processes.length);
        els.statBlocked.textContent = String(state.processes.filter(process => process.state === 'blocked').length);
        els.statDeadlock.textContent = deadlockInfo.deadlocked ? 'Deadlocked' : (banker.safe ? 'Safe' : 'Unsafe');
        els.deadlockSubtext.textContent = deadlockInfo.deadlocked
            ? `Cycle found: ${deadlockInfo.cycle.join(' -> ')}`
            : state.detectionMode === 'banker'
                ? (banker.safe ? 'Requests keep the system in a safe state' : 'Unsafe requests are being deferred')
                : 'No circular wait detected';
        els.statSequence.textContent = banker.safeSequence.length ? banker.safeSequence.join(' -> ') : '-';
    }

    function renderResources() {
        if (!state.resources.length) {
            els.resourceCards.className = 'resource-cards empty-message';
            els.resourceCards.textContent = 'Add resources to simulate files, memory blocks, or shared devices.';
            return;
        }

        els.resourceCards.className = 'resource-cards';
        els.resourceCards.innerHTML = state.resources.map(resource => {
            const available = availableUnits(resource.name);
            return `
                <article class="resource-card">
                    <div>
                        <span class="resource-name">${resource.name}</span>
                        <span class="resource-type">${resource.type}</span>
                    </div>
                    <div class="resource-metrics">
                        <strong>${available}/${resource.total}</strong>
                        <small>available units</small>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderProcesses() {
        if (!state.processes.length) {
            els.processTableBody.innerHTML = '<tr class="empty-row"><td colspan="7">No processes yet. Add a dependent process to begin.</td></tr>';
            return;
        }

        els.processTableBody.innerHTML = state.processes.map(process => `
            <tr data-id="${process.id}">
                <td><span class="pid-badge" style="--pid-color:${process.color}">${process.id}</span></td>
                <td>${formatMap(process.currentAllocation)}</td>
                <td>${formatMap(process.request)}</td>
                <td>${formatMap(process.maxDemand)}</td>
                <td>${process.sharedTarget}</td>
                <td><span class="state-pill state-${process.state}">${process.state}</span></td>
                <td><button class="table-action" data-action="remove">Remove</button></td>
            </tr>
        `).join('');
    }

    function renderWaitGraph() {
        const deadlockInfo = detectDeadlock();
        const blocked = state.processes.filter(process => process.state === 'blocked' && process.waitingFor.length);

        if (!blocked.length) {
            els.waitGraph.className = 'graph-box empty-message';
            els.waitGraph.textContent = 'The wait-for graph will appear when processes block each other.';
            return;
        }

        els.waitGraph.className = 'graph-box';
        els.waitGraph.innerHTML = blocked.map(process => `
            <div class="graph-edge ${deadlockInfo.participants.includes(process.id) ? 'graph-edge-deadlocked' : ''}">
                <strong>${process.id}</strong>
                <span>waits for</span>
                <span>${process.waitingFor.join(', ')}</span>
            </div>
        `).join('');
    }

    function renderTimeline() {
        if (!state.timeline.length) {
            els.timeline.className = 'timeline empty-message';
            els.timeline.textContent = 'Run the simulator to visualize critical-section access over time.';
            return;
        }

        els.timeline.className = 'timeline';
        els.timeline.innerHTML = state.timeline.map(entry => `
            <div class="timeline-chip" style="--chip-color:${entry.color}">
                <span>${entry.processId}</span>
                <small>t${entry.tick} · ${entry.resourceName}</small>
            </div>
        `).join('');
    }

    function renderLogs() {
        if (!state.logs.length) {
            els.eventLog.className = 'log-panel empty-message';
            els.eventLog.textContent = 'The simulator will log synchronization decisions, deadlock checks, and resolutions here.';
            return;
        }

        els.eventLog.className = 'log-panel';
        els.eventLog.innerHTML = state.logs.slice().reverse().map(log => `
            <div class="log-entry ${log.emphasis ? 'log-entry-emphasis' : ''}">
                <span class="log-tick">t${log.tick}</span>
                <p>${log.message}</p>
            </div>
        `).join('');
    }

    function logEvent(message, emphasis = false) {
        const last = state.logs[state.logs.length - 1];
        if (last && last.message === message && last.tick === state.tick) {
            return;
        }
        state.logs.push({ tick: state.tick, message, emphasis });
    }

    function clearProcessInputs() {
        els.processName.value = '';
        els.criticalDuration.value = 2;
        els.initialAllocation.value = '';
        els.resourceRequest.value = '';
        els.maxDemand.value = '';
        els.sharedTarget.value = '';
    }

    function formatMap(map) {
        const entries = Object.entries(map || {}).filter(([, value]) => value > 0);
        return entries.length ? entries.map(([name, value]) => `${name}:${value}`).join(', ') : 'None';
    }

    function labelForSyncMode() {
        if (state.syncMode === 'mutex') {
            return 'Mutex';
        }
        if (state.syncMode === 'semaphore') {
            return 'Semaphore';
        }
        return 'Critical Section Queue';
    }

    function labelForDetectionMode() {
        return state.detectionMode === 'banker' ? "Banker's Algorithm" : 'detect-and-resolve mode';
    }

    function cloneMap(map) {
        return JSON.parse(JSON.stringify(map || {}));
    }

    function mergeMaps(a, b) {
        const merged = cloneMap(a);
        Object.keys(b || {}).forEach(name => {
            merged[name] = (merged[name] || 0) + b[name];
        });
        return merged;
    }

    function subtractPositive(totalMap, usedMap) {
        const result = {};
        const names = new Set([...Object.keys(totalMap || {}), ...Object.keys(usedMap || {})]);
        names.forEach(name => {
            const value = Math.max((totalMap[name] || 0) - (usedMap[name] || 0), 0);
            if (value > 0) {
                result[name] = value;
            }
        });
        return result;
    }
});
