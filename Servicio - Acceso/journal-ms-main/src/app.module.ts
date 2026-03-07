import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { JournalModule } from './journal/journal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    JournalModule,
  ],
})
export class AppModule {}
