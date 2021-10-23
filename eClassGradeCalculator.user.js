// ==UserScript==
// @name            eClass Grade Calculator
// @description     Calculates your grade based on "Relative Weight" and "Contribution to course total" columns. Sometimes these columns are populated without your grade being revealed.
// @author          Mattwmaster58 <mattwmaster58@gmail.com>
// @namespace       Mattwmaster58 Scripts
// @match           https://eclass.srv.ualberta.ca/course/user.php*
// @match           https://eclass.srv.ualberta.ca/grade/report/user/index.php*
// @version         0.3
// ==/UserScript==

(function() {
    // if we aren't dealing with this URL: https://eclass.srv.ualberta.ca/grade/report/user/index.php
    if (!location.pathname.startsWith("/grade/")) {
        // make sure we're on a page with grades
        const urlParams = new URLSearchParams(location.search);
        if (urlParams.get('mode') !== "grade") {
            return;
        }
    }

    const derived_tooltip = "This number was derived from \"Relative Weight\" and \"Contribution to course total\" columns";

    Number.prototype.round = function(places) {
        return +(Math.round(this + "e+" + places)  + "e-" + places);
    }


    document.querySelectorAll('.user-grade tr').forEach((e) => {
        if (e.querySelector(".item")) {
            let rel = e.querySelector(".column-weight");
            let contrib = e.querySelector(".column-contributiontocoursetotal");
            let grade_percent = e.querySelector(".column-percentage");
            let grade = e.querySelector(".column-grade");
            if (rel && contrib && /^\s*[-–]\s*$/.test(grade.innerText) && /^\s*[-–]\s*$/.test(grade.innerText)) {
                let rel_parsed = parseColElem(rel);
                if (rel_parsed) {
                    let range_upper_bound = parseFloat(/\d+[-–](\d+)/.exec(e.querySelector(".column-range").innerText)[1]);
                    let result_percent = parseColElem(contrib) / rel_parsed;
                    grade.setAttribute("title", derived_tooltip);
                    grade_percent.setAttribute("title", derived_tooltip);
                    grade_percent.innerText = `*${(result_percent * 100).round(2)}%`;
                    grade.innerText = `*${(result_percent * range_upper_bound).round(2)}`;
                }
            }
        }
    });

    function parseColElem(elem) {
        return parseFloat(/\d{1,2}\.\d{1,2}/.exec(elem.innerText)[0])
    }
})();
