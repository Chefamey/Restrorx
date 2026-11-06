function diagnose(input) {
  const foodCost = Number(input.foodCost);
  const grossProfit = Number(input.grossProfit);
  const menuItems = input.menuItems ? Number(input.menuItems) : null;
  const rating = input.rating ? Number(input.rating) : null;
  const labourCost = Number(input.labourCost);
  const rentPercent = Number(input.rentPercent);
  const costingGap = input.recipeCosting === "No" ? 10 : input.recipeCosting === "Only for some dishes" ? 5 : 0;
  const sopGap = input.sops === "No" ? 8 : input.sops === "Some informal SOPs" ? 4 : 0;
  const foodFlag = foodCost > 32 || grossProfit < 30;
  const above = (value, threshold) => Math.max(0, value - threshold);
  const below = (value, threshold) => Math.max(0, threshold - value);
  const bounded = (value, min, max) => Math.round(Math.max(min, Math.min(max, value)));

  // Retain the original screening weights. Missing optional answers add no penalty.
  const score = bounded(
    82 - above(foodCost, 30) * 2 - below(grossProfit, 35) * 1.5
      - above(labourCost, 32) * 0.8 - above(rentPercent, 12) * 0.8
      - above(menuItems, 45) * 0.35 - (rating === null ? 0 : below(rating, 4.2) * 8)
      - costingGap - sopGap,
    18, 88
  );
  const status = score >= 72 ? "Healthy" : score >= 50 ? "Watch Zone" : "Critical";
  const findings = [
    `You reported food cost of ${foodCost}% and gross margin of ${grossProfit}% of sales for the same month.`,
    costingGap || sopGap
      ? "Your answers show gaps in recipe costing or written procedures. Check whether portions, prep and service steps are followed across shifts."
      : "You reported recipe costing for key dishes and written procedures. Compare actual practice across shifts with those standards.",
    menuItems === null
      ? "Menu size was left blank. Use item sales and shared ingredients to assess menu complexity."
      : `You reported ${menuItems} menu items. Review sales, prep time and ingredient overlap before changing the menu.`
  ];
  if (rating === null) findings.push("No review rating was supplied.");
  else findings.push(`Your reported rating is ${rating}/5. Read recent reviews for recurring issues and use repeat-visit data to assess retention.`);
  if (input.labourCost) findings.push(`You reported labour at ${labourCost}% of sales. Compare staffing hours against sales and ticket times by shift.`);
  if (input.rentPercent) findings.push(`You reported rent at ${rentPercent}% of sales. Review occupancy cost alongside sales before committing to fixed spending.`);

  const foodCheck = "Cost your top five sellers using current invoice prices, recipe yields and measured portions.";
  const systemsCheck = "Observe one busy shift and check whether staff follow the same recipe, portion and handover steps.";
  const menuCheck = "Pull item-level sales and review demand, prep time and ingredient overlap for slow sellers.";
  const serviceCheck = "Record order-to-table times in one busy service and identify where tickets wait.";
  const serviceFlag = input.mainComplaint === "Slow service" || input.consistencyIssue === "Service speed changes";
  const firstIntervention = foodFlag ? foodCheck : serviceFlag ? serviceCheck : costingGap || sopGap ? systemsCheck : menuCheck;
  const actions = [...new Set([firstIntervention, foodCheck, systemsCheck, menuCheck])].slice(0, 3);

  return {
    score,
    status,
    summary: "This RestroRX screening score starts at 82 and deducts points using your cost, menu, rating and operating-system answers. It uses RestroRX rules and self-reported figures. Missing optional answers add no penalty. Use the findings to decide what to measure first.",
    findings,
    actions,
    plan: [
      `Days 1–14: ${firstIntervention}`,
      "Days 15–45: Document the revised process, train across shifts and track the same measure weekly.",
      "Days 46–90: Compare the result with your first two weeks and decide which issue to address next."
    ],
    dimensions: {
      financial: bounded(80 - above(foodCost, 30) * 3 + above(grossProfit, 30), 20, 90),
      menu: menuItems === null ? null : bounded(90 - above(menuItems, 25) * 0.9, 20, 90),
      customerExperience: null,
      team: input.labourCost ? bounded(74 - above(labourCost, 30) * 1.2, 20, 85) : null,
      operations: bounded(76 - costingGap - sopGap, 20, 85),
      onlineReputation: rating === null ? null : bounded(rating * 20, 0, 100)
    },
    menuComplexityRisk: menuItems === null ? null : menuItems > 70 ? "High" : menuItems > 40 ? "Medium" : "Low",
    teamDependenceRisk: input.kitchenRunBy === "One key chef" || input.recipeCosting === "No" ? "High" : "Review",
    firstIntervention,
    chefNote: "Measure the issue on a real shift before changing the menu, staffing or marketing spend."
  };
}

module.exports = { diagnose };
