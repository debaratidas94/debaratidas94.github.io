// Tree view of research focus for the publication explorer.
// The shared question sits on top and branches into the focus areas. Each paper is an
// unlabeled dot fanned out under its main area (the first research_themes entry in the bib),
// most recent first. New papers add half-rings, so the figure grows slowly.
window.PublicationFocusTree = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const ROOT_LABEL = 'Making expert work better with AI';
  const W = 860;
  const PAD = 6;
  const ROOT_FONT = 21;
  const ROOT_H = 58;
  const THEME_Y = 120;
  const THEME_H = 58;
  const DOT_R = 9;
  const FAN_R0 = 50;
  const FAN_STEP = 34;
  const SPACING = 32;
  const A0 = Math.PI * 0.1;
  const A1 = Math.PI * 0.9;
  // Below this rendered width, 15-unit labels would drop under 12px.
  const MIN_WIDTH = 688;

  const el = (tag, attrs = {}, parent) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (parent) parent.append(node);
    return node;
  };
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const star = (cx, cy, r) => Array.from({ length: 10 }, (_, i) => {
    const angle = -Math.PI / 2 + i * Math.PI / 5, radius = i % 2 ? r * .45 : r;
    return `${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`;
  }).join(' ');
  const wrap = (text, max) => {
    const lines = [''];
    text.split(' ').forEach(word => {
      const current = lines[lines.length - 1];
      if (current && `${current} ${word}`.length > max) lines.push(word);
      else lines[lines.length - 1] = current ? `${current} ${word}` : word;
    });
    return lines;
  };
  const textBlock = (parent, lines, x, cy, lineHeight, font = 15) => {
    const text = el('text', { x, y: cy + font * .35 - (lines.length - 1) * lineHeight / 2, 'text-anchor': 'middle' }, parent);
    lines.forEach((line, i) => { el('tspan', { x, dy: i ? lineHeight : 0 }, text).textContent = line; });
  };

  function create(host, { papers, themes, tooltip, venueLabels, onSelect, onPaper }) {
    host.replaceChildren();
    const areas = themes
      .map(theme => ({
        ...theme,
        fill: `var(${theme.color})`,
        members: papers.filter(paper => paper.themes[0] === theme.tag)
          .sort((a, b) => b.year - a.year || a.title.localeCompare(b.title))
      }))
      .filter(area => area.members.length);
    const shown = areas.flatMap(area => area.members);
    // The newest paper is ringed. Within a year, the entry listed first in the bib counts as newest.
    const newest = Math.max(...shown.map(paper => paper.year));
    const latest = papers.find(paper => paper.year === newest && shown.includes(paper));

    // Each area's papers fan out on half-rings below it, inner ring first, newest on the left.
    const colW = W / Math.max(areas.length, 1);
    const boxW = Math.min(250, colW - 26);
    const fanY = THEME_Y + THEME_H;
    const spot = new Map();
    let maxR = FAN_R0;
    areas.forEach((area, index) => {
      area.x = colW * (index + .5);
      let placed = 0;
      for (let ring = 0; placed < area.members.length; ring++) {
        const radius = FAN_R0 + ring * FAN_STEP;
        const batch = area.members.slice(placed, placed + Math.floor(radius * (A1 - A0) / SPACING) + 1);
        const step = SPACING / radius;
        batch.forEach((paper, i) => {
          const angle = Math.PI / 2 + (batch.length - 1) * step / 2 - i * step;
          spot.set(paper.key, { x: area.x + radius * Math.cos(angle), y: fanY + radius * Math.sin(angle) });
        });
        maxR = Math.max(maxR, radius);
        placed += batch.length;
      }
    });
    const height = fanY + maxR + DOT_R + 16;

    const svg = el('svg', {
      class: 'focus-tree', role: 'img', viewBox: `0 0 ${W} ${height}`,
      'aria-label': `${ROOT_LABEL} branches into ${plural(areas.length, 'research focus area')}. Each dot below an area is one of its papers.`
    }, host);
    const links = el('g', {}, svg);
    const nodes = el('g', {}, svg);
    const vcurve = (x1, y1, x2, y2) => { const m = (y1 + y2) / 2; return `M${x1},${y1} C${x1},${m} ${x2},${m} ${x2},${y2}`; };

    const root = el('g', { class: 'ft-root', role: 'button', tabindex: 0, 'aria-label': `${ROOT_LABEL}. Show all focus areas.` }, nodes);
    // Size the root's click target to its label, using an average bold glyph width.
    const ROOT_W = Math.min(W - 2 * PAD, ROOT_LABEL.length * ROOT_FONT * .58 + 56);
    const hubY = PAD + ROOT_H;
    el('rect', { class: 'ft-root-hit', x: (W - ROOT_W) / 2, y: PAD, width: ROOT_W, height: ROOT_H - 8, rx: 8 }, root);
    textBlock(root, [ROOT_LABEL], W / 2, PAD + (ROOT_H - 8) / 2, 24, ROOT_FONT);
    el('circle', { class: 'ft-hub', cx: W / 2, cy: hubY, r: 5 }, root);

    areas.forEach(area => {
      area.link = el('path', { class: 'ft-link', d: vcurve(W / 2, hubY, area.x, THEME_Y) }, links);
      area.link.style.setProperty('--ft-c', area.fill);
      area.node = el('g', { class: 'ft-area', role: 'button', tabindex: 0, 'aria-label': `${area.label}: ${plural(area.members.length, 'paper')}` }, nodes);
      area.node.style.setProperty('--ft-c', area.fill);
      el('rect', { x: area.x - boxW / 2, y: THEME_Y, width: boxW, height: THEME_H, rx: 10 }, area.node);
      textBlock(area.node, wrap(area.label, 28), area.x, THEME_Y + THEME_H / 2, 19);

      area.members.forEach(paper => {
        const { x, y } = spot.get(paper.key);
        const spoke = el('path', { class: 'ft-link ft-spoke', d: `M${area.x},${fanY} L${x.toFixed(1)},${y.toFixed(1)}` }, links);
        spoke.style.setProperty('--ft-c', area.fill);
        const node = el('a', { class: 'ft-paper', href: paper.url || `#paper-${paper.key}`, 'aria-label': `${paper.title} (${paper.year})` }, nodes);
        node.style.setProperty('--ft-c', area.fill);
        if (paper.url) {
          node.setAttribute('target', '_blank');
          node.setAttribute('rel', 'noopener noreferrer');
        } else {
          node.addEventListener('click', event => {
            event.preventDefault();
            onPaper(paper);
          });
        }
        el('circle', { class: 'ft-hit', cx: x, cy: y, r: DOT_R + 7 }, node);
        if (paper === latest) el('circle', { class: 'ft-latest', cx: x, cy: y, r: DOT_R + 4 }, node);
        el('circle', { class: 'ft-dot', cx: x, cy: y, r: DOT_R }, node);
        if (paper.award) el('polygon', { class: 'ft-award', points: star(x + DOT_R * .8, y - DOT_R * .8, 6) }, node);
        paper.tree = { node, spoke, area: area.tag };
      });
    });

    let sticky = null;
    function apply(focus) {
      svg.classList.toggle('has-focus', !!focus);
      const litArea = focus?.type === 'paper' ? shown.find(paper => paper.key === focus.id)?.tree.area : focus?.id;
      shown.forEach(paper => {
        const lit = !focus || (focus.type === 'paper' ? paper.key === focus.id : paper.tree.area === focus.id);
        paper.tree.node.classList.toggle('is-dim', !lit);
        paper.tree.spoke.classList.toggle('is-dim', !lit);
        paper.tree.node.classList.toggle('is-on', focus?.type === 'paper' && lit);
      });
      areas.forEach(area => {
        const lit = !focus || area.tag === litArea;
        area.node.classList.toggle('is-dim', !lit);
        area.link.classList.toggle('is-dim', !lit);
        area.node.classList.toggle('is-selected', sticky?.id === area.tag);
      });
    }

    function showTip(title, lines, target) {
      const strong = document.createElement('strong');
      strong.className = 'tooltip-title';
      strong.textContent = title;
      tooltip.replaceChildren(strong, ...lines.filter(Boolean).map(text => {
        const span = document.createElement('span');
        span.className = 'tooltip-meta';
        span.textContent = text;
        return span;
      }));
      tooltip.hidden = false;
      const rect = target.getBoundingClientRect(), bounds = tooltip.getBoundingClientRect();
      const left = Math.max(12, Math.min(rect.left + (rect.width - bounds.width) / 2, window.innerWidth - bounds.width - 12));
      const above = rect.top - bounds.height - 8;
      tooltip.style.left = `${left}px`;
      tooltip.style.top = `${Math.max(12, above >= 12 ? above : rect.bottom + 8)}px`;
    }
    const bind = (node, focus, tip) => {
      ['pointerenter', 'focus'].forEach(name => node.addEventListener(name, () => {
        apply(focus || sticky);
        showTip(...tip(), node.querySelector('.ft-dot, rect') || node);
      }));
      ['pointerleave', 'blur'].forEach(name => node.addEventListener(name, () => {
        tooltip.hidden = true;
        apply(sticky);
      }));
    };
    const activate = (node, pick) => {
      node.addEventListener('click', pick);
      node.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          pick();
        }
      });
    };

    const years = shown.map(paper => paper.year);
    bind(root, null, () => [ROOT_LABEL, [shown.length ? `${plural(shown.length, 'paper')}, ${Math.min(...years)} to ${Math.max(...years)}.` : '', 'Click to show all.']]);
    activate(root, () => onSelect(null));
    areas.forEach(area => {
      const focus = { type: 'theme', id: area.tag };
      bind(area.node, focus, () => [area.label, [`${plural(area.members.length, 'paper')}. Click to list them.`]]);
      activate(area.node, () => onSelect(sticky?.id === area.tag ? null : focus));
    });
    shown.forEach(paper => bind(paper.tree.node, { type: 'paper', id: paper.key }, () => [paper.title, [
      `${paper.year}. ${paper.publication || venueLabels[paper.venue] || paper.venue}`,
      paper === latest ? 'Most recent paper.' : '',
      paper.awardName || paper.award || '',
      paper.url ? 'Click to open the paper.' : 'No public link yet. Click to see its entry below.'
    ]]));
    svg.addEventListener('click', event => {
      if (event.target === svg) onSelect(null);
    });

    svg.classList.add('is-entering');
    apply(null);
    return {
      setFocus(focus) {
        // Filters outside the tree, such as Broader Research, leave the tree undimmed.
        sticky = focus && areas.some(area => area.tag === focus.id) ? focus : null;
        apply(sticky);
      }
    };
  }

  return { create, MIN_WIDTH };
})();
