/* eslint-disable prettier/prettier */
import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('restaurant_merged')
export class RestaurantMerged {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  사업장명: string;

  @Column({ nullable: true })
  인허가일자: string;

  @Column({ nullable: true })
  영업상태명: string;

  @Column({ nullable: true })
  상세영업상태명: string;

  @Column({ nullable: true })
  소재지전체주소: string;

  @Column({ nullable: true })
  도로명전체주소: string;

  @Column({ nullable: true })
  도로명우편번호: string;

  @Column({ nullable: true })
  최종수정시점: string;

  @Column({ nullable: true })
  데이터갱신일자: string;

  @Column({ nullable: true })
  업태구분명: string;

  @Column({ nullable: true })
  네이버_상호명: string;

  @Column({ nullable: true })
  네이버_주소: string;

  @Column({ nullable: true })
  네이버_전화번호: string;

  @Column({ nullable: true })
  네이버_url: string;

  @Column({ nullable: true })
  네이버_place_id_url: string;

  @Column({ nullable: true })
  네이버_place_info: string;

  @Column({ nullable: true })
  네이버_tab_list: string;

  @Column({ nullable: true })
  menu: string;

  @Column({ nullable: true })
  photo: string;

  @Column({ nullable: true })
  latitude: string;

  @Column({ nullable: true })
  longitude: string;

  @Column({
    type: 'geometry',
    spatialFeatureType: 'Point',
    srid: 4326,
    nullable: true,
  })
  geom: object;

  @Column({ nullable: true })
  menu_tags: string;
}
