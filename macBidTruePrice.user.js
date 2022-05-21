// ==UserScript==
// @name            mac.bid true price
// @description     Shows the true price of an item everywhere on the site to better spend your money
// @author          Mattwmaster58 <mattwmaster58@gmail.com>
// @namespace       Mattwmaster58 Scripts
// @match           https://*.mac.bid/*
// @version         0.1
// ==/UserScript==

const USERSCRIPT_DIRTY = "userscript-dirty";

function xPathEval(path, node) {
  const res = document.evaluate(path, node || document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
  let nodes = [];
  for (let i = 0; i < res.snapshotLength; i++) {
    nodes.push(res.snapshotItem(i))
  }
  return nodes;
}

function calculateTruePrice(displayed) {
  // https://www.mac.bid/terms-of-use
  const LOT_FEE = 2;
  // Tax is 7% in Allegheny county, 6% elsewhere,
  // assume the worst b/c it would be too complicated otherwise
  const TAX_RATE = 0.07
  const BUYER_PREMIUM_RATE = 0.15
  return (displayed * (1 + BUYER_PREMIUM_RATE) + LOT_FEE) * (1 + TAX_RATE);
}

function extractPriceFromText(text) {
  return parseFloat(/\$(\d+(?:\.\d{2})?)/ig.exec(text)[1])
}

function round(num) {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

function xPathClass(className) {
  return `[contains(concat(" ",normalize-space(@class)," ")," ${className} ")]`
}

function processPriceElem(node) {
  // this is required even tho our xpath should avoid this, i suspect due to async nature of mutation observer
  if (node.classList.contains(USERSCRIPT_DIRTY)) {
    return;
  }
  node.classList.add(USERSCRIPT_DIRTY);
  node.innerHTML = node.textContent.replace(/(.*)\$(\d+(\.\d{2})?)$/i, (_match, precedingText, price, priceDecimals, _offset, inputString) => {
    // maybe in the future, we replace this completely, but for now show og price for debugging aid
    if (priceDecimals) {
      return `${precedingText} ~$${round(calculateTruePrice(parseFloat(price)))} <sup>$${price}</sup>`;
    } else {
      return `${precedingText} ~$${Math.round(calculateTruePrice(parseFloat(price)))} <sup>$${price}</sup>`;
    }
  });
}


const mutationInstance = new MutationObserver((mutations) => {
  const USERSCRIPT_DIRTY_CLASS_SELECTOR = `[not(contains(concat(" ",normalize-space(@class)," ")," ${USERSCRIPT_DIRTY} "))]`;
  const matchingElems = mutations.map((rec) => {
    rec.addedNodes
  }).flat()
    .map((element) => {
      // the xpathClass btn are necessary because those are added later, otherwise we're operating on old elements
      return xPathEval(
        [
          // current bid, green buttons
          `.//a${USERSCRIPT_DIRTY_CLASS_SELECTOR}${xPathClass("btn")}[starts-with(., 'Current Bid')]`,
          // current bid, green buttons (yes, theres almost 2 of the exact same ones here
          `.//div${USERSCRIPT_DIRTY_CLASS_SELECTOR}${xPathClass("btn")}[starts-with(., 'Current Bid')]`,
          // bid page model, big price
          `.//div${xPathClass("h1")}/span${USERSCRIPT_DIRTY_CLASS_SELECTOR}`,
          // bid amount dropdown
          `.//select/option${USERSCRIPT_DIRTY_CLASS_SELECTOR}`
        ].join(" | ")
        , element);
    }).flat();
  for (const elem of matchingElems) {
      processPriceElem(elem);
  }
});

mutationInstance.observe(document, {
  subtree: true,
  childList: true,
});

