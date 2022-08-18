import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { Author } from './Author';
import { DataSourceOptions } from 'typeorm/data-source/DataSourceOptions';

export const makeDatasource = (config: Partial<DataSourceOptions>) => {
  const defaults: DataSourceOptions = {
    type: 'sqlite',
    database: ':memory:',
    dropSchema: true,
    synchronize: true,
    entities: [Author],
  };
  return new DataSource(Object.assign({}, defaults, config));
};
