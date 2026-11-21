const byId = id => document.getElementById(id);
const form = byId('kitchen-form');
const layout = byId('layout');
const wall = byId('length');
const extra = byId('extra');
const extraLabel = byId('extra-label');
const drawing = byId('drawing');
const statusMessage = byId('status');
let reference = '';

const collections = new Map(Array.from(document.querySelectorAll('[data-project]'), article => [
  article.dataset.project, article
]));
const cover = document.querySelector('.hero img');
for (const button of document.querySelectorAll('[data-view]')) {
  button.addEventListener('click', () => {
    const photo = collections.get(button.dataset.view).querySelector('img');
    cover.src = photo.src;
    cover.alt = photo.alt;
    for (const other of document.querySelectorAll('[data-view]')) {
      other.setAttribute('aria-pressed', String(other === button));
    }
  });
}
for (const article of collections.values()) {
  article.querySelector('.use-project').addEventListener('click', () => {
    const settings = article.dataset;
    reference = article.querySelector('h3').textContent;
    document.querySelectorAll('input[name="front"]').forEach(radio => {
      radio.checked = radio.value === settings.finish;
    });
    layout.value = settings.layout;
    wall.value = settings.wall;
    extra.value = settings.return;
    byId('origin').textContent = 'За основу взят проект «' + reference + '». Размеры примера можно изменить.';
    byId('origin').hidden = false;
    kitchenPlanner.applyCollection(article.dataset.project);
    update();
  });
}

function update() {
  byId('picked').textContent = document.querySelector('input[name="front"]:checked').value;
  byId('extra-field').hidden = layout.value === 'straight';
  extra.disabled = byId('extra-field').hidden;
  extra.required = !extra.disabled;
  extraLabel.textContent = layout.value === 'corner' ? 'Длина второй стены, см' : 'Длина острова, см';
  statusMessage.textContent = '';
  kitchenPlanner.render();
}
document.querySelectorAll('input[name="front"]').forEach(radio => radio.addEventListener('change', update));
layout.addEventListener('change', () => { extra.value = ''; update(); });
form.addEventListener('input', update);
window.addEventListener('pageshow', update);
update();

function printableSheet(lines) {
  const doc = document.implementation.createHTMLDocument('Слой — эскиз и задание мастеру');
  doc.documentElement.lang = 'ru';
  const meta = doc.createElement('meta');
  meta.setAttribute('charset','utf-8');
  doc.head.prepend(meta);
  const viewport = doc.createElement('meta');
  viewport.name = 'viewport';
  viewport.content = 'width=device-width, initial-scale=1';
  doc.head.append(viewport);
  const style = doc.createElement('style');
  style.textContent = 'body{max-width:700px;margin:6vh auto;padding:0 24px;color:#283627;font:17px/1.55 system-ui}h1{font:42px Georgia}svg{display:block;width:100%;background:#f5f3e7;border:1px solid #aaa}p{white-space:pre-wrap;overflow-wrap:anywhere}@page{size:A4;margin:18mm}';
  doc.head.append(style);
  const title = doc.createElement('h1');
  title.textContent = 'Слой / Задание на кухню';
  doc.body.append(title, drawing.cloneNode(true), byId('volume').cloneNode(true));
  for (const line of [...lines, 'Эскиз для обсуждения. Размеры для изготовления мастер уточнит на замере.']) {
    const p = doc.createElement('p');
    p.textContent = line;
    doc.body.append(p);
  }
  return '<!doctype html>\n' + doc.documentElement.outerHTML;
}
form.addEventListener('submit', event => {
  event.preventDefault();
  const lines = [];
  if (reference) lines.push('Проект-основа — ' + reference);
  lines.push('Фасад — ' + byId('picked').textContent, 'Планировка — ' + layout.selectedOptions[0].text,
    'Основная стена — ' + wall.value + ' см');
  if (!extra.disabled) lines.push(extraLabel.textContent.replace(', см', '') + ' — ' + extra.value + ' см');
  const equipment = Array.from(form.querySelectorAll('[name="equipment"]:checked'), item => item.value);
  if (equipment.length) lines.push('Техника в задании — ' + equipment.join(', '));
  lines.push(...kitchenPlanner.describe());
  const notes = byId('notes').value.trim();
  if (notes) lines.push('Пожелания — ' + notes);
  const textOnly = event.submitter?.value === 'text';
  const data = textOnly ? '\ufeffСлой — задание на расчёт кухни\n\n' + lines.join('\n') : printableSheet(lines);
  const link = document.createElement('a');
  const url = URL.createObjectURL(new Blob([data], {type:textOnly ? 'text/plain;charset=utf-8' : 'text/html;charset=utf-8'}));
  link.href = url;
  link.download = textOnly ? 'Слой — задание на кухню.txt' : 'Слой — эскиз и задание.html';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  statusMessage.textContent = textOnly ? 'Текстовое задание подготовлено для скачивания.' : 'Лист с эскизом подготовлен для скачивания.';
});
