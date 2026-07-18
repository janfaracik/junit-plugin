const TREE_CACHE = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeLazyTestTree(document);
});

document.addEventListener('click', (e) => {
    const link = e.target.closest('[data-test-tree-link="true"]');
    if (link) {
        e.stopPropagation();
    }
});

function initializeLazyTestTree(root) {
    root.querySelectorAll('.jp-test-tree__node[data-tree-path]').forEach((node) => {
        if (node.dataset.treeInitialized === 'true') {
            return;
        }

        node.dataset.treeInitialized = 'true';
        node.addEventListener('toggle', () => {
            if (!node.open || node.dataset.treeLoaded === 'true' || node.dataset.treeLoading === 'true') {
                return;
            }

            loadTreeChildren(node);
        });
    });
}

function loadTreeChildren(node) {
    const childrenUrl = getTreeChildrenUrl(node.dataset.treePath);
    const container = node.querySelector('.jp-test-tree__children');
    if (!childrenUrl || !container) {
        return;
    }

    node.dataset.treeLoading = 'true';
    container.innerHTML = '<div class="jp-test-tree__loading">Loading...</div>';

    function setInnerHTML(html) {
        container.innerHTML = normalizeFragmentUrls(html, childrenUrl);
        node.dataset.treeLoaded = 'true';
        delete node.dataset.treeLoading;
        Behaviour.applySubtree(container);
        initializeLazyTestTree(container);
    }

    if (TREE_CACHE[childrenUrl]) {
        setInnerHTML(TREE_CACHE[childrenUrl]);
        return;
    }

    let rqo = new XMLHttpRequest();
    rqo.open('GET', childrenUrl, true);
    rqo.onreadystatechange = function() {
        if (rqo.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (rqo.status < 200 || rqo.status >= 300) {
            container.innerHTML = '<div class="jp-test-tree__loading">Unable to load tests.</div>';
            delete node.dataset.treeLoading;
            return;
        }

        TREE_CACHE[childrenUrl] = rqo.responseText;
        setInnerHTML(rqo.responseText);
    }
    rqo.send(null);
}

function getTreeChildrenUrl(treePath) {
    if (!treePath) {
        return null;
    }

    const url = new URL(document.URL);
    url.search = '';
    url.hash = '';

    if (!url.pathname.endsWith('/')) {
        url.pathname += '/';
    }

    url.pathname += 'treeChildren';
    url.searchParams.set('path', treePath);
    return url.toString();
}

function normalizeFragmentUrls(html, baseUrl) {
    const template = document.createElement('template');
    template.innerHTML = html;

    template.content.querySelectorAll('[src]').forEach((element) => {
        element.setAttribute('src', new URL(element.getAttribute('src'), baseUrl).toString());
    });

    template.content.querySelectorAll('[href]').forEach((element) => {
        const href = element.getAttribute('href');
        if (!href || href.startsWith('#') || href.startsWith('javascript:')) {
            return;
        }
        element.setAttribute('href', new URL(href, baseUrl).toString());
    });

    template.content.querySelectorAll('[xlink\\:href]').forEach((element) => {
        element.setAttribute('xlink:href', new URL(element.getAttribute('xlink:href'), baseUrl).toString());
    });

    return template.innerHTML;
}
