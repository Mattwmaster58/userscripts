// ==UserScript==
// @name         GitHub Quick Delete
// @author       Mattwmaster58 <mattwmaster58@gmail.com>
// @namespace    Mattwmaster58 Scripts
// @version      0.1
// @description  Delete GitHub repos without confirmations
// @include      /^https://github\.com/.*/.*/settings/?$/
// @updateURL    https://github.com/Mattwmaster58/userscripts/raw/master/githubQuickDelete.user.js
// ==/UserScript==

const nodes = document.querySelectorAll('.btn-danger[role="button"]');
// we assume the last dangerous button is the delete button...
let deleteButton = nodes[nodes.length - 1];

// ...but just to be sure we do a sanity check
if (deleteButton.innerHTML.search('Delete this repository') === -1) {
  console.error('selected wrong delete button or the text has changed!', deleteButton)
} else {
  console.log('changing delete button text');
  deleteButton.innerHTML = 'Delete this repository (no confirmation!)';
  deleteButton.onclick = submitDeleteForm;
}

function submitDeleteForm() {
  try {
    // the form action URL will end with delete typically
    let deleteForm = document.querySelector('form[action$="delete"]')
    // implicit validation we have the right URL.
    // If we dont match this regex, the repo name doesnt get selected
    let repoName = deleteForm.action.match(/\.com\/(.*\/.*)\/settings\/delete/)[1];
    console.log(`repo name found: ${repoName}`);
    deleteForm.querySelector('input:not([type=hidden])').value = repoName;
    console.log('submitting delete form');
    deleteForm.submit()
  } catch (error) {
    console.error('error occurred trying to submit delete form:', error);
  }
}
