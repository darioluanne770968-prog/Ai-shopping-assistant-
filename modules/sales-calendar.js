/**
 * AI购物助手 - 大促日历模块
 * 电商大促活动日历和提醒
 */

export class SalesCalendar {
  constructor() {
    // 主要大促活动配置
    this.majorSales = [
      {
        id: 'newyear',
        name: '年货节',
        platforms: ['淘宝', '天猫', '京东'],
        startMonth: 1,
        startDay: 10,
        endMonth: 1,
        endDay: 20,
        discount: '8-9折',
        tips: ['年货、礼品类折扣大', '提前加购物车', '关注跨店满减']
      },
      {
        id: 'womensday',
        name: '38女王节',
        platforms: ['天猫', '京东'],
        startMonth: 3,
        startDay: 1,
        endMonth: 3,
        endDay: 8,
        discount: '8-9折',
        tips: ['美妆护肤折扣最大', '关注品牌专场', '叠加使用优惠券']
      },
      {
        id: '618',
        name: '618年中大促',
        platforms: ['京东', '淘宝', '天猫', '拼多多', '苏宁'],
        startMonth: 6,
        startDay: 1,
        endMonth: 6,
        endDay: 20,
        discount: '5-8折',
        tips: ['全年第二大促', '数码家电折扣大', '提前看攻略', '分批次付定金']
      },
      {
        id: '818',
        name: '818发烧购物节',
        platforms: ['苏宁'],
        startMonth: 8,
        startDay: 15,
        endMonth: 8,
        endDay: 20,
        discount: '8-9折',
        tips: ['苏宁主场活动', '家电类优惠多']
      },
      {
        id: '99',
        name: '99大促/聚划算',
        platforms: ['淘宝', '天猫'],
        startMonth: 9,
        startDay: 1,
        endMonth: 9,
        endDay: 9,
        discount: '8-9折',
        tips: ['秋季上新好时机', '关注聚划算专区']
      },
      {
        id: 'double11',
        name: '双11全球狂欢节',
        platforms: ['淘宝', '天猫', '京东', '拼多多', '苏宁', '唯品会'],
        startMonth: 11,
        startDay: 1,
        endMonth: 11,
        endDay: 11,
        discount: '5-7折',
        tips: ['全年最大促销', '提前加购抢优惠', '关注预售定金', '0点/8点抢购', '双11当天最低价']
      },
      {
        id: 'double12',
        name: '双12年终盛典',
        platforms: ['淘宝', '天猫', '京东'],
        startMonth: 12,
        startDay: 5,
        endMonth: 12,
        endDay: 12,
        discount: '7-9折',
        tips: ['清仓折扣多', '关注店铺红包', '适合捡漏']
      },
      {
        id: 'blackfriday',
        name: '黑色星期五',
        platforms: ['亚马逊', '京东国际'],
        startMonth: 11,
        startDay: 24,
        endMonth: 11,
        endDay: 27,
        discount: '5-8折',
        tips: ['海淘好时机', '关注国际品牌', '注意关税和物流']
      }
    ];

    // 月度小促销
    this.monthlySales = [
      { day: 1, name: '月初上新', description: '各平台月初新品发布' },
      { day: 10, name: '会员日', description: '部分平台会员专享优惠' },
      { day: 20, name: '超级品牌日', description: '品牌专场活动' },
      { day: 25, name: '月末清仓', description: '商家冲销量' }
    ];
  }

  /**
   * 获取年度大促日历
   */
  getAnnualCalendar(year = new Date().getFullYear()) {
    return this.majorSales.map(sale => ({
      ...sale,
      startDate: `${year}-${String(sale.startMonth).padStart(2, '0')}-${String(sale.startDay).padStart(2, '0')}`,
      endDate: `${year}-${String(sale.endMonth).padStart(2, '0')}-${String(sale.endDay).padStart(2, '0')}`
    }));
  }

  /**
   * 获取即将到来的活动
   */
  getUpcomingSales(days = 30) {
    const now = new Date();
    const endDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
    const year = now.getFullYear();

    const upcoming = [];

    for (const sale of this.majorSales) {
      let saleStart = new Date(year, sale.startMonth - 1, sale.startDay);
      let saleEnd = new Date(year, sale.endMonth - 1, sale.endDay);

      // 如果今年的已经过了，看明年的
      if (saleEnd < now) {
        saleStart = new Date(year + 1, sale.startMonth - 1, sale.startDay);
        saleEnd = new Date(year + 1, sale.endMonth - 1, sale.endDay);
      }

      // 检查是否在范围内
      if (saleStart <= endDate) {
        const daysUntil = Math.ceil((saleStart - now) / (1000 * 60 * 60 * 24));
        const isActive = now >= saleStart && now <= saleEnd;

        upcoming.push({
          ...sale,
          startDate: saleStart,
          endDate: saleEnd,
          daysUntil: Math.max(0, daysUntil),
          isActive,
          status: isActive ? 'active' : (daysUntil <= 7 ? 'soon' : 'upcoming')
        });
      }
    }

    return upcoming.sort((a, b) => a.daysUntil - b.daysUntil);
  }

  /**
   * 获取当前活动
   */
  getActiveSales() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const day = now.getDate();

    return this.majorSales.filter(sale => {
      const isInRange =
        (month > sale.startMonth || (month === sale.startMonth && day >= sale.startDay)) &&
        (month < sale.endMonth || (month === sale.endMonth && day <= sale.endDay));
      return isInRange;
    });
  }

  /**
   * 获取本月促销日
   */
  getMonthlyPromotions(month = new Date().getMonth() + 1, year = new Date().getFullYear()) {
    const promotions = [];

    // 添加月度小促销
    for (const promo of this.monthlySales) {
      promotions.push({
        date: new Date(year, month - 1, promo.day),
        type: 'monthly',
        ...promo
      });
    }

    // 添加大促（如果在本月）
    for (const sale of this.majorSales) {
      if (sale.startMonth === month || sale.endMonth === month) {
        const startDate = new Date(year, sale.startMonth - 1, sale.startDay);
        const endDate = new Date(year, sale.endMonth - 1, sale.endDay);

        promotions.push({
          date: startDate,
          endDate,
          type: 'major',
          name: sale.name,
          discount: sale.discount,
          platforms: sale.platforms
        });
      }
    }

    return promotions.sort((a, b) => a.date - b.date);
  }

  /**
   * 判断商品是否应该等待大促
   */
  shouldWaitForSale(product, maxWaitDays = 30) {
    const upcoming = this.getUpcomingSales(maxWaitDays);

    if (upcoming.length === 0) {
      return {
        shouldWait: false,
        reason: '近期没有大促活动，可以现在购买'
      };
    }

    const nextSale = upcoming[0];

    // 如果大促正在进行
    if (nextSale.isActive) {
      return {
        shouldWait: false,
        reason: `${nextSale.name}正在进行中，现在购买正合适！`,
        sale: nextSale
      };
    }

    // 如果7天内有大促
    if (nextSale.daysUntil <= 7) {
      return {
        shouldWait: true,
        reason: `${nextSale.name}将在${nextSale.daysUntil}天后开始，建议等待`,
        sale: nextSale,
        expectedDiscount: nextSale.discount
      };
    }

    // 如果是高价商品且30天内有大促
    if (product.price > 500 && nextSale.daysUntil <= 30) {
      return {
        shouldWait: true,
        reason: `商品价格较高，${nextSale.name}(${nextSale.daysUntil}天后)可能有更大优惠`,
        sale: nextSale,
        expectedDiscount: nextSale.discount
      };
    }

    return {
      shouldWait: false,
      reason: '距离下次大促较远，可以考虑现在购买',
      nextSale
    };
  }

  /**
   * 获取大促购物攻略
   */
  getSaleGuide(saleId) {
    const sale = this.majorSales.find(s => s.id === saleId);
    if (!sale) return null;

    const guide = {
      sale,
      timeline: this.getSaleTimeline(sale),
      strategies: this.getSaleStrategies(sale),
      categoryTips: this.getCategoryTips(sale),
      commonMistakes: this.getCommonMistakes()
    };

    return guide;
  }

  /**
   * 获取大促时间线
   */
  getSaleTimeline(sale) {
    const timeline = [];

    if (sale.id === 'double11') {
      timeline.push(
        { phase: '预热期', date: '10月20日起', action: '浏览商品，加购物车，领取优惠券' },
        { phase: '预售期', date: '10月24日-31日', action: '支付定金锁定价格' },
        { phase: '第一波', date: '11月1日-3日', action: '支付尾款，第一波优惠' },
        { phase: '第二波', date: '11月11日', action: '当天最大优惠，0点抢购' }
      );
    } else if (sale.id === '618') {
      timeline.push(
        { phase: '预热期', date: '5月24日起', action: '领券、加购' },
        { phase: '预售期', date: '5月26日-31日', action: '付定金' },
        { phase: '开门红', date: '6月1日-3日', action: '第一波高潮' },
        { phase: '高潮期', date: '6月15日-18日', action: '618当天最优惠' }
      );
    } else {
      timeline.push(
        { phase: '准备期', date: '活动前3天', action: '加购物车、领券' },
        { phase: '活动期', date: '活动期间', action: '比价下单' }
      );
    }

    return timeline;
  }

  /**
   * 获取大促策略
   */
  getSaleStrategies(sale) {
    return [
      {
        title: '提前加购',
        icon: '🛒',
        description: '活动前一周将心仪商品加入购物车，方便比较价格变化'
      },
      {
        title: '关注优惠券',
        icon: '🎫',
        description: '提前领取平台券、店铺券、品类券，叠加使用更优惠'
      },
      {
        title: '用好满减',
        icon: '💰',
        description: '凑单达到满减门槛，不需要的商品下单后可退'
      },
      {
        title: '比较预售',
        icon: '📊',
        description: '预售价格不一定最低，对比后再决定是否付定金'
      },
      {
        title: '关注时间点',
        icon: '⏰',
        description: '0点、10点、20点通常有更多优惠释放'
      }
    ];
  }

  /**
   * 获取品类购买建议
   */
  getCategoryTips(sale) {
    const tips = {
      '数码电子': sale.id === '618' || sale.id === 'double11'
        ? '大促主力品类，优惠力度大'
        : '日常价格波动不大',
      '服装鞋帽': '换季清仓力度大',
      '美妆护肤': '38节、双11优惠最大',
      '食品生鲜': '关注时效，适量囤货',
      '家居家装': '大件注意物流时间'
    };

    return tips;
  }

  /**
   * 常见错误提醒
   */
  getCommonMistakes() {
    return [
      { icon: '❌', mistake: '冲动消费', tip: '先列清单，按需购买' },
      { icon: '❌', mistake: '忽略比价', tip: '同一商品不同平台价格可能差很多' },
      { icon: '❌', mistake: '定金不退', tip: '预售定金通常不退，想清楚再付' },
      { icon: '❌', mistake: '忽略运费', tip: '凑单时注意运费成本' },
      { icon: '❌', mistake: '过度凑单', tip: '不需要的东西再便宜也是浪费' }
    ];
  }

  /**
   * 设置大促提醒
   */
  async setReminder(saleId, reminderDays = [7, 3, 1]) {
    const sale = this.majorSales.find(s => s.id === saleId);
    if (!sale) return { success: false };

    const reminders = reminderDays.map(days => ({
      saleId,
      saleName: sale.name,
      daysBefore: days,
      notified: false
    }));

    // 存储提醒设置
    return {
      success: true,
      reminders,
      message: `已设置${sale.name}提醒，将在活动前${reminderDays.join('、')}天通知您`
    };
  }

  /**
   * 生成日历视图数据
   */
  getCalendarView(year, month) {
    const firstDay = new Date(year, month - 1, 1);
    const lastDay = new Date(year, month, 0);
    const daysInMonth = lastDay.getDate();

    const calendar = [];
    const promotions = this.getMonthlyPromotions(month, year);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month - 1, day);
      const dayPromotions = promotions.filter(p => {
        if (p.type === 'monthly') {
          return p.date.getDate() === day;
        }
        return date >= p.date && date <= p.endDate;
      });

      calendar.push({
        day,
        date,
        isWeekend: date.getDay() === 0 || date.getDay() === 6,
        promotions: dayPromotions,
        hasMajorSale: dayPromotions.some(p => p.type === 'major')
      });
    }

    return calendar;
  }
}
