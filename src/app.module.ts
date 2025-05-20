import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantMerged } from './entity/restaurant-merged.entity';
import { RestaurantModule } from './restaurant/restaurant.module';
import { AuthModule } from './auth/auth.module';
import { Auth } from './entity/auth.entity';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'postgres', // docker-compose 서비스명
      port: 5432,
      username: 'foodpick',
      password: 'foodpick123',
      database: 'foodpick',
      entities: [RestaurantMerged, Auth],
      synchronize: true, // 개발 환경에서는 true로 설정 typeorm이 db에 동기화되어 테이블 만들어버림.
    }),
    TypeOrmModule.forFeature([RestaurantMerged]),
    RestaurantModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
