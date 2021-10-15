// ==UserScript==
// @name          	eClass Grade Calculator
// @description     Calculates your grade based on "Relative Weight" and "Contribution to course total" columns. Sometimes these columns are populated without your grade being revealed.
// @author			Mattwmaster58 <mattwmaster58@gmail.com>
// @namespace       Mattwmaster58 Scripts
// @match			https://eclass.srv.ualberta.ca/course/user.php?*mode=grade*
// @version         0.1
// ==/UserScript==

(function() {
    Number.prototype.round = function(places) {
        return +(Math.round(this + "e+" + places)  + "e-" + places);
    }
    const derived_tooltip = "This number was derived from Relative Weight\" and \"Contribution to course total\" columns";
    document.querySelectorAll('.user-grade tr').forEach((e, index) => {
        if (e.querySelector(".item")) {
            let rel = e.querySelector(".column-weight");
            let contrib = e.querySelector(".column-contributiontocoursetotal");
            let grade_percent = e.querySelector(".column-percentage");
            let grade = e.querySelector(".column-grade");
            if (rel && contrib && /^\s*[-–]\s*$/.test(grade.innerText) && /^\s*[-–]\s*$/.test(grade.innerText)) {
                console.log(index, rel);
                let rel_parsed = parseColElem(rel);
                if (rel_parsed) {
                    let range = e.querySelector(".column-range");
                    let range_upper_bound = parseFloat(/\d+[-–](\d+)/.exec(range.innerText)[1]);
                    let contrib_parsed = parseColElem(contrib);
                    let result_percent = ((contrib_parsed / rel_parsed));
                    grade.setAttribute("title", derived_tooltip);
                    grade_percent.setAttribute("title", derived_tooltip);
                    grade_percent.innerText = `*${(result_percent * 100).round(2)}%`;
                    grade.innerText = `*${(result_percent * range_upper_bound).round(2)}`;
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
})();
