(() => {
  const byId = id => document.getElementById(id);
  const budget = byId('budget');
  const policy = byId('policy');
  const number = new Intl.NumberFormat('ru-RU');
  const rubles = cents => number.format(cents / 100) + ' ₽';
  const summary = byId('order-summary');
  const explanation = byId('explanation');
  const body = byId('order-lines');

  function recalculate() {
    const raw = budget.value.replace(/\s/g, '').replace(',', '.');
    const cents = Math.round(Number(raw) * 100);
    const valid = /^\d+(\.\d{0,2})?$/.test(raw) && Number.isSafeInteger(cents) && cents <= 4558520000;
    budget.setAttribute('aria-invalid', String(!valid));
    byId('budget-error').hidden = valid;
    byId('order-result').hidden = !valid;
    if (!valid) return;

    const comparison = clientOrder.compare(cents);
    const selected = comparison[policy.value];
    const replay = replayOrder(basketInput, selected);
    summary.textContent = 'Сумма заказа — ' + rubles(selected.spend) +
      '. Остаток бюджета — ' + rubles(cents - selected.spend) + '.';
    byId('basket-count').textContent = 'По чекам хватило товара на ' + replay.complete + ' из ' +
      replay.baskets.length + ' корзин целиком. Обеих расцветок хватило в ' + replay.pairFull +
      ' из ' + replay.pairCount + ' совместных покупок.';
    body.replaceChildren(...selected.rows.map(row => {
      const tr = document.createElement('tr');
      const values = [row.name, row.sku, row.unit, rubles(row.cost), number.format(row.need),
        number.format(row.units), number.format(row.need - row.units), rubles(row.units * row.cost)];
      for (const value of values) tr.insertCell().textContent = value;
      return tr;
    }));
    const saved = clientExamples[policy.value + '/' + cents];
    byId('explanation-title').textContent = saved ? 'Пояснение AI для этого заказа' : 'Почему изменилось количество товаров';
    explanation.textContent = saved ? [saved.budget, saved.red, saved.pink, saved.tradeoff].join(' ') :
      clientOrder.tradeoff(comparison, policy.value)[0];
    byId('explanation-source').textContent = saved ? 'Сохранённый ответ Qwen, сверенный с этой ведомостью.' :
      'Для этого лимита пояснение составлено по формуле.';
  }
  budget.addEventListener('input', recalculate);
  policy.addEventListener('change', recalculate);
  recalculate();
})();
