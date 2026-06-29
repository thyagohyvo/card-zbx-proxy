const series = data && data.series && data.series[0];
if (!series || !series.fields) return;

function getVal(fieldName) {
  const field = series.fields.find(function(f) { return f.name === fieldName; });
  if (!field || !field.values) return null;
  var vals = field.values.toArray ? field.values.toArray() : field.values;
  return vals[0] != null ? vals[0] : null;
}

var cpu  = parseFloat(getVal('cpu_pct'))    || 0;
var ram  = parseFloat(getVal('ram_pct'))    || 0;
var disk = parseFloat(getVal('disk_pct'))   || 0;
var proc = parseInt(getVal('proc_running')) || 0;
var ping = parseInt(getVal('agent_ping'))   || 0;
var host = getVal('hostname') || 'PEADTMTPI2131';

// Circunferência = 2π × r = 2π × 26 ≈ 163.36
var C = 163.36;

function ringOffset(pct) {
  return (C * (1 - Math.min(Math.max(pct, 0), 100) / 100)).toFixed(2);
}

// Novo visual: gradiente fixo rosa→ciano para todas as métricas.
// Cor do texto muda conforme nível de alerta.
function colorPct(pct) {
  if (pct >= 80) return '#f87171';  // vermelho
  if (pct >= 51) return '#fcd34d';  // amarelo
  return '#e0d0ff';                 // branco lilás (normal)
}

function colorProc(val) {
  if (val >= 30) return '#f87171';
  if (val >= 16) return '#fcd34d';
  return '#e0d0ff';
}

function applyRing(ringId, valId, pct, suffix) {
  var ring  = htmlNode.getElementById(ringId);
  var label = htmlNode.getElementById(valId);
  ring.setAttribute('stroke-dashoffset', ringOffset(pct));
  label.style.color = colorPct(pct);
  label.textContent = Math.round(pct) + suffix;
}

applyRing('ring-cpu',  'val-cpu',  cpu,  '%');
applyRing('ring-ram',  'val-ram',  ram,  '%');
applyRing('ring-disk', 'val-disk', disk, '%');

var procEl = htmlNode.getElementById('val-proc');
procEl.textContent  = proc;
procEl.style.color  = colorProc(proc);

htmlNode.getElementById('server-name').textContent = host;

var badge = htmlNode.getElementById('ha-status');
var dot   = htmlNode.getElementById('ping-dot');
var lbl   = htmlNode.getElementById('ha-label');

if (ping === 1) {
  badge.className      = 'badge-status online';
  dot.style.background = '#4ade80';
  lbl.textContent      = 'PRX-ON';
  dot.style.animation  = 'pulse 1.8s ease-in-out infinite';
} else {
  badge.className      = 'badge-status offline';
  dot.style.background = '#f87171';
  lbl.textContent      = 'PRX-OFF';
  dot.style.animation  = 'none';
}
