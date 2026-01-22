import { Controller, Get, Headers, Param, Query } from '@nestjs/common';
import { CompaniesService } from './companies.service';

@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) {}

  @Get()
  list(
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.companiesService.list(search, page, pageSize);
  }

  @Get(':id')
  detail(@Param('id') id: string, @Headers('accept-language') acceptLanguage?: string) {
    return this.companiesService.detail(id, acceptLanguage);
  }
}
