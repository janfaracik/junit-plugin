/*
 * The report's search bar and filter menu. Each filter item turns a status's tests on or off in the list, loading them
 * the first time they're turned on, and the search hides the tests whose full name doesn't contain what's typed.
 */
(function () {
    // Core's classes for its build history filter, so the menu looks and behaves the same
    const MUTED = 'jenkins-search__filter-item--muted';
    // Set once the filters or search are changed, so an empty list before then isn't reported as having no matches
    let changed = false;

    document.addEventListener('DOMContentLoaded', () => {
        const button = document.querySelector('.jp-filter-button');
        if (!button) {
            return;
        }

        // What the page shows to begin with (failures), which Reset goes back to
        const initial = new Set(
            Array.from(document.querySelectorAll('.jp-test-list:not([hidden])'), (list) => list.dataset.status));
        let selected = new Set(initial);

        // The menu is built the first time it's opened and appended to the button's parent, so delegate from there
        const dropdown = button.parentElement;

        function statusOf(item) {
            return item.id.replace('jp-filter-', '');
        }

        function render() {
            const filtered = selected.size !== initial.size || [...selected].some((status) => !initial.has(status));

            dropdown.querySelectorAll('.jp-filter-item').forEach((item) => {
                const isSelected = selected.has(statusOf(item));
                item.classList.toggle(MUTED, selected.size > 0 && !isSelected);
                item.setAttribute('aria-pressed', String(isSelected));
            });

            const reset = dropdown.querySelector('.jp-filter-reset');
            if (reset) {
                reset.classList.toggle('jenkins-hidden', !filtered);
            }

            button.classList.toggle('jenkins-button--tertiary', !filtered);
            button.classList.toggle('jenkins-!-accent-color', filtered);

            document.querySelectorAll('.jp-test-list[data-status]').forEach((list) => {
                list.hidden = !selected.has(list.dataset.status);
                if (!list.hidden) {
                    load(list);
                }
            });
            applySearch();
        }

        dropdown.addEventListener('click', (e) => {
            const item = e.target.closest('.jp-filter-item, .jp-filter-reset');
            if (!item) {
                return;
            }

            // Dropdowns close on any click outside of their trigger, which is no use for a filter you pick several
            // values from, so keep this one open
            e.stopPropagation();
            changed = true;

            if (item.classList.contains('jp-filter-reset')) {
                selected = new Set(initial);
            } else if (selected.has(statusOf(item))) {
                selected.delete(statusOf(item));
            } else {
                selected.add(statusOf(item));
            }
            render();
        });

        // The items only exist once the menu has been opened, so set their state as soon as they do
        const observer = new MutationObserver(() => {
            if (dropdown.querySelector('.jp-filter-item')) {
                render();
                observer.disconnect();
            }
        });
        observer.observe(dropdown, {childList: true, subtree: true});
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
