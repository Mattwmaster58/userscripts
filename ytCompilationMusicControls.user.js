// ==UserScript==
// @name            Youtube Compilation Music Controls
// @description     Adds support for nexttrack, previoustrack from mediaSession API, as well as shuffle support, for youtube compilation videos with tracklists in the description
// @author          Mattwmaster58 <mattwmaster58@gmail.com>
// @namespace       Mattwmaster58 Scripts
// @match           https://www.youtube.com/watch
// @version         0.1
// ==/UserScript==

(function () {

    // https://stackoverflow.com/a/6904551
    const VIDEO_ID = location.href.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sandalsResorts#\w\/\w\/.*\/))([^\/&]{10,12})/)[1]
    const TRACK_START_THRESHOLD = 4;
    const PLAYER_SETUP_QUERY_INTERVAL_MS = 200;

    let SHUFFLE_ON = false;
    let parsed_tracks = [],
        tracklist,
        channel_name,
        video;
    let cur_track = null;
    let next_track = null;


    function log(...args) {
        return console.log(...["[YCMC]", ...args]);
    }

    // https://stackoverflow.com/a/63856062
    function padArrayStart(arr, len, padding) {
        return Array(len - arr.length).fill(padding).concat(arr);
    }

    // https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
    function shuffle(arr) {
        let track_len = tracklist.length;
        while (track_len) {
            let idx = Math.floor(Math.random() * track_len--);
            let temp = arr[track_len];
            arr[track_len] = arr[idx];
            arr[idx] = temp;
        }
    }

    function clamp(number, min, max) {
        return Math.min(max, Math.max(number, min));
    }

    function getNowPlaying() {
        const cur_time = video.currentTime;
        for (const parsed_track of parsed_tracks) {
            if (parsed_track.start > cur_time) {
                return parsed_tracks[clamp(parsed_track.index - 1, 0, parsed_tracks.length - 1)];
            }
        }
    }

    function seekTo(track) {
        if (track) {
            log(`seeking to track ${JSON.stringify(track)}`);
            cur_track = track;
            next_track = null;
            video.currentTime = track.start;
            setNowPlaying(track);
        } else {
            log(`failed to seek. track is none`);
        }
    }

    function toggleShuffle() {
        SHUFFLE_ON = !SHUFFLE_ON;
        if (SHUFFLE_ON) {
            log(`shuffling ${tracklist.length} tracks`);
            shuffle(tracklist);
        } else {
            log(`unshuffling...`);
            tracklist = [...parsed_tracks];
        }
        [...tracklist].forEach((track, idx) => {
            track.shuffle_index = idx;
        });
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
                shuffle_index: index,
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
        log(`received seek ${reverse ? "previous" : "next"} command at ${video.currentTime}`)
        let now_playing = getNowPlaying();
        if (now_playing) {
            let idx_offset = Math.pow(-1, reverse);
            if (reverse && video.currentTime - now_playing.start < TRACK_START_THRESHOLD) {
                idx_offset = 0;
            }
            let track = tracklist[now_playing.shuffle_index + idx_offset];
            seekTo(track);
        } else {

        }

    }

    function setNowPlaying(track) {
        let now_playing = track || getNowPlaying();
        log(`setting up now playing: ${JSON.stringify(now_playing)}`);
        if (now_playing?.title) {
            navigator.mediaSession.metadata = new MediaMetadata({
                title: now_playing.title,
                artist: channel_name,
                artwork: [
                    {
                        src: `https://i.ytimg.com/vi/${VIDEO_ID}/mqdefault.jpg`,
                        sizes: '320x180',
                        type: 'image/jpeg'
                    }
                ]
            });
        }
    }


    window.toggle_shuffle = toggleShuffle;



    log("waiting for YT Player to load");
    const setup_poller = setInterval(() => {
        if (!VIDEO_ID) {
            log("parsing youtube video ID failed, presuming non-video page");
            window.clearInterval(setup_poller)
        } else if (document.querySelector("ytd-watch-flexy")) {
            log("player element found, setting up");
            parsed_tracks = parseYTDesc();
            tracklist = [...parsed_tracks];

            video = document.querySelector('video');
            channel_name = document.querySelectorAll("#player ~ #meta .ytd-channel-name a")[0].textContent.trim();

            let seekNext = () => seekAdjacent(false);
            let seekPrev = () => seekAdjacent(true);
            navigator.mediaSession.setActionHandler('nexttrack', seekNext);
            navigator.mediaSession.setActionHandler('previoustrack', seekPrev);
            window.nt = seekNext;
            window.pt = seekPrev;

            video.addEventListener('timeupdate', (_) => {
                if (!cur_track && !next_track) {
                    setNowPlaying();
                }
                cur_track = cur_track || getNowPlaying();
                next_track = next_track || cur_track && parsed_tracks[cur_track.index + 1];
                if (!cur_track) {
                    return;
                } else if (cur_track && cur_track.start <= video.currentTime && ((next_track && next_track.start > video.currentTime) || !next_track)) {
                    return;
                }
                log(`currentTime ${video.currentTime} out of range !(${cur_track.start} <= ${video.currentTime} < ${next_track.start}), updating track info`);
                if (SHUFFLE_ON) {
                    // go to the next track that's been shuffled
                    log(`shuffle is currently on, retrieving next track`)
                    let next_shuffled_track = tracklist[cur_track.shuffle_index + 1];
                    seekTo(next_shuffled_track);
                } else {
                    // otherwise, just let the player progress automatically
                    cur_track = getNowPlaying();
                    setNowPlaying(cur_track);
                }
                next_track = null;
            });

            window.clearInterval(setup_poller);
        }

    }, PLAYER_SETUP_QUERY_INTERVAL_MS);
})();
