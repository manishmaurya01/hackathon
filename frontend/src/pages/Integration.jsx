import { useState } from 'react';
import { Plug, Copy, Check, KeyRound, Webhook, Boxes, GraduationCap, Terminal } from 'lucide-react';
import CodeBlock from '../components/CodeBlock.jsx';
import { useAuth } from '../hooks/useAuth.jsx';

const REQUEST_EXAMPLE = `curl -X POST http://localhost:5000/api/analysis \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer <YOUR_JWT_TOKEN>" \\
  -d '{
    "text": "Assignment content..."
  }'`;

const RESPONSE_EXAMPLE = {
  success: true,
  message: 'Analysis complete.',
  data: {
    status: 'completed',
    reportId: '66f1a2b3c4d5e6f7a8b9c0d1',
    report: {
      overallStatus: 'Needs Attention',
      aiLikelihood: 'Elevated',
      confidence: 'Moderate',
      summary:
        'The submission shows repetitive phrasing and uniform sentence structure across sections.',
      sectionsFlagged: 3,
      signals: [
        {
          type: 'repetition',
          label: 'Repetitive phrasing',
          severity: 'medium',
          explanation:
            'Formal connectives recur at the start of most paragraphs.',
        },
      ],
      evidence: [
        {
          section: 2,
          text: 'It is important to note that...',
          signal: 'Writing pattern anomaly',
          reason: 'Stock connective mirroring the previous section.',
          confidence: 'Moderate',
        },
      ],
      recommendations: ['Review the highlighted sections.'],
    },
  },
};

const ERROR_EXAMPLE = {
  success: false,
  message: 'Analysis is unavailable: the OpenRouter API key was rejected.',
  code: 'API_ERROR',
  details: { code: 'AI_UNAUTHORIZED', reportId: '66f1a2b3c4d5e6f7a8b9c0d1' },
};

const ENDPOINTS = [
  { method: 'POST', path: '/api/auth/signup', auth: 'None', desc: 'Create an account, returns a JWT.' },
  { method: 'POST', path: '/api/auth/login', auth: 'None', desc: 'Exchange credentials for a JWT.' },
  { method: 'GET', path: '/api/auth/me', auth: 'JWT', desc: 'Read the authenticated user.' },
  { method: 'POST', path: '/api/analysis', auth: 'JWT', desc: 'Analyze text or an uploaded file.' },
  { method: 'GET', path: '/api/analysis/:id', auth: 'JWT', desc: 'Fetch one full report.' },
  { method: 'GET', path: '/api/analysis', auth: 'JWT', desc: 'List your reports.' },
  { method: 'DELETE', path: '/api/analysis/:id', auth: 'JWT', desc: 'Delete one of your reports.' },
  { method: 'GET', path: '/api/dashboard/stats', auth: 'JWT', desc: 'Real usage statistics.' },
  { method: 'GET', path: '/api/health', auth: 'None', desc: 'Service status and configuration.' },
];

const COMING_LATER = [
  { icon: Boxes, title: 'SDK', body: 'Typed clients for Node, Python and the browser.' },
  { icon: Webhook, title: 'Webhooks', body: 'Push completed reports to your systems in real time.' },
  { icon: GraduationCap, title: 'LMS integrations', body: 'Canvas, Moodle and Blackboard plugins.' },
];

function MethodBadge({ method }) {
  const tone =
    method === 'POST'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : method === 'DELETE'
        ? 'bg-red-50 text-red-700 border-red-200'
        : 'bg-brand-50 text-brand-700 border-brand-200';
  return (
    <span className={`badge !px-2 !py-0.5 !font-mono !text-[10px] ${tone}`}>{method}</span>
  );
}

export default function Integration() {
  const { user } = useAuth();
  const [copiedField, setCopiedField] = useState(null);

  async function copyValue(value, field) {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      setCopiedField(null);
    }
  }

  return (
    <div className="space-y-8 animate-fade-up">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[12px] font-semibold uppercase tracking-wider text-brand-600">
            Integration
          </p>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-ink-950 sm:text-3xl">
            Integrate VeriWrite into your application
          </h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-relaxed text-ink-600">
            One authenticated endpoint returns a structured, explainable report. Send assignment
            text, receive signals and evidence your own UI can render.
          </p>
        </div>
        <span className="badge-info shrink-0">
          <Plug size={13} />
          REST · JSON
        </span>
      </div>

      {/* Base URL + auth */}
      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card p-6">
          <div className="flex items-center gap-2">
            <Terminal size={16} className="text-brand-600" />
            <h2 className="text-[15px] font-semibold text-ink-900">Base URL</h2>
          </div>
          <div className="mt-3 flex items-center gap-2">
            <code className="flex-1 rounded-lg border border-ink-200 bg-ink-50 px-3.5 py-2.5 font-mono text-[13px] text-ink-700">
              http://localhost:5000/api
            </code>
            <button
              type="button"
              onClick={() => copyValue('http://localhost:5000/api', 'base')}
              className="btn-secondary !px-3 !py-2.5"
              aria-label="Copy base URL"
            >
              {copiedField === 'base' ? <Check size={15} className="text-emerald-600" /> : <Copy size={15} />}
            </button>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-500">
            In production this becomes your deployed API host. All endpoints are prefixed with{' '}
            <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[12px]">/api</code>.
          </p>
        </section>

        <section className="card p-6">
          <div className="flex items-center gap-2">
            <KeyRound size={16} className="text-brand-600" />
            <h2 className="text-[15px] font-semibold text-ink-900">Authentication</h2>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-ink-600">
            Every protected endpoint expects a JWT in the{' '}
            <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[12px]">
              Authorization
            </code>{' '}
            header. Sign up or log in once, then reuse the token for subsequent calls.
          </p>
          <div className="mt-4 rounded-lg border border-ink-200 bg-ink-950 px-3.5 py-2.5">
            <code className="font-mono text-[12.5px] text-ink-100">
              Authorization: Bearer &lt;YOUR_JWT_TOKEN&gt;
            </code>
          </div>
          <p className="mt-3 text-xs leading-relaxed text-ink-400">
            Tokens expire after 7 days. Your OpenRouter key stays on the server and is never
            exposed to clients.
          </p>
        </section>
      </div>

      {/* Endpoints table */}
      <section className="card overflow-hidden">
        <div className="border-b border-ink-200/70 px-5 py-4">
          <h2 className="text-[15px] font-semibold text-ink-900">API Endpoints</h2>
          <p className="mt-0.5 text-xs text-ink-500">
            Base path <span className="font-mono">/api</span>
          </p>
        </div>
        <div className="overflow-x-auto thin-scroll">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-ink-200 bg-ink-50/70">
                {['Method', 'Path', 'Auth', 'Description'].map((h) => (
                  <th
                    key={h}
                    scope="col"
                    className="px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-ink-500"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ENDPOINTS.map((e) => (
                <tr
                  key={`${e.method}${e.path}`}
                  className="border-b border-ink-100 transition-colors last:border-0 hover:bg-ink-50/60"
                >
                  <td className="px-5 py-3">
                    <MethodBadge method={e.method} />
                  </td>
                  <td className="px-5 py-3">
                    <code className="font-mono text-[13px] text-ink-800">{e.path}</code>
                  </td>
                  <td className="px-5 py-3">
                    <span
                      className={`text-xs font-semibold ${
                        e.auth === 'JWT' ? 'text-brand-600' : 'text-ink-400'
                      }`}
                    >
                      {e.auth}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-sm text-ink-600">{e.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Request / response */}
      <section className="space-y-5">
        <div>
          <h2 className="text-lg font-semibold text-ink-950">Example request</h2>
          <p className="mt-1 text-sm text-ink-500">
            <code className="rounded bg-ink-100 px-1.5 py-0.5 font-mono text-[12.5px]">
              POST /api/analysis
            </code>{' '}
            with a JSON body. Send <code className="font-mono text-[12.5px]">text</code> for pasted
            content, or multipart field <code className="font-mono text-[12.5px]">file</code> for
            PDF/DOCX/TXT uploads.
          </p>
        </div>

        <CodeBlock value={REQUEST_EXAMPLE} label="request" language="bash" />

        <div className="grid gap-5 lg:grid-cols-2">
          <div>
            <h3 className="mb-2.5 text-sm font-semibold text-ink-800">Successful response</h3>
            <CodeBlock value={RESPONSE_EXAMPLE} label="200 OK" />
          </div>
          <div>
            <h3 className="mb-2.5 text-sm font-semibold text-ink-800">Error response</h3>
            <CodeBlock value={ERROR_EXAMPLE} label="503 Service Unavailable" />
          </div>
        </div>
      </section>

      {/* Coming later */}
      <section className="card p-6">
        <div className="flex items-center gap-2">
          <span className="badge-warn">Coming Later</span>
        </div>
        <p className="mt-3 text-sm leading-relaxed text-ink-600">
          These are planned but not implemented in the MVP. Nothing below is functional yet.
        </p>
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          {COMING_LATER.map((c) => (
            <div
              key={c.title}
              className="rounded-xl border border-dashed border-ink-200 bg-ink-50/50 p-4 opacity-80"
            >
              <span className="grid h-9 w-9 place-items-center rounded-lg bg-white text-ink-400 shadow-sm">
                <c.icon size={17} />
              </span>
              <p className="mt-3 text-sm font-semibold text-ink-800">{c.title}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-ink-500">{c.body}</p>
            </div>
          ))}
        </div>
      </section>

      <p className="text-xs leading-relaxed text-ink-400">
        Signed in as <span className="font-medium text-ink-600">{user?.email}</span>. Use your own
        token when testing these endpoints.
      </p>
    </div>
  );
}
