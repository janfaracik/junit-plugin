const PREFIX = "test-";
const CACHE = {};

document.addEventListener('DOMContentLoaded', () => {
    tryShowConfetti();
});

document.addEventListener('click', (e) => {
    const link = e.target.closest('[id$="-showlink"]');
    if (!link || window.innerWidth <= 800) {
        return;
    }

    const splitView = document.getElementById("junit-test-details");
    if (!splitView) {
        return;
    }

    e.preventDefault();
    showTestDetails(link, splitView);
});

function showTestDetails(link, element) {
    document.querySelectorAll('[id$="-showlink"].active, [id$="-showlink"].task-link--active').forEach(activeLink => {
        activeLink.classList.remove("active");
        activeLink.classList.remove("task-link--active");
    });

    link.classList.add("active");
    link.classList.add("task-link--active");

    const summaryUrl = getSummaryUrl(link);
    loadContent(element, summaryUrl);
}

function getSummaryUrl(link) {
    const url = new URL(link.href, document.URL);
    url.search = '';
    url.hash = '';

    if (!url.pathname.endsWith('/')) {
        url.pathname += '/';
    }

    url.pathname += 'summary';
    return url;
}

function loadContent(element, query) {
    const cacheKey = query.toString();

    function setInnerHTML() {
        element.innerHTML = CACHE[cacheKey];
        Prism.highlightAll();
        Behaviour.applySubtree(element);
    }

    if (CACHE[cacheKey]) {
        setInnerHTML();
        return;
    }

    let rqo = new XMLHttpRequest();
    rqo.open('GET', query, true);
    rqo.onreadystatechange = function() {
        if (rqo.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        CACHE[cacheKey] = rqo.responseText;
        setInnerHTML();
    }
    rqo.send(null);
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
