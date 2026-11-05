/*
 * The report's search bar and filter menu. Each filter item turns a status's tests on or off in the list, loading them
 * the first time they're turned on, and the search hides the tests whose full name doesn't contain what's typed.
 */
(function () {
    const ACTIVE = 'jp-filter-item--active';
    // Set once the filters or search are changed, so an empty list before then isn't reported as having no matches
    let changed = false;

    // The menu is built when it's first opened, so its items are handled here rather than when the page loads
    document.addEventListener('click', (e) => {
        const item = e.target.closest('.jp-filter-item');
        if (!item) {
            return;
        }

        e.preventDefault();
        const on = item.classList.toggle(ACTIVE);
        item.setAttribute('aria-pressed', String(on));
        changed = true;

        const list = document.querySelector(`.jp-test-list[data-status="${item.id.replace('jp-filter-', '')}"]`);
        if (list) {
            list.hidden = !on;
            if (on) {
                load(list);
            }
        }
        applySearch();
    });

    document.addEventListener('input', (e) => {
        if (e.target.matches('.jp-search .jenkins-search__input')) {
            changed = true;
            applySearch();
        }
    });

    function load(list) {
        if (!list.dataset.lazyUrl || list.dataset.loaded || list.dataset.loading) {
            return;
        }

        list.dataset.loading = 'true';
        fetch(list.dataset.lazyUrl)
            .then((rsp) => {
                if (!rsp.ok || rsp.redirected) {
                    throw new Error(rsp.statusText);
                }
                return rsp.text();
            })
            .then((html) => {
                delete list.dataset.loading;
                // e.g. a login page after the session expired, rather than the list
                const template = document.createElement('template');
                template.innerHTML = html;
                const content = template.content.querySelector('.jp-test-list__content');
                if (!content) {
                    throw new Error('Unexpected response');
                }
                list.replaceChildren(content);
                list.dataset.loaded = 'true';
                Behaviour.applySubtree(list, true);
                applySearch();
            })
            .catch(() => {
                delete list.dataset.loading;
                // turning it off and on again tries once more
                list.textContent = list.dataset.errorText;
            });
    }

    function applySearch() {
        const input = document.querySelector('.jp-search .jenkins-search__input');
        const query = input ? input.value.trim().toLowerCase() : '';
        let anyShown = false;

        document.querySelectorAll('.jp-test-list').forEach((list) => {
            list.querySelectorAll('.jp-test-group').forEach((group) => {
                let groupShown = false;
                group.querySelectorAll('.task[data-search]').forEach((task) => {
                    const shown = task.dataset.search.toLowerCase().includes(query);
                    task.hidden = !shown;
                    groupShown = groupShown || shown;
                });
                group.hidden = !groupShown;
                anyShown = anyShown || (groupShown && !list.hidden);
            });
        });

        const empty = document.querySelector('.jp-test-lists__empty');
        if (empty) {
            // Lists still loading would show matches shortly, so wait for them
            const loading = document.querySelector('.jp-test-list:not([hidden])[data-loading]');
            empty.hidden = anyShown || loading != null || !changed;
        }
    }
})();
