---
layout: page
permalink: /awards/
title: awards
nav: true
nav_order: 3
---

<style>
.timeline {
  position: relative;
  padding: 0.5rem 0;
  margin-top: 1.5rem;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 72px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--global-theme-color);
  opacity: 0.3;
}

.timeline-item {
  display: flex;
  align-items: center;
  position: relative;
  margin-bottom: 2rem;
}

.timeline-year {
  width: 60px;
  min-width: 60px;
  text-align: right;
  font-weight: 700;
  font-size: 0.85rem;
  color: var(--global-text-color-light);
}

.timeline-dot {
  width: 14px;
  height: 14px;
  min-width: 14px;
  border-radius: 50%;
  background: var(--global-theme-color);
  margin: 0 16px;
  position: relative;
  z-index: 1;
  box-shadow: 0 0 0 3px var(--global-bg-color), 0 0 0 4px var(--global-theme-color);
}

.timeline-content div + div {
  margin-top: 0.4rem;
}

/* Award link with hover tooltip */
.award-link {
  position: relative;
  display: inline-block;
}

.award-link a {
  font-size: 0.95rem;
  color: var(--global-text-color);
  text-decoration: none;
  border-bottom: 1px dashed var(--global-theme-color);
}

.award-link a:hover {
  border-bottom-style: solid;
  color: var(--global-theme-color);
}

.award-tooltip {
  display: none;
  position: absolute;
  left: 0;
  top: calc(100% + 8px);
  background: var(--global-bg-color);
  color: var(--global-text-color);
  border: 1px solid var(--global-divider-color);
  border-left: 3px solid var(--global-theme-color);
  border-radius: 6px;
  padding: 0.75rem 1rem;
  font-size: 0.85rem;
  line-height: 1.6;
  width: 340px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 100;
}

.award-link:hover .award-tooltip {
  display: block;
}
</style>

<div class="timeline">
  {% assign grouped = site.data.awards | group_by: "year" %}
  {% for group in grouped %}
  <div class="timeline-item">
    <div class="timeline-year">{{ group.name }}</div>
    <div class="timeline-dot"></div>
    <div class="timeline-content">
      {% for award in group.items %}
        <div>
          <span class="award-link">
            <a href="{{ award.url }}">{{ award.name }}</a>
            <span class="award-tooltip">{{ award.about }}</span>
          </span>
        </div>
      {% endfor %}
    </div>
  </div>
  {% endfor %}
</div>
