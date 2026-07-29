const mongoose = require('mongoose');
const SystemLog = require('../models/SystemLog');

const escapeRegex = (value = '') => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const toStartOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
};

const toEndOfDay = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(23, 59, 59, 999);
  return date;
};

const addDays = (value, amount) => {
  const date = new Date(value);
  date.setDate(date.getDate() + amount);
  return date;
};

const getDateRange = (dateFilter, dateFrom, dateTo) => {
  const now = new Date();
  const filter = String(dateFilter || 'all').trim().toLowerCase();

  if (filter === 'custom') {
    const start = dateFrom ? toStartOfDay(`${dateFrom}T00:00:00`) : null;
    const end = dateTo ? toEndOfDay(`${dateTo}T00:00:00`) : null;
    return { start, end };
  }

  if (filter === 'today') return { start: toStartOfDay(now), end: toEndOfDay(now) };
  if (filter === 'yesterday') {
    const yesterday = addDays(now, -1);
    return { start: toStartOfDay(yesterday), end: toEndOfDay(yesterday) };
  }
  if (filter === 'thisweek') {
    const day = now.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    return { start: toStartOfDay(addDays(now, -mondayOffset)), end: toEndOfDay(now) };
  }
  if (filter === '7days') return { start: toStartOfDay(addDays(now, -6)), end: toEndOfDay(now) };
  if (filter === 'thismonth') {
    return {
      start: toStartOfDay(new Date(now.getFullYear(), now.getMonth(), 1)),
      end: toEndOfDay(now),
    };
  }
  if (filter === 'lastmonth') {
    return {
      start: toStartOfDay(new Date(now.getFullYear(), now.getMonth() - 1, 1)),
      end: toEndOfDay(new Date(now.getFullYear(), now.getMonth(), 0)),
    };
  }
  if (filter === 'thisyear') {
    return {
      start: toStartOfDay(new Date(now.getFullYear(), 0, 1)),
      end: toEndOfDay(now),
    };
  }
  if (filter === 'lastyear') {
    return {
      start: toStartOfDay(new Date(now.getFullYear() - 1, 0, 1)),
      end: toEndOfDay(new Date(now.getFullYear() - 1, 11, 31)),
    };
  }

  return { start: null, end: null };
};

const buildQuery = (queryParams = {}) => {
  const query = {};
  const search = String(queryParams.q || queryParams.search || '').trim();
  const role = String(queryParams.role || 'all').trim().toLowerCase();
  const action = String(queryParams.action || 'all').trim();
  const moduleName = String(queryParams.module || 'all').trim();
  const status = String(queryParams.status || 'all').trim().toLowerCase();
  const range = getDateRange(
    queryParams.date,
    String(queryParams.dateFrom || '').trim(),
    String(queryParams.dateTo || '').trim()
  );

  if (search) {
    const regex = new RegExp(escapeRegex(search), 'i');
    query.$or = [
      { actorName: regex },
      { actorEmail: regex },
      { actionLabel: regex },
      { action: regex },
      { module: regex },
      { targetName: regex },
      { targetType: regex },
      { description: regex },
      { path: regex },
    ];
  }

  if (role !== 'all') query.actorRole = role;
  if (action !== 'all') query.action = action;
  if (moduleName !== 'all') query.module = moduleName;
  if (status !== 'all') query.status = status;

  if (range.start || range.end) {
    query.createdAt = {};
    if (range.start) query.createdAt.$gte = range.start;
    if (range.end) query.createdAt.$lte = range.end;
  }

  return query;
};

const getSort = (sortValue) => {
  const value = String(sortValue || 'newest').trim().toLowerCase();

  if (value === 'oldest') return { createdAt: 1, _id: 1 };
  if (value === 'name_asc') return { actorName: 1, createdAt: -1 };
  if (value === 'name_desc') return { actorName: -1, createdAt: -1 };
  if (value === 'action_asc') return { actionLabel: 1, createdAt: -1 };
  return { createdAt: -1, _id: -1 };
};

const normalizeLog = (log = {}) => ({
  id: String(log._id || ''),
  requestId: log.requestId || '',
  actor: log.actor || null,
  actorName: log.actorName || 'Unknown user',
  actorEmail: log.actorEmail || '',
  actorRole: log.actorRole || 'unknown',
  action: log.action || '',
  actionLabel: log.actionLabel || log.action || 'System action',
  module: log.module || 'System',
  targetType: log.targetType || 'System',
  targetId: log.targetId || '',
  targetName: log.targetName || '',
  status: log.status || 'success',
  description: log.description || '',
  method: log.method || '',
  path: log.path || '',
  statusCode: log.statusCode || 0,
  durationMs: log.durationMs || 0,
  ipAddress: log.ipAddress || '',
  userAgent: log.userAgent || '',
  metadata: log.metadata && typeof log.metadata === 'object' ? log.metadata : {},
  createdAt: log.createdAt || null,
  updatedAt: log.updatedAt || null,
});

exports.getSystemLogs = async (req, res) => {
  try {
    const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(5, Number.parseInt(req.query.limit, 10) || 15));
    const skip = (page - 1) * limit;
    const query = buildQuery(req.query);
    const sort = getSort(req.query.sort);
    const startOfToday = toStartOfDay(new Date());
    const endOfToday = toEndOfDay(new Date());

    const [logs, total, statusSummary, todayCount, actions, modules] = await Promise.all([
      SystemLog.find(query).sort(sort).skip(skip).limit(limit).lean(),
      SystemLog.countDocuments(query),
      SystemLog.aggregate([
        { $match: query },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
          },
        },
      ]),
      SystemLog.countDocuments({
        ...query,
        createdAt: {
          ...(query.createdAt || {}),
          $gte: query.createdAt?.$gte && query.createdAt.$gte > startOfToday
            ? query.createdAt.$gte
            : startOfToday,
          $lte: query.createdAt?.$lte && query.createdAt.$lte < endOfToday
            ? query.createdAt.$lte
            : endOfToday,
        },
      }),
      SystemLog.aggregate([
        {
          $group: {
            _id: '$action',
            label: { $first: '$actionLabel' },
            count: { $sum: 1 },
          },
        },
        { $sort: { label: 1 } },
      ]),
      SystemLog.distinct('module'),
    ]);

    const summaryMap = statusSummary.reduce((map, item) => {
      map[item._id] = item.count;
      return map;
    }, {});
    const pageCount = Math.max(1, Math.ceil(total / limit));

    return res.json({
      success: true,
      data: logs.map(normalizeLog),
      pagination: {
        page,
        limit,
        total,
        pageCount,
        hasPreviousPage: page > 1,
        hasNextPage: page < pageCount,
      },
      summary: {
        total,
        success: summaryMap.success || 0,
        failed: summaryMap.failed || 0,
        warning: summaryMap.warning || 0,
        today: todayCount,
      },
      filterOptions: {
        roles: ['admin', 'employer', 'jobseeker', 'system', 'unknown'],
        statuses: ['success', 'failed', 'warning'],
        actions: actions
          .filter((item) => item._id)
          .map((item) => ({ value: item._id, label: item.label || item._id, count: item.count })),
        modules: modules.filter(Boolean).sort((a, b) => a.localeCompare(b)),
      },
    });
  } catch (error) {
    console.error('Error fetching system logs:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load system logs. Please try again.',
    });
  }
};

exports.getSystemLogById = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ success: false, message: 'Invalid system log ID.' });
    }

    const log = await SystemLog.findById(req.params.id).lean();
    if (!log) {
      return res.status(404).json({ success: false, message: 'System log not found.' });
    }

    return res.json({ success: true, data: normalizeLog(log) });
  } catch (error) {
    console.error('Error fetching system log details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load system log details. Please try again.',
    });
  }
};
