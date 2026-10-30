// Persistence: settings, respawn points, records, challenge progress and
// ghosts, in localStorage, with copy-paste export/import.

const KEY = 'skyline.save.v1';

const SAVE_VERSION = 5;

const DEFAULTS = () => ({
  version: SAVE_VERSION,
  seed: 'skyline',
  settings: {
    // Medium by default. High is a 1.0 render scale with a fourteen-step
    // shadow march, which is more than a mid-range laptop holds 60 fps at,
    // and the brief asks for 60 out of the box. Settings has the rest.
    quality: 'medium',
    renderScale: 1,
    sharpness: 'balanced',
    sharpenUpscale: true,
    masterVolume: 0.85,
    musicVolume: 0.5,
    sfxVolume: 0.9,
    fov: 0,
    mouseSensitivity: 1,
    invertY: false,
    showHud: true,
    showFps: false,
    showChallenges: true,
    showAirflow: true,
    motionBlurAtSpeed: true,
    units: 'imperial',
    timeOfDay: 16.9,
    autoTime: true,
    weather: 'clear',
  },
  binds: null,
  spawns: [],
  activeSpawn: 0,
  records: {},
  lifetime: {
    score: 0, distance: 0, time: 0, tricks: 0, best: 0, runs: 0,
    topSpeed: 0, closest: 999, gaps: 0, arches: 0, caves: 0, perfectLandings: 0,
    // per-trick tallies, plus the things worth bragging about
    rolls: 0, flips: 0, helis: 0, corks: 0, skims: 0, mists: 0,
    maxRevs: 0, bestGlide: 0, longestSkim: 0, maxAltitude: 0, descended: 0,
    crashes: 0, landings: 0, races: 0, raceWins: 0, credits: 0,
  },
  challenges: {},
  credits: 0,
  owned: [],
  equipped: null,
  raceBest: {},
  // Best-ever time and handicap time are intentionally separate. The PB is
  // permanent until beaten; handicap uses the most recent SUCCESSFUL finish
  // on each course, so form can improve or worsen without a DNF counting.
  raceHandicapTimes: {},
  ghosts: {},
  seenHints: {},
  // Live game state. Long-term progression already lived in this save, but
  // before v3 your exact position/run only existed in memory and vanished on
  // a refresh or browser close. Game supplies this snapshot through
  // setSnapshotProvider(); keeping it inside the same object also means the
  // existing export/import buttons carry the current session with them.
  session: null,
});

export class Save {
  constructor() {
    this.data = DEFAULTS();
    this._dirty = false;
    this._timer = 0;
    this._snapshotProvider = null;
    this.load();

    // Write on the way out as well as on a timer. The timer only runs
    // while frames are being drawn, so closing the tab, switching away, or
    // reloading inside the save interval threw away everything since the
    // last write -- which is how a race time you had just set disappeared.
    const out = () => this.flush();
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', out);
      window.addEventListener('pagehide', out);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') out();
      });
    }
  }

  load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      this.data = this.merge(DEFAULTS(), parsed);
      this.migrate();
    } catch (e) {
      console.warn('save: could not read, using defaults', e);
    }
  }

  /** Carries old saves forward rather than making people wipe them. */
  migrate() {
    const d = this.data;
    const from = d.version || 1;
    if (from < 2) {
      // v2 switched the default readout to mph and feet
      d.settings.units = 'imperial';
      // H used to toggle the HUD; it now spreads the wings
      if (d.binds) {
        d.binds.deploy = ['KeyH'];
        d.binds.spawnPoint = ['KeyJ'];
        d.binds.hud = ['KeyU'];
      }
    }
    if (from < 3 && d.session === undefined) d.session = null;
    if (from < 4) {
      // Old saves only knew PBs. Seed the new latest-finish handicap table
      // from those PBs so an existing racing career keeps a sensible rating;
      // each course is replaced by the next successful finish on that line.
      d.raceHandicapTimes = { ...(d.raceBest || {}) };
    }
    if (from < 5) {
      // Total historical race attempts were not tracked before the expanded
      // racing challenge set. We cannot reconstruct every old finish, but we
      // can safely credit at least one successful finish for every course
      // already represented in the player's handicap table.
      const knownFinishes = Object.values(d.raceHandicapTimes || {}).filter(Number.isFinite).length;
      d.lifetime.races = Math.max(d.lifetime.races || 0, knownFinishes);
      d.lifetime.raceWins = d.lifetime.raceWins || 0;
    }
    if (from !== SAVE_VERSION) {
      d.version = SAVE_VERSION;
      this.touch();
    }
  }

  merge(base, over) {
    if (over === null || over === undefined) return base;
    // Some optional sections (notably the v3 live session) default to null
    // and later become objects. `typeof null === 'object'`, so without this
    // guard the recursive merge tried `k in null` and the whole save failed
    // to load as soon as a session had actually been written.
    if (base === null || base === undefined) return over;
    if (typeof base !== 'object' || Array.isArray(base)) return over;
    const out = { ...base };
    for (const k in over) {
      out[k] = k in base ? this.merge(base[k], over[k]) : over[k];
    }
    return out;
  }

  /** Game can register a cheap serialisable snapshot of the live session. */
  setSnapshotProvider(fn) {
    this._snapshotProvider = typeof fn === 'function' ? fn : null;
  }

  flush(captureSession = true) {
    try {
      if (captureSession && this._snapshotProvider) {
        this.data.session = this._snapshotProvider();
      }
      localStorage.setItem(KEY, JSON.stringify(this.data));
      this._dirty = false;
      this._timer = 0;
    } catch (e) {
      console.warn('save: write failed', e);
    }
  }

  touch() {
    this._dirty = true;
  }

  /** Call each frame; writes at most every 3 s. */
  tick(dt) {
    if (!this._dirty) return;
    this._timer += dt;
    if (this._timer > 1.5) {
      this._timer = 0;
      this.flush();
    }
  }

  get settings() {
    return this.data.settings;
  }

  // ---- respawn points -----------------------------------------------------

  addSpawn(spawn) {
    this.data.spawns.push(spawn);
    this.data.activeSpawn = this.data.spawns.length - 1;
    this.touch();
    return spawn;
  }

  removeSpawn(i) {
    this.data.spawns.splice(i, 1);
    this.data.activeSpawn = Math.max(0, Math.min(this.data.activeSpawn, this.data.spawns.length - 1));
    this.touch();
  }

  cycleSpawn(dir = 1) {
    const n = this.data.spawns.length;
    if (!n) return null;
    this.data.activeSpawn = (this.data.activeSpawn + dir + n) % n;
    this.touch();
    return this.data.spawns[this.data.activeSpawn];
  }

  get activeSpawn() {
    return this.data.spawns[this.data.activeSpawn] || null;
  }

  // ---- records ------------------------------------------------------------

  recordRun(summary) {
    const L = this.data.lifetime;
    L.runs++;
    L.score += summary.score;
    L.distance += summary.distance;
    L.time += summary.time;
    L.tricks += summary.tricks;
    if (summary.score > L.best) L.best = summary.score;
    if (summary.topSpeed > L.topSpeed) L.topSpeed = summary.topSpeed;
    if (summary.closest < L.closest) L.closest = summary.closest;
    L.gaps += summary.gapCount || 0;
    L.arches += summary.archCount || 0;
    L.caves += summary.caveCount || 0;
    if (summary.landingGrade === 'PERFECT LANDING') L.perfectLandings++;

    const c = summary.counts || {};
    L.rolls += c.roll || 0;
    L.flips += (c.frontflip || 0) + (c.backflip || 0);
    L.helis += c.heli || 0;
    L.corks += c.cork || 0;
    L.skims += c.waterSkim || 0;
    L.mists += c.mist || 0;
    if ((summary.maxRevs || 0) > L.maxRevs) L.maxRevs = summary.maxRevs;
    if ((summary.longestSkim || 0) > L.longestSkim) L.longestSkim = summary.longestSkim;
    if ((summary.bestGlide || 0) > L.bestGlide && summary.bestGlide < 20) {
      L.bestGlide = summary.bestGlide;
    }
    if ((summary.maxAltitude || 0) > L.maxAltitude) L.maxAltitude = summary.maxAltitude;
    L.descended += summary.descended || 0;
    if (summary.landingGrade && summary.landingGrade !== 'NO LANDING') L.landings++;
    else L.crashes++;

    this.touch();
    this.flush();
  }

  best(key) {
    return this.data.records[key];
  }

  setBest(key, value, higherIsBetter = true) {
    const cur = this.data.records[key];
    if (cur === undefined || (higherIsBetter ? value > cur : value < cur)) {
      this.data.records[key] = value;
      this.touch();
      return true;
    }
    return false;
  }

  // ---- export / import ----------------------------------------------------

  exportString() {
    return btoa(unescape(encodeURIComponent(JSON.stringify(this.data))));
  }

  importString(str) {
    const parsed = JSON.parse(decodeURIComponent(escape(atob(str.trim()))));
    this.data = this.merge(DEFAULTS(), parsed);
    this.migrate();
    this.flush(false);
    return true;
  }

  wipe() {
    this.data = DEFAULTS();
    this.flush(false);
  }
}
