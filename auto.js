function hasAuto(x) {
  // dev-one-percent isn't really auto, except insofar as it means
  // you don't have to manually do some stuff (lonely, upgradeless).
  let table = {
    'enlightened': 0,
    'prestige': 1,
    'update': 2,
    'assign-update-points': 3,
    'dev-one-percent': 4
  }
  return player.completionMilestones > table[x];
}

function autoAssignDevs() {
  for (let i = 0; i <= 4; i++) {
    player.devs[i] = 0;
  }
  for (let i = 0; i <= 4; i++) {
    let askedFor = Math.floor(getTotalDevs() * player.auto.dev.settings[i]);
    let maxAllowed = getUnassignedDevs();
    setDevs(i, Math.min(askedFor, maxAllowed));
  }
}

function autoAssignUpdatePoints() {
  // This is built to approximate what would happen given that
  // unspent update points are assigned every tick. Given this,
  // if update points are assigned to anything, they'll eventually
  // all be assigned.
  let unspentUpdatePoints = player.updatePoints;
  if (player.auto.assignUpdatePoints.settings.every(x => x === 0)) {
    return;
  }
  // This is so we don't mar the runs of crazy people who are trying to
  // do without one of the three types of experience entirely.
  let lastNonZero = player.auto.assignUpdatePoints.settings.map(x => x !== 0).lastIndexOf(true);
  let total = Math.min(1, player.auto.assignUpdatePoints.settings.reduce((a, b) => a + b));
  for (let i = 0; i <= 2; i++) {
    let askedFor = Decimal.floor(unspentUpdatePoints.times(player.auto.assignUpdatePoints.settings[i]).div(total));
    let maxAllowed = player.updatePoints;
    let x = Decimal.min(askedFor, maxAllowed);
    if (i === lastNonZero) {
      x = maxAllowed;
    }
    player.experience[i] = player.experience[i].plus(x);
    player.updatePoints = player.updatePoints.minus(x);
  }
}

let AUTO_SETTINGS = {
  'enlightened': [
    '启迪次数',
    '距离上次启迪的时间',
    '恢复耐心所需的时间(推荐)',
    '重置花费的秒数'
  ],
  'prestige': [
    '新增更新时间',
    '超过目前效果的倍率',
    '超过两者中更佳的效果的倍率',
    '间隔时间'
  ],
  'update': [
    '更新时间',
    '更新点',
    '更新点*x',
    '间隔时间'
  ]
}

function shouldEnlightened(x) {
  let realSecondsAlready = (Date.now() - player.stats.last.enlightened) / 1000;
  let gameSecondsRemaining = Math.max(0, realTimeToGameTime(x - realSecondsAlready));
  let valueIfNot = getPatienceMeterNewValue(player.progress[7], gameSecondsRemaining, player.progress[4], player.enlightened);
  let valueIfSo = getPatienceMeterNewValue(getPatienceMeterAfterEnlightened(), gameSecondsRemaining, player.progress[4], player.enlightened + 1);
  let effectIfNot = getPatienceMeterEffect(valueIfNot, getTotalEnlightened());
  let effectIfSo = getPatienceMeterEffect(valueIfSo, getTotalEnlightened() + 1);
  return effectIfSo >= effectIfNot;
}

function checkForAutoEnlightened() {
  let table = {
    '启迪次数': x => getTotalEnlightened() < x,
    '距离上次启迪的时间': x => Date.now() - player.stats.last.enlightened >= x * 1000,
    '恢复耐心所需的时间(推荐)': x => x >= getEffect(4),
    '重置花费的秒数': x => shouldEnlightened(x)
  }
  while (player.progress[7] >= 1 && table[player.auto.enlightened.setting](player.auto.enlightened.value.toNumber())) {
    enlightened();
  }
}

function getCurrentAutoPrestigeType() {
  if (player.stats.last.prestigeType === null) {
    return player.auto.prestige.initial;
  } else {
    return 5 + (player.stats.last.prestigeType + player.auto.prestige.alternate - 5) % 2;
  }
}

function getBetterPrestigeValue() {
  return Math.max(player.progress[5], player.progress[6]);
}

function checkForAutoPrestige() {
  let type = getCurrentAutoPrestigeType();
  let table = {
    '新增更新时间': x => player.progress[0] >= x,
    '超过目前效果的倍率': x => newValueFromPrestige() - player.progress[type] >= x,
    '超过两者中更佳的效果的倍率': x => newValueFromPrestige() - getBetterPrestigeValue() >= x,
    '间隔时间': x => Date.now() - player.stats.last.prestige >= x * 1000
  }
  if (table[player.auto.prestige.setting](player.auto.prestige.value.toNumber())) {
    prestige(type, true);
  }
}

function checkForAutoUpdate() {
  let table = {
    '间隔时间': x => player.progress[0] >= x.toNumber(),
    '更新点': x => getUpdateGain().gte(x),
    '更新点*x': x => getUpdateGain().gte(player.stats.last.updatePointGain.times(x)),
    '间隔时间': x => Date.now() - player.stats.last.update >= x.toNumber() * 1000
  }
  if (table[player.auto.update.setting](player.auto.update.value)) {
    update(true);
  }
}

function doAutoThings() {
  if (updateUpgradeActive(0, 2) && player.auto.dev.on) {
    autoAssignDevs();
  }
  if (hasAuto('update') && player.auto.update.on) {
    checkForAutoUpdate();
  }
  if (hasAuto('prestige') && player.auto.prestige.on) {
    checkForAutoPrestige();
  }
  if (hasAuto('enlightened') && player.auto.enlightened.on) {
    checkForAutoEnlightened();
  }
  if (hasAuto('assign-update-points') && player.auto.assignUpdatePoints.on) {
    autoAssignUpdatePoints();
  }
}
