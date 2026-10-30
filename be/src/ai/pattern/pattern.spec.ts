import { ClaudePatternGenerator, PatternGenerationError } from './claude-pattern.generator';
import { InvalidPatternError, renderPatternSvg } from './pattern-svg';
import type { PatternDesign } from './pattern.types';
import { ProceduralPatternGenerator } from './procedural-pattern.generator';

const design = (tile: Partial<PatternDesign['tile']> = {}, extra: Partial<PatternDesign> = {}): PatternDesign => ({
  themeName: 'Thử',
  description: 'Mẫu thử',
  palette: ['#FAEDCD', '#C0392B', '#D4AF37'],
  tile: { size: 50, background: '#FAEDCD', circles: [], rects: [], lines: [], paths: [], ...tile },
  ...extra,
});
const dot = { cx: 48, cy: 25, r: 5, fill: '#C0392B', opacity: 0.8 };

describe('renderPatternSvg', () => {
  it('draws the motif with its 8 neighbours so the tile repeats seamlessly', () => {
    const svg = renderPatternSvg(design({ circles: [dot] }));
    expect(svg.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 50 50">')).toBe(true);
    expect(svg.match(/<circle /g)).toHaveLength(9);
    expect(svg).toContain('<g transform="translate(-50 0)"><circle cx="48"'); // re-enters on the left edge
  });

  it.each([
    ['a color carrying markup', design({ circles: [{ ...dot, fill: '#fff" onload="alert(1)' }] })],
    ['a background that is not a color', design({ background: 'url(https://evil.example/x.png)' })],
    ['path data with a URL', design({ paths: [{ d: 'M0 0 javascript:alert(1)', fill: '#000000', stroke: null, strokeWidth: 0, opacity: 1 }] })],
    ['path data with an element', design({ paths: [{ d: 'M0 0"/><script>', fill: '#000000', stroke: null, strokeWidth: 0, opacity: 1 }] })],
    ['an empty tile', design()],
    ['a huge tile', design({ size: 5000, circles: [dot] })],
    ['a shape far outside the tile', design({ circles: [{ ...dot, cx: 9999 }] })],
    ['a NaN coordinate', design({ circles: [{ ...dot, cy: Number.NaN }] })],
    ['too few palette colors', design({ circles: [dot] }, { palette: ['#000000'] })],
  ])('rejects %s', (_label, bad) => {
    expect(() => renderPatternSvg(bad)).toThrow(InvalidPatternError);
  });
});

describe('ProceduralPatternGenerator', () => {
  const generator = new ProceduralPatternGenerator();

  it.each(['Tết hoa đào', 'Giáng sinh ấm áp', 'Quà cưới', 'Valentine', 'Sinh nhật bé', 'skincare tối giản', 'cà phê rang xay'])(
    'renders a valid pattern for "%s"',
    (theme) => {
      const pattern = generator.design({ theme, preferredColors: [] });
      expect(() => renderPatternSvg(pattern)).not.toThrow();
    },
  );

  it('is deterministic and builds on the brand colors', () => {
    const first = generator.design({ theme: 'Tết hoa đào', preferredColors: ['#123456'] });
    expect(generator.design({ theme: 'Tết hoa đào', preferredColors: ['#123456'] })).toEqual(first);
    expect(first.themeName).toBe('Xuân Lộc Đỏ Son');
    expect(first.palette).toContain('#123456');
  });
});

describe('ClaudePatternGenerator', () => {
  const generator = new ClaudePatternGenerator({
    apiKey: 'test-key',
    models: { fast: 'claude-haiku-5-5', premium: 'claude-opus-5-5' },
    timeoutMs: 1000,
  });
  const create = jest.fn();
  (generator as unknown as { client: { beta: { messages: { create: jest.Mock } } } }).client = {
    beta: { messages: { create } },
  };
  const reply = (text: string, stop_reason = 'end_turn') => ({
    model: 'claude-opus-5-5',
    stop_reason,
    content: [{ type: 'text', text }],
    usage: { input_tokens: 900, output_tokens: 400 },
  });

  it('asks the premium model for structured output with the fallback chain and returns a validated design', async () => {
    create.mockResolvedValueOnce(reply(JSON.stringify(design({ circles: [dot] }))));
    const result = await generator.generate({ theme: 'Tết', preferredColors: ['#C0392B'], quality: 'premium' });

    expect(result.usage).toEqual({ model: 'claude-opus-5-5', inputTokens: 900, outputTokens: 400 });
    const params = create.mock.calls[0][0];
    expect(params).toMatchObject({
      model: 'claude-opus-5-5',
      fallbacks: 'default',
      betas: ['server-side-fallback-2026-07-01'],
      output_config: { effort: 'low', format: { type: 'json_schema' } },
      messages: [{ role: 'user', content: 'Theme: Tết\nBrand colors: #C0392B' }],
    });
  });

  it('uses the fast model by default, without the fallback parameters Haiku does not support', async () => {
    create.mockResolvedValueOnce(reply(JSON.stringify(design({ circles: [dot] }))));
    await generator.generate({ theme: 'Tết', preferredColors: [] });

    const params = create.mock.calls.at(-1)[0];
    expect(params).toMatchObject({ model: 'claude-haiku-5-5', output_config: { effort: 'low' } });
    expect(params).not.toHaveProperty('fallbacks');
    expect(params).not.toHaveProperty('betas');
  });

  it('turns refusals and unsafe output into PatternGenerationError', async () => {
    create.mockResolvedValueOnce(reply('', 'refusal'));
    await expect(generator.generate({ theme: 'x', preferredColors: [] })).rejects.toThrow(PatternGenerationError);

    create.mockResolvedValueOnce(reply(JSON.stringify(design({ background: 'url(x)' }))));
    await expect(generator.generate({ theme: 'x', preferredColors: [] })).rejects.toThrow(/invalid pattern/);

    create.mockResolvedValueOnce(reply('not json'));
    await expect(generator.generate({ theme: 'x', preferredColors: [] })).rejects.toThrow(PatternGenerationError);
  });
});
