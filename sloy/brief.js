const form = document.getElementById('kitchen-form');
const picked = document.getElementById('picked');
const layout = document.getElementById('layout');
const extra = document.getElementById('extra');
const extraField = document.getElementById('extra-field');
const extraLabel = document.getElementById('extra-label');
const statusMessage = document.getElementById('status');
function update() {
  picked.textContent = document.querySelector('input[name="front"]:checked').value;
  extraField.hidden = layout.value === 'straight';
  extra.disabled = extraField.hidden;
  extra.required = !extraField.hidden;
  extraLabel.textContent = layout.value === 'corner' ? 'Длина второй стены, см' : 'Длина острова, см';
  document.querySelector('.plan').dataset.layout = layout.value;
  statusMessage.textContent = '';
}
document.querySelectorAll('input[name="front"]').forEach(radio => radio.addEventListener('change', update));
layout.addEventListener('change', () => { extra.value = ''; update(); });
form.addEventListener('input', () => { statusMessage.textContent = ''; });
window.addEventListener('pageshow', update);
update();
form.addEventListener('submit', event => {
  event.preventDefault();
  const lines = ['Слой — задание на расчёт кухни', '', 'Фасад — ' + picked.textContent,
    'Планировка — ' + layout.selectedOptions[0].textContent,
    'Основная стена — ' + document.getElementById('length').value + ' см'];
  if (!extra.disabled) lines.push(extraLabel.textContent.replace(', см', '') + ' — ' + extra.value + ' см');
  const notes = document.getElementById('notes').value.trim();
  if (notes) lines.push('Пожелания — ' + notes);
  const url = URL.createObjectURL(new Blob(['\ufeff' + lines.join('\n') + '\n'], {type:'text/plain;charset=utf-8'}));
  const link = document.createElement('a');
  link.href = url;
  link.download = 'Слой — задание на кухню.txt';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
  statusMessage.textContent = 'Задание подготовлено для скачивания.';
});
