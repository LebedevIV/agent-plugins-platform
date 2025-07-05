/**
 * Creates a new JSON viewer component.
 * @param {any} jsonData The JSON data to display.
 * @param {HTMLElement} container The container element to render the viewer into.
 */
export function createJsonViewer(jsonData, container) {
    container.innerHTML = '';
    const viewerContainer = document.createElement('div');
    viewerContainer.className = 'json-viewer-container';

    const controls = document.createElement('div');
    controls.className = 'json-viewer-controls';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'json-viewer-search';
    searchInput.placeholder = 'Search...';
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const nodes = viewerContainer.querySelectorAll('.json-viewer-node');
        nodes.forEach(node => {
            const key = node.querySelector('.json-viewer-key')?.textContent.toLowerCase() || '';
            const value = node.querySelector('.json-viewer-value')?.textContent.toLowerCase() || '';
            if (searchTerm && (key.includes(searchTerm) || value.includes(searchTerm))) {
                node.style.backgroundColor = '#2a4a2a';
                node.style.borderRadius = '3px';
                node.style.padding = '2px 4px';
            } else {
                node.style.backgroundColor = '';
                node.style.borderRadius = '';
                node.style.padding = '';
            }
        });
    });

    const switchViewButton = document.createElement('button');
    switchViewButton.textContent = 'Toggle View';
    switchViewButton.addEventListener('click', () => {
        const isCollapsed = contentContainer.querySelector('.json-viewer-children')?.style.display === 'none';
        const toggles = contentContainer.querySelectorAll('.json-viewer-toggle');
        const children = contentContainer.querySelectorAll('.json-viewer-children');
        
        toggles.forEach((toggle, index) => {
            if (children[index]) {
                children[index].style.display = isCollapsed ? '' : 'none';
                toggle.textContent = isCollapsed ? '▼' : '▶';
            }
        });
    });
    
    controls.appendChild(searchInput);
    controls.appendChild(switchViewButton);
    viewerContainer.appendChild(controls);

    const contentContainer = document.createElement('div');
    contentContainer.className = 'json-viewer-content';
    renderJsonNode(jsonData, null, 0, contentContainer);
    viewerContainer.appendChild(contentContainer);
    
    container.appendChild(viewerContainer);
}

/**
 * Recursively renders a JSON node.
 * @param {any} data The data for the current node.
 * @param {string|null} key The key of the current node.
 * @param {number} level The nesting level.
 * @param {HTMLElement} parentElement The parent DOM element.
 */
function renderJsonNode(data, key, level, parentElement) {
    const nodeElement = document.createElement('div');
    nodeElement.className = 'json-viewer-node';
    nodeElement.style.marginLeft = `${level * 20}px`;

    const isObject = typeof data === 'object' && data !== null;
    const isArray = Array.isArray(data);

    const keyElement = document.createElement('span');
    keyElement.className = 'json-viewer-key';
    if (key) {
        keyElement.textContent = `"${key}": `;
    }

    if (isObject) {
        const toggle = document.createElement('span');
        toggle.className = 'json-viewer-toggle';
        toggle.textContent = '▼';
        toggle.addEventListener('click', toggleNode);
        nodeElement.appendChild(toggle);
        
        nodeElement.appendChild(keyElement);
        
        const bracket = document.createElement('span');
        bracket.textContent = isArray ? '[' : '{';
        nodeElement.appendChild(bracket);

        const childrenContainer = document.createElement('div');
        childrenContainer.className = 'json-viewer-children';
        
        Object.keys(data).forEach(childKey => {
            renderJsonNode(data[childKey], childKey, level + 1, childrenContainer);
        });
        nodeElement.appendChild(childrenContainer);

        const closingBracket = document.createElement('div');
        closingBracket.textContent = isArray ? ']' : '}';
        closingBracket.style.marginLeft = `${level * 20}px`;
        nodeElement.appendChild(closingBracket);

    } else {
        nodeElement.appendChild(keyElement);
        const valueElement = document.createElement('span');
        valueElement.className = 'json-viewer-value';
        const type = data === null ? 'null' : typeof data;
        valueElement.classList.add(type);
        valueElement.textContent = JSON.stringify(data);
        nodeElement.appendChild(valueElement);

        const copyButton = document.createElement('button');
        copyButton.className = 'json-viewer-copy-button';
        copyButton.textContent = 'Copy';
        copyButton.addEventListener('click', copyToClipboard);
        nodeElement.appendChild(copyButton);
    }

    parentElement.appendChild(nodeElement);
}

/**
 * Toggles the visibility of a node's children.
 * @param {MouseEvent} event The click event.
 */
function toggleNode(event) {
    const toggle = event.target;
    const childrenContainer = toggle.parentElement.querySelector('.json-viewer-children');
    if (childrenContainer) {
        const isCollapsed = childrenContainer.style.display === 'none';
        childrenContainer.style.display = isCollapsed ? '' : 'none';
        toggle.textContent = isCollapsed ? '▼' : '▶';
    }
}

/**
 * Copies the text content of a value to the clipboard.
 * @param {MouseEvent} event The click event.
 */
function copyToClipboard(event) {
    const button = event.target;
    const valueElement = button.parentElement.querySelector('.json-viewer-value');
    if (valueElement) {
        // Убираем кавычки из строковых значений
        let textToCopy = valueElement.textContent;
        if (textToCopy.startsWith('"') && textToCopy.endsWith('"')) {
            textToCopy = textToCopy.slice(1, -1);
        }
        
        navigator.clipboard.writeText(textToCopy)
            .then(() => {
                const originalText = button.textContent;
                button.textContent = 'Copied!';
                button.style.backgroundColor = '#2a4a2a';
                setTimeout(() => {
                    button.textContent = originalText;
                    button.style.backgroundColor = '';
                }, 1500);
            })
            .catch(err => {
                console.error('Failed to copy text: ', err);
                button.textContent = 'Error!';
                button.style.backgroundColor = '#4a2a2a';
                setTimeout(() => {
                    button.textContent = 'Copy';
                    button.style.backgroundColor = '';
                }, 1500);
            });
    }
}