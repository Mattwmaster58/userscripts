# userscripts/styles

[userscripts](https://greasyfork.org/en/help/installing-user-scripts)
and [userstyles](https://github.com/openstyles/stylus/wiki/Usercss)  I find useful

## userscripts

### eClassGradeCalculator.user.js [![Install](https://img.shields.io/badge/userscript-install-blue)](https://github.com/Mattwmaster58/userscripts/raw/master/eClassGradeCalculator.user.js)

Calculates your grade based on "Relative Weight" and "Contribution to course total" columns. Sometimes these columns are
populated without your grade being revealed, but doing easy math gets us the answer. Probably could be easily extended
to work with Moodle in general, but I don't care.

### githubQuickDelete.user.js [![Install](https://img.shields.io/badge/userscript-install-blue)](https://github.com/Mattwmaster58/userscripts/raw/master/githubQuickDelete.user.js)

Helps you delete GitHub repos faster. The script changes the action of the delete button to instantly delete a given
repo.

#### WARNING

Don't actually use this.

GitHub UI designers designed the delete dialog the way they did for a reason. If you use this, you're bypassing that and
making it easier to accidentally delete a repo (It's not always easy to get it back!). Please be aware of that.

#### Demo

![Demo](./demo/githubQuickDelete_demo.gif)

### ytCompilationMusicControls.user.js [![Install](https://img.shields.io/badge/userscript-install-blue)](https://github.com/Mattwmaster58/userscripts/raw/master/ytCompilationMusicControls.user.js)

Parses a tracklist from a compilation video description to enable usage of media keys to seek tracks within the video (
ie, the next/prev buttons on your keyboard). The now playing information is also set via the mediaSession API.

#### Demo

![Demo](./demo/ytCompilationMusicControl_demo.mp4)
[Video](https://www.youtube.com/watch?v=-N-jQzBXkUU) from the demo. The chapter list does not need to be open to use this userscript, it was opened to show the video being seeked around to different chapters. Only the media keys are being pressed. The volume/media flyout is provided by [ModernFlyouts](https://modernflyouts-community.github.io/) that integrates with Windows, not this extension.

## userstyles

### redditCollapseSidebar.user.css

Collapses the sidebar when your screen gets to narrow (configurable)
