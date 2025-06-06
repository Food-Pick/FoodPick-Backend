import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RestaurantMerged } from './entity/restaurant-merged.entity';
import { RestaurantModule } from './restaurant/restaurant.module';
import { AuthModule } from './auth/auth.module';
import { Auth } from './entity/auth.entity';
import { RecommendModule } from './recommend/recommend.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: 'postgres', // docker-compose 서비스명
      port: 5432,
      username: 'foodpick',
      password: 'foodpick123',
      database: 'foodpick',
      entities: [RestaurantMerged, Auth],
      synchronize: false, // 마이그레이션을 사용하기 위해 false로 설정 이거 true 시 DB날려버릴수 있어요.
      migrations: ['dist/migrations/*.js'],
      migrationsRun: true,
    }),
    TypeOrmModule.forFeature([RestaurantMerged, Auth]),
    RestaurantModule,
    AuthModule,
    RecommendModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
