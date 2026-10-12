import {
  type BoxDimensions,
  type CanvasElement,
  checkBox,
  CURRENT_FORMULA_VERSION,
  generateDielinePieces,
} from '@wrapfit/shared';
import { designTemplates } from '../../prisma/seed-data';

describe('curated design templates of the seed', () => {
  it.each(designTemplates.map((design) => [design.title, design] as const))(
    '%s puts every element on a panel and passes FitCheck',
    (_title, design) => {
      const pieces = generateDielinePieces(
        design.boxTemplateId,
        design.dimensions as unknown as BoxDimensions,
        // Projects created from these designs get the current formulas.
        CURRENT_FORMULA_VERSION,
      );
      const panels = pieces.flatMap((piece) => piece.geometry.panels);
      const elements = (
        design.canvasState as unknown as { elements: CanvasElement[] }
      ).elements;

      expect(elements.length).toBeGreaterThan(0);
      for (const element of elements) {
        // Exact ids: a short id ("front") only resolves on tuck-top boxes.
        expect(panels.map((panel) => panel.id)).toContain(element.panelId);
      }
      const report = checkBox(pieces, elements);
      expect(report.violations).toEqual([]);
    },
  );
});
