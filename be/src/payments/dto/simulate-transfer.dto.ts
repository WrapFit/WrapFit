import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { MOCK_SCENARIOS, type MockScenario } from '../sepay/mock-transfer.service';

export class SimulateTransferDto {
  @ApiPropertyOptional({
    enum: MOCK_SCENARIOS,
    default: 'exact',
    description: 'exact = đúng mã, đúng tiền (tự khớp); underpaid = thiếu 10.000đ; no_reference = quên ghi mã WF',
  })
  @IsOptional()
  @IsIn(MOCK_SCENARIOS)
  scenario?: MockScenario;
}
