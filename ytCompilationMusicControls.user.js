// ==UserScript==
// @name            Youtube Compilation Music Controls
// @description     Adds support for nexttrack, previoustrack from mediaSession API, as well as shuffle support, for youtube compilation videos with this.currentTrackLists in the description
// @author          Mattwmaster58 <mattwmaster58@gmail.com>
// @namespace       Mattwmaster58 Scripts
// @match           https://www.youtube.com/watch
// @run-at          document-start
// @grant           GM_registerMenuCommand
// @version         0.1
// ==/UserScript==

(function () {
  class YCMC {
    // if we're within this threshold of the track start and a seekPrevious is issued,
    // we go back to the previous track instead of the start of the current track
    static TRACK_START_THRESHOLD = 4;
    static PLAYER_SETUP_QUERY_INTERVAL_MS = 200;
    recentlySeeked = false;
    shuffleOn = false;
    // https://stackoverflow.com/a/6904551
    static VIDEO_ID = location.href.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sandalsResorts#\w\/\w\/.*\/))([^\/&]{10,12})/)[1];

    defaultTrackList;
    currentTrackList;
    videoElement;
    ogNextHandler = null;
    ogPreviousHandler = null;

    parseTextForTimings(desc_text) {
      let tracks = [];
      const timings = desc_text.matchAll(
        /^(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?\D[\s\-:]*(.*)\s*/gmi
      );
      [...timings].forEach((match, defaultIndex) => {
        let hh, mm, ss, start;
        [hh, mm, ss] = padArrayStart(match.slice(1, 4).filter(Boolean), 3, 0).map(x => parseInt(x, 10))
        start = (hh || 0) * 60 * 60 + (mm || 0) * 60 + ss;
        tracks.push({
          currentIndex: defaultIndex,
          defaultIndex,
          start,
          title: match[4]
        });
      })
      return tracks;
    }

    parseYTDesc() {
      const desc_text = document.querySelector("#description yt-formatted-string").textContent;
      return this.parseTextForTimings(desc_text);
    }

    getNowPlaying() {
      const cur_time = this.videoElement.currentTime;
      for (const track of this.defaultTrackList) {
        if (track.start > cur_time) {
          return this.defaultTrackList[clamp(track.defaultIndex - 1, 0, this.defaultTrackList.length - 1)];
        }
      }
    }

    toggleShuffle() {
      this.shuffleOn = !this.shuffleOn;
      if (this.shuffleOn) {
        log(`shuffling ${this.currentTrackList.length} tracks`);
        // https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array
        let track_len = this.currentTrackList.length;
        while (track_len) {
          let idx = Math.floor(Math.random() * track_len--);
          let temp = this.currentTrackList[track_len];
          this.currentTrackList[track_len] = this.currentTrackList[idx];
          this.currentTrackList[idx] = temp;
        }
      } else {
        log(`unshuffling currently shuffled list`);
        this.currentTrackList = [...this.defaultTrackList]
      }
      [...this.currentTrackList].forEach((track, idx) => {
        track.currentIndex = idx;
      });
    }

    seekTo(track) {
      if (track) {
        log(`seeking to track ${JSON.stringify(track)}`);
        this.recentlySeeked = true;
        this.currentTrack = track;
        this.nextTrack = null;
        this.videoElement.currentTime = track.start;
        this.setNowPlaying(track);
      } else {
        log(`failed to seek. track is undefined`);
      }
    }

    setNowPlaying(track) {
      let nowPlaying = track || this.getNowPlaying();
      log(`setting up now playing: ${JSON.stringify(nowPlaying)}`);
      if (nowPlaying?.title) {
        navigator.mediaSession.metadata = new MediaMetadata({
          title: nowPlaying.title,
          artist: this.channelName,
          artwork: [
            {
              src: `https://i.ytimg.com/vi/${YCMC.VIDEO_ID}/mqdefault.jpg`,
              sizes: '320x180',
              type: 'image/jpeg'
            }
          ]
        });
      }
    }

    seekNext = (event) => this.seekFromCurrent(1, event);
    seekPrevious = (event) => this.seekFromCurrent(-1, event);

    seekFromCurrent(offset, event) {
      const NEXT = 1,
        PREVIOUS = -1;
      log(`received seek ${offset === PREVIOUS ? "previous" : "next"} command at ${this.videoElement.currentTime}`)
      let now_playing = this.getNowPlaying();
      if (now_playing) {
        // if going in reverse and
        if (offset === PREVIOUS && this.videoElement.currentTime - now_playing.start < YCMC.TRACK_START_THRESHOLD) {
          offset = 0;
        }
        let track = this.currentTrackList[now_playing.currentIndex + offset];
        if (!track) {
          if (offset === PREVIOUS && this.ogPreviousHandler) {
            this.ogPreviousHandler(event);
          } else if (offset === NEXT && this.ogNextHandler) {
            this.ogNextHandler(event);
          }
        }
        this.seekTo(track);
      } else {
        log('could not resolve currently playing track, cannot seek relative to it');
      }
    }

    setup() {
      this.defaultTrackList = this.parseYTDesc();
      this.currentTrackList = [...this.defaultTrackList];

      log(`parsed ${this.defaultTrackList.length} tracks`);
      if (this.defaultTrackList.length) {
        GM_registerMenuCommand("shuffle", this.toggleShuffle, "s");
        this.videoElement = document.querySelector('video');
        this.channelName = document.querySelector("#player ~ #meta .ytd-channel-name a").textContent.trim();

        navigator.mediaSession.setActionHandler('nexttrack', this.seekNext, true);
        navigator.mediaSession.setActionHandler('previoustrack', this.seekPrevious, true);
        this.videoElement.addEventListener('timeupdate', this.timeUpdateHandler.bind(this));
      }
    }

    timeUpdateHandler() {
      if (!this.currentTrack && !this.nextTrack) {
        this.setNowPlaying();
      }
      this.currentTrack = this.currentTrack || this.getNowPlaying();
      this.nextTrack = this.nextTrack || this.currentTrack && this.defaultTrackList[this.currentTrack.defaultIndex + 1];
      const curTimeAfterTrackStart = this.currentTrack && this.videoElement.currentTime >= this.currentTrack.start;
      const curTimeBeforeNextTrackStart = this.currentTrack && (this.nextTrack && this.nextTrack.start > this.videoElement.currentTime) || !this.nextTrack;
      if (!this.currentTrack || (curTimeAfterTrackStart && curTimeBeforeNextTrackStart)) {
        return;
      }
      if (this.recentlySeeked) {
        log("recently seeked, ignoring player head boundary crossing");
        this.recentlySeeked = false;
        return;
      }
      log(`currentTime ${this.videoElement.currentTime} out of range !(${this.currentTrack.start} <= ${this.videoElement.currentTime} < ${this.nextTrack.start}), updating track info`);
      if (this.shuffleOn) {
        // go to the next track in the shuffled playlist been shuffled
        log(`shuffle is currently on, retrieving next track`);
        let next_shuffled_track = this.currentTrackList[this.currentTrack.currentIndex + 1];
        this.seekTo(next_shuffled_track);
      } else {
        // otherwise, just let the player progress automatically
        this.currentTrack = this.getNowPlaying();
        this.setNowPlaying(this.currentTrack);
      }
      this.nextTrack = null;
    }


    waitToSetup() {
      log("waiting for YT Player to load");
      let setupPoller = window.setInterval(() => {
        if (!YCMC.VIDEO_ID) {
          log("parsing youtube video ID failed, presuming non-video page");
          window.clearInterval(setupPoller);
        } else if (document.querySelector("ytd-watch-flexy") && document.querySelector("video")) {
          log("found player, setting up");
          this.setup();
          window.clearInterval(setupPoller);
        }
      }, YCMC.PLAYER_SETUP_QUERY_INTERVAL_MS);
    }

    hookMediaSessionSetActionHandler() {
      log(`hooking mediaSession.setActionHandler`);
      const oSetActionHandler = window.navigator.mediaSession.setActionHandler.bind(window.navigator.mediaSession);
      navigator.mediaSession.setActionHandler = window.navigator.setActionHandler = (action, handler, friendly) => {
        if (friendly) {
          log(`received friendly setActionHandler call ${action} ${handler}`);
          return oSetActionHandler(action, handler);
        }
        if (action === "nexttrack") {
          // noinspection EqualityComparisonWithCoercionJS
          if (this.ogNextHandler != handler) {
            log(`set ogNextHandler from ${this.ogNextHandler} to ${handler}`);
          }
          this.ogNextHandler = handler;
        } else if (action === "previoustrack") {
          // noinspection EqualityComparisonWithCoercionJS
          if (this.ogPreviousHandler != handler) {
            log(`set ogPreviousHandler from ${this.ogPreviousHandler} to ${handler}`);
          }
          this.ogPreviousHandler = handler;
        } else {
          return oSetActionHandler(action, handler);
        }
      }
    }
  }


  function clamp(number, min, max) {
    return Math.min(max, Math.max(number, min));
  }


  function log(...args) {
    return console.log(...["[YCMC]", ...args]);
  }

  // https://stackoverflow.com/a/63856062
  function padArrayStart(arr, len, padding) {
    return Array(len - arr.length).fill(padding).concat(arr);
  }

  let ycmc = new YCMC();
  ycmc.hookMediaSessionSetActionHandler()
  window.addEventListener("load", function(){
    ycmc.waitToSetup();
  });
})();
