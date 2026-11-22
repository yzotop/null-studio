(() => {
  const byId = id => document.getElementById(id);
  const budget = byId('budget');
  const policy = byId('policy');
  const number = new Intl.NumberFormat('ru-RU');
  const rubles = cents => number.format(cents / 100) + ' ₽';
  const summary = byId('order-summary');
  const explanation = byId('explanation');
  const body = byId('order-lines');

  const bills = basketInput.weeks.flat();
  const receiptDate = new Intl.DateTimeFormat('ru-RU', {day: 'numeric', month: 'long', timeZone: 'UTC'});

  function renderComparison(comparison, proportional, bags) {
    const onlyProportional = [];
    const onlyBags = [];
    for (const [index, shortages] of proportional.baskets.entries()) {
      const firstComplete = shortages.length === 0;
      const secondComplete = bags.baskets[index].length === 0;
      if (firstComplete === secondComplete) continue;
      const winners = firstComplete ? onlyProportional : onlyBags;
      winners.push(index);
    }

    const rows = [
      ['Сумма заказа', rubles(comparison.proportional.spend), rubles(comparison.bags.spend)],
      ['Остаток бюджета', rubles(comparison.proportional.budget - comparison.proportional.spend),
        rubles(comparison.bags.budget - comparison.bags.spend)],
    ];
    for (const sku of ['85099B', '22386', '15036']) {
      const product = comparison.deltas.get(sku);
      rows.push([product.name + ', шт.', number.format(product.before), number.format(product.after)]);
    }
    rows.push(['Полные корзины из ' + bills.length, proportional.complete, bags.complete],
      ['Хватило обоих цветов сумок из ' + proportional.pairCount + ' покупок', proportional.pairFull, bags.pairFull],
      ['Полные только при этом правиле', onlyProportional.length, onlyBags.length]);
    byId('order-comparison').replaceChildren(...rows.map(([label, ...values]) => {
      const tr = document.createElement('tr');
      const heading = document.createElement('th');
      heading.scope = 'row';
      heading.textContent = label;
      tr.append(heading);
      for (const value of values) tr.insertCell().textContent = value;
      return tr;
    }));

    const counts = 'Если сначала купить сумки, дополнительно удастся собрать целиком '
      + onlyBags.length + ' из ' + bills.length + ' корзин. Риск потерять полную покупку возникнет ещё в '
      + onlyProportional.length + ' случаях.';
    byId('basket-switches').textContent = onlyProportional.length || onlyBags.length ? counts :
      'Корзин, которые собираются целиком только при одном правиле, — 0.';

    // Include a receipt from each direction when both occur, then fill in chronological order.
    const changed = [...onlyProportional, ...onlyBags].sort((a, b) => a - b);
    const sample = new Set([...onlyProportional.slice(0, 1), ...onlyBags.slice(0, 1), ...changed]);
    const examples = [...sample].slice(0, 3).sort((a, b) => a - b);
    const container = byId('receipt-examples');
    container.replaceChildren();
    for (const index of examples) {
      const receipt = basketInput.receipts[index];
      const heading = document.createElement('h4');
      const rule = proportional.baskets[index].length === 0 ? 'общем сокращении' : 'приоритете сумок';
      heading.textContent = 'Чек ' + receipt.number + ' · ' + receiptDate.format(new Date(receipt.date))
        + ' · целиком при ' + rule;
      const lines = document.createElement('ul');
      for (const [line, [skuIndex, requested]] of bills[index].entries()) {
        const first = proportional.issued[index][line];
        const second = bags.issued[index][line];
        if (first === second) continue;
        const product = comparison.proportional.rows[skuIndex];
        const li = document.createElement('li');
        li.textContent = product.name + ' (' + product.unit + '). Покупателю нужно ' + requested
          + '. При общем сокращении можно выдать ' + first + ', при приоритете сумок — ' + second
          + '. Дефицит при ' + (first < second ? 'общем сокращении' : 'приоритете сумок')
          + ' — ' + (requested - Math.min(first, second)) + '.';
        lines.append(li);
      }
      container.append(heading, lines);
    }
  }

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
    const proportional = replayOrder(basketInput, comparison.proportional);
    const bags = replayOrder(basketInput, comparison.bags);
    const replay = policy.value === 'bags' ? bags : proportional;
    renderComparison(comparison, proportional, bags);
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
