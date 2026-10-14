import { PrintShopsService } from './print-shops.service';

describe('PrintShopsService', () => {
  let service: PrintShopsService;

  beforeEach(() => {
    service = new PrintShopsService();
  });

  it('lists all partner print shops across major cities', () => {
    const list = service.list();
    expect(list.length).toBeGreaterThanOrEqual(4);
    expect(list.map((s) => s.city)).toEqual(
      expect.arrayContaining(['TP. Hồ Chí Minh', 'Hà Nội', 'Đà Nẵng', 'Cần Thơ']),
    );
  });

  it('filters partner print shops by city case-insensitively', () => {
    const hcm = service.list('hồ chí minh');
    expect(hcm.length).toBe(1);
    expect(hcm[0].name).toBe('In Bao Bì Sài Gòn Xanh');

    const hanoi = service.list('hà nội');
    expect(hanoi.length).toBe(1);
    expect(hanoi[0].id).toBe('ps-hn-02');
  });

  it('retrieves a print shop by id', () => {
    const shop = service.get('ps-dn-03');
    expect(shop).toBeDefined();
    expect(shop?.city).toBe('Đà Nẵng');
    expect(shop?.services).toContain('Cắt laser & dao rung');
    expect(shop?.sheetSize).toBe('B2 · 720 × 520 mm');
  });

  it('returns undefined for non-existent print shop id', () => {
    expect(service.get('non-existent')).toBeUndefined();
  });

  it('provides a default partner print shop', () => {
    const def = service.getDefaultPartner();
    expect(def).toBeDefined();
    expect(def.id).toBe('ps-sg-01');
  });
});
