import Anthropic from '@anthropic-ai/sdk';
import { assertValidDesign, TILE_SIZE } from './pattern-svg';
import type { AiQuality, GeneratedPattern, PatternDesign, PatternGenerator, PatternRequest } from './pattern.types';

/** The model can decline a request (safety classifiers) or return something unusable. */
export class PatternGenerationError extends Error {}

const color = { type: 'string', description: 'Hex color #RRGGBB' };
const num = { type: 'number' };
const opacity = { type: 'number', description: '0 to 1' };
const object = (properties: Record<string, unknown>) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});
const nullable = (schema: Record<string, unknown>) => ({ anyOf: [schema, { type: 'null' }] });

/** Structured output: the model returns shapes, the backend renders and sanitizes the SVG itself. */
const DESIGN_SCHEMA = object({
  themeName: { type: 'string', description: 'Short Vietnamese name of the pattern' },
  description: { type: 'string', description: 'One Vietnamese sentence describing the pattern' },
  palette: { type: 'array', items: color, description: '4 to 6 colors, background-friendly color first' },
  tile: object({
    size: { type: 'number', description: `Tile side in px, ${TILE_SIZE.min} to ${TILE_SIZE.max}` },
    background: nullable(color),
    circles: { type: 'array', items: object({ cx: num, cy: num, r: num, fill: color, opacity }) },
    rects: {
      type: 'array',
      items: object({ x: num, y: num, width: num, height: num, rotate: num, fill: color, opacity }),
    },
    lines: {
      type: 'array',
      items: object({ x1: num, y1: num, x2: num, y2: num, stroke: color, strokeWidth: num, opacity }),
    },
    paths: {
      type: 'array',
      items: object({ d: { type: 'string' }, fill: nullable(color), stroke: nullable(color), strokeWidth: num, opacity }),
    },
  }),
});

// Stable system prompt (no per-request data) so it can be cached.
const SYSTEM_PROMPT = `You design seamless repeat patterns for printed gift boxes (WrapFit, a Vietnamese packaging studio).
Return one square repeat tile as shapes: circles, rects, lines and SVG path data (commands M L H V C S Q T A Z and numbers only).
Rules:
- Coordinates are in px inside a tile of side \`size\` (between ${TILE_SIZE.min} and ${TILE_SIZE.max}, usually 40 to 120). Shapes may cross the edges; the renderer wraps them so the tile repeats seamlessly.
- Use 4 to 40 shapes. Keep motifs small and balanced so the pattern reads well on a box panel.
- Colors are #RRGGBB. Prefer warm, tactile packaging tones; text and logos will be printed on top, so keep contrast moderate and opacities between 0.3 and 0.9.
- If the user gives brand colors, build the palette and the shapes around them.
- themeName and description are in Vietnamese.`;

export interface ClaudeGeneratorOptions {
  apiKey: string;
  models: Record<AiQuality, string>;
  timeoutMs: number;
}

/** Haiku has no server-side refusal fallback: a declined request stays declined, so the parameter is not sent. */
const hasServerFallback = (model: string) => !model.startsWith('claude-haiku');

/** Calls the Claude API with structured outputs; the design is validated before it is returned. */
export class ClaudePatternGenerator implements PatternGenerator {
  private readonly client: Anthropic;

  constructor(private readonly options: ClaudeGeneratorOptions) {
    this.client = new Anthropic({ apiKey: options.apiKey, timeout: options.timeoutMs, maxRetries: 1 });
  }

  async generate({ theme, preferredColors, quality = 'fast' }: PatternRequest): Promise<GeneratedPattern> {
    const colors = preferredColors.length ? `\nBrand colors: ${preferredColors.join(', ')}` : '';
    const model = this.options.models[quality];
    const response = await this.client.beta.messages.create({
      model,
      max_tokens: 16000,
      // Simple, well-specified task: low effort keeps it fast and cheap.
      output_config: { effort: 'low', format: { type: 'json_schema', schema: DESIGN_SCHEMA } },
      // If a safety classifier declines, Anthropic re-runs the request on its recommended fallback model.
      ...(hasServerFallback(model) && { betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' as const }),
      system: [{ type: 'text', text: SYSTEM_PROMPT, cache_control: { type: 'ephemeral' } }],
      messages: [{ role: 'user', content: `Theme: ${theme}${colors}` }],
    });

    if (response.stop_reason === 'refusal') {
      throw new PatternGenerationError('The AI declined this theme; try wording it differently');
    }
    if (response.stop_reason === 'max_tokens') {
      throw new PatternGenerationError('The AI response was cut off');
    }
    const text = response.content.find((block) => block.type === 'text');
    if (!text || text.type !== 'text') throw new PatternGenerationError('The AI returned no pattern');

    let design: PatternDesign;
    try {
      design = JSON.parse(text.text) as PatternDesign;
      assertValidDesign(design);
    } catch (error) {
      throw new PatternGenerationError(`The AI returned an invalid pattern: ${(error as Error).message}`);
    }

    return {
      design,
      usage: {
        model: response.model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
