import { Table, Column, Model, DataType } from "sequelize-typescript";

@Table({
  tableName: "donations",
  timestamps: true,
})
export class Donation extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  name!: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
  })
  email!: string;

  @Column({
    type: DataType.INTEGER,
    allowNull: false,
  })
  amount!: number;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    field: "payment_reference",
  })
  paymentReference!: string;
}
