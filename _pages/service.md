---
layout: page
permalink: /service/
title: service
nav: true
nav_order: 4
---

<style>
.service-list {
  margin-top: 1.5rem;
}

.service-item {
  display: flex;
  gap: 2rem;
  margin-bottom: 2.5rem;
  padding-bottom: 2.5rem;
  border-bottom: 1px solid var(--global-divider-color);
}

.service-item:last-child {
  border-bottom: none;
}

.service-left {
  min-width: 120px;
  width: 120px;
  text-align: right;
}

.service-role {
  font-weight: 700;
  font-size: 0.9rem;
  color: var(--global-theme-color);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1.3;
}

.service-period {
  font-size: 0.78rem;
  color: var(--global-text-color-light);
  margin-top: 0.25rem;
}

.service-right {
  flex: 1;
}

.service-org {
  font-weight: 600;
  font-size: 0.95rem;
  margin-bottom: 0.6rem;
  color: var(--global-text-color);
}

.service-section-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--global-text-color-light);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-top: 0.8rem;
  margin-bottom: 0.4rem;
}

.service-right ul {
  margin: 0;
  padding-left: 1.2rem;
}

.service-right ul li {
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--global-text-color);
  margin-bottom: 0.2rem;
}
</style>

<div class="service-list">
  {% for item in site.data.service %}
  <div class="service-item">
    <div class="service-left">
      <div class="service-role">{{ item.role }}</div>
      <div class="service-period">{{ item.period }}</div>
    </div>
    <div class="service-right">
      {% if item.org != "" %}
        <div class="service-org">{{ item.org }}</div>
      {% endif %}
      {% if item.sections %}
        {% for section in item.sections %}
          <div class="service-section-label">{{ section.label }}</div>
          <ul>
            {% for entry in section.entries %}
              <li>{{ entry }}</li>
            {% endfor %}
          </ul>
        {% endfor %}
      {% endif %}
      {% if item.bullets %}
        <ul>
          {% for bullet in item.bullets %}
            <li>{{ bullet }}</li>
          {% endfor %}
        </ul>
      {% endif %}
    </div>
  </div>
  {% endfor %}
</div>
