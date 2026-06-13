import {
  IsArray,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdateReportDto {
  @IsOptional()
  @IsIn(['robo', 'hurto'])
  type?: 'robo' | 'hurto';

  @IsOptional() @IsString() occurredAt?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() province?: string;
  @IsOptional() @IsString() district?: string;
  @IsOptional() @IsString() locationRef?: string;
  @IsOptional() @IsNumber() geoLat?: number;
  @IsOptional() @IsNumber() geoLng?: number;
  @IsOptional() @IsString() narrative?: string;
}

export class ItemDto {
  @IsString() name: string;
  @IsOptional() @IsString() brandModel?: string;
  @IsOptional() @IsNumber() approxValue?: number;
  @IsOptional() @IsString() serialImei?: string;
}

export class EvidenceDto {
  @IsString() fileUrl: string;
  @IsOptional() @IsString() fileType?: string;
  @IsOptional() @IsString() description?: string;
}

export class SubmitDto {
  // explicit consents captured at submit time
  @IsArray()
  @IsString({ each: true })
  consents: string[]; // e.g. ['truthfulness', 'data_processing']
}
