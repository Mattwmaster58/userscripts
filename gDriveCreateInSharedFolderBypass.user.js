// ==UserScript==
// @name          	Google Drive - Bypass "create in a shared folder?" prompt
// @author			Mattwmaster58 <mattwmaster58@gmail.com>
// @namespace       Mattwmaster58 Scripts
// @match			http://*.example.com/*
// @version         0.1
// ==/UserScript==


function observerCallback(mutations) {
  const CREATE_AND_SHARE_DIALOG_CLASS_NAME = "lb-k g-ge"
  // Use Array.some as forEach with breaking capability
  mutations.some((mutation) => {
    if (mutation.type === "childList") {
      return mutation.addedNodes.some((addedNode) => {
        if (addedNode.className === CREATE_AND_SHARE_DIALOG_CLASS_NAME) {
          console.log("Create in shared folder dialog detected, confirming immediately");
          addedNode.querySelector('[name="ok"]').click();
          return true;
        }
      });
    }
  });
}

const observer = new MutationObserver(observerCallback);
observer.observe(document.body, {childList: true});

