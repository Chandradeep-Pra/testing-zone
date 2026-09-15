const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function renderPlayer(provider, player = {}) {
  const states = [];
  let stateIndex = 0;
  let refIndex = 0;
  const jsx = (type, props) => typeof type === 'function' ? type(props) : { type, props };
  const modules = {
    react: {
      useEffect: () => {},
      useRef: () => ({ current: refIndex++ === 1 ? player : null }),
      useState: initial => {
        const index = stateIndex++;
        states[index] = typeof initial === 'function' ? initial() : initial;
        return [states[index], value => { states[index] = value; }];
      },
    },
    'react/jsx-runtime': { jsx, jsxs: jsx },
    'lucide-react': new Proxy({}, { get: (_, name) => name }),
    '@/components/courses/videoUtils': { formatTime: String, getThumbnail: () => 'poster.jpg', getYoutubeEmbedUrl: url => url },
    '@/lib/app-path': { appPath: path => `/web${path}` },
  };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('components/courses/ModernVideoPlayer.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require: name => modules[name], window: { clearTimeout() {}, setTimeout() {} } });
  const tree = exports.default({ playback: { video: { id: 'lesson-1', title: 'Lesson' }, playback: { provider, url: 'https://storage.test/signed' } } });
  const nodes = [];
  function visit(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) return node.forEach(visit);
    nodes.push(node);
    visit(node.props?.children);
  }
  visit(tree);
  return { nodes, states };
}

test('Storage plays directly with a poster and metadata-only preload', () => {
  const { nodes } = renderPlayer('storage');
  const video = nodes.find(node => node.type === 'video');
  assert.equal(video.props.src, 'https://storage.test/signed');
  assert.equal(video.props.preload, 'metadata');
  assert.equal(video.props.poster, 'poster.jpg');
});

test('Drive retains the authorized stream fallback', () => {
  const { nodes } = renderPlayer('drive');
  assert.equal(nodes.find(node => node.type === 'video').props.src, '/web/api/urologics/videos/lesson-1/stream');
});

test('YouTube remains an iframe', () => {
  const { nodes } = renderPlayer('youtube');
  assert.ok(nodes.some(node => node.type === 'iframe'));
  assert.ok(!nodes.some(node => node.type === 'video'));
});

test('rejected play leaves playback paused and exposes a retry message', async () => {
  const { nodes, states } = renderPlayer('storage', { paused: true, play: async () => { throw new Error('NotAllowedError'); } });
  await nodes.find(node => node.props?.['aria-label'] === 'Play').props.onClick();
  assert.equal(states[0], false);
  assert.equal(states.at(-2), false);
  assert.match(states.at(-1), /Press Play/);
});

test('media errors stop buffering and expose recovery text', () => {
  const { nodes, states } = renderPlayer('storage');
  nodes.find(node => node.type === 'video').props.onError();
  assert.equal(states[0], false);
  assert.equal(states.at(-2), false);
  assert.match(states.at(-1), /Select the lesson again/);
});
