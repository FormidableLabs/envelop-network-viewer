import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity()
export class Author {
  // @ts-ignore
  @PrimaryColumn() id: number;
  // @ts-ignore
  @Column() first_name: string;
  // @ts-ignore
  @Column() last_name: string;
}
