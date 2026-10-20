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
  let activeCircle = null;
  const uniqueYears = papers.map(paper => paper.year);
  const years = Array.from({ length: Math.max(...uniqueYears) - Math.min(...uniqueYears) + 1 }, (_, i) => Math.min(...uniqueYears) + i);
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
  function renderChart() {
    hideDetails();
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
    if (activeCircle) positionDetails();
  }, true);
  window.addEventListener('resize', hideDetails);
  render();
  root.classList.add('is-ready');
})();
