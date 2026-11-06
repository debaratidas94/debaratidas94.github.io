(() => {
  const root = document.getElementById('publicationExplorer');
  if (!root) return;
  const recentData = JSON.parse(root.querySelector('#publicationData').textContent);
  // The home page also embeds the full dataset: Research Focus shows recent work, other views match the Publications page.
  const allDataNode = root.querySelector('#publicationDataAll');
  const allData = allDataNode ? JSON.parse(allDataNode.textContent) : recentData;
  let data, papers, themes, domains, dimensionCategories, focusColors, domainColors, years;
  function useData(next) {
    data = next;
    ({ papers, themes, domains } = data);
    dimensionCategories = { focus: themes, discipline: data.areas, domain: domains };
    focusColors = themes.map(theme => theme.color);
    domainColors = domains.map(domain => domain.color);
    const uniqueYears = papers.map(paper => paper.year);
    years = Array.from({ length: Math.max(...uniqueYears) - Math.min(...uniqueYears) + 1 }, (_, i) => Math.min(...uniqueYears) + i);
  }
  useData(recentData);
  const venueLabels = { conference: 'Conference', journal: 'Journal', workshop: 'Workshop', preprint: 'Preprint', abstract: 'Conference abstract' };
  let categories = themes.map(theme => [theme.tag, theme.label]);
  const categoryColors = ['--cp-link', '--cp-accent', '--cp-success', '--cp-warning', '--cp-text-muted', '--cp-border-strong'];
  let filter = 'all';
  let grouping = 'focus';
  let dimension = 'focus';
  const chart = root.querySelector('#chart');
  const legend = root.querySelector('#legend');
  const list = root.querySelector('#publications');
  const tooltip = root.querySelector('#paperTooltip');
  let activeCircle = null;
  const chartScroll = root.querySelector('.chart-scroll');
  const networkHost = root.querySelector('#domainNetwork');
  let network = null;
  let networkData = null;
  // A discipline picked in the domain network; it filters the list alongside `filter`.
  let areaFocus = null;
  let usingNetwork = false;
  // The domain view draws a network instead of the year chart when there is room for it.
  const networkMode = () => grouping === 'domain' && !!window.PublicationNetwork && !!networkHost
    && root.clientWidth >= window.PublicationNetwork.MIN_WIDTH;
  const treeHost = root.querySelector('#focusTree');
  let tree = null;
  let treeData = null;
  let usingTree = false;
  // The focus view draws a tree instead of the year chart when there is room for it.
  const treeMode = () => grouping === 'focus' && !!window.PublicationFocusTree && !!treeHost
    && root.clientWidth >= window.PublicationFocusTree.MIN_WIDTH;
  // In the tree, a paper belongs only to its main area: the first research_themes entry in the bib.
  const paperCategories = paper => dimension === 'focus' ? (usingTree ? paper.themes.slice(0, 1) : paper.themes)
    : dimension === 'domain' ? paper.domains : paper.areas;
  const matches = paper => (filter === 'all' || paperCategories(paper).includes(filter))
    && (!areaFocus || paper.areas.includes(areaFocus));
  const label = key => categories.find(category => category[0] === key)?.[1] || key;
  const mark = key => {
    const palette = dimension === 'focus' ? focusColors : dimension === 'domain' ? domainColors : categoryColors;
    const color = `var(${palette[categories.findIndex(category => category[0] === key) % palette.length]})`;
    return dimension === 'focus' ? color : `color-mix(in srgb, ${color} 66%, var(--cp-surface))`;
  };
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  function hideDetails() {
    tooltip.hidden = true;
    if (activeCircle) activeCircle.removeAttribute('aria-describedby');
    activeCircle = null;
  }
  function showDetails(paper, circle) {
    hideDetails();
    activeCircle = circle;
    tooltip.replaceChildren(
      element('strong', paper.title, 'tooltip-title'),
      element('span', `${paper.year}. ${paper.publication || venueLabels[paper.venue] || paper.venue}`, 'tooltip-meta')
    );
    tooltip.hidden = false;
    circle.setAttribute('aria-describedby', tooltip.id);
    positionDetails();
  }
  function positionDetails() {
    const rect = activeCircle.getBoundingClientRect();
    if (rect.bottom < 0 || rect.top > window.innerHeight || rect.right < 0 || rect.left > window.innerWidth) {
      hideDetails();
      return;
    }
    const bounds = tooltip.getBoundingClientRect();
    const left = Math.max(12, Math.min(rect.left + (rect.width - bounds.width) / 2, window.innerWidth - bounds.width - 12));
    const above = rect.top - bounds.height - 8;
    const top = Math.max(12, Math.min(above >= 12 ? above : rect.bottom + 8, window.innerHeight - bounds.height - 12));
    tooltip.style.left = `${left}px`;
    tooltip.style.top = `${top}px`;
  }
  function makeCircle(paper) {
    const circle = element('a', undefined, 'paper-circle');
    circle.href = paper.url || `#paper-${paper.key}`;
    if (paper.url) {
      circle.target = '_blank';
      circle.rel = 'noopener noreferrer';
    }
    circle.dataset.key = paper.key;
    circle.setAttribute('aria-label', paper.title);
    const tags = paperCategories(paper);
    const fill = tags.length === 1 ? mark(tags[0]) : `conic-gradient(${tags.map((tag, index) =>
      `${mark(tag)} ${index * 100 / tags.length}% ${(index + 1) * 100 / tags.length}%`).join(', ')})`;
    circle.style.setProperty('--cp-fill', fill);
    circle.classList.toggle('is-muted', !matches(paper));
    circle.addEventListener('pointerenter', () => showDetails(paper, circle));
    circle.addEventListener('focus', () => showDetails(paper, circle));
    ['pointerleave', 'blur'].forEach(event => circle.addEventListener(event, () => {
      if (activeCircle === circle) hideDetails();
    }));
    if (!paper.url) circle.addEventListener('click', () => {
      if (!matches(paper)) {
        filter = 'all';
        render();
      }
    });
    return circle;
  }
  function circleLayout(count) {
    let base = 1;
    while (base * (base + 1) / 2 < count) base++;
    const width = Math.min(base, count);
    let slots = Array.from({ length: width }, (_, index) => index - (width - 1) / 2);
    const positions = [];
    let y = 0;
    while (positions.length < count) {
      const size = Math.min(count - positions.length, slots.length);
      const start = Math.floor((slots.length - size) / 2);
      const row = slots.slice(start, start + size);
      row.forEach(x => positions.push({ x, y }));
      slots = row.slice(1).map((x, index) => (row[index] + x) / 2);
      if (!slots.length) slots = [0];
      y++;
    }
    return positions;
  }
  function renderNetwork() {
    if (!network || networkData !== data) {
      network = window.PublicationNetwork.create(networkHost, {
        papers,
        domains,
        areas: data.areas,
        tooltip,
        venueLabels,
        onSelect: focus => {
          filter = focus?.type === 'domain' ? focus.id : 'all';
          areaFocus = focus?.type === 'area' ? focus.id : null;
          render();
        },
        onPaper: paper => {
          filter = paper.domains[0];
          areaFocus = null;
          render();
          const id = `paper-${paper.key}`;
          if (location.hash === `#${id}`) document.getElementById(id)?.scrollIntoView({ block: 'start' });
          else location.hash = id;
        }
      });
      networkData = data;
    }
    network.setFocus(areaFocus ? { type: 'area', id: areaFocus } : filter !== 'all' ? { type: 'domain', id: filter } : null);
  }
  function renderTree() {
    if (!tree || treeData !== data) {
      tree = window.PublicationFocusTree.create(treeHost, {
        papers,
        themes: themes.filter(theme => theme.tag !== 'foundation'),
        tooltip,
        venueLabels,
        onSelect: focus => {
          filter = focus ? focus.id : 'all';
          render();
        },
        onPaper: paper => {
          filter = paper.themes[0];
          render();
          const id = `paper-${paper.key}`;
          if (location.hash === `#${id}`) document.getElementById(id)?.scrollIntoView({ block: 'start' });
          else location.hash = id;
        }
      });
      treeData = data;
    }
    tree.setFocus(filter !== 'all' ? { type: 'theme', id: filter } : null);
  }
  function renderChart() {
    hideDetails();
    usingNetwork = networkMode();
    usingTree = treeMode();
    if (!usingNetwork) areaFocus = null;
    if (networkHost) networkHost.hidden = !usingNetwork;
    if (treeHost) treeHost.hidden = !usingTree;
    chartScroll.hidden = usingNetwork || usingTree;
    if (usingNetwork) {
      renderNetwork();
      return;
    }
    if (usingTree) {
      renderTree();
      return;
    }
    chart.replaceChildren();
    let maxRows = 0;
    let columnWidth = 72;
    years.forEach(year => {
      const column = element('div', undefined, 'year');
      const blocks = element('div', undefined, 'blocks');
      const entries = papers.filter(paper => paper.year === year);
      const positions = circleLayout(entries.length);
      positions.forEach((position, index) => {
        const circle = makeCircle(entries[index]);
        circle.style.setProperty('--cp-x', position.x);
        circle.style.setProperty('--cp-y', position.y);
        blocks.append(circle);
        maxRows = Math.max(maxRows, position.y + 1);
      });
      if (positions.length) {
        const xs = positions.map(position => position.x);
        columnWidth = Math.max(columnWidth, (Math.max(...xs) - Math.min(...xs)) * 22 + 24);
      }
      column.setAttribute('role', 'group');
      column.setAttribute('aria-label', `${year}: ${entries.length} papers`);
      column.append(blocks, element('div', year, 'year-label'));
      chart.append(column);
    });
    chart.style.setProperty('--cp-chart-height', `${Math.max(56, maxRows * 19 + 16)}px`);
    chart.style.gridTemplateColumns = `repeat(${years.length}, minmax(${columnWidth}px, 1fr))`;
    chart.style.minWidth = `${years.length * columnWidth}px`;
    // Start scrolled to the right so the most recent years show first.
    const scroller = chart.closest('.chart-scroll');
    if (scroller) requestAnimationFrame(() => { scroller.scrollLeft = scroller.scrollWidth; });
  }
  function renderLegend() {
    legend.replaceChildren();
    legend.setAttribute('aria-label', `Filter by research ${dimension}`);
    [['all', 'All'], ...categories].forEach(([key, name]) => {
      const button = element('button');
      button.type = 'button';
      button.dataset.category = key;
      button.setAttribute('aria-pressed', String(filter === key));
      if (key !== 'all') {
        button.style.setProperty('--cp-mark', mark(key));
        const swatch = element('span', undefined, 'swatch');
        swatch.style.setProperty('--cp-mark', mark(key));
        button.append(swatch);
      }
      const count = key === 'all' ? papers.length : papers.filter(paper => paperCategories(paper).includes(key)).length;
      button.append(element('span', name), element('span', count, 'count'));
      button.addEventListener('click', () => { filter = key; areaFocus = null; render(); });
      legend.append(button);
    });
    const note = root.querySelector('#dimensionNote');
    if (usingNetwork || usingTree) {
      renderNetworkNote(note);
      return;
    }
    note.textContent = dimension === 'focus'
      ? 'Split colors: multiple research focus tags. Counts overlap.'
      : dimension === 'domain'
        ? 'Split colors: multiple domains. Counts overlap.'
        : 'Split colors: multiple research disciplines. Counts overlap.';
  }
  function renderNetworkNote(note) {
    note.replaceChildren();
    const selected = areaFocus
      ? data.areas.find(area => area.tag === areaFocus)
      : filter !== 'all' ? dimensionCategories[dimension].find(category => category.tag === filter) : null;
    if (!selected) {
      note.textContent = usingTree
        ? 'Each dot is a paper under its main focus area, most recent first from the left. Hover a dot to see the paper and click to open it, or click an area to list its papers.'
        : 'Hubs are application domains and dots are papers. Center labels are research disciplines; thicker lines mean more papers. Click a domain or discipline to list its papers.';
      return;
    }
    const count = papers.filter(matches).length;
    note.append(document.createTextNode(`${selected.label}: ${count} paper${count === 1 ? '' : 's'} listed below. `));
    const clear = element('button', usingTree ? 'Show all areas' : 'Show all domains', 'note-clear');
    clear.type = 'button';
    clear.addEventListener('click', () => { filter = 'all'; areaFocus = null; render(); });
    note.append(clear);
  }
  function renderAreaGuide() {
    const guide = root.querySelector('#areaGuide');
    guide.replaceChildren();
    guide.hidden = dimension === 'focus' || usingNetwork;
    if (guide.hidden) return;
    guide.setAttribute('aria-label', dimension === 'domain' ? 'Domains and subtopics' : 'Research disciplines and subtopics');
    dimensionCategories[dimension].forEach(area => {
      const term = element('dt');
      const swatch = element('span', undefined, 'swatch');
      swatch.style.setProperty('--cp-mark', mark(area.tag));
      swatch.setAttribute('aria-hidden', 'true');
      term.append(swatch, document.createTextNode(area.label));
      guide.append(term, element('dd', area.subtopics));
    });
  }
  function makePublication(paper) {
    const article = element('article', undefined, 'publication');
    article.id = `paper-${paper.key}`;
    article.dataset.key = paper.key;
    const marker = element('div', paper.venue, 'paper-marker');
    const dot = element('span', undefined, 'paper-dot');
    dot.setAttribute('aria-hidden', 'true');
    paperCategories(paper).forEach(key => {
      const segment = element('span');
      segment.style.setProperty('--cp-mark', mark(key));
      dot.append(segment);
    });
    marker.append(dot);
    const body = element('div', undefined, 'paper-body');
    const authors = element('p', undefined, 'authors');
    paper.authorNames.forEach((author, index) => {
      if (index) authors.append(document.createTextNode(', '));
      authors.append(author.isSelf ? element('span', author.name, 'author-self') : document.createTextNode(author.name));
    });
    body.append(element('h3', paper.title), authors);
    if (paper.award) {
      const award = element('p', undefined, 'paper-award');
      const icon = element('span', '🏆');
      icon.setAttribute('aria-hidden', 'true');
      award.append(icon, document.createTextNode(` ${paper.awardName || paper.award}`));
      body.append(award);
    }
    if (paper.publication) body.append(element('p', paper.publication, 'paper-venue'));
    if (paper.url) {
      const link = element('a', 'Paper', 'paper-link');
      link.href = paper.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      body.append(link);
    }
    article.append(marker, body);
    return article;
  }
  function renderList() {
    list.replaceChildren();
    const visible = papers.filter(matches).sort((a, b) => b.year - a.year);
    root.querySelector('#results').textContent = `${visible.length} papers`;
    if (usingNetwork && filter === 'all' && !areaFocus) {
      list.append(element('p', 'Select a domain or discipline in the network above to list its papers.', 'empty'));
      return;
    }
    if (usingTree && filter === 'all') {
      list.append(element('p', 'Select a focus area above to list its papers.', 'empty'));
      return;
    }
    if (!visible.length) {
      list.append(element('p', 'No entries in this category.', 'empty'));
      return;
    }
    const groups = new Map();
    if (grouping === 'date') {
      visible.forEach(paper => {
        const name = String(paper.year);
        if (!groups.has(name)) groups.set(name, []);
        groups.get(name).push(paper);
      });
    } else {
      visible.forEach(paper => {
        const key = categories.filter(([tag]) => paperCategories(paper).includes(tag)).map(([tag]) => tag).join('|');
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(paper);
      });
    }
    const orderedGroups = [...groups];
    if (grouping === 'focus') {
      orderedGroups.sort(([a], [b]) => Number(a === 'foundation') - Number(b === 'foundation'));
    }
    orderedGroups.forEach(([key, entries]) => {
      const tags = grouping !== 'date' ? key.split('|') : [];
      const name = grouping === 'date' ? key : tags.map(label).join(' | ');
      const group = element('section', undefined, 'publication-group');
      group.dataset.group = name;
      group.setAttribute('aria-label', name);
      const heading = element('h2', grouping === 'date' ? name : undefined, 'group-heading');
      if (grouping !== 'date') {
        heading.classList.add('area-heading');
        tags.forEach((tag, index) => {
          if (index) heading.append(document.createTextNode(' | '));
          const badge = element('span', label(tag), 'area-tag');
          badge.dataset.area = tag;
          badge.style.setProperty('--cp-mark', mark(tag));
          heading.append(badge);
        });
        heading.append(document.createTextNode(` (${entries.length})`));
      }
      group.append(heading);
      // The network view drops the domain guide, so each group carries its own description.
      if (usingNetwork && tags.length === 1) {
        const blurb = domains.find(domain => domain.tag === tags[0])?.subtopics;
        if (blurb) group.append(element('p', blurb, 'group-blurb'));
      }
      entries.forEach(paper => group.append(makePublication(paper)));
      list.append(group);
    });
  }
  function render() {
    root.dataset.dimension = dimension;
    renderChart();
    renderLegend();
    renderAreaGuide();
    renderList();
  }
  root.querySelectorAll('[data-view]').forEach(button => button.addEventListener('click', () => {
    grouping = button.dataset.view;
    areaFocus = null;
    const nextData = grouping === 'focus' ? recentData : allData;
    const dataChanged = nextData !== data;
    if (dataChanged) useData(nextData);
    const nextDimension = grouping === 'focus' || grouping === 'domain' ? grouping : 'discipline';
    if (dimension !== nextDimension || dataChanged) {
      if (dimension !== nextDimension) filter = 'all';
      dimension = nextDimension;
      categories = dimensionCategories[dimension].map(category => [category.tag, category.label]);
      if (filter !== 'all' && !categories.some(([tag]) => tag === filter)) filter = 'all';
    }
    root.querySelectorAll('[data-view]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    render();
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') hideDetails();
  });
  window.addEventListener('scroll', () => {
    if (activeCircle) positionDetails();
  }, true);
  window.addEventListener('resize', hideDetails);
  // Switch between a graph and the year chart when the explorer crosses the width threshold.
  if (window.ResizeObserver) {
    new ResizeObserver(() => {
      if ((grouping === 'domain' && networkMode() !== usingNetwork) || (grouping === 'focus' && treeMode() !== usingTree)) render();
    }).observe(root);
  }
  render();
  root.classList.add('is-ready');
})();
