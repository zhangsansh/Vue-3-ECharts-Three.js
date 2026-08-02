export function baseTextStyle() {
  return { color: 'rgba(232,244,248,0.75)', fontSize: 11 }
}

export function axisStyle() {
  return {
    axisLine: { lineStyle: { color: 'rgba(0,212,170,0.3)' } },
    axisLabel: { color: 'rgba(232,244,248,0.55)', fontSize: 10 },
    splitLine: { lineStyle: { color: 'rgba(0,212,170,0.08)' } }
  }
}

export function tooltipStyle() {
  return {
    backgroundColor: 'rgba(8,28,48,0.92)',
    borderColor: 'rgba(0,212,170,0.4)',
    textStyle: { color: '#e8f4f8', fontSize: 12 }
  }
}

export const colors = ['#00d4aa', '#3b9eff', '#ff6b35', '#ffcc33', '#a78bfa', '#f472b6', '#34d399', '#60a5fa', '#fb923c']
