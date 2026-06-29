# 🖥️ Grafana · Host Monitor Card

Card de monitoramento de host para o plugin **HTML Graphics** do Grafana, com dados vindos do **Zabbix via MySQL**. Exibe CPU, RAM, disco e processos em anéis circulares com gradiente, totalmente responsivo ao tamanho do painel.

---

## Preview

<img width="461" height="201" alt="image" src="https://github.com/user-attachments/assets/7af887f0-5aec-4bb5-9305-c54fd3a24f1a" />

---

## Funcionalidades

- Anéis SVG com gradiente rosa → ciano que escalam com o tamanho do painel
- Cor do valor muda automaticamente por threshold:

  | Faixa | Cor | Significado |
  |-------|-----|-------------|
  | 0 – 50% | branco lilás | Normal |
  | 51 – 79% | amarelo | Atenção |
  | ≥ 80% | vermelho | Crítico |

- Processos: verde até 15 / amarelo 16–29 / vermelho 30+
- Badge **PRX-ON / PRX-OFF** com dot animado refletindo o `agent.ping` do Zabbix
- Layout 100% responsivo via `vmin` e `clamp()` — sem tamanho fixo

---

## Pré-requisitos

| Dependência | Versão mínima |
|------------|---------------|
| Grafana | 9.x ou superior |
| Plugin [HTML Graphics](https://grafana.com/grafana/plugins/marcusolsson-html-panel/) | 2.x |
| Datasource MySQL | apontando para o banco do Zabbix |
| Zabbix | 6.x (chaves padrão de agente ativo) |

---

## Estrutura do repositório

```
grafana-card/
├── panel.html      # Estrutura HTML do card
├── style.css       # Estilo responsivo (campo CSS do plugin)
├── onRender.js     # Lógica de atualização dos dados (campo onRender)
└── README.md
```

---

## Instalação

### 1. Instale o plugin HTML Graphics

No servidor Grafana:

```bash
grafana-cli plugins install marcusolsson-html-panel
systemctl restart grafana-server
```

### 2. Crie o painel

1. Abra seu dashboard e clique em **Add panel → HTML Graphics**
2. No painel de edição, selecione **HTML/SVG document** e cole o conteúdo de `panel.html`
3. No campo **CSS**, cole o conteúdo de `style.css`
4. No campo **onRender**, cole o conteúdo de `onRender.js`

### 3. Configure o datasource MySQL (Zabbix)

Adicione a query abaixo na aba **Queries** do painel, datasource apontando para o banco MySQL do Zabbix:

```sql
SELECT
    h.host                                          AS hostname,
    h.name                                          AS display_name,

    -- CPU utilization
    (SELECT ROUND(hf.value, 2)
     FROM history hf
     WHERE hf.itemid = (
         SELECT itemid FROM items
         WHERE hostid = h.hostid AND key_ = 'system.cpu.util' AND status = 0
         LIMIT 1
     )
     ORDER BY hf.clock DESC LIMIT 1)               AS cpu_pct,

    -- Memory utilization
    (SELECT ROUND(hf.value, 2)
     FROM history hf
     WHERE hf.itemid = (
         SELECT itemid FROM items
         WHERE hostid = h.hostid AND key_ = 'vm.memory.utilization' AND status = 0
         LIMIT 1
     )
     ORDER BY hf.clock DESC LIMIT 1)               AS ram_pct,

    -- Disk utilization
    (SELECT ROUND(hf.value, 2)
     FROM history hf
     WHERE hf.itemid = (
         SELECT itemid FROM items
         WHERE hostid = h.hostid AND key_ = 'vfs.fs.size[/,pused]' AND status = 0
         LIMIT 1
     )
     ORDER BY hf.clock DESC LIMIT 1)               AS disk_pct,

    -- Running processes
    (SELECT hu.value
     FROM history_uint hu
     WHERE hu.itemid = (
         SELECT itemid FROM items
         WHERE hostid = h.hostid AND key_ = 'proc.num[,,run]' AND status = 0
         LIMIT 1
     )
     ORDER BY hu.clock DESC LIMIT 1)               AS proc_running,

    -- Agent ping
    (SELECT hu.value
     FROM history_uint hu
     WHERE hu.itemid = (
         SELECT itemid FROM items
         WHERE hostid = h.hostid AND key_ = 'agent.ping' AND status = 0
         LIMIT 1
     )
     ORDER BY hu.clock DESC LIMIT 1)               AS agent_ping

FROM hosts h
WHERE
    h.status = 0
    AND h.host = 'SEU_HOST_AQUI'   -- ← altere para o host desejado
```

> **Dica:** Para monitorar múltiplos hosts, duplique o painel e altere apenas o `h.host` na cláusula `WHERE`.

---

## Campos esperados pelo onRender

O JavaScript lê os seguintes aliases da query. Não altere os nomes sem atualizar o `onRender.js`:

| Alias SQL | Tipo | Descrição |
|-----------|------|-----------|
| `hostname` | string | Nome do host exibido no card |
| `cpu_pct` | float | Utilização de CPU em % |
| `ram_pct` | float | Utilização de memória em % |
| `disk_pct` | float | Utilização de disco em % |
| `proc_running` | int | Número de processos em execução |
| `agent_ping` | int | 1 = online, 0 = offline |

---

## Personalização

### Trocar as cores do gradiente

Em `panel.html`, localize os blocos `<linearGradient>` de cada anel e altere os `stop-color`:

```html
<linearGradient id="g-cpu" x1="0%" y1="100%" x2="100%" y2="0%">
  <stop offset="0%" stop-color="#f0f"/>   <!-- cor inicial -->
  <stop offset="100%" stop-color="#0cf"/> <!-- cor final   -->
</linearGradient>
```

### Alterar os thresholds de alerta

Em `onRender.js`, edite as funções `colorPct` e `colorProc`:

```js
function colorPct(pct) {
  if (pct >= 80) return '#f87171';  // vermelho — crítico
  if (pct >= 51) return '#fcd34d';  // amarelo  — atenção
  return '#e0d0ff';                 // normal
}
```

### Ajustar o tamanho dos anéis

Em `style.css`, altere o valor `min(12vmin, 90px)` na classe `.ring-wrap`:

```css
.ring-wrap {
  width: min(12vmin, 90px);   /* aumente o 90px para anéis maiores */
  height: min(12vmin, 90px);
}
```

---

## Como funciona a responsividade

O card usa unidades relativas ao viewport do iframe do Grafana:

- `vmin` — relativo ao menor lado do painel; garante que anéis e fontes escalam juntos
- `clamp(mín, vmin, máx)` — define piso e teto para fontes, evitando texto minúsculo ou gigante
- O SVG usa `viewBox` fixo (`0 0 64 64`) sem `width`/`height` absolutos — escala via CSS
- O `stroke-dasharray` e `stroke-dashoffset` são calculados sobre o raio do `viewBox` (r=26, C≈163.36) e permanecem precisos em qualquer tamanho visual

---

## Licença

MIT — livre para uso, modificação e distribuição.
