// This simulator demonstrates the basic concepts of a Lightning Network:
// - Nodes: Participants in the network
// - Channels: Payment channels between nodes
// - Routing: Finding a path to send payments between nodes

const network = document.getElementById('network');
const nodeCountSelect = document.getElementById('nodeCount');
const channelProbabilitySelect = document.getElementById('channelProbability');
const regenerateButton = document.getElementById('regenerate');
const sendPaymentButton = document.getElementById('sendPayment');
const tooltip = document.getElementById('tooltip');

let nodes = [];
let channels = [];

// Generates a random Lightning Network with the specified number of nodes and channel probability
function generateNetwork() {
    network.innerHTML = '';
    nodes = [];
    channels = [];

    const numNodes = parseInt(nodeCountSelect.value);
    const channelProbability = parseFloat(channelProbabilitySelect.value);

    for (let i = 0; i < numNodes; i++) {
        const node = document.createElement('div');
        node.className = 'node';
        node.textContent = String.fromCharCode(65 + i % 26) + (i >= 26 ? Math.floor(i / 26) : '');
        node.style.left = `${Math.random() * 760}px`;
        node.style.top = `${Math.random() * 560}px`;
        network.appendChild(node);
        nodes.push(node);
    }

    for (let i = 0; i < numNodes; i++) {
        for (let j = i + 1; j < numNodes; j++) {
            if (Math.random() < channelProbability) {
                const channel = document.createElement('div');
                channel.className = 'channel';
                network.appendChild(channel);
                const capacity = generateCapacity();
                const channelClass = getChannelClass(capacity);
                channel.classList.add(channelClass);
                channels.push({element: channel, start: i, end: j, capacity: capacity});

                channel.addEventListener('mouseenter', (e) => showTooltip(e, capacity));
                channel.addEventListener('mouseleave', hideTooltip);
            }
        }
    }

    updateChannels();
    populateNodeDropdowns();
}

// Simulates the random capacity of a payment channel
function generateCapacity() {
    const capacities = [
        5000000, 10000000, 20000000, 30000000, 40000000, 50000000,
        60000000, 70000000, 80000000, 90000000, 100000000, 200000000
    ];
    return capacities[Math.floor(Math.random() * capacities.length)];
}

function formatCapacity(sats) {
    if (sats >= 100000000) {
        return (sats / 100000000).toFixed(2) + " BTC";
    } else {
        return (sats / 1000000).toFixed(2) + "m sats";
    }
}

function updateChannels() {
    channels.forEach(channel => {
        const start = nodes[channel.start].getBoundingClientRect();
        const end = nodes[channel.end].getBoundingClientRect();
        const dx = end.left - start.left;
        const dy = end.top - start.top;
        const length = Math.sqrt(dx*dx + dy*dy);
        const angle = Math.atan2(dy, dx) * 180 / Math.PI;
        
        const minWidth = 1;
        const maxWidth = 10;
        const minCapacity = 5000000; // 5m sats
        const maxCapacity = 200000000; // 2 BTC
        
        const logWidth = Math.log(channel.capacity / minCapacity) / Math.log(maxCapacity / minCapacity);
        const width = minWidth + (maxWidth - minWidth) * logWidth;
        
        channel.element.style.width = `${length}px`;
        channel.element.style.height = `${width}px`;
        channel.element.style.left = `${start.left - network.offsetLeft + 15}px`;
        channel.element.style.top = `${start.top - network.offsetTop + 15}px`;
        channel.element.style.transform = `rotate(${angle}deg)`;
    });
}

function showTooltip(event, capacity) {
    tooltip.textContent = `Capacity: ${formatCapacity(capacity)}`;
    tooltip.style.left = `${event.pageX + 10}px`;
    tooltip.style.top = `${event.pageY + 10}px`;
    tooltip.style.opacity = 1;
}

function hideTooltip() {
    tooltip.style.opacity = 0;
}

function populateNodeDropdowns() {
    const senderSelect = document.getElementById('senderNode');
    const receiverSelect = document.getElementById('receiverNode');
    senderSelect.innerHTML = '';
    receiverSelect.innerHTML = '';
    
    nodes.forEach((node, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.textContent = node.textContent;
        senderSelect.appendChild(option.cloneNode(true));
        receiverSelect.appendChild(option);
    });
}

function getChannelClass(capacity) {
    if (capacity < 20000000) return 'small';
    if (capacity < 50000000) return 'medium';
    return 'large';
}

// Implements a simple pathfinding algorithm to route payments through the network
function findPathWithCapacity(start, end, amount) {
    const visited = new Set();
    const queue = [[start]];
    
    while (queue.length > 0) {
        const path = queue.shift();
        const node = path[path.length - 1];
        
        if (node === end) {
            // Check if all channels in the path have sufficient capacity
            const isPathValid = path.every((node, index) => {
                if (index === path.length - 1) return true;
                const channel = channels.find(c => 
                    (c.start === node && c.end === path[index + 1]) || 
                    (c.end === node && c.start === path[index + 1])
                );
                return channel && channel.capacity >= amount;
            });
            
            if (isPathValid) return path;
        }
        
        if (!visited.has(node)) {
            visited.add(node);
            const neighbors = channels
                .filter(c => (c.start === node || c.end === node) && c.capacity >= amount)
                .map(c => c.start === node ? c.end : c.start);
            
            for (const neighbor of neighbors) {
                queue.push([...path, neighbor]);
            }
        }
    }
    
    return [];
}

function highlightPath(path) {
    path.forEach((nodeIndex, i) => {
        if (i < path.length - 1) {
            const channel = channels.find(c => 
                (c.start === nodeIndex && c.end === path[i + 1]) || 
                (c.end === nodeIndex && c.start === path[i + 1])
            );
            if (channel) {
                channel.element.classList.add('highlighted');
            }
        }
        nodes[nodeIndex].classList.add('highlighted');
    });
}

function clearHighlights() {
    channels.forEach(channel => channel.element.classList.remove('highlighted'));
    nodes.forEach(node => node.classList.remove('highlighted'));
}

// Simulates and visualizes a payment being routed through the network
function animateTransaction() {
    const senderIndex = parseInt(document.getElementById('senderNode').value);
    const receiverIndex = parseInt(document.getElementById('receiverNode').value);
    const paymentAmount = parseInt(document.getElementById('paymentAmount').value);

    if (senderIndex === receiverIndex) {
        alert("Sender and receiver must be different nodes.");
        return;
    }

    const path = findPathWithCapacity(senderIndex, receiverIndex, paymentAmount);
    if (path.length === 0) {
        alert(`No path found for the payment of ${formatCapacity(paymentAmount)}. Try a smaller amount or choose different nodes.`);
        return;
    }

    clearHighlights();
    highlightPath(path);

    const transaction = document.createElement('div');
    transaction.className = 'transaction';
    network.appendChild(transaction);

    let step = 0;
    function animate() {
        if (step >= path.length - 1) {
            transaction.remove();
            alert(`Payment of ${formatCapacity(paymentAmount)} successfully sent from Node ${nodes[senderIndex].textContent} to Node ${nodes[receiverIndex].textContent}`);
            return;
        }

        const startNode = nodes[path[step]];
        const endNode = nodes[path[step + 1]];
        const start = startNode.getBoundingClientRect();
        const end = endNode.getBoundingClientRect();
        const startX = start.left - network.offsetLeft + 15;
        const startY = start.top - network.offsetTop + 15;
        const endX = end.left - network.offsetLeft + 15;
        const endY = end.top - network.offsetTop + 15;

        transaction.style.display = 'block';
        transaction.style.left = `${startX}px`;
        transaction.style.top = `${startY}px`;

        const duration = 1000;
        const startTime = Date.now();

        function moveTransaction() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const x = startX + (endX - startX) * progress;
            const y = startY + (endY - startY) * progress;
            transaction.style.left = `${x}px`;
            transaction.style.top = `${y}px`;

            if (progress < 1) {
                requestAnimationFrame(moveTransaction);
            } else {
                step++;
                animate();
            }
        }

        moveTransaction();
    }

    animate();
}

regenerateButton.addEventListener('click', generateNetwork);
sendPaymentButton.addEventListener('click', animateTransaction);

// Initial network generation
generateNetwork();
