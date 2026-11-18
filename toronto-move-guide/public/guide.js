"use strict";

const byId = id => document.getElementById(id);
const planner = byId("planner");
const locale = "en-CA";
const dollars = new Intl.NumberFormat(locale, {style:"currency",currency:"CAD",minimumFractionDigits:0,maximumFractionDigits:2});
const dateFormat = new Intl.DateTimeFormat(locale, {dateStyle:"medium",timeZone:"UTC"});
const money = amount => dollars.format(amount);

const groups = {
  "sale-fields": [
    ["low","Conservative sale price",1000000],["mid","Expected sale price",1100000],
    ["high","Optimistic sale price",1200000],["balance","Mortgage payout balance",500000]
  ],
  "sale-extra": [
    ["heloc","HELOC balance to repay",0],["penalty","Mortgage break penalty",0],
    ["commission","Commission (%)",4,100],["hst","HST on commission (%)",13,100],
    ["sellLegal","Sale legal and discharge costs",1600],["otherSale","Other selling costs",2000]
  ],
  "buy-fields": [
    ["purchase","Purchase price",1250000],["mortgage","Proposed mortgage before insurance",850000],
    ["cash","Liquid cash before deposit",100000],["depositFunds","Cash available for deposit",70000],
    ["deposit","Agreed or planned deposit",62500],
    ["city","Purchase location",[["toronto","City of Toronto"],["ontario","Elsewhere in Ontario"]]]
  ],
  "buy-extra": [
    ["buyLegal","Purchase legal and title costs",2500],["adjustments","Closing adjustments",1500,100000000,-100000000],
    ["otherBuy","Other purchase costs",0],
    ["taxType","Land transfer tax property class",[["standard","One or two single-family residences"],["other","Other class confirmed by lawyer"]]],
    ["rebateON","Ontario eligible ownership share (%)",0,100],
    ["rebateTO","Toronto eligible ownership share (%)",0,100],
    ["rate","Mortgage interest rate (%)",4.5,30],["years","Amortization (years)",25,40,1],
    ["appraisal","Lender appraisal if known",0,null,null,"Enter 0 if unknown."]
  ],
  "date-fields": [
    ["saleDate","Sale closing date","date"],["buyDate","Purchase closing date","date"],
    ["firmSale","Current home sale",[["no","No firm sale yet"],["yes","Firm sale agreement"],["closed","Already closed"]]],
    ["financing","Purchase financing",[["unknown","Awaiting confirmation"],["yes","Confirmed for this purchase"]]]
  ],
  "risk-fields": [
    ["bridgeAmount","Bridge loan amount",0],["bridgeRate","Bridge interest rate (%)",8,100],
    ["bridgeFees","Bridge fees",0],["carry","Extra overlap costs per 30 days",0,null,null,"Exclude bridge interest and fees."],
    ["bridgeStatus","Bridge funds",[["unknown","Unconfirmed or not arranged"],["confirmed","Approved and available at closing"]]],
    ["conditions","Purchase conditions",[["planning","Planning or still conditional"],["firm","Firm purchase"]]],
    ["property","Next home type",[["freehold","Freehold"],["condo","Condo"]]],
    ["tenancy","Tenanted property involved?",[["no","No"],["yes","Yes"]]],
    ["reno","Renovate before moving?",[["no","No"],["yes","Yes"]]],
    ["buyerIssue","Concern about your buyer closing?",[["no","No known issue"],["yes","Yes, there may be a delay or failure"]]],
    ["payout","Mortgage penalty or payout verified?",[["no","No or unsure"],["yes","Yes, or no mortgage"]]]
  ]
};

function node(tag, value, className) {
  const element = document.createElement(tag);
  if (value !== undefined) element.textContent = value;
  if (className) element.className = className;
  return element;
}

for (const [group, fields] of Object.entries(groups)) {
  for (const [name, title, value, max, min, hint] of fields) {
    const label = node("label",title);
    const field = node(Array.isArray(value) ? "select" : "input");
    field.name = name;
    if (Array.isArray(value)) {
      for (const [key, text] of value) field.add(new Option(text,key));
    } else if (value === "date") {
      field.type = "date";
      field.min = "2000-01-01";
      field.max = "2100-12-31";
    } else {
      field.type = "number";
      field.inputMode = name === "years" ? "numeric" : "decimal";
      field.step = name === "years" ? "1" : "0.01";
      field.min = min ?? 0;
      field.max = max ?? 100000000;
      field.defaultValue = value;
      field.required = true;
    }
    label.append(field);
    if (hint) {
      const description = node("small",hint);
      description.id = name + "-hint";
      field.setAttribute("aria-describedby",description.id);
      label.append(description);
    }
    byId(group).append(label);
  }
}

const scenarioLabels = ["Situation","What’s easy to miss","Possible impact","How to prepare","Next step"];
for (const [title,...body] of MOVEContent.scenarios) {
  const details = node("details");
  const list = node("dl");
  body.forEach((line,index) => list.append(node("dt",scenarioLabels[index]),node("dd",line)));
  if (title === "Selling a tenanted property") {
    const source = node("a","Ontario Landlord and Tenant Board guidance");
    source.href = "https://tribunalsontario.ca/documents/ltb/Brochures/How%20a%20Landlord%20Can%20End%20a%20Tenancy.html";
    list.lastElementChild.append(" ",source);
  }
  details.append(node("summary",title),list);
  byId("scenario-list").append(details);
}

function readInputs() {
  const values = {strategy:planner.elements.strategy.value};
  let problem = null;
  for (const fields of Object.values(groups)) {
    for (const [name, title, value] of fields) {
      const field = planner.elements[name];
      field.removeAttribute("aria-invalid");
      values[name] = typeof value === "number" ? field.valueAsNumber : field.value;
      if (!field.validity.valid) problem ??= [name,"Check “" + title + "” and enter a value within the allowed range."];
    }
  }
  problem ??= values.purchase <= 0 ? ["purchase","Enter a purchase price above zero."] : null;
  problem ??= values.low > values.mid || values.mid > values.high ?
    ["mid","Put the three sale prices in order from conservative to optimistic."] : null;
  problem ??= values.mortgage > values.purchase ?
    ["mortgage","Enter a mortgage amount no higher than the purchase price."] : null;
  problem ??= values.deposit > values.purchase - values.mortgage + .005 ?
    ["deposit","The deposit exceeds the down payment implied by your purchase price and mortgage. Review these amounts."] : null;
  problem ??= values.depositFunds > values.cash ?
    ["depositFunds","Cash available for the deposit must be part of your total liquid cash."] : null;
  return {values,problem};
}

function timeline(days) {
  if (days === null) return "Enter both closing dates to see the overlap or housing gap. Until then, the purchase-closing figures shown assume sale funds are unavailable.";
  if (days === 0) return "Same-day closings. Confirm the order and funds release with both lawyers, and arrange a backup if funds or keys are delayed.";
  const length = Math.abs(days) + (Math.abs(days) === 1 ? " day" : " days");
  return days > 0 ? "Purchase closes " + length + " before sale. Confirm funding, carrying costs and what happens if the sale closes late." :
    "Sale closes " + length + " before purchase. Confirm possession and budget for accommodation, storage and moving twice.";
}

function risks(v,r) {
  const low = r.scenarios[0];
  const items = [];
  if (!r.validDown) items.push(["Down payment below modeled minimum", "The proposed mortgage leaves " + money(r.down) + " down. Ask your lender about the minimum of " + money(r.minimum) + " for this purchase."]);
  if (r.validDown && !r.premiumKnown) items.push(["Insurance quote needed", "The payment and insurance costs require a lender quote for this loan or amortization. The cash estimate omits insurance tax until quoted."]);
  if (r.depositGap) items.push(["Deposit cash shortfall","You are " + money(r.depositGap) + " short in accessible deposit funds. Ask your lender which sources are acceptable before making an offer."]);
  if (low.afterBoth < 0) items.push(["Conservative sale leaves a shortfall","The projected final gap is " + money(-low.afterBoth) + ". Review the purchase limit and cash reserve with your lender and Realtor."]);
  if (low.net < 0) items.push(["Sale may require cash to close","The conservative sale may not cover your payouts and expenses. Ask your lawyer to confirm how much you would need to bring."]);
  if (v.conditions === "firm" && v.firmSale === "no" &&
      v.cash - v.deposit - r.closing < 0 && low.dayOne >= 0) {
    items.push(["Firm purchase depends on an unsold home", "Your modeled closing uses projected sale proceeds. Speak with your lawyer and lender now about a firm sale deadline or committed backup funds."]);
  }
  if (low.dayOne < 0) {
    const closingRisk = v.conditions === "firm" && v.firmSale === "no" ?
      ["Urgent: firm purchase with an unfunded closing","Your conservative closing estimate depends on proceeds or other funds that are not available under the modeled timeline. Call your lawyer and lender now."] :
      ["Confirm accessible closing funds","The conservative case shows " + money(-low.dayOne) + " needed at purchase closing" + (r.days === 0 ? " if purchase funds are required before sale funds arrive" : "") + ". Have your lender and lawyer review the sequence and funding."];
    items.push(closingRisk);
  }
  if (r.days > 0 && r.bridgeCash === 0) items.push(["Purchase closes before sale","Bridge proceeds are excluded from available funds. Ask your lender to confirm the amount, advance date and firm-sale requirements."]);
  if (r.bridgeCash > Math.max(0,low.net)) items.push(["Bridge exceeds conservative sale proceeds","Ask your lender how the loan and charges will be repaid if your selling price comes in below plan."]);
  if (v.financing !== "yes") items.push(["Financing still to verify", v.conditions === "firm" ?
    "Your purchase is firm. Contact your lender and lawyer promptly about outstanding approval or appraisal requirements." :
    "Get property-specific approval and check appraisal and funding requirements before removing conditions."]);
  if (!v.appraisal && v.mortgage > 0) items.push(["Appraisal unentered","Ask your lender which property value it will use and confirm whether the loan amount could change."]);
  if (v.appraisal > 0 && v.appraisal < v.purchase) items.push(["Appraisal below purchase price by " + money(v.purchase-v.appraisal),"Ask your broker for the revised advance. Replace the proposed mortgage with that amount to recalculate closing cash."]);
  if (v.payout !== "yes" && (v.balance || v.heloc)) items.push(["Payout or penalty unverified","Ask for a dated mortgage and HELOC payout and compare breaking the mortgage with porting it."]);
  if (v.tenancy === "yes") items.push(["Tenant possession needs legal review","Ask your lawyer to review the tenancy and sale terms before relying on a vacant-possession date."]);
  if (v.buyerIssue === "yes") items.push(["Your buyer may miss closing","Contact your lawyer and lender immediately about extensions and backup cash for your next closing."]);
  if (!items.length) items.push(["Confirm the figures before committing","Review the estimated figures, funds release and dates with your lender and lawyer."]);
  return items;
}

const checked = new Set();
function drawChecklist(v,r) {
  const items = [
    v.strategy === "sell" ? "Agree on a conservative list-price plan and a realistic sale closing." : "Decide how long you could carry both homes and set a fallback plan.",
    "Confirm deposit amount, deadline and accessible cash.",
    "Send mortgage documents and verify approval for the property before conditions expire.",
    "Send signed agreements to your lawyer and confirm closing instructions, adjustments and funds.",
    "Arrange insurance, utilities, mail forwarding and movers.",
    "Schedule the final walkthrough and confirm when keys can be released."
  ];
  if (v.balance) items.push("Get a dated mortgage payout, penalty and portability quote.");
  if (v.heloc) items.push("Confirm the HELOC payout, discharge and how any draw affects qualification.");
  if (r.days > 0) items.push("Confirm bridge availability, repayment, overlap budget and a delayed-sale backup.");
  if (r.days < 0) items.push("Arrange temporary housing, storage and separate moving dates.");
  if (r.days === 0) items.push("Confirm the funds-release order and keep movers flexible for same-day delays.");
  if (r.days === null) items.push("Enter both closing dates and check how they affect access to sale proceeds.");
  if (v.property === "condo") items.push("Review the status certificate and book the elevator with property management.");
  else items.push("Review the freehold inspection and budget for near-term repairs.");
  if (v.tenancy === "yes") items.push("Have your lawyer review the lease and possession terms.");
  if (v.reno === "yes") items.push("Confirm renovation approvals, contractor scheduling and alternate accommodation.");
  if (v.buyerIssue === "yes") items.push("Ask about backup funding and what to do if your buyer delays or defaults.");
  byId("checklist").replaceChildren(...items.map(item => {
    const input = node("input");
    input.type = "checkbox";
    input.checked = checked.has(item);
    input.addEventListener("change",() => {
      if (input.checked) checked.add(item);
      else checked.delete(item);
      progress();
    });
    const label = node("label");
    const li = node("li");
    label.append(input,node("span",item));
    li.append(label);
    return li;
  }));
  function progress() {
    byId("progress").textContent = items.filter(item => checked.has(item)).length + " of " + items.length + " tasks complete";
  }
  progress();
}

function drawPlan(v,r) {
  const strategy = MOVEContent[v.strategy];
  const cards = node("div",undefined,"metrics");
  for (const scenario of r.scenarios) {
    const {label,price,net,afterBoth,dayOne,sameDay,commission,hst} = scenario;
    const card = node("article",undefined,"metric");
    card.append(node("strong",label),node("small","Sale at " + money(price)),
      node("strong",money(net),"amount"),node("small","Estimated net proceeds"),
      node("small","Commission and HST " + money(commission + hst)),
      node("p","Purchase closing " + balance(dayOne)),
      node("small","After both closings " + balance(afterBoth)));
    if (sameDay !== null) card.append(node("small","If sale funds release first " + balance(sameDay)));
    cards.append(card);
  }
  const dates = node("p","Sale closing: " + formattedDate(v.saleDate) + " · Purchase closing: " + formattedDate(v.buyDate));
  const breakdown = node("dl",undefined,"breakdown");
  const rows = [
    ["Purchase price",money(v.purchase)],["Proposed mortgage before insurance",money(v.mortgage)],
    ["Total down payment",money(r.down)],["Deposit included in down payment",money(v.deposit)],
    ["Deposit cash currently available",money(v.depositFunds)],["Deposit cash shortfall",money(r.depositGap)],
    ["Liquid cash after modeled deposit",money(v.cash-v.deposit)],
    ["Ontario land transfer tax",money(r.tax.on)],
    ["Toronto land transfer tax",money(r.tax.to)],
    ["Estimated eligible rebates at closing",money(r.tax.onRebate+r.tax.toRebate)],
    ["Mortgage insurance premium financed",r.premiumKnown ? money(r.premium) : "Quote needed"],
    ["Ontario tax on insurance due at closing",r.premiumKnown ? money(r.insuranceTax) : "Quote needed"],
    ["Total purchase closing costs and adjustments",money(r.buyCosts)],
    ["Cash due at purchase closing after deposit",money(r.closing)],
    ["Estimated monthly mortgage payment",r.payment === null ? "Quote needed" : money(r.payment)],
    ["Confirmed bridge cash included in model",money(r.bridgeCash)],
    ["Estimated bridge interest and fees",money(r.bridgeCost)],
    ["Estimated overlap carrying costs",money(r.overlapCost)]
  ];
  for (const [label,value] of rows) breakdown.append(node("dt",label),node("dd",value));
  const warnings = node("ul",undefined,"risks");
  for (const [title,detail] of risks(v,r)) {
    const li = node("li");
    li.append(node("strong",title),node("div",detail));
    warnings.append(li);
  }
  byId("plan-results").replaceChildren(node("h3",strategy.title),node("p",strategy.summary),dates,
    node("p",timeline(r.days)),node("h3","Three sale-price scenarios"),cards,
    node("p","Final balances assume both transactions complete at the entered prices. Closing balances account for the modeled release of sale or approved bridge funds. The deposit cash test is separate.", "fine"),
    node("h3","Purchase and financing breakdown"),breakdown,node("h3","Risks and next steps"),warnings);
  drawChecklist(v,r);
}

function formattedDate(value) {
  return value ? dateFormat.format(new Date(value + "T00:00:00Z")) : "Not entered";
}

function balance(value) {
  return value < 0 ? "shortfall of " + money(-value) : "surplus of " + money(value);
}

function render(focusError = false) {
  const {values,problem} = readInputs();
  document.querySelector(".field-error")?.remove();
  planner.querySelectorAll("[aria-errormessage]").forEach(field => field.removeAttribute("aria-errormessage"));
  const strategy = MOVEContent[values.strategy];
  const steps = node("ol");
  steps.append(...strategy.steps.map(step => node("li",step)));
  byId("journey-text").replaceChildren(node("p",strategy.summary),steps);
  byId("timeline-live").textContent = timeline(MOVEFinance.difference(values.saleDate,values.buyDate));
  byId("errors").hidden = !problem;
  byId("errors").textContent = problem?.[1] ?? "";
  byId("print").disabled = Boolean(problem);
  if (problem) {
    const field = planner.elements[problem[0]];
    field.setAttribute("aria-invalid","true");
    const inlineError = node("small",problem[1],"field-error");
    inlineError.id = "field-error";
    field.after(inlineError);
    field.setAttribute("aria-errormessage",inlineError.id);
    byId("plan-results").replaceChildren(node("p","Correct the calculator entry to see your updated plan."));
    byId("progress").textContent = "";
    byId("checklist").replaceChildren();
    if (focusError) {
      const panel = field.closest("details");
      if (panel) panel.open = true;
      field.focus();
    }
    return false;
  }
  drawPlan(values,MOVEFinance.project(values));
  return true;
}

planner.addEventListener("change",() => render());
document.querySelector(".choice").addEventListener("change",() => render());
planner.addEventListener("submit",event => {
  event.preventDefault();
  updatePlan();
});
function updatePlan() {
  if (render(true)) {
    byId("updated").textContent = "Your plan has been updated.";
    byId("plan-title").focus();
  }
}
byId("update").disabled = false;
byId("update").addEventListener("click",updatePlan);
byId("print").addEventListener("click",() => {
  if (render(true)) window.print();
});

const evaluation = byId("evaluation-form");
const endpoint = evaluation.dataset.endpoint.trim();
const sendButton = evaluation.querySelector("button");
const draftStatus = byId("draft-status");
if (endpoint) {
  sendButton.textContent = "Send evaluation request";
  byId("privacy").textContent = "Your contact and property details will be sent to Tsering through the form service to respond to this request. Your calculator and checklist stay in your browser. This request does not subscribe you to marketing.";
}
evaluation.addEventListener("submit",async event => {
  event.preventDefault();
  if (sendButton.disabled) return;
  const data = new FormData(evaluation);
  if (endpoint) {
    sendButton.disabled = true;
    draftStatus.textContent = "Sending your request…";
    try {
      const response = await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json"},
        body:JSON.stringify(Object.fromEntries(data)),credentials:"omit",signal:AbortSignal.timeout(15000)});
      if (!response.ok) throw new Error("Request failed.");
      evaluation.reset();
      draftStatus.textContent = "Your evaluation request was submitted.";
    } catch {
      draftStatus.textContent = "We couldn’t confirm that your request was submitted. Email or call Tsering to follow up.";
    } finally {
      sendButton.disabled = false;
    }
    return;
  }
  const labels = {name:"Name",email:"Reply email",address:"Property address",phone:"Phone",type:"Property type",
    size:"Approximate size",condition:"Condition",timing:"Selling timeline",notes:"Notes"};
  const body = ["Hi Tsering,","I’d like a preliminary selling-price range for my home.","",
    ...Object.entries(labels).filter(([key]) => data.get(key).trim()).map(([key,label]) => label + ": " + data.get(key).trim())].join("\r\n");
  draftStatus.textContent = "Review and send the draft in your email app. Nothing has been submitted through the guide.";
  window.location.href = "mailto:tsechogyal@gmail.com?subject=" + encodeURIComponent("Toronto GTA MOVE Guide - home evaluation") + "&body=" + encodeURIComponent(body);
});
sendButton.disabled = false;
render();
