// Enhanced user quota management system
import { prisma } from './prisma'
import { config } from './config'

export interface QuotaStatus {
  userId: string
  date: string
  usedCount: number
  freeLimit: number
  paidCount: number
  totalCount: number
  hasExceeded: boolean
  remainingFree: number
  costToday: number
  nextResetTime: Date
  quotaHistory?: QuotaHistoryStats
}

export interface QuotaHistoryStats {
  last7Days: {
    totalMessages: number
    totalCost: number
    averageDaily: number
  }
  thisMonth: {
    totalMessages: number
    totalCost: number
    totalDays: number
  }
}

export interface QuotaPreCheck {
  allowed: boolean
  reason?: string
  cost: number
  quotaAfter?: QuotaStatus
}

// 获取用户时区的今日日期 (默认使用 UTC+8 北京时间)
function getTodayInTimezone(timezone: string = 'Asia/Shanghai'): { date: Date, dateStr: string } {
  const now = new Date()
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }
  
  const dateStr = new Intl.DateTimeFormat('zh-CN', options)
    .format(now)
    .replace(/\//g, '-')
    .split(' ')[0] // 2024-12-19
    
  const [year, month, day] = dateStr.split('-')
  const date = new Date(`${year}-${month}-${day}T00:00:00.000Z`)
  
  return { date, dateStr }
}

// 获取下次重置时间 (次日 0 点)
function getNextResetTime(timezone: string = 'Asia/Shanghai'): Date {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }
  
  const tomorrowStr = new Intl.DateTimeFormat('zh-CN', options)
    .format(tomorrow)
    .replace(/\//g, '-')
    
  const [year, month, day] = tomorrowStr.split('-')
  return new Date(`${year}-${month}-${day}T00:00:00.000+08:00`)
}

export async function getUserQuotaStatus(
  userId: string, 
  includeHistory: boolean = false
): Promise<QuotaStatus> {
  const { date, dateStr } = getTodayInTimezone()

  // Get or create today's quota record with transaction for consistency
  const quotaRecord = await prisma.$transaction(async (tx) => {
    let record = await tx.userQuota.findUnique({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
    })

    if (!record) {
      record = await tx.userQuota.create({
        data: {
          userId,
          date,
          usedCount: 0,
        },
      })
    }

    return record
  })

  const freeLimit = config.business.freeQuotaPerDay
  const totalCount = quotaRecord.usedCount
  const freeCount = Math.min(totalCount, freeLimit)
  const paidCount = Math.max(0, totalCount - freeLimit)
  const hasExceeded = totalCount >= freeLimit
  const remainingFree = Math.max(0, freeLimit - totalCount)
  const costToday = paidCount * config.business.paidPricePerMsgCny

  const status: QuotaStatus = {
    userId,
    date: dateStr,
    usedCount: totalCount,
    freeLimit,
    paidCount,
    totalCount,
    hasExceeded,
    remainingFree,
    costToday,
    nextResetTime: getNextResetTime(),
  }

  // 添加历史统计信息 (可选)
  if (includeHistory) {
    status.quotaHistory = await getQuotaHistoryStats(userId)
  }

  return status
}

// 获取配额历史统计
async function getQuotaHistoryStats(userId: string): Promise<QuotaHistoryStats> {
  const { date: today } = getTodayInTimezone()
  const sevenDaysAgo = new Date(today)
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1)

  // 查询最近7天的数据
  const last7DaysData = await prisma.userQuota.findMany({
    where: {
      userId,
      date: {
        gte: sevenDaysAgo,
        lte: today,
      },
    },
  })

  // 查询本月的数据
  const thisMonthData = await prisma.userQuota.findMany({
    where: {
      userId,
      date: {
        gte: monthStart,
        lte: today,
      },
    },
  })

  const freeLimit = config.business.freeQuotaPerDay
  const paidPrice = config.business.paidPricePerMsgCny

  // 计算最近7天统计
  const last7DaysTotal = last7DaysData.reduce((sum, record) => sum + record.usedCount, 0)
  const last7DaysCost = last7DaysData.reduce((sum, record) => {
    const paidCount = Math.max(0, record.usedCount - freeLimit)
    return sum + paidCount * paidPrice
  }, 0)

  // 计算本月统计  
  const thisMonthTotal = thisMonthData.reduce((sum, record) => sum + record.usedCount, 0)
  const thisMonthCost = thisMonthData.reduce((sum, record) => {
    const paidCount = Math.max(0, record.usedCount - freeLimit)
    return sum + paidCount * paidPrice
  }, 0)

  return {
    last7Days: {
      totalMessages: last7DaysTotal,
      totalCost: last7DaysCost,
      averageDaily: Math.round(last7DaysTotal / 7 * 100) / 100,
    },
    thisMonth: {
      totalMessages: thisMonthTotal,
      totalCost: thisMonthCost,
      totalDays: thisMonthData.length,
    },
  }
}

// 配额预检查 - 在实际使用前检查是否允许
export async function preCheckQuota(userId: string): Promise<QuotaPreCheck> {
  const currentQuota = await getUserQuotaStatus(userId)
  const cost = calculateMessageCost(currentQuota.hasExceeded)

  // 模拟使用后的配额状态
  const quotaAfter: QuotaStatus = {
    ...currentQuota,
    usedCount: currentQuota.usedCount + 1,
    totalCount: currentQuota.totalCount + 1,
    paidCount: currentQuota.hasExceeded ? currentQuota.paidCount + 1 : currentQuota.paidCount,
    remainingFree: Math.max(0, currentQuota.remainingFree - 1),
    costToday: currentQuota.costToday + cost,
  }

  // 基本检查 - 总是允许，因为支持付费
  return {
    allowed: true,
    cost,
    quotaAfter,
  }
}

export async function incrementUserQuota(userId: string): Promise<QuotaStatus> {
  const { date } = getTodayInTimezone()

  // 使用事务确保原子性操作
  await prisma.$transaction(async (tx) => {
    await tx.userQuota.upsert({
      where: {
        userId_date: {
          userId,
          date,
        },
      },
      create: {
        userId,
        date,
        usedCount: 1,
      },
      update: {
        usedCount: {
          increment: 1,
        },
      },
    })
  })

  return getUserQuotaStatus(userId)
}

// 计算消息成本
export function calculateMessageCost(hasExceeded: boolean): number {
  return hasExceeded ? config.business.paidPricePerMsgCny : 0
}

// 重置用户配额 (用于管理员或定时任务)
export async function resetUserQuota(userId: string, date?: Date): Promise<void> {
  const targetDate = date || getTodayInTimezone().date

  await prisma.userQuota.upsert({
    where: {
      userId_date: {
        userId,
        date: targetDate,
      },
    },
    create: {
      userId,
      date: targetDate,
      usedCount: 0,
    },
    update: {
      usedCount: 0,
    },
  })
}

// 批量重置所有用户配额 (用于每日定时任务)
export async function resetAllUsersQuota(): Promise<{ affectedUsers: number }> {
  const { date } = getTodayInTimezone()
  
  // 获取所有有配额记录的用户
  const existingQuotas = await prisma.userQuota.findMany({
    where: { date },
    select: { userId: true },
  })

  // 重置所有配额
  const result = await prisma.userQuota.updateMany({
    where: { date },
    data: { usedCount: 0 },
  })

  return { affectedUsers: result.count }
}

// 获取配额统计信息 (用于管理面板)
export async function getQuotaStatistics(days: number = 7): Promise<{
  totalUsers: number
  activeUsers: number
  totalMessages: number
  totalRevenue: number
  averageMessagesPerUser: number
}> {
  const { date: today } = getTodayInTimezone()
  const startDate = new Date(today)
  startDate.setDate(startDate.getDate() - days)

  const quotaRecords = await prisma.userQuota.findMany({
    where: {
      date: {
        gte: startDate,
        lte: today,
      },
    },
  })

  const totalUsers = new Set(quotaRecords.map(r => r.userId)).size
  const activeUsers = quotaRecords.filter(r => r.usedCount > 0).length
  const totalMessages = quotaRecords.reduce((sum, r) => sum + r.usedCount, 0)
  
  const freeLimit = config.business.freeQuotaPerDay
  const paidPrice = config.business.paidPricePerMsgCny
  const totalRevenue = quotaRecords.reduce((sum, record) => {
    const paidCount = Math.max(0, record.usedCount - freeLimit)
    return sum + paidCount * paidPrice
  }, 0)

  return {
    totalUsers,
    activeUsers,
    totalMessages,
    totalRevenue,
    averageMessagesPerUser: totalUsers > 0 ? Math.round(totalMessages / totalUsers * 100) / 100 : 0,
  }
}

// 配额告警检查
export async function checkQuotaAlerts(userId: string): Promise<{
  shouldAlert: boolean
  alertType: 'approaching_limit' | 'exceeded_limit' | 'high_usage'
  message: string
}> {
  const quota = await getUserQuotaStatus(userId)
  
  if (quota.remainingFree <= 0) {
    return {
      shouldAlert: true,
      alertType: 'exceeded_limit',
      message: '今日免费额度已用完，继续对话将收费 1 元/条',
    }
  }
  
  if (quota.remainingFree <= 3) {
    return {
      shouldAlert: true,
      alertType: 'approaching_limit',
      message: `今日免费额度仅剩 ${quota.remainingFree} 条，请合理使用`,
    }
  }
  
  if (quota.usedCount >= 15) {
    return {
      shouldAlert: true,
      alertType: 'high_usage',
      message: '今日使用量较高，注意配额管理',
    }
  }

  return {
    shouldAlert: false,
    alertType: 'approaching_limit',
    message: '',
  }
}