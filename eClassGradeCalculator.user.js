// ==UserScript==
// @name          	eClass Grade Calculator
// @description     Calculates your grade based on "Relative Weight" and "Contribution to course total" columns. Sometimes these columns are populated without your grade being revealed.
// @author			Mattwmaster58 <mattwmaster58@gmail.com>
// @namespace       Mattwmaster58 Scripts
// @match			https://eclass.srv.ualberta.ca/course/user.php?*mode=grade*
// @version         0.1
// ==/UserScript==

(function() {
    document.querySelectorAll('.user-grade tr').forEach((e) => {
        if (e.querySelector(".item")) {
            let rel = e.querySelector(".column-weight");
            let contrib = e.querySelector(".column-contributiontocoursetotal");
            let grade = e.querySelector(".column-percentage");
            if (rel && contrib && grade.innerText === '-') {
                let rel_parsed = parseColElem(rel);
                if (rel_parsed) {
                    let contrib_parsed = parseColElem(contrib);
                    let result_percent = Math.round((contrib_parsed / rel_parsed)*100)/100;
                    grade.innerText = `*${result_percent}%`;
                }
            }
        }
    });
    function parseColElem(elem) {
        try {
            return parseFloat(/\d{1,2}\.\d{1,2}/.exec(elem.innerText)[0]) || 0;
        } catch {
            return 0;
        }
    }

    function parseContrib(elem) {

    }

})();
