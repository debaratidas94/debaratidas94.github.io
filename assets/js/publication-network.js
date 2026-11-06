// Network view of application domains for the publication explorer.
// Domains are hubs in two columns, each paper is a dot beside its domain, and
// research disciplines sit in the middle, linked to every domain that uses them.
// Geometry is computed from the data, so adding papers or domains needs no edits here.
window.PublicationNetwork = (() => {
  const NS = 'http://www.w3.org/2000/svg';
  const W = 860;
  const PAD = 16;
  const PAPER_R = 8.5;
  const PAPER_GAP = 21;
  const RING_STEP = 22;
  const SPAN = 160 * Math.PI / 180;
  const LABEL_H = 46;
  const ROW_GAP = 26;
  // Below this rendered width, 15-unit labels would drop under 12px.
  const MIN_WIDTH = 688;

  const el = (tag, attrs = {}, parent) => {
    const node = document.createElementNS(NS, tag);
    for (const [key, value] of Object.entries(attrs)) node.setAttribute(key, value);
    if (parent) parent.append(node);
    return node;
  };
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;

  function create(host, { papers, domains, areas, tooltip, venueLabels, onSelect, onPaper }) {
    host.replaceChildren();
    const svg = el('svg', { class: 'network', role: 'img', 'aria-label': 'Application domains, linked through the research disciplines their papers use' }, host);
    const layers = Object.fromEntries(['bridges', 'spokes', 'traces', 'areas', 'hubs', 'papers', 'labels'].map(name => [name, el('g', {}, svg)]));
    const areaLabel = Object.fromEntries(areas.map(area => [area.tag, area.label]));

    const hubs = domains
      .map(domain => {
        const members = papers.filter(paper => paper.domains[0] === domain.tag)
          .sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
        const n = papers.filter(paper => paper.domains.includes(domain.tag)).length;
        return { ...domain, members, n, r: 14 + 5 * Math.sqrt(n), fill: `var(${domain.color})` };
      })
      .filter(hub => hub.n);
    const hubByTag = Object.fromEntries(hubs.map(hub => [hub.tag, hub]));

    // Slots run clockwise: top left, down the right column, then up the left column.
    const rows = Math.ceil(hubs.length / 2);
    const slots = [{ side: -1, row: 0 }];
    for (let row = 0; row < rows; row++) slots.push({ side: 1, row });
    for (let row = rows - 1; row > 0; row--) slots.push({ side: -1, row });
    hubs.forEach((hub, index) => Object.assign(hub, slots[index]));

    // Papers fan out on the outer side of their hub, oldest to newest.
    hubs.forEach(hub => {
      const base = hub.side < 0 ? Math.PI : 0;
      hub.offsets = [];
      let ring = 0;
      while (hub.offsets.length < hub.members.length) {
        const radius = hub.r + 18 + ring * RING_STEP;
        const count = Math.min(Math.max(1, Math.floor(SPAN * radius / PAPER_GAP)), hub.members.length - hub.offsets.length);
        const step = Math.min(SPAN / count, PAPER_GAP / radius);
        for (let i = 0; i < count; i++) {
          const angle = base + (i - (count - 1) / 2) * step;
          hub.offsets.push({ dx: radius * Math.cos(angle), dy: radius * Math.sin(angle) });
        }
        ring++;
      }
      const ys = hub.offsets.map(o => Math.abs(o.dy) + PAPER_R);
      hub.reachY = Math.max(hub.r + 5, ...ys);
      hub.reachOut = Math.max(hub.r + 5, ...hub.offsets.map(o => Math.abs(o.dx) + PAPER_R));
    });

    // Labels are measured before the hubs are placed, so they never clip.
    hubs.forEach(hub => {
      hub.label_ = el('g', { class: 'net-label' }, layers.labels);
      hub.nameText = el('text', { class: 'net-label-name', 'text-anchor': 'middle' }, hub.label_);
      hub.nameText.textContent = hub.label;
      hub.metaText = el('text', { class: 'net-label-meta', 'text-anchor': 'middle' }, hub.label_);
      hub.metaText.textContent = plural(hub.n, 'paper');
      hub.labelHalf = Math.max(hub.nameText.getComputedTextLength(), hub.metaText.getComputedTextLength()) / 2;
    });

    const column = side => hubs.filter(hub => hub.side === side);
    const xFor = side => {
      const members = column(side);
      const need = Math.max(0, ...members.map(hub => Math.max(hub.reachOut, hub.labelHalf)));
      return side < 0 ? PAD + need : W - PAD - need;
    };
    const xLeft = xFor(-1), xRight = xFor(1);
    let y = PAD;
    for (let row = 0; row < rows; row++) {
      const members = hubs.filter(hub => hub.row === row);
      const reach = Math.max(...members.map(hub => hub.reachY));
      const center = y + LABEL_H + reach;
      members.forEach(hub => {
        hub.x = hub.side < 0 ? xLeft : xRight;
        hub.y = center;
      });
      y = center + reach + ROW_GAP;
    }
    const H = y - ROW_GAP + PAD;
    const CX = W / 2;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);

    hubs.forEach(hub => {
      const top = hub.y - hub.reachY - 8;
      hub.nameText.setAttribute('x', hub.x);
      hub.nameText.setAttribute('y', top - 20);
      hub.metaText.setAttribute('x', hub.x);
      hub.metaText.setAttribute('y', top);
    });

    // Discipline weights per domain set each pill's position and each bridge's width.
    const weight = {};
    papers.forEach(paper => paper.domains.forEach(domain => paper.areas.forEach(area => {
      weight[area] ??= {};
      weight[area][domain] = (weight[area][domain] || 0) + 1;
    })));
    const pills = areas.filter(area => weight[area.tag]).map(area => {
      let sx = 0, sy = 0, sw = 0;
      for (const [domain, w] of Object.entries(weight[area.tag])) {
        sx += w * (hubByTag[domain].x - CX);
        sy += w * hubByTag[domain].y;
        sw += w;
      }
      return { ...area, x: CX + 0.3 * sx / sw, y: sy / sw, h: 32, n: papers.filter(paper => paper.areas.includes(area.tag)).length };
    });
    pills.forEach(pill => {
      pill.node = el('g', { class: 'net-area', tabindex: 0, role: 'button', 'aria-label': `${pill.label}: ${plural(pill.n, 'paper')}` }, layers.areas);
      pill.rect = el('rect', { rx: 16, ry: 16, height: pill.h }, pill.node);
      pill.text = el('text', {}, pill.node);
      pill.text.append(document.createTextNode(`${pill.label}  `));
      el('tspan', { class: 'net-area-count' }, pill.text).textContent = pill.n;
      pill.w = pill.text.getComputedTextLength() + 32;
    });
    const innerLeft = xLeft + Math.max(0, ...column(-1).map(hub => hub.r)) + 28;
    const innerRight = xRight - Math.max(0, ...column(1).map(hub => hub.r)) - 28;
    const clamp = pill => {
      const lo = innerLeft + pill.w / 2, hi = innerRight - pill.w / 2;
      pill.x = lo > hi ? CX : Math.min(hi, Math.max(lo, pill.x));
      pill.y = Math.min(H - PAD - pill.h / 2, Math.max(PAD + pill.h / 2, pill.y));
    };
    for (let pass = 0; pass < 400; pass++) {
      let moved = false;
      for (let i = 0; i < pills.length; i++) for (let j = i + 1; j < pills.length; j++) {
        const a = pills[i], b = pills[j];
        const ox = (a.w + b.w) / 2 + 12 - Math.abs(a.x - b.x);
        const oy = (a.h + b.h) / 2 + 12 - Math.abs(a.y - b.y);
        if (ox > 0 && oy > 0) {
          moved = true;
          const shift = (a.y <= b.y ? -1 : 1) * oy / 2;
          a.y += shift;
          b.y -= shift;
        }
      }
      pills.forEach(clamp);
      if (!moved) break;
    }
    pills.forEach(pill => {
      pill.rect.setAttribute('x', pill.x - pill.w / 2);
      pill.rect.setAttribute('y', pill.y - pill.h / 2);
      pill.rect.setAttribute('width', pill.w);
      pill.text.setAttribute('x', pill.x);
      pill.text.setAttribute('y', pill.y);
    });
    const pillByTag = Object.fromEntries(pills.map(pill => [pill.tag, pill]));

    const curve = (x1, y1, x2, y2, pull) => {
      const mx = (x1 + x2) / 2, my = (y1 + y2) / 2;
      return `M${x1},${y1} Q${mx + (CX - mx) * pull},${my} ${x2},${y2}`;
    };
    const bridges = [];
    for (const [area, byDomain] of Object.entries(weight)) for (const [domain, w] of Object.entries(byDomain)) {
      const hub = hubByTag[domain], pill = pillByTag[area];
      const path = el('path', { class: 'net-bridge', d: curve(pill.x, pill.y, hub.x, hub.y, 0.25) }, layers.bridges);
      path.style.setProperty('--net-c', hub.fill);
      path.style.setProperty('stroke-width', (1.2 + 2.2 * Math.sqrt(w)).toFixed(2));
      path.style.setProperty('--net-len', path.getTotalLength().toFixed(1));
      path.style.setProperty('--net-delay', `${300 + bridges.length * 22}ms`);
      bridges.push({ node: path, domain, area });
    }

    hubs.forEach((hub, index) => {
      hub.node = el('g', { class: 'net-hub', tabindex: 0, role: 'button', 'aria-label': `${hub.label}: ${plural(hub.n, 'paper')}` }, layers.hubs);
      hub.node.style.setProperty('--net-c', hub.fill);
      hub.node.style.setProperty('--net-delay', `${index * 60}ms`);
      el('circle', { class: 'net-halo', cx: hub.x, cy: hub.y, r: hub.r + 5 }, hub.node);
      el('circle', { cx: hub.x, cy: hub.y, r: hub.r }, hub.node);
      el('text', { class: 'net-hub-count', x: hub.x, y: hub.y }, hub.node).textContent = hub.n;
    });

    papers.forEach((paper, index) => {
      const hub = hubByTag[paper.domains[0]];
      const offset = hub.offsets[hub.members.indexOf(paper)];
      const x = hub.x + offset.dx, y = hub.y + offset.dy;
      paper.net = {
        spokes: paper.domains.map(tag => {
          const other = hubByTag[tag];
          const line = el('line', { class: 'net-spoke', x1: other.x, y1: other.y, x2: x, y2: y }, layers.spokes);
          if (tag !== hub.tag) line.setAttribute('stroke-dasharray', '3 4');
          line.style.setProperty('--net-c', other.fill);
          return line;
        }),
        traces: paper.areas.filter(area => pillByTag[area]).map(area => {
          const pill = pillByTag[area];
          const path = el('path', { class: 'net-trace', d: curve(x, y, pill.x, pill.y, 0.1) }, layers.traces);
          path.style.setProperty('--net-c', hub.fill);
          return path;
        })
      };
      const link = el('a', { class: 'net-paper', href: paper.url || `#paper-${paper.key}`, 'aria-label': `${paper.title} (${paper.year})` }, layers.papers);
      if (paper.url) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      } else {
        link.addEventListener('click', event => {
          event.preventDefault();
          hideTip();
          onPaper(paper);
        });
      }
      link.style.setProperty('--net-c', hub.fill);
      link.style.setProperty('--net-delay', `${250 + index * 15}ms`);
      el('circle', { cx: x, cy: y, r: PAPER_R }, link);
      paper.net.node = link;
    });

    let sticky = null;
    function apply(focus) {
      const on = { domains: new Set(), areas: new Set(), papers: new Set(), pairs: new Set() };
      if (focus) {
        const hit = focus.type === 'domain' ? papers.filter(paper => paper.domains.includes(focus.id))
          : focus.type === 'area' ? papers.filter(paper => paper.areas.includes(focus.id))
            : papers.filter(paper => paper.key === focus.id);
        hit.forEach(paper => {
          on.papers.add(paper.key);
          paper.domains.forEach(domain => {
            on.domains.add(domain);
            paper.areas.forEach(area => {
              on.areas.add(area);
              on.pairs.add(`${domain}|${area}`);
            });
          });
        });
        if (focus.type === 'area') {
          on.areas = new Set([focus.id]);
          on.pairs = new Set([...on.pairs].filter(pair => pair.endsWith(`|${focus.id}`)));
        }
      }
      svg.classList.toggle('has-focus', !!focus);
      hubs.forEach(hub => {
        const lit = on.domains.has(hub.tag);
        hub.node.classList.toggle('is-dim', !lit);
        hub.label_.classList.toggle('is-dim', !lit);
        hub.node.classList.toggle('is-selected', sticky?.type === 'domain' && sticky.id === hub.tag);
      });
      pills.forEach(pill => {
        pill.node.classList.toggle('is-dim', !on.areas.has(pill.tag));
        pill.node.classList.toggle('is-on', on.areas.has(pill.tag));
        pill.node.classList.toggle('is-selected', sticky?.type === 'area' && sticky.id === pill.tag);
      });
      bridges.forEach(bridge => {
        const lit = on.pairs.has(`${bridge.domain}|${bridge.area}`);
        bridge.node.classList.toggle('is-on', lit);
        bridge.node.classList.toggle('is-dim', !lit);
      });
      papers.forEach(paper => {
        const lit = on.papers.has(paper.key);
        paper.net.node.classList.toggle('is-dim', !lit);
        paper.net.node.classList.toggle('is-on', focus?.type === 'paper' && lit);
        paper.net.spokes.forEach(spoke => {
          spoke.classList.toggle('is-on', lit);
          spoke.classList.toggle('is-dim', !lit);
        });
        paper.net.traces.forEach(trace => trace.classList.toggle('is-on', focus?.type === 'paper' && lit));
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
    function hideTip() { tooltip.hidden = true; }

    const select = focus => onSelect(sticky && focus && sticky.type === focus.type && sticky.id === focus.id ? null : focus);
    const bind = (node, focus, tip) => {
      ['pointerenter', 'focus'].forEach(name => node.addEventListener(name, () => {
        apply(focus);
        showTip(...tip(), node);
      }));
      ['pointerleave', 'blur'].forEach(name => node.addEventListener(name, () => {
        hideTip();
        apply(sticky);
      }));
    };
    const activate = (node, focus) => {
      node.addEventListener('click', () => select(focus));
      node.addEventListener('keydown', event => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          select(focus);
        }
      });
    };
    hubs.forEach(hub => {
      const focus = { type: 'domain', id: hub.tag };
      bind(hub.node, focus, () => [hub.label, [hub.subtopics, `${plural(hub.n, 'paper')}. Click to list them.`]]);
      activate(hub.node, focus);
    });
    pills.forEach(pill => {
      const focus = { type: 'area', id: pill.tag };
      const spread = Object.keys(weight[pill.tag]).length;
      bind(pill.node, focus, () => [pill.label, [pill.subtopics, `${plural(pill.n, 'paper')} across ${plural(spread, 'domain')}. Click to list them.`]]);
      activate(pill.node, focus);
    });
    papers.forEach(paper => bind(paper.net.node, { type: 'paper', id: paper.key }, () => [paper.title, [
      `${paper.year}. ${paper.publication || venueLabels[paper.venue] || paper.venue}`,
      paper.areas.map(area => areaLabel[area] || area).join(' · '),
      paper.url ? 'Click to open the paper.' : 'No public link yet. Click to see its entry below.'
    ]]));
    svg.addEventListener('click', event => {
      if (event.target === svg) onSelect(null);
    });

    svg.classList.add('is-entering');
    apply(null);
    return {
      setFocus(focus) {
        sticky = focus;
        apply(sticky);
      }
    };
  }

  return { create, MIN_WIDTH };
})();
