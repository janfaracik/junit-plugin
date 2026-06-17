const PREFIX = "test-";
const CACHE = {};

document.addEventListener('DOMContentLoaded', () => {
    initializeShowHideLinks();
    tryShowConfetti();
});

function initializeShowHideLinks() {
    document.querySelectorAll('[id$="-showlink"]').forEach(link => {
        link.addEventListener('click', (e) => {
            if (window.innerWidth <= 800) {
                return;
            }

            let link = e.currentTarget;
            const splitView = document.getElementById("junit-test-details");

            if (splitView) {
                e.preventDefault();
                showTestDetails(link, splitView);
                return;
            }

            e.preventDefault();

            const id = link.id.replace(/-showlink$/, '');
            link.classList.toggle("active")

            const table = link.closest("table tbody");
            const tableRow = link.closest("tr");
            let nextRow = tableRow.nextElementSibling;

            // Create the row if it doesn't exist
            if (nextRow == null || nextRow.dataset.type === 'test-row') {
                const nextRow = document.createElement("tr");
                const td = document.createElement("td");
                td.colSpan = 10;
                td.textContent = "Loading";
                nextRow.appendChild(td);
                nextRow.dataset.type = "foldout-row";
                table.insertBefore(nextRow, tableRow.nextSibling);

                const summaryUrl = new URL(`${id.replace(PREFIX, '')}summary`, document.URL);
                loadContent(td, summaryUrl);
            } else {
                nextRow.remove();
            }

            tryEnableSortheader();
        });
    });
}

function showTestDetails(link, element) {
    document.querySelectorAll('[id$="-showlink"].active').forEach(activeLink => {
        activeLink.classList.remove("active");
    });

    link.classList.add("active");
    element.textContent = "Loading";

    const id = link.id.replace(/-showlink$/, '');
    const summaryUrl = new URL(`${id.replace(PREFIX, '')}summary`, document.URL);
    loadContent(element, summaryUrl);
}

function loadContent(element, query) {
    const cacheKey = query.toString();

    function setInnerHTML() {
        element.innerHTML = CACHE[cacheKey];
        element.querySelectorAll("code").forEach(code => {
            Prism.highlightElement(code);
        })
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

function tryEnableSortheader() {
    const hasFoldouts = document.querySelectorAll("[data-type='foldout-row']").length > 0;

    document.querySelectorAll(".sortheader").forEach(link => {
        link.style.pointerEvents = hasFoldouts ? "none" : "unset";
    })
}
