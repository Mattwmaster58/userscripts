// ==UserScript==
// @name            SCRIPT
// @description     SCRIPT DESCRIPTION
// @author          Mattwmaster58 <mattwmaster58@gmail.com>
// @namespace       Mattwmaster58 Scripts
// @match           http://*.example.com/*
// @version         0.1
// ==/UserScript==

function _log(...args) {
  return console.log(...["%c[]", "color: green", ...args]);
}

function _warn(...args) {
  return console.log(...["%c[]", "color: yellow", ...args]);
}

function _debug(...args) {
  return console.log(...["%c[]", "color: green", ...args]);
}
