// Challenges: graded objectives across five tiers plus mastery combos.
//
// Novice and Competent are meant to be passed by somebody still learning
// the suit -- they are the on-ramp, and they pay for the first few things
// in the shop. Expert upwards is where it gets serious; Legend is close to
// what the model can physically do.
// They are evaluated from the run summary, never from live state, so they can
// never be half-awarded.

import { fmtSpeed, fmtLong, fmtShort, toSpeed, speedLabel } from '../core/math.js';
import { TIER_CREDITS } from '../game/shop.js';

export const TIERS = [
  { key: 'novice', name: 'Novice' },
  { key: 'competent', name: 'Competent' },
  { key: 'expert', name: 'Expert' },
  { key: 'master', name: 'Master' },
  { key: 'legend', name: 'Legend' },
];

const TIER_KEYS = TIERS.map((t) => t.key);

const n0 = (v) => Math.round(v).toLocaleString('en-US');
const m1 = (v) => fmtShort(v);
const s1 = (v) => v.toFixed(1) + ' s';
const km2 = (v) => fmtLong(v);
const kmh = (v) => fmtSpeed(v);
const xm = (v) => 'x' + v.toFixed(1);
const hs = (v) => `${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)} s`;
const yes = (v) => v >= 1 ? 'done' : '—';
const pace = (v) => ['—', 'Easy', 'Medium', 'Hard', 'Extreme', 'Pro'][Math.max(0, Math.min(5, Math.round(v || 0)))];

/**
 * family: name template, metric, per-tier targets, formatter, direction.
 */
const FAMILIES = [
  {
    id: 'speed', name: (t) => `Hit ${Math.round(toSpeed(t))} ${speedLabel().toLowerCase()}`,
    metric: (s) => s.topSpeed, targets: [140 / 3.6, 190 / 3.6, 250 / 3.6, 290 / 3.6, 318 / 3.6],
    fmt: kmh, label: (t) => Math.round(toSpeed(t)) + ' ' + speedLabel().toLowerCase(),
  },
  {
    id: 'dist', name: (t) => `Fly ${fmtLong(t)} in one run`,
    metric: (s) => s.distance, targets: [1100, 2800, 7000, 13000, 20000],
    fmt: km2, label: (t) => fmtLong(t),
  },
  {
    id: 'time', name: (t) => `Stay up for ${t} s`,
    metric: (s) => s.time, targets: [30, 65, 130, 230, 330],
    fmt: s1, label: (t) => t + ' s',
  },
  {
    id: 'score', name: (t) => `Bank ${n0(t)} points`,
    metric: (s) => s.score, targets: [4500, 22000, 110000, 340000, 900000],
    fmt: n0, label: (t) => n0(t),
  },
  {
    id: 'close', name: (t) => `Pass within ${fmtShort(t)} of rock`,
    metric: (s) => s.closest, targets: [14, 8, 4, 1.8, 0.9], lower: true,
    fmt: m1, label: (t) => fmtShort(t),
  },
  {
    id: 'proxtime', name: (t) => `Spend ${t} s in the close-shave zone`,
    metric: (s) => s.proximityTime, targets: [3, 9, 24, 55, 95],
    fmt: s1, label: (t) => t + ' s',
  },
  {
    id: 'mult', name: (t) => `Reach a x${t} multiplier`,
    metric: (s) => s.peakMultiplier, targets: [1.8, 3.2, 5.2, 8, 10.5],
    fmt: xm, label: (t) => 'x' + t,
  },
  {
    id: 'tricks', name: (t) => `Land ${t} tricks in one run`,
    metric: (s) => s.tricks, targets: [3, 9, 22, 44, 70],
    fmt: n0, label: (t) => String(t),
  },
  {
    id: 'revs', name: (t) => `Stack ${t} rotations in one trick`,
    metric: (s) => s.maxRevs, targets: [2, 3, 5, 9, 13],
    fmt: n0, label: (t) => String(t),
  },
  {
    id: 'skim', name: (t) => `Hold a skim for ${t} s`,
    metric: (s) => s.longestSkim, targets: [1, 2.2, 4.5, 8.5, 13],
    fmt: s1, label: (t) => t + ' s',
  },
  {
    id: 'surf', name: (t) => `Ridge-surf for ${t} s`,
    metric: (s) => s.longestSurf, targets: [2, 5.5, 12, 24, 38],
    fmt: s1, label: (t) => t + ' s',
  },
  {
    id: 'gaps', name: (t) => `Thread ${t} gap${t > 1 ? 's' : ''} in one run`,
    metric: (s) => s.gapCount, targets: [1, 3, 8, 17, 27],
    fmt: n0, label: (t) => String(t),
  },
  {
    id: 'arch', name: (t) => `Fly ${t} arch${t > 1 ? 'es' : ''} in one run`,
    metric: (s) => s.archCount, targets: [1, 2, 5, 10, 15],
    fmt: n0, label: (t) => String(t),
  },
  {
    id: 'cave', name: (t) => `Run ${t} cave${t > 1 ? 's' : ''} in one run`,
    metric: (s) => s.caveCount, targets: [1, 2, 3, 7, 11],
    fmt: n0, label: (t) => String(t),
  },
  {
    id: 'rolls', name: (t) => `${t} barrel rolls in one run`,
    metric: (s) => s.counts.roll || 0, targets: [2, 6, 15, 33, 52],
    fmt: n0, label: (t) => String(t),
  },
  {
    id: 'flow', name: (t) => `Fill the flow meter to ${Math.round(t * 100)}%`,
    metric: (s) => s.flow, targets: [0.28, 0.5, 0.72, 0.92, 0.985],
    fmt: (v) => Math.round(v * 100) + '%', label: (t) => Math.round(t * 100) + '%',
  },
];

function buildChallenges() {
  const out = [];
  for (const f of FAMILIES) {
    f.targets.forEach((t, i) => {
      out.push({
        id: `${f.id}.${i}`,
        tier: TIER_KEYS[i],
        name: f.name(t),
        metric: f.metric,
        target: t,
        lower: !!f.lower,
        fmt: f.fmt,
        targetLabel: f.label(t),
      });
    });
  }

  // Handicap challenges use the same native challenge rows and tier payouts
  // as every other objective. Course-count gates stop a single favourable
  // line from awarding an elite across-the-board rating. Only successful race
  // finishes attach these metrics to the run summary, so DNFs cannot pass one.
  const handicapSteps = [
    { tier: 'novice', target: 8, courses: 3, name: 'Hold a +8.00 s handicap or better across 3 courses' },
    { tier: 'competent', target: 4, courses: 5, name: 'Hold a +4.00 s handicap or better across 5 courses' },
    { tier: 'expert', target: 0, courses: 8, name: 'Reach scratch handicap across 8 courses' },
    { tier: 'master', target: -2, courses: 12, name: 'Hold a −2.00 s handicap or better across 12 courses' },
    { tier: 'legend', target: -4, courses: 20, name: 'Hold a −4.00 s handicap across 20 courses' },
  ];
  handicapSteps.forEach((h, i) => {
    out.push({
      id: `handicap.${i}`, tier: h.tier, name: h.name, handicap: true, courses: h.courses,
      metric: (s) => s.raceCompleted ? s.raceHandicap : undefined,
      target: h.target, lower: true, fmt: hs, targetLabel: `${hs(h.target)} · ${h.courses} courses`,
      test: (s) => !!s.raceCompleted
        && Number.isFinite(s.raceHandicap)
        && s.raceHandicapCompleted >= h.courses
        && s.raceHandicap <= h.target,
    });
  });

  // A denser handicap ladder. These are separate IDs rather than changing
  // the five original milestones, so a save that already earned one does
  // not have an achievement silently moved underneath it when the race list
  // grows from twenty to twenty-five courses.
  const handicapExtra = [
    { tier: 'novice', target: 12, courses: 2, name: 'Establish a +12.00 s handicap or better across 2 courses' },
    { tier: 'novice', target: 6, courses: 4, name: 'Hold a +6.00 s handicap or better across 4 courses' },
    { tier: 'competent', target: 3, courses: 7, name: 'Hold a +3.00 s handicap or better across 7 courses' },
    { tier: 'competent', target: 2, courses: 10, name: 'Hold a +2.00 s handicap or better across 10 courses' },
    { tier: 'expert', target: 1, courses: 12, name: 'Hold a +1.00 s handicap or better across 12 courses' },
    { tier: 'expert', target: -1, courses: 10, name: 'Hold a −1.00 s handicap or better across 10 courses' },
    { tier: 'master', target: -2.5, courses: 15, name: 'Hold a −2.50 s handicap or better across 15 courses' },
    { tier: 'master', target: -3, courses: 18, name: 'Hold a −3.00 s handicap or better across 18 courses' },
    { tier: 'legend', target: -4.5, courses: 23, name: 'Hold a −4.50 s handicap or better across 23 courses' },
    { tier: 'legend', target: -5, courses: 25, name: 'Hold a −5.00 s handicap across all 25 courses' },
  ];
  handicapExtra.forEach((h, i) => {
    out.push({
      id: `handicapx.${i}`, tier: h.tier, name: h.name, handicap: true, courses: h.courses,
      metric: (s) => s.raceCompleted ? s.raceHandicap : undefined,
      target: h.target, lower: true, fmt: hs, targetLabel: `${hs(h.target)} · ${h.courses} courses`,
      test: (s) => !!s.raceCompleted
        && Number.isFinite(s.raceHandicap)
        && s.raceHandicapCompleted >= h.courses
        && s.raceHandicap <= h.target,
    });
  });

  // Race challenges deliberately use the normal challenge rows. They are
  // evaluated only on a successful race finish: a DNF never receives the
  // race fields on the summary, so crashing cannot unlock or advance them.
  const raceChallenges = [
    // Novice
    { id: 'race.finish1', tier: 'novice', name: 'Complete your first race', metric: (s) => s.raceCompleted ? s.raceCareerFinishes : undefined, target: 1, fmt: n0, label: '1 finish' },
    { id: 'race.underPar', tier: 'novice', name: 'Finish a race under par', metric: (s) => s.raceCompleted ? s.raceDelta : undefined, target: 0, lower: true, fmt: s1, label: 'under par' },
    { id: 'race.cover3', tier: 'novice', name: 'Complete 3 different race courses', metric: (s) => s.raceCompleted ? s.raceHandicapCompleted : undefined, target: 3, fmt: n0, label: '3 courses' },
    { id: 'race.easyPace', tier: 'novice', name: 'Beat the Easy race pace', metric: (s) => s.raceCompleted ? s.racePaceBeaten : undefined, target: 1, fmt: pace, label: 'Easy' },
    { id: 'race.pb1', tier: 'novice', name: 'Set a race personal best', metric: (s) => s.raceCompleted ? (s.racePB ? 1 : 0) : undefined, target: 1, fmt: yes, label: 'PB' },

    // Competent
    { id: 'race.under2', tier: 'competent', name: 'Finish 2.00 s under par', metric: (s) => s.raceCompleted ? s.raceDelta : undefined, target: -2, lower: true, fmt: s1, label: '−2.00 s' },
    { id: 'race.mediumPace', tier: 'competent', name: 'Beat the Medium race pace', metric: (s) => s.raceCompleted ? s.racePaceBeaten : undefined, target: 2, fmt: pace, label: 'Medium' },
    { id: 'race.win1', tier: 'competent', name: 'Win a race against an opponent', metric: (s) => s.raceCompleted ? s.raceCareerWins : undefined, target: 1, fmt: n0, label: '1 win' },
    { id: 'race.cover5', tier: 'competent', name: 'Complete 5 different race courses', metric: (s) => s.raceCompleted ? s.raceHandicapCompleted : undefined, target: 5, fmt: n0, label: '5 courses' },
    { id: 'race.pbUnder3', tier: 'competent', name: 'Hold under-par PBs on 3 courses', metric: (s) => s.raceCompleted ? s.racePBUnderParCount : undefined, target: 3, fmt: n0, label: '3 PBs' },
    { id: 'race.finish10', tier: 'competent', name: 'Complete 10 races', metric: (s) => s.raceCompleted ? s.raceCareerFinishes : undefined, target: 10, fmt: n0, label: '10 finishes' },

    // Expert
    { id: 'race.under5', tier: 'expert', name: 'Finish 5.00 s under par', metric: (s) => s.raceCompleted ? s.raceDelta : undefined, target: -5, lower: true, fmt: s1, label: '−5.00 s' },
    { id: 'race.hardPace', tier: 'expert', name: 'Beat the Hard race pace', metric: (s) => s.raceCompleted ? s.racePaceBeaten : undefined, target: 3, fmt: pace, label: 'Hard' },
    { id: 'race.fullField', tier: 'expert', name: 'Win a full six-pilot field', metric: (s) => s.raceCompleted ? (s.raceFullField && s.raceWon ? 1 : 0) : undefined, target: 1, fmt: yes, label: '1st / 6' },
    { id: 'race.cover10', tier: 'expert', name: 'Complete 10 different race courses', metric: (s) => s.raceCompleted ? s.raceHandicapCompleted : undefined, target: 10, fmt: n0, label: '10 courses' },
    { id: 'race.pbUnder8', tier: 'expert', name: 'Hold under-par PBs on 8 courses', metric: (s) => s.raceCompleted ? s.racePBUnderParCount : undefined, target: 8, fmt: n0, label: '8 PBs' },
    { id: 'race.finish25', tier: 'expert', name: 'Complete 25 races', metric: (s) => s.raceCompleted ? s.raceCareerFinishes : undefined, target: 25, fmt: n0, label: '25 finishes' },
    { id: 'race.needle', tier: 'expert', name: "Beat par on Needle's Eye", metric: (s) => s.raceCompleted ? (s.raceCourseName === "Needle's Eye" && s.raceDelta < 0 ? 1 : 0) : undefined, target: 1, fmt: yes, label: 'under par' },
    { id: 'race.icefall', tier: 'expert', name: 'Beat par on Icefall Sprint', metric: (s) => s.raceCompleted ? (s.raceCourseName === 'Icefall Sprint' && s.raceDelta < 0 ? 1 : 0) : undefined, target: 1, fmt: yes, label: 'under par' },

    // Master
    { id: 'race.under8', tier: 'master', name: 'Finish 8.00 s under par', metric: (s) => s.raceCompleted ? s.raceDelta : undefined, target: -8, lower: true, fmt: s1, label: '−8.00 s' },
    { id: 'race.extremePace', tier: 'master', name: 'Beat the Extreme race pace', metric: (s) => s.raceCompleted ? s.racePaceBeaten : undefined, target: 4, fmt: pace, label: 'Extreme' },
    { id: 'race.fullFieldPar', tier: 'master', name: 'Win a full field while under par', metric: (s) => s.raceCompleted ? (s.raceFullField && s.raceWon && s.raceDelta < 0 ? 1 : 0) : undefined, target: 1, fmt: yes, label: 'win + under par' },
    { id: 'race.cover15', tier: 'master', name: 'Complete 15 different race courses', metric: (s) => s.raceCompleted ? s.raceHandicapCompleted : undefined, target: 15, fmt: n0, label: '15 courses' },
    { id: 'race.pbUnder12', tier: 'master', name: 'Hold under-par PBs on 12 courses', metric: (s) => s.raceCompleted ? s.racePBUnderParCount : undefined, target: 12, fmt: n0, label: '12 PBs' },
    { id: 'race.win10', tier: 'master', name: 'Win 10 opponent races', metric: (s) => s.raceCompleted ? s.raceCareerWins : undefined, target: 10, fmt: n0, label: '10 wins' },
    { id: 'race.summit90', tier: 'master', name: 'Finish Summit to Base under 90.00 s', metric: (s) => s.raceCompleted ? (s.raceCourseName === 'Summit to Base' && s.raceTime < 90 ? 1 : 0) : undefined, target: 1, fmt: yes, label: '< 90.00 s' },
    { id: 'race.blackRidge', tier: 'master', name: 'Beat par on Black Ridge', metric: (s) => s.raceCompleted ? (s.raceCourseName === 'Black Ridge' && s.raceDelta < 0 ? 1 : 0) : undefined, target: 1, fmt: yes, label: 'under par' },

    // Legend
    { id: 'race.under12', tier: 'legend', name: 'Finish 12.00 s under par', metric: (s) => s.raceCompleted ? s.raceDelta : undefined, target: -12, lower: true, fmt: s1, label: '−12.00 s' },
    { id: 'race.proPace', tier: 'legend', name: 'Beat the Pro race pace', metric: (s) => s.raceCompleted ? s.racePaceBeaten : undefined, target: 5, fmt: pace, label: 'Pro' },
    { id: 'race.cover25', tier: 'legend', name: 'Complete all 25 race courses', metric: (s) => s.raceCompleted ? s.raceHandicapCompleted : undefined, target: 25, fmt: n0, label: '25 / 25' },
    { id: 'race.pbUnder20', tier: 'legend', name: 'Hold under-par PBs on 20 courses', metric: (s) => s.raceCompleted ? s.racePBUnderParCount : undefined, target: 20, fmt: n0, label: '20 PBs' },
    { id: 'race.pbUnder25', tier: 'legend', name: 'Hold under-par PBs on all 25 courses', metric: (s) => s.raceCompleted ? s.racePBUnderParCount : undefined, target: 25, fmt: n0, label: '25 / 25' },
    { id: 'race.fullField5', tier: 'legend', name: 'Win a full field at least 5.00 s under par', metric: (s) => s.raceCompleted ? (s.raceFullField && s.raceWon && s.raceDelta <= -5 ? 1 : 0) : undefined, target: 1, fmt: yes, label: 'win · −5.00 s' },
    { id: 'race.win25', tier: 'legend', name: 'Win 25 opponent races', metric: (s) => s.raceCompleted ? s.raceCareerWins : undefined, target: 25, fmt: n0, label: '25 wins' },
    { id: 'race.citadel', tier: 'legend', name: 'Beat par on Citadel Circuit', metric: (s) => s.raceCompleted ? (s.raceCourseName === 'Citadel Circuit' && s.raceDelta < 0 ? 1 : 0) : undefined, target: 1, fmt: yes, label: 'under par' },
    { id: 'race.blancheDive', tier: 'legend', name: 'Beat par on Blanche Dive', metric: (s) => s.raceCompleted ? (s.raceCourseName === 'Blanche Dive' && s.raceDelta < 0 ? 1 : 0) : undefined, target: 1, fmt: yes, label: 'under par' },
  ];
  for (const c of raceChallenges) {
    out.push({
      id: c.id, tier: c.tier, name: c.name, race: true,
      metric: c.metric, target: c.target, lower: !!c.lower,
      fmt: c.fmt || n0, targetLabel: c.label,
      test: c.test,
    });
  }

  // --- mastery combos -----------------------------------------------------
  const mastery = [
    {
      id: 'm.perfectClose', name: 'Perfect landing after a sub-5 m pass',
      test: (s) => s.landingGrade === 'PERFECT LANDING' && s.closest < 5,
      targetLabel: 'combo', metric: (s) => (s.landingGrade === 'PERFECT LANDING' && s.closest < 5 ? 1 : 0),
    },
    {
      id: 'm.archRoll', name: 'An arch and a double roll in one run',
      test: (s) => s.archCount >= 1 && s.maxRevs >= 2,
      metric: (s) => (s.archCount >= 1 && s.maxRevs >= 2 ? 1 : 0), targetLabel: 'combo',
    },
    {
      id: 'm.caveSpeed', name: 'Run a cave above 220 km/h',
      test: (s) => s.caveCount >= 1 && s.topSpeed > 220 / 3.6,
      metric: (s) => (s.caveCount >= 1 && s.topSpeed > 220 / 3.6 ? 1 : 0), targetLabel: 'combo',
    },
    {
      id: 'm.longClean', name: '5 km with no contact and a clean landing',
      test: (s) => s.distance > 5000 && s.landingGrade && s.landingGrade.includes('LANDING') && s.peakMultiplier > 2,
      metric: (s) => (s.distance > 5000 && s.landingGrade && s.landingGrade.includes('LANDING') ? 1 : 0), targetLabel: 'combo',
    },
    {
      id: 'm.surfTrick', name: 'Ridge-surf 10 s then land a trick',
      test: (s) => s.longestSurf > 10 && s.tricks > 0,
      metric: (s) => (s.longestSurf > 10 && s.tricks > 0 ? 1 : 0), targetLabel: 'combo',
    },
    {
      id: 'm.gapChain', name: 'Three gaps and a x5 multiplier',
      test: (s) => s.gapCount >= 3 && s.peakMultiplier >= 5,
      metric: (s) => (s.gapCount >= 3 && s.peakMultiplier >= 5 ? 1 : 0), targetLabel: 'combo',
    },
    {
      id: 'm.variety', name: 'Five different trick types in one run',
      test: (s) => Object.keys(s.counts).length >= 5,
      metric: (s) => Object.keys(s.counts).length, targetLabel: '5 types',
    },
    {
      id: 'm.everything', name: 'Arch, cave, gap, skim and a landing',
      test: (s) => s.archCount && s.caveCount && s.gapCount && s.longestSkim > 1 && s.landingGrade,
      metric: (s) => ((s.archCount ? 1 : 0) + (s.caveCount ? 1 : 0) + (s.gapCount ? 1 : 0) + (s.longestSkim > 1 ? 1 : 0) + (s.landingGrade ? 1 : 0)),
      targetLabel: '5 of 5',
    },
  ];
  for (const m of mastery) {
    out.push({
      id: m.id, tier: 'legend', name: m.name, metric: m.metric,
      target: 1, test: m.test, fmt: n0, targetLabel: m.targetLabel, mastery: true,
    });
  }
  return out;
}

export const CHALLENGES = buildChallenges();

export function evaluateRun(summary, save) {
  const newly = [];
  for (const c of CHALLENGES) {
    let value;
    try { value = c.metric(summary, save); } catch (e) { continue; }
    if (value === undefined || Number.isNaN(value)) continue;
    if (!(c.lower && value >= 99)) save.setBest(c.id, value, !c.lower);
    const pass = c.test ? c.test(summary, save) : (c.lower ? value <= c.target : value >= c.target);
    if (pass && !save.data.challenges[c.id]) {
      save.data.challenges[c.id] = true;
      // Challenges are where credits come from, and they are worth more the
      // harder they are. A mastery combo pays a Master-tier purse.
      const purse = TIER_CREDITS[c.tier] || TIER_CREDITS.master;
      save.data.credits = (save.data.credits || 0) + purse;
      c.purse = purse;
      newly.push(c);
    }
  }
  if (newly.length) save.flush();
  return newly;
}

export function progressOf(save) {
  const done = CHALLENGES.filter((c) => save.data.challenges[c.id]).length;
  return { done, total: CHALLENGES.length };
}
