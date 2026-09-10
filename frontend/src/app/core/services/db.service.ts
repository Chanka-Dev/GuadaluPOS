import { Injectable } from '@angular/core';
import Dexie, { Table } from 'dexie';
import { indexedDB as fakeIndexedDB, IDBKeyRange as fakeIDBKeyRange } from 'fake-indexeddb';
import { Producto, VentaPendienteLocal } from '../models/pos.models';

@Injectable({
  providedIn: 'root',
})
export class DbService extends Dexie {
  productos_cache!: Table<Producto, string>;
  ventas_pendientes!: Table<VentaPendienteLocal, string>;

  constructor() {
    super('GuadaPosDB', {
      indexedDB: typeof indexedDB !== 'undefined' ? indexedDB : fakeIndexedDB,
      IDBKeyRange: typeof IDBKeyRange !== 'undefined' ? IDBKeyRange : fakeIDBKeyRange,
    });

    this.version(1).stores({
      productos_cache: 'id',
      ventas_pendientes: '&client_uuid, estado',
    });
  }
}
