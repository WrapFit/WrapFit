import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/prisma';
import { PrintShopsService } from '../print-shops';
import { CreateSampleOrderDto } from './dto/create-sample-order.dto';

export interface SamplePrintOrder {
  id: string;
  orderCode: string;
  userId: string;
  projectId: string;
  projectTitle: string;
  quantity: number;
  recipientName: string;
  phone: string;
  recipientPhone: string;
  shippingAddress: string;
  paperStock: string;
  notes: string | null;
  status: 'pending' | 'confirmed' | 'in_production' | 'shipped' | 'delivered';
  orderStatus: 'SUBMITTED' | 'IN_PRODUCTION' | 'SHIPPED' | 'DELIVERED';
  sampleFeeVnd: number;
  totalVnd: number;
  printShopId: string;
  printShopName: string;
  partnerShop: {
    id: string;
    name: string;
    city: string;
    contactPhone: string;
  };
  estimatedDeliveryDays: string;
  createdAt: string;
  updatedAt: string;
}

// In-memory persistent state across requests for sample order tracking
const SAMPLE_ORDERS = new Map<string, SamplePrintOrder>();

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly printShops: PrintShopsService,
  ) {}

  async createSampleOrder(userId: string, dto: CreateSampleOrderDto): Promise<SamplePrintOrder> {
    const userPhone = (dto.phone || dto.recipientPhone)?.trim();
    if (!userPhone) {
      throw new BadRequestException('Vui lòng cung cấp số điện thoại người nhận');
    }

    const project = await this.prisma.packagingProject.findUnique({
      where: { id: dto.projectId },
      select: { id: true, title: true, userId: true },
    });
    if (!project) {
      throw new NotFoundException('Dự án hộp không tồn tại');
    }

    const partner = dto.printShopId
      ? (this.printShops.get(dto.printShopId) ?? this.printShops.getDefaultPartner())
      : this.printShops.getDefaultPartner();

    const timestamp = Date.now().toString(36).toUpperCase();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderCode = `WF-SMP-${timestamp}-${randomSuffix}`;
    const id = `ord_${timestamp}_${randomSuffix}`;
    const quantity = dto.quantity ?? 1;

    // Chi phí in mẫu thử: 49.000đ/hộp đầu tiên, 25.000đ/hộp tiếp theo
    const sampleFeeVnd = 49_000 + Math.max(0, quantity - 1) * 25_000;

    const order: SamplePrintOrder = {
      id,
      orderCode,
      userId,
      projectId: project.id,
      projectTitle: project.title,
      quantity,
      recipientName: dto.recipientName,
      phone: userPhone,
      recipientPhone: userPhone,
      shippingAddress: dto.shippingAddress,
      paperStock: dto.paperStock ?? 'Kraft 350g cán màng mờ',
      notes: dto.notes ?? null,
      status: 'confirmed',
      orderStatus: 'SUBMITTED',
      sampleFeeVnd,
      totalVnd: sampleFeeVnd,
      printShopId: partner.id,
      printShopName: partner.name,
      partnerShop: {
        id: partner.id,
        name: partner.name,
        city: partner.city,
        contactPhone: partner.phone,
      },
      estimatedDeliveryDays: partner.leadTime,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    SAMPLE_ORDERS.set(id, order);
    return order;
  }

  listUserOrders(userId: string): SamplePrintOrder[] {
    const list: SamplePrintOrder[] = [];
    for (const order of SAMPLE_ORDERS.values()) {
      if (order.userId === userId) {
        list.push(order);
      }
    }
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getOrder(id: string, userId: string): SamplePrintOrder {
    const order = SAMPLE_ORDERS.get(id);
    if (!order || order.userId !== userId) {
      throw new NotFoundException('Đơn hàng không tồn tại');
    }
    return order;
  }
}
