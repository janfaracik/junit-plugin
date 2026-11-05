const PREFIX = "test-";
const CACHE = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeShowHideLinks(document);
    initializeLazySections();
    tryShowConfetti();
});

function initializeShowHideLinks(root) {
    root.querySelectorAll('[id$="-showlink"]').forEach(link => {
        link.addEventListener('click', (e) => {
            // On small screens, and on pages without the panel, the link goes to the test result's page
            if (window.innerWidth <= 800 || !document.getElementById('jp-test-panel-template')) {
                return;
            }

            // Let the browser handle modifier clicks, e.g. ctrl/cmd-click to open in a new tab
            if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) {
                return;
            }

            e.preventDefault();
            togglePanel(e.currentTarget);
        });

        // The rest of the row opens it too, apart from its own links and buttons, or when selecting its text
        const row = link.closest('tr[data-type="test-row"]');
        if (row) {
            row.classList.add('jp-test-row--clickable');
            row.addEventListener('click', (e) => {
                if (e.target.closest('a, button, input') || window.getSelection().toString()) {
                    return;
                }
                link.click();
            });
        }
    });
}

function initializeLazySections() {
    document.querySelectorAll('details[data-lazy-url]').forEach(details => {
        details.addEventListener('toggle', () => {
            if (!details.open || details.dataset.loaded) {
                return;
            }
            details.dataset.loaded = 'true';
            const content = details.querySelector('.jp-lazy-content');
            fetch(details.dataset.lazyUrl)
                .then(rsp => {
                    if (!rsp.ok || rsp.redirected) {
                        throw new Error(rsp.statusText);
                    }
                    return rsp.text();
                })
                .then(html => {
                    // e.g. a login page after the session expired, rather than the table
                    const template = document.createElement('template');
                    template.innerHTML = html;
                    if (!template.content.querySelector('table')) {
                        throw new Error('Unexpected response');
                    }
                    content.replaceChildren(template.content);
                    Behaviour.applySubtree(content, true);
                    initializeShowHideLinks(content);
                })
                .catch(() => {
                    // allow another attempt the next time the section is opened
                    delete details.dataset.loaded;
                    content.textContent = details.dataset.errorText;
                });
        });
    });
}

let panel = null;
// The panel's own buttons, which move into each test result's app bar once it has loaded
let panelControls = null;
let activeLink = null;

/**
 * Shows the test result of the row's link in the panel at the side of the page, or closes the panel if it's
 * already showing it
 */
function togglePanel(link) {
    if (link === activeLink && panel && panel.classList.contains('jp-test-panel--open')) {
        closePanel();
        return;
    }

    const opened = getPanel();
    setActiveLink(link);
    opened.querySelector('.jp-test-panel__open').href = link.href;

    const content = opened.querySelector('.jp-test-panel__content');
    const id = link.id.replace(/-showlink$/, '');
    const summaryUrl = new URL(`${id.replace(PREFIX, '')}summary`, document.URL).toString();
    loadSummary(content, summaryUrl);

    opened.hidden = false;
    // lay it out first, so it animates in rather than appearing
    void opened.offsetWidth;
    opened.classList.add('jp-test-panel--open');
}

function getPanel() {
    if (panel) {
        return panel;
    }

    const template = document.getElementById('jp-test-panel-template');
    panel = template.content.firstElementChild.cloneNode(true);
    // hidden until it's first opened, so it doesn't animate out when the page loads
    panel.hidden = true;
    document.body.appendChild(panel);
    Behaviour.applySubtree(panel, true);

    panelControls = panel.querySelector('.jp-test-panel__controls');
    panel.querySelector('.jp-test-panel__close').addEventListener('click', closePanel);
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panel.classList.contains('jp-test-panel--open')) {
            closePanel();
        }
    });
    return panel;
}

function closePanel() {
    if (!panel) {
        return;
    }
    panel.classList.remove('jp-test-panel--open');
    const link = activeLink;
    setActiveLink(null);
    // give focus back to where it came from, for keyboard users, without scrolling the page while it closes
    if (link && panel.contains(document.activeElement)) {
        link.focus({preventScroll: true});
    }
}

function setActiveLink(link) {
    if (activeLink) {
        activeLink.closest('tr')?.classList.remove('jp-test-row--active');
    }
    activeLink = link;
    if (link) {
        link.closest('tr')?.classList.add('jp-test-row--active');
    }
}

function loadSummary(element, query) {
    function setInnerHTML() {
        // the panel may have moved on to another test while this one loaded
        if (element.dataset.query !== query) {
            return;
        }
        element.innerHTML = CACHE[query];
        placeControls(element);
        element.scrollTop = 0;
        element.querySelectorAll("code").forEach(code => {
            Prism.highlightElement(code);
        });
        Behaviour.applySubtree(element, true);
    }

    element.dataset.query = query;
    if (CACHE[query]) {
        setInnerHTML();
        return;
    }

    element.innerHTML = '<span class="jenkins-spinner"></span>';
    placeControls(element);
    fetch(query)
        .then(rsp => {
            if (!rsp.ok) {
                throw new Error(rsp.statusText);
            }
            return rsp.text();
        })
        .then(html => {
            CACHE[query] = html;
            setInnerHTML();
        })
        .catch(() => {
            if (element.dataset.query === query) {
                element.textContent = panel.dataset.errorText;
                placeControls(element);
            }
        });
}

/**
 * Puts the panel's buttons in the test result's app bar, or at the top of the panel while there's no test result to
 * show, e.g. while it loads
 */
function placeControls(content) {
    const slot = content.querySelector('.jp-test-panel__controls-slot');
    if (slot) {
        slot.append(panelControls);
    } else {
        panel.prepend(panelControls);
    }
}

function tryShowConfetti() {
    const canvas = document.getElementById('confetti-canvas');

    if (canvas) {
        canvas.confetti = canvas.confetti || confetti.create(canvas, { resize: true });

        const defaults = {
            startVelocity: 20,
            spread: 80,
            ticks: 200,
            zIndex: 0,
            particleCount: 10,
            disableForReducedMotion: true
        };

        function randomInRange(min, max) {
            return Math.random() * (max - min) + min;
        }

        function conf() {
            const confettiOptions = Object.assign({}, defaults, {
                origin: { x: randomInRange(0, 1), y: -0.1 }
            });

            canvas.confetti(confettiOptions);
        }

        setInterval(conf, 200);
        conf();
    }
}
