---
layout: page
permalink: /talks/
title: talks
nav: true
nav_order: 6
---

<style>
.talks-timeline {
  position: relative;
  padding: 0.5rem 0;
  margin-top: 1.5rem;
}

.talks-timeline::before {
  content: '';
  position: absolute;
  left: 88px;
  top: 0;
  bottom: 0;
  width: 2px;
  background: var(--global-theme-color);
  opacity: 0.3;
}

.talks-item {
  display: flex;
  align-items: flex-start;
  position: relative;
  margin-bottom: 2rem;
}

.talks-date {
  width: 76px;
  min-width: 76px;
  text-align: right;
  font-weight: 700;
  font-size: 0.82rem;
  color: var(--global-text-color-light);
  padding-top: 2px;
}

.talks-dot {
  width: 14px;
  height: 14px;
  min-width: 14px;
  border-radius: 50%;
  background: var(--global-theme-color);
  margin: 3px 16px 0;
  position: relative;
  z-index: 1;
  box-shadow: 0 0 0 3px var(--global-bg-color), 0 0 0 4px var(--global-theme-color);
}

.talks-content {
  flex: 1;
}

.talks-venue {
  font-size: 0.78rem;
  color: var(--global-text-color-light);
  margin-top: 0.25rem;
}

/* Tooltip */
.talks-link {
  position: relative;
  display: inline;
}

.talks-link a {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--global-text-color);
  text-decoration: none;
  border-bottom: 1px dashed var(--global-theme-color);
}

.talks-link a:hover {
  border-bottom-style: solid;
  color: var(--global-theme-color);
}

.talks-tooltip {
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
  width: 360px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 100;
}

.talks-tooltip .tooltip-title {
  font-weight: 600;
  margin-bottom: 0.4rem;
  color: var(--global-text-color);
}

.talks-tooltip .tooltip-about {
  color: var(--global-text-color-light);
}

.talks-tooltip .tooltip-image {
  margin-top: 0.6rem;
  width: 100%;
  border-radius: 4px;
  display: block;
}

.talks-tooltip .tooltip-slides {
  display: inline-block;
  margin-top: 0.6rem;
  font-size: 0.82rem;
  color: var(--global-theme-color);
  border-bottom: 1px dashed var(--global-theme-color);
  text-decoration: none;
}

.talks-tooltip .tooltip-slides:hover {
  border-bottom-style: solid;
}

.talks-link:hover .talks-tooltip {
  display: block;
}
</style>

<div class="talks-timeline">
  {% for talk in site.data.talks %}
  <div class="talks-item">
    <div class="talks-date">{{ talk.date }}</div>
    <div class="talks-dot"></div>
    <div class="talks-content">
      <span class="talks-link">
        {% if talk.url != "" %}
          <a href="{{ talk.url }}" target="_blank">{{ talk.title }}</a>
        {% else %}
          <a>{{ talk.title }}</a>
        {% endif %}
        <span class="talks-tooltip">
          <div class="tooltip-title">{{ talk.title }}</div>
          {% if talk.about != "" %}
            <div class="tooltip-about">{{ talk.about }}</div>
          {% endif %}
          {% if talk.image != "" %}
            <img class="tooltip-image" src="{{ talk.image }}" alt="{{ talk.title }}" />
          {% endif %}
          {% if talk.slides != "" %}
            <a class="tooltip-slides" href="{{ talk.slides }}" target="_blank">&#128196; View Slides</a>
          {% endif %}
        </span>
      </span>
      <div class="talks-venue">{{ talk.venue }}</div>
    </div>
  </div>
  {% endfor %}
</div>
