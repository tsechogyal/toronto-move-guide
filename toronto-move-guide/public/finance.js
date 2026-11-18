"use strict";

const MOVEFinance = (() => {
  const standard = [[55000,.005],[250000,.01],[400000,.015]];
  const ontario = [...standard,[2000000,.02],[Infinity,.025]];
  const toronto = [...standard,[2000000,.02],[3000000,.025],[4000000,.044],
    [5000000,.0545],[10000000,.065],[20000000,.0755],[Infinity,.086]];
  const metroStandard = [...standard,[Infinity,.02]];
  const round = value => Math.round((value + Number.EPSILON) * 100) / 100;

  function marginal(price, brackets) {
    let lower = 0;
    let charge = 0;
    for (const [upper, rate] of brackets) {
      charge += Math.max(0, Math.min(price, upper) - lower) * rate;
      if (price <= upper) break;
      lower = upper;
    }
    return round(charge);
  }

  function transferTaxes(price, city, property, shareON, shareTO) {
    const on = marginal(price, property === "standard" ? ontario : metroStandard);
    const to = city === "toronto" ? marginal(price, property === "standard" ? toronto : metroStandard) : 0;
    return {
      on, to,
      onRebate: round(Math.min(on, 4000) * shareON / 100),
      toRebate: round(Math.min(to, 4475) * shareTO / 100)
    };
  }

  function minimumDown(price) {
    if (price >= 1500000) return round(price * .2);
    return round(Math.min(price, 500000) * .05 + Math.max(0, price - 500000) * .1);
  }

  function monthly(loan, annualRate, years) {
    const installments = years * 12;
    const rate = Math.expm1(Math.log1p(annualRate / 200) / 6);
    return round(rate === 0 ? loan / installments : loan * rate / -Math.expm1(-installments * Math.log1p(rate)));
  }

  function difference(sale, buy) {
    if (!sale || !buy) return null;
    return Math.round((Date.parse(sale) - Date.parse(buy)) / 86400000);
  }

  function project(v) {
    const tax = transferTaxes(v.purchase, v.city, v.taxType, v.rebateON, v.rebateTO);
    const taxDue = tax.on + tax.to - tax.onRebate - tax.toRebate;
    const down = round(v.purchase - v.mortgage);
    const minimum = minimumDown(v.purchase);
    const validDown = down >= minimum;
    // Compare loan to price thresholds directly to avoid division errors at LTV boundaries.
    const insured = v.mortgage > round(v.purchase * .8);
    const premiumRate = v.mortgage <= round(v.purchase * .85) ? .028 :
      v.mortgage <= round(v.purchase * .9) ? .031 : .04;
    const premiumKnown = !insured || (validDown && v.years <= 25 && v.taxType === "standard");
    const premium = insured && premiumKnown ? round(v.mortgage * premiumRate) : 0;
    const insuranceTax = round(premium * .08);
    const buyCosts = round(taxDue + v.buyLegal + v.adjustments + v.otherBuy + insuranceTax);
    const closing = round(down - v.deposit + buyCosts);
    const depositGap = Math.max(0, round(v.deposit - v.depositFunds));
    const days = difference(v.saleDate, v.buyDate);
    const early = days > 0;
    const bridgeCost = early && v.bridgeAmount > 0 ? round(v.bridgeFees + v.bridgeAmount * (v.bridgeRate / 100) * days / 365) : 0;
    const bridgeCash = early && v.bridgeStatus === "confirmed" && v.firmSale === "yes" ? v.bridgeAmount : 0;
    const overlapCost = early ? round(v.carry * days / 30) : 0;
    const cashAfterDeposit = round(v.cash - v.deposit);
    const scenarios = [
      ["Conservative",v.low],["Expected",v.mid],["Optimistic",v.high]
    ].map(([label, price]) => {
      const commission = round(price * v.commission / 100);
      const hst = round(commission * v.hst / 100);
      const net = round(price - commission - hst - v.balance - v.heloc - v.penalty - v.sellLegal - v.otherSale);
      const afterBoth = round(cashAfterDeposit + net - closing - bridgeCost - overlapCost);
      // Same-day funds and undated proceeds need an explicit closing sequence.
      const dayOne = round(cashAfterDeposit + (days < 0 ? net : bridgeCash) - closing);
      const sameDay = days === 0 ? round(dayOne + net) : null;
      return {label,price,commission,hst,net,afterBoth,dayOne,sameDay};
    });
    return {tax,buyCosts,closing,down,minimum,validDown,premiumKnown,premium,insuranceTax,depositGap,
      days,bridgeCost,bridgeCash,overlapCost,scenarios, payment: premiumKnown && validDown ?
        monthly(v.mortgage + premium,v.rate,v.years) : null};
  }

  return {transferTaxes,minimumDown,monthly,difference,project};
})();
