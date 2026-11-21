// Identical demand and initial inventory for both policies. One receipt before week two.
function replayOrder(data, order) {
  const stock=data.opening.slice();
  const demand=stock.map(()=>0), missing=stock.map(()=>0);
  const red=data.skus.indexOf('85099B'), pink=data.skus.indexOf('22386');
  const baskets=[], weekly=[];
  let pairCount=0, pairFull=0;
  data.weeks.forEach((week, index)=>{
    if (index===1) data.skus.forEach((sku,i)=>{
      if (order.rows[i].sku!==sku) throw Error('Order and replay catalogs differ');
      stock[i]+=order.rows[i].units;
    });
    let complete=0;
    for(const bill of week) {
      const short=[];
      let colors=0, bagsOk=true;
      for(const [i,quantity] of bill) {
        const give=Math.min(stock[i],quantity);
        stock[i]-=give; demand[i]+=quantity; missing[i]+=quantity-give;
        if(give<quantity) short.push(i);
        if(i===red || i===pink) { colors++; if(give<quantity) bagsOk=false; }
      }
      if(colors===2) { pairCount++; if(bagsOk) pairFull++; }
      if(!short.length) complete++;
      baskets.push(short);
    }
    weekly.push(complete);
  });
  return {complete:weekly[0]+weekly[1],weekly,baskets,stock,missing,demand,pairCount,pairFull};
}
if(typeof module!=='undefined') module.exports={replayOrder};
