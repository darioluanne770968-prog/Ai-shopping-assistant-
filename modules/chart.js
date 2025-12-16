/**
 * AI购物助手 - 图表管理模块
 * 价格走势图表渲染
 */

export class ChartManager {
  constructor() {
    this.charts = {};
    this.defaultOptions = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          mode: 'index',
          intersect: false,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#ff6b35',
          borderWidth: 1,
          padding: 10,
          displayColors: false,
          callbacks: {
            title: (items) => {
              const date = new Date(items[0].label);
              return date.toLocaleDateString('zh-CN', {
                month: 'short',
                day: 'numeric'
              });
            },
            label: (item) => `¥${item.raw}`
          }
        }
      },
      scales: {
        x: {
          display: true,
          grid: {
            display: false
          },
          ticks: {
            maxRotation: 0,
            maxTicksLimit: 5,
            font: {
              size: 10
            },
            color: '#999'
          }
        },
        y: {
          display: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)'
          },
          ticks: {
            font: {
              size: 10
            },
            color: '#999',
            callback: (value) => `¥${value}`
          }
        }
      },
      interaction: {
        mode: 'nearest',
        axis: 'x',
        intersect: false
      }
    };
  }

  /**
   * 渲染价格走势图
   */
  renderPriceChart(canvasId, priceHistory) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    // 销毁已存在的图表
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    // 处理数据
    const labels = priceHistory.map(h => h.date);
    const data = priceHistory.map(h => h.price);

    // 计算渐变
    const gradient = ctx.createLinearGradient(0, 0, 0, 150);
    gradient.addColorStop(0, 'rgba(255, 107, 53, 0.3)');
    gradient.addColorStop(1, 'rgba(255, 107, 53, 0)');

    // 创建图表
    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          data,
          borderColor: '#ff6b35',
          backgroundColor: gradient,
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointRadius: 0,
          pointHoverRadius: 5,
          pointHoverBackgroundColor: '#ff6b35',
          pointHoverBorderColor: '#fff',
          pointHoverBorderWidth: 2
        }]
      },
      options: this.defaultOptions
    });

    return this.charts[canvasId];
  }

  /**
   * 渲染迷你价格图（用于心愿单等）
   */
  renderMiniChart(canvasId, prices, options = {}) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    const isUp = prices[prices.length - 1] > prices[0];
    const color = isUp ? '#ff4d4f' : '#52c41a';

    this.charts[canvasId] = new Chart(ctx, {
      type: 'line',
      data: {
        labels: prices.map((_, i) => i),
        datasets: [{
          data: prices,
          borderColor: color,
          borderWidth: 1.5,
          fill: false,
          tension: 0.3,
          pointRadius: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false }
        },
        scales: {
          x: { display: false },
          y: { display: false }
        },
        ...options
      }
    });

    return this.charts[canvasId];
  }

  /**
   * 渲染情感分析饼图
   */
  renderSentimentChart(canvasId, sentiment) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    this.charts[canvasId] = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: ['好评', '中评', '差评'],
        datasets: [{
          data: [sentiment.positive, sentiment.neutral, sentiment.negative],
          backgroundColor: ['#52c41a', '#faad14', '#ff4d4f'],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '60%',
        plugins: {
          legend: {
            display: true,
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: { size: 11 }
            }
          },
          tooltip: {
            callbacks: {
              label: (item) => `${item.label}: ${item.raw}%`
            }
          }
        }
      }
    });

    return this.charts[canvasId];
  }

  /**
   * 渲染比价柱状图
   */
  renderComparisonChart(canvasId, prices) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    const sortedPrices = [...prices].sort((a, b) => a.price - b.price);
    const minPrice = sortedPrices[0].price;

    this.charts[canvasId] = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: sortedPrices.map(p => p.platform),
        datasets: [{
          data: sortedPrices.map(p => p.price),
          backgroundColor: sortedPrices.map((p, i) =>
            i === 0 ? '#52c41a' : 'rgba(255, 107, 53, 0.7)'
          ),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (item) => {
                const diff = item.raw - minPrice;
                return diff > 0
                  ? `¥${item.raw} (贵¥${diff.toFixed(2)})`
                  : `¥${item.raw} (最低)`;
              }
            }
          }
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: {
              callback: (value) => `¥${value}`
            }
          },
          y: {
            grid: { display: false }
          }
        }
      }
    });

    return this.charts[canvasId];
  }

  /**
   * 更新图表数据
   */
  updateChart(canvasId, newData) {
    const chart = this.charts[canvasId];
    if (!chart) return;

    chart.data.labels = newData.labels;
    chart.data.datasets[0].data = newData.data;
    chart.update();
  }

  /**
   * 销毁图表
   */
  destroyChart(canvasId) {
    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
      delete this.charts[canvasId];
    }
  }

  /**
   * 销毁所有图表
   */
  destroyAll() {
    Object.keys(this.charts).forEach(id => {
      this.charts[id].destroy();
    });
    this.charts = {};
  }

  /**
   * 生成价格走势总结
   */
  analyzePriceTrend(priceHistory) {
    if (priceHistory.length < 2) {
      return { trend: 'unknown', message: '数据不足' };
    }

    const prices = priceHistory.map(h => h.price);
    const current = prices[prices.length - 1];
    const lowest = Math.min(...prices);
    const highest = Math.max(...prices);
    const average = prices.reduce((a, b) => a + b, 0) / prices.length;

    // 计算趋势
    const recentPrices = prices.slice(-7);
    const recentAvg = recentPrices.reduce((a, b) => a + b, 0) / recentPrices.length;
    const olderPrices = prices.slice(0, -7);
    const olderAvg = olderPrices.length > 0
      ? olderPrices.reduce((a, b) => a + b, 0) / olderPrices.length
      : recentAvg;

    let trend, message;

    if (current === lowest) {
      trend = 'lowest';
      message = '当前价格是历史最低！';
    } else if (current <= average * 0.9) {
      trend = 'low';
      message = '当前价格低于平均，可以入手';
    } else if (recentAvg < olderAvg * 0.95) {
      trend = 'down';
      message = '价格呈下降趋势';
    } else if (recentAvg > olderAvg * 1.05) {
      trend = 'up';
      message = '价格呈上涨趋势';
    } else {
      trend = 'stable';
      message = '价格保持稳定';
    }

    return {
      trend,
      message,
      current,
      lowest,
      highest,
      average: Math.round(average * 100) / 100,
      percentFromLowest: Math.round((current - lowest) / lowest * 100)
    };
  }
}
