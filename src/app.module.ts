import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantMerged } from './entity/restaurant-merged.entity';
import { RestaurantModule } from './restaurant/restaurant.module';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'postgres', // docker-compose 서비스명
      port: 5432,
      username: 'foodpick',
      password: 'foodpick123',
      database: 'foodpick',
      entities: [RestaurantMerged],
      synchronize: false, // 실제 운영 DB라면 false 권장
    }),
    TypeOrmModule.forFeature([RestaurantMerged]),
    RestaurantModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
