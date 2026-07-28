const User = require('../models/User');

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_INACTIVE_MONTHS = 6;
const MAX_INACTIVE_MONTHS = 12;
const DEFAULT_INACTIVE_MONTHS = 6;

let monitorTimer = null;
let checkInProgress = false;

const getInactiveEmployerMonths = () => {
  const configured = Number.parseInt(process.env.INACTIVE_EMPLOYER_MONTHS, 10);

  if (!Number.isFinite(configured)) return DEFAULT_INACTIVE_MONTHS;
  return Math.min(MAX_INACTIVE_MONTHS, Math.max(MIN_INACTIVE_MONTHS, configured));
};

const subtractMonths = (date, months) => {
  const result = new Date(date);
  const originalDay = result.getDate();

  result.setDate(1);
  result.setMonth(result.getMonth() - months);

  const lastDayOfTargetMonth = new Date(
    result.getFullYear(),
    result.getMonth() + 1,
    0
  ).getDate();

  result.setDate(Math.min(originalDay, lastDayOfTargetMonth));
  return result;
};

const archiveInactiveEmployers = async () => {
  if (checkInProgress) {
    return { checked: false, archivedCount: 0, reason: 'already_running' };
  }

  checkInProgress = true;

  try {
    const thresholdMonths = getInactiveEmployerMonths();
    const now = new Date();
    const cutoff = subtractMonths(now, thresholdMonths);
    const reason = `No employer login for ${thresholdMonths} month${thresholdMonths === 1 ? '' : 's'}`;

    const result = await User.updateMany(
      {
        role: 'employer',
        status: 'active',
        isActive: true,
        inactiveBySystem: { $ne: true },
        $or: [
          { lastLogin: { $lte: cutoff } },
          {
            $and: [
              { $or: [{ lastLogin: null }, { lastLogin: { $exists: false } }] },
              { createdAt: { $lte: cutoff } },
            ],
          },
        ],
      },
      {
        $set: {
          status: 'inactive',
          isActive: false,
          inactiveBySystem: true,
          inactiveAt: now,
          inactiveReason: reason,
          inactiveThresholdMonths: thresholdMonths,
        },
      }
    );

    const archivedCount = Number(result.modifiedCount || 0);

    console.log(
      ` Inactive employer check completed: ${archivedCount} account(s) archived after ${thresholdMonths} month(s) without login.`
    );

    return {
      checked: true,
      archivedCount,
      thresholdMonths,
      cutoff,
    };
  } catch (error) {
    console.error(' Inactive employer monitor failed:', error);
    return {
      checked: false,
      archivedCount: 0,
      error: error?.message || 'Unknown inactive employer monitor error',
    };
  } finally {
    checkInProgress = false;
  }
};

const startInactiveEmployerMonitor = () => {
  if (monitorTimer) return monitorTimer;

  // Check immediately after MongoDB connects, then once every 24 hours.
  archiveInactiveEmployers();
  monitorTimer = setInterval(archiveInactiveEmployers, DAY_MS);

  if (typeof monitorTimer.unref === 'function') {
    monitorTimer.unref();
  }

  return monitorTimer;
};

module.exports = {
  archiveInactiveEmployers,
  startInactiveEmployerMonitor,
  getInactiveEmployerMonths,
};
