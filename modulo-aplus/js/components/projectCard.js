/**
 * projectCard.js
 * -----------------------------------------------------------------------------
 * Tarjeta de proyecto (projectCard) + fragmentos HTML compartidos con el modal.
 * Funciona igual en vista Cuadrícula y Lista: el layout lo decide el CSS
 * mediante el atributo data-view del contenedor.
 */

import { escapeHtml, slugify, formatCurrency, formatPercent, applyMeters } from '../utils/helpers.js';
import { icons } from '../utils/icons.js';

/* ---------------------------------------------------- Fragmentos compartidos */

/** Badge distintivo "A+ Alto Impacto" sin estrellas. */
export function aplusBadgeHtml() {
  return `<span class="aplus-badge aplus-badge--aplus"><span>A+ Alto Impacto</span></span>`;
}

export function categoryBadgeHtml(category) {
  return `<span class="aplus-badge aplus-badge--category aplus-badge--${slugify(category)}">${escapeHtml(category)}</span>`;
}

export function statusPillHtml(status) {
  return `<span class="aplus-status aplus-status--${slugify(status)}"><span class="aplus-status__dot" aria-hidden="true"></span>${escapeHtml(status)}</span>`;
}

/** Medidor del índice de impacto (el ancho se aplica con applyMeters). */
export function impactMeterHtml(score) {
  return `
    <div class="aplus-meter" role="img" aria-label="Índice de impacto social: ${score} de 100">
      <div class="aplus-meter__label"><span>Impacto Social</span><strong>${score}</strong></div>
      <div class="aplus-meter__track"><span class="aplus-meter__fill" data-aplus-meter="${score}"></span></div>
    </div>`;
}

/* ----------------------------------------------------------------- Tarjeta */

export function createProjectCard(project) {
  const card = document.createElement('article');
  const titleId = `aplus-card-title-${project.id}`;

  card.className = `aplus-card${project.isAPlus ? ' aplus-card--aplus' : ''}`;
  card.dataset.projectId = project.id;
  card.setAttribute('aria-labelledby', titleId);

  card.innerHTML = `
    <div class="aplus-card__top">
      <span class="aplus-card__code">${escapeHtml(project.id)}</span>
      <div class="aplus-card__badges">
        ${categoryBadgeHtml(project.category)}
        ${project.isAPlus ? aplusBadgeHtml() : ''}
      </div>
    </div>

    <div class="aplus-card__body">
      <h3 class="aplus-card__title" id="${titleId}">${escapeHtml(project.name)}</h3>
      <p class="aplus-card__summary">${escapeHtml(project.summary)}</p>
    </div>

    <div class="aplus-card__indicators">
      <dl class="aplus-kpis">
        <div class="aplus-kpis__item aplus-kpis__item--roi">
          <dt>SROI</dt>
          <dd>${formatPercent(project.roi)}</dd>
        </div>
        <div class="aplus-kpis__item">
          <dt>Fondos</dt>
          <dd>${formatCurrency(project.investment)}</dd>
        </div>
        <div class="aplus-kpis__item">
          <dt>Horizonte</dt>
          <dd>${project.paybackMonths} meses</dd>
        </div>
      </dl>
      ${impactMeterHtml(project.impactScore)}
    </div>

    <div class="aplus-card__footer">
      ${statusPillHtml(project.status)}
      <button type="button" class="aplus-btn aplus-btn--primary" data-aplus-open="${escapeHtml(project.id)}" aria-label="Ver detalle de ${escapeHtml(project.name)}">
        <span>Ver Detalle</span>${icons.arrowRight}
      </button>
    </div>
  `;

  applyMeters(card);
  return card;
}

/** Tarjeta fantasma para el estado de carga (Skeleton Loader). */
export function createProjectCardSkeleton() {
  const card = document.createElement('div');
  card.className = 'aplus-card aplus-card--skeleton';
  card.setAttribute('aria-hidden', 'true');
  card.innerHTML = `
    <div class="aplus-card__top">
      <span class="aplus-skeleton aplus-skeleton--line" data-w="28"></span>
      <span class="aplus-skeleton aplus-skeleton--pill"></span>
    </div>
    <div class="aplus-card__body">
      <span class="aplus-skeleton aplus-skeleton--title"></span>
      <span class="aplus-skeleton aplus-skeleton--line"></span>
      <span class="aplus-skeleton aplus-skeleton--line"></span>
      <span class="aplus-skeleton aplus-skeleton--line" data-w="60"></span>
    </div>
    <div class="aplus-card__indicators">
      <span class="aplus-skeleton aplus-skeleton--block"></span>
    </div>
    <div class="aplus-card__footer">
      <span class="aplus-skeleton aplus-skeleton--pill"></span>
      <span class="aplus-skeleton aplus-skeleton--button"></span>
    </div>
  `;
  return card;
}
