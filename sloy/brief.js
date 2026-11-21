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
    update();
  });
}

function drawElement(tag, attributes, content) {
  const el = document.createElementNS(drawing.namespaceURI, tag);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
  if (content) el.textContent = content;
  drawing.append(el);
}
function sketch() {
  drawing.replaceChildren();
  const main = wall.valueAsNumber;
  const second = extra.disabled ? 0 : extra.valueAsNumber;
  const caption = byId('plan-caption');
  if (!wall.validity.valid || (!extra.disabled && !extra.validity.valid)) {
    caption.textContent = 'Для эскиза заполните размеры выбранной планировки.';
    drawElement('text', {x:230,y:128,'text-anchor':'middle',fill:'#4a5244','font-size':15}, 'Здесь появится ваша планировка');
    return;
  }
  const corner = layout.value === 'corner';
  const island = layout.value === 'island';
  const scale = Math.min(310 / Math.max(main, island ? second : 0), corner ? 143 / second : Infinity);
  const width = main * scale;
  const side = second * scale;
  const depth = Math.min(28, width * 0.4, corner ? side * 0.4 : 28);
  const left = (460 - Math.max(width, island ? side : 0)) / 2;
  const top = corner ? 53 : island ? 63 : 108;
  const fill = {'Натуральный дуб':'#c6a273','Светлый ясень':'#decdad','Оливковый дуб':'#758065'}[byId('picked').textContent];
  const shape = {fill,stroke:'#354033','stroke-width':1.4};
  drawElement('path', {...shape,d:corner
    ? `M${left} ${top}h${width}v${depth}H${left+depth}V${top+side}H${left}Z`
    : `M${left} ${top}h${width}v${depth}h-${width}Z`});
  function dimension(x,y,length,label) {
    drawElement('path',{d:`M${x} ${y}h${length} M${x} ${y-3}v6 M${x+length} ${y-3}v6`,fill:'none',stroke:'#586451'});
    drawElement('text',{x:x+length/2,y:y-7,'text-anchor':'middle',fill:'#263421','font-size':15},label);
  }
  dimension(left,top-7,width,main+' см');
  if (corner) {
    drawElement('path',{d:`M${left-7} ${top}v${side} m-3 0h6 M${left-10} ${top}h6`,stroke:'#586451',fill:'none'});
    drawElement('text',{x:left-12,y:top+side/2+5,'text-anchor':'end',fill:'#263421','font-size':14},second+' см');
  }
  if (island) {
    const islandX = left + (Math.max(width,side)-side)/2;
    drawElement('rect',{...shape,x:islandX,y:top+85,width:side,height:Math.min(35,side/2)});
    dimension(islandX,top+78,side,second+' см');
  }
  caption.textContent = layout.selectedOptions[0].text + ' · ' + byId('picked').textContent;
}
function update() {
  byId('picked').textContent = document.querySelector('input[name="front"]:checked').value;
  byId('extra-field').hidden = layout.value === 'straight';
  extra.disabled = byId('extra-field').hidden;
  extra.required = !extra.disabled;
  extraLabel.textContent = layout.value === 'corner' ? 'Длина второй стены, см' : 'Длина острова, см';
  statusMessage.textContent = '';
  sketch();
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
  doc.body.append(title, drawing.cloneNode(true));
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
  if (equipment.length) lines.push('Встроенная техника — ' + equipment.join(', '));
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
