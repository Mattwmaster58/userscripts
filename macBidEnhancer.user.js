// ==UserScript==
// @name            mac.bid enhancer
// @description     Shows the true price of an item everywhere on the site to better spend your money. Note: assumes worst case tax scenario (7%, Allegheny county) when it is sometimes 6%
// @author          Mattwmaster58 <mattwmaster58@gmail.com>
// @namespace       Mattwmaster58 Scripts
// @match           https://*.mac.bid/*
// @version         0.2
// ==/UserScript==

const USERSCRIPT_DIRTY_CLASS = "userscript-dirty";
const USERSCRIPT_DIRTY_CLASS_SELECTOR = `[not(contains(concat(" ",normalize-space(@class)," ")," ${USERSCRIPT_DIRTY_CLASS} "))]`;
const NO_BIDS_CLASS = "userscript-no-bids";
const NO_BIDS_CSS = `
.${NO_BIDS_CLASS} {
  background-color: #0061a5;
}

span.${NO_BIDS_CLASS} {
  color: gray;
}
`

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
  const zeroWidthSpace = '​';
  if (node.classList.contains(USERSCRIPT_DIRTY_CLASS) || node.innerText.includes(zeroWidthSpace)) {
    return;
  }
  if (/(.*)\$((\d+)(\.\d{2})?)$/i.test(node.textContent)) {
    node.classList.add(USERSCRIPT_DIRTY_CLASS);
    // noinspection JSUnusedLocalSymbols
    node.innerHTML = node.textContent.replace(/(.*)\$((\d+)(\.\d{2})?)$/i, (_match, precedingText, price, integralPart, fractionalPart) => {
      node.title = `true price is active - displayed price was ${price}`;
      // really no reason to show site price if we know the "real" price
      // return `${precedingText} ~$${Math.round(calculateTruePrice(parseFloat(price)))} <sup>($${integralPart})</sup>`;
      return `${zeroWidthSpace}${precedingText} $${Math.round(calculateTruePrice(parseFloat(price)))}`;
    });
  }
}


const truePriceMutationObserver = new MutationObserver((mutations) => {
  const USERSCRIPT_NOT_DIRTY_CLASS_SELECTOR = `[not(contains(concat(" ",normalize-space(@class)," ")," ${USERSCRIPT_DIRTY_CLASS} "))]`;
  let xPathEvalCallback = (element) => {
    // the xpathClass btn are necessary because those are added later, otherwise we're operating on old elements
    return xPathEval(
      [
        // current bid, green buttons
        `.//a${xPathClass("btn")}${USERSCRIPT_NOT_DIRTY_CLASS_SELECTOR}[starts-with(., 'Current Bid')]`,
        // current bid, green buttons (yes, theres almost 2 of the exact same ones here
        `.//div${xPathClass("btn")}${USERSCRIPT_NOT_DIRTY_CLASS_SELECTOR}[starts-with(., 'Current Bid')]`,
        // bid page model, big price
        `.//div${xPathClass("h1")}/span${USERSCRIPT_NOT_DIRTY_CLASS_SELECTOR}`,
        // bid amount dropdown
        `.//select/option${USERSCRIPT_NOT_DIRTY_CLASS_SELECTOR}`,
        // status indicator when you have highest bid
        `.//p${xPathClass("alert")}[starts-with(., \" YOU'RE WINNING \")]`,
      ].join(" | ")
      , element);
  };
  let targetsModified = new Set();

  const matchingElems =
    mutations
      .map((rec) => {
        if (rec.addedNodes.length === 0) {
          targetsModified.add(rec.target);
        }
        return Array.from(rec.addedNodes)
      })
      .flat()
      .map(xPathEvalCallback).flat()

  if (targetsModified.size > 0) {
    matchingElems.push(...xPathEvalCallback(document.body));
  }
  // if we try to modify the nodes right away, we get some weird react errors
  // so instead, we use setTimeout(..., 0) to yield to the async event loop, letting react do its react things
  // and immediately executing this when react is done doing its things
  setTimeout(() => {
    for (const elem of matchingElems) {
      processPriceElem(elem);
    }
  }, 0);
});

function secondsFromTimeLeft(timeLeftStr) {
  const conversions = Object.values({
    day: 60 * 60 * 24,
    hour: 60 * 60,
    minute: 60,
    second: 1,
  });

  return /(\d{1,2})d(\d{1,2})h(\d{1,2})m(\d{1,2})s/i
    .exec(timeLeftStr)
    .slice(1)
    .map(parseFloat)
    .map((num, idx) => Object.values(conversions)[idx] * num)
    .reduce((a, b) => a + b);
}

function tabTitle(prefix, suffix) {
  // gets an appropriate tab title based on url
  prefix = prefix || "";
  suffix = suffix || "";
  if (location.pathname === "/account/watchlist") {
    return `${prefix} - Watchlist ${suffix}`;
  } else if (/\/auction\/.*\/lot\/\d+/.test(location.pathname)) {
    const itemTitle = document.querySelector(".page-title-overlap h1").textContent;
    return `${prefix} - ${itemTitle} ${suffix}`;
  } else {
    return `${prefix} mac.bid ${suffix}`;
  }
}

const minTimeSentinel = 10 ** 10;
let minTime = minTimeSentinel;

const remainingTimeMutationObserver = new MutationObserver((mutations) => {
  // or anywhere there's a countdown?
  let minTimeText = "";
  if (location.pathname === "/account/watchlist" || /\/auction\/.*\/lot\/\d+/.test(location.pathname)) {
    mutations
      .map((mut) => {
        const parent = mut.target.parentElement.parentElement.parentElement;
        if (Array.from(parent.classList).includes("cz-countdown")) {
          let m;
          if ((m = secondsFromTimeLeft(parent.textContent)) < minTime) {
            minTime = m;
            // we would like to see the two most significant digits
            // eg: 2d19h7m11s → 2d19h
            minTimeText = /^(?:0[dhms])*((?:[1-9]\d?[dhms]){1,2})/i.exec(parent.textContent)[1];
            document.title = tabTitle(minTimeText);
          }
        }
      });

    // todo: theoretically handles the handover on the *next* cycle of text change instead of instantly
    if (minTime === 0) {
      // if minTime is 0, the auction has ended and will be removed imminently
      // this means that there should be a longer item on the wl,
      // let it naturally take over in the course of the loop
      minTime = minTimeSentinel;
    }
  }
});

truePriceMutationObserver.observe(document.body, {
  childList: true,
  subtree: true
});

remainingTimeMutationObserver.observe(document.body, {
  subtree: true,
  characterData: true,
});
