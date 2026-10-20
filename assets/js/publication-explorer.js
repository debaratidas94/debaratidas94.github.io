(() => {
  const root = document.getElementById('publicationExplorer');
  if (!root) return;
  const { papers, areas, themes } = JSON.parse(root.querySelector('#publicationData').textContent);
  const venueLabels = { conference: 'Conference', journal: 'Journal', workshop: 'Workshop', preprint: 'Preprint', abstract: 'Conference abstract' };
  let categories = themes.map(theme => [theme.tag, theme.label]);
  const categoryColors = ['--cp-link', '--cp-accent', '--cp-success', '--cp-warning', '--cp-text-muted', '--cp-border-strong'];
  const focusColors = themes.map(theme => theme.color);
  let filter = 'all';
  let grouping = 'focus';
  let dimension = 'focus';
  const chart = root.querySelector('#chart');
  const legend = root.querySelector('#legend');
  const list = root.querySelector('#publications');
  const tooltip = root.querySelector('#paperTooltip');
  let activeSquare = null;
  const uniqueYears = papers.map(paper => paper.year);
  const years = Array.from({ length: Math.max(...uniqueYears) - Math.min(...uniqueYears) + 1 }, (_, i) => Math.min(...uniqueYears) + i);
  const maxPerYear = Math.max(...years.map(year => papers.filter(paper => paper.year === year).length));
  chart.style.setProperty('--cp-chart-height', `${Math.max(56, Math.ceil(maxPerYear / 3) * 14)}px`);
  chart.style.gridTemplateColumns = `repeat(${years.length}, minmax(40px, 1fr))`;
  chart.style.minWidth = `${years.length * 40}px`;
  const paperCategories = paper => dimension === 'focus' ? paper.themes : paper.areas;
  const matches = paper => filter === 'all' || paperCategories(paper).includes(filter);
  const label = key => categories.find(category => category[0] === key)?.[1] || key;
  const mark = key => {
    const palette = dimension === 'focus' ? focusColors : categoryColors;
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
    if (activeSquare) activeSquare.removeAttribute('aria-describedby');
    activeSquare = null;
  }
  function showDetails(paper, square) {
    hideDetails();
    activeSquare = square;
    tooltip.replaceChildren(
      element('strong', paper.title, 'tooltip-title'),
      element('span', `${paper.year}. ${paper.publication || venueLabels[paper.venue] || paper.venue}`, 'tooltip-meta')
    );
    tooltip.hidden = false;
    square.setAttribute('aria-describedby', tooltip.id);
    positionDetails();
  }
  function positionDetails() {
    const rect = activeSquare.getBoundingClientRect();
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
  function makeSquare(paper) {
    const square = element('a', undefined, 'paper-square');
    square.href = paper.url || `#paper-${paper.key}`;
    if (paper.url) {
      square.target = '_blank';
      square.rel = 'noopener noreferrer';
    }
    square.dataset.key = paper.key;
    square.setAttribute('aria-label', paper.title);
    paperCategories(paper).forEach(key => {
      const segment = element('span');
      segment.style.setProperty('--cp-mark', mark(key));
      square.append(segment);
    });
    square.classList.toggle('is-muted', !matches(paper));
    square.addEventListener('pointerenter', () => showDetails(paper, square));
    square.addEventListener('focus', () => showDetails(paper, square));
    ['pointerleave', 'blur'].forEach(event => square.addEventListener(event, () => {
      if (activeSquare === square) hideDetails();
    }));
    if (!paper.url) square.addEventListener('click', () => {
      if (!matches(paper)) {
        filter = 'all';
        render();
      }
    });
    return square;
  }
  function renderChart() {
    hideDetails();
    chart.replaceChildren();
    years.forEach(year => {
      const column = element('div', undefined, 'year');
      const blocks = element('div', undefined, 'blocks');
      const entries = papers.filter(paper => paper.year === year);
      const stack = element('div', undefined, 'square-stack');
      for (let index = 0; index < entries.length; index += 3) {
        const row = element('div', undefined, 'square-row');
        entries.slice(index, index + 3).forEach(paper => row.append(makeSquare(paper)));
        stack.append(row);
      }
      blocks.append(stack);
      column.setAttribute('role', 'group');
      column.setAttribute('aria-label', `${year}: ${entries.length} papers`);
      column.append(blocks, element('div', year, 'year-label'));
      chart.append(column);
    });
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
      button.addEventListener('click', () => { filter = key; render(); });
      legend.append(button);
    });
    root.querySelector('#dimensionNote').textContent = dimension === 'focus'
      ? 'Split colors: multiple research focus tags. Counts overlap.'
      : 'Split colors: multiple research disciplines. Counts overlap.';
  }
  function renderAreaGuide() {
    const guide = root.querySelector('#areaGuide');
    guide.replaceChildren();
    guide.hidden = dimension === 'focus';
    if (guide.hidden) return;
    areas.forEach(area => {
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
    if (grouping !== 'date') {
      const nextDimension = grouping === 'focus' ? 'focus' : 'discipline';
      if (dimension !== nextDimension) {
        dimension = nextDimension;
        categories = (dimension === 'focus' ? themes : areas).map(category => [category.tag, category.label]);
        filter = 'all';
      }
    }
    root.querySelectorAll('[data-view]').forEach(other => other.setAttribute('aria-pressed', String(other === button)));
    render();
  }));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') hideDetails();
  });
  window.addEventListener('scroll', () => {
    if (activeSquare) positionDetails();
  }, true);
  window.addEventListener('resize', hideDetails);
  render();
  root.classList.add('is-ready');
})();
