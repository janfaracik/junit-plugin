const CACHE = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeLazySections();
    tryShowConfetti();
});

/**
 * The link to the test result of the test table row that the target is in, if any
 */
function testLinkFor(target) {
    return target.closest('tr.jp-test-row--linked')?.querySelector('a.jp-table-row');
}

// Clicking a test row, anywhere but its other links and buttons, shows its test result in the panel. One delegated
// listener, so it covers tables loaded later too
document.addEventListener('click', (e) => {
    const link = testLinkFor(e.target);
    const control = e.target.closest('a, button, input');
    if (!link || (control && control !== link)) {
        return;
    }

    // Leave modifier clicks (e.g. ctrl/cmd-click for a new tab) to the browser, and don't interrupt text selection
    if (e.button !== 0 || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey ||
        (!control && !window.getSelection().isCollapsed)) {
        return;
    }

    // On pages without the panel, the row goes to the test result's page
    if (!document.getElementById('jp-test-panel-template')) {
        if (!control) {
            link.click();
        }
        return;
    }

    e.preventDefault();
    togglePanel(link);
});

function initializeLazySections() {
    document.querySelectorAll('details[data-lazy-url]').forEach(details => {
        details.addEventListener('toggle', () => {
            if (!details.open || details.dataset.loaded) {
                return;
            }
            details.dataset.loaded = 'true';
            const content = details.querySelector('.jp-lazy-content');
            fetchHtml(details.dataset.lazyUrl)
                .then(html => {
                    // e.g. a page other than the table
                    const template = document.createElement('template');
                    template.innerHTML = html;
                    if (!template.content.querySelector('table')) {
                        throw new Error('Unexpected response');
                    }
                    content.replaceChildren(template.content);
                    Behaviour.applySubtree(content, true);
                })
                .catch(() => {
                    // allow another attempt the next time the section is opened
                    delete details.dataset.loaded;
                    content.textContent = details.dataset.errorText;
                });
        });
    });
}

/**
 * Fetches a page fragment, failing on errors and redirects, e.g. to the login page once the session has expired
 */
function fetchHtml(url) {
    return fetch(url).then(rsp => {
        if (!rsp.ok || rsp.redirected) {
            throw new Error(rsp.statusText);
        }
        return rsp.text();
    });
}

let panel = null;
let activeLink = null;

/**
 * Shows the link's test result in the panel, or closes the panel if it's already showing it
 */
function togglePanel(link) {
    if (link === activeLink && panel.classList.contains('jp-test-panel--open')) {
        closePanel();
        return;
    }

    getPanel();
    setActiveLink(link);

    // the test result's summary is its page without the layout around it
    loadSummary(panel.querySelector('.jp-test-panel__content'), new URL('summary', link.href).toString());

    // slides in from its @starting-style, see styles.css
    panel.classList.add('jp-test-panel--open');
}

function getPanel() {
    if (panel) {
        return panel;
    }

    const template = document.getElementById('jp-test-panel-template');
    panel = template.content.firstElementChild.cloneNode(true);
    document.body.appendChild(panel);

    // the close button is rendered in each test result's header, see test-output.jelly
    panel.addEventListener('click', (e) => {
        if (e.target.closest('.jp-test-panel__close')) {
            closePanel();
        }
    });
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && panel.classList.contains('jp-test-panel--open')) {
            closePanel();
        }
    });

    // Like core's side panel, a click outside it only closes it, unless it's on another test row, which shows that test
    document.addEventListener('click', (e) => {
        if (!panel.classList.contains('jp-test-panel--open') || panel.contains(e.target) ||
            testLinkFor(e.target)) {
            return;
        }
        e.preventDefault();
        e.stopPropagation();
        closePanel();
    }, true);
    return panel;
}

function closePanel() {
    panel.classList.remove('jp-test-panel--open');
    const link = activeLink;
    setActiveLink(null);
    // return focus to the row's link for keyboard users, without scrolling the page
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
        element.scrollTop = 0;
        Prism.highlightAllUnder(element);
        Behaviour.applySubtree(element, true);
    }

    element.dataset.query = query;
    if (CACHE[query]) {
        setInnerHTML();
        return;
    }

    // there's no close button until it loads, but Escape and clicking outside still close it
    element.innerHTML = '<div class="jp-test-panel__loading"><span class="jenkins-spinner"></span></div>';
    fetchHtml(query)
        .then(html => {
            CACHE[query] = html;
            setInnerHTML();
        })
        .catch(() => {
            if (element.dataset.query === query) {
                element.textContent = panel.dataset.errorText;
            }
        });
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
