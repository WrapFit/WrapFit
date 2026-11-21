import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { CanvasStateDto } from './project-spec.dto';

// The camera angle saved on the 3D box travels in canvasState (docs/21 §8.5).
describe('CanvasStateDto.cameraView', () => {
  // Same options as the global pipe in app.middleware.ts.
  const pipe = new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true });
  const validate = (value: object) => pipe.transform(value, { type: 'body', metatype: CanvasStateDto });

  it('accepts a saved angle, null, or none', async () => {
    const cameraView = { dir: [0.989, 0.04, -0.141], zoom: 1 };
    await expect(validate({ elements: [], cameraView })).resolves.toMatchObject({ cameraView });
    await expect(validate({ elements: [], cameraView: null })).resolves.toMatchObject({ cameraView: null });
    await expect(validate({ elements: [] })).resolves.toMatchObject({ cameraView: undefined });
  });

  it.each([
    ['an empty array (docs/21 §9)', []],
    ['an array of angles', [{ dir: [0, 1, 0], zoom: 1 }]],
    ['a zero direction (docs/21 §9)', { dir: [0, 0, 0], zoom: 1 }],
    ['a direction that is not a unit vector', { dir: [0.3, 0.3, 0.3], zoom: 1 }],
    ['no direction', { zoom: 1 }],
    ['a direction of two numbers', { dir: [0.5, 0.5], zoom: 1 }],
    ['a direction outside the unit cube', { dir: [3, 0, 0], zoom: 1 }],
    ['a zoom out of range', { dir: [0, 1, 0], zoom: 40 }],
    ['an extra field', { dir: [0, 1, 0], zoom: 1, script: 'x' }],
  ])('rejects %s', async (_case, cameraView) => {
    await expect(validate({ elements: [], cameraView })).rejects.toBeInstanceOf(BadRequestException);
  });
});
