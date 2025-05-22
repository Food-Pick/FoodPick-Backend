import { DataSource } from "typeorm";
import { Auth } from "./entity/auth.entity";
import { RestaurantMerged } from "./entity/restaurant-merged.entity";

export const AppDataSource = new DataSource({
    type: "postgres",
    host: "postgres",
    port: 5432,
    username: "foodpick",
    password: "foodpick123",
    database: "foodpick",
    synchronize: false,
    logging: true,
    entities: [Auth, RestaurantMerged],
    migrations: ["src/migrations/*.ts"],
    subscribers: [],
}); 