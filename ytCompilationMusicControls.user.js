// ==UserScript==
// @name            SCRIPT
// @description     SCRIPT DESCRIPTION
// @author          Mattwmaster58 <mattwmaster58@gmail.com>
// @namespace       Mattwmaster58 Scripts
// @match           http://*.example.com/*
// @version         0.1
// ==/UserScript==

(function () {

    const TRACK_START_THRESHOLD = 4;
    const parsed_tracks = parseYTDesc();
    const video = document.querySelector('video');
    const channel_name = document.querySelectorAll("#player ~ #meta .ytd-channel-name a")[0].textContent.trim()
    // https://stackoverflow.com/a/6904551
    const yt_id = location.href.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sandalsResorts#\w\/\w\/.*\/))([^\/&]{10,12})/)[1]

    // https://stackoverflow.com/a/63856062
    function padArrayStart(arr, len, padding) {
        return Array(len - arr.length).fill(padding).concat(arr);
    }

    function clamp(number, min, max) {
        return Math.min(max, Math.max(number, min));
    }

    function getNowPlaying() {
        const cur_time = video.currentTime;
        if (cur_time >= video.duration) {
            return;
        }

        for (const parsed_track of parsed_tracks) {
            if (parsed_track.start > cur_time) {
                return parsed_tracks[clamp(parsed_track.index - 1, 0, parsed_tracks.length - 1)];
            }
        }
    }


    function parseTextForTimings(desc_text) {
        let tracks = [];
        const timings = desc_text.matchAll(
            /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\D[\s\-:]*(.*)\s*/gmi
        );
        [...timings].forEach((match, index) => {
            let hh, mm, ss, start;
            [hh, mm, ss] = padArrayStart(match.slice(1, 4).filter(Boolean), 3, 0).map(x => parseInt(x, 10))
            start = (hh || 0) * 60 * 60 + (mm || 0) * 60 + ss;
            tracks.push({
                index,
                start,
                title: match[4]
            });
        })
        return tracks;
    }

    function parseYTDesc() {
        const desc_text = document.querySelector("#description yt-formatted-string").textContent;
        return parseTextForTimings(desc_text);
    }


    function seekAdjacent(reverse) {
        console.log(`received seek ${reverse ? "previous" : "next"} command at ${video.currentTime}`)
        let now_playing = getNowPlaying();
        if (now_playing) {
            let idx_offset = Math.pow(-1, reverse);
            if (video.currentTime - now_playing.start < TRACK_START_THRESHOLD) {
                idx_offset = 0;
            }
            let track = parsed_tracks[now_playing.index + idx_offset];
            if (track) {
                console.log(`seeking to ${JSON.stringify(track)}`);
                setNowPlaying(track)
                video.currentTime = track.start;
            }
        } else {

        }

    }

    function setNowPlaying(track) {
        let now_playing = track || getNowPlaying();
        if (now_playing) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: now_playing.title,
                artist: channel_name,
                artwork: [
                    {
                        src: `https://i.ytimg.com/vi/${yt_id}/mqdefault.jpg`,
                        sizes: '320x180',
                        type: 'image/jpeg'
                    }
                ]
            });
        }
    }

    window.navigator.mediaSession.setActionHandler('nexttrack', () => seekAdjacent(false));
    window.navigator.mediaSession.setActionHandler('previoustrack', () => seekAdjacent(true));

    let cur_track = null;
    let next_track = null;
    video.addEventListener('timeupdate', (_) => {
        cur_track = cur_track || getNowPlaying();
        next_track = next_track || parsed_tracks[cur_track.index + 1];
        if (cur_track && cur_track.start <= video.currentTime && ((next_track && next_track.start > video.currentTime) || !next_track)) {
            console.log(`currentTime ${video.currentTime} out of range, updating track info`);
            cur_track = getNowPlaying();
            next_track = null;
            setNowPlaying(cur_track);
        }
    });
})();
