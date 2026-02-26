export const API_BASE = process.env.REACT_APP_API_BASE || '';
export const STADIUM_CAPACITY = 30000;
export const EMPTY_ARR = [];
export const EMPTY_OBJ = {};

export const apiPath = (path) => `${API_BASE}${path}`;
export const fmtInt = (n) => Number(n || 0).toLocaleString();
export const fmtNum = (n, digits = 2) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: digits });
export const fmtMoney = (n, digits = 0) => `$${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: digits })}`;
export const fmtPctRatio = (n, digits = 1) => `${(Number(n || 0) * 100).toFixed(digits)}%`;
export const fmtPctValue = (n, digits = 1) => `${Number(n || 0).toFixed(digits)}%`;
export const titleCase = (value = '') =>
  value
    .replace(/_/g, ' ')
    .split(' ')
    .map((part) => (part ? `${part[0].toUpperCase()}${part.slice(1)}` : part))
    .join(' ');

export const chartBaseOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { boxWidth: 12, usePointStyle: true, pointStyle: 'circle' },
    },
  },
};
