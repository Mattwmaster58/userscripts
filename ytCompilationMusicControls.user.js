// ==UserScript==
// @name            Youtube Compilation Music Controls
// @description     Adds support for nexttrack, previoustrack from mediaSession API, as well as shuffle support, for youtube compilation videos with this.currentTrackLists in the description
// @author          Mattwmaster58 <mattwmaster58@gmail.com>
// @namespace       Mattwmaster58 Scripts
// @match           https://www.youtube.com/watch
// @version         0.1
// ==/UserScript==

(function () {

  // https://stackoverflow.com/a/6904551

  class YCMC {
    static TRACK_START_THRESHOLD = 4;
    static PLAYER_SETUP_QUERY_INTERVAL_MS = 200;
    SHUFFLE_ON = false;
    VIDEO_ID = location.href.match(/(?:youtu\.be\/|youtube\.com(?:\/embed\/|\/v\/|\/watch\?v=|\/user\/\S+|\/ytscreeningroom\?v=|\/sandalsResorts#\w\/\w\/.*\/))([^\/&]{10,12})/)[1];
    defaultTrackList;
    currentTrackList;
    videoElement;


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
      this.SHUFFLE_ON = !this.SHUFFLE_ON;
      if (SHUFFLE_ON) {
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
        track.shuffle_index = idx;
      });
    }

    seekTo(track) {
      if (track) {
        log(`seeking to track ${JSON.stringify(track)}`);
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
              src: `https://i.ytimg.com/vi/${this.VIDEO_ID}/mqdefault.jpg`,
              sizes: '320x180',
              type: 'image/jpeg'
            }
          ]
        });
      }
    }

    seekNext = () => this.seekFromCurrent(1);
    seekPrevious = () => this.seekFromCurrent(-1);

    seekFromCurrent(offset) {
      log(`received seek ${offset === -1 ? "previous" : "next"} command at ${this.videoElement.currentTime}`)
      let now_playing = this.getNowPlaying();
      if (now_playing) {
        // if going in reverse and
        if (offset === -1 && this.videoElement.currentTime - now_playing.start < YCMC.TRACK_START_THRESHOLD) {
          offset = 0;
        }
        let track = this.currentTrackList[now_playing.shuffle_index + offset];
        self.seekTo(track);
      } else {
        log('could not resolve currently playing track, cannot seek relative to it');
      }

    }

    setup() {
      this.defaultTrackList = this.parseYTDesc();
      this.currentTrackList = [...this.defaultTrackList];

      log(`parsed ${this.defaultTrackList.length} tracks`);
      if (this.defaultTrackList.length) {
        this.videoElement = document.querySelector('video');
        this.channelName = document.querySelector("#player ~ #meta .ytd-channel-name a").textContent.trim();

        navigator.mediaSession.setActionHandler('nexttrack', this.seekNext);
        navigator.mediaSession.setActionHandler('previoustrack', this.seekPrevious);
        this.videoElement.addEventListener('timeupdate', this.timeUpdateHandler.bind(this));
      }
    }

    timeUpdateHandler() {
      if (!this.currentTrack && !this.nextTrack) {
        this.setNowPlaying();
      }
      this.currentTrack = this.currentTrack || this.getNowPlaying();
      this.nextTrack = this.nextTrack || this.currentTrack && this.defaultTrackList[this.currentTrack.index + 1];
      const curTimeAfterTrackStart = this.currentTrack && this.videoElement.currentTime >= this.currentTrack.start;
      const curTimeBeforeNextTrackStart = this.currentTrack && (this.nextTrack && this.nextTrack.start > this.video.currentTime) || !this.nextTrack;
      if (!this.currentTrack || (curTimeAfterTrackStart && curTimeBeforeNextTrackStart)) {
        return;
      }
      log(`currentTime ${this.videoElement.currentTime} out of range !(${this.currentTrack.start} <= ${this.video.currentTime} < ${this.nextTrack.start}), updating track info`);
      if (this.SHUFFLE_ON) {
        // go to the next track in the shuffled playlist been shuffled
        log(`shuffle is currently on, retrieving next track`);
        let next_shuffled_track = this.currentTrackList[this.currentTrack.shuffle_index + 1];
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
        if (!this.VIDEO_ID) {
          log("parsing youtube video ID failed, presuming non-video page");
          window.clearInterval(setupPoller);
        } else if (document.querySelector("ytd-watch-flexy") && document.querySelector("video")) {
          log("found player, setting up");
          this.setup();
          window.clearInterval(setupPoller);
        }
      }, YCMC.PLAYER_SETUP_QUERY_INTERVAL_MS);
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
  ycmc.waitToSetup();
})();
