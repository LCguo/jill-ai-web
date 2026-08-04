import { defineComponent, createLibrary, useStateField, useSetFieldValue, useFormName, useTriggerAction, useIsStreaming } from '@openuidev/react-lang'
import { z } from 'zod/v4'
import { useRef, useEffect, useCallback } from 'react'
import * as echarts from 'echarts'
import { marked } from 'marked'

// NOTE: OpenUI renders components as <Comp props={...} renderNode={...} />,
// so all renderers receive ({ props, renderNode, statementId }), not raw props.

// --- Content Components ---

export const CardHeader = defineComponent({
  name: 'CardHeader',
  description: 'A card header with title and optional subtitle',
  props: z.object({
    title: z.string().describe('Header title'),
    subtitle: z.string().optional().describe('Optional subtitle text'),
  }),
  component: ({ props: p }) => (
    <div style={{ marginBottom: 12 }}>
      <div style={{ fontSize: 16, fontWeight: 600, color: '#1a1a1a' }}>{p.title}</div>
      {p.subtitle && <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{p.subtitle}</div>}
    </div>
  ),
})

export const TextContent = defineComponent({
  name: 'TextContent',
  description: 'Display text with a style variant',
  props: z.object({
    text: z.string().describe('Text content'),
    variant: z.enum(['small', 'medium', 'large', 'large-heavy']).optional().describe('Text style'),
  }),
  component: ({ props: p }) => {
    const styleMap = {
      small: { fontSize: 13, color: '#666' },
      medium: { fontSize: 15 },
      large: { fontSize: 18 },
      'large-heavy': { fontSize: 18, fontWeight: 600 },
    }
    return <div style={styleMap[p.variant || 'medium']}>{p.text}</div>
  },
})

export const MarkDownRenderer = defineComponent({
  name: 'MarkDownRenderer',
  description: 'Render markdown text as HTML',
  props: z.object({
    text: z.string().describe('Markdown formatted text'),
  }),
  component: ({ props: p }) => (
    <div
      className="markdown-body"
      dangerouslySetInnerHTML={{ __html: marked.parse(p.text) }}
    />
  ),
})

export const Callout = defineComponent({
  name: 'Callout',
  description: 'A highlighted callout box for important information',
  props: z.object({
    text: z.string().describe('Callout text'),
    variant: z.enum(['info', 'warning', 'success', 'error']).optional().describe('Callout type'),
  }),
  component: ({ props: p }) => {
    const colors = {
      info: { bg: '#e6f4ff', border: '#1677ff', color: '#0958d9' },
      warning: { bg: '#fffbe6', border: '#faad14', color: '#ad6800' },
      success: { bg: '#f6ffed', border: '#52c41a', color: '#389e0d' },
      error: { bg: '#fff2f0', border: '#ff4d4f', color: '#cf1322' },
    }
    const c = colors[p.variant || 'info']
    return (
      <div style={{ padding: '10px 14px', background: c.bg, borderLeft: `3px solid ${c.border}`, borderRadius: 4, color: c.color, fontSize: 14, margin: '8px 0' }}>
        {p.text}
      </div>
    )
  },
})

// --- Card Component ---

export const Card = defineComponent({
  name: 'Card',
  description: 'A card container. First arg is children array, second is optional variant.',
  props: z.object({
    children: z.array(z.any()).describe('Child components'),
    variant: z.enum(['default', 'sunk', 'elevated']).optional().describe('Visual style'),
  }),
  component: ({ props: p, renderNode }) => {
    const styles = {
      default: { border: '1px solid #e8e8e8', borderRadius: 8, padding: 16, margin: '8px 0' },
      sunk: { background: '#f7f7f8', borderRadius: 8, padding: 16, margin: '8px 0' },
      elevated: { boxShadow: '0 2px 8px rgba(0,0,0,0.09)', borderRadius: 8, padding: 16, margin: '8px 0' },
    }
    const childNodes = Array.isArray(p.children) ? p.children.map((c, i) => renderNode ? renderNode(c) : <span key={i}>{String(c)}</span>) : null
    return <div style={styles[p.variant || 'default']}>{childNodes}</div>
  },
})

// --- Layout Components ---

export const Stack = defineComponent({
  name: 'Stack',
  description: 'Flex layout. Args: children, direction("row"|"col"), gap("s"|"m"|"l"), align("start"|"center"|"stretch"), justify("start"|"center"|"between"), wrap(boolean)',
  props: z.object({
    children: z.array(z.any()).describe('Child components'),
    direction: z.enum(['row', 'col']).optional().describe('Flex direction'),
    gap: z.enum(['s', 'm', 'l']).optional().describe('Spacing size'),
    align: z.enum(['start', 'center', 'stretch']).optional().describe('Cross-axis alignment'),
    justify: z.enum(['start', 'center', 'between']).optional().describe('Main-axis distribution'),
    wrap: z.boolean().optional().describe('Allow wrapping'),
  }),
  component: ({ props: p, renderNode }) => {
    const gapMap = { s: 6, m: 12, l: 20 }
    const childNodes = Array.isArray(p.children) ? p.children.map((c, i) => renderNode ? renderNode(c) : <span key={i}>{String(c)}</span>) : p.children
    return (
      <div style={{
        display: 'flex',
        flexDirection: p.direction === 'row' ? 'row' : 'column',
        gap: gapMap[p.gap || 'm'],
        alignItems: p.align === 'stretch' ? 'stretch' : p.align || 'stretch',
        justifyContent: p.justify === 'between' ? 'space-between' : p.justify || 'start',
        flexWrap: p.wrap ? 'wrap' : 'nowrap',
      }}>
        {childNodes}
      </div>
    )
  },
})

export const Grid = defineComponent({
  name: 'Grid',
  description: 'CSS grid layout. Args: children, columns(number), gap("s"|"m"|"l")',
  props: z.object({
    children: z.array(z.any()).describe('Child components'),
    columns: z.number().optional().describe('Number of columns'),
    gap: z.enum(['s', 'm', 'l']).optional().describe('Grid gap size'),
  }),
  component: ({ props: p, renderNode }) => {
    const gapMap = { s: 6, m: 12, l: 20 }
    const childNodes = Array.isArray(p.children) ? p.children.map((c, i) => renderNode ? renderNode(c) : <span key={i}>{String(c)}</span>) : p.children
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${p.columns || 2}, 1fr)`,
        gap: gapMap[p.gap || 'm'],
        margin: '8px 0',
      }}>
        {childNodes}
      </div>
    )
  },
})

// --- Table Components ---

export const Col = defineComponent({
  name: 'Col',
  description: 'Table column definition. Args: name(string), type("string"|"number"|"date"|"markdown")',
  props: z.object({
    name: z.string().describe('Column header text'),
    type: z.enum(['string', 'number', 'date', 'markdown']).optional().describe('Column data type'),
  }),
  component: () => null,
})

export const Table = defineComponent({
  name: 'Table',
  description: 'Data table. Args: columns(Col[]), rows(string[][])',
  props: z.object({
    columns: z.array(z.any()).describe('Array of Col definitions'),
    rows: z.array(z.array(z.string())).describe('Array of row data arrays'),
  }),
  component: ({ props: p }) => {
    const colNames = (p.columns || []).map(c => c?.props?.name || c?.name || '')
    const rows = p.rows || []
    return (
      <div style={{ overflowX: 'auto', margin: '8px 0' }}>
        <table className="openui-table">
          <thead>
            <tr>
              {colNames.map((n, i) => <th key={i}>{n}</th>)}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri}>
                {row.map((cell, ci) => <td key={ci}>{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  },
})

// --- Chart Components (use echarts internally) ---

function ChartWrapper({ option, style }) {
  const domRef = useRef(null)
  const instanceRef = useRef(null)

  useEffect(() => {
    if (!domRef.current) return
    if (!instanceRef.current) {
      instanceRef.current = echarts.init(domRef.current)
    }
    instanceRef.current.setOption(option, true)
    const onResize = () => instanceRef.current?.resize()
    window.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      instanceRef.current?.dispose()
    }
  }, [option])

  return <div ref={domRef} style={{ width: '100%', height: 320, ...style }} />
}

const baseChartProps = z.object({
  title: z.string().describe('Chart title'),
  xLabels: z.array(z.string()).describe('X-axis category labels'),
  series: z.array(z.object({
    name: z.string().describe('Series name'),
    data: z.array(z.number()).describe('Series data values'),
  })).describe('One or more data series'),
})

export const BarChart = defineComponent({
  name: 'BarChart',
  description: 'Bar chart. Props: title, xLabels, series',
  props: baseChartProps,
  component: ({ props: p }) => {
    const { title, xLabels, series: s } = p
    const maxVal = Math.max(...s.flatMap(x => x.data))
    const option = {
      title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
      toolbox: { feature: { saveAsImage: {} } },
      legend: s.length > 1 ? { bottom: 0, data: s.map(x => x.name) } : undefined,
      grid: { left: '3%', right: '4%', bottom: s.length > 1 ? '12%' : '3%', containLabel: true },
      xAxis: { type: 'category', data: xLabels },
      yAxis: { type: 'value', min: 0, max: Math.ceil(maxVal * 2) || 10 },
      series: s.map(x => ({ name: x.name, type: 'bar', data: x.data })),
    }
    return <div className="openui-chart"><ChartWrapper option={option} /></div>
  },
})

export const LineChart = defineComponent({
  name: 'LineChart',
  description: 'Line chart. Props: title, xLabels, series',
  props: baseChartProps,
  component: ({ props: p }) => {
    const { title, xLabels, series: s } = p
    const maxVal = Math.max(...s.flatMap(x => x.data))
    const option = {
      title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'axis' },
      toolbox: { feature: { saveAsImage: {} } },
      legend: s.length > 1 ? { bottom: 0, data: s.map(x => x.name) } : undefined,
      grid: { left: '3%', right: '4%', bottom: s.length > 1 ? '12%' : '3%', containLabel: true },
      xAxis: { type: 'category', data: xLabels, boundaryGap: false },
      yAxis: { type: 'value', min: 0, max: Math.ceil(maxVal * 2) || 10 },
      series: s.map(x => ({ name: x.name, type: 'line', data: x.data, smooth: true })),
    }
    return <div className="openui-chart"><ChartWrapper option={option} /></div>
  },
})

export const PieChart = defineComponent({
  name: 'PieChart',
  description: 'Pie chart. Props: title, series where each item has name/value. Use only for >=3 categories.',
  props: z.object({
    title: z.string().describe('Chart title'),
    data: z.array(z.object({
      name: z.string().describe('Category name'),
      value: z.number().describe('Category value'),
    })).describe('Pie data items'),
  }),
  component: ({ props: p }) => {
    const { title, data } = p
    const option = {
      title: { text: title, left: 'center', textStyle: { fontSize: 14 } },
      tooltip: { trigger: 'item', formatter: '{b}: {c} ({d}%)' },
      toolbox: { feature: { saveAsImage: {} } },
      legend: { orient: 'vertical', left: 'left', type: 'scroll' },
      series: [{
        type: 'pie',
        radius: '55%',
        center: ['55%', '55%'],
        data,
        emphasis: { itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.3)' } },
      }],
    }
    return <div className="openui-chart"><ChartWrapper option={option} /></div>
  },
})

// --- Form Components ---

export const Form = defineComponent({
  name: 'Form',
  description: 'An interactive form. Args: children(Input[]), submitLabel(string)',
  props: z.object({
    children: z.array(z.any()).describe('Form input components'),
    submitLabel: z.string().optional().describe('Submit button text'),
  }),
  component: ({ props: p, renderNode }) => {
    const childNodes = Array.isArray(p.children) ? p.children.map((c, i) => renderNode ? renderNode(c) : <span key={i}>{String(c)}</span>) : p.children
    return (
      <div style={{ border: '1px solid #e8e8e8', borderRadius: 8, padding: 16, margin: '8px 0', background: '#fafafa' }}>
        {childNodes}
      </div>
    )
  },
})

const InputComponent = ({ props: p }) => {
  const { label, name, placeholder, type = 'text', required } = p
  const streaming = useIsStreaming()
  const setFieldValue = useSetFieldValue()
  const formName = useFormName()
  const field = useStateField(name, '')

  const handleChange = useCallback((e) => {
    const val = type === 'number' ? e.target.valueAsNumber : e.target.value
    setFieldValue(formName, 'Input', name, val)
  }, [setFieldValue, formName, name, type])

  return (
    <div style={{ marginBottom: 12 }}>
      <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#555', marginBottom: 4 }}>
        {label}{required ? ' *' : ''}
      </label>
      <input
        type={type}
        value={field.value ?? ''}
        onChange={handleChange}
        placeholder={placeholder}
        disabled={streaming}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #d9d9d9',
          borderRadius: 6,
          fontSize: 14,
          outline: 'none',
          boxSizing: 'border-box',
        }}
      />
    </div>
  )
}

export const Input = defineComponent({
  name: 'Input',
  description: 'A text input field within a form. Args: label, name, placeholder, type("text"|"number"|"email"), required(boolean)',
  props: z.object({
    label: z.string().describe('Field label'),
    name: z.string().describe('Field name for form state'),
    placeholder: z.string().optional().describe('Placeholder text'),
    type: z.enum(['text', 'number', 'email']).optional().describe('Input type'),
    required: z.boolean().optional().describe('Whether the field is required'),
  }),
  component: InputComponent,
})

const ButtonComponent = ({ props: p }) => {
  const { label, variant = 'primary', action } = p
  const streaming = useIsStreaming()
  const triggerAction = useTriggerAction()

  const handleClick = useCallback(() => {
    if (action) {
      triggerAction({ type: action })
    }
  }, [triggerAction, action])

  const btnStyle = variant === 'primary'
    ? { background: '#1677ff', color: '#fff', border: 'none' }
    : { background: '#fff', color: '#333', border: '1px solid #d9d9d9' }

  return (
    <button
      onClick={handleClick}
      disabled={streaming}
      style={{
        padding: '8px 20px',
        borderRadius: 6,
        fontSize: 14,
        cursor: streaming ? 'not-allowed' : 'pointer',
        ...btnStyle,
      }}
    >
      {label}
    </button>
  )
}

export const Button = defineComponent({
  name: 'Button',
  description: 'A button within a form. Args: label, variant("primary"|"default"), action("submit")',
  props: z.object({
    label: z.string().describe('Button text'),
    variant: z.enum(['primary', 'default']).optional().describe('Button style'),
    action: z.enum(['submit']).optional().describe('Button action type'),
  }),
  component: ButtonComponent,
})

// --- Library ---

export const chatLibrary = createLibrary({
  components: [
    CardHeader,
    TextContent,
    MarkDownRenderer,
    Callout,
    Card,
    Stack,
    Grid,
    Col,
    Table,
    BarChart,
    LineChart,
    PieChart,
    Form,
    Input,
    Button,
  ],
  root: 'Card',
})
